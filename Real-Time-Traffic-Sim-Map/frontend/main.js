import L from 'leaflet';
import { Client } from '@stomp/stompjs';

// ─────────────────────────────────────────────
// Map setup
// ─────────────────────────────────────────────
const map = L.map('map', {
    center: [22.5833, 88.3333],
    zoom: 13,
    zoomControl: false,
});

// Tile layers – dark and light
const TILES = {
    dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
    }),
    light: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
    }),
};

let currentTheme = 'dark';
TILES.dark.addTo(map);

// ─────────────────────────────────────────────
// Theme toggle (called from HTML button)
// ─────────────────────────────────────────────
window.toggleTheme = () => {
    const html = document.documentElement;
    const btnIcon = document.getElementById('theme-toggle-icon');
    const isLight = currentTheme === 'light';

    // Swap tiles
    map.removeLayer(TILES[currentTheme]);
    currentTheme = isLight ? 'dark' : 'light';
    TILES[currentTheme].addTo(map);

    // Ensure tile sits behind road layers
    TILES[currentTheme].bringToBack();

    // Update HTML theme attribute + button icon
    html.setAttribute('data-theme', currentTheme);
    btnIcon.setAttribute('data-lucide', isLight ? 'sun' : 'moon');
    lucide.createIcons();
};

// Add zoom control to bottom-right
L.control.zoom({ position: 'bottomright' }).addTo(map);

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
const roadLayers = new Map();  // roadId → Leaflet polyline
let routeLayer = null;         // Current route polyline on map
let altRouteLayers = [];
let originMarker = null;
let destMarker = null;
let incidentMarkers = new Map();
let currentRouteData = null;   // { distance, baseDuration, coords }
let currentInstructions = [];
let activeUtterance = null;    // Global reference to prevent GC

// ─────────────────────────────────────────────
// Voice: pre-load voices as soon as the engine
// is ready (fixes the empty-array race on first call)
// ─────────────────────────────────────────────
let cachedVoices = [];

const loadVoices = () => {
    cachedVoices = window.speechSynthesis.getVoices();
};

if ('speechSynthesis' in window) {
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    loadVoices(); // grab synchronously in case Firefox already has them
}

const pickVoice = () => {
    const voices = cachedVoices.length ? cachedVoices : window.speechSynthesis.getVoices();
    return (
        voices.find(v => v.lang === 'en-US' && v.localService) ||  // prefer local/offline
        voices.find(v => v.lang.startsWith('en-US')) ||
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0] ||
        null
    );
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const getTrafficColor = (congestion) => {
    if (congestion === 'high') return '#e74c3c';
    if (congestion === 'medium') return '#f1c40f';
    return '#2ecc71';
};

const setStatus = (text, online = false) => {
    const dot = document.getElementById('status-dot');
    const label = document.getElementById('status-label');
    label.textContent = text;
    dot.classList.toggle('online', online);
    label.classList.toggle('online', online);
};

const showToast = (msg, duration = 3000) => {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), duration);
};

const formatDist = (metres) =>
    metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres)} m`;

const formatMin = (seconds) => Math.round(seconds / 60);

// ─────────────────────────────────────────────
// Traffic congestion score for ETA adjustment
// ─────────────────────────────────────────────
const getTrafficMultiplier = () => {
    if (roadLayers.size === 0) return 1.0;
    let high = 0, medium = 0;
    roadLayers.forEach((polyline) => {
        const c = polyline.options._congestion;
        if (c === 'high') high++;
        else if (c === 'medium') medium++;
    });
    const total = roadLayers.size;
    const highRatio = high / total;
    const medRatio = medium / total;
    return 1 + highRatio * 1.0 + medRatio * 0.4;
};

const updateETA = () => {
    if (!currentRouteData) return;
    const mult = getTrafficMultiplier();
    const adjustedSec = currentRouteData.baseDuration * mult;
    const baseMins = formatMin(currentRouteData.baseDuration);
    const adjMins = formatMin(adjustedSec);
    const delayMins = adjMins - baseMins;

    document.getElementById('eta-time').textContent = adjMins;
    document.getElementById('stat-dist').textContent = formatDist(currentRouteData.distance);
    document.getElementById('stat-base').textContent = `${baseMins} min`;
    document.getElementById('stat-delay').textContent = delayMins > 0 ? `+${delayMins} min` : 'None';

    const badge = document.getElementById('eta-badge');
    const overall = mult < 1.15 ? 'low' : mult < 1.5 ? 'medium' : 'high';
    const labels = { low: 'Light', medium: 'Moderate', high: 'Heavy' };
    badge.textContent = labels[overall];
    badge.className = `eta-traffic-badge badge-${overall}`;
};

const maneuverIcons = {
    'turn': 'corner-up-right', 'sharp right': 'corner-up-right', 'slight right': 'arrow-up-right', 'right': 'arrow-right',
    'sharp left': 'corner-up-left', 'slight left': 'arrow-up-left', 'left': 'arrow-left', 'straight': 'arrow-up',
    'uturn': 'refresh-cw', 'roundabout': 'refresh-cw', 'arrive': 'flag', 'depart': 'navigation',
    'merge': 'merge', 'ramp': 'navigation', 'fork': 'git-branch'
};

const renderDirections = (steps) => {
    const list = document.getElementById('directions-list');
    currentInstructions = [];

    list.innerHTML = steps.map(step => {
        const { type, modifier } = step.maneuver;
        const streetName = step.name || 'the road';
        const iconName = maneuverIcons[modifier] || maneuverIcons[type] || 'arrow-up';
        const icon = `<i data-lucide="${iconName}"></i>`;

        let instruction = step.maneuver.instruction;
        if (!instruction) {
            const modStr = modifier ? ` ${modifier.replace('slight ', 'slight-').replace('sharp ', 'sharp-')}` : '';
            if (type === 'depart') instruction = `Head toward ${streetName}`;
            else if (type === 'arrive') instruction = 'You have arrived';
            else if (type === 'turn') instruction = `Turn${modStr} onto ${streetName}`;
            else if (type === 'merge') instruction = `Merge onto ${streetName}`;
            else if (type === 'ramp') instruction = `Take the ramp onto ${streetName}`;
            else if (type === 'fork') instruction = `Take the fork${modStr} onto ${streetName}`;
            else instruction = `${type.charAt(0).toUpperCase() + type.slice(1)}${modStr} onto ${streetName}`;
        }

        currentInstructions.push(instruction);

        return `
            <div class="direction-step">
                <div class="step-icon">${icon}</div>
                <div class="step-info">
                    <div class="step-text">${instruction}</div>
                    <div class="step-dist">${formatDist(step.distance)}</div>
                </div>
            </div>
        `;
    }).join('');
    document.getElementById('directions-panel').classList.add('visible');
    document.getElementById('directions-list').classList.remove('collapsed');
    document.getElementById('directions-toggle-icon').setAttribute('data-lucide', 'chevron-up');
    lucide.createIcons();
};

window.toggleDirections = () => {
    const list = document.getElementById('directions-list');
    const icon = document.getElementById('directions-toggle-icon');
    const isCollapsed = list.classList.toggle('collapsed');
    icon.setAttribute('data-lucide', isCollapsed ? 'chevron-down' : 'chevron-up');
    lucide.createIcons();
};

window.useMyLocation = () => {
    const btn = document.getElementById('btn-location');
    if (!navigator.geolocation) {
        showToast('Geolocation not supported');
        return;
    }

    btn.textContent = '⌛';
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
            const data = await res.json();
            const displayName = data.display_name;
            const shortName = displayName.split(',').slice(0, 2).join(', ');

            acState.origin.selected = {
                lat: latitude,
                lon: longitude,
                name: shortName,
                detail: displayName.split(',').slice(2, 4).join(', ').trim(),
                type: 'place'
            };
            document.getElementById('input-origin').value = shortName;
            showToast('Location updated');
        } catch (err) {
            showToast('Failed to resolve location name');
        } finally {
            btn.textContent = '📍';
        }
    }, () => {
        showToast('Location access denied');
        btn.textContent = '📍';
    });
};

window.updateSimSpeed = async (val) => {
    document.getElementById('sim-speed-val').textContent = `${parseFloat(val).toFixed(1)}x`;
    try {
        await fetch(`http://localhost:8080/api/traffic/speed?value=${val}`, { method: 'POST' });
    } catch (err) {
        console.warn('Failed to set sim speed', err);
    }
};

window.swapLocations = () => {
    const tempSelected = acState.origin.selected;
    acState.origin.selected = acState.dest.selected;
    acState.dest.selected = tempSelected;

    const originInput = document.getElementById('input-origin');
    const destInput = document.getElementById('input-dest');
    const tempVal = originInput.value;
    originInput.value = destInput.value;
    destInput.value = tempVal;

    if (acState.origin.selected && acState.dest.selected) {
        window.getRoute();
    }
};

// ─────────────────────────────────────────────
// speakDirections — fixed version
// ─────────────────────────────────────────────
window.speakDirections = (event) => {
    if (event) event.stopPropagation();

    if (!('speechSynthesis' in window)) {
        showToast('Voice not supported in this browser');
        return;
    }

    const btn = document.getElementById('btn-voice');
    const synth = window.speechSynthesis;

    // ── Toggle OFF ──────────────────────────────
    if (synth.speaking || synth.pending) {
        synth.cancel();
        btn.classList.remove('speaking');
        btn.innerHTML = '<i data-lucide="volume-2"></i>';
        lucide.createIcons();
        activeUtterance = null;
        return;
    }

    // ── Guard: no directions yet ────────────────
    if (!currentInstructions.length) {
        showToast('Get directions first');
        return;
    }

    const text = 'Route directions. ' + currentInstructions.join('. ') + '. End of route.';

    // FIX 1: Always cancel any stale/pending speech before starting.
    //        Even if speaking === false, a queued utterance can silently
    //        block the new one in Chrome.
    synth.cancel();

    // FIX 2: Wrap speak() in setTimeout.
    //        Chrome drops an utterance if speak() is called in the same
    //        tick as cancel(). The delay lets the cancel flush first.
    setTimeout(() => {
        activeUtterance = new SpeechSynthesisUtterance(text);
        activeUtterance.volume = 1.0;
        activeUtterance.rate = 0.95;
        activeUtterance.pitch = 1.0;

        // FIX 3: Use the pre-loaded voice cache instead of calling getVoices()
        //        at speak-time — on Chromium that call returns [] until
        //        'voiceschanged' has fired, leaving the utterance voiceless.
        const voice = pickVoice();
        if (voice) {
            activeUtterance.voice = voice;
            activeUtterance.lang = voice.lang; // keep lang in sync with voice
            console.log('Selected voice:', voice.name, voice.lang);
        } else {
            // FIX 4: If voices still aren't ready, wait and retry once.
            console.warn('No voices available yet — retrying after voiceschanged');
            window.speechSynthesis.addEventListener('voiceschanged', () => {
                window.speakDirections(null);
            }, { once: true });
            return;
        }

        activeUtterance.onstart = () => {
            btn.classList.add('speaking');
            btn.innerHTML = '<i data-lucide="square"></i>';
            lucide.createIcons();
        };

        activeUtterance.onend = () => {
            btn.classList.remove('speaking');
            btn.innerHTML = '<i data-lucide="volume-2"></i>';
            lucide.createIcons();
            activeUtterance = null;
        };

        activeUtterance.onerror = (e) => {
            console.error('Speech error:', e.error, e);
            btn.classList.remove('speaking');
            btn.innerHTML = '<i data-lucide="volume-2"></i>';
            lucide.createIcons();
            activeUtterance = null;
            if (e.error !== 'interrupted') showToast('Voice playback failed');
        };

        synth.speak(activeUtterance);

        // FIX 5: Chrome can auto-pause speech when it suspects there's no
        //        user-gesture ancestor (e.g. after an await chain). Force-
        //        resume after a short delay as a safety net.
        setTimeout(() => {
            if (synth.paused) synth.resume();
        }, 100);

    }, 50); // 50 ms is enough for cancel() to settle
};

const addIncident = (inc) => {
    if (incidentMarkers.has(inc.id)) return;

    showToast(`⚠ ${inc.type}: ${inc.name}`);

    const icon = L.divIcon({
        className: 'incident-marker-container',
        html: `<div class="incident-marker pulsing"><i data-lucide="alert-triangle"></i></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    const marker = L.marker([inc.lat, inc.lon], { icon })
        .addTo(map)
        .bindPopup(`<b>${inc.type}</b><br>${inc.name}<br><small>${inc.severity} severity</small>`);

    incidentMarkers.set(inc.id, marker);

    setTimeout(() => {
        if (incidentMarkers.has(inc.id)) {
            map.removeLayer(incidentMarkers.get(inc.id));
            incidentMarkers.delete(inc.id);
        }
    }, 5 * 60 * 1000);
};

// ─────────────────────────────────────────────
// Draw / update a road layer
// ─────────────────────────────────────────────
const drawRoad = (road) => {
    const polyline = L.polyline(road.coords, {
        color: getTrafficColor(road.congestion),
        weight: 3,
        opacity: 0.75,
        _congestion: road.congestion,
    }).addTo(map);

    polyline.bindPopup(`<b>${road.name || 'Road'}</b><br>
        Type: ${road.type}<br>
        Traffic: <b>${road.congestion}</b>`);

    roadLayers.set(road.id, polyline);
};

const updateRoad = (roadId, congestion) => {
    const layer = roadLayers.get(roadId);
    if (!layer) return;
    layer.setStyle({ color: getTrafficColor(congestion) });
    layer.options._congestion = congestion;
    updateETA();
};

// ─────────────────────────────────────────────
// Nominatim search (returns up to 5 results)
// ─────────────────────────────────────────────
const searchNominatim = async (query) => {
    const url = `https://nominatim.openstreetmap.org/search` +
        `?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    return data.map(d => ({
        lat: parseFloat(d.lat),
        lon: parseFloat(d.lon),
        name: d.display_name.split(',')[0].trim(),
        detail: d.display_name.split(',').slice(1, 3).join(',').trim(),
        type: d.type || d.class || 'place',
    }));
};

const geocode = async (query) => {
    const results = await searchNominatim(query);
    if (!results.length) throw new Error(`Could not find "${query}"`);
    return results[0];
};

// ─────────────────────────────────────────────
// Fuzzy Autocomplete Engine
// ─────────────────────────────────────────────
const acState = {
    origin: { results: [], activeIdx: -1, selected: null },
    dest: { results: [], activeIdx: -1, selected: null },
};

const typeIcon = (type) => {
    const icons = {
        city: 'map-pin', town: 'map-pin', village: 'map-pin', suburb: 'map-pin',
        station: 'train', railway: 'train', bus_stop: 'bus', hospital: 'hospital',
        school: 'graduation-cap', university: 'graduation-cap', restaurant: 'utensils', hotel: 'bed',
        park: 'trees', road: 'route', street: 'route', motorway: 'route', shop: 'shopping-bag'
    };
    return `<i data-lucide="${icons[type] || 'map-pin'}"></i>`;
};

const closeAllDropdowns = () => {
    ['origin', 'dest'].forEach(k => {
        document.getElementById(`dropdown-${k}`).classList.remove('open');
        document.getElementById(`input-${k}`).classList.remove('has-dropdown');
        acState[k].activeIdx = -1;
    });
};

const renderHistory = (key) => {
    const history = JSON.parse(localStorage.getItem('traffic_history') || '[]');
    if (!history.length) return;
    const results = history.map(h => h[key]).filter(Boolean);
    if (!results.length) return;
    renderDropdown(key, results, true);
};

const renderDropdown = (key, results, isHistory = false) => {
    const dropdown = document.getElementById(`dropdown-${key}`);
    const input = document.getElementById(`input-${key}`);
    acState[key].results = results;
    acState[key].activeIdx = -1;

    if (!results.length) {
        dropdown.classList.remove('open');
        input.classList.remove('has-dropdown');
        return;
    }

    let html = isHistory
        ? '<div class="ac-loading" style="text-align:left; font-size:0.65rem; padding-bottom:4px; opacity:0.8; text-transform:uppercase; letter-spacing:0.5px">Recent Searches</div>'
        : '';

    html += results.map((r, i) => `
        <div class="autocomplete-item" data-idx="${i}">
            <span class="ac-icon">${isHistory ? '<i data-lucide="history"></i>' : typeIcon(r.type)}</span>
            <div class="ac-text">
                <div class="ac-name">${r.name}</div>
                <div class="ac-detail">${r.detail || ''}</div>
            </div>
        </div>`).join('');

    dropdown.innerHTML = html;

    dropdown.querySelectorAll('.autocomplete-item').forEach(el => {
        el.addEventListener('mousedown', (e) => {
            e.preventDefault();
            selectResult(key, parseInt(el.dataset.idx));
        });
    });

    dropdown.classList.add('open');
    input.classList.add('has-dropdown');
    lucide.createIcons();
};

const highlightItem = (key, idx) => {
    const items = document.getElementById(`dropdown-${key}`).querySelectorAll('.autocomplete-item');
    items.forEach((el, i) => el.classList.toggle('active', i === idx));
    if (items[idx]) items[idx].scrollIntoView({ block: 'nearest' });
};

const selectResult = (key, idx) => {
    const result = acState[key].results[idx];
    if (!result) return;
    acState[key].selected = result;
    document.getElementById(`input-${key}`).value = result.name + (result.detail ? `, ${result.detail}` : '');
    closeAllDropdowns();
};

const debounce = (fn, ms) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};

const handleInput = debounce(async (key) => {
    const val = document.getElementById(`input-${key}`).value.trim();
    acState[key].selected = null;
    if (val.length < 2) {
        document.getElementById(`dropdown-${key}`).classList.remove('open');
        document.getElementById(`input-${key}`).classList.remove('has-dropdown');
        return;
    }
    const dropdown = document.getElementById(`dropdown-${key}`);
    dropdown.innerHTML = '<div class="ac-loading">Searching…</div>';
    dropdown.classList.add('open');
    document.getElementById(`input-${key}`).classList.add('has-dropdown');
    try {
        renderDropdown(key, await searchNominatim(val));
    } catch {
        dropdown.innerHTML = '<div class="ac-loading">Search failed</div>';
    }
}, 350);

const handleKeydown = (key, e) => {
    const state = acState[key];
    const open = document.getElementById(`dropdown-${key}`).classList.contains('open');

    if (e.key === 'Escape') { closeAllDropdowns(); return; }

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!open) return;
        state.activeIdx = Math.min(state.activeIdx + 1, state.results.length - 1);
        highlightItem(key, state.activeIdx);
        return;
    }
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!open) return;
        state.activeIdx = Math.max(state.activeIdx - 1, 0);
        highlightItem(key, state.activeIdx);
        return;
    }
    if (e.key === 'Enter') {
        if (open && state.activeIdx >= 0) {
            e.preventDefault();
            selectResult(key, state.activeIdx);
            if (key === 'origin') document.getElementById('input-dest').focus();
            else window.getRoute();
        } else {
            if (key === 'origin') document.getElementById('input-dest').focus();
            else window.getRoute();
        }
    }
};

['origin', 'dest'].forEach(key => {
    const input = document.getElementById(`input-${key}`);
    input.addEventListener('input', () => handleInput(key));
    input.addEventListener('keydown', (e) => handleKeydown(key, e));
    input.addEventListener('blur', () => setTimeout(() => {
        document.getElementById(`dropdown-${key}`).classList.remove('open');
        input.classList.remove('has-dropdown');
    }, 150));
    input.addEventListener('focus', () => {
        const val = input.value.trim();
        if (!val) renderHistory(key);
        else if (acState[key].results.length) renderDropdown(key, acState[key].results);
    });
});

const saveToHistory = (origin, dest) => {
    let history = JSON.parse(localStorage.getItem('traffic_history') || '[]');
    const entry = { origin, dest, timestamp: Date.now() };
    history = history.filter(h => !(h.origin.name === origin.name && h.dest.name === dest.name));
    history.unshift(entry);
    if (history.length > 5) history.pop();
    localStorage.setItem('traffic_history', JSON.stringify(history));
};

document.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-wrapper')) closeAllDropdowns();
});

// ─────────────────────────────────────────────
// OSRM Routing
// ─────────────────────────────────────────────
const fetchRoute = async (origin, dest) => {
    const url = `https://router.project-osrm.org/route/v1/driving/` +
        `${origin.lon},${origin.lat};${dest.lon},${dest.lat}` +
        `?overview=full&geometries=geojson&steps=true&alternatives=true`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== 'Ok') throw new Error('Routing failed');

    return data.routes.map(r => ({
        distance: r.distance,
        baseDuration: r.duration,
        coords: r.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
        steps: r.legs[0].steps,
    }));
};

// ─────────────────────────────────────────────
// Custom pin icons
// ─────────────────────────────────────────────
const makeIcon = (color) => L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};
                border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>`,
    iconAnchor: [7, 7],
});

// ─────────────────────────────────────────────
// Main: Get Route
// ─────────────────────────────────────────────
window.getRoute = async () => {
    const originText = document.getElementById('input-origin').value.trim();
    const destText = document.getElementById('input-dest').value.trim();
    if (!originText || !destText) { showToast('Please enter both origin and destination.'); return; }

    closeAllDropdowns();

    const btn = document.getElementById('btn-route');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>Finding route…';

    try {
        const origin = acState.origin.selected || await geocode(originText);
        const dest = acState.dest.selected || await geocode(destText);

        const routes = await fetchRoute(origin, dest);
        const bestRoute = routes[0];
        currentRouteData = bestRoute;

        if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
        altRouteLayers.forEach(l => map.removeLayer(l));
        altRouteLayers = [];

        if (originMarker) { map.removeLayer(originMarker); originMarker = null; }
        if (destMarker) { map.removeLayer(destMarker); destMarker = null; }

        for (let i = 1; i < routes.length; i++) {
            const alt = L.polyline(routes[i].coords, {
                color: '#94a3b8', weight: 4, opacity: 0.4
            }).addTo(map);
            altRouteLayers.push(alt);
        }

        routeLayer = L.polyline(bestRoute.coords, {
            color: '#3b82f6', weight: 6, opacity: 0.9,
            dashArray: '1, 10', lineCap: 'round',
        }).addTo(map);

        originMarker = L.marker([origin.lat, origin.lon], { icon: makeIcon('#3b82f6') })
            .addTo(map).bindPopup(`<b>Origin</b><br>${origin.name}`);
        destMarker = L.marker([dest.lat, dest.lon], { icon: makeIcon('#e74c3c') })
            .addTo(map).bindPopup(`<b>Destination</b><br>${dest.name}`);

        map.fitBounds(routeLayer.getBounds(), { padding: [60, 60] });
        updateETA();
        renderDirections(bestRoute.steps);
        saveToHistory(origin, dest);
        document.getElementById('eta-card').classList.add('visible');

    } catch (err) {
        showToast(`⚠ ${err.message}`);
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Get Directions';
    }
};

let scoreHistory = [];

const updateStats = async () => {
    try {
        const res = await fetch('http://localhost:8080/api/traffic/stats');
        const stats = await res.json();

        if (stats.score !== undefined) {
            const score = stats.score;
            document.getElementById('stats-score').textContent = `${score}%`;

            scoreHistory.push(score);
            if (scoreHistory.length > 20) scoreHistory.shift();

            const poly = document.getElementById('sparkline-poly');
            if (poly) {
                const width = 60;
                const height = 20;
                const len = scoreHistory.length;
                const step = len > 1 ? width / (len - 1) : width;
                const points = scoreHistory.map((s, i) => {
                    const x = i * step;
                    const y = height - (s / 100 * height);
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                }).join(' ');
                poly.setAttribute('points', points);

                const color = score < 15 ? '#2ecc71' : score < 40 ? '#f1c40f' : '#e74c3c';
                document.getElementById('stats-widget').style.color = color;
            }
        }
    } catch (err) {
        console.warn('Stats fetch failed', err);
    }
};

// ─────────────────────────────────────────────
// Load initial road state from REST API
// ─────────────────────────────────────────────
const loadInitialState = async () => {
    updateStats();
    setInterval(updateStats, 5000);
    try {
        const res = await fetch('http://localhost:8080/api/traffic/initial');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        if (result?.data) {
            result.data.forEach(drawRoad);
            if (roadLayers.size > 0) {
                const group = new L.featureGroup(Array.from(roadLayers.values()));
                map.fitBounds(group.getBounds(), { padding: [30, 30] });
            }
        }
    } catch (err) {
        console.warn('Initial state not yet available:', err.message);
    }
};

// ─────────────────────────────────────────────
// WebSocket – live traffic updates via STOMP
// ─────────────────────────────────────────────
const connectWebSocket = () => {
    const client = new Client({
        brokerURL: 'ws://localhost:8080/ws-traffic/websocket',
        reconnectDelay: 5000,

        onConnect: () => {
            setStatus('Live', true);
            client.subscribe('/topic/traffic', (message) => {
                const payload = JSON.parse(message.body);
                if (payload.type === 'traffic_update') {
                    payload.data.forEach(u => updateRoad(u.id, u.congestion));
                }
            });
            client.subscribe('/topic/incidents', (message) => {
                const payload = JSON.parse(message.body);
                if (payload.type === 'incident') {
                    payload.data.forEach(addIncident);
                }
            });
        },

        onDisconnect: () => setStatus('Reconnecting…'),
        onStompError: () => setStatus('Error'),
    });

    client.activate();
};

// ─────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────
loadInitialState().then(() => {
    connectWebSocket();
    lucide.createIcons();
});
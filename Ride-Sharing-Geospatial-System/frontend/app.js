// User's Location (Howrah)
const USER_LAT = 22.601151;
const USER_LON = 88.348256;
const API_BASE = "http://localhost:8080/api";

// Initialize Map
const map = L.map('map', {
    zoomControl: false // Move zoom control to a better spot
}).setView([USER_LAT, USER_LON], 15);

L.control.zoom({ position: 'bottomright' }).addTo(map);

// Add Dark/Modern Map Tiles
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

// Add User Marker
const userIcon = L.divIcon({
    className: 'user-marker',
    html: '<div style="width: 20px; height: 20px; background: #6366f1; border: 4px solid white; border-radius: 50%; box-shadow: 0 4px 15px rgba(0,0,0,0.3);"></div>',
    iconSize: [20, 20]
});
L.marker([USER_LAT, USER_LON], { icon: userIcon }).addTo(map);

const driverMarkers = {};

async function findRides() {
    const btn = document.getElementById('find-rides-btn');
    const resultsPanel = document.getElementById('results-panel');
    const driverList = document.getElementById('driver-list');
    
    btn.innerText = "Searching...";
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/rides/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                riderId: "test-rider",
                latitude: USER_LAT,
                longitude: USER_LON,
                radiusInKm: 5.0
            })
        });

        const drivers = await response.json();
        
        // Clear old markers
        Object.values(driverMarkers).forEach(m => map.removeLayer(m));
        driverList.innerHTML = "";
        
        if (drivers.length > 0) {
            resultsPanel.classList.remove('hidden');
            drivers.forEach(driver => {
                // Add to list
                const li = document.createElement('li');
                li.className = 'driver-item';
                li.innerHTML = `
                    <div class="driver-info">
                        <span class="car-icon">🚗</span>
                        <div>
                            <strong>${driver.driverId}</strong>
                            <div style="font-size: 11px; color: #64748b">Verified Driver</div>
                        </div>
                    </div>
                    <span class="distance">${driver.distance.toFixed(2)} km</span>
                `;
                driverList.appendChild(li);

                // Add Marker to Map
                const marker = L.marker([driver.latitude, driver.longitude], {
                    icon: L.divIcon({
                        className: 'driver-marker',
                        html: '<div style="font-size: 24px; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3))">🚗</div>',
                        iconSize: [30, 30]
                    })
                }).addTo(map);
                
                marker.bindPopup(`<strong>${driver.driverId}</strong><br>Distance: ${driver.distance.toFixed(2)} km`);
                driverMarkers[driver.driverId] = marker;
            });
            
            // Auto-zoom to show all drivers
            const group = new L.featureGroup(Object.values(driverMarkers).concat(
                L.marker([USER_LAT, USER_LON])
            ));
            map.fitBounds(group.getBounds().pad(0.1));
        } else {
            alert("No drivers found nearby!");
        }

    } catch (error) {
        console.error("Search failed:", error);
        alert("Could not connect to the matching engine.");
    } finally {
        btn.innerText = "Find Nearby Rides";
        btn.disabled = false;
    }
}

document.getElementById('find-rides-btn').addEventListener('click', findRides);

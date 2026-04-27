let currentMode = 'basic';
let searchTimeout = null;
let suggestTimeout = null;

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.toLowerCase().includes(mode)) btn.classList.add('active');
    });
    performSearch();
}

function handleInput() {
    const query = document.getElementById('search-input').value;
    
    // 1. Fetch Suggestions (Autocomplete)
    clearTimeout(suggestTimeout);
    if (query.length > 1) {
        suggestTimeout = setTimeout(() => fetchAutocomplete(query), 150);
    } else {
        hideSuggestions();
    }

    // 2. Perform actual search (Debounced)
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(performSearch, 400);
}

async function fetchAutocomplete(query) {
    try {
        const response = await fetch(`http://localhost:8082/v1/search/autocomplete?query=${encodeURIComponent(query)}`);
        const suggestions = await response.json();
        showSuggestions(suggestions);
    } catch (error) {
        console.error("Autocomplete failed:", error);
    }
}

function showSuggestions(suggestions) {
    const dropdown = document.getElementById('autocomplete-suggestions');
    if (suggestions.length === 0) {
        hideSuggestions();
        return;
    }

    dropdown.innerHTML = suggestions.map(s => `
        <div class="suggestion-item" onclick="selectSuggestion('${s.replace(/'/g, "\\'")}')">${s}</div>
    `).join('');
    dropdown.style.display = 'block';
}

function selectSuggestion(val) {
    document.getElementById('search-input').value = val;
    hideSuggestions();
    performSearch();
}

function hideSuggestions() {
    document.getElementById('autocomplete-suggestions').style.display = 'none';
}

function handleKeydown(e) {
    if (e.key === 'Enter') {
        hideSuggestions();
        performSearch();
    }
}

async function performSearch() {
    const query = document.getElementById('search-input').value;
    if (!query) {
        document.getElementById('results').innerHTML = '<div style="text-align: center; grid-column: 1/-1; opacity: 0.5; padding: 4rem;">Type something to start searching...</div>';
        return;
    }

    try {
        let url = `http://localhost:8082/v1/search/${currentMode}?query=${encodeURIComponent(query)}`;
        
        // Custom logic for Near-Me
        if (currentMode === 'near-me') {
            // Simulated User Location (e.g. Bengaluru center)
            const userLat = 12.9716;
            const userLon = 77.5946;
            url = `http://localhost:8082/v1/search/near-me?lat=${userLat}&lon=${userLon}&distance=10km`;
        }

        const response = await fetch(url);
        const data = await response.json();
        
        // Handle both SearchHits object and raw array
        const hits = data.searchHits ? data.searchHits : (Array.isArray(data) ? data : []);
        renderResults(hits);

        // Render Facets (Aggregations)
        if (data.aggregations && data.aggregations.aggregations) {
            renderFacets(data.aggregations.aggregations.categories.buckets);
        } else {
            document.getElementById('category-facets').innerHTML = '<div style="font-size: 0.8rem; color: #94a3b8;">No filters available</div>';
        }
    } catch (error) {
        console.error("Search failed:", error);
    }
}

function renderFacets(buckets) {
    const container = document.getElementById('category-facets');
    if (!buckets || buckets.length === 0) {
        container.innerHTML = '<div style="font-size: 0.8rem; color: #94a3b8;">No filters available</div>';
        return;
    }

    container.innerHTML = buckets.map(b => `
        <div class="facet-item">
            <span>${b.key}</span>
            <span class="facet-count">${b.docCount}</span>
        </div>
    `).join('');
}

function renderResults(hits) {
    const container = document.getElementById('results');
    if (!hits || hits.length === 0) {
        container.innerHTML = '<div style="text-align: center; grid-column: 1/-1; opacity: 0.5; padding: 4rem;">No matching products found.</div>';
        return;
    }

    container.innerHTML = hits.map(hit => {
        const p = hit.content;
        const highlights = hit.highlightFields || {};
        
        // Use highlighted text if available, otherwise fallback to original
        const name = highlights.name ? highlights.name[0] : p.name;
        const description = highlights.description ? highlights.description[0] : p.description;

        return `
            <div class="card">
                <h3>${name}</h3>
                <p>${description}</p>
                <div class="meta">
                    <span style="color: #a855f7;">${p.category}</span>
                    <span style="color: #10b981;">$${p.price}</span>
                </div>
            </div>
        `;
    }).join('');
}

async function saveProduct() {
    // Explicitly build the object to prevent any hidden duplication
    const nameVal = document.getElementById('product-name-input').value;
    const descVal = document.getElementById('p-desc').value;
    const catVal = document.getElementById('p-cat').value;
    const priceVal = parseFloat(document.getElementById('p-price').value || 0);
    const latVal = parseFloat(document.getElementById('p-lat').value || 0);
    const lonVal = parseFloat(document.getElementById('p-lon').value || 0);

    const product = {
        "name": nameVal,
        "description": descVal,
        "category": catVal,
        "price": priceVal,
        "location": {
            "lat": latVal,
            "lon": lonVal
        },
        "stock": 100
    };

    try {
        const response = await fetch('http://localhost:8082/v1/search/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });

        if (response.ok) {
            alert("Product indexed successfully!");
            toggleModal(false);
            // Clear fields
            document.querySelectorAll('input, textarea').forEach(el => el.value = '');
        }
    } catch (error) {
        alert("Failed to save product.");
    }
}

function toggleModal(show) {
    document.getElementById('modal').style.display = show ? 'flex' : 'none';
}

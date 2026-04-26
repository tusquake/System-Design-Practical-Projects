let currentMode = 'basic';
let timeout = null;

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.toLowerCase().includes(mode)) btn.classList.add('active');
    });
    performSearch();
}

function debounceSearch() {
    clearTimeout(timeout);
    timeout = setTimeout(performSearch, 300);
}

async function performSearch() {
    const query = document.getElementById('search-input').value;
    if (!query) {
        document.getElementById('results').innerHTML = '<div style="text-align: center; grid-column: 1/-1; opacity: 0.5; padding: 4rem;">Type something to start searching...</div>';
        return;
    }

    try {
        const response = await fetch(`http://localhost:8082/v1/search/${currentMode}?query=${encodeURIComponent(query)}`);
        const products = await response.json();
        renderResults(products);
    } catch (error) {
        console.error("Search failed:", error);
    }
}

function renderResults(products) {
    const container = document.getElementById('results');
    if (products.length === 0) {
        container.innerHTML = '<div style="text-align: center; grid-column: 1/-1; opacity: 0.5; padding: 4rem;">No matching products found.</div>';
        return;
    }

    container.innerHTML = products.map(p => `
        <div class="card">
            <h3>${p.name}</h3>
            <p>${p.description}</p>
            <div class="meta">
                <span style="color: #a855f7;">${p.category}</span>
                <span style="color: #10b981;">$${p.price}</span>
            </div>
        </div>
    `).join('');
}

async function saveProduct() {
    const product = {
        name: document.getElementById('p-name').value,
        description: document.getElementById('p-desc').value,
        category: document.getElementById('p-cat').value,
        price: parseFloat(document.getElementById('p-price').value),
        stock: 100
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

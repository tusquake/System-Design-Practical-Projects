const API_BASE = "http://localhost:8081/api/ledger";
let currentUsername = "";

// Helper to generate a unique key for each request
function generateIdempotencyKey() {
    return 'key-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

async function createAccount() {
    const username = document.getElementById('new-user').value;
    const balance = document.getElementById('initial-balance').value;

    if (!username) return alert("Please enter a username");

    try {
        const res = await fetch(`${API_BASE}/wallets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, initialBalance: balance || 0 })
        });
        
        if (res.ok) {
            currentUsername = username;
            updateUI();
            alert(`Account created for ${username}!`);
        }
    } catch (err) {
        alert("Failed to connect to backend");
    }
}

async function performTransfer() {
    if (!currentUsername) return alert("Please log in/create an account first");
    
    const toUser = document.getElementById('to-user').value;
    const amount = document.getElementById('amount').value;
    const idempotencyKey = generateIdempotencyKey();

    try {
        const res = await fetch(`${API_BASE}/transfer`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Idempotency-Key': idempotencyKey
            },
            body: JSON.stringify({ 
                fromUser: currentUsername, 
                toUser: toUser, 
                amount: amount 
            })
        });

        if (res.ok) {
            updateUI();
            document.getElementById('amount').value = '';
            document.getElementById('to-user').value = '';
        } else {
            const err = await res.text();
            alert("Error: " + err);
        }
    } catch (err) {
        alert("Transfer failed");
    }
}

async function updateUI() {
    if (!currentUsername) return;

    // Update Header
    document.getElementById('current-user').innerText = `Active: ${currentUsername}`;
    document.getElementById('account-name').innerText = currentUsername;

    // Fetch History & Balance
    try {
        const res = await fetch(`${API_BASE}/history/${currentUsername}`);
        const history = await res.json();

        // Update History List
        const list = document.getElementById('history-list');
        list.innerHTML = '';

        let currentBalance = 0;

        history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            
            const isPositive = item.amount > 0;
            
            div.innerHTML = `
                <div class="history-info">
                    <p>${item.type}</p>
                    <p class="desc">${item.description}</p>
                </div>
                <div class="history-amount ${isPositive ? 'positive' : 'negative'}">
                    ${isPositive ? '+' : ''}${item.amount}
                </div>
            `;
            list.appendChild(div);
        });

        // Calculate Balance from History (Audit proof!)
        const total = history.reduce((sum, item) => sum + item.amount, 0);
        document.getElementById('balance').innerText = `$${total.toFixed(2)}`;

    } catch (err) {
        console.error("UI Update failed", err);
    }
}

// Auto-refresh every 5 seconds
setInterval(updateUI, 5000);

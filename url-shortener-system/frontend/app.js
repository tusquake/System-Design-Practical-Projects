const longUrlInput = document.getElementById('long-url');
const shortenBtn = document.getElementById('shorten-btn');
const resultCard = document.getElementById('result-card');
const shortUrlDisplay = document.getElementById('short-url-display');
const copyBtn = document.getElementById('copy-btn');
const errorMessage = document.getElementById('error-message');

const API_BASE = "http://localhost:8081";

shortenBtn.onclick = async () => {
    const longUrl = longUrlInput.value.trim();
    if (!longUrl) return;

    errorMessage.style.display = 'none';
    resultCard.style.display = 'none';
    shortenBtn.disabled = true;
    shortenBtn.innerText = "Processing...";

    try {
        const response = await fetch(`${API_BASE}/api/v1/shorten`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ longUrl })
        });

        if (!response.ok) throw new Error("Failed to shorten URL");

        const { shortCode } = await response.json();
        const shortUrl = `${API_BASE}/${shortCode}`;

        shortUrlDisplay.innerText = shortUrl;
        resultCard.style.display = 'block';
    } catch (err) {
        errorMessage.innerText = "Error: " + err.message;
        errorMessage.style.display = 'block';
    } finally {
        shortenBtn.disabled = false;
        shortenBtn.innerText = "Shorten Now";
    }
};

copyBtn.onclick = () => {
    navigator.clipboard.writeText(shortUrlDisplay.innerText);
    copyBtn.innerText = "";
    setTimeout(() => copyBtn.innerText = "", 2000);
};

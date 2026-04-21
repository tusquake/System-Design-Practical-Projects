const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const fileNameDisplay = document.getElementById('file-name-display');
const fileSizeDisplay = document.getElementById('file-size');
const uploadBtn = document.getElementById('upload-btn');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const resultCard = document.getElementById('result-card');
const downloadLink = document.getElementById('download-link');

const API_BASE = "http://localhost:8080/files";
let selectedFile = null;

// Handle file selection
dropZone.onclick = () => fileInput.click();

fileInput.onchange = (e) => {
    selectedFile = e.target.files[0];
    if (selectedFile) {
        fileNameDisplay.innerText = selectedFile.name;
        fileSizeDisplay.innerText = formatBytes(selectedFile.size);
        fileInfo.style.display = 'block';
        dropZone.style.display = 'none';
    }
};

// Main Upload Logic
uploadBtn.onclick = async () => {
    if (!selectedFile) return;

    try {
        fileInfo.style.display = 'none';
        progressContainer.style.display = 'block';

        // 1. Get Signed URL from Backend
        const response = await fetch(`${API_BASE}/upload-url?fileName=${encodeURIComponent(selectedFile.name)}&contentType=${encodeURIComponent(selectedFile.type)}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to get signed URL");
        }
        
        const { uploadUrl, fileName } = await response.json();

        // 2. Upload to GCS directly using the signed URL
        await uploadToGcs(uploadUrl, selectedFile);

        // 3. Get Download URL for the newly uploaded file
        const downloadResp = await fetch(`${API_BASE}/download-url?fileName=${encodeURIComponent(fileName)}`);
        const { downloadUrl } = await downloadResp.json();

        // 4. Show Success State
        progressContainer.style.display = 'none';
        resultCard.style.display = 'block';
        downloadLink.href = downloadUrl;

    } catch (err) {
        console.error("Upload process failed:", err);
        alert("Upload Failed: " + err.message);
        location.reload();
    }
};

/**
 * Performs the actual PUT request to GCS
 */
function uploadToGcs(url, file) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", url);
        
        // This header must match the one used during URL signing in the backend
        xhr.setRequestHeader("Content-Type", file.type);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                progressFill.style.width = percent + "%";
                progressText.innerText = percent + "%";
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                resolve();
            } else {
                reject(new Error(`GCS returned status ${xhr.status}`));
            }
        };

        xhr.onerror = () => reject(new Error("Network connection error during GCS upload"));
        xhr.send(file);
    });
}

/**
 * Utility: Format file sizes
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

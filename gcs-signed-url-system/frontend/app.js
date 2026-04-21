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
const fileTableBody = document.getElementById('file-table-body');
const noFilesMessage = document.getElementById('no-files');
const refreshBtn = document.getElementById('refresh-btn');

const API_BASE = "http://localhost:8080/files";
let selectedFile = null;

// Initial load
document.addEventListener('DOMContentLoaded', loadFiles);
if (refreshBtn) refreshBtn.onclick = loadFiles;

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

        // 1. Get Resumable Initiate URL from Backend
        const response = await fetch(`${API_BASE}/resumable-session?fileName=${encodeURIComponent(selectedFile.name)}&contentType=${encodeURIComponent(selectedFile.type)}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to initiate resumable session");
        }
        
        const { initiateUrl, fileName } = await response.json();

        // 2. Perform the Resumable Upload Handshake and Data Transfer
        await uploadToGcsResumable(initiateUrl, selectedFile);

        // 3. Refresh list after upload
        await loadFiles();

        // 4. Show Success State
        progressContainer.style.display = 'none';
        resultCard.style.display = 'block';
        
        // Setup direct download link for the success card
        const downloadResp = await fetch(`${API_BASE}/download-url?fileName=${encodeURIComponent(fileName)}`);
        const { downloadUrl } = await downloadResp.json();
        downloadLink.href = downloadUrl;

    } catch (err) {
        console.error("Upload process failed:", err);
        alert("Upload Failed: " + err.message);
        location.reload();
    }
};

// Modal elements
const modal = document.getElementById('summary-modal');
const closeModal = document.getElementById('close-modal');
const summaryText = document.getElementById('summary-text');
const summaryLoading = document.getElementById('summary-loading');

if (closeModal) {
    closeModal.onclick = () => modal.style.display = 'none';
}
window.onclick = (event) => {
    if (event.target == modal) modal.style.display = 'none';
};

/**
 * Fetches all file metadata from the backend and populates the table
 */
async function loadFiles() {
    try {
        const response = await fetch(API_BASE);
        const files = await response.json();

        fileTableBody.innerHTML = '';
        
        if (files.length === 0) {
            noFilesMessage.style.display = 'block';
            return;
        }

        noFilesMessage.style.display = 'none';
        files.forEach(file => {
            const isPdf = file.contentType === 'application/pdf';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><div class="file-name-cell" title="${file.originalFileName}">${file.originalFileName}</div></td>
                <td><span class="badge">${file.contentType.split('/')[1].toUpperCase()}</span></td>
                <td>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn-small" onclick="viewFile('${file.gcsFileName}')">View</button>
                        ${isPdf ? `<button class="btn-small secondary-btn" onclick="showSummary('${file.gcsFileName}')">Summary</button>` : ''}
                    </div>
                </td>
            `;
            fileTableBody.appendChild(row);
        });
    } catch (err) {
        console.error("Failed to load files:", err);
    }
}

/**
 * Fetches AI summary for a PDF and displays it in the modal
 */
async function showSummary(gcsFileName) {
    modal.style.display = 'block';
    summaryLoading.style.display = 'block';
    summaryText.innerText = '';

    try {
        const response = await fetch(`${API_BASE}/summary?fileName=${encodeURIComponent(gcsFileName)}`);
        const data = await response.json();
        
        summaryLoading.style.display = 'none';
        summaryText.innerText = data.summary;
    } catch (err) {
        summaryLoading.style.display = 'none';
        summaryText.innerText = "Error fetching summary. Make sure the AI processing is complete.";
    }
}

/**
 * Generates a signed download URL and opens it in a new tab
 */
async function viewFile(gcsFileName) {
    try {
        const response = await fetch(`${API_BASE}/download-url?fileName=${encodeURIComponent(gcsFileName)}`);
        const { downloadUrl } = await response.json();
        window.open(downloadUrl, '_blank');
    } catch (err) {
        alert("Failed to generate download URL");
    }
}

/**
 * Performs a 2-step Resumable Upload to GCS
 */
function uploadToGcsResumable(initiateUrl, file) {
    return new Promise((resolve, reject) => {
        // Step 1: POST to the initiation URL to get a Session URI
        const xhrInit = new XMLHttpRequest();
        xhrInit.open("POST", initiateUrl);
        xhrInit.setRequestHeader("x-goog-resumable", "start");
        xhrInit.setRequestHeader("Content-Type", file.type);

        xhrInit.onload = () => {
            if (xhrInit.status === 200 || xhrInit.status === 201) {
                // Step 2: The Session URI is in the 'Location' header
                const sessionUrl = xhrInit.getResponseHeader("Location");
                
                const xhrUpload = new XMLHttpRequest();
                xhrUpload.open("PUT", sessionUrl);
                
                xhrUpload.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        progressFill.style.width = percent + "%";
                        progressText.innerText = percent + "%";
                    }
                };

                xhrUpload.onload = () => {
                    if (xhrUpload.status === 200 || xhrUpload.status === 201) {
                        resolve();
                    } else {
                        reject(new Error(`GCS Upload failed with status ${xhrUpload.status}`));
                    }
                };

                xhrUpload.onerror = () => reject(new Error("Network error during data transfer"));
                xhrUpload.send(file);
            } else {
                reject(new Error(`Session initiation failed with status ${xhrInit.status}`));
            }
        };

        xhrInit.onerror = () => reject(new Error("Network error during session initiation"));
        xhrInit.send();
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

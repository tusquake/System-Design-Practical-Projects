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

// Resumable state
let currentXhr = null;
let currentSessionUrl = null;
let currentFileName = null;

const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const resumableControls = document.getElementById('resumable-controls');

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
        resumableControls.style.display = 'flex';
        resumableControls.style.justifyContent = 'center';
        resumableControls.style.gap = '10px';

        // 1. Get Resumable Initiate URL from Backend
        const response = await fetch(`${API_BASE}/resumable-session?fileName=${encodeURIComponent(selectedFile.name)}&contentType=${encodeURIComponent(selectedFile.type)}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to initiate resumable session");
        }
        
        const data = await response.json();
        currentFileName = data.fileName;

        // 2. Start the resumable session and get Session URI
        currentSessionUrl = await initiateResumableSession(data.initiateUrl, selectedFile.type);
        
        // 3. Start the actual data transfer
        await uploadBytes(0);

        // 4. Cleanup and Success
        finalizeUpload(currentFileName);

    } catch (err) {
        if (err.message !== "UPLOAD_PAUSED") {
            console.error("Upload process failed:", err);
            alert("Upload Failed: " + err.message);
            location.reload();
        }
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
 * Step 1: Initiate the session and return the Location header
 */
function initiateResumableSession(initiateUrl, contentType) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", initiateUrl);
        xhr.setRequestHeader("x-goog-resumable", "start");
        xhr.setRequestHeader("Content-Type", contentType);

        xhr.onload = () => {
            if (xhr.status === 200 || xhr.status === 201) {
                resolve(xhr.getResponseHeader("Location"));
            } else {
                reject(new Error("Failed to initiate session"));
            }
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send();
    });
}

/**
 * Step 2: Upload bytes from a specific offset
 */
function uploadBytes(offset) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        currentXhr = xhr;
        
        xhr.open("PUT", currentSessionUrl);
        // Resumable PUTs require a Content-Range header
        const contentRange = `bytes ${offset}-${selectedFile.size - 1}/${selectedFile.size}`;
        xhr.setRequestHeader("Content-Range", contentRange);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const totalUploaded = offset + e.loaded;
                const percent = Math.round((totalUploaded / selectedFile.size) * 100);
                progressFill.style.width = percent + "%";
                progressText.innerText = percent + "%";
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200 || xhr.status === 201) {
                resolve();
            } else {
                reject(new Error(`GCS Upload failed with status ${xhr.status}`));
            }
        };

        xhr.onerror = () => reject(new Error("Network error during data transfer"));
        xhr.onabort = () => reject(new Error("UPLOAD_PAUSED"));

        const blob = selectedFile.slice(offset);
        xhr.send(blob);
    });
}

/**
 * Finalize UI after success
 */
async function finalizeUpload(fileName) {
    await loadFiles();
    progressContainer.style.display = 'none';
    resumableControls.style.display = 'none';
    resultCard.style.display = 'block';
    
    const downloadResp = await fetch(`${API_BASE}/download-url?fileName=${encodeURIComponent(fileName)}`);
    const { downloadUrl } = await downloadResp.json();
    downloadLink.href = downloadUrl;
}

// Button controls
pauseBtn.onclick = () => {
    if (currentXhr) {
        currentXhr.abort();
        pauseBtn.style.display = 'none';
        resumeBtn.style.display = 'inline-block';
    }
};

resumeBtn.onclick = async () => {
    resumeBtn.style.display = 'none';
    pauseBtn.style.display = 'inline-block';
    
    try {
        const offset = await getUploadOffset();
        await uploadBytes(offset);
        finalizeUpload(currentFileName);
    } catch (err) {
        if (err.message !== "UPLOAD_PAUSED") alert("Resume failed: " + err.message);
    }
};

/**
 * Queries GCS for the current offset (last byte received)
 */
function getUploadOffset() {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", currentSessionUrl);
        xhr.setRequestHeader("Content-Range", `bytes */${selectedFile.size}`);
        
        xhr.onload = () => {
            if (xhr.status === 308) {
                const range = xhr.getResponseHeader("Range");
                if (range) {
                    const lastByte = parseInt(range.split('-')[1]);
                    resolve(lastByte + 1);
                } else {
                    resolve(0);
                }
            } else if (xhr.status === 200 || xhr.status === 201) {
                resolve(selectedFile.size);
            } else {
                reject(new Error("Failed to query offset"));
            }
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send();
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

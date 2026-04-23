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
const CDN_BASE_URL = "http://34.8.62.41"; // Global Load Balancer IP
let selectedFile = null;

// Resumable state
let currentXhr = null;
let currentSessionUrl = null;
let currentFileName = null;

const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const resumableControls = document.getElementById('resumable-controls');
const fileSearch = document.getElementById('file-search');
const filterBtns = document.querySelectorAll('.filter-btn');

let allFiles = [];
let currentFilter = 'all';
let searchQuery = '';

// Initial load
document.addEventListener('DOMContentLoaded', loadFiles);
if (refreshBtn) refreshBtn.onclick = loadFiles;

// Search listener
if (fileSearch) {
    fileSearch.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderFiles();
    });
}

// Filter listeners
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderFiles();
    });
});

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

const videoModal = document.getElementById('video-modal');
const closeVideoModal = document.getElementById('close-video-modal');
const videoPlayer = document.getElementById('video-player');
const videoStatus = document.getElementById('video-status');

if (closeModal) {
    closeModal.onclick = () => modal.style.display = 'none';
}
if (closeVideoModal) {
    closeVideoModal.onclick = () => {
        videoModal.style.display = 'none';
        videoPlayer.pause();
        videoPlayer.src = "";
    };
}

window.onclick = (event) => {
    if (event.target == modal) modal.style.display = 'none';
    if (event.target == videoModal) {
        videoModal.style.display = 'none';
        videoPlayer.pause();
    }
};

/**
 * Fetches all file metadata from the backend
 */
async function loadFiles() {
    try {
        const response = await fetch(API_BASE);
        allFiles = await response.json();
        renderFiles();
    } catch (err) {
        console.error("Failed to load files:", err);
    }
}

/**
 * Renders the filtered and searched files to the table
 */
function renderFiles() {
    fileTableBody.innerHTML = '';

    const filtered = allFiles.filter(file => {
        const matchesSearch = file.originalFileName.toLowerCase().includes(searchQuery);
        const matchesFilter = currentFilter === 'all' || file.contentType === currentFilter;
        return matchesSearch && matchesFilter;
    });

    if (filtered.length === 0) {
        noFilesMessage.style.display = 'block';
        return;
    }

    noFilesMessage.style.display = 'none';
    filtered.forEach(file => {
        const isPdf = file.contentType === 'application/pdf';
        const isVideo = file.contentType === 'video/mp4';
        const row = document.createElement('tr');

        // Status Badge logic
        let statusClass = 'badge-pending';
        if (file.status === 'READY') statusClass = 'badge-ready';
        if (file.status === 'PROCESSING') statusClass = 'badge-processing';

        // Use CDN for thumbnails
        const thumbnailPath = isVideo
            ? `${CDN_BASE_URL}/processed-videos/${file.gcsFileName.replace('.mp4', '')}/thumbnail0000000000.jpg`
            : null;

        row.innerHTML = `
            <td style="width: 100px;">
                <span class="badge ${statusClass}">${file.status || 'READY'}</span>
            </td>
            <td>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    ${isVideo ? `
                        <div style="width: 40px; height: 40px; border-radius: 8px; background: #334155; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                            <img src="${thumbnailPath}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.parentElement.innerHTML='🎬'">
                        </div>
                    ` : `
                        <div style="width: 40px; height: 40px; border-radius: 8px; background: #1e293b; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                            ${isPdf ? '📄' : '📁'}
                        </div>
                    `}
                    <div class="file-name-cell" title="${file.originalFileName}">${file.originalFileName}</div>
                </div>
            </td>
            <td><span class="badge">${file.contentType.split('/')[1].toUpperCase()}</span></td>
            <td>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-small" onclick="viewFile('${file.gcsFileName}')">View</button>
                    ${isPdf ? `<button class="btn-small secondary-btn" onclick="showSummary('${file.gcsFileName}')">Summary</button>` : ''}
                    ${isVideo ? `<button class="btn-small secondary-btn" style="background: #10b981 !important;" onclick="streamVideo('${file.gcsFileName}')">Stream</button>` : ''}
                </div>
            </td>
        `;
        fileTableBody.appendChild(row);
    });
}

const qualitySelect = document.getElementById('quality-select');

// Sprite sheet constants — must match your transcoder config
const SPRITE_COLS = 10;
const SPRITE_ROWS = 10;
const SPRITE_TOTAL = 100;   // SPRITE_COLS * SPRITE_ROWS
const SPRITE_CELL_W = 160;   // sprite_width_pixels in transcoder config
const SPRITE_CELL_H = 90;    // sprite_height_pixels in transcoder config
const SPRITE_SHEET_W = SPRITE_COLS * SPRITE_CELL_W;  // 1600px total sheet width
const SPRITE_SHEET_H = SPRITE_ROWS * SPRITE_CELL_H;  // 900px total sheet height

/**
 * Initializes HLS.js to play a processed video manifest from GCS
 */
async function streamVideo(gcsFileName) {
    videoModal.style.display = 'block';

    // Reset quality selector
    qualitySelect.innerHTML = '<option value="-1">Auto (ABR)</option>';

    const baseName = gcsFileName.replace(".mp4", "");
    const manifestUrl = `${CDN_BASE_URL}/processed-videos/${baseName}/manifest.m3u8`;

    try {
        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(manifestUrl);
            hls.attachMedia(videoPlayer);

            hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
                // Populate quality levels
                data.levels.forEach((level, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.text = `${level.height}p (${Math.round(level.bitrate / 1000)} kbps)`;
                    qualitySelect.appendChild(option);
                });

                videoPlayer.play();
                videoStatus.innerText = "Adaptive Bitrate active. Streaming 720p/360p segments...";
            });

            // ─── Seek Preview (Sprite Sheet) ──────────────────────────────────
            const seekPreview = document.getElementById('seek-preview');
            let spriteSheetUrl = `${CDN_BASE_URL}/processed-videos/${baseName}/preview0000000000.jpeg`;

            // Apply fixed dimensions
            seekPreview.style.width = `${SPRITE_CELL_W}px`;
            seekPreview.style.height = `${SPRITE_CELL_H}px`;

            let hasPreview = false;
            const img = new Image();
            img.onload = () => { 
                console.log("✅ Seek Preview Loaded:", spriteSheetUrl);
                hasPreview = true; 
            };
            img.onerror = () => { 
                // Fallback: try with a dash if the first one fails
                if (!spriteSheetUrl.includes("preview-")) {
                    spriteSheetUrl = `${CDN_BASE_URL}/processed-videos/${baseName}/preview-0000000000.jpg`;
                    console.log("🔄 Trying fallback URL:", spriteSheetUrl);
                    img.src = spriteSheetUrl;
                } else {
                    console.error("❌ Seek Preview failed to load at both paths.");
                    hasPreview = false; 
                }
            };
            img.src = spriteSheetUrl;

            videoPlayer.onmousemove = (e) => {
                if (!videoPlayer.duration || !hasPreview) return;

                const rect = videoPlayer.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percent = Math.max(0, Math.min(1, x / rect.width));

                // Map percentage → sprite index (0-99)
                const index = Math.min(Math.floor(percent * SPRITE_TOTAL), SPRITE_TOTAL - 1);
                const col = index % SPRITE_COLS;
                const row = Math.floor(index / SPRITE_COLS);

                // Position the preview thumbnail horizontally, clamped inside the player
                let previewLeft = x - SPRITE_CELL_W / 2;
                previewLeft = Math.max(0, Math.min(rect.width - SPRITE_CELL_W, previewLeft));

                seekPreview.style.display = 'block';
                seekPreview.style.left = `${previewLeft}px`;

                // FIX: use explicit px for backgroundSize so the browser
                // scales the full sprite sheet to the correct pixel dimensions
                // and doesn't auto-distort the height when only one axis is given.
                seekPreview.style.backgroundImage = `url(${spriteSheetUrl})`;
                seekPreview.style.backgroundSize = `${SPRITE_SHEET_W}px ${SPRITE_SHEET_H}px`;
                seekPreview.style.backgroundPosition = `-${col * SPRITE_CELL_W}px -${row * SPRITE_CELL_H}px`;
                seekPreview.style.backgroundRepeat = 'no-repeat';
            };

            videoPlayer.onmouseleave = () => {
                seekPreview.style.display = 'none';
            };
            // ─────────────────────────────────────────────────────────────────

            // Handle manual quality change
            qualitySelect.onchange = () => {
                hls.currentLevel = parseInt(qualitySelect.value);
                if (hls.currentLevel === -1) {
                    videoStatus.innerText = "Switched to Auto (ABR) mode";
                } else {
                    videoStatus.innerText = `Forced quality to ${hls.levels[hls.currentLevel].height}p`;
                }
            };

            hls.on(Hls.Events.LEVEL_SWITCHED, function (event, data) {
                const level = hls.levels[data.level];
                if (hls.loadLevel === -1) {
                    videoStatus.innerText = `Auto: Switched to ${level.height}p (Bitrate: ${Math.round(level.bitrate / 1000)} kbps)`;
                }
            });

        } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari native HLS — no sprite preview support here
            videoPlayer.src = manifestUrl;
            videoStatus.innerText = "Native HLS (Safari/Mobile). Manual quality not supported.";
            videoPlayer.play();
        }
    } catch (err) {
        alert("Video stream not ready yet. Transcoding might be in progress.");
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
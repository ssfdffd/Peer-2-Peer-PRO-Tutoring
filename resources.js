/**
 * PEER-2-PEER RESOURCES - CLOUDFLARE R2 + WORKERS VERSION
 */

// 1. SETTINGS - Replace this URL with your actual Cloudflare Worker URL later
const WORKER_URL = "https://resource-handler.ssfdffd.workers.dev"; 

document.addEventListener('DOMContentLoaded', () => {
    // Sidebar Logic
    const openNav = document.getElementById('openNav');
    const closeNav = document.getElementById('closeNav');
    const sideMenu = document.getElementById('side-menu');

    if (openNav) openNav.onclick = () => sideMenu.style.width = "280px";
    if (closeNav) closeNav.onclick = () => sideMenu.style.width = "0";

    // Load Documents from Cloudflare R2
    fetchDocuments();

    // Setup the Upload Button (Direct to Worker)
    setupUploadListeners();
});

// --- FETCH FROM CLOUDFLARE ---
async function fetchDocuments() {
    const fileGrid = document.getElementById('fileGrid');
    fileGrid.innerHTML = '<div class="loading">Connecting to R2 Storage...</div>';

    try {
        // We fetch the list of files directly from your Worker
        const response = await fetch(`${WORKER_URL}/list`);
        const files = await response.json();

        fileGrid.innerHTML = ''; 

        if (!files || files.length === 0) {
            fileGrid.innerHTML = '<div class="no-docs"><h3>No documents in the cloud yet.</h3></div>';
            return;
        }

        files.forEach(file => {
            const extension = file.key.split('.').pop().toLowerCase();
            const publicUrl = `${WORKER_URL}/download?key=${encodeURIComponent(file.key)}`;
            
            const card = document.createElement('div');
            card.className = 'file-card';
            card.innerHTML = `
                <div class="file-type-badge">${extension}</div>
                <div class="file-icon-box"><i class="fas ${getIcon(extension)}"></i></div>
                <div class="file-info">
                    <h3>${file.key.replace(/-/g, ' ')}</h3>
                    <span class="badge">Size: ${(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div class="card-actions">
                    <button onclick="viewFile('${publicUrl}', '${file.key}')" class="btn-view"><i class="fas fa-eye"></i></button>
                    <a href="${publicUrl}" download class="btn-download"><i class="fas fa-download"></i></a>
                </div>
            `;
            fileGrid.appendChild(card);
        });
    } catch (err) {
        fileGrid.innerHTML = '<div class="error"><h3>Storage Offline</h3><p>Please check Worker bindings.</p></div>';
        console.error("Cloudflare Error:", err);
    }
}

function getIcon(ext) {
    const icons = { pdf: 'fa-file-pdf', png: 'fa-file-image', jpg: 'fa-file-image' };
    return icons[ext] || 'fa-file-alt';
}

function setupUploadListeners() {
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
        uploadBtn.onclick = () => {
            // In the Pro version, we can show a real file picker or redirect
            const input = document.createElement('input');
            input.type = 'file';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                alert(`Uploading ${file.name} to Cloudflare R2...`);
                // Upload logic will go here once Worker is live
            };
            input.click();
        };
    }
}

function viewFile(url, title) {
    const container = document.getElementById('viewerContainer');
    const content = document.getElementById('viewerContent');
    container.style.display = 'flex';
    document.getElementById('viewerTitle').innerText = title;
    content.innerHTML = `<iframe src="${url}" width="100%" height="100%" style="border:none;"></iframe>`;
}

// Viewer close logic
if (document.getElementById('closeViewer')) {
    document.getElementById('closeViewer').onclick = () => {
        document.getElementById('viewerContainer').style.display = 'none';
        document.getElementById('viewerContent').innerHTML = '';
    };
}

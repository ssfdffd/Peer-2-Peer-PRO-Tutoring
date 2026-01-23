/**
 * PEER-2-PEER RESOURCES - CLOUDFLARE R2 + WORKERS VERSION
 * This code runs on your GitHub Pages site but fetches data from Cloudflare.
 */

// 1. SETTINGS - Update this with your actual Worker URL once deployed
const WORKER_URL = "https://resource-handler.ssfdffd.workers.dev"; 

document.addEventListener('DOMContentLoaded', () => {
    // Navigation/Sidebar logic
    initNavigation();
    
    // Initial fetch from Cloudflare R2
    fetchDocuments();

    // Setup UI listeners
    setupListeners();
});

/**
 * Fetches the live list of files from Cloudflare R2 via the Worker
 */
async function fetchDocuments() {
    const fileGrid = document.getElementById('fileGrid');
    
    // Detailed Loading State
    fileGrid.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Connecting to Cloudflare R2 Storage...</p>
        </div>`;

    try {
        // Calling the /list endpoint on your Worker
        const response = await fetch(`${WORKER_URL}/list`);
        
        if (!response.ok) throw new Error('Cloudflare Worker returned an error');
        
        const files = await response.json();

        // Clear grid for rendering
        fileGrid.innerHTML = ''; 

        if (!files || files.length === 0) {
            fileGrid.innerHTML = '<div class="no-docs"><h3>No documents found in R2.</h3></div>';
            return;
        }

        // Render each file card dynamically
        files.forEach(file => {
            const extension = file.key.split('.').pop().toLowerCase();
            // The public URL for the file via the Worker download path
            const publicUrl = `${WORKER_URL}/download?key=${encodeURIComponent(file.key)}`;
            
            const card = document.createElement('div');
            card.className = 'file-card';
            card.innerHTML = `
                <div class="file-type-badge">${extension.toUpperCase()}</div>
                <div class="file-icon-box"><i class="fas ${getFileIcon(extension)}"></i></div>
                <div class="file-info">
                    <h3>${formatFileName(file.key)}</h3>
                    <span class="file-size">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div class="card-actions">
                    <button onclick="viewFile('${publicUrl}', '${file.key}')" class="btn-view" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <a href="${publicUrl}" download="${file.key}" class="btn-download" title="Download">
                        <i class="fas fa-download"></i>
                    </a>
                </div>
            `;
            fileGrid.appendChild(card);
        });
    } catch (err) {
        // Detailed Error State
        fileGrid.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Storage Connection Failed</h3>
                <p>Ensure the Cloudflare Worker is active and CORS is configured.</p>
                <button onclick="fetchDocuments()" class="btn-retry">Retry Connection</button>
            </div>`;
        console.error("Cloudflare Integration Error:", err);
    }
}

/**
 * Formats file keys (e.g., "physics-notes.pdf" -> "Physics Notes")
 */
function formatFileName(key) {
    return key.split('.')[0].replace(/-/g, ' ').replace(/_/g, ' ');
}

/**
 * Assigns font-awesome icons based on file type
 */
function getFileIcon(ext) {
    const icons = {
        pdf: 'fa-file-pdf',
        png: 'fa-file-image',
        jpg: 'fa-file-image',
        jpeg: 'fa-file-image',
        docx: 'fa-file-word',
        xlsx: 'fa-file-excel'
    };
    return icons[ext] || 'fa-file-alt';
}

/**
 * Logic for the built-in PDF/Image viewer
 */
function viewFile(url, title) {
    const container = document.getElementById('viewerContainer');
    const content = document.getElementById('viewerContent');
    
    container.style.display = 'flex';
    document.getElementById('viewerTitle').innerText = title;
    
    // Uses an iframe for PDF viewing
    content.innerHTML = `<iframe src="${url}" width="100%" height="100%" style="border:none;"></iframe>`;
}

function initNavigation() {
    const openNav = document.getElementById('openNav');
    const closeNav = document.getElementById('closeNav');
    const sideMenu = document.getElementById('side-menu');

    if (openNav) openNav.onclick = () => sideMenu.style.width = "280px";
    if (closeNav) closeNav.onclick = () => sideMenu.style.width = "0";
}

function setupListeners() {
    const closeViewer = document.getElementById('closeViewer');
    if (closeViewer) {
        closeViewer.onclick = () => {
            document.getElementById('viewerContainer').style.display = 'none';
            document.getElementById('viewerContent').innerHTML = '';
        };
    }
}

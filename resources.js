/**
 * PEER-2-PEER RESOURCES - CLOUDFLARE COMPATIBLE
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Sidebar Logic
    const openNav = document.getElementById('openNav');
    const closeNav = document.getElementById('closeNav');
    const sideMenu = document.getElementById('side-menu');

    if (openNav) openNav.onclick = () => sideMenu.style.width = "280px";
    if (closeNav) closeNav.onclick = () => sideMenu.style.width = "0";

    // 2. Load Documents from R2
    fetchDocuments();

    // 3. UI Event Listeners
    setupUploadListeners();
    setupSearchAndFilters();
});

// --- FETCH & LIST DOCUMENTS ---
async function fetchDocuments() {
    const fileGrid = document.getElementById('fileGrid');
    fileGrid.innerHTML = '<div class="no-docs"><h3>Loading Library...</h3></div>';

    try {
        // This calls your Cloudflare Worker / API endpoint
        const response = await fetch('/api/list'); 
        const files = await response.json();

        if (!files || files.length === 0) {
            fileGrid.innerHTML = '<div class="no-docs"><h3>No documents shared yet.</h3></div>';
            return;
        }

        fileGrid.innerHTML = ''; // Clear loader
        files.forEach(file => {
            const extension = file.key.split('.').pop().toLowerCase();
            const card = document.createElement('div');
            card.className = 'file-card';
            card.setAttribute('data-filetype', extension);

            // Replace with your R2 Public Bucket URL or custom domain
            const publicUrl = `/api/download/${file.key}`;

            card.innerHTML = `
                <div class="file-type-badge">${extension}</div>
                <div class="file-icon-box">
                    <i class="fas ${getIcon(extension)}"></i>
                </div>
                <div class="file-info">
                    <h3>${file.key.split('-').slice(1).join('-') || file.key}</h3>
                    <div class="badge-container">
                        <span class="badge grade-badge">Size: ${(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                </div>
                <div class="card-actions">
                    <button onclick="viewFile('${publicUrl}', '${file.key}')" class="btn-view" title="View"><i class="fas fa-eye"></i></button>
                    <a href="${publicUrl}" download class="btn-download" title="Download"><i class="fas fa-download"></i></a>
                </div>
            `;
            fileGrid.appendChild(card);
        });
    } catch (err) {
        fileGrid.innerHTML = '<div class="no-docs"><h3>Error connecting to storage.</h3></div>';
    }
}

function getIcon(ext) {
    const icons = { 
        pdf: 'fa-file-pdf', 
        doc: 'fa-file-word', 
        docx: 'fa-file-word', 
        zip: 'fa-file-archive',
        jpg: 'fa-file-image',
        png: 'fa-file-image'
    };
    return icons[ext] || 'fa-file-alt';
}

// --- UPLOAD LOGIC ---
function setupUploadListeners() {
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const browseBtn = document.getElementById('browseBtn');

    if (browseBtn) browseBtn.onclick = () => fileInput.click();

    if (uploadBtn) {
        uploadBtn.onclick = async () => {
            const file = fileInput.files[0];
            if (!file) {
                alert("Please select a file first!");
                return;
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('filename', document.getElementById('fileName').value || file.name);

            const progressSection = document.getElementById('uploadProgress');
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');

            progressSection.style.display = 'flex';
            uploadBtn.disabled = true;

            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    progressFill.style.width = '100%';
                    progressText.innerText = '100%';
                    alert("Upload Successful!");
                    location.reload(); // Refresh to show new file
                } else {
                    alert("Upload failed. Check file size limits.");
                }
            } catch (err) {
                alert("Connection error occurred.");
            } finally {
                uploadBtn.disabled = false;
            }
        };
    }
}

// --- VIEWER LOGIC ---
function viewFile(url, title) {
    const container = document.getElementById('viewerContainer');
    const content = document.getElementById('viewerContent');
    const titleEl = document.getElementById('viewerTitle');

    container.style.display = 'flex';
    titleEl.innerText = title;
    
    // Simple PDF/Image viewer using iframe
    content.innerHTML = `<iframe src="${url}" width="100%" height="100%" style="border:none;"></iframe>`;
}

if (document.getElementById('closeViewer')) {
    document.getElementById('closeViewer').onclick = () => {
        document.getElementById('viewerContainer').style.display = 'none';
        document.getElementById('viewerContent').innerHTML = '';
    };
}
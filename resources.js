/**
 * PEER-2-PEER RESOURCES - GITHUB STATIC VERSION
 * No Cloudflare R2 required. Files are hosted in your GitHub /uploads folder.
 */

// 1. YOUR MANUAL DATABASE - Add your files here after uploading them to GitHub
const MANUAL_DOCUMENTS = [
    {
        key: "Introduction-to-Peer-2-Peer.pdf",
        size: 1048576, // 1.0 MB
        category: "Study Guide"
    },
    {
        key: "Calculus-Cheat-Sheet.png",
        size: 524288, // 0.5 MB
        category: "Handouts"
    }
];

// 2. YOUR GITHUB INFO
const GITHUB_USERNAME = "ssfdffd";
const REPO_NAME = "Peer-2-Peer-PRO-Tutoring";
const RAW_URL = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/main/uploads/`;

document.addEventListener('DOMContentLoaded', () => {
    // Sidebar Logic
    const openNav = document.getElementById('openNav');
    const closeNav = document.getElementById('closeNav');
    const sideMenu = document.getElementById('side-menu');

    if (openNav) openNav.onclick = () => sideMenu.style.width = "280px";
    if (closeNav) closeNav.onclick = () => sideMenu.style.width = "0";

    // Load Documents from our static list
    fetchDocuments();

    // UI Event Listeners
    setupUploadListeners();
});

// --- LIST DOCUMENTS ---
async function fetchDocuments() {
    const fileGrid = document.getElementById('fileGrid');
    fileGrid.innerHTML = ''; 

    if (MANUAL_DOCUMENTS.length === 0) {
        fileGrid.innerHTML = '<div class="no-docs"><h3>No documents shared yet.</h3></div>';
        return;
    }

    MANUAL_DOCUMENTS.forEach(file => {
        const extension = file.key.split('.').pop().toLowerCase();
        const card = document.createElement('div');
        card.className = 'file-card';
        card.setAttribute('data-filetype', extension);

        // Point to the GitHub Raw URL
        const publicUrl = RAW_URL + file.key;

        card.innerHTML = `
            <div class="file-type-badge">${extension}</div>
            <div class="file-icon-box">
                <i class="fas ${getIcon(extension)}"></i>
            </div>
            <div class="file-info">
                <h3>${file.key.split('-').join(' ')}</h3>
                <div class="badge-container">
                    <span class="badge grade-badge">Size: ${(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
            </div>
            <div class="card-actions">
                <button onclick="viewFile('${publicUrl}', '${file.key}')" class="btn-view" title="View"><i class="fas fa-eye"></i></button>
                <a href="${publicUrl}" target="_blank" download class="btn-download" title="Download"><i class="fas fa-download"></i></a>
            </div>
        `;
        fileGrid.appendChild(card);
    });
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

// --- UPLOAD LOGIC (REDIRECT TO GITHUB) ---
function setupUploadListeners() {
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
        uploadBtn.onclick = () => {
            alert("Direct upload is disabled for this version. Please upload your files directly to the 'uploads' folder in your GitHub repository.");
            window.open(`https://github.com/${GITHUB_USERNAME}/${REPO_NAME}/upload/main`, '_blank');
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
    content.innerHTML = `<iframe src="${url}" width="100%" height="100%" style="border:none;"></iframe>`;
}

if (document.getElementById('closeViewer')) {
    document.getElementById('closeViewer').onclick = () => {
        document.getElementById('viewerContainer').style.display = 'none';
        document.getElementById('viewerContent').innerHTML = '';
    };
}
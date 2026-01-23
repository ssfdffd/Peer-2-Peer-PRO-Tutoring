/**
 * PEER-2-PEER RESOURCES - GITHUB STATIC VERSION
 */

// 1. YOUR MANUAL DATABASE 
// IMPORTANT: Ensure these filenames exactly match the files in your GitHub "uploads" folder.
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
// Note: Ensure the folder name "uploads" is lowercase if it is lowercase on GitHub.
const RAW_URL = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/main/uploads/`;

document.addEventListener('DOMContentLoaded', () => {
    // Sidebar Logic
    const openNav = document.getElementById('openNav');
    const closeNav = document.getElementById('closeNav');
    const sideMenu = document.getElementById('side-menu');

    // Sets sidebar width to 280px as per original logic
    if (openNav) openNav.onclick = () => sideMenu.style.width = "280px"; 
    if (closeNav) closeNav.onclick = () => sideMenu.style.width = "0";

    // Load Documents
    fetchDocuments();

    setupUploadListeners();
});

async function fetchDocuments() {
    // IMPORTANT: Make sure your HTML has an id="fileGrid" or id="documentGrid"
    // If your HTML uses "documentGrid", change 'fileGrid' to 'documentGrid' below.
    const fileGrid = document.getElementById('fileGrid') || document.getElementById('documentGrid');
    
    if (!fileGrid) {
        console.error("Could not find the document grid element in HTML.");
        return;
    }

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

        const publicUrl = RAW_URL + file.key;

        // Clean up title display by removing dashes
        const displayTitle = file.key.split('-').join(' ').split('.')[0]; 

        card.innerHTML = `
            <div class="file-type-badge">${extension}</div>
            <div class="file-icon-box">
                <i class="fas ${getIcon(extension)}"></i>
            </div>
            <div class="file-info">
                <h3>${displayTitle}</h3>
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

function setupUploadListeners() {
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
        uploadBtn.onclick = () => {
            alert("Upload via website is disabled. Redirecting to GitHub to add files manually.");
            window.open(`https://github.com/${GITHUB_USERNAME}/${REPO_NAME}/upload/main/uploads`, '_blank');
        };
    }
}

function viewFile(url, title) {
    const container = document.getElementById('viewerContainer');
    const content = document.getElementById('viewerContent');
    const titleEl = document.getElementById('viewerTitle');

    if (container && content) {
        container.style.display = 'flex';
        if (titleEl) titleEl.innerText = title;
        content.innerHTML = `<iframe src="${url}" width="100%" height="100%" style="border:none;"></iframe>`;
    }
}

// Close viewer logic
const closeViewer = document.getElementById('closeViewer');
if (closeViewer) {
    closeViewer.onclick = () => {
        document.getElementById('viewerContainer').style.display = 'none';
        document.getElementById('viewerContent').innerHTML = '';
    };
}

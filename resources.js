// 1. YOUR WORKER URL (Found in Cloudflare Workers Overview)
const API_URL = "https://1ce953f8e3aba7222394fec1bbc2db60.r2.cloudflarestorage.com/p2p-resources"; 

// 2. HELPER: Show selected filename when browsing
function updateFileName(input) {
    const fileNameDisplay = document.getElementById('selectedFileName');
    if (input.files.length > 0) {
        fileNameDisplay.innerText = "Selected: " + input.files[0].name;
    }
}

// 3. LOAD LIBRARY
async function loadLibrary() {
    const fileGrid = document.getElementById('fileGrid');
    fileGrid.innerHTML = '<div class="loader">Accessing Secure Library...</div>';

    try {
        const response = await fetch(`${API_URL}/get-resources`);
        const data = await response.json();

        if (data.success) {
            renderCards(data.resources);
        }
    } catch (error) {
        console.error("Connection Error:", error);
        fileGrid.innerHTML = '<p class="error">Could not connect to the library. Please check your Worker URL.</p>';
    }
}

// 4. RENDER CARDS
function renderCards(resources) {
    const fileGrid = document.getElementById('fileGrid');
    fileGrid.innerHTML = '';

    if (!resources || resources.length === 0) {
        fileGrid.innerHTML = '<p>No documents found yet.</p>';
        return;
    }

    resources.forEach(item => {
        const card = document.createElement('div');
        card.className = 'file-card';
        card.innerHTML = `
            <div class="card-header">
                <span class="grade-pill">Grade ${item.grade_level}</span>
                <span class="role-pill">${item.uploader_role}</span>
            </div>
            <div class="file-info">
                <h3>${item.display_title}</h3>
                <p><strong>Subject:</strong> ${item.subject}</p>
            </div>
            <div class="card-actions">
                <a href="${item.file_url}" target="_blank" class="btn-view">View</a>
                <a href="${item.file_url}" download class="btn-download">Download</a>
            </div>
        `;
        fileGrid.appendChild(card);
    });
}

// 5. HANDLE UPLOAD
async function handleUpload(event) {
    event.preventDefault();
    const btn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');

    if (fileInput.files.length === 0) {
        alert("Please select a file first!");
        return;
    }

    btn.innerText = "Uploading...";
    btn.disabled = true;

    const formData = new FormData(event.target);

    try {
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            alert("Upload Successful!");
            location.reload(); 
        } else {
            alert("Upload failed: " + result.error);
        }
    } catch (error) {
        alert("Error connecting to server.");
        console.error(error);
    } finally {
        btn.innerText = "Upload Document";
        btn.disabled = false;
    }
}

// 6. INITIALIZE
document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    const form = document.getElementById('uploadForm');
    if (form) form.addEventListener('submit', handleUpload);
});
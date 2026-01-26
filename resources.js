
const API_URL = "https://1ce953f8e3aba7222394fec1bbc2db60.r2.cloudflarestorage.com/p2p-resources"; 

// 2. Visual Feedback: Show filename when file is picked
function updateFileName(input) {
    const uploadText = document.getElementById('uploadText');
    if (input.files.length > 0) {
        uploadText.innerHTML = `<b style="color: #2ecc71;">Selected: ${input.files[0].name}</b>`;
    }
}

// 3. LOAD LIBRARY (Fetch from D1 Database)
async function loadLibrary() {
    const fileGrid = document.getElementById('fileGrid');
    fileGrid.innerHTML = '<div class="loader">Loading Library...</div>';

    try {
        const response = await fetch(`${API_URL}/get-resources`);
        const data = await response.json();

        if (data.success) {
            renderCards(data.resources);
        }
    } catch (error) {
        console.error("Connection Error:", error);
        fileGrid.innerHTML = '<p class="error">Database connection failed. Check your API_URL.</p>';
    }
}

// 4. RENDER CARDS
function renderCards(resources) {
    const fileGrid = document.getElementById('fileGrid');
    fileGrid.innerHTML = '';

    if (!resources || resources.length === 0) {
        fileGrid.innerHTML = '<p>The library is empty. Be the first to upload!</p>';
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
                <p><strong>Category:</strong> ${item.doc_type}</p>
            </div>
            <div class="card-actions">
                <a href="${item.file_url}" target="_blank" class="btn-view">View</a>
                <a href="${item.file_url}" download class="btn-download">Download</a>
            </div>
        `;
        fileGrid.appendChild(card);
    });
}

// 5. HANDLE UPLOAD (Sends to Cloudflare R2 and D1)
async function handleUpload(event) {
    event.preventDefault();
    
    const btn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');

    if (fileInput.files.length === 0) {
        alert("Please select a document to upload!");
        return;
    }

    // Change button state
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    btn.disabled = true;

    // Capture form data
    const formData = new FormData(event.target);

    try {
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            alert("Success! Your document is now in the library.");
            location.reload(); 
        } else {
            alert("Upload Error: " + (result.error || "Unknown error"));
        }
    } catch (error) {
        console.error("Upload failed:", error);
        alert("Server connection failed. Is your Worker deployed?");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// 6. INITIALIZE
document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    const form = document.getElementById('uploadForm');
    if (form) form.addEventListener('submit', handleUpload);
});
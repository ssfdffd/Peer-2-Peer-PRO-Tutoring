/**
 * PEER-2-PEER RESOURCES - FINAL SECURE VERSION
 * Handles dynamic loading from D1 and secure uploads via Worker
 */

const API_URL = "https://your-worker-name.your-subdomain.workers.dev";

// --- 1. LOADING FUNCTION ---
async function loadLibrary() {
    const fileGrid = document.getElementById('fileGrid');
    fileGrid.innerHTML = '<div class="status">Connecting to Secure Vault...</div>';

    try {
        const response = await fetch(`${API_URL}/get-resources`);
        const data = await response.json();

        if (data.success) {
            renderCards(data.resources);
        }
    } catch (error) {
        fileGrid.innerHTML = '<p class="error">Security Block: Could not load library.</p>';
    }
}

function renderCards(resources) {
    const fileGrid = document.getElementById('fileGrid');
    fileGrid.innerHTML = '';

    resources.forEach(item => {
        const isPro = item.uploader_role === 'Teacher';
        const card = document.createElement('div');
        card.className = 'file-card';
        card.innerHTML = `
            <div class="card-header">
                <span class="grade-pill">Grade ${item.grade_level}</span>
                <span class="role-pill ${isPro ? 'pro' : 'student'}">${item.uploader_role}</span>
            </div>
            <h3>${item.display_title}</h3>
            <p>${item.subject} • ${item.doc_type}</p>
            <div class="card-actions">
                <a href="${item.file_url}" target="_blank" class="btn-view">View</a>
            </div>
        `;
        fileGrid.appendChild(card);
    });
}

// --- 2. UPLOAD FUNCTION ---
async function handleUpload(event) {
    event.preventDefault();
    
    const submitBtn = event.target.querySelector('button');
    submitBtn.innerText = "Encrypting & Sending...";
    submitBtn.disabled = true;

    // Gathering form data
    const formData = new FormData();
    formData.append('file', document.getElementById('fileInput').files[0]);
    formData.append('title', document.getElementById('displayTitle').value);
    formData.append('role', document.getElementById('uploaderRole').value);
    formData.append('grade', document.getElementById('gradeLevel').value);
    formData.append('subject', document.getElementById('subjectName').value);
    formData.append('type', document.getElementById('docType').value);

    try {
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            alert("Success! Document verified and added to library.");
            location.reload(); // Refresh to show new item
        } else {
            alert("Upload failed: " + result.error);
        }
    } catch (error) {
        alert("Cybersecurity Error: Connection refused.");
    } finally {
        submitBtn.innerText = "Upload Resource";
        submitBtn.disabled = false;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) uploadForm.addEventListener('submit', handleUpload);
});
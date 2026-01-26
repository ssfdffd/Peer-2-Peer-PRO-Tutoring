/**
 * PEER-2-PEER RESOURCES - FINAL SECURE VERSION
 */

// 1. Update this with your Worker's URL (found in Cloudflare Workers Overview)
const API_URL = "https://1ce953f8e3aba7222394fec1bbc2db60.r2.cloudflarestorage.com/p2p-resources";

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
        console.error("Cybersecurity Block:", error);
        fileGrid.innerHTML = '<p class="error">Secure connection failed. Please refresh.</p>';
    }
}

function renderCards(resources) {
    const fileGrid = document.getElementById('fileGrid');
    fileGrid.innerHTML = '';

    if (resources.length === 0) {
        fileGrid.innerHTML = '<p>No documents found yet. Be the first to upload!</p>';
        return;
    }

    resources.forEach(item => {
        const isTeacher = item.uploader_role === 'Teacher';
        const card = document.createElement('div');
        card.className = 'file-card';
        
        card.innerHTML = `
            <div class="card-header">
                <span class="grade-pill">Grade ${item.grade_level}</span>
                <span class="role-pill ${isTeacher ? 'pro' : 'student'}">
                    ${isTeacher ? 'Verified Teacher' : 'Student'}
                </span>
            </div>
            <div class="file-info">
                <h3>${item.display_title}</h3>
                <p><strong>Subject:</strong> ${item.subject}</p>
                <p><strong>Type:</strong> ${item.doc_type}</p>
            </div>
            <div class="card-actions">
                <a href="${item.file_url}" target="_blank" class="btn-view">View</a>
                <a href="${item.file_url}" download="${item.actual_file_key}" class="btn-download">Download</a>
            </div>
        `;
        fileGrid.appendChild(card);
    });
}

// Upload Handling Logic
async function handleUpload(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button');
    const originalText = btn.innerText;
    
    btn.innerText = "Encrypting & Uploading...";
    btn.disabled = true;

    const formData = new FormData(event.target);

    try {
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            alert("Success! Document secured in Peer-2-Peer library.");
            location.reload(); 
        } else {
            alert("Upload Error: " + result.error);
        }
    } catch (error) {
        alert("Cybersecurity Error: The connection was refused.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    const form = document.getElementById('uploadForm');
    if (form) form.addEventListener('submit', handleUpload);
});
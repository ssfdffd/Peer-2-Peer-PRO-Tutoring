
const API_URL = "https://lucky-mud-57bd.buhle-1ce.workers.dev"; 
// 2. Visual Feedback: Show filename when file is picked
function updateFileName(input) {
    const fileNameDisplay = document.getElementById('selectedFileName');
    if (input.files && input.files[0]) {
        // This confirms the file is "attached" to the browser session
        fileNameDisplay.innerText = "Selected: " + input.files[0].name;
    }
}

// 3. LOAD LIBRARY (Fetch from D1 via Worker)
async function loadLibrary() {
    const fileGrid = document.getElementById('fileGrid');
    fileGrid.innerHTML = '<div class="loader">Accessing Library...</div>';

    try {
        const response = await fetch(`${API_URL}/get-resources`);
        const data = await response.json();

        if (data.success) {
            renderCards(data.resources);
        } else {
            fileGrid.innerHTML = '<p>No documents found yet.</p>';
        }
    } catch (error) {
        console.error("Connection Error:", error);
        fileGrid.innerHTML = '<p class="error">Could not connect to database. Check API_URL.</p>';
    }
}

// 4. RENDER CARDS
function renderCards(resources) {
    const fileGrid = document.getElementById('fileGrid');
    fileGrid.innerHTML = '';

    resources.forEach(item => {
        const card = document.createElement('div');
        card.className = 'file-card';
        card.innerHTML = `
            <div class="card-header">
                <span class="grade-pill">Grade ${item.grade_level}</span>
                <span class="role-pill">Student</span>
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

// 5. HANDLE UPLOAD (The "Workhorse" function)
async function handleUpload(event) {
    event.preventDefault(); // Stops the page from refreshing instantly
    
    const btn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');

    if (!fileInput.files[0]) {
        alert("Please select a file first!");
        return;
    }

    // Visual loading state
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    btn.disabled = true;

    // Create the "Envelope" (FormData) to send to Cloudflare
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('title', document.getElementById('fileName').value);
    formData.append('category', document.getElementById('fileCategory').value);
    formData.append('grade', document.getElementById('fileGrade').value);
    formData.append('subject', document.getElementById('fileSubject').value);

    try {
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            alert("Success! Document uploaded to R2 and D1.");
            location.reload(); 
        } else {
            alert("Upload failed: " + result.error);
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Connection to Worker failed. Ensure CORS is enabled in the Worker code.");
    } finally {
        btn.innerHTML = '<i class="fas fa-upload"></i> Upload Document';
        btn.disabled = false;
    }
}

// 6. INITIALIZE
document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    const form = document.getElementById('uploadForm');
    if (form) {
        form.addEventListener('submit', handleUpload);
    }
});
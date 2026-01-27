// 1. YOUR WORKER URL (Kept exactly as requested)
const API_URL = "https://lucky-mud-57bd.buhle-1ce.workers.dev"; 
let allResources = []; // Global store for filtering

// 2. Visual Feedback: Show filename when file is picked
function updateFileName(input) {
    const fileNameDisplay = document.getElementById('selectedFileName');
    if (input.files && input.files[0]) {
        fileNameDisplay.innerText = "Selected: " + input.files[0].name;
    }
}

// 3. Animation: Starts immediately from left to right
function initScrollAnimation() {
    const scrollText = document.getElementById('scrollText');
    if (scrollText) {
        scrollText.style.display = 'block';
        // Animation defined in CSS: scrollLeftToRight
    }
}

// 4. LOAD LIBRARY (Fetch from D1 via Worker)
async function loadLibrary() {
    const fileGrid = document.getElementById('fileGrid');
    fileGrid.innerHTML = '<div class="loader">Accessing Library...</div>';

    try {
        const response = await fetch(`${API_URL}/get-resources`);
        const data = await response.json();

        if (data.success) {
            allResources = data.resources; // Store data for filtering
            renderCards(allResources);
        } else {
            fileGrid.innerHTML = '<p>No documents found yet.</p>';
        }
    } catch (error) {
        console.error("Connection Error:", error);
        fileGrid.innerHTML = '<p class="error">Could not connect to database.</p>';
    }
}

// 5. RENDER CARDS
function renderCards(resources) {
    const fileGrid = document.getElementById('fileGrid');
    fileGrid.innerHTML = '';

    if (resources.length === 0) {
        fileGrid.innerHTML = '<p>No documents match your filters.</p>';
        return;
    }

    resources.forEach(item => {
        const card = document.createElement('div');
        card.className = 'file-card';
        card.innerHTML = `
            <div class="card-header">
                <span class="grade-pill">Grade ${item.grade_level}</span>
                <span class="role-pill">${item.uploader_role || 'Student'}</span>
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

// 6. FIXED FILTERING LOGIC (Triple Filter: Text + Subject + Grade)
function filterDocuments() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const subjectTerm = document.getElementById('subjectFilter').value.toLowerCase();
    const gradeTerm = document.getElementById('gradeFilter').value;

    const filtered = allResources.filter(item => {
        // Match Search Text (Title)
        const matchesSearch = item.display_title.toLowerCase().includes(searchText);
        
        // Match Subject Dropdown
        const matchesSubject = subjectTerm === "" || item.subject.toLowerCase() === subjectTerm;
        
        // Match Grade Dropdown
        const matchesGrade = gradeTerm === "" || item.grade_level.toString() === gradeTerm;
        
        return matchesSearch && matchesSubject && matchesGrade;
    });

    renderCards(filtered);
}

// 7. HANDLE UPLOAD
async function handleUpload(event) {
    event.preventDefault();
    
    const btn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');

    if (!fileInput.files[0]) {
        alert("Please select a file first!");
        return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    btn.disabled = true;

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('title', document.getElementById('fileName').value);
    formData.append('category', document.getElementById('fileCategory')?.value || 'General');
    formData.append('grade', document.getElementById('fileGrade').value);
    formData.append('subject', document.getElementById('fileSubject').value);

    try {
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            alert("Success! Document uploaded.");
            location.reload(); 
        } else {
            alert("Upload failed: " + result.error);
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Connection to Worker failed.");
    } finally {
        btn.innerHTML = '<i class="fas fa-upload"></i> Upload Document';
        btn.disabled = false;
    }
}

// 8. INITIALIZE EVERYTHING
document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    initScrollAnimation();
    
    // Add event listeners for filters
    document.getElementById('searchInput')?.addEventListener('input', filterDocuments);
    document.getElementById('subjectFilter')?.addEventListener('change', filterDocuments);
    document.getElementById('gradeFilter')?.addEventListener('change', filterDocuments);

    const form = document.getElementById('uploadForm');
    if (form) {
        form.addEventListener('submit', handleUpload);
    }
});
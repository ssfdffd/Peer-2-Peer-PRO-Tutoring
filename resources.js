// 1. CONFIGURATION
const API_URL = "https://lucky-mud-57bd.buhle-1ce.workers.dev"; 
let allResources = []; 

// 2. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    initScrollAnimation();
    
    // Setup Modal Close Button
    const modal = document.getElementById("docModal");
    const closeBtn = document.querySelector(".close-modal");
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = "none";
            document.getElementById("docViewer").src = ""; // Stop loading when closed
        };
    }

    // Close modal when clicking outside of it
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
            document.getElementById("docViewer").src = "";
        }
    };

    // Filter Listeners
    document.getElementById('searchInput')?.addEventListener('input', filterDocuments);
    document.getElementById('subjectFilter')?.addEventListener('change', filterDocuments);
    document.getElementById('gradeFilter')?.addEventListener('change', filterDocuments);

    // Upload Listener
    const form = document.getElementById('uploadForm');
    if (form) {
        form.addEventListener('submit', handleUpload);
    }
});

// 3. LOAD LIBRARY
async function loadLibrary() {
    const fileGrid = document.getElementById('fileGrid');
    if (!fileGrid) return;
    
    fileGrid.innerHTML = '<div class="loader">Accessing Library...</div>';

    try {
        const response = await fetch(`${API_URL}/get-resources`);
        const data = await response.json();

        if (data.success) {
            allResources = data.resources; 
            renderCards(allResources);
        } else {
            fileGrid.innerHTML = '<p>No documents found yet.</p>';
        }
    } catch (error) {
        console.error("Connection Error:", error);
        fileGrid.innerHTML = '<p class="error">Could not connect to database.</p>';
    }
}

// 4. RENDER CARDS (PRO Style)
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
            <div class="card-icon-header">
                <i class="fas fa-file-pdf"></i>
            </div>
            <div class="card-info">
                <h3>${item.display_title}</h3>
                <p><strong>Subject:</strong> ${item.subject}</p>
                <p><strong>Grade:</strong> ${item.grade_level}</p>
            </div>
            <div class="card-actions">
                <button onclick="openViewer('${item.file_url}')" class="btn-popup">View</button>
                <a href="${item.file_url}" download="${item.display_title}" class="btn-down">Download</a>
            </div>
        `;
        fileGrid.appendChild(card);
    });
}

// 5. INTERNAL VIEWER (POPUP)
function openViewer(url) {
    const modal = document.getElementById("docModal");
    const viewer = document.getElementById("docViewer");
    if (modal && viewer) {
        viewer.src = url;
        modal.style.display = "block";
    }
}

// 6. UPLOAD HANDLER
async function handleUpload(event) {
    event.preventDefault();
    
    const btn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');

    if (!fileInput.files[0]) {
        alert("Please select a file first!");
        return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    btn.disabled = true;

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('title', document.getElementById('fileName').value);
    formData.append('grade', document.getElementById('fileGrade').value);
    formData.append('subject', document.getElementById('fileSubject').value);
    formData.append('category', document.getElementById('fileCategory')?.value || 'General');

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
        btn.innerHTML = 'Upload Document';
        btn.disabled = false;
    }
}

// 7. UTILITIES (Filename, Animation, Filtering)
function updateFileName(input) {
    const display = document.getElementById('selectedFileName');
    if (input.files && input.files[0]) {
        display.innerText = "Selected: " + input.files[0].name;
    }
}

function initScrollAnimation() {
    const scrollText = document.getElementById('scrollText');
    if (scrollText) scrollText.style.display = 'block';
}

function filterDocuments() {
    const searchText = document.getElementById('searchInput')?.value.toLowerCase() || "";
    const subjectTerm = document.getElementById('subjectFilter')?.value.toLowerCase() || "";
    const gradeTerm = document.getElementById('gradeFilter')?.value || "";

    const filtered = allResources.filter(item => {
        const matchesSearch = item.display_title.toLowerCase().includes(searchText);
        const matchesSubject = subjectTerm === "" || item.subject.toLowerCase() === subjectTerm;
        const matchesGrade = gradeTerm === "" || item.grade_level.toString() === gradeTerm;
        return matchesSearch && matchesSubject && matchesGrade;
    });

    renderCards(filtered);
}
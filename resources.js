// 1. CONFIGURATION & STATE
const API_URL = "https://lucky-mud-57bd.buhle-1ce.workers.dev"; 
let allResources = []; 
let currentPage = 1;
const itemsPerPage = 6;

// 2. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    initScrollAnimation();
    
    // Setup File Selection Feedback
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            const display = document.getElementById('selectedFileName');
            if (this.files && this.files[0]) {
                display.innerText = "Selected: " + this.files[0].name;
                display.style.color = "#32cd32";
            }
        });
    }

    // Search & Filter Listeners (Real-time updates)
    document.getElementById('searchInput')?.addEventListener('input', filterDocuments);
    document.getElementById('subjectFilter')?.addEventListener('change', filterDocuments);
    document.getElementById('gradeFilter')?.addEventListener('change', filterDocuments);

    // Upload Form Listener
    const form = document.getElementById('uploadForm');
    if (form) {
        form.addEventListener('submit', handleUpload);
    }

    // Pagination Listeners
    document.getElementById('prevPage')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderCards(getFilteredData());
            window.scrollTo({ top: 400, behavior: 'smooth' });
        }
    });

    document.getElementById('nextPage')?.addEventListener('click', () => {
        const filtered = getFilteredData();
        const maxPage = Math.ceil(filtered.length / itemsPerPage);
        if (currentPage < maxPage) {
            currentPage++;
            renderCards(filtered);
            window.scrollTo({ top: 400, behavior: 'smooth' });
        }
    });
});

// 3. LOAD LIBRARY (Fetch Data from Cloudflare Worker)
async function loadLibrary() {
    const fileGrid = document.getElementById('fileGrid');
    fileGrid.innerHTML = '<div class="loader">Accessing Library...</div>';

    try {
        // Updated endpoint to match the Worker: /api/resources
        const response = await fetch(`${API_URL}/api/resources`);
        const data = await response.json();

        // Check if data is an array directly (Worker returns results array)
        if (Array.isArray(data)) {
            allResources = data; 
            renderCards(allResources);
        } else {
            fileGrid.innerHTML = '<p>No documents found yet.</p>';
        }
    } catch (error) {
        console.error("Connection Error:", error);
        fileGrid.innerHTML = '<p class="error">Could not connect to database.</p>';
    }
}

// 4. GET FILTERED DATA (Helper for Search & Pagination)
function getFilteredData() {
    const searchText = document.getElementById('searchInput')?.value.toLowerCase() || "";
    const subjectTerm = document.getElementById('subjectFilter')?.value.toLowerCase() || "";
    const gradeTerm = document.getElementById('gradeFilter')?.value || "";

    return allResources.filter(item => {
        // Use 'title' to match the database column
        const itemTitle = (item.title || "").toLowerCase();
        const matchesSearch = itemTitle.includes(searchText);
        const matchesSubject = subjectTerm === "" || (item.subject && item.subject.toLowerCase() === subjectTerm);
        const matchesGrade = gradeTerm === "" || (item.grade_level && item.grade_level.toString() === gradeTerm);
        
        return matchesSearch && matchesSubject && matchesGrade;
    });
}

function filterDocuments() {
    currentPage = 1;
    renderCards(getFilteredData());
}

// 5. RENDER CARDS
function renderCards(data) {
    const fileGrid = document.getElementById('fileGrid');
    if (!fileGrid) return;
    
    fileGrid.innerHTML = '';
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedItems = data.slice(start, end);
    const totalPages = Math.ceil(data.length / itemsPerPage) || 1;

    document.getElementById('pageInfo').innerText = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevPage').disabled = (currentPage === 1);
    document.getElementById('nextPage').disabled = (currentPage === totalPages);

    if (paginatedItems.length === 0) {
        fileGrid.innerHTML = '<p class="no-docs">No matching documents found.</p>';
        return;
    }

    paginatedItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'file-card';
        card.innerHTML = `
            <div class="card-icon-header">
                <div class="category-tag">${item.subject || 'General'}</div>
                <i class="fas fa-file-pdf pdf-icon file-type-icon"></i>
            </div>
            <div class="card-body">
                <h3>${item.title}</h3>
                <div class="document-info">
                    <div class="info-item"><i class="fas fa-graduation-cap"></i><strong>Grade:</strong> ${item.grade_level}</div>
                    <div class="info-item"><i class="fas fa-book"></i><strong>Subject:</strong> ${item.subject}</div>
                </div>
            </div>
            <div class="card-footer">
                <a href="${item.file_url}" target="_blank" class="view-link"><i class="fas fa-eye"></i> View</a>
                <a href="${item.file_url}" download="${item.title}" class="down-link"><i class="fas fa-download"></i> Download</a>
            </div>
        `;
        fileGrid.appendChild(card);
    });
}

// 6. UPLOAD HANDLER (Base64 for Cloudflare)
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

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        const base64File = e.target.result.split(',')[1];
        
        const payload = {
            title: document.getElementById('fileName').value,
            grade: document.getElementById('fileGrade').value,
            subject: document.getElementById('fileSubject').value,
            fileName: file.name,
            fileData: base64File,
            fileType: file.type
        };

        try {
            const response = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok) {
                alert("Success! Document is live.");
                location.reload();
            } else {
                alert("Upload failed: " + (result.error || "Unknown error"));
            }
        } catch (error) {
            alert("Connection to Database failed.");
        } finally {
            btn.innerHTML = 'Upload Document';
            btn.disabled = false;
        }
    };

    reader.readAsDataURL(file);
}

function initScrollAnimation() {
    const scrollText = document.getElementById('scrollText');
    if (scrollText) scrollText.style.display = 'block';
}
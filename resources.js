// 1. CONFIGURATION & STATE
const API_URL = "https://lucky-mud-57bd.buhle-1ce.workers.dev"; 
let allResources = []; 
let currentPage = 1;
const itemsPerPage = 6; 



// Add to resources.js
//if (!localStorage.getItem('p2p_token')) {
//    alert("Please log in to access the library.");
  //  window.location.href = 'login.html';
//}



// 2. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    initScrollAnimation();
    
    // File Input Listener - Updates "Selected: filename" text
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            updateFileName(this);
        });
    }

    // Modal Close Logic
    const modal = document.getElementById("docModal");
    const closeBtn = document.querySelector(".close-modal");
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = "none";
            document.getElementById("docViewer").src = "";
        };
    }

    // Search and Filter Listeners
    document.getElementById('searchInput')?.addEventListener('input', filterDocuments);
    document.getElementById('subjectFilter')?.addEventListener('change', filterDocuments);
    document.getElementById('gradeFilter')?.addEventListener('change', filterDocuments);

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

// 3. FETCH DATA FROM WORKER
async function loadLibrary() {
    const grid = document.getElementById('fileGrid');
    grid.innerHTML = '<div class="loader">Accessing Cloud Library...</div>';

    try {
        const response = await fetch(`${API_URL}/api/resources`);
        const data = await response.json();
        
        // Handle array response from Cloudflare D1
        allResources = Array.isArray(data) ? data : (data.results || []);
        renderCards(allResources);
    } catch (error) {
        console.error("Fetch error:", error);
        grid.innerHTML = '<p style="color:red; text-align:center;">Failed to connect to library. Please check your connection.</p>';
    }
}

// 4. FILTERING LOGIC (Search Bar & Dropdowns)
function getFilteredData() {
    const searchText = document.getElementById('searchInput')?.value.toLowerCase() || "";
    const subjectTerm = document.getElementById('subjectFilter')?.value.toLowerCase() || "";
    const gradeTerm = document.getElementById('gradeFilter')?.value || "";

    return allResources.filter(item => {
        // Matches database column name 'title'
        const matchesSearch = (item.title || "").toLowerCase().includes(searchText);
        const matchesSubject = subjectTerm === "" || (item.subject && item.subject.toLowerCase() === subjectTerm);
        const matchesGrade = gradeTerm === "" || (item.grade_level && item.grade_level.toString() === gradeTerm);
        
        return matchesSearch && matchesSubject && matchesGrade;
    });
}

function filterDocuments() {
    currentPage = 1; // Reset to page 1 on search
    renderCards(getFilteredData());
}

// 5. RENDER CARDS TO SCREEN
function renderCards(data) {
    const grid = document.getElementById('fileGrid');
    if (!grid) return;
    grid.innerHTML = "";

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = data.slice(startIndex, endIndex);

    if (paginatedItems.length === 0) {
        grid.innerHTML = '<p class="no-results">No documents found matching your search.</p>';
        return;
    }

    paginatedItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'file-card';
        // This HTML structure now perfectly matches your resources.css
        card.innerHTML = `
            <div class="card-icon-header">
                <div class="category-tag">${item.subject || 'General'}</div>
                <i class="fas fa-file-pdf pdf-icon file-type-icon"></i>
            </div>
            <div class="card-body">
                <h3>${item.title || "Untitled Document"}</h3>
                <div class="document-info">
                    <div class="info-item">
                        <i class="fas fa-graduation-cap"></i>
                        <strong>Grade:</strong> ${item.grade_level || "N/A"}
                    </div>
                    <div class="info-item">
                        <i class="fas fa-book"></i>
                        <strong>Subject:</strong> ${item.subject || "General"}
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <button class="view-link" onclick="openDocument('${item.file_url}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <a href="${item.file_url}" download="${item.title}" class="down-link">
                    <i class="fas fa-download"></i> Download
                </a>
            </div>
        `;
        grid.appendChild(card);
    });

    const totalPages = Math.ceil(data.length / itemsPerPage) || 1;
    const pageInfo = document.getElementById('pageInfo');
    if (pageInfo) pageInfo.innerText = `Page ${currentPage} of ${totalPages}`;
}
// 6. VIEW DOCUMENT (MODAL)
function openDocument(url) {
    const modal = document.getElementById("docModal");
    const viewer = document.getElementById("docViewer");
    if (modal && viewer) {
        viewer.src = url;
        modal.style.display = "flex";
    }
}

// 7. UPLOAD DOCUMENT
async function uploadDocument() {
    const fileInput = document.getElementById('fileInput');
    const titleInput = document.getElementById('fileName'); // Ensure this ID matches your HTML input
    const subjectInput = document.getElementById('fileSubject');
    const gradeInput = document.getElementById('fileGrade');
    const btn = document.querySelector('.upload-btn') || document.getElementById('uploadBtn');

    if (!fileInput.files[0] || !titleInput.value) {
        alert("Please select a file and provide a title.");
        return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    btn.disabled = true;

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        // Convert file to Base64 for safe JSON transport
        const base64File = e.target.result.split(',')[1];
        
        // Inside resources.js upload function
const payload = {
    title: titleInput.value, // Keep this as 'title'
    subject: subjectInput.value,
    grade: gradeInput.value,
    fileUrl: "..."
};

        try {
            const res = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (res.ok) {
                alert("✅ Success! " + titleInput.value + " has been added to the library.");
                location.reload(); 
            } else {
                alert("Upload failed: " + result.error);
            }
        } catch (error) {
            console.error("Upload Error:", error);
            alert("Connection to Database failed.");
        } finally {
            btn.innerHTML = 'Upload Document';
            btn.disabled = false;
        }
    };

    reader.readAsDataURL(file);
}

// 8. UTILITIES
function updateFileName(input) {
    const display = document.getElementById('selectedFileName');
    if (display && input.files && input.files[0]) {
        display.innerText = "Selected: " + input.files[0].name;
        display.style.color = "#32cd32"; // PRO Green
    }
}

function initScrollAnimation() {
    const scrollText = document.getElementById('scrollText');
    if (scrollText) scrollText.style.display = 'block';
}
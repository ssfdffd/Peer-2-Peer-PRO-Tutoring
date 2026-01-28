// 1. CONFIGURATION & STATE
const API_URL = "https://lucky-mud-57bd.buhle-1ce.workers.dev"; 
let allResources = []; 
let currentPage = 1;
const itemsPerPage = 6; 

// 2. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    initScrollAnimation();
    
    // Setup File Selection Listener
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            updateFileName(this);
        });
    }

    // Modal logic
    const modal = document.getElementById("docModal");
    const closeBtn = document.querySelector(".close-modal");
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = "none";
            document.getElementById("docViewer").src = "";
        };
    }

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
            document.getElementById("docViewer").src = "";
        }
    };

    // Pagination Listeners
    document.getElementById('prevPage')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderCards(allResources);
            window.scrollTo({ top: 500, behavior: 'smooth' });
        }
    });

    document.getElementById('nextPage')?.addEventListener('click', () => {
        const totalPages = Math.ceil(allResources.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderCards(allResources);
            window.scrollTo({ top: 500, behavior: 'smooth' });
        }
    });
});

// 3. FETCH DATA FROM DATABASE
async function loadLibrary() {
    const grid = document.getElementById('fileGrid');
    grid.innerHTML = '<div class="loader">Loading Library...</div>';

    try {
        const response = await fetch(`${API_URL}/api/resources`);
        allResources = await response.json();
        renderCards(allResources);
    } catch (error) {
        console.error("Fetch error:", error);
        grid.innerHTML = '<p style="color:red; text-align:center;">Failed to load resources. Is the Worker running?</p>';
    }
}

// 4. RENDER CARDS TO SCREEN
function renderCards(data) {
    const grid = document.getElementById('fileGrid');
    grid.innerHTML = "";

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = data.slice(startIndex, endIndex);

    if (paginatedItems.length === 0) {
        grid.innerHTML = '<p class="no-results">No documents found matching your criteria.</p>';
        return;
    }

    paginatedItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'file-card';
        card.innerHTML = `
            <div class="file-icon"><i class="fas fa-file-pdf"></i></div>
            <div class="file-info">
                <h3>${item.display_title || item.title}</h3>
                <p>Subject: ${item.subject}</p>
                <p>Grade: ${item.grade_level}</p>
            </div>
            <button class="view-btn" onclick="openDocument('${item.file_url}')">View PDF</button>
        `;
        grid.appendChild(card);
    });

    // Update Page Info
    const pageInfo = document.getElementById('pageInfo');
    const totalPages = Math.ceil(data.length / itemsPerPage) || 1;
    if (pageInfo) pageInfo.innerText = `Page ${currentPage} of ${totalPages}`;
}

// 5. VIEW DOCUMENT
function openDocument(url) {
    const modal = document.getElementById("docModal");
    const viewer = document.getElementById("docViewer");
    viewer.src = url;
    modal.style.display = "flex";
}

// 6. UPLOAD DOCUMENT
async function uploadDocument() {
    const fileInput = document.getElementById('fileInput');
    const title = document.getElementById('docTitle').value;
    const subject = document.getElementById('docSubject').value;
    const grade = document.getElementById('docGrade').value;
    const btn = document.querySelector('.upload-btn');

    if (!fileInput.files[0] || !title || !subject) {
        alert("Please select a file and fill in all fields.");
        return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    btn.disabled = true;

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        const base64File = e.target.result.split(',')[1];
        
        const payload = {
            title: title,
            subject: subject,
            grade: grade,
            fileName: file.name,
            fileData: base64File,
            fileType: file.type
        };

        try {
            const res = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (res.ok) {
                alert("✅ Document Uploaded Successfully!");
                location.reload(); 
            } else {
                alert("Upload failed: " + result.error);
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Connection to Database failed.");
        } finally {
            btn.innerHTML = 'Upload Document';
            btn.disabled = false;
        }
    };

    reader.readAsDataURL(file);
}

// 7. UTILITIES
function updateFileName(input) {
    const display = document.getElementById('selectedFileName');
    if (display) {
        if (input.files && input.files[0]) {
            display.innerText = "Selected: " + input.files[0].name;
            display.style.color = "#32cd32"; // Lime Green
        } else {
            display.innerText = "No file chosen";
            display.style.color = "#666";
        }
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
        const matchesSearch = (item.display_title || item.title).toLowerCase().includes(searchText);
        const matchesSubject = subjectTerm === "" || item.subject.toLowerCase() === subjectTerm;
        const matchesGrade = gradeTerm === "" || item.grade_level.toString() === gradeTerm;
        return matchesSearch && matchesSubject && matchesGrade;
    });

    currentPage = 1; 
    renderCards(filtered);
}
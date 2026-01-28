// 1. CONFIGURATION & STATE
// This URL connects your website to the Cloudflare Worker database
const API_URL = "https://lucky-mud-57bd.buhle-1ce.workers.dev"; 
let allResources = []; 
let currentPage = 1;
const itemsPerPage = 6; // Sets how many documents show per page

// 2. INITIALIZATION
// Runs as soon as the page loads to set up all buttons and fetch data
document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    initScrollAnimation();
    
    // Setup Modal (Popup) Close Button logic
    const modal = document.getElementById("docModal");
    const closeBtn = document.querySelector(".close-modal");
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = "none";
            document.getElementById("docViewer").src = ""; // Stop file from loading in background
        };
    }

    // Close modal when clicking outside the document box
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
            document.getElementById("docViewer").src = "";
        }
    };

    // Pagination Button Listeners
    document.getElementById('prevPage')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderCards(allResources);
            window.scrollTo({ top: 500, behavior: 'smooth' });
        }
    });

    document.getElementById('nextPage')?.addEventListener('click', () => {
        const maxPage = Math.ceil(allResources.length / itemsPerPage);
        if (currentPage < maxPage) {
            currentPage++;
            renderCards(allResources);
            window.scrollTo({ top: 500, behavior: 'smooth' });
        }
    });

    // Search & Filter Listeners (Real-time updates)
    document.getElementById('searchInput')?.addEventListener('input', () => {
        currentPage = 1; // Reset to page 1 on new search
        filterDocuments();
    });
    document.getElementById('subjectFilter')?.addEventListener('change', () => {
        currentPage = 1;
        filterDocuments();
    });
    document.getElementById('gradeFilter')?.addEventListener('change', () => {
        currentPage = 1;
        filterDocuments();
    });

    // Upload Form Listener
    const form = document.getElementById('uploadForm');
    if (form) {
        form.addEventListener('submit', handleUpload);
    }
});

// 3. LOAD LIBRARY (Fetch Data from Cloudflare Worker)
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

// 4. RENDER CARDS (Builds the UI with Pagination)
function renderCards(data) {
    const fileGrid = document.getElementById('fileGrid');
    fileGrid.innerHTML = '';

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedItems = data.slice(start, end);
    const totalPages = Math.ceil(data.length / itemsPerPage) || 1;

    // Update Page Counter (e.g., "Page 1 of 10")
    const pageInfo = document.getElementById('pageInfo');
    if (pageInfo) pageInfo.innerText = `Page ${currentPage} of ${totalPages}`;
    
    // Enable/Disable buttons based on current page
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    if (prevBtn) prevBtn.disabled = (currentPage === 1);
    if (nextBtn) nextBtn.disabled = (currentPage === totalPages);

    if (paginatedItems.length === 0) {
        fileGrid.innerHTML = '<p>No documents found matching your criteria.</p>';
        return;
    }

    // Generate HTML for each document card
    paginatedItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'file-card';
        card.innerHTML = `
            <div class="card-icon-header">
                <i class="fas fa-file-pdf"></i>
            </div>
            <div class="card-body">
                <h3>${item.display_title}</h3>
                <p><strong>Subject:</strong> ${item.subject}</p>
                <p><strong>Grade:</strong> ${item.grade_level}</p>
            </div>
            <div class="card-footer">
                <button onclick="openViewer('${item.file_url}', '${item.display_title}')" class="view-link">View</button>
                <a href="${item.file_url}" download="${item.display_title}" class="down-link">Download</a>
            </div>
        `;
        fileGrid.appendChild(card);
    });
}

// 5. INTERNAL DOCUMENT VIEWER (The Popup Viewer)
function openViewer(url, title) {
    const modal = document.getElementById("docModal");
    const viewer = document.getElementById("docViewer");
    const modalTitle = document.getElementById("modalTitle");

    if (modal && viewer) {
        if (modalTitle) modalTitle.innerText = title;
        
        // Embedded viewer logic for PDFs
        const viewerUrl = url.endsWith('.pdf') 
            ? `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true` 
            : url;
            
        viewer.src = viewerUrl;
        modal.style.display = "block";
    }
}

// 6. UPLOAD HANDLER (Sends Files to Database)
async function handleUpload(event) {
    event.preventDefault();
    
    const btn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');

    if (!fileInput.files[0]) {
        alert("Please select a file first!");
        return;
    }

    // Show loading spinner
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
            location.reload(); // Refresh to show new document
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
}

// 7. UTILITIES
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
// 1. CONFIGURATION & STATE
const API_URL = "https://lucky-mud-57bd.buhle-1ce.workers.dev";
let allResources = [];
let currentPage = 1;
const itemsPerPage = 6;

// 2. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    initScrollAnimation();

    // Modal Close Logic
    const modal = document.getElementById("docModal");
    const closeBtn = document.querySelector(".modal-close");
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = "none";
            document.getElementById("docViewer").src = "";
        };
    }

    // Close modal when clicking outside
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = "none";
            document.getElementById("docViewer").src = "";
        }
    };

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
    grid.innerHTML = '<div class="loader">Loading Library Resources...</div>';

    try {
        const response = await fetch(`${API_URL}/api/resources`);
        const data = await response.json();

        // Handle array response from Cloudflare D1
        allResources = Array.isArray(data) ? data : (data.results || []);

        // Update statistics
        updateStatistics(allResources);

        // Render cards
        renderCards(allResources);
    } catch (error) {
        console.error("Fetch error:", error);
        grid.innerHTML = '<p class="no-results"><i class="fas fa-exclamation-triangle"></i>Failed to load library. Please check your connection and try again.</p>';
    }
}

// 4. UPDATE STATISTICS
function updateStatistics(resources) {
    // Total documents
    document.getElementById('totalDocuments').textContent = resources.length;

    // Unique subjects
    const uniqueSubjects = [...new Set(resources.map(item => item.subject).filter(Boolean))];
    document.getElementById('uniqueSubjects').textContent = uniqueSubjects.length;

    // Currently showing (will update on filter)
    updateFilteredCount(resources.length);
}

function updateFilteredCount(count) {
    document.getElementById('filteredCount').textContent = count;
}

// 5. FILTERING LOGIC (Search Bar & Dropdowns)
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
    const filteredData = getFilteredData();
    updateFilteredCount(filteredData.length);
    renderCards(filteredData);
}

// 6. RENDER CARDS TO SCREEN
function renderCards(data) {
    const grid = document.getElementById('fileGrid');
    if (!grid) return;
    grid.innerHTML = "";

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = data.slice(startIndex, endIndex);

    if (paginatedItems.length === 0) {
        grid.innerHTML = '<p class="no-results"><i class="fas fa-search"></i>No documents found matching your search criteria. Try different filters.</p>';
        updatePaginationControls(data);
        return;
    }

    paginatedItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'file-card';

        // Determine icon based on file type
        const fileUrl = item.file_url || "";
        let iconClass = "fa-file";
        let iconTypeClass = "general-icon";

        if (fileUrl.includes('.pdf')) {
            iconClass = "fa-file-pdf";
            iconTypeClass = "pdf-icon";
        } else if (fileUrl.includes('.doc') || fileUrl.includes('.docx')) {
            iconClass = "fa-file-word";
            iconTypeClass = "word-icon";
        } else if (fileUrl.includes('.xls') || fileUrl.includes('.xlsx')) {
            iconClass = "fa-file-excel";
            iconTypeClass = "excel-icon";
        } else if (fileUrl.includes('.ppt') || fileUrl.includes('.pptx')) {
            iconClass = "fa-file-powerpoint";
            iconTypeClass = "ppt-icon";
        } else if (fileUrl.includes('.jpg') || fileUrl.includes('.png') || fileUrl.includes('.gif')) {
            iconClass = "fa-file-image";
            iconTypeClass = "image-icon";
        }

        card.innerHTML = `
            <div class="card-icon-header">
                <div class="category-tag">${item.subject || 'General'}</div>
                <i class="fas ${iconClass} ${iconTypeClass} file-type-icon"></i>
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
                    <div class="info-item">
                        <i class="fas fa-calendar"></i>
                        <strong>Added:</strong> ${formatDate(item.created_at) || "Recently"}
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <button class="view-link" onclick="openDocument('${item.file_url}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <a href="${item.file_url}" download="${item.title || 'document'}" class="down-link">
                    <i class="fas fa-download"></i> Download
                </a>
            </div>
        `;
        grid.appendChild(card);
    });

    updatePaginationControls(data);
}

// 7. UPDATE PAGINATION CONTROLS
function updatePaginationControls(data) {
    const totalPages = Math.ceil(data.length / itemsPerPage) || 1;
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

    if (pageInfo) pageInfo.innerText = `Page ${currentPage} of ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

// 8. VIEW DOCUMENT (MODAL)
function openDocument(url) {
    const modal = document.getElementById("docModal");
    const viewer = document.getElementById("docViewer");

    if (!url || url === "undefined") {
        alert("Document URL not available.");
        return;
    }

    if (modal && viewer) {
        viewer.src = url;
        modal.style.display = "flex";
    }
}

// 9. UTILITIES
function formatDate(dateString) {
    if (!dateString) return "";
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return "";
    }
}

function initScrollAnimation() {
    const scrollText = document.getElementById('scrollText');
    if (scrollText) scrollText.style.display = 'block';
}
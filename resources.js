// 1. CONFIGURATION & STATE
const API_URL = "https://lucky-mud-57bd.buhle-1ce.workers.dev";
let allResources = [];
let currentPage = 1;
const itemsPerPage = 25; // CHANGED FROM 6 TO 25

// 2. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    initScrollAnimation();

    // File Input Listener - Updates "Selected: filename" text
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function () {
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
    document.getElementById('uploaderRoleFilter')?.addEventListener('change', filterDocuments);
    document.getElementById('docTypeFilter')?.addEventListener('change', filterDocuments);

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
    const roleTerm = document.getElementById('uploaderRoleFilter')?.value || "";
    const docTypeTerm = document.getElementById('docTypeFilter')?.value || "";

    return allResources.filter(item => {
        // Google-like search in title
        const title = (item.title || "").toLowerCase();
        const matchesSearch = searchText === "" ||
            title.includes(searchText) ||
            searchText.split(' ').every(word => word === "" || title.includes(word));

        const matchesSubject = subjectTerm === "" || (item.subject && item.subject.toLowerCase() === subjectTerm);
        const matchesGrade = gradeTerm === "" || (item.grade_level && item.grade_level.toString() === gradeTerm);
        const matchesRole = roleTerm === "" || (item.uploader_role && item.uploader_role.toLowerCase() === roleTerm);
        const matchesDocType = docTypeTerm === "" || (item.doc_type && item.doc_type.toLowerCase() === docTypeTerm);

        return matchesSearch && matchesSubject && matchesGrade && matchesRole && matchesDocType;
    });
}

function filterDocuments() {
    currentPage = 1; // Reset to page 1 on search
    renderCards(getFilteredData());
}

// 5. RENDER CARDS TO SCREEN - UPDATED WITH ALL FIXES
function renderCards(data) {
    const grid = document.getElementById('fileGrid');
    if (!grid) return;
    grid.innerHTML = "";

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = data.slice(startIndex, endIndex);

    if (paginatedItems.length === 0) {
        grid.innerHTML = '<p class="no-results">No documents found matching your search.</p>';
        updatePaginationInfo(data.length);
        return;
    }

    paginatedItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'file-card';

        // Format role display
        const roleDisplay = item.uploader_role ?
            item.uploader_role.charAt(0).toUpperCase() + item.uploader_role.slice(1) :
            "Unknown";

        // Format date
        const uploadDate = item.upload_date ?
            new Date(item.upload_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }) :
            "Unknown";

        // Get icon based on doc type
        const iconClass = getFileIconClass(item.doc_type);

        card.innerHTML = `
            <div class="card-icon-header">
                <div class="category-tag">${item.subject || 'General'}</div>
                <i class="fas ${iconClass} file-type-icon"></i>
            </div>
            <div class="card-body">
                <h3 title="${item.title || "Untitled Document"}" data-fulltitle="${item.title || "Untitled Document"}">${item.title || "Untitled Document"}</h3>
                <div class="document-info">
                    <div class="info-item">
                        <i class="fas fa-user-tag"></i>
                        <strong>By:</strong> ${roleDisplay}
                    </div>
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
                        <strong>Date:</strong> ${uploadDate}
                    </div>
                    ${item.doc_type ? `
                    <div class="info-item">
                        <i class="fas fa-file-alt"></i>
                        <strong>Type:</strong> ${formatDocType(item.doc_type)}
                    </div>
                    ` : ''}
                </div>
            </div>
            <div class="card-footer">
                <button class="view-link" onclick="openDocumentModal('${item.file_url}', '${escapeHtml(item.title)}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <a href="${item.file_url}" download="${item.title || 'document'}" class="down-link" onclick="return handleDownload(event, '${item.file_url}', '${item.title}')">
                    <i class="fas fa-download"></i> Download
                </a>
            </div>
        `;
        grid.appendChild(card);
    });

    updatePaginationInfo(data.length);
}

// 6. UPDATE PAGINATION INFO WITH 25 DOCUMENTS PER PAGE
function updatePaginationInfo(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const pageInfo = document.getElementById('pageInfo');
    if (pageInfo) {
        const startItem = ((currentPage - 1) * itemsPerPage) + 1;
        const endItem = Math.min(currentPage * itemsPerPage, totalItems);
        pageInfo.innerHTML = `Page ${currentPage} of ${totalPages} <span style="font-size: 0.8rem; color: #666;">(${totalItems} documents)</span>`;
    }

    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages || totalPages === 0;
}

// 7. VIEW DOCUMENT IN MODAL (FIXED TO SHOW IN POPUP)
function openDocumentModal(url, title) {
    const modal = document.getElementById("docModal");
    const viewer = document.getElementById("docViewer");

    if (!modal || !viewer) {
        // Fallback to new tab if modal doesn't exist
        window.open(url, '_blank');
        return;
    }

    // Set modal title if exists
    const modalTitle = modal.querySelector('h3');
    if (modalTitle && title) {
        modalTitle.textContent = title;
    }

    // Set iframe source
    viewer.src = url;

    // Show modal
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    // Close modal when clicking X or outside
    const closeModal = () => {
        modal.style.display = "none";
        viewer.src = "";
        document.body.style.overflow = "auto";
    };

    // Update close button event
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.onclick = closeModal;
    }

    // Close when clicking outside modal
    modal.onclick = function (event) {
        if (event.target === modal) {
            closeModal();
        }
    };
}

// 8. HANDLE DOWNLOAD PROPERLY
function handleDownload(event, url, title) {
    // Let default behavior happen for normal URLs
    if (url && url.startsWith('http') && !url.includes('peer-2-peer.co.za')) {
        return true;
    }

    // For our files, ensure proper download
    event.preventDefault();

    // Create a temporary link
    const link = document.createElement('a');
    link.href = url;
    link.download = title ? `${title.replace(/[^a-z0-9]/gi, '_')}.pdf` : 'document.pdf';

    // For R2 files, use the API endpoint
    if (url && url.includes('actual_file_key')) {
        // Extract key from URL or data
        const fileKey = url.split('/').pop() || 'unknown';
        link.href = `${API_URL}/api/file/${fileKey}`;
    }

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return false;
}

// 9. UPLOAD DOCUMENT
async function uploadDocument() {
    const fileInput = document.getElementById('fileInput');
    const titleInput = document.getElementById('fileName');
    const subjectInput = document.getElementById('fileSubject');
    const gradeInput = document.getElementById('fileGrade');
    const roleInput = document.getElementById('uploaderRole');
    const docTypeInput = document.getElementById('docType');
    const btn = document.getElementById('uploadBtn');

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

        const payload = {
            title: titleInput.value,
            subject: subjectInput.value,
            grade: gradeInput.value,
            uploader_role: roleInput.value,
            doc_type: docTypeInput.value,
            file_data: base64File,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size
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

// 10. HELPER FUNCTIONS
function updateFileName(input) {
    const display = document.getElementById('selectedFileName');
    if (display && input.files && input.files[0]) {
        display.innerText = "Selected: " + input.files[0].name;
        display.style.color = "#32cd32";
    }
}

function initScrollAnimation() {
    const scrollText = document.getElementById('scrollText');
    if (scrollText) scrollText.style.display = 'block';
}

function getFileIconClass(docType) {
    if (!docType) return 'fa-file general-icon';

    switch (docType.toLowerCase()) {
        case 'notes': return 'fa-sticky-note';
        case 'tests': return 'fa-clipboard-check';
        case 'worksheet': return 'fa-table';
        case 'practice_material': return 'fa-dumbbell';
        case 'task': return 'fa-tasks';
        case 'assignment': return 'fa-file-signature';
        case 'project': return 'fa-project-diagram';
        case 'literature': return 'fa-book-open';
        case 'textbook': return 'fa-book';
        default: return 'fa-file general-icon';
    }
}

function formatDocType(docType) {
    if (!docType) return 'Document';
    return docType.split('_').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally available
window.openDocumentModal = openDocumentModal;
window.handleDownload = handleDownload;
window.uploadDocument = uploadDocument;
window.updateFileName = updateFileName;
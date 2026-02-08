// 1. CONFIGURATION & STATE
const API_URL = "https://lucky-mud-57bd.buhle-1ce.workers.dev";
let allResources = [];
let currentPage = 1;
const itemsPerPage = 6;

// 2. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    initScrollAnimation();

    // Set today's date as default
    document.getElementById('docDate').valueAsDate = new Date();

    // Initialize filters
    populateFilterOptions();

    // File Input Listener
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
            document.body.style.overflow = 'auto';
        };
    }

    // Close modal on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modal.style.display = "none";
            document.getElementById("docViewer").src = "";
            document.body.style.overflow = 'auto';
        }
    });

    // Search and Filter Listeners
    document.getElementById('searchInput')?.addEventListener('input', debounce(filterDocuments, 300));
    document.getElementById('subjectFilter')?.addEventListener('change', filterDocuments);
    document.getElementById('gradeFilter')?.addEventListener('change', filterDocuments);
    document.getElementById('uploaderRoleFilter')?.addEventListener('change', filterDocuments);
    document.getElementById('docTypeFilter')?.addEventListener('change', filterDocuments);
    document.getElementById('dateFilter')?.addEventListener('change', filterDocuments);

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

// 3. POPULATE FILTER OPTIONS
function populateFilterOptions() {
    const subjects = [
        "accounting", "afrikaans", "agricultural management practices",
        "agricultural science", "agricultural technology", "business",
        "cat", "civil technology", "computer applications technology",
        "consumer studies", "dance studies", "design", "development studies",
        "dramatic arts", "economic and management sciences", "economics",
        "electrical technology", "engineering graphics and design", "english",
        "equine studies", "geography", "history", "hospitality studies",
        "isindebele", "isixhosa", "isizulu", "it", "life orientation",
        "life_science", "marine sciences", "maritime economics", "mathematics",
        "math_lit", "mechanical technology", "music", "nautical science",
        "physics", "religion studies", "sepedi", "sesotho", "setswana",
        "siswati", "sport and exercise science", "technical maths",
        "technical sciences", "tourism", "tshivenda", "visual arts", "xitsonga"
    ].sort();

    const subjectFilter = document.getElementById('subjectFilter');
    subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject.charAt(0).toUpperCase() + subject.slice(1).replace(/_/g, ' ');
        subjectFilter.appendChild(option);
    });
}

// 4. FETCH DATA FROM WORKER
async function loadLibrary() {
    const grid = document.getElementById('fileGrid');
    grid.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-spin"></i> Accessing Cloud Library...</div>';

    try {
        const response = await fetch(`${API_URL}/api/resources`);
        const data = await response.json();

        allResources = Array.isArray(data) ? data : (data.results || []);

        // Ensure file_url is properly set
        allResources.forEach(resource => {
            if (!resource.file_url || resource.file_url === '#') {
                resource.file_url = `${API_URL}/api/file/${resource.actual_file_key}`;
            }
        });

        renderCards(allResources);
    } catch (error) {
        console.error("Fetch error:", error);
        grid.innerHTML = '<p style="color:red; text-align:center;">Failed to connect to library. Please check your connection.</p>';
    }
}

// 5. GENERATE FILE URL FOR MISSING FILES
function generateFileUrl(resource) {
    return `${API_URL}/api/file/${resource.actual_file_key}`;
}

// 6. ADVANCED FILTERING LOGIC
function getFilteredData() {
    const searchText = document.getElementById('searchInput')?.value.toLowerCase() || "";
    const subjectTerm = document.getElementById('subjectFilter')?.value.toLowerCase() || "";
    const gradeTerm = document.getElementById('gradeFilter')?.value || "";
    const roleTerm = document.getElementById('uploaderRoleFilter')?.value || "";
    const docTypeTerm = document.getElementById('docTypeFilter')?.value || "";
    const dateTerm = document.getElementById('dateFilter')?.value || "";
    const searchWords = searchText.split(' ').filter(word => word.length > 0);

    return allResources.filter(item => {
        // Google-like search in title
        let matchesSearch = true;
        if (searchWords.length > 0) {
            const title = (item.title || "").toLowerCase();
            matchesSearch = searchWords.every(word => title.includes(word));
        }

        // Other filters
        const matchesSubject = subjectTerm === "" || (item.subject && item.subject.toLowerCase() === subjectTerm);
        const matchesGrade = gradeTerm === "" || (item.grade_level && item.grade_level.toString() === gradeTerm);
        const matchesRole = roleTerm === "" || (item.uploader_role && item.uploader_role.toLowerCase() === roleTerm);
        const matchesDocType = docTypeTerm === "" || (item.doc_type && item.doc_type.toLowerCase() === docTypeTerm);

        // Date filtering
        let matchesDate = true;
        if (dateTerm && item.upload_date) {
            const itemDate = new Date(item.upload_date).toISOString().split('T')[0];
            matchesDate = itemDate === dateTerm;
        }

        return matchesSearch && matchesSubject && matchesGrade && matchesRole && matchesDocType && matchesDate;
    });
}

// 7. DEBOUNCE FUNCTION FOR SEARCH
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 8. RENDER CARDS WITH HIGHLIGHTING
function renderCards(data) {
    const grid = document.getElementById('fileGrid');
    if (!grid) return;
    grid.innerHTML = "";

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = data.slice(startIndex, endIndex);
    const searchText = document.getElementById('searchInput')?.value.toLowerCase() || "";

    if (paginatedItems.length === 0) {
        grid.innerHTML = '<p class="no-results"><i class="fas fa-search"></i> No documents found matching your search.</p>';
        return;
    }

    paginatedItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'file-card';

        // Highlight search terms in title
        let titleHTML = item.title || "Untitled Document";
        if (searchText) {
            const regex = new RegExp(`(${searchText.split(' ').filter(w => w).join('|')})`, 'gi');
            titleHTML = titleHTML.replace(regex, '<span class="highlight">$1</span>');
        }

        // Get appropriate icon
        const iconClass = getFileIconClass(item.doc_type, item.file_url);

        // Format date
        const uploadDate = item.upload_date ? new Date(item.upload_date).toLocaleDateString() : 'Unknown';

        card.innerHTML = `
            <div class="card-icon-header">
                <div class="category-tag">${item.doc_type ? item.doc_type.replace('_', ' ') : 'Document'}</div>
                <i class="fas ${iconClass} file-type-icon"></i>
            </div>
            <div class="card-body">
                <h3>${titleHTML}</h3>
                <div class="document-info">
                    <div class="info-item">
                        <i class="fas fa-user-tag"></i>
                        <strong>Uploaded by:</strong> ${item.uploader_role || 'Unknown'}
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
                        <strong>Uploaded:</strong> ${uploadDate}
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <button class="view-link" onclick="openDocument('${item.file_url}', '${item.title}')">
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

    // Update pagination button states
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

// 9. GET FILE ICON CLASS
function getFileIconClass(docType, fileUrl) {
    if (docType) {
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
            default: return 'fa-file';
        }
    }

    // Fallback based on file extension
    if (fileUrl) {
        if (fileUrl.toLowerCase().endsWith('.pdf')) return 'fa-file-pdf pdf-icon';
        if (fileUrl.toLowerCase().endsWith('.doc') || fileUrl.toLowerCase().endsWith('.docx')) return 'fa-file-word word-icon';
        if (fileUrl.toLowerCase().endsWith('.xls') || fileUrl.toLowerCase().endsWith('.xlsx')) return 'fa-file-excel excel-icon';
        if (fileUrl.toLowerCase().endsWith('.ppt') || fileUrl.toLowerCase().endsWith('.pptx')) return 'fa-file-powerpoint ppt-icon';
        if (fileUrl.match(/\.(jpg|jpeg|png|gif)$/i)) return 'fa-file-image image-icon';
    }

    return 'fa-file general-icon';
}

// 10. VIEW DOCUMENT IN MODAL
function openDocument(url, title) {
    const modal = document.getElementById("docModal");
    const viewer = document.getElementById("docViewer");
    const modalTitle = document.querySelector(".modal-header h3");

    if (modal && viewer) {
        modalTitle.textContent = title || "Document Viewer";

        // For PDFs, use Google Docs viewer for better compatibility
        if (url.toLowerCase().endsWith('.pdf')) {
            viewer.src = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
        }
        // For images, display directly
        else if (url.match(/\.(jpg|jpeg|png|gif)$/i)) {
            viewer.src = url;
        }
        // For other files that can be displayed in iframe
        else if (url.match(/\.(txt|html|htm)$/i)) {
            viewer.src = url;
        }
        // For documents that can't be displayed, download them
        else {
            window.open(url, '_blank');
            return;
        }

        modal.style.display = "flex";
        document.body.style.overflow = 'hidden';
    }
}

// 11. UPLOAD DOCUMENT WITH ALL FIELDS
async function uploadDocument() {
    const fileInput = document.getElementById('fileInput');
    const titleInput = document.getElementById('fileName');
    const subjectInput = document.getElementById('fileSubject');
    const gradeInput = document.getElementById('fileGrade');
    const roleInput = document.getElementById('uploaderRole');
    const docTypeInput = document.getElementById('docType');
    const docDateInput = document.getElementById('docDate');
    const descriptionInput = document.getElementById('docDescription');
    const btn = document.getElementById('uploadBtn');

    // Validate all required fields
    if (!fileInput.files[0]) {
        alert("Please select a file to upload.");
        return;
    }

    if (!titleInput.value.trim()) {
        alert("Please provide a document title.");
        return;
    }

    if (!subjectInput.value) {
        alert("Please select or enter a subject.");
        return;
    }

    if (!gradeInput.value) {
        alert("Please select a grade level.");
        return;
    }

    if (!roleInput.value) {
        alert("Please select your role.");
        return;
    }

    if (!docTypeInput.value) {
        alert("Please select a document type.");
        return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    btn.disabled = true;

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        // Get base64 data
        const base64Data = e.target.result.split(',')[1];

        // Generate unique file key with original extension
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const fileKey = `doc_${timestamp}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;

        // Direct URL to R2 bucket file
        const fileUrl = `${API_URL}/api/file/${fileKey}`;

        const payload = {
            title: titleInput.value,
            subject: subjectInput.value.toLowerCase(),
            grade: gradeInput.value,
            uploader_role: roleInput.value,
            doc_type: docTypeInput.value,
            doc_date: docDateInput.value,
            description: descriptionInput.value || "",
            actual_file_key: fileKey,
            file_url: fileUrl,
            file_data: base64Data,
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
                alert(`✅ Success! "${titleInput.value}" has been added to the library.`);
                // Clear form
                document.getElementById('uploadForm').reset();
                document.getElementById('selectedFileName').innerText = '';
                document.getElementById('docDate').valueAsDate = new Date();
                // Reload library
                loadLibrary();
            } else {
                alert("Upload failed: " + (result.error || "Unknown error"));
            }
        } catch (error) {
            console.error("Upload Error:", error);
            alert("Connection to database failed. Please try again.");
        } finally {
            btn.innerHTML = 'Upload Document';
            btn.disabled = false;
        }
    };

    reader.readAsDataURL(file);
}

// 12. UTILITIES
function updateFileName(input) {
    const display = document.getElementById('selectedFileName');
    if (display && input.files && input.files[0]) {
        display.innerText = "Selected: " + input.files[0].name;
        display.style.color = "var(--pro-green)";
    }
}

function initScrollAnimation() {
    const scrollText = document.getElementById('scrollText');
    if (scrollText) scrollText.style.display = 'block';
}

function filterDocuments() {
    currentPage = 1;
    renderCards(getFilteredData());
}
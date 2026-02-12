// 1. CONFIGURATION & STATE
const API_URL = "https://lucky-mud-57bd.buhle-1ce.workers.dev";
let allResources = [];
let currentPage = 1;
const itemsPerPage = 25; // CHANGED FROM 6 TO 25
let currentFilters = {
    search: '',
    subject: 'all',
    grade: 'all',
    role: 'all',
    docType: 'all',
    date: ''
};

// 2. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    initEventListeners();

    // Set today's date as default
    document.getElementById('docDate').valueAsDate = new Date();
});

// 3. EVENT LISTENERS
function initEventListeners() {
    // File input listener
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function () {
            updateFileName(this);
        });
    }

    // Modal close logic
    const closeBtn = document.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.onclick = closeModal;
    }

    // Filter listeners
    document.getElementById('searchInput')?.addEventListener('input', debounce(filterDocuments, 300));
    document.getElementById('subjectFilter')?.addEventListener('change', filterDocuments);
    document.getElementById('gradeFilter')?.addEventListener('change', filterDocuments);
    document.getElementById('uploaderRoleFilter')?.addEventListener('change', filterDocuments);
    document.getElementById('docTypeFilter')?.addEventListener('change', filterDocuments);
    document.getElementById('dateFilter')?.addEventListener('change', filterDocuments);

    // Pagination buttons
    document.getElementById('prevPage')?.addEventListener('click', () => changePage(-1));
    document.getElementById('nextPage')?.addEventListener('click', () => changePage(1));
}

// 4. FETCH DATA FROM WORKER
async function loadLibrary() {
    const grid = document.getElementById('fileGrid');
    grid.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Accessing Cloud Library...</p>
    </div>
  `;

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
        grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ef4444;"></i>
        <p class="no-results">Failed to connect to library. Please check your connection.</p>
        <button class="btn-upload" style="margin-top: 20px; width: auto;" onclick="loadLibrary()">
          <i class="fas fa-redo"></i> Try Again
        </button>
      </div>
    `;
    }
}

// 5. FILTERING LOGIC
function filterDocuments() {
    currentFilters.search = document.getElementById('searchInput')?.value.toLowerCase() || "";
    currentFilters.subject = document.getElementById('subjectFilter')?.value || "all";
    currentFilters.grade = document.getElementById('gradeFilter')?.value || "all";
    currentFilters.role = document.getElementById('uploaderRoleFilter')?.value || "all";
    currentFilters.docType = document.getElementById('docTypeFilter')?.value || "all";
    currentFilters.date = document.getElementById('dateFilter')?.value || "";

    currentPage = 1;
    applyFilters();
}

function applyFilters() {
    let filtered = [...allResources];

    // Search filter
    if (currentFilters.search) {
        const searchWords = currentFilters.search.split(' ').filter(word => word.length > 0);
        filtered = filtered.filter(item => {
            const title = (item.title || "").toLowerCase();
            return searchWords.every(word => title.includes(word));
        });
    }

    // Subject filter
    if (currentFilters.subject !== "all") {
        filtered = filtered.filter(item =>
            item.subject && item.subject.toLowerCase() === currentFilters.subject
        );
    }

    // Grade filter
    if (currentFilters.grade !== "all") {
        filtered = filtered.filter(item =>
            item.grade_level && item.grade_level.toString() === currentFilters.grade
        );
    }

    // Role filter
    if (currentFilters.role !== "all") {
        filtered = filtered.filter(item =>
            item.uploader_role && item.uploader_role.toLowerCase() === currentFilters.role
        );
    }

    // Doc type filter
    if (currentFilters.docType !== "all") {
        filtered = filtered.filter(item =>
            item.doc_type && item.doc_type.toLowerCase() === currentFilters.docType
        );
    }

    // Date filter
    if (currentFilters.date) {
        filtered = filtered.filter(item => {
            if (!item.upload_date) return false;
            const itemDate = new Date(item.upload_date).toISOString().split('T')[0];
            return itemDate === currentFilters.date;
        });
    }

    renderCards(filtered);
}

// 6. RENDER CARDS WITH HOVER TOOLTIP
function renderCards(data) {
    const grid = document.getElementById('fileGrid');
    if (!grid) return;

    // Clear grid
    grid.innerHTML = "";

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = data.slice(startIndex, endIndex);

    if (paginatedItems.length === 0) {
        grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-search" style="font-size: 3rem; color: #64748b;"></i>
        <p class="no-results">No documents found matching your search.</p>
        <button class="reset-filters" style="margin-top: 20px; width: auto;" onclick="resetFilters()">
          <i class="fas fa-sync-alt"></i> Reset Filters
        </button>
      </div>
    `;
        updatePagination(0);
        return;
    }

    // Render cards
    paginatedItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'file-card';
        card.title = item.title || "Untitled Document"; // HOVER TOOLTIP FOR FULL TITLE

        // Get appropriate icon
        const iconClass = getFileIconClass(item.doc_type, item.file_url);

        // Format date
        const uploadDate = item.upload_date ? new Date(item.upload_date).toLocaleDateString() : 'Unknown';

        // Truncate title for display (full title shown on hover via title attribute)
        const displayTitle = item.title || "Untitled Document";

        card.innerHTML = `
      <div class="card-icon-header">
        <div class="category-tag">${item.doc_type ? item.doc_type.replace(/_/g, ' ') : 'Document'}</div>
        <i class="fas ${iconClass} file-type-icon"></i>
      </div>
      <div class="card-body">
        <h3>${escapeHtml(displayTitle)}</h3>
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
        <button class="view-link" onclick="openDocument('${item.file_url.replace(/'/g, "\\'")}', '${item.title.replace(/'/g, "\\'")}')">
          <i class="fas fa-eye"></i> View
        </button>
        <a href="${item.file_url}" download="${item.title}" class="down-link">
          <i class="fas fa-download"></i> Download
        </a>
      </div>
    `;

        grid.appendChild(card);
    });

    updatePagination(data.length);
}

// 7. PAGINATION
function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const pageInfo = document.getElementById('pageInfo');
    if (pageInfo) pageInfo.innerText = `Page ${currentPage} of ${totalPages}`;

    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
}

function changePage(direction) {
    const totalPages = Math.ceil(allResources.length / itemsPerPage) || 1;
    const newPage = currentPage + direction;

    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        applyFilters();
        window.scrollTo({ top: 400, behavior: 'smooth' });
    }
}

// 8. FILE ICONS & UTILITIES
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
            case 'past_paper': return 'fa-history';
            case 'memo': return 'fa-check-double';
            case 'study_guide': return 'fa-graduation-cap';
            case 'presentation': return 'fa-file-powerpoint';
            default: return 'fa-file-alt';
        }
    }

    // Fallback based on file extension
    if (fileUrl) {
        const url = fileUrl.toLowerCase();
        if (url.endsWith('.pdf')) return 'fa-file-pdf';
        if (url.endsWith('.doc') || url.endsWith('.docx')) return 'fa-file-word';
        if (url.endsWith('.xls') || url.endsWith('.xlsx')) return 'fa-file-excel';
        if (url.endsWith('.ppt') || url.endsWith('.pptx')) return 'fa-file-powerpoint';
        if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) return 'fa-file-image';
        if (url.match(/\.(mp4|mov|avi|mkv|webm)$/i)) return 'fa-file-video';
        if (url.match(/\.(mp3|wav|ogg|m4a)$/i)) return 'fa-file-audio';
        if (url.match(/\.(zip|rar|7z|tar|gz)$/i)) return 'fa-file-archive';
    }

    return 'fa-file-alt';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 9. DOCUMENT VIEWER
function openDocument(url, title) {
    const modal = document.getElementById("docModal");
    const viewer = document.getElementById("docViewer");
    const modalTitle = document.getElementById("modalTitle");

    if (modal && viewer) {
        modalTitle.textContent = title || "Document Viewer";

        // For PDFs, use Google Docs viewer for better compatibility
        if (url.toLowerCase().endsWith('.pdf')) {
            viewer.src = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
        }
        // For images, display directly
        else if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
            viewer.src = url;
        }
        // For videos
        else if (url.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
            viewer.src = url;
        }
        // For audio files
        else if (url.match(/\.(mp3|wav|ogg|m4a)$/i)) {
            viewer.src = url;
        }
        // For text files that can be displayed in iframe
        else if (url.match(/\.(txt|html|htm|css|js|json|xml)$/i)) {
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

function closeModal() {
    document.getElementById('docModal').style.display = 'none';
    document.getElementById('docViewer').src = '';
    document.body.style.overflow = 'auto';
}

// 10. UPLOAD DOCUMENT
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

    const file = fileInput.files[0];

    // Calculate file size for display
    const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const fileSizeInGB = (file.size / (1024 * 1024 * 1024)).toFixed(2);
    const sizeDisplay = file.size > 1024 * 1024 * 1024
        ? `${fileSizeInGB} GB`
        : `${fileSizeInMB} MB`;

    // Confirm upload for large files
    if (file.size > 100 * 1024 * 1024) { // 100MB
        if (!confirm(`File size: ${sizeDisplay}\n\nUploading large files may take a few minutes. Do you want to continue?`)) {
            return;
        }
    }

    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Uploading ${sizeDisplay}...`;
    btn.disabled = true;

    try {
        // Convert file to base64
        const base64Data = await fileToBase64(file);
        const base64String = base64Data.split(',')[1];

        // Generate unique file key
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substr(2, 9);
        const fileExtension = file.name.split('.').pop() || 'bin';
        const fileKey = `doc_${timestamp}_${randomStr}.${fileExtension}`;

        // Create payload
        const payload = {
            title: titleInput.value.trim(),
            subject: subjectInput.value.toLowerCase(),
            grade: gradeInput.value,
            uploader_role: roleInput.value,
            doc_type: docTypeInput.value,
            doc_date: docDateInput.value || new Date().toISOString().split('T')[0],
            actual_file_key: fileKey,
            file_data: base64String,
            file_name: file.name,
            file_type: file.type || getMimeType(fileExtension),
            file_size: file.size,
            description: descriptionInput?.value?.trim() || ''
        };

        const res = await fetch(`${API_URL}/api/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (res.ok) {
            alert(`✅ Success!\n\n"${titleInput.value}" (${sizeDisplay}) has been added to the library.`);

            // Clear form
            document.getElementById('uploadForm').reset();
            document.getElementById('selectedFileName').innerText = '';
            document.getElementById('docDate').valueAsDate = new Date();

            // Reload library
            await loadLibrary();

            // Reset to first page
            currentPage = 1;
            applyFilters();
        } else {
            throw new Error(result.error || "Upload failed");
        }
    } catch (error) {
        console.error("Upload Error: ", error);
        alert(`❌ Upload failed: ${error.message}\n\nPlease try again.`);
    } finally {
        btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Document';
        btn.disabled = false;
    }
}

// Helper function to convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => {
            console.error("FileReader error:", error);
            reject(new Error("Failed to read file. Please try again."));
        };
    });
}

// Helper function to get MIME type from extension
function getMimeType(extension) {
    const mimeTypes = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt': 'text/plain',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'mp3': 'audio/mpeg',
        'zip': 'application/zip'
    };
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

// Update file name display
function updateFileName(input) {
    const display = document.getElementById('selectedFileName');
    if (display && input.files && input.files[0]) {
        const file = input.files[0];
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        const sizeInGB = (file.size / (1024 * 1024 * 1024)).toFixed(2);
        const sizeDisplay = file.size > 1024 * 1024 * 1024
            ? `${sizeInGB} GB`
            : `${sizeInMB} MB`;
        display.innerText = `${file.name} (${sizeDisplay})`;
    }
}

// Debounce function for search
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

// Network status handling
window.addEventListener('online', () => loadLibrary());
window.addEventListener('offline', () => {
    const grid = document.getElementById('fileGrid');
    if (grid) {
        grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-wifi-slash" style="font-size: 3rem; color: #ef4444;"></i>
        <p class="no-results">You are offline. Please check your internet connection.</p>
      </div>
    `;
    }
});
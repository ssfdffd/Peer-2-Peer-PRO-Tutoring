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

        // Ensure file_url is properly set - use the API endpoint
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
                <div class="category-tag">${item.doc_type ? item.doc_type.replace(/_/g, ' ') : 'Document'}</div>
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
                <button class="view-link" onclick="openDocument('${item.file_url}', '${item.title.replace(/'/g, "\\'")}')">
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
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
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
        if (url.endsWith('.pdf')) return 'fa-file-pdf pdf-icon';
        if (url.endsWith('.doc') || url.endsWith('.docx')) return 'fa-file-word word-icon';
        if (url.endsWith('.xls') || url.endsWith('.xlsx')) return 'fa-file-excel excel-icon';
        if (url.endsWith('.ppt') || url.endsWith('.pptx')) return 'fa-file-powerpoint ppt-icon';
        if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) return 'fa-file-image image-icon';
        if (url.match(/\.(mp4|mov|avi|mkv|webm)$/i)) return 'fa-file-video video-icon';
        if (url.match(/\.(mp3|wav|ogg|m4a)$/i)) return 'fa-file-audio audio-icon';
        if (url.match(/\.(zip|rar|7z|tar|gz)$/i)) return 'fa-file-archive archive-icon';
    }

    return 'fa-file-alt general-icon';
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

// 11. UPLOAD DOCUMENT - NO SIZE LIMIT, HANDLES LARGE FILES
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
        // Show upload progress
        console.log(`Starting upload: ${file.name} (${sizeDisplay})`);

        // Convert file to base64
        const base64Data = await fileToBase64(file);

        // Remove the data URL prefix
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
        } else {
            throw new Error(result.error || "Upload failed");
        }
    } catch (error) {
        console.error("Upload Error:", error);
        alert(`❌ Upload failed: ${error.message}\n\nPlease try again.`);
    } finally {
        btn.innerHTML = 'Upload Document';
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
        // Documents
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt': 'text/plain',
        'rtf': 'application/rtf',
        'csv': 'text/csv',

        // Images
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'svg': 'image/svg+xml',
        'webp': 'image/webp',

        // Video
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'mkv': 'video/x-matroska',
        'webm': 'video/webm',

        // Audio
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'm4a': 'audio/mp4',

        // Archives
        'zip': 'application/zip',
        'rar': 'application/vnd.rar',
        '7z': 'application/x-7z-compressed',
        'tar': 'application/x-tar',
        'gz': 'application/gzip',

        // Other
        'json': 'application/json',
        'xml': 'application/xml',
        'html': 'text/html',
        'htm': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript'
    };

    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

// 12. UTILITIES
function updateFileName(input) {
    const display = document.getElementById('selectedFileName');
    if (display && input.files && input.files[0]) {
        const file = input.files[0];
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        const sizeInGB = (file.size / (1024 * 1024 * 1024)).toFixed(2);
        const sizeDisplay = file.size > 1024 * 1024 * 1024
            ? `${sizeInGB} GB`
            : `${sizeInMB} MB`;

        display.innerText = `Selected: ${file.name} (${sizeDisplay})`;
        display.style.color = "#00ff88";
        display.style.fontWeight = "500";
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

// 13. ERROR HANDLING FOR NETWORK ISSUES
window.addEventListener('online', function () {
    console.log('Network connection restored');
    loadLibrary();
});

window.addEventListener('offline', function () {
    console.log('Network connection lost');
    const grid = document.getElementById('fileGrid');
    if (grid) {
        grid.innerHTML = '<p style="color:#ff6b6b; text-align:center;"><i class="fas fa-wifi-slash"></i> You are offline. Please check your internet connection.</p>';
    }
});
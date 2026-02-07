// 1. CONFIGURATION & STATE
const API_URL = "https://lucky-mud-57bd.buhle-1ce.workers.dev";
let allResources = [];
let currentPage = 1;
const itemsPerPage = 25; // Changed from 6 to 25

// 2. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    initScrollAnimation();

    // Set today's date as default for upload
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

    // Close modal on ESC key or clicking outside
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        const modal = document.getElementById("docModal");
        if (e.target === modal) {
            closeModal();
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
    grid.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-spin"></i> Loading Library Resources...</div>';

    try {
        const response = await fetch(`${API_URL}/api/resources`);
        const data = await response.json();

        allResources = Array.isArray(data) ? data : (data.results || []);

        // Fix missing file URLs
        allResources.forEach(resource => {
            if (!resource.file_url || resource.file_url === '#') {
                resource.file_url = generateFileUrl(resource);
            }
        });

        renderCards(allResources);
    } catch (error) {
        console.error("Fetch error:", error);
        grid.innerHTML = '<div class="no-results"><i class="fas fa-exclamation-triangle"></i><p>Failed to connect to library. Please check your connection.</p></div>';
    }
}

// 5. GENERATE FILE URL FOR MISSING FILES
function generateFileUrl(resource) {
    if (resource.actual_file_key) {
        return `https://peer-2-peer.co.za/uploads/${resource.actual_file_key}`;
    }

    // Fallback URL
    const docType = resource.doc_type || 'pdf';
    const fileName = resource.title ? encodeURIComponent(resource.title.replace(/[^a-z0-9]/gi, '_')) : 'document';
    return `https://docs.google.com/viewer?url=${encodeURIComponent(`https://peer-2-peer.co.za/uploads/${fileName}.${docType}`)}&embedded=true`;
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

// 8. RENDER CARDS WITH HIGHLIGHTING AND TOOLTIP
function renderCards(data) {
    const grid = document.getElementById('fileGrid');
    if (!grid) return;
    grid.innerHTML = "";

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = data.slice(startIndex, endIndex);
    const searchText = document.getElementById('searchInput')?.value.toLowerCase() || "";

    if (paginatedItems.length === 0) {
        grid.innerHTML = '<div class="no-results"><i class="fas fa-search"></i><p>No documents found matching your search.</p><p>Try different keywords or filters.</p></div>';
        updatePaginationInfo(data.length);
        return;
    }

    paginatedItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'file-card';

        // Highlight search terms in title
        let titleHTML = item.title || "Untitled Document";
        let displayTitle = titleHTML;
        if (searchText) {
            const regex = new RegExp(`(${searchText.split(' ').filter(w => w).join('|')})`, 'gi');
            displayTitle = displayTitle.replace(regex, '<span class="highlight">$1</span>');
        }

        // Get appropriate icon and role class
        const iconClass = getFileIconClass(item.doc_type, item.file_url);
        const roleClass = `role-${item.uploader_role || 'unknown'}`;

        // Format date
        const uploadDate = item.upload_date ? formatDate(new Date(item.upload_date)) : 'Unknown date';

        // Get badge class for document type
        const badgeClass = item.doc_type ? `badge-${item.doc_type}` : '';

        card.innerHTML = `
            <div class="card-icon-header">
                <div class="category-tag ${badgeClass}">${item.doc_type ? formatDocType(item.doc_type) : 'Document'}</div>
                <i class="fas ${iconClass} file-type-icon"></i>
            </div>
            <div class="card-body">
                <h3 data-fulltitle="${item.title || 'Untitled Document'}">${displayTitle}</h3>
                <div class="document-info">
                    <div class="info-item">
                        <i class="fas fa-user-tag ${roleClass}"></i>
                        <strong>By:</strong> <span class="${roleClass}">${formatRole(item.uploader_role)}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-graduation-cap"></i>
                        <strong>Grade:</strong> ${item.grade_level || "N/A"}
                    </div>
                    <div class="info-item">
                        <i class="fas fa-book"></i>
                        <strong>Subject:</strong> ${formatSubject(item.subject)}
                    </div>
                    <div class="info-item">
                        <i class="fas fa-calendar"></i>
                        <strong>Uploaded:</strong> ${uploadDate}
                    </div>
                    ${item.description ? `
                    <div class="info-item" style="flex: 1 0 100%; font-size: 0.8rem; color: #666;">
                        <i class="fas fa-align-left"></i>
                        <strong>Description:</strong> ${item.description}
                    </div>
                    ` : ''}
                </div>
            </div>
            <div class="card-footer">
                <button class="view-link" onclick="openDocument('${item.file_url}', '${item.title}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <a href="${item.file_url}" download="${item.title || 'document'}" class="down-link">
                    <i class="fas fa-download"></i> Download
                </a>
            </div>
        `;
        grid.appendChild(card);
    });

    updatePaginationInfo(data.length);
}

// 9. UPDATE PAGINATION INFO
function updatePaginationInfo(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const pageInfo = document.getElementById('pageInfo');
    if (pageInfo) {
        pageInfo.innerHTML = `Page ${currentPage} of ${totalPages} <span style="font-size: 0.8rem; color: #666; margin-left: 10px;">(${totalItems} total documents)</span>`;
    }

    // Update pagination button states
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
}

// 10. FORMATTING FUNCTIONS
function formatDate(date) {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatRole(role) {
    if (!role) return "Unknown";
    return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatSubject(subject) {
    if (!subject) return "General";
    return subject.charAt(0).toUpperCase() + subject.slice(1).replace(/_/g, ' ');
}

function formatDocType(docType) {
    if (!docType) return "Document";
    return docType.charAt(0).toUpperCase() + docType.slice(1).replace(/_/g, ' ');
}

// 11. GET FILE ICON CLASS
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
            case 'past_paper': return 'fa-file-archive';
            case 'memo': return 'fa-file-alt';
            case 'study_guide': return 'fa-compass';
            case 'presentation': return 'fa-presentation';
            default: return 'fa-file';
        }
    }

    // Fallback based on file extension
    if (fileUrl) {
        if (fileUrl.toLowerCase().endsWith('.pdf')) return 'fa-file-pdf pdf-icon';
        if (fileUrl.toLowerCase().endsWith('.doc') || fileUrl.toLowerCase().endsWith('.docx')) return 'fa-file-word word-icon';
        if (fileUrl.toLowerCase().endsWith('.xls') || fileUrl.toLowerCase().endsWith('.xlsx')) return 'fa-file-excel excel-icon';
        if (fileUrl.toLowerCase().endsWith('.ppt') || fileUrl.toLowerCase().endsWith('.pptx')) return 'fa-file-powerpoint ppt-icon';
        if (fileUrl.match(/\.(jpg|jpeg|png|gif|bmp)$/i)) return 'fa-file-image image-icon';
        if (fileUrl.match(/\.(zip|rar|7z)$/i)) return 'fa-file-archive';
        if (fileUrl.match(/\.(txt)$/i)) return 'fa-file-alt';
    }

    return 'fa-file general-icon';
}

// 12. VIEW DOCUMENT IN MODAL WITH PROPER EMBED
function openDocument(url, title) {
    const modal = document.getElementById("docModal");
    const viewer = document.getElementById("docViewer");
    const modalTitle = document.querySelector(".modal-header h3");
    const viewerContainer = document.querySelector(".doc-viewer-container");

    if (modal && viewer) {
        modalTitle.textContent = title || "Document Viewer";

        // Show loading state
        viewerContainer.classList.add('loading');

        // Handle different file types for proper embedding
        let viewerUrl = url;
        let embedType = 'iframe';

        // Check if URL is valid and not empty
        if (!url || url === '#' || url.includes('undefined')) {
            // Show error message in modal
            viewer.src = "about:blank";
            viewerContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e74c3c; margin-bottom: 20px;"></i>
                    <h3 style="color: var(--navy-bg); margin-bottom: 10px;">Document Not Available</h3>
                    <p>The document URL is not available or invalid.</p>
                    <p style="margin-top: 20px;">
                        <a href="${url}" class="down-link" style="display: inline-block; padding: 10px 20px;">
                            <i class="fas fa-download"></i> Try Download Instead
                        </a>
                    </p>
                </div>
            `;
            viewerContainer.classList.remove('loading');
        } else if (url.toLowerCase().endsWith('.pdf')) {
            // Use Google Docs PDF viewer for better compatibility
            viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
            embedType = 'iframe';
        } else if (url.match(/\.(jpg|jpeg|png|gif|bmp)$/i)) {
            // Display images directly
            viewerContainer.innerHTML = `<img src="${url}" alt="${title}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
            embedType = 'image';
        } else if (url.match(/\.(txt)$/i)) {
            // Display text files
            fetch(url)
                .then(response => response.text())
                .then(text => {
                    viewerContainer.innerHTML = `<pre style="padding: 20px; white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(text)}</pre>`;
                    viewerContainer.classList.remove('loading');
                })
                .catch(() => {
                    viewerContainer.innerHTML = `<p style="text-align: center; padding: 40px; color: #666;">Unable to load text file.</p>`;
                    viewerContainer.classList.remove('loading');
                });
            embedType = 'text';
            viewer.src = "about:blank";
        } else {
            // For other file types, try to embed or show download option
            embedType = 'download';
            viewerContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-file" style="font-size: 3rem; color: var(--pro-green); margin-bottom: 20px;"></i>
                    <h3 style="color: var(--navy-bg); margin-bottom: 10px;">Document Preview Not Available</h3>
                    <p>This file type cannot be previewed in the browser.</p>
                    <p style="margin-top: 20px;">
                        <a href="${url}" download="${title}" class="down-link" style="display: inline-block; padding: 12px 24px; font-size: 1rem;">
                            <i class="fas fa-download"></i> Download Document
                        </a>
                    </p>
                </div>
            `;
            viewerContainer.classList.remove('loading');
        }

        // Set iframe source if using iframe
        if (embedType === 'iframe') {
            viewer.src = viewerUrl;
            viewer.onload = () => {
                viewerContainer.classList.remove('loading');
            };
            viewer.onerror = () => {
                viewerContainer.classList.remove('loading');
                viewerContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e74c3c; margin-bottom: 20px;"></i>
                        <h3 style="color: var(--navy-bg); margin-bottom: 10px;">Failed to Load Document</h3>
                        <p>The document could not be loaded. Please try downloading it instead.</p>
                        <p style="margin-top: 20px;">
                            <a href="${url}" download="${title}" class="down-link" style="display: inline-block; padding: 10px 20px;">
                                <i class="fas fa-download"></i> Download Document
                            </a>
                        </p>
                    </div>
                `;
            };
        }

        // Show modal
        modal.style.display = "flex";
        document.body.style.overflow = 'hidden';
    }
}

// 13. HELPER FUNCTION TO ESCAPE HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 14. CLOSE MODAL FUNCTION
function closeModal() {
    const modal = document.getElementById("docModal");
    const viewer = document.getElementById("docViewer");
    const viewerContainer = document.querySelector(".doc-viewer-container");

    if (modal) {
        modal.style.display = "none";
        if (viewer) viewer.src = "about:blank";
        if (viewerContainer) {
            viewerContainer.classList.remove('loading');
            viewerContainer.innerHTML = '<iframe id="docViewer" src="" title="Document Viewer"></iframe>';
        }
        document.body.style.overflow = 'auto';
    }
}

// 15. UPLOAD DOCUMENT FUNCTION (Updated for all fields)
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

    const requiredFields = [
        { field: titleInput, message: "Please provide a document title." },
        { field: subjectInput, message: "Please select or enter a subject." },
        { field: gradeInput, message: "Please select a grade level." },
        { field: roleInput, message: "Please select your role." },
        { field: docTypeInput, message: "Please select a document type." }
    ];

    for (const { field, message } of requiredFields) {
        if (!field.value) {
            alert(message);
            return;
        }
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    btn.disabled = true;

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        const base64File = e.target.result.split(',')[1];

        // Generate unique file key
        const timestamp = Date.now();
        const fileKey = `doc_${timestamp}_${file.name.replace(/[^a-z0-9]/gi, '_')}`;

        // Create file URL
        const fileUrl = `https://peer-2-peer.co.za/uploads/${fileKey}`;

        const payload = {
            title: titleInput.value,
            subject: subjectInput.value.toLowerCase(),
            grade: gradeInput.value,
            uploader_role: roleInput.value,
            doc_type: docTypeInput.value,
            doc_date: docDateInput.value,
            description: descriptionInput.value,
            actual_file_key: fileKey,
            file_url: fileUrl,
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

// 16. UTILITIES
function updateFileName(input) {
    const display = document.getElementById('selectedFileName');
    if (display && input.files && input.files[0]) {
        const fileName = input.files[0].name;
        const fileSize = (input.files[0].size / 1024 / 1024).toFixed(2); // MB
        display.innerHTML = `Selected: <strong>${fileName}</strong> (${fileSize} MB)`;
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
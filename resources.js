// 1. CONFIGURATION & STATE
const API_URL = "https://lucky-mud-57bd.buhle-1ce.workers.dev";
let allResources = [];
let currentPage = 1;
const itemsPerPage = 25; // 25 documents per page

// 2. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    initScrollAnimation();

    // Set today's date as default for upload
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('docDate').value = today;

    // Initialize filters
    populateFilterOptions();

    // File Input Listener
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function () {
            updateFileName(this);
        });

        // Add drag and drop support
        const uploadArea = document.querySelector('.upload-area');
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = 'var(--pro-green)';
                uploadArea.style.backgroundColor = 'rgba(50, 205, 50, 0.05)';
            });

            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = 'var(--border-color)';
                uploadArea.style.backgroundColor = 'rgba(244, 247, 249, 0.5)';
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = 'var(--border-color)';
                uploadArea.style.backgroundColor = 'rgba(244, 247, 249, 0.5)';

                if (e.dataTransfer.files.length) {
                    fileInput.files = e.dataTransfer.files;
                    updateFileName(fileInput);
                }
            });
        }
    }

    // Modal Close Logic
    const modal = document.getElementById("docModal");
    const closeBtn = document.querySelector(".close-modal");
    if (closeBtn) {
        closeBtn.onclick = () => {
            closeModal();
        };
    }

    // Close modal on ESC key
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

    // Clear filters button
    document.getElementById('clearFilters')?.addEventListener('click', () => {
        document.getElementById('searchInput').value = '';
        document.getElementById('subjectFilter').value = '';
        document.getElementById('gradeFilter').value = '';
        document.getElementById('uploaderRoleFilter').value = '';
        document.getElementById('docTypeFilter').value = '';
        document.getElementById('dateFilter').value = '';
        currentPage = 1;
        renderCards(allResources);
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
    const subjectDataList = document.getElementById('subjectsList');

    subjects.forEach(subject => {
        const formattedSubject = subject.charAt(0).toUpperCase() + subject.slice(1).replace(/_/g, ' ');

        // Add to filter dropdown
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = formattedSubject;
        subjectFilter.appendChild(option);

        // Add to datalist for type-to-search
        const dataOption = document.createElement('option');
        dataOption.value = formattedSubject;
        subjectDataList.appendChild(dataOption);
    });
}

// 4. FETCH DATA FROM WORKER
async function loadLibrary() {
    const grid = document.getElementById('fileGrid');
    grid.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-spin"></i> Loading Library Resources...</div>';

    try {
        const response = await fetch(`${API_URL}/api/resources`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        allResources = Array.isArray(data) ? data : (data.results || []);

        console.log(`Loaded ${allResources.length} resources from database`);

        // Validate and fix file URLs
        allResources.forEach(resource => {
            if (!resource.file_url || resource.file_url === '#' || resource.file_url.includes('undefined')) {
                resource.file_url = generateFileUrl(resource);
            }

            // Ensure actual_file_key exists for download functionality
            if (!resource.actual_file_key && resource.file_url) {
                // Extract key from URL if possible
                const match = resource.file_url.match(/\/([^\/]+)$/);
                if (match) {
                    resource.actual_file_key = match[1];
                } else {
                    resource.actual_file_key = `doc_${resource.id || Date.now()}`;
                }
            }
        });

        renderCards(allResources);
    } catch (error) {
        console.error("Fetch error:", error);
        grid.innerHTML = `
            <div class="no-results" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e74c3c; margin-bottom: 20px;"></i>
                <h3 style="color: var(--navy-bg); margin-bottom: 10px;">Connection Error</h3>
                <p style="color: #666; margin-bottom: 20px;">Failed to connect to library. Please check your connection and try again.</p>
                <button onclick="loadLibrary()" style="background: var(--pro-green); color: var(--navy-bg); border: none; padding: 10px 20px; border-radius: 25px; font-weight: 600; cursor: pointer;">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

// 5. GENERATE FILE URL FOR MISSING FILES
function generateFileUrl(resource) {
    // If we have a file key, use the API endpoint
    if (resource.actual_file_key) {
        return `${API_URL}/api/file/${resource.actual_file_key}`;
    }

    // Fallback: Use Google Docs viewer for PDFs if we have a title
    if (resource.title) {
        const fileName = encodeURIComponent(resource.title.replace(/[^a-z0-9]/gi, '_') + '.pdf');
        return `https://docs.google.com/viewer?url=${encodeURIComponent(`https://peer-2-peer.co.za/uploads/${fileName}`)}&embedded=true`;
    }

    // Final fallback
    return `${API_URL}/api/file/placeholder`;
}

// 6. ADVANCED FILTERING LOGIC
function getFilteredData() {
    const searchText = document.getElementById('searchInput')?.value.toLowerCase() || "";
    const subjectTerm = document.getElementById('subjectFilter')?.value.toLowerCase() || "";
    const gradeTerm = document.getElementById('gradeFilter')?.value || "";
    const roleTerm = document.getElementById('uploaderRoleFilter')?.value || "";
    const docTypeTerm = document.getElementById('docTypeFilter')?.value || "";
    const dateTerm = document.getElementById('dateFilter')?.value || "";

    // Split search into words for Google-like search
    const searchWords = searchText.split(' ').filter(word => word.length > 2); // Only words longer than 2 chars

    return allResources.filter(item => {
        // Google-like search in title and description
        let matchesSearch = true;
        if (searchWords.length > 0) {
            const title = (item.title || "").toLowerCase();
            const description = (item.description || "").toLowerCase();
            const subject = (item.subject || "").toLowerCase();

            // Match any of the search words in title, description, or subject
            matchesSearch = searchWords.some(word =>
                title.includes(word) ||
                description.includes(word) ||
                subject.includes(word)
            );
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
        grid.innerHTML = `
            <div class="no-results" style="grid-column: 1 / -1;">
                <i class="fas fa-search" style="font-size: 3rem; color: #ccc; margin-bottom: 15px; display: block;"></i>
                <h3 style="color: var(--navy-bg); margin-bottom: 10px;">No documents found</h3>
                <p style="color: #666; margin-bottom: 5px;">No documents match your search criteria.</p>
                <p style="color: #999; font-size: 0.9rem;">Try different keywords or clear some filters.</p>
            </div>
        `;
        updatePaginationInfo(data.length);
        return;
    }

    paginatedItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'file-card';

        // Highlight search terms in title
        let titleHTML = item.title || "Untitled Document";
        let displayTitle = titleHTML;
        if (searchText && searchText.length > 2) {
            const regex = new RegExp(`(${searchText.split(' ').filter(w => w.length > 2).join('|')})`, 'gi');
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
                    <div class="info-item" style="flex: 1 0 100%; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #e1e5eb; font-size: 0.85rem; color: #666;">
                        <i class="fas fa-align-left" style="align-self: flex-start; margin-top: 2px;"></i>
                        <div style="flex: 1;">
                            <strong style="display: block; margin-bottom: 4px;">Description:</strong>
                            <div style="max-height: 60px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
                                ${escapeHtml(item.description)}
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
            <div class="card-footer">
                <button class="view-link" onclick="openDocument('${item.file_url}', '${escapeHtml(item.title)}', '${item.actual_file_key}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="down-link" onclick="downloadDocument('${item.file_url}', '${escapeHtml(item.title)}', '${item.actual_file_key}')">
                    <i class="fas fa-download"></i> Download
                </button>
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
        const startItem = ((currentPage - 1) * itemsPerPage) + 1;
        const endItem = Math.min(currentPage * itemsPerPage, totalItems);
        pageInfo.innerHTML = `Page ${currentPage} of ${totalPages} <span style="font-size: 0.85rem; color: #666; margin-left: 10px;">(Showing ${startItem}-${endItem} of ${totalItems} documents)</span>`;
    }

    // Update pagination button states
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
}

// 10. FORMATTING FUNCTIONS
function formatDate(date) {
    try {
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return "Recent";
    }
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
    const words = docType.split('_').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    );
    return words.join(' ');
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
        const urlLower = fileUrl.toLowerCase();
        if (urlLower.endsWith('.pdf') || urlLower.includes('.pdf')) return 'fa-file-pdf pdf-icon';
        if (urlLower.endsWith('.doc') || urlLower.endsWith('.docx') || urlLower.includes('.doc')) return 'fa-file-word word-icon';
        if (urlLower.endsWith('.xls') || urlLower.endsWith('.xlsx') || urlLower.includes('.xls')) return 'fa-file-excel excel-icon';
        if (urlLower.endsWith('.ppt') || urlLower.endsWith('.pptx') || urlLower.includes('.ppt')) return 'fa-file-powerpoint ppt-icon';
        if (urlLower.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/)) return 'fa-file-image image-icon';
        if (urlLower.match(/\.(zip|rar|7z|tar|gz)$/)) return 'fa-file-archive';
        if (urlLower.match(/\.(txt|rtf|md)$/)) return 'fa-file-alt';
    }

    return 'fa-file general-icon';
}

// 12. DOWNLOAD DOCUMENT FUNCTION
async function downloadDocument(url, title, fileKey) {
    const downloadBtn = event?.target || document.activeElement;
    const originalHTML = downloadBtn.innerHTML;
    const originalText = downloadBtn.textContent;

    try {
        downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing...';
        downloadBtn.disabled = true;

        // Use file key for direct download if available
        let downloadUrl = url;
        if (fileKey && !url.includes('/api/file/')) {
            downloadUrl = `${API_URL}/api/file/${fileKey}`;
        } else if (!url.includes('/api/file/') && !url.startsWith('http')) {
            // If URL is relative, make it absolute
            downloadUrl = `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
        }

        console.log('Downloading from:', downloadUrl);

        // Fetch the file with credentials
        const response = await fetch(downloadUrl, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Accept': '*/*'
            }
        });

        if (!response.ok) {
            throw new Error(`Download failed: ${response.status} ${response.statusText}`);
        }

        // Get the blob
        const blob = await response.blob();

        // Get filename from response headers or use title
        let filename = title || 'document';
        const contentDisposition = response.headers.get('content-disposition');
        if (contentDisposition) {
            const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (match && match[1]) {
                filename = match[1].replace(/['"]/g, '');
            }
        }

        // Add file extension if missing
        if (!filename.match(/\.[a-z0-9]+$/i)) {
            const contentType = response.headers.get('content-type') || blob.type;
            const extension = getExtensionFromMimeType(contentType);
            if (extension) {
                filename += extension;
            }
        }

        // Clean filename
        filename = filename.replace(/[^a-z0-9.\-_]/gi, '_');

        // Create download link
        const urlObject = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlObject;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(urlObject);
            downloadBtn.innerHTML = originalHTML;
            downloadBtn.disabled = false;
            downloadBtn.textContent = originalText;

            // Show success message
            showNotification(`Download started: ${filename}`, 'success');
        }, 100);

    } catch (error) {
        console.error("Download error:", error);

        // Fallback: Try direct link if fetch failed
        try {
            const downloadUrl = fileKey ? `${API_URL}/api/file/${fileKey}` : url;
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = (title || 'document').replace(/[^a-z0-9]/gi, '_') + getFileExtension(url);
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            showNotification('Download started in new tab', 'info');
        } catch (fallbackError) {
            console.error("Fallback download error:", fallbackError);
            showNotification('Failed to download document. Please try again.', 'error');
        }

        downloadBtn.innerHTML = originalHTML;
        downloadBtn.disabled = false;
        downloadBtn.textContent = originalText;
    }
}

// 13. VIEW DOCUMENT IN MODAL
function openDocument(url, title, fileKey) {
    const modal = document.getElementById("docModal");
    const viewer = document.getElementById("docViewer");
    const modalTitle = document.querySelector(".modal-header h3");
    const viewerContainer = document.querySelector(".doc-viewer-container");

    if (!modal || !viewer) return;

    modalTitle.textContent = title || "Document Viewer";

    // Show loading state
    viewerContainer.classList.add('loading');

    // Use file key for view endpoint if available
    let viewerUrl = url;
    if (fileKey && !url.includes('/api/view/')) {
        viewerUrl = `${API_URL}/api/view/${fileKey}`;
    } else if (!url.includes('/api/view/') && !url.startsWith('http')) {
        // If URL is relative, make it absolute
        viewerUrl = `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    console.log('Viewing document:', viewerUrl);

    // Check if URL is valid
    if (!viewerUrl || viewerUrl === '#' || viewerUrl.includes('undefined')) {
        viewerContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e74c3c; margin-bottom: 20px;"></i>
                <h3 style="color: var(--navy-bg); margin-bottom: 10px;">Document Not Available</h3>
                <p>The document URL is not available or invalid.</p>
                <p style="margin-top: 20px;">
                    <button onclick="downloadDocument('${url}', '${title}', '${fileKey}')" 
                            style="background: var(--pro-green); color: var(--navy-bg); border: none; padding: 12px 24px; border-radius: 25px; font-weight: 600; cursor: pointer;">
                        <i class="fas fa-download"></i> Try Download Instead
                    </button>
                </p>
            </div>
        `;
        viewerContainer.classList.remove('loading');
    } else {
        // Clear previous iframe
        viewer.src = "about:blank";

        // Set up iframe for viewing
        setTimeout(() => {
            viewer.src = viewerUrl;
            viewerContainer.classList.remove('loading');
        }, 100);

        // Handle iframe errors
        viewer.onerror = () => {
            viewerContainer.classList.remove('loading');

            // Check file type and provide appropriate fallback
            if (viewerUrl.toLowerCase().includes('.pdf') || viewerUrl.includes('application/pdf')) {
                // Try Google Docs viewer as fallback for PDFs
                const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(viewerUrl)}&embedded=true`;
                viewer.src = googleViewerUrl;
            } else if (viewerUrl.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i)) {
                // Display images directly
                viewerContainer.innerHTML = `
                    <div style="text-align: center; padding: 20px; height: 100%; display: flex; align-items: center; justify-content: center;">
                        <img src="${viewerUrl}" alt="${title}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 5px;">
                    </div>
                `;
            } else {
                // Show download option for unsupported types
                viewerContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-file" style="font-size: 3rem; color: var(--pro-green); margin-bottom: 20px;"></i>
                        <h3 style="color: var(--navy-bg); margin-bottom: 10px;">Preview Not Available</h3>
                        <p>This file type cannot be previewed in the browser.</p>
                        <p style="margin-top: 20px;">
                            <button onclick="downloadDocument('${url}', '${title}', '${fileKey}')" 
                                    style="background: var(--pro-green); color: var(--navy-bg); border: none; padding: 12px 24px; border-radius: 25px; font-weight: 600; cursor: pointer;">
                                <i class="fas fa-download"></i> Download Document
                            </button>
                        </p>
                    </div>
                `;
            }
        };

        // Handle successful load
        viewer.onload = () => {
            viewerContainer.classList.remove('loading');
        };
    }

    // Show modal
    modal.style.display = "flex";
    document.body.style.overflow = 'hidden';
}

// 14. CLOSE MODAL FUNCTION
function closeModal() {
    const modal = document.getElementById("docModal");
    const viewer = document.getElementById("docViewer");
    const viewerContainer = document.querySelector(".doc-viewer-container");

    if (modal) {
        modal.style.display = "none";
        if (viewer) {
            viewer.src = "about:blank";
        }
        if (viewerContainer) {
            viewerContainer.classList.remove('loading');
            // Reset to iframe if it was replaced
            if (!viewerContainer.contains(viewer)) {
                viewerContainer.innerHTML = '<iframe id="docViewer" src="" title="Document Viewer"></iframe>';
            }
        }
        document.body.style.overflow = 'auto';
    }
}

// 15. UPLOAD DOCUMENT FUNCTION
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
        showNotification("Please select a file to upload.", "error");
        return;
    }

    const file = fileInput.files[0];
    const maxSize = 50 * 1024 * 1024; // 50MB limit

    if (file.size > maxSize) {
        showNotification("File size exceeds 50MB limit. Please upload a smaller file.", "error");
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
        if (!field.value.trim()) {
            showNotification(message, "error");
            return;
        }
    }

    const originalBtnText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    btn.disabled = true;

    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            const base64File = e.target.result.split(',')[1];

            const payload = {
                title: titleInput.value.trim(),
                subject: subjectInput.value.toLowerCase().trim(),
                grade: gradeInput.value,
                uploader_role: roleInput.value,
                doc_type: docTypeInput.value,
                doc_date: docDateInput.value || new Date().toISOString().split('T')[0],
                description: descriptionInput.value.trim(),
                file_name: file.name,
                file_type: file.type,
                file_size: file.size,
                file_data: base64File
            };

            console.log('Uploading document:', payload.title);

            const response = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok) {
                showNotification(`✅ Success! "${titleInput.value}" has been added to the library.`, 'success');

                // Clear form
                document.getElementById('uploadForm').reset();
                document.getElementById('selectedFileName').innerText = '';
                document.getElementById('docDate').value = new Date().toISOString().split('T')[0];

                // Reload library after a short delay
                setTimeout(() => {
                    loadLibrary();
                }, 1500);

            } else {
                throw new Error(result.error || "Upload failed");
            }
        } catch (error) {
            console.error("Upload error:", error);
            showNotification(`Upload failed: ${error.message}`, 'error');
        } finally {
            btn.innerHTML = originalBtnText;
            btn.disabled = false;
        }
    };

    reader.onerror = () => {
        showNotification("Error reading file. Please try again.", "error");
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
    };

    reader.readAsDataURL(file);
}

// 16. HELPER FUNCTIONS
function updateFileName(input) {
    const display = document.getElementById('selectedFileName');
    if (display && input.files && input.files[0]) {
        const file = input.files[0];
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        display.innerHTML = `<strong>${file.name}</strong> (${fileSize} MB)`;
        display.style.color = "var(--pro-green)";

        // Auto-fill title from filename if empty
        const titleInput = document.getElementById('fileName');
        if (!titleInput.value.trim()) {
            const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
            titleInput.value = nameWithoutExt.replace(/[_-]/g, ' ');
        }
    }
}

function initScrollAnimation() {
    const scrollText = document.getElementById('scrollText');
    if (scrollText) {
        // Duplicate content for seamless scrolling
        const content = scrollText.innerHTML;
        scrollText.innerHTML = content + content;
    }
}

function filterDocuments() {
    currentPage = 1;
    renderCards(getFilteredData());
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getFileExtension(url) {
    if (!url) return '';
    const match = url.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
    return match ? '.' + match[1].toLowerCase() : '';
}

function getExtensionFromMimeType(mimeType) {
    const mimeMap = {
        'application/pdf': '.pdf',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'application/vnd.ms-excel': '.xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
        'application/vnd.ms-powerpoint': '.ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'text/plain': '.txt',
        'application/zip': '.zip',
        'application/x-rar-compressed': '.rar'
    };
    return mimeMap[mimeType?.toLowerCase()] || '';
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: inherit; cursor: pointer;">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
        border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
        padding: 15px 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        max-width: 400px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;

    // Add keyframes for animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// 17. Export functions for global access
window.downloadDocument = downloadDocument;
window.openDocument = openDocument;
window.closeModal = closeModal;
window.uploadDocument = uploadDocument;
window.updateFileName = updateFileName;
window.loadLibrary = loadLibrary;
window.filterDocuments = filterDocuments;
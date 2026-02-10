// ─────────────────────────────────────────────────────────────────
// Peer-2-Peer PRO  |  Resources Library
// ─────────────────────────────────────────────────────────────────

// 1. CONFIGURATION & STATE
const API_URL = "https://lucky-mud-57bd.buhle-1ce.workers.dev";
let allResources = [];
let currentPage = 1;
const itemsPerPage = 6;

// 2. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    initScrollAnimation();

    // Default date = today
    document.getElementById('docDate').valueAsDate = new Date();

    populateFilterOptions();

    // Modal close logic
    const modal = document.getElementById("docModal");
    const closeBtn = document.querySelector(".close-modal");

    const closeModal = () => {
        modal.style.display = "none";
        const viewer = document.getElementById("docViewer");
        // Clear iframe src so it stops loading / streaming
        viewer.src = "about:blank";
        document.body.style.overflow = "auto";
    };

    if (closeBtn) closeBtn.onclick = closeModal;

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeModal();
    });

    // Close modal when clicking the dark overlay
    modal?.addEventListener('click', e => {
        if (e.target === modal) closeModal();
    });

    // Search & filter listeners
    document.getElementById('searchInput')?.addEventListener('input', debounce(filterDocuments, 300));
    ['subjectFilter', 'gradeFilter', 'uploaderRoleFilter', 'docTypeFilter', 'dateFilter']
        .forEach(id => document.getElementById(id)?.addEventListener('change', filterDocuments));

    // Pagination
    document.getElementById('prevPage')?.addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; renderCards(getFilteredData()); scrollToGrid(); }
    });
    document.getElementById('nextPage')?.addEventListener('click', () => {
        const filtered = getFilteredData();
        const maxPage = Math.ceil(filtered.length / itemsPerPage);
        if (currentPage < maxPage) { currentPage++; renderCards(filtered); scrollToGrid(); }
    });
});

function scrollToGrid() {
    document.getElementById('fileGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 3. POPULATE SUBJECT FILTER
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

    const el = document.getElementById('subjectFilter');
    subjects.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
        el.appendChild(opt);
    });
}

// 4. LOAD LIBRARY FROM WORKER
async function loadLibrary() {
    const grid = document.getElementById('fileGrid');
    grid.innerHTML = `<div class="loader"><i class="fas fa-spinner fa-spin"></i> Loading library...</div>`;

    try {
        const res = await fetch(`${API_URL}/api/resources`);
        const data = await res.json();

        allResources = Array.isArray(data) ? data : (data.results || []);

        // Ensure every resource has correct view & download URLs from our worker
        allResources.forEach(r => {
            r.file_url = `${API_URL}/api/file/${r.actual_file_key}`;
            r.download_url = `${API_URL}/api/download/${r.actual_file_key}`;
        });

        renderCards(allResources);
    } catch (err) {
        console.error("loadLibrary error:", err);
        grid.innerHTML = `
            <div class="load-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Could not reach the library. Check your connection and try again.</p>
                <button onclick="loadLibrary()">Retry</button>
            </div>`;
    }
}

// 5. FILTERING
function getFilteredData() {
    const search = (document.getElementById('searchInput')?.value || "").toLowerCase();
    const subject = (document.getElementById('subjectFilter')?.value || "").toLowerCase();
    const grade = document.getElementById('gradeFilter')?.value || "";
    const role = document.getElementById('uploaderRoleFilter')?.value || "";
    const docType = document.getElementById('docTypeFilter')?.value || "";
    const date = document.getElementById('dateFilter')?.value || "";
    const words = search.split(' ').filter(w => w.length > 0);

    return allResources.filter(item => {
        const title = (item.title || "").toLowerCase();
        if (words.length && !words.every(w => title.includes(w))) return false;
        if (subject && (item.subject || "").toLowerCase() !== subject) return false;
        if (grade && String(item.grade_level || "") !== grade) return false;
        if (role && (item.uploader_role || "").toLowerCase() !== role) return false;
        if (docType && (item.doc_type || "").toLowerCase() !== docType) return false;
        if (date && item.upload_date) {
            const itemDate = new Date(item.upload_date).toISOString().split('T')[0];
            if (itemDate !== date) return false;
        }
        return true;
    });
}

function filterDocuments() { currentPage = 1; renderCards(getFilteredData()); }

// 6. RENDER CARDS
function renderCards(data) {
    const grid = document.getElementById('fileGrid');
    if (!grid) return;
    grid.innerHTML = "";

    const start = (currentPage - 1) * itemsPerPage;
    const pageData = data.slice(start, start + itemsPerPage);
    const search = (document.getElementById('searchInput')?.value || "").toLowerCase();

    if (pageData.length === 0) {
        grid.innerHTML = `<p class="no-results"><i class="fas fa-search"></i> No documents found.</p>`;
        updatePagination(data.length);
        return;
    }

    pageData.forEach(item => {
        const card = document.createElement('div');
        card.className = 'file-card';
        const iconClass = getFileIconClass(item.doc_type, item.file_url);
        const uploadDate = item.upload_date ? new Date(item.upload_date).toLocaleDateString('en-ZA') : 'Unknown';

        // Highlight search terms in title
        let titleHTML = escapeHtml(item.title || "Untitled Document");
        if (search) {
            const rx = new RegExp(`(${search.split(' ').filter(w => w).map(escapeRegex).join('|')})`, 'gi');
            titleHTML = titleHTML.replace(rx, '<span class="highlight">$1</span>');
        }

        // Safe attributes for inline onclick
        const safeUrl = item.file_url.replace(/'/g, "\\'");
        const safeDlUrl = item.download_url.replace(/'/g, "\\'");
        const safeTitle = (item.title || "document").replace(/'/g, "\\'");
        const safeFile = (item.file_name || item.title || "document").replace(/'/g, "\\'");

        card.innerHTML = `
            <div class="card-icon-header">
                <div class="category-tag">${(item.doc_type || 'Document').replace(/_/g, ' ')}</div>
                <i class="fas ${iconClass} file-type-icon"></i>
            </div>
            <div class="card-body">
                <h3>${titleHTML}</h3>
                <div class="document-info">
                    <div class="info-item">
                        <i class="fas fa-user-tag"></i>
                        <span><strong>Role:</strong> ${item.uploader_role || 'Unknown'}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-graduation-cap"></i>
                        <span><strong>Grade:</strong> ${item.grade_level || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-book"></i>
                        <span><strong>Subject:</strong> ${item.subject || 'General'}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-calendar-alt"></i>
                        <span><strong>Uploaded:</strong> ${uploadDate}</span>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <button class="view-link" onclick="openDocument('${safeUrl}', '${safeTitle}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="down-link" onclick="downloadFile('${safeDlUrl}', '${safeFile}')">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>`;

        grid.appendChild(card);
    });

    updatePagination(data.length);
}

function updatePagination(totalItems) {
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const pageInfo = document.getElementById('pageInfo');
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
}

// 7. VIEW DOCUMENT IN MODAL (inline via worker proxy)
function openDocument(fileUrl, title) {
    const modal = document.getElementById("docModal");
    const viewer = document.getElementById("docViewer");
    const header = document.querySelector(".modal-header h3");

    if (!modal || !viewer) return;

    header.textContent = title || "Document Viewer";

    // Determine file type from the URL key segment or extension
    const key = fileUrl.split('/api/file/')[1] || "";
    const ext = key.split('.').pop().toLowerCase();

    if (['pdf', 'txt', 'html', 'htm'].includes(ext)) {
        // Worker returns inline Content-Disposition for /api/file/ — iframe can show it directly
        viewer.src = fileUrl;
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
        // Image — iframe works fine
        viewer.src = fileUrl;
    } else {
        // Word / Excel / PPT etc. — use Office Online viewer (works with any publicly reachable URL)
        // Our worker URL is public, so Office Online can fetch it.
        viewer.src = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
    }

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
}

// 8. DOWNLOAD FILE (forces browser download via worker /api/download/ endpoint)
async function downloadFile(downloadUrl, fileName) {
    try {
        showToast(`Downloading "${fileName}"…`);
        const res = await fetch(downloadUrl);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);

        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(blobUrl);
    } catch (err) {
        console.error("Download error:", err);
        showToast("Download failed. Please try again.", "error");
    }
}

// 9. UPLOAD DOCUMENT → R2 via worker
async function uploadDocument() {
    const fileInput = document.getElementById('fileInput');
    const titleInput = document.getElementById('fileName');
    const subjectInput = document.getElementById('fileSubject');
    const gradeInput = document.getElementById('fileGrade');
    const roleInput = document.getElementById('uploaderRole');
    const docTypeInput = document.getElementById('docType');
    const docDateInput = document.getElementById('docDate');
    const descInput = document.getElementById('docDescription');
    const btn = document.getElementById('uploadBtn');

    // Validate
    const file = fileInput.files[0];
    if (!file) return showToast("Please select a file.", "error");
    if (!titleInput.value.trim()) return showToast("Please provide a document title.", "error");
    if (!subjectInput.value) return showToast("Please select or type a subject.", "error");
    if (!gradeInput.value) return showToast("Please select a grade level.", "error");
    if (!roleInput.value) return showToast("Please select your role.", "error");
    if (!docTypeInput.value) return showToast("Please select a document type.", "error");

    const MAX_MB = 20;
    if (file.size > MAX_MB * 1024 * 1024) {
        return showToast(`File too large. Maximum size is ${MAX_MB} MB.`, "error");
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading…';
    btn.disabled = true;

    try {
        // Read file as base64
        const base64Data = await readFileAsBase64(file);

        // Build a unique R2 key that preserves the original extension
        const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
        const fileKey = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 8)}.${ext}`;

        const payload = {
            title: titleInput.value.trim(),
            subject: subjectInput.value.toLowerCase().trim(),
            grade: gradeInput.value,
            uploader_role: roleInput.value,
            doc_type: docTypeInput.value,
            doc_date: docDateInput.value,
            description: descInput.value || "",
            actual_file_key: fileKey,
            file_data: base64Data,     // base64-encoded binary
            file_name: file.name,
            file_type: file.type || "application/octet-stream",
            file_size: file.size,
        };

        const res = await fetch(`${API_URL}/api/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const result = await res.json();

        if (res.ok && result.success) {
            showToast(`✅ "${titleInput.value}" uploaded successfully!`, "success");
            document.getElementById('uploadForm').reset();
            document.getElementById('selectedFileName').textContent = '';
            document.getElementById('docDate').valueAsDate = new Date();
            // Reload library so new doc appears
            await loadLibrary();
        } else {
            const msg = result.error || "Upload failed.";
            console.error("Upload failed:", result);
            showToast(`Upload failed: ${msg}`, "error");
        }
    } catch (err) {
        console.error("Upload error:", err);
        showToast("Upload error. Check your connection and try again.", "error");
    } finally {
        btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Document';
        btn.disabled = false;
    }
}

// 10. UTILITIES

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function updateFileName(input) {
    const display = document.getElementById('selectedFileName');
    if (display && input.files && input.files[0]) {
        const f = input.files[0];
        const sizeMB = (f.size / 1048576).toFixed(1);
        display.textContent = `${f.name}  (${sizeMB} MB)`;
        display.style.color = "var(--pro-green, #32cd32)";
    }
}

function getFileIconClass(docType, fileUrl) {
    if (docType) {
        const map = {
            notes: 'fa-sticky-note',
            tests: 'fa-clipboard-check',
            worksheet: 'fa-table',
            practice_material: 'fa-dumbbell',
            task: 'fa-tasks',
            assignment: 'fa-file-signature',
            project: 'fa-project-diagram',
            literature: 'fa-book-open',
            textbook: 'fa-book',
            past_paper: 'fa-file-alt',
            memo: 'fa-file-contract',
            study_guide: 'fa-compass',
            presentation: 'fa-file-powerpoint',
        };
        if (map[docType.toLowerCase()]) return map[docType.toLowerCase()];
    }
    if (fileUrl) {
        const u = fileUrl.toLowerCase();
        if (u.endsWith('.pdf')) return 'fa-file-pdf';
        if (u.match(/\.(doc|docx)$/)) return 'fa-file-word';
        if (u.match(/\.(xls|xlsx)$/)) return 'fa-file-excel';
        if (u.match(/\.(ppt|pptx)$/)) return 'fa-file-powerpoint';
        if (u.match(/\.(jpg|jpeg|png|gif)$/)) return 'fa-file-image';
    }
    return 'fa-file';
}

function debounce(fn, wait) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), wait);
    };
}

function initScrollAnimation() {
    const el = document.getElementById('scrollText');
    if (el) el.style.display = 'block';
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Simple toast notification (replaces all alert() calls)
function showToast(message, type = "info") {
    const existing = document.querySelector('.p2p-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `p2p-toast p2p-toast--${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>`;

    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: '9999',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '14px 20px',
        borderRadius: '10px',
        fontFamily: 'Inter, sans-serif',
        fontSize: '0.92rem',
        fontWeight: '500',
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        background: type === 'success' ? '#f0fdf4' : type === 'error' ? '#fef2f2' : '#f0f9ff',
        color: type === 'success' ? '#166534' : type === 'error' ? '#991b1b' : '#0c4a6e',
        border: `1px solid ${type === 'success' ? '#bbf7d0' : type === 'error' ? '#fecaca' : '#bae6fd'}`,
        transition: 'opacity 0.3s ease',
    });

    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 4500);
}
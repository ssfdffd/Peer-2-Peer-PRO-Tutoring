// ANIMATION AND UPLOAD FORM FIXES
document.addEventListener('DOMContentLoaded', function() {
    // Initialize animation
    initAnimation();
    
    // Fix upload form interactions
    fixUploadForm();
    
    // Enhance document icons
    enhanceDocumentIcons();
});

function initAnimation() {
    const animationWrapper = document.querySelector('.animation-wrapper');
    const scrollingText = document.querySelector('.scrolling-text');
    
    if (!animationWrapper || !scrollingText) return;
    
    // Duplicate content for seamless scrolling
    const originalContent = scrollingText.innerHTML;
    const duplicateContent = originalContent + originalContent + originalContent;
    scrollingText.innerHTML = duplicateContent;
    
    // Calculate animation duration based on content width
    const textWidth = scrollingText.scrollWidth / 3; // Get width of original content
    const viewportWidth = window.innerWidth;
    const totalDistance = textWidth * 3 + viewportWidth;
    const duration = totalDistance / 50; // pixels per second
    
    // Apply animation
    scrollingText.style.animationDuration = `${duration}s`;
    scrollingText.style.animationName = 'scrollText';
    scrollingText.style.animationTimingFunction = 'linear';
    scrollingText.style.animationIterationCount = 'infinite';
    
    // Pause animation on hover
    animationWrapper.addEventListener('mouseenter', function() {
        scrollingText.style.animationPlayState = 'paused';
    });
    
    animationWrapper.addEventListener('mouseleave', function() {
        scrollingText.style.animationPlayState = 'running';
    });
    
    // WhatsApp link tracking
    const whatsappLinks = document.querySelectorAll('.whatsapp-link');
    whatsappLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            console.log('WhatsApp animation clicked - Redirecting to online classes inquiry');
            // Link will open in new tab as specified
        });
    });
}

function fixUploadForm() {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    
    if (browseBtn && fileInput) {
        browseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            fileInput.click();
        });
    }
    
    if (dropArea) {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        // Highlight drop area
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, unhighlight, false);
        });
        
        function highlight() {
            dropArea.classList.add('drag-over');
        }
        
        function unhighlight() {
            dropArea.classList.remove('drag-over');
        }
        
        // Handle dropped files
        dropArea.addEventListener('drop', handleDrop, false);
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                fileInput.files = files;
                updateFileName(fileInput);
            }
            unhighlight();
        }
    }
}

// Function to update file name display
window.updateFileName = function(input) {
    const fileNameDisplay = document.getElementById('selectedFileName');
    if (input.files && input.files[0]) {
        fileNameDisplay.textContent = `Selected: ${input.files[0].name}`;
        fileNameDisplay.style.color = '#2ecc71';
    } else {
        fileNameDisplay.textContent = '';
    }
};

function enhanceDocumentIcons() {
    const fileCards = document.querySelectorAll('.file-card');
    
    fileCards.forEach(card => {
        const fileType = card.getAttribute('data-filetype') || 'file';
        const iconBox = card.querySelector('.file-icon-box i');
        
        if (iconBox) {
            // Remove existing classes
            iconBox.className = '';
            
            // Add appropriate icon
            switch(fileType.toLowerCase()) {
                case 'pdf':
                    iconBox.className = 'fas fa-file-pdf';
                    break;
                case 'doc':
                case 'docx':
                    iconBox.className = 'fas fa-file-word';
                    break;
                case 'xls':
                case 'xlsx':
                    iconBox.className = 'fas fa-file-excel';
                    break;
                case 'ppt':
                case 'pptx':
                    iconBox.className = 'fas fa-file-powerpoint';
                    break;
                case 'jpg':
                case 'jpeg':
                case 'png':
                case 'gif':
                case 'bmp':
                    iconBox.className = 'fas fa-file-image';
                    break;
                case 'zip':
                case 'rar':
                case '7z':
                    iconBox.className = 'fas fa-file-archive';
                    break;
                case 'mp3':
                case 'wav':
                case 'ogg':
                    iconBox.className = 'fas fa-file-audio';
                    break;
                case 'mp4':
                case 'avi':
                case 'mov':
                    iconBox.className = 'fas fa-file-video';
                    break;
                default:
                    iconBox.className = 'fas fa-file';
            }
        }
    });
}

// YOUR EXISTING CODE BELOW - KEEP ALL FUNCTIONALITY

const API_URL = "https://lucky-mud-57bd.buhle-1ce.workers.dev";

// 2. Visual Feedback: Show filename when file is picked
function updateFileName(input) {
    const fileNameDisplay = document.getElementById('selectedFileName');
    if (input.files && input.files[0]) {
        // This confirms the file is "attached" to the browser session
        fileNameDisplay.innerText = "Selected: " + input.files[0].name;
    }
}

// 3. LOAD LIBRARY (Fetch from D1 via Worker)
async function loadLibrary() {
    const fileGrid = document.getElementById('fileGrid');
    fileGrid.innerHTML = '<div class="loader">Accessing Library...</div>';

    try {
        const response = await fetch(`${API_URL}/get-resources`);
        const data = await response.json();

        if (data.success) {
            renderCards(data.resources);
            // Enhance icons after rendering
            enhanceDocumentIcons();
        } else {
            fileGrid.innerHTML = '<p>No documents found yet.</p>';
        }
    } catch (error) {
        console.error("Connection Error:", error);
        fileGrid.innerHTML = '<p class="error">Could not connect to database. Check API_URL.</p>';
    }
}

// 4. RENDER CARDS
function renderCards(resources) {
    const fileGrid = document.getElementById('fileGrid');
    fileGrid.innerHTML = '';

    resources.forEach(item => {
        const card = document.createElement('div');
        card.className = 'file-card';
        
        // Determine file type for icon
        const fileName = item.file_url.split('/').pop();
        const fileExtension = fileName.split('.').pop().toLowerCase();
        card.setAttribute('data-filetype', fileExtension);
        
        card.innerHTML = `
            <div class="file-type-badge">${fileExtension.toUpperCase()}</div>
            <div class="file-icon-box">
                <i class="fas fa-file"></i>
            </div>
            <div class="file-info">
                <h3>${item.display_title}</h3>
                <div class="badge-container">
                    <span class="badge grade-badge">Grade ${item.grade_level}</span>
                    <span class="badge subject-badge">${item.subject}</span>
                </div>
                <span class="upload-date">Uploaded: ${new Date(item.uploaded_at).toLocaleDateString()}</span>
            </div>
            <div class="card-actions">
                <button class="btn-view" onclick="viewDocument('${item.file_url}')">
                    <i class="fas fa-eye"></i>
                </button>
                <a href="${item.file_url}" download class="btn-download">
                    <i class="fas fa-download"></i>
                </a>
            </div>
        `;
        fileGrid.appendChild(card);
    });
}

// 5. VIEW DOCUMENT FUNCTION
function viewDocument(url) {
    // Open in new tab for now
    window.open(url, '_blank');
}

// 6. HANDLE UPLOAD (The "Workhorse" function)
async function handleUpload(event) {
    event.preventDefault(); // Stops the page from refreshing instantly
    
    const btn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');

    if (!fileInput.files[0]) {
        alert("Please select a file first!");
        return;
    }

    // Visual loading state
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    btn.disabled = true;
    btn.classList.add('loading');

    // Create the "Envelope" (FormData) to send to Cloudflare
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('title', document.getElementById('fileName').value);
    formData.append('description', document.getElementById('fileDescription').value);
    formData.append('category', document.getElementById('fileCategory').value);
    formData.append('grade', document.getElementById('fileGrade').value);
    formData.append('subject', document.getElementById('fileSubject').value);

    try {
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            alert("Success! Document uploaded to R2 and D1.");
            // Reset form
            document.getElementById('uploadForm').reset();
            document.getElementById('selectedFileName').textContent = '';
            
            // Reload library
            loadLibrary();
        } else {
            alert("Upload failed: " + result.error);
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Connection to Worker failed. Ensure CORS is enabled in the Worker code.");
    } finally {
        btn.innerHTML = '<i class="fas fa-upload"></i> Upload Document';
        btn.disabled = false;
        btn.classList.remove('loading');
    }
}

// 7. FILTER AND SEARCH FUNCTIONALITY
function setupFilters() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const gradeFilter = document.getElementById('gradeFilter');
    const sortFilter = document.getElementById('sortFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            filterDocuments();
        });
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterDocuments);
    }
    
    if (gradeFilter) {
        gradeFilter.addEventListener('change', filterDocuments);
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', filterDocuments);
    }
}

function filterDocuments() {
    // This function would filter the displayed documents
    // For now, it just reloads all documents
    loadLibrary();
}

// 8. INITIALIZE EVERYTHING
document.addEventListener('DOMContentLoaded', () => {
    // Load initial library
    loadLibrary();
    
    // Setup upload form
    const form = document.getElementById('uploadForm');
    if (form) {
        form.addEventListener('submit', handleUpload);
    }
    
    // Setup filters
    setupFilters();
    
    // Setup pagination buttons
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    
    if (prevPage) {
        prevPage.addEventListener('click', () => {
            // Pagination logic here
            console.log('Previous page');
        });
    }
    
    if (nextPage) {
        nextPage.addEventListener('click', () => {
            // Pagination logic here
            console.log('Next page');
        });
    }
    
    // Add window resize handler for animation
    window.addEventListener('resize', function() {
        // Recalculate animation on resize
        const scrollingText = document.querySelector('.scrolling-text');
        if (scrollingText && scrollingText.style.animationDuration) {
            initAnimation();
        }
    });
});

// 9. DRAG AND DROP ENHANCEMENTS
document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.getElementById('dropArea');
    
    if (dropArea) {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, unhighlight, false);
        });

        function highlight(e) {
            dropArea.classList.add('drag-over');
        }

        function unhighlight(e) {
            dropArea.classList.remove('drag-over');
        }

        // Handle dropped files
        dropArea.addEventListener('drop', handleDrop, false);

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                const fileInput = document.getElementById('fileInput');
                fileInput.files = files;
                updateFileName(fileInput);
            }
        }
    }
});

// 10. FILE TYPE DETECTION FOR ICONS
function getFileIconClass(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    
    switch(extension) {
        case 'pdf':
            return 'fas fa-file-pdf';
        case 'doc':
        case 'docx':
            return 'fas fa-file-word';
        case 'xls':
        case 'xlsx':
            return 'fas fa-file-excel';
        case 'ppt':
        case 'pptx':
            return 'fas fa-file-powerpoint';
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'bmp':
            return 'fas fa-file-image';
        case 'zip':
        case 'rar':
        case '7z':
            return 'fas fa-file-archive';
        case 'mp3':
        case 'wav':
        case 'ogg':
            return 'fas fa-file-audio';
        case 'mp4':
        case 'avi':
        case 'mov':
            return 'fas fa-file-video';
        default:
            return 'fas fa-file';
    }
}

// 11. PROGRESS BAR SIMULATION (for demo purposes)
function simulateUploadProgress() {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const uploadProgress = document.getElementById('uploadProgress');
    
    if (!progressFill || !progressText || !uploadProgress) return;
    
    uploadProgress.style.display = 'flex';
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress > 100) {
            progress = 100;
            clearInterval(interval);
            
            // Hide progress bar after completion
            setTimeout(() => {
                uploadProgress.style.display = 'none';
            }, 1000);
        }
        
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;
    }, 200);
}
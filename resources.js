
const API_URL = "https://lucky-mud-57bd.buhle-1ce.workers.dev"; 
// 2. Visual Feedback: Show filename when file is picked
function updateFileName(input) {
    const fileNameDisplay = document.getElementById('selectedFileName');
    if (input.files && input.files[0]) {
        // This confirms the file is "attached" to the browser session
        fileNameDisplay.innerText = "Selected: " + input.files[0].name;
    }
}
// Animation functionality
document.addEventListener('DOMContentLoaded', function() {
    // Create multiple copies of the scrolling text for seamless animation
    const scrollingText = document.querySelector('.scrolling-text');
    const animationWrapper = document.querySelector('.animation-wrapper');
    
    if (scrollingText && animationWrapper) {
        // Clone the scrolling text multiple times for continuous effect
        const content = scrollingText.innerHTML;
        for (let i = 0; i < 3; i++) {
            const clone = document.createElement('div');
            clone.className = 'scrolling-text';
            clone.innerHTML = content;
            animationWrapper.appendChild(clone);
        }
        
        // Adjust animation speed based on content length
        const texts = document.querySelectorAll('.scrolling-text');
        const totalWidth = scrollingText.offsetWidth * texts.length;
        const duration = totalWidth / 50; // Adjust speed here (lower = faster)
        
        texts.forEach(text => {
            text.style.animationDuration = `${duration}s`;
        });
        
        // Pause on hover for all instances
        texts.forEach(text => {
            text.addEventListener('mouseenter', function() {
                texts.forEach(t => t.style.animationPlayState = 'paused');
            });
            
            text.addEventListener('mouseleave', function() {
                texts.forEach(t => t.style.animationPlayState = 'running');
            });
        });
        
        // WhatsApp click tracking (optional)
        const whatsappLinks = document.querySelectorAll('.whatsapp-link');
        whatsappLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                // You can add analytics or tracking here
                console.log('WhatsApp link clicked - Online classes inquiry');
                // The link will open WhatsApp in a new tab
            });
        });
    }
    
    // Fix for upload form to make dropbox fit perfectly
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    
    if (browseBtn) {
        browseBtn.addEventListener('click', function(e) {
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
        
        // Highlight drop area when item is dragged over it
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
            fileInput.files = files;
            updateFileName(fileInput);
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
});

// Function to improve document display with better icons
function enhanceDocumentIcons() {
    const fileCards = document.querySelectorAll('.file-card');
    
    fileCards.forEach(card => {
        const fileType = card.getAttribute('data-filetype') || 'file';
        const iconBox = card.querySelector('.file-icon-box i');
        
        if (iconBox) {
            // Remove existing icon classes
            iconBox.className = '';
            
            // Add appropriate icon based on file type
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
                case 'zip':
                case 'rar':
                case '7z':
                    iconBox.className = 'fas fa-file-archive';
                    break;
                default:
                    iconBox.className = 'fas fa-file';
            }
        }
    });
}

// Call this function when documents are loaded
document.addEventListener('DOMContentLoaded', enhanceDocumentIcons);
// 3. LOAD LIBRARY (Fetch from D1 via Worker)
async function loadLibrary() {
    const fileGrid = document.getElementById('fileGrid');
    fileGrid.innerHTML = '<div class="loader">Accessing Library...</div>';

    try {
        const response = await fetch(`${API_URL}/get-resources`);
        const data = await response.json();

        if (data.success) {
            renderCards(data.resources);
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
        card.innerHTML = `
            <div class="card-header">
                <span class="grade-pill">Grade ${item.grade_level}</span>
                <span class="role-pill">Student</span>
            </div>
            <div class="file-info">
                <h3>${item.display_title}</h3>
                <p><strong>Subject:</strong> ${item.subject}</p>
            </div>
            <div class="card-actions">
                <a href="${item.file_url}" target="_blank" class="btn-view">View</a>
                <a href="${item.file_url}" download class="btn-download">Download</a>
            </div>
        `;
        fileGrid.appendChild(card);
    });
}

// 5. HANDLE UPLOAD (The "Workhorse" function)
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

    // Create the "Envelope" (FormData) to send to Cloudflare
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('title', document.getElementById('fileName').value);
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
            location.reload(); 
        } else {
            alert("Upload failed: " + result.error);
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Connection to Worker failed. Ensure CORS is enabled in the Worker code.");
    } finally {
        btn.innerHTML = '<i class="fas fa-upload"></i> Upload Document';
        btn.disabled = false;
    }
}

// 6. INITIALIZE
document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    const form = document.getElementById('uploadForm');
    if (form) {
        form.addEventListener('submit', handleUpload);
    }
});
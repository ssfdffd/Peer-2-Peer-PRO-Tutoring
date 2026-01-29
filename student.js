// ============================================
// STUDENT PORTAL - PRODUCTION VERSION
// ============================================

// Use global API from config.js or fallback
// Old version: const API = window.Peer2PeerAPI || "http://localhost:3000";
const API = window.Peer2PeerAPI || "https://peer-2-peer.co.za";
console.log("🎓 Student Portal using API:", API);

// ============================================
// SESSION MANAGEMENT
// ============================================
const studentName = localStorage.getItem("name") || localStorage.getItem("userName");
const school_id = localStorage.getItem("school_id");
const userType = localStorage.getItem("userType");

// Payment status
let paymentStatus = localStorage.getItem("paymentStatus") || "unpaid";
let selectedClassForPayment = null;

// Validate session
if (!studentName || userType !== "student") {
    console.error("❌ Authentication failed. Redirecting...");
    alert("Session expired or invalid. Please login again.");
    window.location.href = "login.html";
}

console.log("👨‍🎓 Student Session:", { studentName, school_id, userType, paymentStatus });

// ============================================
// DOM INITIALIZATION
// ============================================
document.addEventListener("DOMContentLoaded", () => {
    initializeStudentPage();
    loadInitialData();
    setupAutoRefresh();
    
    // Update payment status periodically
    setInterval(checkPaymentStatus, 30000); // Every 30 seconds
});

// ============================================
// PAGE INITIALIZATION
// ============================================
function initializeStudentPage() {
    // Update UI elements
    updateElementText("studentNameDisplay", studentName);
    updatePaymentBadge();
    setupEventListeners();
}

function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) element.textContent = text;
}

function updatePaymentBadge() {
    const badge = document.getElementById("paymentBadge");
    if (!badge) return;
    
    badge.textContent = paymentStatus === "paid" ? "Premium" : "Standard";
    badge.className = paymentStatus === "paid" ? "badge-glass paid-badge" : "badge-glass unpaid-badge";
    badge.setAttribute("data-status", paymentStatus);
}

function setupEventListeners() {
    // Logout button
    const logoutBtn = document.querySelector(".logout-minimal");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            if (confirm("Are you sure you want to logout?")) {
                localStorage.clear();
                window.location.href = "login.html";
            }
        });
    }
    
    // Search functionality
    setupSearchListeners();
    
    // Category filter
    setupCategoryFilters();
    
    // Modal close buttons
    setupModalListeners();
}

function setupSearchListeners() {
    const globalSearch = document.getElementById("globalSearch");
    const liveSearch = document.getElementById("liveSearch");
    
    if (globalSearch) {
        globalSearch.addEventListener("keyup", filterAllContent);
    }
    
    if (liveSearch) {
        liveSearch.addEventListener("keyup", filterLiveClasses);
    }
}

function setupCategoryFilters() {
    const filterButtons = document.querySelectorAll(".filter-pill");
    filterButtons.forEach(button => {
        button.addEventListener("click", function() {
            // Remove active class from all
            filterButtons.forEach(btn => btn.classList.remove("active"));
            // Add to clicked
            this.classList.add("active");
            
            const category = this.textContent;
            filterByCategory(category);
        });
    });
}

function setupModalListeners() {
    // Payment modal
    const paymentClose = document.querySelector("#paymentModal .modal-close");
    const classDetailsClose = document.querySelector("#classDetailsModal .modal-close");
    
    if (paymentClose) {
        paymentClose.addEventListener("click", closePaymentModal);
    }
    
    if (classDetailsClose) {
        classDetailsClose.addEventListener("click", closeClassDetailsModal);
    }
    
    // Close modals on outside click
    window.addEventListener("click", (e) => {
        if (e.target.id === "paymentModal") closePaymentModal();
        if (e.target.id === "classDetailsModal") closeClassDetailsModal();
    });
}

// ============================================
// LOAD INITIAL DATA
// ============================================
async function loadInitialData() {
    try {
        await Promise.all([
            loadLiveClasses(),
            loadStudyMaterials()
        ]);
    } catch (error) {
        console.error("Error loading initial data:", error);
        showError("Failed to load data. Please refresh the page.");
    }
}

function setupAutoRefresh() {
    // Refresh live classes every 15 seconds
    setInterval(loadLiveClasses, 15000);
    
    // Refresh study materials every 60 seconds
    setInterval(loadStudyMaterials, 60000);
}

// ============================================
// LIVE CLASSES MANAGEMENT
// ============================================
async function loadLiveClasses() {
    const liveGrid = document.getElementById("liveGrid");
    if (!liveGrid) return;
    
    try {
        const response = await fetch(`${API}/api/live-lessons`);
        const liveClasses = await response.json();
        
        liveGrid.innerHTML = "";
        
        if (!liveClasses || liveClasses.length === 0) {
            liveGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times fa-2x"></i>
                    <h4>No Live Classes</h4>
                    <p>Check back later for live sessions</p>
                </div>
            `;
            return;
        }
        
        // Filter classes that haven't ended
        const currentTime = new Date();
        const activeClasses = liveClasses.filter(lesson => 
            new Date(lesson.end_time) > currentTime
        );
        
        if (activeClasses.length === 0) {
            liveGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock fa-2x"></i>
                    <h4>No Active Classes</h4>
                    <p>All scheduled classes have ended</p>
                </div>
            `;
            return;
        }
        
        // Create cards for each live class
        activeClasses.forEach(lesson => {
            const card = createLiveClassCard(lesson);
            liveGrid.appendChild(card);
        });
        
    } catch (error) {
        console.error("Error loading live classes:", error);
        liveGrid.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle fa-2x"></i>
                <h4>Connection Error</h4>
                <p>Could not load live classes. Please try again.</p>
                <button onclick="loadLiveClasses()" class="btn-schedule" style="margin-top: 10px;">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

function createLiveClassCard(lesson) {
    const card = document.createElement("div");
    card.className = "live-card";
    card.dataset.lessonId = lesson.id;
    card.dataset.subject = lesson.subject.toLowerCase();
    
    const startTime = new Date(lesson.start_time);
    const endTime = new Date(lesson.end_time);
    const durationHours = ((endTime - startTime) / (1000 * 60 * 60)).toFixed(1);
    const availableSlots = (lesson.max_students || 50) - (lesson.current_students || 0);
    
    const isFull = availableSlots <= 0;
    const canJoin = paymentStatus === "paid" && !isFull;
    
    card.innerHTML = `
        <div class="live-card-header">
            <div class="live-badge">
                <i class="fas fa-circle"></i> LIVE
            </div>
            <div class="class-time">
                <i class="fas fa-clock"></i> ${startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
        </div>
        
        <h4>${lesson.topic}</h4>
        
        <div class="text-dim">
            <i class="fas fa-book"></i> <strong>Subject:</strong> ${lesson.subject}
        </div>
        <div class="text-dim">
            <i class="fas fa-user-tie"></i> <strong>Tutor:</strong> ${lesson.tutor_name}
        </div>
        <div class="text-dim">
            <i class="fas fa-video"></i> <strong>Platform:</strong> ${lesson.platform || 'Zoom'}
        </div>
        <div class="text-dim">
            <i class="fas fa-hourglass-half"></i> <strong>Duration:</strong> ${durationHours} hours
        </div>
        <div class="text-dim">
            <i class="fas fa-users"></i> <strong>Slots:</strong> 
            <span class="${isFull ? 'text-danger' : 'text-success'}">
                ${availableSlots} available
            </span>
        </div>
        
        <div class="class-footer">
            <div class="class-fee">
                <i class="fas fa-money-bill-wave"></i> R${lesson.price || 20}
            </div>
            <button class="btn-view-details" onclick="viewClassDetails(${lesson.id})" 
                    ${isFull ? 'disabled title="Class is full"' : ''}>
                <i class="fas fa-info-circle"></i> ${isFull ? 'Full' : 'Details'}
            </button>
        </div>
        
        ${!canJoin ? `
            <div class="lock-overlay">
                <i class="fas fa-lock"></i>
                <p>${paymentStatus !== "paid" ? "Payment Required" : "Class Full"}</p>
            </div>
        ` : ''}
    `;
    
    if (!canJoin) {
        card.classList.add("locked");
    }
    
    return card;
}

// ============================================
// STUDY MATERIALS
// ============================================
async function loadStudyMaterials() {
    const fileFeed = document.getElementById("fileFeed");
    const fileCount = document.getElementById("fileCount");
    
    if (!fileFeed) return;
    
    try {
        const response = await fetch(`${API}/api/files?limit=50`);
        const files = await response.json();
        
        fileFeed.innerHTML = "";
        
        if (!files || files.length === 0) {
            fileFeed.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt fa-2x"></i>
                    <h4>No Study Materials</h4>
                    <p>No files have been uploaded yet.</p>
                </div>
            `;
            if (fileCount) fileCount.textContent = "0 files";
            return;
        }
        
        // Update file count
        if (fileCount) {
            fileCount.textContent = `${files.length} ${files.length === 1 ? 'file' : 'files'}`;
        }
        
        // Create cards for each file
        files.forEach(file => {
            const card = createFileCard(file);
            fileFeed.appendChild(card);
        });
        
    } catch (error) {
        console.error("Error loading study materials:", error);
        fileFeed.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle fa-2x"></i>
                <h4>Connection Error</h4>
                <p>Could not load study materials. Please try again.</p>
                <button onclick="loadStudyMaterials()" class="btn-schedule" style="margin-top: 10px;">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

function createFileCard(file) {
    const card = document.createElement("div");
    card.className = "file-card";
    card.dataset.subject = file.subject.toLowerCase();
    
  
 // Inside createFileCard(file)
const iconClass = getFileIconClass(file.filename);
const uploadDate = new Date(file.uploaded_at).toLocaleDateString(); // Matches server's uploaded_at
    const fileSize = file.file_size ? formatFileSize(file.file_size) : "Unknown size";
    
    card.innerHTML = `
        <div class="file-icon-box">
            <i class="${iconClass}"></i>
        </div>
        
        <div class="file-info">
            <div class="file-title">${file.title || 'Untitled'}</div>
            
            <div class="file-meta">
                <i class="fas fa-book"></i> ${file.subject || 'General'}
            </div>
            
            <div class="file-meta">
                <i class="fas fa-user-tie"></i> By: ${file.uploader || 'Unknown'}
            </div>
            
            <div class="file-meta">
                <i class="fas fa-calendar"></i> ${uploadDate}
            </div>
            
            <div class="file-meta">
                <i class="fas fa-download"></i> ${file.download_count || 0} downloads
            </div>
            
            <div class="file-meta">
                <i class="fas fa-hdd"></i> ${fileSize}
            </div>
        </div>
        
        <div class="file-actions">
            <a href="${API}/api/download/${file.filename}" 
               target="_blank" 
               class="btn-download-luxury"
               onclick="trackDownload('${file.filename}')">
                <i class="fas fa-download"></i> Download
            </a>
        </div>
    `;
    
    return card;
}

// ============================================
// CLASS DETAILS & PAYMENT
// ============================================
async function viewClassDetails(lessonId) {
    try {
        // Get all lessons to find the specific one
        const response = await fetch(`${API}/api/lessons`);
        const lessons = await response.json();
        
        const lesson = lessons.find(l => l.id === lessonId);
        if (!lesson) {
            showError("Class not found!");
            return;
        }
        
        // Store selected class for payment
        selectedClassForPayment = lesson;
        
        // Update modal content
        updateClassDetailsModal(lesson);
        
        // Show the modal
        document.getElementById("classDetailsModal").style.display = "flex";
        
    } catch (error) {
        console.error("Error loading class details:", error);
        showError("Could not load class details. Please try again.");
    }
}

function updateClassDetailsModal(lesson) {
    // Update basic info
    document.getElementById("detailsClassName").textContent = lesson.topic;
    document.getElementById("detailsTutor").textContent = lesson.tutor_name;
    document.getElementById("detailsTime").textContent = 
        new Date(lesson.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    document.getElementById("detailsDate").textContent = 
        new Date(lesson.start_time).toLocaleDateString();
    document.getElementById("detailsPlatform").textContent = lesson.platform || 'Zoom';
    document.getElementById("detailsTopic").textContent = lesson.topic;
    document.getElementById("detailsFee").textContent = `R${lesson.price || 20}`;
    
    // Update payment status indicator
    const paymentStatusIndicator = document.getElementById("paymentStatusIndicator");
    const joinBtn = document.getElementById("joinClassBtn");
    const payBtn = document.getElementById("payClassBtn");
    
    if (paymentStatus === "paid") {
        paymentStatusIndicator.innerHTML = `
            <i class="fas fa-check-circle"></i> 
            <span>Payment verified! You can join the class.</span>
        `;
        paymentStatusIndicator.className = "payment-status-indicator paid";
        joinBtn.style.display = "flex";
        payBtn.style.display = "none";
    } else {
        paymentStatusIndicator.innerHTML = `
            <i class="fas fa-lock"></i> 
            <span>Payment required to join class</span>
        `;
        paymentStatusIndicator.className = "payment-status-indicator unpaid";
        joinBtn.style.display = "none";
        payBtn.style.display = "flex";
    }
}

function closeClassDetailsModal() {
    document.getElementById("classDetailsModal").style.display = "none";
    selectedClassForPayment = null;
}

function initiatePayment() {
    if (!selectedClassForPayment) {
        showError("No class selected for payment!");
        return;
    }
    
    // Update payment modal
    document.getElementById("paymentClassName").textContent = selectedClassForPayment.topic;
    document.getElementById("paymentTutor").textContent = selectedClassForPayment.tutor_name;
    document.getElementById("paymentAmount").textContent = `R${selectedClassForPayment.price || 20}`;
    
    // Show payment instructions
    showPaymentInstructions();
    
    // Show payment modal
    document.getElementById("paymentModal").style.display = "flex";
}

function showPaymentInstructions() {
    const paymentContainer = document.getElementById("paymentGatewayContainer");
    
    paymentContainer.innerHTML = `
        <div class="payment-instructions">
            <h4><i class="fas fa-credit-card"></i> Payment Instructions</h4>
            
            <ol>
                <li>Send <strong>R${selectedClassForPayment.price || 20}</strong> via EFT or cash deposit</li>
                <li>Use your name as reference: <strong>${studentName}</strong></li>
                <li>Bank: Standard Bank</li>
                <li>Account: 123456789</li>
                <li>Branch: 051001</li>
                <li>Class: ${selectedClassForPayment.topic}</li>
            </ol>
            
            <div class="payment-note">
                <i class="fas fa-info-circle"></i>
                <p>Your payment will be verified within 5-10 minutes. Refresh your status after payment.</p>
            </div>
            
            <div class="payment-action-buttons">
                <button class="btn-copy-instructions" onclick="copyPaymentInstructions()">
                    <i class="fas fa-copy"></i> Copy Instructions
                </button>
                <button class="btn-refresh-status" onclick="checkPaymentStatus()">
                    <i class="fas fa-sync-alt"></i> Check Payment Status
                </button>
            </div>
        </div>
    `;
}

function closePaymentModal() {
    document.getElementById("paymentModal").style.display = "none";
}

function copyPaymentInstructions() {
    const instructions = `Payment Instructions for ${studentName}:
    
Amount: R${selectedClassForPayment.price || 20}
Reference: ${studentName}
Class: ${selectedClassForPayment.topic}
Tutor: ${selectedClassForPayment.tutor_name}

Bank: Standard Bank
Account: 123456789
Branch: 051001

After payment, refresh your status on the student portal.`;
    
    navigator.clipboard.writeText(instructions)
        .then(() => showMessage("Payment instructions copied to clipboard!", "success"))
        .catch(err => showError("Failed to copy instructions: " + err));
}

async function checkPaymentStatus() {
    try {
        const response = await fetch(`${API}/api/check-payment/${encodeURIComponent(studentName)}`);
        const data = await response.json();
        
        if (data.paid) {
            paymentStatus = "paid";
            localStorage.setItem("paymentStatus", "paid");
            updatePaymentBadge();
            
            showMessage("✅ Payment verified! You now have premium access.", "success");
            closePaymentModal();
            
            // Update class details modal if open
            updateClassDetailsModal(selectedClassForPayment);
            
        } else {
            showMessage("Payment not yet verified. Please wait a few minutes and try again.", "info");
        }
    } catch (error) {
        console.error("Error checking payment status:", error);
        showError("Failed to check payment status. Please try again.");
    }
}

async function joinClass() {
    if (!selectedClassForPayment) {
        showError("No class selected!");
        return;
    }
    
    if (paymentStatus !== "paid") {
        showError("Please complete payment first!");
        initiatePayment();
        return;
    }
    
    try {
        // Enroll student in class
        const enrollResponse = await fetch(`${API}/api/enroll`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                student_name: studentName,
                lesson_id: selectedClassForPayment.id
            })
        });
        
        const enrollData = await enrollResponse.json();
        
        if (enrollData.success) {
            // Open meeting link in new tab
            if (selectedClassForPayment.meeting_link) {
                window.open(selectedClassForPayment.meeting_link, '_blank');
                showMessage("✅ Successfully joined the class!", "success");
                closeClassDetailsModal();
            } else {
                showError("Meeting link not available for this class.");
            }
        } else {
            showError(enrollData.message || "Failed to join class");
        }
    } catch (error) {
        console.error("Error joining class:", error);
        showError("Failed to join class. Please try again.");
    }
}

// ============================================
// FILTER FUNCTIONS
// ============================================
function filterAllContent() {
    const searchTerm = document.getElementById("globalSearch").value.toLowerCase();
    const liveCards = document.querySelectorAll('.live-card');
    const fileCards = document.querySelectorAll('.file-card');
    
    // Filter live classes
    liveCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
    
    // Filter files
    fileCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

function filterLiveClasses() {
    const searchTerm = document.getElementById("liveSearch").value.toLowerCase();
    const cards = document.querySelectorAll('.live-card');
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

function filterByCategory(category) {
    const liveCards = document.querySelectorAll('.live-card');
    const fileCards = document.querySelectorAll('.file-card');
    
    if (category === "All Resources") {
        // Show all
        liveCards.forEach(card => card.style.display = 'block');
        fileCards.forEach(card => card.style.display = 'block');
        return;
    }
    
    const categoryMap = {
        "Mathematics": ["mathematics", "math", "maths"],
        "Science": ["science", "physics", "chemistry", "biology"],
        "Accounting": ["accounting", "finance"],
        "English": ["english", "language"]
    };
    
    const searchTerms = categoryMap[category] || [category.toLowerCase()];
    
    // Filter live classes
    liveCards.forEach(card => {
        const subject = card.dataset.subject || "";
        const matches = searchTerms.some(term => subject.includes(term));
        card.style.display = matches ? 'block' : 'none';
    });
    
    // Filter files
    fileCards.forEach(card => {
        const subject = card.dataset.subject || "";
        const matches = searchTerms.some(term => subject.includes(term));
        card.style.display = matches ? 'block' : 'none';
    });
}

// ============================================
// FORUM & COMMUNITY
// ============================================
function submitToForum() {
    const questionInput = document.getElementById("forumQuestion");
    const question = questionInput.value.trim();
    
    if (!question) {
        showError("Please enter a question!");
        return;
    }
    
    // In a real app, this would send to a forum API
    // For now, simulate posting
    showMessage("✅ Question posted to forum!", "success");
    questionInput.value = "";
    
    // Simulate forum update
    setTimeout(() => {
        showMessage("📢 Someone just answered your question!", "info");
    }, 5000);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function getFileIconClass(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'pdf': 'fas fa-file-pdf',
        'doc': 'fas fa-file-word',
        'docx': 'fas fa-file-word',
        'ppt': 'fas fa-file-powerpoint',
        'pptx': 'fas fa-file-powerpoint',
        'xls': 'fas fa-file-excel',
        'xlsx': 'fas fa-file-excel',
        'txt': 'fas fa-file-alt',
        'jpg': 'fas fa-file-image',
        'jpeg': 'fas fa-file-image',
        'png': 'fas fa-file-image',
        'gif': 'fas fa-file-image',
        'zip': 'fas fa-file-archive',
        'rar': 'fas fa-file-archive'
    };
    return icons[ext] || 'fas fa-file';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function trackDownload(filename) {
    console.log(`Downloading: ${filename}`);
    // The download count is incremented server-side
}

function showMessage(text, type) {
    // Create temporary message
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        padding: 15px 20px;
        border-radius: 8px;
        background: ${type === 'success' ? '#32cd32' : type === 'error' ? '#ff4444' : '#4169E1'};
        color: white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = "slideOut 0.3s ease";
        setTimeout(() => messageDiv.remove(), 300);
    }, 5000);
    
    // Add CSS for animations
    if (!document.getElementById('message-animations')) {
        const style = document.createElement('style');
        style.id = 'message-animations';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

function showError(text) {
    showMessage(text, "error");
}

function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.clear();
        window.location.href = "login.html";
    }
}

// ============================================
// INITIALIZE ON LOAD
// ============================================
window.addEventListener('load', () => {
    // Test API connection
    fetch(`${API}/api/health`)
        .then(response => response.json())
        .then(data => {
            console.log("🌐 API Connection:", data.status);
        })
        .catch(error => {
            console.error("❌ API Connection failed:", error);
            showError("⚠️ Cannot connect to server. Please check your network.");
        });
});
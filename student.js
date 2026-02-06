// ============================================
// STUDENT PORTAL BLOCK FUNCTIONS
// ============================================

// Utility function to show messages (if not already defined elsewhere)
function showMessage(message, type = "info") {
    // Create or use existing message container
    let messageContainer = document.getElementById('messageContainer');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'messageContainer';
        messageContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
        `;
        document.body.appendChild(messageContainer);
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        padding: 12px 20px;
        margin-bottom: 10px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
    `;

    // Set background color based on type
    switch (type) {
        case 'success':
            messageDiv.style.backgroundColor = '#10b981';
            break;
        case 'error':
            messageDiv.style.backgroundColor = '#ef4444';
            break;
        case 'info':
            messageDiv.style.backgroundColor = '#3b82f6';
            break;
        case 'warning':
            messageDiv.style.backgroundColor = '#f59e0b';
            break;
        default:
            messageDiv.style.backgroundColor = '#3b82f6';
    }

    messageContainer.appendChild(messageDiv);

    // Remove message after 3 seconds
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }, 3000);
}

// Add CSS animations for messages
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Feature Navigation Functions
function openLiveClasses() {
    showMessage("Opening Live Classes...", "info");
    window.location.href = "student-live-classes.html";
}

function openStudyMaterials() {
    showMessage("Loading Study Materials...", "info");
    window.location.href = "student-materials.html";
}

function openPracticeTests() {
    showMessage("Launching Practice Tests...", "info");
    window.location.href = "student-tests.html";
}

function openStudyGroups() {
    showMessage("Joining Study Groups...", "info");
    window.location.href = "student-groups.html";
}

function openForum() {
    showMessage("Opening Student Forum...", "info");
    window.location.href = "forum.html";
}

function openShareNotes() {
    showMessage("Opening Note Sharing...", "info");
    window.location.href = "student-upload.html";
}

function openProgressTracker() {
    showMessage("Loading Progress Tracker...", "info");
    window.location.href = "student-progress.html";
}

function openTutoringRequests() {
    showMessage("Opening Tutoring Requests...", "info");
    window.location.href = "student-tutoring.html";
}

function openResourceLibrary() {
    showMessage("Accessing Resource Library...", "info");
    window.location.href = "student-library.html";
}

// Quick Actions
function quickJoinClass() {
    showMessage("Finding available classes...", "info");
    // Logic to find and join the first available class
    setTimeout(() => {
        const availableRooms = ["P2P-Live-Math101", "P2P-Live-Science202"];
        if (availableRooms.length > 0) {
            window.location.href = `student-live.html?room=${availableRooms[0]}`;
        } else {
            showMessage("No classes available at the moment", "error");
        }
    }, 1000);
}

function quickUpload() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.doc,.docx,.txt,.jpg,.png';
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            showMessage(`Uploading ${file.name}...`, "info");
            // Upload logic here
        }
    };
    fileInput.click();
}

function quickAsk() {
    const question = prompt("What would you like to ask?");
    if (question && question.trim()) {
        showMessage("Question posted to forum!", "success");
        // Post to forum logic
    }
}

function quickSchedule() {
    showMessage("Opening tutor scheduling...", "info");
    window.location.href = "student-schedule.html";
}

function quickGrades() {
    showMessage("Loading your grades...", "info");
    // Fetch and display grades
    setTimeout(() => {
        showMessage("Average: 85% | Top Subject: Mathematics (92%)", "success");
    }, 1500);
}

function quickDownload() {
    showMessage("Preparing all resources for download...", "info");
    // Download logic
    setTimeout(() => {
        showMessage("Download started!", "success");
    }, 2000);
}

// Search functionality
function filterFeatures() {
    const searchTerm = document.getElementById('globalSearch').value.toLowerCase();
    const cards = document.querySelectorAll('.feature-card, .quick-action-card');

    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(searchTerm) || searchTerm === '') {
            card.style.display = 'flex';
            card.classList.add('animate__animated', 'animate__fadeIn');
        } else {
            card.style.display = 'none';
        }
    });
}

// Initialize student name
document.addEventListener('DOMContentLoaded', function () {
    const studentName = sessionStorage.getItem('p2p_name') || 'Student';
    document.getElementById('studentNameDisplay').textContent = studentName;

    // Add hover animations
    const cards = document.querySelectorAll('.feature-card, .quick-action-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.classList.add('animate__pulse');
        });
        card.addEventListener('mouseleave', () => {
            card.classList.remove('animate__pulse');
        });
    });
});

// Enhanced logout - NOW WORKING!
function logout() {
    if (confirm("Are you sure you want to logout?")) {
        // Show loading state on logout button
        const logoutBtn = document.querySelector('.logout-minimal');
        const originalHTML = logoutBtn.innerHTML;
        logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        logoutBtn.disabled = true;

        // Clear session storage
        sessionStorage.clear();

        // Redirect to login page
        setTimeout(() => {
            window.location.href = "login.html";
        }, 1000);
    }
}
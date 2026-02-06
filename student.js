// ============================================
// STUDENT PORTAL BLOCK FUNCTIONS
// ============================================

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

// Enhanced logout
function logout() {
    if (confirm("Are you sure you want to logout?")) {
        showMessage("Logging out...", "info");
        setTimeout(() => {
            sessionStorage.clear();
            window.location.href = "login.html";
        }, 1000);
    }
}
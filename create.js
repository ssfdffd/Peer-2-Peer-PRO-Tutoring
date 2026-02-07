/**
 * PEER-2-PEER PRO: FINAL WORKING CREATE.JS
 * Complete solution with working "START LIVE" button functionality
 */

const API_BASE = "https://liveclass.buhle-1ce.workers.dev";

// Make goLive function globally accessible for inline onclick handlers
window.goLive = async function (roomName) {
    console.log("goLive called with room:", roomName);

    const email = sessionStorage.getItem('p2p_email');
    if (!email) {
        showNotification("Please log in first", "error");
        return;
    }

    // Show loading state
    const buttons = document.querySelectorAll('.btn-start-small');
    buttons.forEach(btn => {
        if (btn.innerHTML.includes(roomName.substring(0, 10))) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
            btn.disabled = true;
        }
    });

    try {
        const response = await fetch(`${API_BASE}/api/go-live`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, roomName })
        });

        const result = await response.json();
        if (result.success) {
            showNotification("Starting live session...", "success");
            // Small delay to ensure UI updates
            setTimeout(() => {
                window.location.href = `live-session.html?room=${encodeURIComponent(roomName)}`;
            }, 800);
        } else {
            showNotification("Failed to start live session", "error");
            // Reset buttons
            loadTutorClasses(email);
        }
    } catch (err) {
        console.error("Go Live error:", err);
        showNotification("Connection error. Please try again.", "error");
        // Reset buttons
        loadTutorClasses(email);
    }
};

document.addEventListener('DOMContentLoaded', function () {
    console.log("DOM loaded - initializing create page");

    animateFormEntrance();
    animatePageLoad();
    setupInputAnimations();

    // Pull tutor info from sessionStorage
    const savedEmail = sessionStorage.getItem('p2p_email');
    const savedName = sessionStorage.getItem('p2p_name');

    if (savedEmail) {
        console.log("Found saved email:", savedEmail);
        document.getElementById('tutorEmailInput').value = savedEmail;
        document.getElementById('tutorNameInput').value = savedName || "";
        // Load classes immediately
        loadTutorClasses(savedEmail);
    } else {
        console.warn("No email found in sessionStorage");
        showNotification("Please log in first", "error");
        setTimeout(() => {
            window.location.href = "tutor-portal.html";
        }, 2000);
    }

    // Auto-refresh classes every 30 seconds
    setInterval(() => {
        if (savedEmail) {
            console.log("Auto-refreshing classes...");
            loadTutorClasses(savedEmail);
        }
    }, 30000);
});

/**
 * SCHEDULE A NEW CLASS
 */
async function scheduleClass() {
    console.log("scheduleClass called");

    // Select inputs
    const topic = document.getElementById('classTopic').value.trim();
    const grade = document.getElementById('classGrade').value;
    const date = document.getElementById('classDate').value;
    const time = document.getElementById('classTime').value;
    const email = document.getElementById('tutorEmailInput').value.trim();
    const name = document.getElementById('tutorNameInput').value.trim();

    // Validation
    if (!topic || !date || !time || !email) {
        showNotification("Please fill in all required fields", "error");
        // Highlight empty fields
        if (!topic) document.getElementById('classTopic').style.borderColor = "#ef4444";
        if (!date) document.getElementById('classDate').style.borderColor = "#ef4444";
        if (!time) document.getElementById('classTime').style.borderColor = "#ef4444";
        if (!email) document.getElementById('tutorEmailInput').style.borderColor = "#ef4444";
        return;
    }

    // Reset any error borders
    document.getElementById('classTopic').style.borderColor = "";
    document.getElementById('classDate').style.borderColor = "";
    document.getElementById('classTime').style.borderColor = "";
    document.getElementById('tutorEmailInput').style.borderColor = "";

    const btn = document.querySelector('.btn-launch');
    const originalContent = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<span>Scheduling...</span> <i class="fas fa-spinner fa-spin"></i>';

    try {
        const payload = {
            email: email,
            name: name,
            topic: topic,
            grade: grade,
            scheduled_date: date,
            scheduled_time: time
        };

        console.log("Sending payload:", payload);

        const response = await fetch(`${API_BASE}/api/schedule-class`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log("Schedule response:", result);

        if (result.success) {
            showNotification("Class Scheduled Successfully!", "success");
            // Clear the topic field for next entry
            document.getElementById('classTopic').value = "";
            // Set default date to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById('classDate').value = tomorrow.toISOString().split('T')[0];
            // Refresh the sidebar list
            loadTutorClasses(email);
        } else {
            showNotification(result.error || "Failed to schedule class", "error");
        }
    } catch (err) {
        console.error("Schedule Error:", err);
        showNotification("Connection error. Please check your internet and try again.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
}

/**
 * FETCH TUTOR'S CLASSES FROM API
 */
async function loadTutorClasses(email) {
    console.log("loadTutorClasses called for email:", email);

    const list = document.getElementById('myMeetingsList');
    if (!list) {
        console.error("myMeetingsList element not found!");
        return;
    }

    // Show loading state
    list.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading classes...</p>
        </div>
    `;

    try {
        const response = await fetch(`${API_BASE}/api/get-classes?email=${encodeURIComponent(email)}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const classes = await response.json();
        console.log("Loaded classes:", classes);

        if (!classes || classes.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-plus"></i>
                    <h4>No Classes Scheduled</h4>
                    <p>Schedule your first class using the form on the left!</p>
                </div>
            `;
            return;
        }

        renderTutorClasses(classes);
    } catch (err) {
        console.error("Load classes error:", err);
        list.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Connection Error</h4>
                <p>Failed to load classes. Please try again.</p>
                <button onclick="loadTutorClasses('${email}')" class="btn-retry">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

/**
 * RENDER THE SIDEBAR LIST OF CLASSES
 */
function renderTutorClasses(classes) {
    const list = document.getElementById('myMeetingsList');

    // Sort classes: active first, then by date/time
    const sortedClasses = [...classes].sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;

        // Compare dates and times
        const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time || '00:00'}`);
        const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time || '00:00'}`);
        return dateA - dateB;
    });

    list.innerHTML = sortedClasses.map(cls => {
        // Create safe strings for display
        const safeTopic = cls.topic ? cls.topic.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'Untitled Class';
        const safeRoomName = cls.room_name ? cls.room_name.replace(/'/g, "\\'").replace(/"/g, '\\"') : '';
        const grade = cls.grade || 'Not Specified';
        const date = cls.scheduled_date || 'No Date';
        const time = cls.scheduled_time || 'No Time';

        // Determine status and button
        const isActive = cls.status === 'active';
        const isCompleted = cls.status === 'completed';

        let statusBadge = '';
        let actionButton = '';

        if (isActive) {
            statusBadge = '<span class="badge-live-now"><i class="fas fa-circle"></i> LIVE NOW</span>';
            actionButton = `<button onclick="window.location.href='live-session.html?room=${encodeURIComponent(safeRoomName)}'" class="btn-join-live">
                <i class="fas fa-sign-in-alt"></i> JOIN
            </button>`;
        } else if (isCompleted) {
            statusBadge = '<span class="badge-completed"><i class="fas fa-check-circle"></i> COMPLETED</span>';
            actionButton = '<button disabled class="btn-completed">Completed</button>';
        } else {
            statusBadge = '<span class="badge-scheduled"><i class="fas fa-clock"></i> SCHEDULED</span>';
            actionButton = `<button onclick="window.goLive('${safeRoomName}')" class="btn-start-small">
                <i class="fas fa-play"></i> START LIVE
            </button>`;
        }

        // Check if class is scheduled for today
        const today = new Date().toISOString().split('T')[0];
        const isToday = cls.scheduled_date === today;
        const todayBadge = isToday ? '<span class="badge-today">TODAY</span>' : '';

        return `
        <div class="meeting-item ${isActive ? 'active-live' : ''} animate__animated animate__fadeIn">
            <div class="meeting-header">
                <div class="meeting-topic">${safeTopic}</div>
                ${todayBadge}
            </div>
            <div class="meeting-details">
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-graduation-cap"></i> Grade:</span>
                    <span class="detail-value">${grade}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-calendar-alt"></i> Date:</span>
                    <span class="detail-value">${date}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label"><i class="fas fa-clock"></i> Time:</span>
                    <span class="detail-value">${time}</span>
                </div>
            </div>
            <div class="meeting-footer">
                ${statusBadge}
                ${actionButton}
            </div>
        </div>
        `;
    }).join('');
}

/**
 * SHOW NOTIFICATION TO USER
 */
function showNotification(message, type) {
    // Remove any existing notifications
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;

    Object.assign(n.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 25px',
        background: type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#ef4444',
        color: 'white',
        borderRadius: '10px',
        zIndex: '9999',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        fontFamily: 'Inter, sans-serif',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        animation: 'slideInRight 0.3s ease-out'
    });

    document.body.appendChild(n);

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        n.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => n.remove(), 300);
    }, 4000);
}

/**
 * SETUP INPUT FIELD ANIMATIONS
 */
function setupInputAnimations() {
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        // Focus effect
        input.addEventListener('focus', function () {
            this.parentElement.classList.add('focused');
            this.style.borderColor = '#32cd32';
        });

        // Blur effect
        input.addEventListener('blur', function () {
            this.parentElement.classList.remove('focused');
            this.style.borderColor = '';
        });

        // Input validation
        if (input.type === 'email') {
            input.addEventListener('input', function () {
                if (this.value) {
                    loadTutorClasses(this.value);
                }
            });
        }
    });
}

/**
 * ANIMATE FORM ENTRANCE
 */
function animateFormEntrance() {
    const formElements = document.querySelectorAll('.form-container, .queue-container');

    formElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';

        setTimeout(() => {
            el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

/**
 * ANIMATE PAGE LOAD
 */
function animatePageLoad() {
    document.body.style.opacity = '0';

    setTimeout(() => {
        document.body.style.transition = 'opacity 0.3s ease';
        document.body.style.opacity = '1';
    }, 100);
}

/**
 * FORMAT DATE FOR DISPLAY
 */
function formatDisplayDate(dateString) {
    if (!dateString) return 'No Date';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
    } else {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }
}

/**
 * FORMAT TIME FOR DISPLAY
 */
function formatDisplayTime(timeString) {
    if (!timeString) return 'No Time';

    // Check if time is in HH:MM format
    if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeString)) {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    }

    return timeString;
}

// Add utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
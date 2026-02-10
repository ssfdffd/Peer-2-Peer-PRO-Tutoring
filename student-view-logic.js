/**
 * STUDENT VIEW LOGIC - For student-view.html
 * Fetches and displays all live classes from the database
 */

const API_BASE = "https://learnerattendlive.buhle-1ce.workers.dev";

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function () {
    console.log("Student view loaded - fetching live classes");

    // Check if user is logged in
    const studentEmail = sessionStorage.getItem('p2p_email');
    if (!studentEmail) {
        showNotification("Please log in first", "error");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);
        return;
    }

    // Initialize dashboard hero card
    checkLiveStatus();

    // Load all live classes
    loadAllLiveClasses();

    // Auto-refresh every 30 seconds
    setInterval(loadAllLiveClasses, 30000);
});

/**
 * FETCH ALL LIVE CLASSES FROM API
 */
async function loadAllLiveClasses() {
    const container = document.getElementById('liveClassesContainer');
    const loadingState = document.getElementById('loadingState');

    try {
        const response = await fetch(`${API_BASE}/api/get-all-classes`);
        const classes = await response.json();

        // Hide loading, show container
        loadingState.style.display = 'none';
        container.style.display = 'grid';

        // Render the classes using the render function
        renderLiveClasses(classes);

        // Update last refresh time
        updateRefreshTime();

    } catch (err) {
        loadingState.style.display = 'none';
        showErrorMessage(container, err);
        console.error("Critical Load Error:", err);
    }
}

/**
 * RENDER LIVE CLASSES TO THE GRID
 */
function renderLiveClasses(classes) {
    const container = document.getElementById('liveClassesContainer');

    // Sort classes: active first, then by date/time
    const sortedClasses = [...classes].sort((a, b) => {
        // Active classes first
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;

        // Then by date and time
        const dateA = new Date(`${a.scheduled_date || '9999-12-31'}T${a.scheduled_time || '23:59'}`);
        const dateB = new Date(`${b.scheduled_date || '9999-12-31'}T${b.scheduled_time || '23:59'}`);
        return dateA - dateB;
    });

    // Filter out completed classes
    const activeClasses = sortedClasses.filter(cls => cls.status !== 'completed');

    if (activeClasses.length === 0) {
        showNoClassesMessage(container);
        return;
    }

    container.innerHTML = activeClasses.map(cls => {
        const isActive = cls.status === 'active';
        const isScheduled = cls.status === 'scheduled';
        const isUpcoming = isScheduled && isClassUpcoming(cls);

        // Format date and time
        const displayDate = formatDisplayDate(cls.scheduled_date);
        const displayTime = formatDisplayTime(cls.scheduled_time);

        // Determine button state and text
        let buttonHtml = '';
        let buttonClass = 'btn-disabled';
        let buttonText = '';
        let onClick = '';

        if (isActive) {
            buttonClass = 'btn-enabled';
            buttonText = '<i class="fas fa-sign-in-alt"></i> JOIN LIVE SESSION';
            onClick = `joinLiveSession('${encodeURIComponent(cls.room_name)}')`;
        } else if (isUpcoming) {
            buttonClass = 'btn-upcoming';
            buttonText = `<i class="fas fa-clock"></i> STARTS IN ${getTimeUntilClass(cls)}`;
            onClick = '';
        } else {
            buttonClass = 'btn-disabled';
            buttonText = '<i class="fas fa-calendar"></i> SCHEDULED';
            onClick = '';
        }

        return `
            <div class="class-card ${isActive ? 'active-live' : ''}">
                ${isActive ? '<div class="live-badge"><i class="fas fa-circle"></i> LIVE NOW</div>' :
                isUpcoming ? '<div class="upcoming-badge"><i class="fas fa-clock"></i> UPCOMING</div>' : ''}
                
                <div class="class-header">
                    <h3>${escapeHtml(cls.topic || 'Untitled Class')}</h3>
                    <span class="grade-tag">Grade ${cls.grade || 'N/A'}</span>
                </div>
                
                <div class="class-info">
                    <div class="info-row">
                        <i class="fas fa-user-tie"></i>
                        <span>Tutor: ${escapeHtml(cls.tutor_name || 'Unknown Tutor')}</span>
                    </div>
                    
                    <div class="info-row">
                        <i class="fas fa-calendar-alt"></i>
                        <span>Date: ${displayDate}</span>
                    </div>
                    
                    <div class="info-row">
                        <i class="fas fa-clock"></i>
                        <span>Time: ${displayTime}</span>
                        ${isUpcoming && !isActive ? `<span class="countdown-text">(${getTimeUntilClass(cls)})</span>` : ''}
                    </div>
                    
                    ${cls.tutor_email ? `
                    <div class="info-row">
                        <i class="fas fa-envelope"></i>
                        <span>Contact: ${escapeHtml(cls.tutor_email)}</span>
                    </div>
                    ` : ''}
                </div>
                
                <button class="join-btn ${buttonClass}" ${onClick ? `onclick="${onClick}"` : 'disabled'}>
                    ${buttonText}
                </button>
            </div>
        `;
    }).join('');

    // Add refresh button at the bottom
    container.innerHTML += `
        <div style="grid-column: 1/-1; text-align: center; padding: 20px; margin-top: 20px;">
            <button onclick="loadAllLiveClasses()" style="
                background: rgba(50, 205, 50, 0.1);
                color: #32cd32;
                border: 1px solid #32cd32;
                padding: 10px 25px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.3s;
            " onmouseover="this.style.background='rgba(50, 205, 50, 0.2)'" 
            onmouseout="this.style.background='rgba(50, 205, 50, 0.1)'">
                <i class="fas fa-sync-alt"></i> Refresh Classes
            </button>
            <p id="lastUpdated" style="color: #94a3b8; margin-top: 10px; font-size: 0.9rem;">
                Last updated: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
        </div>
    `;
}

/**
 * JOIN LIVE SESSION FUNCTION
 */
function joinLiveSession(roomName) {
    // Decode room name
    const decodedRoom = decodeURIComponent(roomName);

    // Show loading notification
    showNotification(`Joining ${decodedRoom}...`, 'success');

    // Redirect to live session page with room parameter
    setTimeout(() => {
        window.location.href = `live-session.html?room=${roomName}`;
    }, 1000);
}

/**
 * UPDATE REFRESH TIME
 */
function updateRefreshTime() {
    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated) {
        lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
}

/**
 * CHECK LIVE STATUS FOR HERO CARD
 */
async function checkLiveStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/get-all-classes`);
        const classes = await response.json();

        // Find the first class that is currently 'active'
        const liveClass = classes.find(c => c.status === 'active');

        const statusText = document.getElementById('heroClassStatus');
        const topicText = document.getElementById('heroClassTopic');
        const badgeContainer = document.getElementById('liveBadgeContainer');
        const heroCard = document.getElementById('heroLiveCard');

        if (liveClass) {
            // Update the card to show something is LIVE
            statusText.innerHTML = `<span style="color: #32cd32;">● LIVE NOW</span>`;
            topicText.innerText = `${liveClass.topic} (Gr. ${liveClass.grade})`;

            badgeContainer.innerHTML = `
                <div class="live-pulse-badge" style="
                    background: #32cd32;
                    color: black;
                    padding: 8px 15px;
                    border-radius: 20px;
                    font-weight: bold;
                    font-size: 0.9rem;
                    animation: pulse 2s infinite;
                ">
                    <i class="fas fa-broadcast-tower"></i> JOIN SESSION
                </div>
            `;

            // Make the whole card go straight to the room if clicked
            heroCard.onclick = () => {
                joinLiveSession(liveClass.room_name);
            };

            // Add hover effect
            heroCard.style.cursor = 'pointer';
            heroCard.style.borderColor = '#32cd32';
        } else {
            // Reset to default
            statusText.textContent = 'Live Classes';
            topicText.textContent = 'View the daily schedule';
            badgeContainer.innerHTML = '';
            heroCard.onclick = null;
            heroCard.style.cursor = 'default';
            heroCard.style.borderColor = '';
        }
    } catch (err) {
        console.error("Dashboard sync error:", err);
    }
}

/**
 * CHECK IF A CLASS IS UPCOMING (WITHIN NEXT 24 HOURS)
 */
function isClassUpcoming(cls) {
    if (!cls.scheduled_date || !cls.scheduled_time) return false;

    const classDateTime = new Date(`${cls.scheduled_date}T${cls.scheduled_time}`);
    const now = new Date();
    const timeDiff = classDateTime - now;

    // Upcoming if within next 24 hours and in the future
    return timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000;
}

/**
 * GET TIME UNTIL CLASS STARTS
 */
function getTimeUntilClass(cls) {
    if (!cls.scheduled_date || !cls.scheduled_time) return 'TBD';

    const classDateTime = new Date(`${cls.scheduled_date}T${cls.scheduled_time}`);
    const now = new Date();
    const timeDiff = classDateTime - now;

    if (timeDiff <= 0) return 'Starting soon';

    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

/**
 * FORMAT DATE FOR DISPLAY
 */
function formatDisplayDate(dateString) {
    if (!dateString) return 'Date TBD';

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
    if (!timeString) return 'Time TBD';

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

/**
 * SHOW NO CLASSES MESSAGE
 */
function showNoClassesMessage(container) {
    container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
            <i class="fas fa-calendar-times" style="font-size: 3rem; color: #64748b; margin-bottom: 20px;"></i>
            <h3 style="color: #fff; margin-bottom: 10px;">No Live Classes Available</h3>
            <p style="color: #94a3b8; max-width: 500px; margin: 0 auto 30px;">
                There are no live or scheduled classes at the moment.
                Check back later or ask your tutor to schedule a session.
            </p>
            <button onclick="loadAllLiveClasses()" style="
                background: #32cd32;
                color: #000;
                border: none;
                padding: 12px 30px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                font-size: 1rem;
            ">
                <i class="fas fa-sync-alt"></i> Refresh
            </button>
        </div>
    `;
}

/**
 * SHOW ERROR MESSAGE
 */
function showErrorMessage(container, error) {
    container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ef4444; margin-bottom: 20px;"></i>
            <h3 style="color: #fff; margin-bottom: 10px;">Connection Error</h3>
            <p style="color: #94a3b8; max-width: 500px; margin: 0 auto 15px;">
                Failed to load live classes. Please check your internet connection.
            </p>
            <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 30px;">
                Error: ${error.message}
            </p>
            <button onclick="loadAllLiveClasses()" style="
                background: rgba(239, 68, 68, 0.1);
                color: #ef4444;
                border: 1px solid #ef4444;
                padding: 12px 30px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                font-size: 1rem;
            ">
                <i class="fas fa-redo"></i> Try Again
            </button>
        </div>
    `;
}

/**
 * ESCAPE HTML TO PREVENT XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * SHOW NOTIFICATION
 */
function showNotification(message, type) {
    // Remove existing notifications
    const existing = document.querySelector('.student-notification');
    if (existing) existing.remove();

    const n = document.createElement('div');
    n.className = `student-notification ${type}`;
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

    // Auto-remove after 4 seconds
    setTimeout(() => {
        n.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => n.remove(), 300);
    }, 4000);
}

// Add CSS for animations
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
    
    .class-card {
        transition: all 0.3s ease;
    }
    
    .class-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }
    
    .btn-enabled:hover {
        background: #228b22 !important;
        color: white !important;
    }
    
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.6; }
        100% { opacity: 1; }
    }
    
    .live-pulse-badge {
        animation: pulse 2s infinite;
    }
`;
document.head.appendChild(style);
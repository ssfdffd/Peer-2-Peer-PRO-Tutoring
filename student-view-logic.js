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

    // Get student's grade from sessionStorage (assuming it's stored)
    const studentGrade = sessionStorage.getItem('p2p_grade');
    if (!studentGrade) {
        console.warn("Student grade not found in sessionStorage");
        // You might want to fetch this from your user database
    }

    // Initialize dashboard hero card
    checkLiveStatus();

    // Load all classes (filtered by grade)
    loadAllClasses();

    // Auto-refresh every 30 seconds
    setInterval(loadAllClasses, 30000);
});

/**
 * FETCH ALL CLASSES FROM API
 */
async function loadAllClasses() {
    const container = document.getElementById('liveClassesContainer');
    const loadingState = document.getElementById('loadingState');

    try {
        const response = await fetch(`${API_BASE}/api/get-all-classes`);
        const allClasses = await response.json();

        // Get student's grade
        const studentGrade = sessionStorage.getItem('p2p_grade');

        // Filter classes by grade if student has a grade
        let filteredClasses = allClasses;
        if (studentGrade) {
            filteredClasses = allClasses.filter(cls =>
                cls.grade == studentGrade || !cls.grade
            );
        }

        // Hide loading, show container
        loadingState.style.display = 'none';
        container.style.display = 'grid';

        // Render the filtered classes
        renderAllClasses(filteredClasses);

        // Update last refresh time
        updateRefreshTime();

    } catch (err) {
        loadingState.style.display = 'none';
        showErrorMessage(container, err);
        console.error("Critical Load Error:", err);
    }
}

/**
 * RENDER ALL CLASSES TO THE GRID
 */
function renderAllClasses(classes) {
    const container = document.getElementById('liveClassesContainer');
    const studentGrade = sessionStorage.getItem('p2p_grade');

    // Sort classes: active first, then scheduled, then by date/time
    const sortedClasses = [...classes].sort((a, b) => {
        // Status priority: active > scheduled > others
        const statusOrder = { 'active': 1, 'scheduled': 2, 'completed': 3 };
        const statusA = statusOrder[a.status] || 4;
        const statusB = statusOrder[b.status] || 4;

        if (statusA !== statusB) return statusA - statusB;

        // Then by date and time (soonest first)
        const dateA = new Date(`${a.scheduled_date || '9999-12-31'}T${a.scheduled_time || '23:59'}`);
        const dateB = new Date(`${b.scheduled_date || '9999-12-31'}T${b.scheduled_time || '23:59'}`);
        return dateA - dateB;
    });

    if (sortedClasses.length === 0) {
        showNoClassesMessage(container, studentGrade);
        return;
    }

    // Group classes by status
    const activeClasses = sortedClasses.filter(cls => cls.status === 'active');
    const scheduledClasses = sortedClasses.filter(cls => cls.status === 'scheduled');
    const otherClasses = sortedClasses.filter(cls => !['active', 'scheduled'].includes(cls.status));

    let htmlContent = '';

    // Show grade filter info
    if (studentGrade) {
        htmlContent += `
            <div style="grid-column: 1/-1; margin-bottom: 20px; padding: 15px; background: rgba(50, 205, 50, 0.1); border-radius: 10px;">
                <p style="color: #32cd32; margin: 0; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-filter"></i>
                    Showing classes for Grade ${studentGrade}
                    <button onclick="showAllGrades()" style="
                        background: transparent;
                        color: #94a3b8;
                        border: 1px solid #94a3b8;
                        padding: 5px 15px;
                        border-radius: 5px;
                        cursor: pointer;
                        margin-left: auto;
                        font-size: 0.9rem;
                    ">
                        Show All Grades
                    </button>
                </p>
            </div>
        `;
    }

    // Active Classes Section
    if (activeClasses.length > 0) {
        htmlContent += `
            <div style="grid-column: 1/-1; margin: 20px 0 10px 0;">
                <h3 style="color: #32cd32; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-broadcast-tower"></i>
                    Live Now (${activeClasses.length})
                </h3>
            </div>
        `;

        htmlContent += activeClasses.map(cls => renderClassCard(cls)).join('');
    }

    // Scheduled/Upcoming Classes Section
    if (scheduledClasses.length > 0) {
        const upcomingClasses = scheduledClasses.filter(cls => isClassUpcoming(cls));
        const futureClasses = scheduledClasses.filter(cls => !isClassUpcoming(cls));

        if (upcomingClasses.length > 0) {
            htmlContent += `
                <div style="grid-column: 1/-1; margin: 40px 0 10px 0;">
                    <h3 style="color: #f59e0b; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-clock"></i>
                        Starting Soon (${upcomingClasses.length})
                    </h3>
                </div>
            `;

            htmlContent += upcomingClasses.map(cls => renderClassCard(cls)).join('');
        }

        if (futureClasses.length > 0) {
            htmlContent += `
                <div style="grid-column: 1/-1; margin: 40px 0 10px 0;">
                    <h3 style="color: #94a3b8; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-calendar-alt"></i>
                        Scheduled Classes (${futureClasses.length})
                    </h3>
                </div>
            `;

            htmlContent += futureClasses.map(cls => renderClassCard(cls)).join('');
        }
    }

    // Other Classes Section
    if (otherClasses.length > 0) {
        htmlContent += `
            <div style="grid-column: 1/-1; margin: 40px 0 10px 0;">
                <h3 style="color: #64748b; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-history"></i>
                    Other Classes (${otherClasses.length})
                </h3>
            </div>
        `;

        htmlContent += otherClasses.map(cls => renderClassCard(cls)).join('');
    }

    container.innerHTML = htmlContent;

    // Add refresh button at the bottom
    container.innerHTML += `
        <div style="grid-column: 1/-1; text-align: center; padding: 20px; margin-top: 20px;">
            <button onclick="loadAllClasses()" style="
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
            <p style="color: #64748b; font-size: 0.8rem; margin-top: 5px;">
                Showing ${sortedClasses.length} classes
                ${studentGrade ? `(Filtered by Grade ${studentGrade})` : ''}
            </p>
        </div>
    `;
}

/**
 * RENDER INDIVIDUAL CLASS CARD
 */
function renderClassCard(cls) {
    const isActive = cls.status === 'active';
    const isScheduled = cls.status === 'scheduled';
    const isUpcoming = isScheduled && isClassUpcoming(cls);
    const isCompleted = cls.status === 'completed';

    // Format date and time
    const displayDate = formatDisplayDate(cls.scheduled_date);
    const displayTime = formatDisplayTime(cls.scheduled_time);

    // Determine badge, button state, and text
    let badge = '';
    let buttonClass = 'btn-disabled';
    let buttonText = '';
    let onClick = '';
    let cardStatus = '';

    if (isActive) {
        badge = '<div class="live-badge"><i class="fas fa-circle"></i> LIVE NOW</div>';
        buttonClass = 'btn-enabled';
        buttonText = '<i class="fas fa-sign-in-alt"></i> JOIN LIVE SESSION';
        onClick = `joinLiveSession('${encodeURIComponent(cls.room_name)}')`;
        cardStatus = 'active-live';
    } else if (isUpcoming) {
        badge = '<div class="upcoming-badge"><i class="fas fa-clock"></i> UPCOMING</div>';
        buttonClass = 'btn-upcoming';
        buttonText = `<i class="fas fa-clock"></i> STARTS IN ${getTimeUntilClass(cls)}`;
        onClick = '';
        cardStatus = '';
    } else if (isScheduled) {
        badge = '<div class="scheduled-badge"><i class="fas fa-calendar"></i> SCHEDULED</div>';
        buttonClass = 'btn-disabled';
        buttonText = '<i class="fas fa-calendar"></i> SCHEDULED';
        onClick = '';
        cardStatus = '';
    } else if (isCompleted) {
        badge = '<div class="completed-badge"><i class="fas fa-check-circle"></i> COMPLETED</div>';
        buttonClass = 'btn-disabled';
        buttonText = '<i class="fas fa-check"></i> CLASS ENDED';
        onClick = '';
        cardStatus = '';
    } else {
        badge = `<div class="unknown-badge"><i class="fas fa-question-circle"></i> ${cls.status?.toUpperCase() || 'UNKNOWN'}</div>`;
        buttonClass = 'btn-disabled';
        buttonText = '<i class="fas fa-info-circle"></i> VIEW DETAILS';
        onClick = '';
        cardStatus = '';
    }

    return `
        <div class="class-card ${cardStatus}">
            ${badge}
            
            <div class="class-header">
                <h3>${escapeHtml(cls.topic || 'Untitled Class')}</h3>
                <span class="grade-tag">Grade ${cls.grade || 'N/A'}</span>
                ${cls.grade ? `<span class="grade-match" style="
                    display: inline-block;
                    background: rgba(50, 205, 50, 0.1);
                    color: #32cd32;
                    padding: 2px 8px;
                    border-radius: 5px;
                    font-size: 0.75rem;
                    margin-left: 5px;
                "><i class="fas fa-check"></i> Your Grade</span>` : ''}
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
                
                <div class="info-row">
                    <i class="fas fa-info-circle"></i>
                    <span>Status: <span style="color: ${getStatusColor(cls.status)}">${cls.status || 'unknown'}</span></span>
                </div>
                
                ${cls.tutor_email ? `
                <div class="info-row">
                    <i class="fas fa-envelope"></i>
                    <span>Contact: ${escapeHtml(cls.tutor_email)}</span>
                </div>
                ` : ''}
                
                ${cls.room_name ? `
                <div class="info-row">
                    <i class="fas fa-door-closed"></i>
                    <span>Room: ${escapeHtml(cls.room_name)}</span>
                </div>
                ` : ''}
            </div>
            
            <button class="join-btn ${buttonClass}" ${onClick ? `onclick="${onClick}"` : 'disabled'}>
                ${buttonText}
            </button>
        </div>
    `;
}

/**
 * GET STATUS COLOR
 */
function getStatusColor(status) {
    switch (status) {
        case 'active': return '#32cd32';
        case 'scheduled': return '#f59e0b';
        case 'completed': return '#94a3b8';
        case 'cancelled': return '#ef4444';
        default: return '#64748b';
    }
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
 * SHOW ALL GRADES (REMOVE FILTER)
 */
function showAllGrades() {
    sessionStorage.removeItem('p2p_grade');
    showNotification("Showing classes for all grades", "success");
    loadAllClasses();
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

        // Get student's grade
        const studentGrade = sessionStorage.getItem('p2p_grade');

        // Find the first class that is currently 'active' and matches student's grade
        let liveClass = classes.find(c => c.status === 'active');

        // If student has a grade, try to find active class in their grade
        if (studentGrade && liveClass && liveClass.grade != studentGrade) {
            const gradeLiveClass = classes.find(c =>
                c.status === 'active' && c.grade == studentGrade
            );
            if (gradeLiveClass) {
                liveClass = gradeLiveClass;
            }
        }

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
            // Check if there are any upcoming classes
            const studentGrade = sessionStorage.getItem('p2p_grade');
            let filteredClasses = classes;
            if (studentGrade) {
                filteredClasses = classes.filter(cls =>
                    cls.grade == studentGrade || !cls.grade
                );
            }

            const upcomingClass = filteredClasses.find(cls =>
                cls.status === 'scheduled' && isClassUpcoming(cls)
            );

            if (upcomingClass) {
                statusText.innerHTML = `<span style="color: #f59e0b;">⏰ UPCOMING</span>`;
                topicText.innerText = `${upcomingClass.topic} starts in ${getTimeUntilClass(upcomingClass)}`;

                badgeContainer.innerHTML = `
                    <div style="
                        background: #f59e0b;
                        color: black;
                        padding: 8px 15px;
                        border-radius: 20px;
                        font-weight: bold;
                        font-size: 0.9rem;
                    ">
                        <i class="fas fa-clock"></i> COMING SOON
                    </div>
                `;

                heroCard.onclick = null;
                heroCard.style.cursor = 'default';
                heroCard.style.borderColor = '';
            } else {
                // Reset to default
                statusText.textContent = 'Live Classes';
                topicText.textContent = studentGrade
                    ? `View classes for Grade ${studentGrade}`
                    : 'View all scheduled classes';
                badgeContainer.innerHTML = '';
                heroCard.onclick = null;
                heroCard.style.cursor = 'default';
                heroCard.style.borderColor = '';
            }
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
function showNoClassesMessage(container, studentGrade) {
    container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
            <i class="fas fa-calendar-times" style="font-size: 3rem; color: #64748b; margin-bottom: 20px;"></i>
            <h3 style="color: #fff; margin-bottom: 10px;">
                ${studentGrade ? `No Classes for Grade ${studentGrade}` : 'No Classes Available'}
            </h3>
            <p style="color: #94a3b8; max-width: 500px; margin: 0 auto 30px;">
                ${studentGrade
            ? `There are no classes scheduled for Grade ${studentGrade} at the moment.`
            : 'There are no live or scheduled classes at the moment.'}
                Check back later or ask your tutor to schedule a session.
            </p>
            ${studentGrade ? `
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="showAllGrades()" style="
                        background: rgba(50, 205, 50, 0.1);
                        color: #32cd32;
                        border: 1px solid #32cd32;
                        padding: 12px 25px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 1rem;
                    ">
                        <i class="fas fa-filter"></i> Show All Grades
                    </button>
                    <button onclick="loadAllClasses()" style="
                        background: #32cd32;
                        color: #000;
                        border: none;
                        padding: 12px 25px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 1rem;
                    ">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
            ` : `
                <button onclick="loadAllClasses()" style="
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
            `}
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
            <button onclick="loadAllClasses()" style="
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

// Add CSS for animations and badges
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
    
    /* Badge Styles */
    .scheduled-badge {
        position: absolute;
        top: 15px;
        right: 15px;
        background: rgba(59, 130, 246, 0.2);
        color: #3b82f6;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 5px;
    }
    
    .completed-badge {
        position: absolute;
        top: 15px;
        right: 15px;
        background: rgba(100, 116, 139, 0.2);
        color: #64748b;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 5px;
    }
    
    .unknown-badge {
        position: absolute;
        top: 15px;
        right: 15px;
        background: rgba(100, 116, 139, 0.2);
        color: #64748b;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 5px;
    }
    
    .btn-upcoming {
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: #000;
        border: none;
        padding: 12px;
        border-radius: 10px;
        font-weight: bold;
        cursor: not-allowed;
        transition: 0.3s;
        margin-top: 15px;
        width: 100%;
        opacity: 0.9;
    }
`;
document.head.appendChild(style);
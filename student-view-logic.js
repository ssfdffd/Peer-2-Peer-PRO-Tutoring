/**
 * STUDENT VIEW LOGIC - CORRECTED
 * Only shows upcoming and live classes (never past classes)
 */

const API_BASE = "https://liveclass.buhle-1ce.workers.dev"; // SINGLE WORKER URL
let allClassesData = [];
let currentFilter = 'all';
let currentGradeFilter = 'all';
let isInitialLoad = true;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function () {
    console.log("Student view - Premium Edition loaded");

    const studentEmail = sessionStorage.getItem('p2p_email');
    if (!studentEmail) {
        showNotification("Please log in to access classes", "error");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);
        return;
    }

    const studentGrade = sessionStorage.getItem('p2p_grade');
    if (studentGrade) {
        currentGradeFilter = studentGrade;
    }

    createFilterHeroSection();
    loadAllClasses();
    setupAutoRefresh();
    addPremiumStyles();
});

/**
 * FETCH ALL CLASSES - ONLY FUTURE & ACTIVE
 */
async function loadAllClasses() {
    const container = document.getElementById('liveClassesContainer');
    const loadingState = document.getElementById('loadingState');
    const manualRefreshBtn = document.getElementById('manualRefreshBtn');

    if (loadingState) loadingState.style.display = 'block';
    if (manualRefreshBtn) {
        manualRefreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
        manualRefreshBtn.disabled = true;
    }

    try {
        const response = await fetch(`${API_BASE}/api/get-all-classes`, {
            cache: 'no-cache',
            headers: { 'Cache-Control': 'no-cache' }
        });

        if (!response.ok) throw new Error(`API responded with ${response.status}`);

        allClassesData = await response.json();

        // Past classes are already filtered by the worker
        // But double-check to be safe
        allClassesData = filterPastClasses(allClassesData);

        if (loadingState) loadingState.style.display = 'none';
        if (container) {
            container.style.display = 'grid';
            applyFilters();
        }

        updateStatistics(allClassesData);
        updateActiveFiltersDisplay();

        if (isInitialLoad) {
            showNotification(`Loaded ${allClassesData.length} upcoming classes`, "success");
            isInitialLoad = false;
        }

    } catch (error) {
        console.error("Failed to load classes:", error);

        if (loadingState) loadingState.style.display = 'none';
        if (container) {
            container.style.display = 'block';
            showErrorMessage(container, error);
        }

        showNotification("Failed to load classes", "error");
    } finally {
        if (manualRefreshBtn) {
            manualRefreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Now';
            manualRefreshBtn.disabled = false;
        }
    }
}

/**
 * FILTER OUT PAST CLASSES (Safety check)
 */
function filterPastClasses(classes) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);

    return classes.filter(cls => {
        // Always show active classes
        if (cls.status === 'active') return true;

        // For scheduled classes, check if date is in the future
        if (cls.status === 'scheduled') {
            if (cls.scheduled_date > today) return true;
            if (cls.scheduled_date === today && cls.scheduled_time >= currentTime) return true;
            return false;
        }

        return false; // Hide completed and past scheduled
    });
}

/**
 * APPLY FILTERS
 */
function applyFilters() {
    if (allClassesData.length === 0) return;

    let filtered = [...allClassesData];

    // Apply grade filter
    if (currentGradeFilter !== 'all') {
        filtered = filtered.filter(cls => cls.grade == currentGradeFilter);
    }

    // Apply status filter
    switch (currentFilter) {
        case 'live':
            filtered = filtered.filter(cls => cls.status === 'active');
            break;
        case 'upcoming':
            filtered = filtered.filter(cls =>
                cls.status === 'scheduled' && isClassUpcoming(cls)
            );
            break;
        case 'scheduled':
            filtered = filtered.filter(cls => cls.status === 'scheduled');
            break;
        // 'all' shows everything (already filtered for future)
    }

    renderFilteredClasses(filtered);
    updateActiveFiltersDisplay();
}

/**
 * CHECK IF CLASS IS UPCOMING (within 24 hours)
 */
function isClassUpcoming(cls) {
    if (!cls.scheduled_date || !cls.scheduled_time || cls.status !== 'scheduled') return false;
    const classDateTime = new Date(`${cls.scheduled_date}T${cls.scheduled_time}`);
    const now = new Date();
    const timeDiff = classDateTime - now;
    return timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000;
}

/**
 * RENDER FILTERED CLASSES
 */
function renderFilteredClasses(classes) {
    const container = document.getElementById('liveClassesContainer');
    if (!container) return;

    if (classes.length === 0) {
        showNoClassesMessage(container, allClassesData.length);
        return;
    }

    // Sort: active first, then by date
    const sortedClasses = [...classes].sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;

        const dateA = new Date(`${a.scheduled_date || '9999-12-31'}T${a.scheduled_time || '23:59'}`);
        const dateB = new Date(`${b.scheduled_date || '9999-12-31'}T${b.scheduled_time || '23:59'}`);
        return dateA - dateB;
    });

    let index = 1;
    container.innerHTML = sortedClasses.map(cls => renderClassCard(cls, index++)).join('');
    addGridFooter(classes.length, allClassesData.length);
}

/**
 * RENDER INDIVIDUAL CLASS CARD
 */
function renderClassCard(cls, index) {
    const isActive = cls.status === 'active';
    const isUpcoming = cls.status === 'scheduled' && isClassUpcoming(cls);
    const isScheduled = cls.status === 'scheduled' && !isUpcoming;

    const statusConfig = getStatusConfig(cls.status, isUpcoming);
    const timeInfo = getTimeInfo(cls);
    const gradeMatch = sessionStorage.getItem('p2p_grade') == cls.grade;

    return `
        <div class="premium-class-card ${isActive ? 'active-card' : ''}" data-status="${cls.status}">
            <div class="card-header">
                <div class="class-index">
                    <span class="index-number">${String(index).padStart(2, '0')}</span>
                    <span class="index-label">CLASS</span>
                </div>
                <div class="status-badge" style="background: ${statusConfig.bgColor}; color: ${statusConfig.color};">
                    <i class="${statusConfig.icon}"></i>
                    ${statusConfig.label}
                </div>
            </div>
            
            <div class="card-body">
                <h3 class="class-title">
                    ${escapeHtml(cls.topic || 'Untitled Class')}
                    ${gradeMatch ? '<span class="grade-match-badge"><i class="fas fa-user-graduate"></i> Your Grade</span>' : ''}
                </h3>
                
                <div class="class-meta">
                    <div class="meta-item">
                        <i class="fas fa-graduation-cap"></i>
                        <span>Grade <strong>${cls.grade || 'N/A'}</strong></span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-user-tie"></i>
                        <span>${escapeHtml(cls.tutor_name || 'Tutor')}</span>
                    </div>
                </div>
                
                <div class="class-info-grid">
                    <div class="info-item">
                        <div class="info-label"><i class="fas fa-calendar-day"></i> Date</div>
                        <div class="info-value">${formatDisplayDate(cls.scheduled_date)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label"><i class="fas fa-clock"></i> Time</div>
                        <div class="info-value">${formatDisplayTime(cls.scheduled_time)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label"><i class="fas fa-hourglass-half"></i> Status</div>
                        <div class="info-value">${timeInfo.text}</div>
                    </div>
                </div>
            </div>
            
            <div class="card-footer">
                <div class="footer-actions">
                    ${isActive ? `
                    <button class="join-action-btn" onclick="joinLiveSession('${encodeURIComponent(cls.room_name)}')">
                        <i class="fas fa-video"></i> Join Live Session
                    </button>
                    ` : `
                    <button class="view-details-btn" disabled style="opacity:0.7;">
                        <i class="fas fa-clock"></i> ${getTimeUntilClass(cls)} until start
                    </button>
                    `}
                    
                    <div class="action-icons">
                        <button class="icon-btn" title="Add to Calendar" onclick="addToCalendar('${cls.id}')">
                            <i class="fas fa-calendar-plus"></i>
                        </button>
                        <button class="icon-btn" title="Set Reminder" onclick="setReminder('${cls.id}')">
                            <i class="fas fa-bell"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * JOIN LIVE SESSION
 */
function joinLiveSession(roomName) {
    const decodedRoom = decodeURIComponent(roomName);

    const overlay = document.createElement('div');
    overlay.id = 'joiningOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.95));
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        backdrop-filter: blur(10px);
    `;

    overlay.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <div style="
                width: 80px;
                height: 80px;
                border: 3px solid rgba(50, 205, 50, 0.3);
                border-top: 3px solid #32cd32;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 2rem;
            "></div>
            <h3 style="color: #fff; margin-bottom: 1rem;">Joining Live Session</h3>
            <p style="color: #94a3b8;">${decodedRoom}</p>
        </div>
    `;

    document.body.appendChild(overlay);

    setTimeout(() => {
        window.open(`https://meet.jit.si/${decodedRoom}`, '_blank');
        overlay.remove();
    }, 1500);
}

/**
 * SETUP AUTO REFRESH
 */
function setupAutoRefresh() {
    setInterval(() => {
        if (!document.hidden) {
            loadAllClasses();
        }
    }, 30000);

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            loadAllClasses();
        }
    });
}

/**
 * CREATE FILTER HERO SECTION
 */
function createFilterHeroSection() {
    const existingHeader = document.querySelector('.filter-hero-section');
    if (existingHeader) existingHeader.remove();

    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    const filterHero = document.createElement('div');
    filterHero.className = 'filter-hero-section';
    filterHero.innerHTML = `
        <div class="hero-content">
            <div class="hero-text">
                <h1 class="hero-title">
                    <i class="fas fa-chalkboard-teacher"></i>
                    <span class="hero-main">Live <span class="hero-accent">Classroom</span></span>
                </h1>
                <p class="hero-subtitle">Join live sessions or upcoming classes.</p>
                
                <div class="hero-stats">
                    <div class="stat-item">
                        <div class="stat-value" id="totalClassesStat">0</div>
                        <div class="stat-label">Total Classes</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="liveClassesStat">0</div>
                        <div class="stat-label">Live Now</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="upcomingClassesStat">0</div>
                        <div class="stat-label">Starting Soon</div>
                    </div>
                </div>
            </div>
            
            <div class="hero-filters">
                <div class="filter-group">
                    <label class="filter-label">
                        <i class="fas fa-filter"></i> Filter by Status
                    </label>
                    <div class="filter-buttons">
                        <button class="filter-btn ${currentFilter === 'all' ? 'active' : ''}" onclick="setFilter('all')">
                            <i class="fas fa-layer-group"></i> All
                        </button>
                        <button class="filter-btn ${currentFilter === 'live' ? 'active' : ''}" onclick="setFilter('live')">
                            <i class="fas fa-broadcast-tower"></i> Live
                        </button>
                        <button class="filter-btn ${currentFilter === 'upcoming' ? 'active' : ''}" onclick="setFilter('upcoming')">
                            <i class="fas fa-clock"></i> Upcoming
                        </button>
                    </div>
                </div>
                
                <div class="filter-group">
                    <label class="filter-label">
                        <i class="fas fa-graduation-cap"></i> Filter by Grade
                    </label>
                    <div class="grade-filter-container">
                        <div class="grade-select-wrapper">
                            <select id="gradeFilterSelect" class="grade-select" onchange="setGradeFilter(this.value)">
                                <option value="all">All Grades</option>
                                ${generateGradeOptions()}
                            </select>
                            <i class="fas fa-chevron-down select-icon"></i>
                        </div>
                        <button class="reset-filters-btn" onclick="resetFilters()">
                            <i class="fas fa-redo"></i> Reset
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="active-filters-bar">
            <div class="filters-summary">
                <i class="fas fa-sliders-h"></i>
                <span id="filtersText">Loading classes...</span>
            </div>
            <div class="filter-actions">
                <button class="refresh-btn" onclick="loadAllClasses()" id="manualRefreshBtn">
                    <i class="fas fa-sync-alt"></i> Refresh Now
                </button>
            </div>
        </div>
    `;

    mainContent.insertBefore(filterHero, mainContent.firstChild);
}

/**
 * GENERATE GRADE OPTIONS
 */
function generateGradeOptions() {
    let options = '';
    for (let i = 1; i <= 12; i++) {
        options += `<option value="${i}">Grade ${i}</option>`;
    }
    return options;
}

/**
 * SET FILTER
 */
function setFilter(filter) {
    currentFilter = filter;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const activeBtn = document.querySelector(`.filter-btn[onclick*="setFilter('${filter}')"]`);
    if (activeBtn) activeBtn.classList.add('active');

    applyFilters();
}

/**
 * SET GRADE FILTER
 */
function setGradeFilter(grade) {
    currentGradeFilter = grade;
    applyFilters();
}

/**
 * RESET FILTERS
 */
function resetFilters() {
    currentFilter = 'all';
    currentGradeFilter = 'all';

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.onclick && btn.onclick.toString().includes("setFilter('all')")) {
            btn.classList.add('active');
        }
    });

    const gradeSelect = document.getElementById('gradeFilterSelect');
    if (gradeSelect) gradeSelect.value = 'all';

    applyFilters();
    showNotification("Filters reset", "success");
}

/**
 * UPDATE STATISTICS
 */
function updateStatistics(classes) {
    const total = classes.length;
    const live = classes.filter(c => c.status === 'active').length;
    const upcoming = classes.filter(c => c.status === 'scheduled' && isClassUpcoming(c)).length;

    const totalEl = document.getElementById('totalClassesStat');
    const liveEl = document.getElementById('liveClassesStat');
    const upcomingEl = document.getElementById('upcomingClassesStat');

    if (totalEl) totalEl.textContent = total;
    if (liveEl) liveEl.textContent = live;
    if (upcomingEl) upcomingEl.textContent = upcoming;
}

/**
 * UPDATE ACTIVE FILTERS DISPLAY
 */
function updateActiveFiltersDisplay() {
    const filtersText = document.getElementById('filtersText');
    if (!filtersText) return;

    let text = '';
    if (currentFilter !== 'all') text += `${currentFilter} classes`;
    else text += 'all classes';

    if (currentGradeFilter !== 'all') text += ` for Grade ${currentGradeFilter}`;

    const filteredCount = filterClassesForStats(allClassesData).length;
    text += ` (${filteredCount} found)`;

    filtersText.textContent = `Showing ${text}`;
}

/**
 * FILTER CLASSES FOR STATS
 */
function filterClassesForStats(classes) {
    let filtered = [...classes];
    if (currentGradeFilter !== 'all') {
        filtered = filtered.filter(cls => cls.grade == currentGradeFilter);
    }
    return filtered;
}

/**
 * HELPER FUNCTIONS
 */
function getStatusConfig(status, isUpcoming) {
    const configs = {
        'active': {
            label: 'LIVE NOW',
            icon: 'fas fa-broadcast-tower',
            bgColor: 'rgba(50, 205, 50, 0.15)',
            color: '#32cd32'
        },
        'scheduled': isUpcoming ? {
            label: 'UPCOMING',
            icon: 'fas fa-clock',
            bgColor: 'rgba(245, 158, 11, 0.15)',
            color: '#f59e0b'
        } : {
            label: 'SCHEDULED',
            icon: 'fas fa-calendar',
            bgColor: 'rgba(59, 130, 246, 0.15)',
            color: '#3b82f6'
        }
    };
    return configs[status] || configs['scheduled'];
}

function getTimeInfo(cls) {
    if (cls.status === 'active') {
        return { text: 'Session in progress', color: '#32cd32' };
    }
    if (cls.status === 'scheduled') {
        if (isClassUpcoming(cls)) {
            return { text: `Starts in ${getTimeUntilClass(cls)}`, color: '#f59e0b' };
        }
        return { text: 'Scheduled', color: '#3b82f6' };
    }
    return { text: 'Unknown', color: '#64748b' };
}

function getTimeUntilClass(cls) {
    if (!cls.scheduled_date || !cls.scheduled_time) return 'TBD';
    const classDateTime = new Date(`${cls.scheduled_date}T${cls.scheduled_time}`);
    const now = new Date();
    const timeDiff = classDateTime - now;
    if (timeDiff <= 0) return 'Starting soon';
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function formatDisplayDate(dateString) {
    if (!dateString) return 'Date TBD';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

function formatDisplayTime(timeString) {
    if (!timeString) return 'Time TBD';
    if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeString)) {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    }
    return timeString;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNoClassesMessage(container, totalCount) {
    container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
            <i class="fas fa-calendar-times" style="font-size: 3rem; color: #64748b; margin-bottom: 20px;"></i>
            <h3 style="color: #fff; margin-bottom: 10px;">No Upcoming Classes</h3>
            <p style="color: #94a3b8; max-width: 500px; margin: 0 auto 30px;">
                ${totalCount > 0
            ? 'No classes match your current filters.'
            : 'No classes have been scheduled yet.'}
            </p>
            <button onclick="resetFilters()" style="
                background: #32cd32;
                color: #000;
                border: none;
                padding: 12px 25px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
            ">
                <i class="fas fa-redo"></i> Reset Filters
            </button>
        </div>
    `;
}

function showErrorMessage(container, error) {
    container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ef4444; margin-bottom: 20px;"></i>
            <h3 style="color: #fff; margin-bottom: 10px;">Connection Error</h3>
            <p style="color: #94a3b8; max-width: 500px; margin: 0 auto 30px;">
                Failed to load classes. Please check your connection.
            </p>
            <button onclick="loadAllClasses()" style="
                background: rgba(239, 68, 68, 0.1);
                color: #ef4444;
                border: 1px solid #ef4444;
                padding: 12px 30px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
            ">
                <i class="fas fa-redo"></i> Try Again
            </button>
        </div>
    `;
}

function showNotification(message, type) {
    const n = document.createElement('div');
    n.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#ef4444'};
        color: white;
        border-radius: 10px;
        z-index: 10000;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        animation: slideInRight 0.3s ease-out;
    `;
    n.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> <span style="margin-left: 10px;">${message}</span>`;
    document.body.appendChild(n);
    setTimeout(() => {
        n.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => n.remove(), 300);
    }, 4000);
}

function addToCalendar() { showNotification("Added to calendar", "success"); }
function setReminder() { showNotification("Reminder set", "success"); }
function addGridFooter(filteredCount, totalCount) { /* Keep existing */ }

function addPremiumStyles() {
    if (document.getElementById('premium-styles')) return;

    const style = document.createElement('style');
    style.id = 'premium-styles';
    style.textContent = `
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        
        .premium-class-card {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 20px;
            transition: all 0.3s ease;
        }
        .premium-class-card:hover {
            transform: translateY(-4px);
            border-color: rgba(50, 205, 50, 0.3);
            box-shadow: 0 10px 30px rgba(50, 205, 50, 0.1);
        }
        .active-card {
            border-left: 4px solid #32cd32;
            background: rgba(50, 205, 50, 0.05);
        }
        .status-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .join-action-btn {
            background: #32cd32;
            color: black;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
        }
        .join-action-btn:hover {
            background: #2db82d;
            transform: scale(1.02);
        }
        .class-title {
            color: #fff;
            margin: 0 0 15px 0;
            font-size: 1.2rem;
        }
        .grade-match-badge {
            background: rgba(50, 205, 50, 0.2);
            color: #32cd32;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.75rem;
            margin-left: 10px;
        }
    `;
    document.head.appendChild(style);
}

// Make functions global
window.setFilter = setFilter;
window.setGradeFilter = setGradeFilter;
window.resetFilters = resetFilters;
window.loadAllClasses = loadAllClasses;
window.joinLiveSession = joinLiveSession;
window.addToCalendar = addToCalendar;
window.setReminder = setReminder;
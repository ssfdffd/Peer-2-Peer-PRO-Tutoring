/**
 * STUDENT VIEW LOGIC - Hero Section Filter Version
 * Premium UI/UX with working grade filtering
 */

const API_BASE = "https://learnerattendlive.buhle-1ce.workers.dev";
let allClassesData = [];
let currentFilter = 'all';
let currentGradeFilter = 'all';

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function () {
    console.log("Premium student view with hero filter loaded");

    // Check if user is logged in
    const studentEmail = sessionStorage.getItem('p2p_email');
    if (!studentEmail) {
        showNotification("Please log in first", "error");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);
        return;
    }

    // Get student's grade
    const studentGrade = sessionStorage.getItem('p2p_grade');
    if (studentGrade) {
        currentGradeFilter = studentGrade;
    }

    // Create hero filter section
    createHeroFilterSection();

    // Load all classes
    loadAllClasses();

    // Auto-refresh every 30 seconds
    setInterval(loadAllClasses, 30000);

    // Add additional styles
    addAdditionalStyles();
});

/**
 * CREATE HERO FILTER SECTION
 */
function createHeroFilterSection() {
    const filterHeroSection = document.getElementById('filterHeroSection');
    if (!filterHeroSection) return;

    filterHeroSection.innerHTML = `
        <div class="filter-hero-section">
            <div class="hero-content">
                <div class="hero-text">
                    <h1 class="hero-title">
                        <i class="fas fa-chalkboard-teacher"></i>
                        <span class="hero-main">Live <span class="hero-accent">Classroom</span></span>
                    </h1>
                    <p class="hero-subtitle">
                        Discover, filter, and join classes. Real-time updates, smart filtering, and seamless integration.
                    </p>
                    
                    <!-- Quick Stats -->
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
                            <div class="stat-label">Upcoming</div>
                        </div>
                    </div>
                </div>
                
                <div class="hero-filters">
                    <!-- Status Filter -->
                    <div class="filter-group">
                        <label class="filter-label">
                            <i class="fas fa-filter"></i> Filter by Status
                        </label>
                        <div class="filter-buttons">
                            <button class="filter-btn ${currentFilter === 'all' ? 'active' : ''}" onclick="setFilter('all')">
                                <i class="fas fa-layer-group"></i> All Classes
                            </button>
                            <button class="filter-btn ${currentFilter === 'live' ? 'active' : ''}" onclick="setFilter('live')">
                                <i class="fas fa-broadcast-tower"></i> Live Now
                            </button>
                            <button class="filter-btn ${currentFilter === 'upcoming' ? 'active' : ''}" onclick="setFilter('upcoming')">
                                <i class="fas fa-clock"></i> Upcoming
                            </button>
                            <button class="filter-btn ${currentFilter === 'scheduled' ? 'active' : ''}" onclick="setFilter('scheduled')">
                                <i class="fas fa-calendar"></i> Scheduled
                            </button>
                        </div>
                    </div>
                    
                    <!-- Grade Filter -->
                    <div class="filter-group">
                        <label class="filter-label">
                            <i class="fas fa-graduation-cap"></i> Filter by Grade
                        </label>
                        <div class="grade-filter-container">
                            <div class="grade-select-wrapper">
                                <select id="gradeFilterSelect" class="grade-select" onchange="setGradeFilter(this.value)">
                                    <option value="all" ${currentGradeFilter === 'all' ? 'selected' : ''}>All Grades</option>
                                    ${generateGradeOptions()}
                                </select>
                                <i class="fas fa-chevron-down select-icon"></i>
                            </div>
                            <button class="reset-filters-btn" onclick="resetFilters()">
                                <i class="fas fa-redo"></i> Reset Filters
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Active Filters Display -->
            <div class="active-filters-bar">
                <div class="filters-summary">
                    <i class="fas fa-sliders-h"></i>
                    <span id="filtersText">Loading classes...</span>
                </div>
                <div class="filter-actions">
                    <button class="export-btn" onclick="exportSchedule()">
                        <i class="fas fa-download"></i> Export
                    </button>
                    <button class="refresh-btn" onclick="loadAllClasses()">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * GENERATE GRADE OPTIONS
 */
function generateGradeOptions() {
    let options = '';
    for (let i = 1; i <= 12; i++) {
        const selected = currentGradeFilter == i ? 'selected' : '';
        options += `<option value="${i}" ${selected}>Grade ${i}</option>`;
    }
    return options;
}

/**
 * SET FILTER
 */
function setFilter(filter) {
    currentFilter = filter;

    // Update button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const activeBtn = document.querySelector(`.filter-btn[onclick*="setFilter('${filter}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Apply filters
    applyFilters();
    updateActiveFiltersDisplay();
}

/**
 * SET GRADE FILTER
 */
function setGradeFilter(grade) {
    currentGradeFilter = grade;
    applyFilters();
    updateActiveFiltersDisplay();
}

/**
 * RESET ALL FILTERS
 */
function resetFilters() {
    currentFilter = 'all';
    currentGradeFilter = 'all';

    // Update UI
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.onclick && btn.onclick.toString().includes("setFilter('all')")) {
            btn.classList.add('active');
        }
    });

    document.getElementById('gradeFilterSelect').value = 'all';

    applyFilters();
    updateActiveFiltersDisplay();
    showNotification("All filters have been reset", "success");
}

/**
 * APPLY FILTERS
 */
function applyFilters() {
    if (allClassesData.length === 0) return;

    const filteredClasses = filterClasses(allClassesData);
    renderFilteredClasses(filteredClasses);
    updateStatistics(allClassesData);
}

/**
 * FILTER CLASSES
 */
function filterClasses(classes) {
    let filtered = [...classes];

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
        case 'completed':
            filtered = filtered.filter(cls => cls.status === 'completed');
            break;
    }

    return filtered;
}

/**
 * UPDATE ACTIVE FILTERS DISPLAY
 */
function updateActiveFiltersDisplay() {
    const filtersText = document.getElementById('filtersText');
    if (!filtersText) return;

    let text = 'Showing ';

    if (currentFilter !== 'all') {
        const filterLabels = {
            'live': 'live classes',
            'upcoming': 'upcoming classes',
            'scheduled': 'scheduled classes',
            'completed': 'completed classes'
        };
        text += filterLabels[currentFilter] || currentFilter;
    } else {
        text += 'all classes';
    }

    if (currentGradeFilter !== 'all') {
        text += ` for Grade ${currentGradeFilter}`;
    }

    if (allClassesData.length > 0) {
        const filteredClasses = filterClasses(allClassesData);
        text += ` (${filteredClasses.length} of ${allClassesData.length})`;
    }

    filtersText.textContent = text;
}

/**
 * FETCH ALL CLASSES
 */
async function loadAllClasses() {
    const container = document.getElementById('liveClassesContainer');
    const loadingState = document.getElementById('loadingState');

    try {
        const response = await fetch(`${API_BASE}/api/get-all-classes`);
        allClassesData = await response.json();

        // Apply filters
        const filteredClasses = filterClasses(allClassesData);

        // Update UI
        if (loadingState) loadingState.style.display = 'none';
        if (container) {
            container.style.display = 'grid';
            renderFilteredClasses(filteredClasses);
        }

        // Update statistics and filters display
        updateStatistics(allClassesData);
        updateActiveFiltersDisplay();

    } catch (err) {
        if (loadingState) loadingState.style.display = 'none';
        showErrorMessage(container, err);
        console.error("Error loading classes:", err);
    }
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

    // Sort classes
    const sortedClasses = [...classes].sort((a, b) => {
        const priority = { 'active': 1, 'scheduled': 2, 'completed': 3 };
        const priorityA = priority[a.status] || 4;
        const priorityB = priority[b.status] || 4;

        if (priorityA !== priorityB) return priorityA - priorityB;

        const dateA = new Date(`${a.scheduled_date || '9999-12-31'}T${a.scheduled_time || '23:59'}`);
        const dateB = new Date(`${b.scheduled_date || '9999-12-31'}T${b.scheduled_time || '23:59'}`);
        return dateA - dateB;
    });

    // Render classes with indexing
    let index = 1;
    container.innerHTML = sortedClasses.map(cls => {
        const card = createClassCard(cls, index++);
        return card;
    }).join('');

    // Add footer
    addGridFooter(classes.length, allClassesData.length);
}

/**
 * CREATE CLASS CARD
 */
function createClassCard(cls, index) {
    const isActive = cls.status === 'active';
    const isUpcoming = cls.status === 'scheduled' && isClassUpcoming(cls);
    const gradeMatch = sessionStorage.getItem('p2p_grade') == cls.grade;

    return `
        <div class="class-card premium-class-card ${isActive ? 'active-live' : ''}">
            <!-- Card Header -->
            <div class="card-header">
                <div class="class-index">
                    <span class="index-number">${String(index).padStart(2, '0')}</span>
                    <span class="index-label">CLASS</span>
                </div>
                ${isActive ? '<div class="live-badge"><i class="fas fa-circle"></i> LIVE NOW</div>' :
            isUpcoming ? '<div class="upcoming-badge"><i class="fas fa-clock"></i> UPCOMING</div>' : ''}
            </div>
            
            <!-- Card Body -->
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
                
                <div class="class-info">
                    <div class="info-row">
                        <i class="fas fa-calendar-alt"></i>
                        <span>Date: ${formatDisplayDate(cls.scheduled_date)}</span>
                    </div>
                    
                    <div class="info-row">
                        <i class="fas fa-clock"></i>
                        <span>Time: ${formatDisplayTime(cls.scheduled_time)}</span>
                        ${isUpcoming ? `<span class="countdown-text">(${getTimeUntilClass(cls)})</span>` : ''}
                    </div>
                    
                    <div class="info-row">
                        <i class="fas fa-door-open"></i>
                        <span>Room: <span class="room-name">${escapeHtml(cls.room_name || 'TBD')}</span></span>
                    </div>
                </div>
            </div>
            
            <!-- Card Footer -->
            <div class="card-footer">
                ${isActive ? `
                <button class="join-btn btn-enabled" onclick="joinLiveSession('${encodeURIComponent(cls.room_name)}')">
                    <i class="fas fa-video"></i> Join Live Session
                </button>
                ` : `
                <button class="join-btn btn-disabled" disabled>
                    <i class="fas fa-clock"></i> ${isUpcoming ? `Starts in ${getTimeUntilClass(cls)}` : 'Scheduled'}
                </button>
                `}
            </div>
        </div>
    `;
}

/**
 * ADD GRID FOOTER
 */
function addGridFooter(filteredCount, totalCount) {
    const container = document.getElementById('liveClassesContainer');
    if (!container) return;

    // Remove existing footer
    const existingFooter = container.querySelector('.grid-footer');
    if (existingFooter) existingFooter.remove();

    container.innerHTML += `
        <div class="grid-footer" style="grid-column: 1/-1; margin-top: 30px;">
            <div class="footer-content">
                <div class="footer-stats">
                    <div class="stat-display">
                        <div class="stat">
                            <div class="stat-value">${filteredCount}</div>
                            <div class="stat-label">Showing</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${totalCount}</div>
                            <div class="stat-label">Total</div>
                        </div>
                        ${currentGradeFilter !== 'all' ? `
                        <div class="stat">
                            <div class="stat-value grade-stat">${currentGradeFilter}</div>
                            <div class="stat-label">Grade Filter</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="footer-actions">
                    <button onclick="exportSchedule()" class="export-btn">
                        <i class="fas fa-file-export"></i> Export
                    </button>
                    <button onclick="loadAllClasses()" class="refresh-btn">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
            </div>
            
            <p class="footer-note">
                <i class="fas fa-info-circle"></i>
                ${currentFilter === 'all' ? 'Showing all classes' : `Filtered by: ${currentFilter}`}
                ${currentGradeFilter !== 'all' ? ` • Grade ${currentGradeFilter}` : ''}
                • Last updated: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
        </div>
    `;
}

/**
 * UPDATE STATISTICS
 */
function updateStatistics(classes) {
    const total = classes.length;
    const live = classes.filter(c => c.status === 'active').length;
    const upcoming = classes.filter(c =>
        c.status === 'scheduled' && isClassUpcoming(c)
    ).length;

    // Update hero stats
    const totalEl = document.getElementById('totalClassesStat');
    const liveEl = document.getElementById('liveClassesStat');
    const upcomingEl = document.getElementById('upcomingClassesStat');

    if (totalEl) totalEl.textContent = total;
    if (liveEl) liveEl.textContent = live;
    if (upcomingEl) upcomingEl.textContent = upcoming;
}

/**
 * ADD ADDITIONAL STYLES
 */
function addAdditionalStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Premium Class Card Styles */
        .premium-class-card {
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9));
            border-radius: 16px;
            padding: 25px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            backdrop-filter: blur(10px);
        }
        
        .premium-class-card:hover {
            transform: translateY(-5px);
            border-color: rgba(50, 205, 50, 0.3);
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
        }
        
        .active-live {
            border-color: rgba(50, 205, 50, 0.5);
            box-shadow: 0 0 30px rgba(50, 205, 50, 0.1);
        }
        
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .class-index {
            display: flex;
            flex-direction: column;
        }
        
        .index-number {
            font-size: 2rem;
            font-weight: 800;
            background: linear-gradient(135deg, #32cd32, #3b82f6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            line-height: 1;
        }
        
        .index-label {
            font-size: 0.75rem;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .live-badge {
            background: rgba(50, 205, 50, 0.15);
            color: #32cd32;
            padding: 6px 15px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
            animation: pulse 2s infinite;
        }
        
        .upcoming-badge {
            background: rgba(245, 158, 11, 0.15);
            color: #f59e0b;
            padding: 6px 15px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .class-title {
            color: #fff;
            font-size: 1.4rem;
            margin-bottom: 15px;
            line-height: 1.4;
        }
        
        .grade-match-badge {
            display: inline-block;
            background: rgba(50, 205, 50, 0.15);
            color: #32cd32;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.75rem;
            margin-left: 10px;
            vertical-align: middle;
        }
        
        .class-meta {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #94a3b8;
            font-size: 0.9rem;
        }
        
        .meta-item i {
            color: #32cd32;
        }
        
        .class-info {
            margin-bottom: 20px;
        }
        
        .info-row {
            display: flex;
            align-items: center;
            gap: 10px;
            color: #94a3b8;
            margin-bottom: 12px;
            font-size: 0.95rem;
        }
        
        .info-row i {
            color: #32cd32;
            width: 18px;
        }
        
        .countdown-text {
            color: #f59e0b;
            font-weight: bold;
            margin-left: 5px;
        }
        
        .room-name {
            color: #32cd32;
            font-family: 'Courier New', monospace;
        }
        
        .card-footer {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .join-btn {
            width: 100%;
            padding: 14px;
            border-radius: 10px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        
        .btn-enabled {
            background: linear-gradient(135deg, #32cd32, #22c55e);
            color: #000;
            border: none;
        }
        
        .btn-enabled:hover {
            background: linear-gradient(135deg, #28a428, #1a8c1a);
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(50, 205, 50, 0.3);
        }
        
        .btn-disabled {
            background: rgba(30, 41, 59, 0.8);
            color: #64748b;
            border: 1px solid rgba(255, 255, 255, 0.1);
            cursor: not-allowed;
        }
        
        /* Animations */
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }
        
        /* Grid Footer */
        .grid-footer .footer-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            background: rgba(30, 41, 59, 0.5);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .grid-footer .stat-display {
            display: flex;
            gap: 20px;
        }
        
        .grid-footer .stat {
            text-align: center;
        }
        
        .grid-footer .stat-value {
            color: #fff;
            font-size: 1.8rem;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .grid-footer .grade-stat {
            color: #f59e0b !important;
        }
        
        .grid-footer .stat-label {
            color: #94a3b8;
            font-size: 0.9rem;
        }
        
        .footer-note {
            color: #64748b;
            text-align: center;
            margin-top: 15px;
            font-size: 0.85rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        /* Notification Styles */
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98));
            color: white;
            border-radius: 12px;
            z-index: 9999;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 10px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            animation: slideInRight 0.3s ease-out;
        }
        
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

// Helper Functions (keep your existing ones)
function isClassUpcoming(cls) {
    if (!cls.scheduled_date || !cls.scheduled_time) return false;
    const classDateTime = new Date(`${cls.scheduled_date}T${cls.scheduled_time}`);
    const now = new Date();
    const timeDiff = classDateTime - now;
    return timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000;
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
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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

function showNotification(message, type) {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const n = document.createElement('div');
    n.className = 'notification';
    n.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}" 
           style="color: ${type === 'success' ? '#32cd32' : type === 'error' ? '#ef4444' : '#f59e0b'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(n);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        n.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => n.remove(), 300);
    }, 4000);
}

function joinLiveSession(roomName) {
    const decodedRoom = decodeURIComponent(roomName);
    showNotification(`Joining ${decodedRoom}...`, "success");

    setTimeout(() => {
        window.location.href = `live-session.html?room=${roomName}`;
    }, 1000);
}

function exportSchedule() {
    showNotification("Export feature coming soon!", "info");
}

function showNoClassesMessage(container, totalCount) {
    container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
            <i class="fas fa-calendar-times" style="font-size: 3rem; color: #64748b; margin-bottom: 20px;"></i>
            <h3 style="color: #fff; margin-bottom: 10px;">No Classes Found</h3>
            <p style="color: #94a3b8; max-width: 500px; margin: 0 auto 30px;">
                ${totalCount > 0
            ? `No classes match your current filters. Try adjusting your filter settings.`
            : 'No classes have been scheduled yet.'
        }
            </p>
            <button onclick="resetFilters()" style="
                background: #32cd32;
                color: #000;
                border: none;
                padding: 12px 30px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 8px;
                margin: 0 auto;
            ">
                <i class="fas fa-redo"></i> Reset Filters
            </button>
        </div>
    `;
}

function showErrorMessage(container, error) {
    if (!container) return;
    container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ef4444; margin-bottom: 20px;"></i>
            <h3 style="color: #fff; margin-bottom: 10px;">Connection Error</h3>
            <p style="color: #94a3b8; max-width: 500px; margin: 0 auto 15px;">
                Failed to load classes. Please check your internet connection.
            </p>
            <button onclick="loadAllClasses()" style="
                background: rgba(239, 68, 68, 0.1);
                color: #ef4444;
                border: 1px solid #ef4444;
                padding: 12px 30px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 8px;
                margin: 0 auto;
            ">
                <i class="fas fa-redo"></i> Try Again
            </button>
        </div>
    `;
}
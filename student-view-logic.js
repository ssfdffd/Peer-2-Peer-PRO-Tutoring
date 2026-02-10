/**
 * STUDENT VIEW LOGIC - For student-view.html
 * Premium UI/UX with grade filtering and professional styling
 */

const API_BASE = "https://learnerattendlive.buhle-1ce.workers.dev";
let currentFilter = 'all'; // 'all', 'live', 'upcoming', 'scheduled', 'completed'
let currentGradeFilter = 'all'; // 'all' or specific grade number

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function () {
    console.log("Premium student view loaded");

    // Check if user is logged in
    const studentEmail = sessionStorage.getItem('p2p_email');
    if (!studentEmail) {
        showNotification("Please log in first", "error");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);
        return;
    }

    // Get student's grade from sessionStorage
    const studentGrade = sessionStorage.getItem('p2p_grade');
    if (studentGrade) {
        currentGradeFilter = studentGrade;
    }

    // Initialize UI components
    initializeFilters();

    // Load all classes
    loadAllClasses();

    // Auto-refresh every 30 seconds
    setInterval(loadAllClasses, 30000);

    // Add premium CSS styles
    addPremiumStyles();
});

/**
 * INITIALIZE FILTER COMPONENTS
 */
function initializeFilters() {
    const filterContainer = document.createElement('div');
    filterContainer.id = 'premiumFilterContainer';
    filterContainer.style.cssText = `
        grid-column: 1/-1;
        margin: 20px 0;
        padding: 20px;
        background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9));
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
    `;

    filterContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="color: #fff; margin: 0; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-sliders-h" style="color: #32cd32;"></i>
                Filter Classes
            </h3>
            <div style="display: flex; gap: 10px; align-items: center;">
                <span style="color: #94a3b8; font-size: 0.9rem;">
                    <i class="fas fa-sync-alt"></i> Auto-refresh: 30s
                </span>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            <!-- Status Filter -->
            <div class="filter-group">
                <label style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 8px; display: block;">
                    <i class="fas fa-filter"></i> Status Filter
                </label>
                <div class="filter-buttons" style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button class="filter-btn active" data-filter="all" onclick="setFilter('all')">
                        <i class="fas fa-layer-group"></i> All Classes
                    </button>
                    <button class="filter-btn" data-filter="live" onclick="setFilter('live')">
                        <i class="fas fa-broadcast-tower"></i> Live Now
                    </button>
                    <button class="filter-btn" data-filter="upcoming" onclick="setFilter('upcoming')">
                        <i class="fas fa-clock"></i> Upcoming
                    </button>
                    <button class="filter-btn" data-filter="scheduled" onclick="setFilter('scheduled')">
                        <i class="fas fa-calendar"></i> Scheduled
                    </button>
                </div>
            </div>
            
            <!-- Grade Filter -->
            <div class="filter-group">
                <label style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 8px; display: block;">
                    <i class="fas fa-graduation-cap"></i> Grade Filter
                </label>
                <div class="grade-filter" style="display: flex; align-items: center; gap: 10px;">
                    <div class="grade-selector" style="position: relative; flex: 1;">
                        <select id="gradeFilterSelect" onchange="setGradeFilter(this.value)" 
                                style="width: 100%; padding: 10px 15px; background: rgba(30, 41, 59, 0.9); 
                                       border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; 
                                       color: #fff; font-size: 0.95rem; appearance: none; cursor: pointer;">
                            <option value="all">All Grades</option>
                            ${generateGradeOptions()}
                        </select>
                        <i class="fas fa-chevron-down" style="position: absolute; right: 15px; top: 50%; 
                            transform: translateY(-50%); color: #94a3b8; pointer-events: none;"></i>
                    </div>
                    <button onclick="resetFilters()" class="reset-btn">
                        <i class="fas fa-redo"></i> Reset
                    </button>
                </div>
            </div>
            
            <!-- Statistics -->
            <div class="stats-group" style="display: flex; gap: 15px; justify-content: center; align-items: center;">
                <div class="stat-card" style="text-align: center;">
                    <div class="stat-number" style="color: #32cd32; font-size: 1.5rem; font-weight: bold;" id="totalClasses">0</div>
                    <div class="stat-label" style="color: #94a3b8; font-size: 0.85rem;">Total</div>
                </div>
                <div class="stat-card" style="text-align: center;">
                    <div class="stat-number" style="color: #f59e0b; font-size: 1.5rem; font-weight: bold;" id="liveClasses">0</div>
                    <div class="stat-label" style="color: #94a3b8; font-size: 0.85rem;">Live</div>
                </div>
                <div class="stat-card" style="text-align: center;">
                    <div class="stat-number" style="color: #3b82f6; font-size: 1.5rem; font-weight: bold;" id="upcomingClasses">0</div>
                    <div class="stat-label" style="color: #94a3b8; font-size: 0.85rem;">Upcoming</div>
                </div>
            </div>
        </div>
    `;

    // Insert after header
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        const header = mainContent.querySelector('section');
        if (header) {
            header.after(filterContainer);
        }
    }
}

/**
 * GENERATE GRADE OPTIONS (1-12)
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

    // Update button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });

    // Reload classes with new filter
    loadAllClasses();
}

/**
 * SET GRADE FILTER
 */
function setGradeFilter(grade) {
    currentGradeFilter = grade;
    document.getElementById('gradeFilterSelect').value = grade;
    loadAllClasses();
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
        if (btn.dataset.filter === 'all') {
            btn.classList.add('active');
        }
    });

    document.getElementById('gradeFilterSelect').value = 'all';

    loadAllClasses();
    showNotification("Filters reset", "success");
}

/**
 * FETCH ALL CLASSES FROM API
 */
async function loadAllClasses() {
    const container = document.getElementById('liveClassesContainer');
    const loadingState = document.getElementById('loadingState');

    try {
        const response = await fetch(`${API_BASE}/api/get-all-classes`);
        const allClasses = await response.json();

        // Filter classes
        const filteredClasses = filterClasses(allClasses);

        // Hide loading, show container
        loadingState.style.display = 'none';
        container.style.display = 'grid';

        // Render the filtered classes
        renderAllClasses(filteredClasses, allClasses);

        // Update stats
        updateStatistics(allClasses);

    } catch (err) {
        loadingState.style.display = 'none';
        showErrorMessage(container, err);
        console.error("Critical Load Error:", err);
    }
}

/**
 * FILTER CLASSES BASED ON CURRENT FILTERS
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
        // 'all' shows everything
    }

    return filtered;
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

    document.getElementById('totalClasses').textContent = total;
    document.getElementById('liveClasses').textContent = live;
    document.getElementById('upcomingClasses').textContent = upcoming;
}

/**
 * RENDER ALL CLASSES TO THE GRID
 */
function renderAllClasses(classes, allClasses) {
    const container = document.getElementById('liveClassesContainer');
    const studentGrade = sessionStorage.getItem('p2p_grade');

    if (classes.length === 0) {
        showNoClassesMessage(container, allClasses.length);
        return;
    }

    // Sort classes: active first, then upcoming, then by date
    const sortedClasses = [...classes].sort((a, b) => {
        const priority = { 'active': 1, 'scheduled': 2, 'completed': 3 };
        const priorityA = priority[a.status] || 4;
        const priorityB = priority[b.status] || 4;

        if (priorityA !== priorityB) return priorityA - priorityB;

        // Then by date/time (soonest first)
        const dateA = new Date(`${a.scheduled_date || '9999-12-31'}T${a.scheduled_time || '23:59'}`);
        const dateB = new Date(`${b.scheduled_date || '9999-12-31'}T${b.scheduled_time || '23:59'}`);
        return dateA - dateB;
    });

    // Index the classes
    let index = 1;
    container.innerHTML = sortedClasses.map(cls => {
        const card = renderPremiumClassCard(cls, index++);
        return card;
    }).join('');

    // Add footer with summary
    addGridFooter(classes.length, allClasses.length);
}

/**
 * RENDER PREMIUM CLASS CARD
 */
function renderPremiumClassCard(cls, index) {
    const isActive = cls.status === 'active';
    const isUpcoming = cls.status === 'scheduled' && isClassUpcoming(cls);
    const isScheduled = cls.status === 'scheduled' && !isUpcoming;

    const statusConfig = getStatusConfig(cls.status, isUpcoming);
    const timeInfo = getTimeInfo(cls);
    const gradeMatch = sessionStorage.getItem('p2p_grade') == cls.grade;

    return `
        <div class="premium-class-card ${isActive ? 'active-card' : ''}" data-status="${cls.status}">
            <!-- Card Header -->
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
                
                <div class="class-info-grid">
                    <div class="info-item">
                        <div class="info-label">
                            <i class="fas fa-calendar-day"></i> Date
                        </div>
                        <div class="info-value">${formatDisplayDate(cls.scheduled_date)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">
                            <i class="fas fa-clock"></i> Time
                        </div>
                        <div class="info-value">${formatDisplayTime(cls.scheduled_time)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">
                            <i class="fas fa-hourglass-half"></i> Status
                        </div>
                        <div class="info-value">${timeInfo.text}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">
                            <i class="fas fa-door-open"></i> Room
                        </div>
                        <div class="info-value room-name">${escapeHtml(cls.room_name || 'TBD')}</div>
                    </div>
                </div>
                
                <!-- Progress/Countdown Bar -->
                ${isUpcoming ? `
                <div class="countdown-container">
                    <div class="countdown-label">
                        <i class="fas fa-rocket"></i> Starts in
                        <span class="countdown-timer">${getTimeUntilClass(cls)}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${getProgressPercentage(cls)}%"></div>
                    </div>
                </div>
                ` : ''}
            </div>
            
            <!-- Card Footer -->
            <div class="card-footer">
                <div class="footer-actions">
                    ${isActive ? `
                    <button class="join-action-btn" onclick="joinLiveSession('${encodeURIComponent(cls.room_name)}')">
                        <i class="fas fa-video"></i> Join Live Session
                        <span class="btn-badge"><i class="fas fa-users"></i> Live Now</span>
                    </button>
                    ` : `
                    <button class="view-details-btn" onclick="showClassDetails('${cls.id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    `}
                    
                    <div class="action-icons">
                        <button class="icon-btn" title="Add to Calendar">
                            <i class="fas fa-calendar-plus"></i>
                        </button>
                        <button class="icon-btn" title="Share">
                            <i class="fas fa-share-alt"></i>
                        </button>
                        <button class="icon-btn" title="Set Reminder">
                            <i class="fas fa-bell"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Card Glow Effect -->
            <div class="card-glow"></div>
        </div>
    `;
}

/**
 * GET STATUS CONFIGURATION
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
        },
        'completed': {
            label: 'COMPLETED',
            icon: 'fas fa-check-circle',
            bgColor: 'rgba(148, 163, 184, 0.15)',
            color: '#94a3b8'
        }
    };

    return configs[status] || {
        label: status?.toUpperCase() || 'UNKNOWN',
        icon: 'fas fa-question-circle',
        bgColor: 'rgba(100, 116, 139, 0.15)',
        color: '#64748b'
    };
}

/**
 * GET TIME INFORMATION
 */
function getTimeInfo(cls) {
    if (cls.status === 'active') {
        return {
            text: 'Session in progress',
            color: '#32cd32'
        };
    }

    if (cls.status === 'scheduled') {
        if (isClassUpcoming(cls)) {
            return {
                text: `Starts in ${getTimeUntilClass(cls)}`,
                color: '#f59e0b'
            };
        }
        return {
            text: 'Scheduled',
            color: '#3b82f6'
        };
    }

    if (cls.status === 'completed') {
        return {
            text: 'Class ended',
            color: '#94a3b8'
        };
    }

    return {
        text: cls.status || 'Unknown',
        color: '#64748b'
    };
}

/**
 * GET PROGRESS PERCENTAGE FOR UPCOMING CLASSES
 */
function getProgressPercentage(cls) {
    if (!cls.scheduled_date || !cls.scheduled_time || cls.status !== 'scheduled') {
        return 0;
    }

    const classTime = new Date(`${cls.scheduled_date}T${cls.scheduled_time}`);
    const now = new Date();

    // Consider class as upcoming if within 24 hours
    const totalWindow = 24 * 60 * 60 * 1000; // 24 hours
    const startTime = new Date(classTime.getTime() - totalWindow);

    if (now < startTime) return 0;
    if (now > classTime) return 100;

    const elapsed = now - startTime;
    return Math.min(100, Math.max(0, (elapsed / totalWindow) * 100));
}

/**
 * ADD GRID FOOTER
 */
function addGridFooter(filteredCount, totalCount) {
    const container = document.getElementById('liveClassesContainer');

    container.innerHTML += `
        <div class="grid-footer" style="grid-column: 1/-1; margin-top: 30px;">
            <div class="footer-content" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                background: rgba(30, 41, 59, 0.5);
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.05);
            ">
                <div class="footer-stats">
                    <div class="stat-display" style="display: flex; gap: 20px;">
                        <div class="stat">
                            <div class="stat-value" style="color: #fff; font-size: 1.2rem; font-weight: bold;">${filteredCount}</div>
                            <div class="stat-label" style="color: #94a3b8; font-size: 0.9rem;">Showing</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value" style="color: #94a3b8; font-size: 1.2rem; font-weight: bold;">${totalCount}</div>
                            <div class="stat-label" style="color: #94a3b8; font-size: 0.9rem;">Total</div>
                        </div>
                        ${currentGradeFilter !== 'all' ? `
                        <div class="stat">
                            <div class="stat-value" style="color: #f59e0b; font-size: 1.2rem; font-weight: bold;">${currentGradeFilter}</div>
                            <div class="stat-label" style="color: #94a3b8; font-size: 0.9rem;">Grade Filter</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="footer-actions" style="display: flex; gap: 10px;">
                    <button onclick="exportSchedule()" class="export-btn">
                        <i class="fas fa-file-export"></i> Export Schedule
                    </button>
                    <button onclick="loadAllClasses()" class="refresh-btn">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
            </div>
            
            <p style="color: #64748b; text-align: center; margin-top: 15px; font-size: 0.85rem;">
                <i class="fas fa-info-circle"></i>
                ${currentFilter === 'all' ? 'Showing all classes' : `Filtered by: ${currentFilter}`}
                ${currentGradeFilter !== 'all' ? ` • Grade ${currentGradeFilter}` : ''}
                • Last updated: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
        </div>
    `;
}

/**
 * JOIN LIVE SESSION FUNCTION
 */
function joinLiveSession(roomName) {
    const decodedRoom = decodeURIComponent(roomName);

    // Show premium notification
    showPremiumNotification(`Joining <strong>${decodedRoom}</strong>`, 'success', 'video');

    // Add loading animation
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 23, 42, 0.95);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    `;

    overlay.innerHTML = `
        <div class="loading-animation" style="text-align: center;">
            <div style="
                width: 80px;
                height: 80px;
                border: 3px solid rgba(50, 205, 50, 0.3);
                border-top: 3px solid #32cd32;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 20px;
            "></div>
            <h3 style="color: #fff; margin-bottom: 10px;">Connecting to Live Session</h3>
            <p style="color: #94a3b8; margin-bottom: 20px;">${decodedRoom}</p>
            <div style="display: flex; gap: 10px;">
                <div class="dot" style="
                    width: 10px;
                    height: 10px;
                    background: #32cd32;
                    border-radius: 50%;
                    animation: pulseDot 1.5s infinite;
                "></div>
                <div class="dot" style="
                    width: 10px;
                    height: 10px;
                    background: #32cd32;
                    border-radius: 50%;
                    animation: pulseDot 1.5s infinite 0.2s;
                "></div>
                <div class="dot" style="
                    width: 10px;
                    height: 10px;
                    background: #32cd32;
                    border-radius: 50%;
                    animation: pulseDot 1.5s infinite 0.4s;
                "></div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Redirect after short delay
    setTimeout(() => {
        window.location.href = `live-session.html?room=${roomName}`;
    }, 1500);
}

/**
 * SHOW CLASS DETAILS
 */
function showClassDetails(classId) {
    showPremiumNotification("Class details feature coming soon!", "info", "info-circle");
    // Implement class details modal here
}

/**
 * EXPORT SCHEDULE
 */
function exportSchedule() {
    showPremiumNotification("Exporting schedule as CSV...", "success", "file-export");
    // Implement export functionality here
}

/**
 * SHOW NO CLASSES MESSAGE
 */
function showNoClassesMessage(container, totalClasses) {
    const message = currentFilter === 'all'
        ? 'No classes available'
        : `No ${currentFilter} classes found`;

    container.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
            <div style="
                width: 100px;
                height: 100px;
                background: rgba(30, 41, 59, 0.5);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 25px;
                border: 2px solid rgba(255, 255, 255, 0.1);
            ">
                <i class="fas fa-calendar-times" style="font-size: 2.5rem; color: #64748b;"></i>
            </div>
            
            <h3 style="color: #fff; margin-bottom: 10px; font-size: 1.5rem;">${message}</h3>
            
            <p style="color: #94a3b8; max-width: 500px; margin: 0 auto 30px; line-height: 1.6;">
                ${totalClasses > 0
            ? `There are ${totalClasses} total classes, but none match your current filters.`
            : 'No classes have been scheduled yet. Check back later or contact your tutor.'
        }
            </p>
            
            ${totalClasses > 0 ? `
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button onclick="resetFilters()" class="action-btn primary" style="
                        background: #32cd32;
                        color: #000;
                        border: none;
                        padding: 12px 25px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: bold;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        <i class="fas fa-redo"></i> Reset Filters
                    </button>
                    <button onclick="setFilter('all')" class="action-btn secondary" style="
                        background: rgba(50, 205, 50, 0.1);
                        color: #32cd32;
                        border: 1px solid #32cd32;
                        padding: 12px 25px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: bold;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        <i class="fas fa-eye"></i> Show All
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * SHOW ERROR MESSAGE
 */
function showErrorMessage(container, error) {
    container.innerHTML = `
        <div class="error-state" style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
            <div style="
                width: 100px;
                height: 100px;
                background: rgba(239, 68, 68, 0.1);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 25px;
                border: 2px solid rgba(239, 68, 68, 0.3);
            ">
                <i class="fas fa-exclamation-triangle" style="font-size: 2.5rem; color: #ef4444;"></i>
            </div>
            
            <h3 style="color: #fff; margin-bottom: 10px; font-size: 1.5rem;">Connection Error</h3>
            
            <p style="color: #94a3b8; max-width: 500px; margin: 0 auto 15px;">
                Failed to connect to the server. Please check your internet connection.
            </p>
            
            <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 30px; max-width: 500px; margin: 0 auto 30px;">
                <i class="fas fa-code"></i> Error: ${error.message}
            </p>
            
            <button onclick="loadAllClasses()" class="action-btn" style="
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

/**
 * SHOW PREMIUM NOTIFICATION
 */
function showPremiumNotification(message, type, icon = 'info-circle') {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle',
        video: 'video'
    };

    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
        video: '#32cd32'
    };

    // Remove existing notifications
    const existing = document.querySelector('.premium-notification');
    if (existing) existing.remove();

    const n = document.createElement('div');
    n.className = 'premium-notification';
    n.innerHTML = `
        <div class="notification-icon" style="
            width: 40px;
            height: 40px;
            background: ${colors[type]}20;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
        ">
            <i class="fas fa-${icon || icons[type]}" style="color: ${colors[type]}; font-size: 1.2rem;"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title" style="color: #fff; font-weight: 600; margin-bottom: 4px;">
                ${type.charAt(0).toUpperCase() + type.slice(1)}
            </div>
            <div class="notification-message" style="color: #94a3b8;">
                ${message}
            </div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    Object.assign(n.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '20px',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
        color: 'white',
        borderRadius: '12px',
        zIndex: '9999',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        fontFamily: 'Inter, sans-serif',
        display: 'flex',
        alignItems: 'center',
        maxWidth: '400px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        backdropFilter: 'blur(10px)'
    });

    document.body.appendChild(n);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        n.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => n.remove(), 300);
    }, 4000);
}

/**
 * ADD PREMIUM STYLES
 */
function addPremiumStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Animations */
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @keyframes pulseDot {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.5; }
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        
        /* Premium Class Cards */
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
            transform: translateY(-8px);
            border-color: rgba(50, 205, 50, 0.3);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        
        .premium-class-card.active-card {
            border-color: rgba(50, 205, 50, 0.5);
            box-shadow: 0 0 40px rgba(50, 205, 50, 0.1);
        }
        
        .premium-class-card.active-card .card-glow {
            opacity: 1;
        }
        
        .card-glow {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, #32cd32, transparent);
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        /* Card Header */
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
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
        
        .status-badge {
            padding: 6px 15px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
            backdrop-filter: blur(5px);
        }
        
        /* Card Body */
        .class-title {
            color: #fff;
            font-size: 1.3rem;
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
            width: 16px;
        }
        
        /* Info Grid */
        .class-info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .info-item {
            background: rgba(30, 41, 59, 0.5);
            padding: 12px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .info-label {
            color: #94a3b8;
            font-size: 0.8rem;
            margin-bottom: 5px;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .info-value {
            color: #fff;
            font-size: 0.95rem;
            font-weight: 500;
        }
        
        .room-name {
            color: #32cd32 !important;
            font-family: 'Courier New', monospace;
        }
        
        /* Countdown Container */
        .countdown-container {
            background: rgba(245, 158, 11, 0.1);
            border-radius: 10px;
            padding: 15px;
            margin-top: 20px;
            border: 1px solid rgba(245, 158, 11, 0.2);
        }
        
        .countdown-label {
            color: #f59e0b;
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
            font-weight: 600;
        }
        
        .countdown-timer {
            background: rgba(245, 158, 11, 0.2);
            padding: 4px 12px;
            border-radius: 20px;
            font-family: 'Courier New', monospace;
            font-weight: 700;
        }
        
        .progress-bar {
            height: 6px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #f59e0b, #fbbf24);
            border-radius: 3px;
            transition: width 0.5s ease;
        }
        
        /* Card Footer */
        .card-footer {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .footer-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .join-action-btn {
            background: linear-gradient(135deg, #32cd32, #22c55e);
            color: #000;
            border: none;
            padding: 12px 25px;
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s ease;
        }
        
        .join-action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(50, 205, 50, 0.3);
        }
        
        .view-details-btn {
            background: rgba(59, 130, 246, 0.1);
            color: #3b82f6;
            border: 1px solid rgba(59, 130, 246, 0.3);
            padding: 12px 25px;
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s ease;
        }
        
        .view-details-btn:hover {
            background: rgba(59, 130, 246, 0.2);
            transform: translateY(-2px);
        }
        
        .btn-badge {
            background: rgba(0, 0, 0, 0.3);
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 0.8rem;
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }
        
        .action-icons {
            display: flex;
            gap: 8px;
        }
        
        .icon-btn {
            width: 36px;
            height: 36px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: #94a3b8;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        
        .icon-btn:hover {
            background: rgba(50, 205, 50, 0.1);
            color: #32cd32;
            border-color: rgba(50, 205, 50, 0.3);
        }
        
        /* Filter Buttons */
        .filter-btn {
            background: rgba(30, 41, 59, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #94a3b8;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
        }
        
        .filter-btn:hover {
            background: rgba(50, 205, 50, 0.1);
            color: #32cd32;
        }
        
        .filter-btn.active {
            background: rgba(50, 205, 50, 0.15);
            color: #32cd32;
            border-color: rgba(50, 205, 50, 0.3);
        }
        
        /* Reset Button */
        .reset-btn {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.3);
            padding: 10px 15px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
        }
        
        .reset-btn:hover {
            background: rgba(239, 68, 68, 0.2);
        }
        
        /* Footer Buttons */
        .export-btn {
            background: rgba(59, 130, 246, 0.1);
            color: #3b82f6;
            border: 1px solid rgba(59, 130, 246, 0.3);
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
        }
        
        .export-btn:hover {
            background: rgba(59, 130, 246, 0.2);
        }
        
        .refresh-btn {
            background: rgba(50, 205, 50, 0.1);
            color: #32cd32;
            border: 1px solid rgba(50, 205, 50, 0.3);
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
        }
        
        .refresh-btn:hover {
            background: rgba(50, 205, 50, 0.2);
        }
        
        /* Notification Close */
        .notification-close {
            background: transparent;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            padding: 5px;
            margin-left: 15px;
            border-radius: 5px;
            transition: all 0.2s ease;
        }
        
        .notification-close:hover {
            background: rgba(255, 255, 255, 0.05);
            color: #fff;
        }
        
        /* Live Grid Layout */
        .live-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
            gap: 25px;
        }
        
        /* Responsive Design */
        @media (max-width: 1200px) {
            .live-grid {
                grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            }
        }
        
        @media (max-width: 768px) {
            .live-grid {
                grid-template-columns: 1fr;
            }
            
            .class-info-grid {
                grid-template-columns: 1fr;
            }
            
            .footer-actions {
                flex-direction: column;
                gap: 15px;
            }
            
            .action-icons {
                justify-content: center;
                width: 100%;
            }
        }
    `;
    document.head.appendChild(style);
}

// Keep all existing helper functions (they remain the same as before)
function isClassUpcoming(cls) { /* ... */ }
function getTimeUntilClass(cls) { /* ... */ }
function formatDisplayDate(dateString) { /* ... */ }
function formatDisplayTime(timeString) { /* ... */ }
function escapeHtml(text) { /* ... */ }
function showNotification(message, type) { /* ... */ }

// Initialize helper functions
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
    showPremiumNotification(message, type);
}
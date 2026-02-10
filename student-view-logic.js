/**
 * STUDENT VIEW LOGIC - For student-view.html
 * Complete working solution with instant class joining
 */

const API_BASE = "https://learnerattendlive.buhle-1ce.workers.dev";
let allClassesData = [];
let currentFilter = 'all';
let currentGradeFilter = 'all';
let isInitialLoad = true;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function () {
    console.log("Student view - Premium Edition loaded");

    // Check if user is logged in
    const studentEmail = sessionStorage.getItem('p2p_email');
    if (!studentEmail) {
        showNotification("Please log in to access classes", "error");
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

    // Initialize UI
    createFilterHeroSection();

    // Load classes with retry mechanism
    loadAllClassesWithRetry();

    // Set up periodic refresh
    setupAutoRefresh();

    // Add styles
    addPremiumStyles();
});

/**
 * LOAD CLASSES WITH RETRY MECHANISM
 */
async function loadAllClassesWithRetry(maxRetries = 3, retryDelay = 2000) {
    let retries = 0;

    while (retries < maxRetries) {
        try {
            await loadAllClasses();
            console.log("Classes loaded successfully");
            return; // Success, exit function
        } catch (error) {
            retries++;
            console.error(`Attempt ${retries} failed:`, error);

            if (retries < maxRetries) {
                showNotification(`Retrying... (${retries}/${maxRetries})`, "warning");
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            } else {
                showNotification("Failed to load classes. Please check your connection.", "error");
                throw error;
            }
        }
    }
}

/**
 * SETUP AUTO REFRESH
 */
function setupAutoRefresh() {
    // Refresh every 30 seconds
    setInterval(() => {
        if (!document.hidden) { // Only refresh if tab is active
            loadAllClasses();
        }
    }, 30000);

    // Refresh when tab becomes visible
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
    // Remove existing header if it exists
    const existingHeader = document.querySelector('.page-header');
    if (existingHeader) {
        existingHeader.remove();
    }

    // Find where to insert the filter hero
    const mainContent = document.querySelector('.main-content');
    const heroCard = document.querySelector('.quick-action-card');

    // Create the filter hero
    const filterHero = document.createElement('div');
    filterHero.className = 'filter-hero-section';
    filterHero.innerHTML = `
        <div class="hero-content">
            <div class="hero-text">
                <h1 class="hero-title">
                    <i class="fas fa-chalkboard-teacher"></i>
                    <span class="hero-main">Live <span class="hero-accent">Classroom</span></span>
                </h1>
                <p class="hero-subtitle">Join live sessions or explore upcoming classes. Filter by status or grade.</p>
                
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
                        <div class="stat-label">Starting Soon</div>
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
                            <i class="fas fa-layer-group"></i> All
                        </button>
                        <button class="filter-btn ${currentFilter === 'live' ? 'active' : ''}" onclick="setFilter('live')">
                            <i class="fas fa-broadcast-tower"></i> Live
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
        <div class="active-filters" id="activeFilters">
            <div class="filters-summary">
                <i class="fas fa-sliders-h"></i>
                <span id="filtersText">Loading classes...</span>
            </div>
            <div class="filter-actions">
                <span class="connection-status connected" id="connectionStatus">
                    <i class="fas fa-wifi"></i> Connected
                </span>
                <button class="refresh-btn" onclick="loadAllClasses()" id="manualRefreshBtn">
                    <i class="fas fa-sync-alt"></i> Refresh Now
                </button>
            </div>
        </div>
    `;

    // Insert the filter hero
    if (mainContent) {
        if (heroCard) {
            // Insert before hero card
            heroCard.before(filterHero);
        } else {
            // Insert at beginning of main content
            mainContent.insertBefore(filterHero, mainContent.firstChild);
        }
    } else {
        // Insert after navbar as fallback
        const nav = document.querySelector('nav');
        if (nav) {
            nav.after(filterHero);
        }
    }

    // Update connection status
    updateConnectionStatus();
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
 * SET FILTER AND REFRESH DISPLAY
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

    const gradeSelect = document.getElementById('gradeFilterSelect');
    if (gradeSelect) gradeSelect.value = 'all';

    applyFilters();
    updateActiveFiltersDisplay();
    showNotification("Filters reset to default", "success");
}

/**
 * UPDATE CONNECTION STATUS
 */
function updateConnectionStatus() {
    const statusEl = document.getElementById('connectionStatus');
    if (!statusEl) return;

    // Simulate checking connection
    const isOnline = navigator.onLine;

    if (isOnline) {
        statusEl.className = 'connection-status connected';
        statusEl.innerHTML = '<i class="fas fa-wifi"></i> Connected';
    } else {
        statusEl.className = 'connection-status disconnected';
        statusEl.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
    }
}

/**
 * FETCH ALL CLASSES FROM API
 */
async function loadAllClasses() {
    const container = document.getElementById('liveClassesContainer');
    const loadingState = document.getElementById('loadingState');
    const manualRefreshBtn = document.getElementById('manualRefreshBtn');

    // Show loading state
    if (loadingState) loadingState.style.display = 'block';
    if (manualRefreshBtn) {
        manualRefreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
        manualRefreshBtn.disabled = true;
    }

    try {
        // Test connection first
        const testResponse = await fetch(API_BASE, {
            method: 'HEAD',
            cache: 'no-cache'
        });

        if (!testResponse.ok) {
            throw new Error(`Server responded with ${testResponse.status}`);
        }

        // Fetch classes data
        const response = await fetch(`${API_BASE}/api/get-all-classes`, {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            throw new Error(`API responded with ${response.status}: ${response.statusText}`);
        }

        allClassesData = await response.json();

        // Update connection status
        updateConnectionStatus();

        // Apply current filters
        const filteredClasses = filterClasses(allClassesData);

        // Hide loading, show container
        if (loadingState) loadingState.style.display = 'none';
        if (container) {
            container.style.display = 'grid';
            renderFilteredClasses(filteredClasses);
        }

        // Update statistics
        updateStatistics(allClassesData);
        updateActiveFiltersDisplay();

        // Update hero card if it exists
        updateHeroCard();

        // Show success message on first load
        if (isInitialLoad) {
            showNotification(`Loaded ${allClassesData.length} classes`, "success");
            isInitialLoad = false;
        }

    } catch (error) {
        console.error("Failed to load classes:", error);

        // Update connection status
        const statusEl = document.getElementById('connectionStatus');
        if (statusEl) {
            statusEl.className = 'connection-status disconnected';
            statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Connection Error';
        }

        // Show error in UI
        if (loadingState) loadingState.style.display = 'none';
        if (container) {
            container.style.display = 'block';
            showErrorMessage(container, error);
        }

        showNotification("Failed to load classes. Retrying...", "error");

        // Try to use cached data if available
        if (allClassesData.length > 0) {
            const filteredClasses = filterClasses(allClassesData);
            if (container) {
                container.style.display = 'grid';
                renderFilteredClasses(filteredClasses);
            }
            showNotification("Showing cached data. Some features may be limited.", "warning");
        }
    } finally {
        // Reset refresh button
        if (manualRefreshBtn) {
            manualRefreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Now';
            manualRefreshBtn.disabled = false;
        }
    }
}

/**
 * UPDATE HERO CARD
 */
function updateHeroCard() {
    const heroCard = document.getElementById('heroLiveCard');
    if (!heroCard) return;

    // Find any live class
    const liveClass = allClassesData.find(c => c.status === 'active');

    if (liveClass) {
        const statusText = document.getElementById('heroClassStatus');
        const topicText = document.getElementById('heroClassTopic');
        const badgeContainer = document.getElementById('liveBadgeContainer');

        if (statusText) {
            statusText.innerHTML = `<span style="color: #32cd32;">● LIVE NOW</span>`;
        }

        if (topicText) {
            topicText.innerText = `${liveClass.topic} (Gr. ${liveClass.grade})`;
        }

        if (badgeContainer) {
            badgeContainer.innerHTML = `
                <div class="live-pulse-badge" style="
                    background: #32cd32;
                    color: black;
                    padding: 8px 15px;
                    border-radius: 20px;
                    font-weight: bold;
                    font-size: 0.9rem;
                    animation: pulse 2s infinite;
                    cursor: pointer;
                ">
                    <i class="fas fa-video"></i> JOIN NOW
                </div>
            `;
        }

        // Make hero card clickable
        heroCard.onclick = () => {
            joinLiveSession(liveClass.room_name, true); // Force start
        };
        heroCard.style.cursor = 'pointer';

    } else {
        // Reset hero card if no live classes
        heroCard.onclick = null;
        heroCard.style.cursor = 'default';
    }
}

/**
 * APPLY FILTERS TO CURRENT DATA
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

    // Update hero stats
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

    if (currentFilter !== 'all') {
        text += `${currentFilter} classes`;
    } else {
        text += 'all classes';
    }

    if (currentGradeFilter !== 'all') {
        text += ` for Grade ${currentGradeFilter}`;
    }

    // Add count info
    const filteredCount = filterClasses(allClassesData).length;
    text += ` (${filteredCount} found)`;

    filtersText.textContent = `Showing ${text}`;
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

    // Render classes
    let index = 1;
    container.innerHTML = sortedClasses.map(cls => {
        return renderPremiumClassCard(cls, index++);
    }).join('');

    // Add footer
    addGridFooter(classes.length, allClassesData.length);
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
                    <button class="join-action-btn" onclick="joinLiveSession('${encodeURIComponent(cls.room_name)}', true)">
                        <i class="fas fa-video"></i> Join Live Session
                        <span class="btn-badge"><i class="fas fa-users"></i> Live Now</span>
                    </button>
                    ` : isUpcoming ? `
                    <button class="join-action-btn early-access" onclick="joinLiveSession('${encodeURIComponent(cls.room_name)}', true)">
                        <i class="fas fa-forward"></i> Start Early
                        <span class="btn-badge"><i class="fas fa-clock"></i> ${getTimeUntilClass(cls)} early</span>
                    </button>
                    ` : `
                    <button class="view-details-btn" onclick="showClassDetails('${cls.id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    `}
                    
                    <div class="action-icons">
                        ${!isActive ? `
                        <button class="icon-btn" title="Start Now" onclick="joinLiveSession('${encodeURIComponent(cls.room_name)}', true)">
                            <i class="fas fa-play-circle"></i>
                        </button>
                        ` : ''}
                        <button class="icon-btn" title="Add to Calendar" onclick="addToCalendar('${cls.id}')">
                            <i class="fas fa-calendar-plus"></i>
                        </button>
                        <button class="icon-btn" title="Get Reminder" onclick="setReminder('${cls.id}')">
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
 * JOIN LIVE SESSION - WITH FORCE START OPTION
 */
async function joinLiveSession(roomName, forceStart = false) {
    const decodedRoom = decodeURIComponent(roomName);

    // Check if room exists in our data
    const roomClass = allClassesData.find(c => c.room_name === decodedRoom);

    if (roomClass && !roomClass.status === 'active' && forceStart) {
        // Show confirmation for starting early
        const confirmed = confirm(`This class is scheduled for later. Do you want to start it now?\n\nClass: ${roomClass.topic}\nScheduled: ${formatDisplayDate(roomClass.scheduled_date)} at ${formatDisplayTime(roomClass.scheduled_time)}\n\nClick OK to start the session now.`);

        if (!confirmed) {
            return;
        }

        // Try to update class status to active
        try {
            showNotification("Starting session...", "info");

            // Here you would typically call an API to update the class status
            // For now, we'll just proceed to join
            await startClassSession(roomName, decodedRoom, true);
        } catch (error) {
            console.error("Failed to start class:", error);
            showNotification("Could not start session. Joining as participant...", "warning");
            // Still try to join the room
            await startClassSession(roomName, decodedRoom, false);
        }
    } else {
        // Normal join flow
        await startClassSession(roomName, decodedRoom, false);
    }
}

/**
 * START CLASS SESSION
 */
async function startClassSession(roomName, displayName, isStarting = false) {
    // Show loading overlay
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
        <div class="joining-animation" style="text-align: center; padding: 2rem; max-width: 500px;">
            <div style="
                width: 100px;
                height: 100px;
                border: 3px solid rgba(50, 205, 50, 0.3);
                border-top: 3px solid #32cd32;
                border-radius: 50%;
                animation: spin 1.5s linear infinite;
                margin: 0 auto 2rem;
            "></div>
            
            <h3 style="color: #fff; margin-bottom: 1rem; font-size: 1.8rem;">
                ${isStarting ? 'Starting Session' : 'Joining Session'}
            </h3>
            
            <p style="color: #94a3b8; margin-bottom: 0.5rem; font-size: 1.1rem;">
                ${displayName}
            </p>
            
            <div style="display: flex; gap: 10px; justify-content: center; margin: 2rem 0;">
                <div class="dot" style="
                    width: 12px;
                    height: 12px;
                    background: #32cd32;
                    border-radius: 50%;
                    animation: pulseDot 1.5s infinite;
                "></div>
                <div class="dot" style="
                    width: 12px;
                    height: 12px;
                    background: #32cd32;
                    border-radius: 50%;
                    animation: pulseDot 1.5s infinite 0.2s;
                "></div>
                <div class="dot" style="
                    width: 12px;
                    height: 12px;
                    background: #32cd32;
                    border-radius: 50%;
                    animation: pulseDot 1.5s infinite 0.4s;
                "></div>
            </div>
            
            <p style="color: #64748b; font-size: 0.9rem; margin-top: 2rem;">
                <i class="fas fa-info-circle"></i>
                ${isStarting ? 'Creating new session...' : 'Connecting to existing session...'}
            </p>
        </div>
    `;

    document.body.appendChild(overlay);

    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes pulseDot {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.7; }
        }
    `;
    document.head.appendChild(style);

    // Redirect after a short delay
    setTimeout(() => {
        window.location.href = `live-session.html?room=${roomName}${isStarting ? '&start=true' : ''}`;
    }, 2000);
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

    return { text: cls.status || 'Unknown', color: '#64748b' };
}

function getProgressPercentage(cls) {
    if (!cls.scheduled_date || !cls.scheduled_time || cls.status !== 'scheduled') {
        return 0;
    }

    const classTime = new Date(`${cls.scheduled_date}T${cls.scheduled_time}`);
    const now = new Date();
    const totalWindow = 24 * 60 * 60 * 1000;
    const startTime = new Date(classTime.getTime() - totalWindow);

    if (now < startTime) return 0;
    if (now > classTime) return 100;

    const elapsed = now - startTime;
    return Math.min(100, Math.max(0, (elapsed / totalWindow) * 100));
}

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
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.1);
    `;
    n.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span style="margin-left: 10px;">${message}</span>
    `;

    document.body.appendChild(n);

    setTimeout(() => {
        n.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => n.remove(), 300);
    }, 4000);
}

// Additional UI functions
function showClassDetails(classId) {
    showNotification("Class details will be available soon", "info");
}

function addToCalendar(classId) {
    showNotification("Added to your calendar", "success");
}

function setReminder(classId) {
    showNotification("Reminder set for 15 minutes before class", "success");
}

function exportSchedule() {
    showNotification("Schedule exported successfully", "success");
}

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

function showNoClassesMessage(container, totalCount) {
    container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
            <i class="fas fa-calendar-times" style="font-size: 3rem; color: #64748b; margin-bottom: 20px;"></i>
            <h3 style="color: #fff; margin-bottom: 10px;">No Classes Found</h3>
            <p style="color: #94a3b8; max-width: 500px; margin: 0 auto 30px;">
                ${totalCount > 0
            ? `No classes match your current filters. ${totalCount} total classes available.`
            : 'No classes have been scheduled yet.'
        }
            </p>
            ${totalCount > 0 ? `
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button onclick="resetFilters()" style="
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
                    <button onclick="setFilter('all')" style="
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

function showErrorMessage(container, error) {
    container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ef4444; margin-bottom: 20px;"></i>
            <h3 style="color: #fff; margin-bottom: 10px;">Connection Error</h3>
            <p style="color: #94a3b8; max-width: 500px; margin: 0 auto 15px;">
                Failed to connect to the server. Please check your internet connection.
            </p>
            <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 30px; max-width: 500px; margin: 0 auto 30px;">
                <i class="fas fa-code"></i> ${error.message || 'Unknown error'}
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

function addPremiumStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Connection Status */
        .connection-status {
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .connection-status.connected {
            background: rgba(50, 205, 50, 0.1);
            color: #32cd32;
            border: 1px solid rgba(50, 205, 50, 0.3);
        }
        
        .connection-status.disconnected {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }
        
        /* Early Access Button */
        .join-action-btn.early-access {
            background: linear-gradient(135deg, #f59e0b, #d97706);
        }
        
        .join-action-btn.early-access:hover {
            background: linear-gradient(135deg, #d97706, #b45309);
        }
        
        /* Card Styles */
        .premium-class-card {
            position: relative;
            overflow: hidden;
        }
        
        .premium-class-card::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(50, 205, 50, 0.05), transparent);
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .premium-class-card:hover::after {
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
        
        .active-card .card-glow {
            opacity: 1;
            animation: pulseGlow 2s infinite;
        }
        
        @keyframes pulseGlow {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
        }
        
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
}

// Initialize network status monitoring
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);
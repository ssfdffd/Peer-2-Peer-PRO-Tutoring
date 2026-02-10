/**
 * STUDENT VIEW LOGIC - Hero Section Filter Version
 * Premium UI/UX with working grade filtering + live countdown timers
 */

const API_BASE = "https://learnerattendlive.buhle-1ce.workers.dev";
let allClassesData = [];
let currentGradeFilter = 'all';
let countdownIntervals = [];

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function () {
    console.log("Premium student view with hero filter loaded");

    const studentEmail = sessionStorage.getItem('p2p_email');
    if (!studentEmail) {
        showNotification("Please log in first", "error");
        setTimeout(() => { window.location.href = "login.html"; }, 2000);
        return;
    }

    const studentGrade = sessionStorage.getItem('p2p_grade');
    if (studentGrade) currentGradeFilter = studentGrade;

    createHeroFilterSection();
    loadAllClasses();
    setInterval(loadAllClasses, 30000);
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
                    <div class="hero-stats">
                        <div class="stat-item">
                            <div class="stat-value" id="totalClassesStat">0</div>
                            <div class="stat-label">Total Classes</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="upcomingClassesStat">0</div>
                            <div class="stat-label">Upcoming (24h)</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="scheduledClassesStat">0</div>
                            <div class="stat-label">Scheduled</div>
                        </div>
                    </div>
                </div>

                <div class="hero-filters">
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

function generateGradeOptions() {
    let options = '';
    for (let i = 1; i <= 12; i++) {
        const selected = currentGradeFilter == i ? 'selected' : '';
        options += `<option value="${i}" ${selected}>Grade ${i}</option>`;
    }
    return options;
}

function setGradeFilter(grade) {
    currentGradeFilter = grade;
    applyFilters();
    updateActiveFiltersDisplay();
}

function resetFilters() {
    currentGradeFilter = 'all';
    const sel = document.getElementById('gradeFilterSelect');
    if (sel) sel.value = 'all';
    applyFilters();
    updateActiveFiltersDisplay();
    showNotification("Filters have been reset", "success");
}

function applyFilters() {
    if (allClassesData.length === 0) return;
    renderFilteredClasses(filterClasses(allClassesData));
    updateStatistics(allClassesData);
}

function filterClasses(classes) {
    if (currentGradeFilter === 'all') return [...classes];
    return classes.filter(cls => cls.grade == currentGradeFilter);
}

function updateActiveFiltersDisplay() {
    const filtersText = document.getElementById('filtersText');
    if (!filtersText) return;

    let text = currentGradeFilter !== 'all'
        ? `Showing classes for Grade ${currentGradeFilter}`
        : 'Showing all classes';

    if (allClassesData.length > 0) {
        const count = filterClasses(allClassesData).length;
        text += ` (${count} of ${allClassesData.length})`;
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

        if (loadingState) loadingState.style.display = 'none';
        if (container) {
            container.style.display = 'grid';
            renderFilteredClasses(filterClasses(allClassesData));
        }

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

    // Clear all running countdown intervals first
    countdownIntervals.forEach(id => clearInterval(id));
    countdownIntervals = [];

    if (classes.length === 0) {
        showNoClassesMessage(container, allClassesData.length);
        return;
    }

    // Sort by scheduled date/time ascending
    const sorted = [...classes].sort((a, b) => {
        const dateA = new Date(`${a.scheduled_date || '9999-12-31'}T${a.scheduled_time || '23:59'}`);
        const dateB = new Date(`${b.scheduled_date || '9999-12-31'}T${b.scheduled_time || '23:59'}`);
        return dateA - dateB;
    });

    let index = 1;
    container.innerHTML = sorted.map(cls => createClassCard(cls, index++)).join('');

    // Start live countdown timers
    sorted.forEach(cls => {
        if (cls.scheduled_date && cls.scheduled_time) {
            startCountdown(cls);
        }
    });

    addGridFooter(classes.length, allClassesData.length);
}

/**
 * LIVE COUNTDOWN TIMER
 */
function startCountdown(cls) {
    const el = document.getElementById(`countdown-${cls.id}`);
    if (!el) return;

    function tick() {
        const now = new Date();
        const target = new Date(`${cls.scheduled_date}T${cls.scheduled_time}`);
        const diff = target - now;

        if (diff <= 0) {
            el.innerHTML = `<i class="fas fa-circle pulse-dot"></i>&nbsp;Starting now`;
            el.className = 'countdown-display countdown-now';
            return;
        }

        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);

        let parts = [];
        if (days > 0) parts.push(`<span class="cd-unit">${days}<small>d</small></span>`);
        if (hours > 0 || days > 0) parts.push(`<span class="cd-unit">${hours}<small>h</small></span>`);
        parts.push(`<span class="cd-unit">${String(minutes).padStart(2, '0')}<small>m</small></span>`);
        parts.push(`<span class="cd-unit">${String(seconds).padStart(2, '0')}<small>s</small></span>`);

        el.innerHTML = `<i class="fas fa-hourglass-half"></i>&nbsp;${parts.join('')}`;
    }

    tick();
    const id = setInterval(tick, 1000);
    countdownIntervals.push(id);
}

/**
 * CREATE CLASS CARD
 */
function createClassCard(cls, index) {
    const gradeMatch = sessionStorage.getItem('p2p_grade') == cls.grade;
    const hasSchedule = cls.scheduled_date && cls.scheduled_time;

    return `
        <div class="class-card premium-class-card">
            <div class="card-header">
                <div class="class-index">
                    <span class="index-number">${String(index).padStart(2, '0')}</span>
                    <span class="index-label">CLASS</span>
                </div>
                ${hasSchedule
            ? `<div id="countdown-${cls.id}" class="countdown-display">
                           <i class="fas fa-hourglass-half"></i>&nbsp;Calculating...
                       </div>`
            : `<div class="countdown-display countdown-tbd">
                           <i class="fas fa-calendar-times"></i>&nbsp;TBD
                       </div>`
        }
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

                <div class="class-info">
                    <div class="info-row">
                        <i class="fas fa-calendar-alt"></i>
                        <span>${formatDisplayDate(cls.scheduled_date)}</span>
                    </div>
                    <div class="info-row">
                        <i class="fas fa-clock"></i>
                        <span>${formatDisplayTime(cls.scheduled_time)}</span>
                    </div>
                    <div class="info-row">
                        <i class="fas fa-door-open"></i>
                        <span>Room: <span class="room-name">${escapeHtml(cls.room_name || 'TBD')}</span></span>
                    </div>
                </div>
            </div>

            <div class="card-footer">
                <button class="join-btn btn-disabled" disabled>
                    <i class="fas fa-clock"></i> Scheduled
                </button>
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

    const existing = container.querySelector('.grid-footer');
    if (existing) existing.remove();

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
                        </div>` : ''}
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
                ${currentGradeFilter !== 'all' ? `Grade ${currentGradeFilter} filter active` : 'Showing all classes'}
                &nbsp;• Last updated: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
        </div>
    `;
}

/**
 * UPDATE STATISTICS
 */
function updateStatistics(classes) {
    const total = classes.length;
    const upcoming = classes.filter(c => isClassUpcoming(c)).length;
    const scheduled = classes.filter(c => c.scheduled_date && c.scheduled_time).length;

    const el = (id) => document.getElementById(id);
    if (el('totalClassesStat')) el('totalClassesStat').textContent = total;
    if (el('upcomingClassesStat')) el('upcomingClassesStat').textContent = upcoming;
    if (el('scheduledClassesStat')) el('scheduledClassesStat').textContent = scheduled;
}

/**
 * ADD ADDITIONAL STYLES
 */
function addAdditionalStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Premium Class Card */
        .premium-class-card {
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9));
            border-radius: 16px;
            padding: 25px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            backdrop-filter: blur(10px);
            display: flex;
            flex-direction: column;
        }

        .premium-class-card:hover {
            transform: translateY(-5px);
            border-color: rgba(50, 205, 50, 0.3);
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 18px;
            gap: 10px;
        }

        .class-index { display: flex; flex-direction: column; flex-shrink: 0; }

        .index-number {
            font-size: 2rem;
            font-weight: 800;
            background: linear-gradient(135deg, #32cd32, #3b82f6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            line-height: 1;
        }

        .index-label {
            font-size: 0.7rem;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        /* Countdown badge */
        .countdown-display {
            display: flex;
            align-items: center;
            gap: 5px;
            background: rgba(245, 158, 11, 0.12);
            color: #f59e0b;
            padding: 8px 12px;
            border-radius: 12px;
            font-size: 0.82rem;
            font-weight: 600;
            border: 1px solid rgba(245, 158, 11, 0.25);
            flex-wrap: nowrap;
            white-space: nowrap;
        }

        .countdown-display i { font-size: 0.85rem; flex-shrink: 0; }

        .countdown-display .cd-unit {
            font-size: 0.9rem;
            font-weight: 700;
            letter-spacing: 0.3px;
        }

        .countdown-display .cd-unit small {
            font-size: 0.65rem;
            font-weight: 500;
            opacity: 0.8;
            margin-left: 1px;
        }

        .countdown-now {
            background: rgba(50, 205, 50, 0.12);
            color: #32cd32;
            border-color: rgba(50, 205, 50, 0.3);
            animation: pulse 1.5s infinite;
        }

        .countdown-tbd {
            background: rgba(100, 116, 139, 0.12);
            color: #64748b;
            border-color: rgba(100, 116, 139, 0.2);
        }

        .pulse-dot { animation: pulse 1s infinite; }

        .card-body { flex: 1; }

        .class-title {
            color: #fff;
            font-size: 1.2rem;
            margin-bottom: 14px;
            line-height: 1.4;
        }

        .grade-match-badge {
            display: inline-block;
            background: rgba(50, 205, 50, 0.15);
            color: #32cd32;
            padding: 3px 9px;
            border-radius: 10px;
            font-size: 0.72rem;
            margin-left: 8px;
            vertical-align: middle;
        }

        .class-meta {
            display: flex;
            gap: 18px;
            margin-bottom: 14px;
            flex-wrap: wrap;
        }

        .meta-item {
            display: flex;
            align-items: center;
            gap: 7px;
            color: #94a3b8;
            font-size: 0.88rem;
        }

        .meta-item i { color: #32cd32; }

        .class-info { margin-bottom: 18px; }

        .info-row {
            display: flex;
            align-items: center;
            gap: 10px;
            color: #94a3b8;
            margin-bottom: 9px;
            font-size: 0.92rem;
        }

        .info-row i { color: #32cd32; width: 16px; flex-shrink: 0; }

        .room-name { color: #32cd32; font-family: 'Courier New', monospace; }

        .card-footer {
            margin-top: auto;
            padding-top: 18px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .join-btn {
            width: 100%;
            padding: 13px;
            border-radius: 10px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 0.97rem;
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

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.6; }
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

        .grid-footer .stat-display { display: flex; gap: 20px; }
        .grid-footer .stat { text-align: center; }

        .grid-footer .stat-value {
            color: #fff;
            font-size: 1.8rem;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .grid-footer .grade-stat { color: #f59e0b !important; }
        .grid-footer .stat-label { color: #94a3b8; font-size: 0.9rem; }

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

        /* Notification */
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
            to   { transform: translateX(0);    opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isClassUpcoming(cls) {
    if (!cls.scheduled_date || !cls.scheduled_time) return false;
    const diff = new Date(`${cls.scheduled_date}T${cls.scheduled_time}`) - new Date();
    return diff > 0 && diff <= 86400000;
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
        const [h, m] = timeString.split(':');
        const hour = parseInt(h);
        return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
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
    setTimeout(() => {
        n.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => n.remove(), 300);
    }, 4000);
}

function joinLiveSession(roomName) {
    showNotification(`Joining ${decodeURIComponent(roomName)}...`, "success");
    setTimeout(() => { window.location.href = `live-session.html?room=${roomName}`; }, 1000);
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
            ? 'No classes match your grade filter. Try selecting a different grade.'
            : 'No classes have been scheduled yet.'}
            </p>
            <button onclick="resetFilters()" style="
                background:#32cd32;color:#000;border:none;padding:12px 30px;
                border-radius:8px;cursor:pointer;font-weight:bold;
                display:flex;align-items:center;gap:8px;margin:0 auto;">
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
                background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid #ef4444;
                padding:12px 30px;border-radius:8px;cursor:pointer;font-weight:bold;
                display:flex;align-items:center;gap:8px;margin:0 auto;">
                <i class="fas fa-redo"></i> Try Again
            </button>
        </div>
    `;
}
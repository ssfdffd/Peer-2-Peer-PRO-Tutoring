/**
 * STUDENT VIEW - COMPLETE IMPLEMENTATION
 * Features:
 * - Payment status check from users table
 * - Subject and grade filtering
 * - Beautiful UI with hero section
 * - Payment-gated join buttons
 * - Real-time updates
 */
const API_BASE = "https://liveclass.buhle-1ce.workers.dev";
let allClasses = [];
let currentFilter = 'all'; // Status filter: all, live, upcoming
let currentGrade = 'all';
let currentSubject = 'all';
let userPaymentStatus = null;

document.addEventListener('DOMContentLoaded', function () {
    console.log('🎓 Student view loaded with filters');

    // Check login
    const email = sessionStorage.getItem('p2p_email');
    if (!email) {
        alert('Please login first');
        window.location.href = 'login.html';
        return;
    }

    // Load user payment status FIRST
    loadUserPaymentStatus(email).then(() => {
        loadClasses();
    });

    // Set grade filter from profile
    const savedGrade = sessionStorage.getItem('p2p_grade');
    if (savedGrade && savedGrade !== 'null' && savedGrade !== 'undefined') {
        currentGrade = savedGrade;
        document.getElementById('gradeFilter').value = savedGrade;
    }

    // Auto-refresh every 30 seconds when tab is visible
    setInterval(() => {
        if (!document.hidden) {
            const email = sessionStorage.getItem('p2p_email');
            if (email) {
                loadUserPaymentStatus(email).then(() => {
                    loadClasses();
                });
            }
        }
    }, 30000);
});

// Load user payment status from users table
async function loadUserPaymentStatus(email) {
    try {
        console.log('💳 Loading user payment status...');
        const response = await fetch(`${API_BASE}/api/user-payment-status?email=${encodeURIComponent(email)}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            userPaymentStatus = data;
            console.log('✅ User payment status loaded:', userPaymentStatus);
        } else {
            console.error('Failed to load payment status:', data.error);
            userPaymentStatus = {
                payment_status: 'pending',
                amount_paid: 0,
                is_paid: false
            };
        }

    } catch (error) {
        console.error('Load payment status error:', error);
        userPaymentStatus = {
            payment_status: 'pending',
            amount_paid: 0,
            is_paid: false
        };
    }
}

async function loadClasses() {
    const container = document.getElementById('liveClassesContainer');
    const loading = document.getElementById('loadingState');
    if (loading) loading.style.display = 'block';
    if (container) container.style.display = 'none';

    try {
        console.log('📤 Loading student classes...');
        const response = await fetch(`${API_BASE}/api/get-all-classes`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        allClasses = await response.json();
        console.log('📥 Classes received:', allClasses.length);

        if (loading) loading.style.display = 'none';
        if (container) {
            container.style.display = 'grid';
            applyFilters();
        }

    } catch (error) {
        console.error('Load error:', error);
        if (loading) {
            loading.innerHTML = `
        <div class="spinner" style="border-color: rgba(239, 68, 68, 0.3); border-top-color: #ef4444;"></div>
        <p style="color: #ef4444; margin-top: 15px; font-size: 1.1rem;">Failed to load classes</p>
        <button onclick="loadClasses()" style="
          background: linear-gradient(45deg, #32cd32, #10b981);
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 14px;
          margin-top: 20px;
          cursor: pointer;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 4px 15px rgba(50, 205, 50, 0.4);
        ">
          <i class="fas fa-redo"></i> Try Again
        </button>
      `;
        }
    }
}

// Apply all filters (status, grade, subject)
function applyFilters() {
    let filtered = [...allClasses];

    // Filter by grade
    if (currentGrade !== 'all') {
        filtered = filtered.filter(c =>
            c.grade && c.grade.toString().toLowerCase() === currentGrade.toString().toLowerCase()
        );
    }

    // Filter by subject
    if (currentSubject !== 'all') {
        filtered = filtered.filter(c =>
            c.subject && c.subject.toString().toLowerCase() === currentSubject.toString().toLowerCase()
        );
    }

    // Filter by status (live/upcoming)
    if (currentFilter === 'live') {
        filtered = filtered.filter(c => c.status === 'active');
    } else if (currentFilter === 'upcoming') {
        filtered = filtered.filter(c =>
            c.status === 'scheduled' && isClassUpcoming(c)
        );
    }

    renderClasses(filtered);
    updateStats();
}

// Subject filter handler
function applySubjectFilter(subject) {
    currentSubject = subject;
    applyFilters();
}

// Grade filter handler
function applyGradeFilter(grade) {
    currentGrade = grade;
    applyFilters();
}

// Reset all filters
function resetFilters() {
    currentFilter = 'all';
    currentGrade = 'all';
    currentSubject = 'all';

    // Reset UI elements
    document.getElementById('subjectFilter').value = 'all';
    document.getElementById('gradeFilter').value = 'all';

    applyFilters();
}

function renderClasses(classes) {
    const container = document.getElementById('liveClassesContainer');
    if (!container) return;

    if (classes.length === 0) {
        container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-calendar-times"></i>
        <h3>No Classes Found</h3>
        <p>Try adjusting your filters or check back later</p>
      </div>
    `;
        return;
    }

    // Get current user's payment status
    const isUserPaid = userPaymentStatus?.is_paid || false;

    container.innerHTML = classes.map((cls, i) => {
        const isLive = cls.status === 'active';
        const isUpcoming = cls.status === 'scheduled' && isClassUpcoming(cls);
        const badgeClass = isLive ? 'badge-live' : (isUpcoming ? 'badge-upcoming' : 'badge-scheduled');
        const badgeText = isLive ? '🔴 LIVE NOW' : (isUpcoming ? '⏰ UPCOMING' : '📅 SCHEDULED');

        // Payment status UI
        let joinButtonHTML = '';
        if (isLive) {
            if (isUserPaid) {
                joinButtonHTML = `
          <button class="join-button btn-join" onclick="joinClass('${cls.room_name}')">
            <i class="fas fa-video"></i> Join Live Session
          </button>
        `;
            } else {
                joinButtonHTML = `
          <button class="join-button btn-disabled" disabled>
            <i class="fas fa-lock"></i> Payment Required
          </button>
          <div class="payment-notice">
            <i class="fas fa-info-circle"></i> Complete payment to access live classes
          </div>
        `;
            }
        } else {
            joinButtonHTML = `
        <div style="text-align: center; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 16px; margin-top: 5px;">
          <i class="fas fa-clock" style="margin-right: 8px;"></i>
          ${isUpcoming ? 'Starts in ' + getTimeUntil(cls) : 'Scheduled for later'}
        </div>
      `;
        }

        return `
      <div class="premium-class-card ${isLive ? 'active-card' : ''}">
        <div class="class-header">
          <div class="class-number">CLASS ${String(i + 1).padStart(2, '0')}</div>
          <span class="class-badge ${badgeClass}">${badgeText}</span>
        </div>
        
        <h3 class="class-title">
          ${escapeHtml(cls.topic || 'Untitled Class')}
        </h3>
        
        <div class="class-meta">
          <div class="meta-item">
            <i class="fas fa-book"></i>
            <span>${escapeHtml(cls.subject || 'General')}</span>
          </div>
          <div class="meta-item">
            <i class="fas fa-graduation-cap"></i>
            <span>Grade ${cls.grade || 'N/A'}</span>
          </div>
          <div class="meta-item">
            <i class="fas fa-user-tie"></i>
            <span>${escapeHtml(cls.tutor_name || 'Tutor')}</span>
          </div>
        </div>
        
        <div class="class-timing">
          <div>
            <div class="timing-label">Date</div>
            <div class="timing-value">${formatDate(cls.scheduled_date)}</div>
          </div>
          <div>
            <div class="timing-label">Time</div>
            <div class="timing-value">${formatTime(cls.scheduled_time)}</div>
          </div>
          <div>
            <div class="timing-label">Status</div>
            <div class="timing-value" style="color: ${isLive ? '#32cd32' : '#f59e0b'};">
              ${isLive ? 'Live' : (isUpcoming ? getTimeUntil(cls) : 'Scheduled')}
            </div>
          </div>
        </div>
        
        ${joinButtonHTML}
      </div>
    `;
    }).join('');
}

function joinClass(roomName) {
    window.open(`https://meet.jit.si/${roomName}`, '_blank', 'noopener,noreferrer');
}

function isClassUpcoming(cls) {
    if (!cls.scheduled_date || !cls.scheduled_time) return false;
    const classTime = new Date(`${cls.scheduled_date}T${cls.scheduled_time}`);
    if (isNaN(classTime.getTime())) return false;

    const now = new Date();
    const diff = classTime - now;
    return diff > 0 && diff <= 86400000; // Within next 24 hours
}

function getTimeUntil(cls) {
    if (!cls.scheduled_date || !cls.scheduled_time) return 'Soon';
    const classTime = new Date(`${cls.scheduled_date}T${cls.scheduled_time}`);
    if (isNaN(classTime.getTime())) return 'Soon';

    const now = new Date();
    const diff = classTime - now;
    if (diff <= 0) return 'Starting soon';

    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

function formatDate(dateStr) {
    if (!dateStr) return 'TBD';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(timeStr) {
    if (!timeStr) return 'TBD';
    if (timeStr.includes(':')) {
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h, 10);
        return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
    }
    return timeStr;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateStats() {
    const total = allClasses.length;
    const live = allClasses.filter(c => c.status === 'active').length;
    const upcoming = allClasses.filter(c =>
        c.status === 'scheduled' && isClassUpcoming(c)
    ).length;

    document.getElementById('totalClassesStat').textContent = total;
    document.getElementById('liveClassesStat').textContent = live;
    document.getElementById('upcomingClassesStat').textContent = upcoming;
}

// Make functions globally accessible
window.loadClasses = loadClasses;
window.joinClass = joinClass;
window.applySubjectFilter = applySubjectFilter;
window.applyGradeFilter = applyGradeFilter;
window.resetFilters = resetFilters;
window.loadUserPaymentStatus = loadUserPaymentStatus;
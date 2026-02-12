/**
STUDENT VIEW - PAYMENT STATUS FIX
Fixed: Join button now properly disabled for unpaid users
Kept: Your existing color scheme and styling
*/
const API_BASE = "https://liveclass.buhle-1ce.workers.dev";
let allClasses = [];
let currentFilter = 'all';
let currentGrade = 'all';
let userPaymentStatus = null;
let isUserPaid = false; // Global flag for payment status

document.addEventListener('DOMContentLoaded', function () {
    console.log('🎓 Student view loaded');

    // Check login
    const email = sessionStorage.getItem('p2p_email');
    if (!email) {
        alert('Please login first');
        window.location.href = 'login.html';
        return;
    }

    // Load user payment status FIRST
    loadUserPaymentStatus(email).then(() => {
        console.log('🔍 Payment check complete. User paid:', isUserPaid);
        loadClasses();
    });

    // Set grade filter from profile
    const savedGrade = sessionStorage.getItem('p2p_grade');
    if (savedGrade && savedGrade !== 'null' && savedGrade !== 'undefined') {
        currentGrade = savedGrade;
    }

    setupFilters();

    // Auto-refresh every 30 seconds when tab is visible
    setInterval(() => {
        if (!document.hidden) {
            const email = sessionStorage.getItem('p2p_email');
            if (email) {
                loadUserPaymentStatus(email).then(() => {
                    console.log('🔄 Auto-refresh payment check. User paid:', isUserPaid);
                    loadClasses();
                });
            }
        }
    }, 30000);
});

// Load user payment status from users table
async function loadUserPaymentStatus(email) {
    try {
        console.log('💳 Loading user payment status for:', email);
        const response = await fetch(`${API_BASE}/api/user-payment-status?email=${encodeURIComponent(email)}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            userPaymentStatus = data;
            isUserPaid = data.is_paid; // Set global flag
            console.log('✅ User payment status loaded:', {
                payment_status: data.payment_status,
                is_paid: data.is_paid,
                amount_paid: data.amount_paid
            });
        } else {
            console.error('Failed to load payment status:', data.error);
            userPaymentStatus = {
                payment_status: 'pending',
                amount_paid: 0,
                is_paid: false
            };
            isUserPaid = false;
        }

    } catch (error) {
        console.error('Load payment status error:', error);
        userPaymentStatus = {
            payment_status: 'pending',
            amount_paid: 0,
            is_paid: false
        };
        isUserPaid = false;
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
        <i class="fas fa-exclamation-triangle" style="color: #ef4444; font-size: 2rem;"></i>
        <p style="color: #ef4444; margin-top: 1rem;">Failed to load classes</p>
        <button onclick="loadClasses()" style="
          background: #32cd32;
          color: black;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          margin-top: 1rem;
          cursor: pointer;
          font-weight: bold;
        ">
          <i class="fas fa-redo"></i> Try Again
        </button>
      `;
        }
    }
}

function applyFilters() {
    let filtered = [...allClasses];

    // Filter by grade
    if (currentGrade !== 'all') {
        filtered = filtered.filter(c =>
            c.grade && c.grade.toString() === currentGrade.toString()
        );
    }

    // Filter by status
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

function renderClasses(classes) {
    const container = document.getElementById('liveClassesContainer');
    if (!container) return;

    if (classes.length === 0) {
        container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
        <i class="fas fa-calendar-times" style="font-size: 3rem; color: #64748b;"></i>
        <h3 style="color: #fff; margin-top: 20px;">No Classes Found</h3>
        <p style="color: #94a3b8;">Try adjusting your filters</p>
      </div>
    `;
        return;
    }

    const userGrade = sessionStorage.getItem('p2p_grade');

    container.innerHTML = classes.map((cls, i) => {
        const isLive = cls.status === 'active';
        const isScheduledAndUpcoming = cls.status === 'scheduled' && isClassUpcoming(cls);

        // CRITICAL FIX: Check global isUserPaid flag
        const canJoin = isLive && isUserPaid;
        const showPaymentRequired = isLive && !isUserPaid;

        return `
      <div class="premium-class-card ${isLive ? 'active-card' : ''}" style="
        background: rgba(30, 41, 59, 0.7);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 16px;
        padding: 20px;
      ">
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
          <span style="color: #64748b;">CLASS ${String(i + 1).padStart(2, '0')}</span>
          <span style="
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: bold;
            background: ${isLive ? 'rgba(50,205,50,0.15)' : 'rgba(59,130,246,0.15)'};
            color: ${isLive ? '#32cd32' : '#3b82f6'};
          ">
            <i class="fas ${isLive ? 'fa-broadcast-tower' : 'fa-calendar'}"></i>
            ${isLive ? 'LIVE NOW' : (isScheduledAndUpcoming ? 'UPCOMING' : 'SCHEDULED')}
          </span>
        </div>
        
        <h3 style="color: #fff; margin: 0 0 15px 0; font-size: 1.2rem;">
          ${escapeHtml(cls.topic || 'Untitled Class')}
          ${cls.grade && userGrade && cls.grade.toString() === userGrade.toString() ?
                ' <span style="background: rgba(50,205,50,0.2); color: #32cd32; padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; margin-left: 10px;">Your Grade</span>' : ''}
        </h3>
        
        <div style="display: flex; gap: 15px; margin-bottom: 15px; color: #94a3b8;">
          <div><i class="fas fa-graduation-cap"></i> Grade ${cls.grade || 'N/A'}</div>
          <div><i class="fas fa-user-tie"></i> ${escapeHtml(cls.tutor_name || 'Tutor')}</div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; padding: 15px 0; border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 15px;">
          <div>
            <div style="color: #64748b; font-size: 0.8rem;">DATE</div>
            <div style="color: #fff; font-weight: bold;">${formatDate(cls.scheduled_date)}</div>
          </div>
          <div>
            <div style="color: #64748b; font-size: 0.8rem;">TIME</div>
            <div style="color: #fff; font-weight: bold;">${formatTime(cls.scheduled_time)}</div>
          </div>
          <div>
            <div style="color: #64748b; font-size: 0.8rem;">STATUS</div>
            <div style="color: ${isLive ? '#32cd32' : '#f59e0b'}; font-weight: bold;">
              ${isLive ? 'In Progress' : getTimeUntil(cls)}
            </div>
          </div>
        </div>
        
        ${canJoin ? `
          <button onclick="joinClass('${cls.room_name}')" style="
            width: 100%;
            background: #32cd32;
            color: black;
            border: none;
            padding: 12px;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
          ">
            <i class="fas fa-video"></i> Join Live Session
          </button>
        ` : showPaymentRequired ? `
          <div style="
            width: 100%;
            background: #6b7280;
            color: #fff;
            border: none;
            padding: 12px;
            border-radius: 8px;
            font-weight: bold;
            cursor: not-allowed;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            opacity: 0.7;
          ">
            <i class="fas fa-lock"></i> Payment Required to Join
          </div>
          <div style="
            margin-top: 10px;
            padding: 10px;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid #ef4444;
            border-radius: 8px;
            color: #ef4444;
            font-size: 0.9rem;
            text-align: center;
          ">
            <i class="fas fa-info-circle"></i> Please complete payment to access live classes
          </div>
        ` : `
          <div style="color: #94a3b8; text-align: center; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px;">
            <i class="fas fa-clock"></i> Not started yet
          </div>
        `}
      </div>
    `;
    }).join('');
}

function joinClass(roomName) {
    if (!isUserPaid) {
        alert('⚠️ Payment required! Please complete your payment to join live classes.');
        return;
    }
    window.open(`https://meet.jit.si/${roomName}`, '_blank');
}

function isClassUpcoming(cls) {
    if (!cls.scheduled_date || !cls.scheduled_time) return false;
    const classTime = new Date(`${cls.scheduled_date}T${cls.scheduled_time}`);
    if (isNaN(classTime.getTime())) return false;

    const now = new Date();
    const diff = classTime - now;
    return diff > 0 && diff <= 86400000;
}

function getTimeUntil(cls) {
    if (!cls.scheduled_date || !cls.scheduled_time) return 'Scheduled';
    const classTime = new Date(`${cls.scheduled_date}T${cls.scheduled_time}`);
    if (isNaN(classTime.getTime())) return 'Scheduled';

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
    const totalEl = document.getElementById('totalClassesStat');
    const liveEl = document.getElementById('liveClassesStat');
    const upcomingEl = document.getElementById('upcomingClassesStat');

    if (totalEl) totalEl.textContent = total;
    if (liveEl) liveEl.textContent = live;
    if (upcomingEl) upcomingEl.textContent = upcoming;
}

function setupFilters() {
    window.setFilter = function (filter) {
        currentFilter = filter;
        applyFilters();
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });
    };

    window.setGradeFilter = function (grade) {
        currentGrade = grade;
        applyFilters();
        const select = document.getElementById('gradeFilterSelect');
        if (select) select.value = grade;
    };

    window.resetFilters = function () {
        currentFilter = 'all';
        currentGrade = sessionStorage.getItem('p2p_grade') || 'all';
        applyFilters();
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === 'all');
        });
        const select = document.getElementById('gradeFilterSelect');
        if (select) select.value = currentGrade;
    };
}

// Make functions globally accessible
window.loadClasses = loadClasses;
window.joinClass = joinClass;
window.setFilter = window.setFilter || function () { };
window.setGradeFilter = window.setGradeFilter || function () { };
window.resetFilters = window.resetFilters || function () { };
window.loadUserPaymentStatus = loadUserPaymentStatus;
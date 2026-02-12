/**
 * PEER-2-PEER PRO: CREATE.JS - FIXED VERSION
 * CRITICAL FIXES:
 * 1. Fixed result.success typo
 * 2. Fixed broken string literals and quotes
 * 3. Added null safety for session storage
 * 4. Cleaned HTML attribute quoting
 */
const API_BASE = "https://liveclass.buhle-1ce.workers.dev";

// Global function to start a live class
window.goLive = async function (roomName) {
    console.log("🚀 Starting Jitsi session:", roomName);
    const email = sessionStorage.getItem('p2p_email');

    if (!email) {
        showNotification("Please log in first", "error");
        return;
    }

    // Disable all start buttons for this room
    document.querySelectorAll(`[data-room="${roomName}"]`).forEach(btn => {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
        btn.disabled = true;
    });

    try {
        // 1. Mark class as active in database
        const response = await fetch(`${API_BASE}/api/go-live`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, roomName })
        });

        const result = await response.json();

        if (result.success) {
            showNotification("Opening Jitsi Meet...", "success");

            // 2. Open Jitsi in new tab after brief delay
            setTimeout(() => {
                const jitsiUrl = `https://meet.jit.si/${roomName}`;
                console.log("Jitsi URL:", jitsiUrl);

                const newWindow = window.open(jitsiUrl, '_blank');

                if (!newWindow) {
                    showNotification("Pop-up blocked! Please allow pop-ups for this site.", "warning");
                    window.location.href = jitsiUrl;
                }

                // Refresh classes list after opening
                setTimeout(() => loadTutorClasses(email), 2000);
            }, 1000);
        } else {
            throw new Error(result.error || "Unknown error starting class");
        }
    } catch (err) {
        console.error("Go Live error:", err);
        showNotification("Failed to start: " + err.message, "error");
        loadTutorClasses(email);
    }
};

// Global function to join as student (reused in tutor view)
window.joinClass = function (roomName) {
    console.log("🎓 Joining class:", roomName);
    const jitsiUrl = `https://meet.jit.si/${roomName}`;

    const newWindow = window.open(jitsiUrl, '_blank');
    if (!newWindow) {
        showNotification("Pop-up blocked! Please allow pop-ups.", "warning");
        window.location.href = jitsiUrl;
    }
};

document.addEventListener('DOMContentLoaded', function () {
    console.log("📋 Create page loaded");

    // Set default date/time (next hour)
    const today = new Date();
    document.getElementById('classDate').value = today.toISOString().split('T')[0];

    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    document.getElementById('classTime').value =
        `${nextHour.getHours().toString().padStart(2, '0')}:00`;

    // Load saved tutor info
    const savedEmail = sessionStorage.getItem('p2p_email');
    const savedName = sessionStorage.getItem('p2p_name');

    if (savedEmail) {
        document.getElementById('tutorEmailInput').value = savedEmail;
        document.getElementById('tutorNameInput').value = savedName || "Tutor";
        loadTutorClasses(savedEmail);
    } else {
        showNotification("Please log in first", "warning");
        setTimeout(() => window.location.href = "tutor-portal.html", 2000);
    }

    // Auto-refresh every 30 seconds
    setInterval(() => {
        if (savedEmail && !document.hidden) loadTutorClasses(savedEmail);
    }, 30000);
});

/**
 * SCHEDULE NEW CLASS
 */
async function scheduleClass() {
    const topic = document.getElementById('classTopic').value.trim();
    const grade = document.getElementById('classGrade').value;
    const date = document.getElementById('classDate').value;
    const time = document.getElementById('classTime').value;
    const email = document.getElementById('tutorEmailInput').value.trim();
    const name = document.getElementById('tutorNameInput').value.trim();

    // Validation
    if (!topic || !date || !time || !email) {
        showNotification("Please fill all required fields", "error");
        return;
    }

    const btn = document.querySelector('.btn-launch');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scheduling...';

    try {
        const payload = {
            email,
            name,
            topic,
            grade,
            scheduled_date: date,
            scheduled_time: time
        };

        const response = await fetch(`${API_BASE}/api/schedule-class`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            showNotification(`✅ Class Scheduled! Room: ${result.roomName}`, "success");
            document.getElementById('classTopic').value = "";
            document.getElementById('classGrade').value = "Grade 1";
            loadTutorClasses(email);
        } else {
            throw new Error(result.error || "Failed to schedule class");
        }
    } catch (err) {
        console.error("Schedule error:", err);
        showNotification("Error: " + err.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

/**
 * LOAD TUTOR'S CLASSES
 */
async function loadTutorClasses(email) {
    const list = document.getElementById('myMeetingsList');
    if (!list) return;

    list.innerHTML = `
    <div class="loading-state">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Loading classes...</p>
    </div>
  `;

    try {
        const response = await fetch(`${API_BASE}/api/get-classes?email=${encodeURIComponent(email)}`);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const classes = await response.json();

        if (!classes || classes.length === 0) {
            list.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-calendar-plus"></i>
          <h4>No Classes Scheduled</h4>
          <p>Schedule your first class!</p>
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
        <p>Failed to load classes. Check your connection.</p>
        <button onclick="loadTutorClasses('${email}')" class="btn-retry">
          <i class="fas fa-redo"></i> Retry
        </button>
      </div>
    `;
    }
}

/**
 * RENDER CLASSES LIST
 */
function renderTutorClasses(classes) {
    const list = document.getElementById('myMeetingsList');
    if (!list) return;

    // Sort: active → scheduled → completed
    const sortedClasses = [...classes].sort((a, b) => {
        const statusOrder = { 'active': 1, 'scheduled': 2, 'completed': 3 };
        return (statusOrder[a.status] || 4) - (statusOrder[b.status] || 4) ||
            new Date(a.scheduled_date) - new Date(b.scheduled_date);
    });

    list.innerHTML = sortedClasses.map(cls => {
        const isActive = cls.status === 'active';
        const isCompleted = cls.status === 'completed';
        const today = new Date().toISOString().split('T')[0];
        const isToday = cls.scheduled_date === today;

        // Status badge
        let statusBadge = '';
        if (isActive) statusBadge = '<span class="badge-live-now">🔴 LIVE NOW</span>';
        else if (isCompleted) statusBadge = '<span class="badge-completed">✅ COMPLETED</span>';
        else statusBadge = '<span class="badge-scheduled">⏰ SCHEDULED</span>';

        // Action button
        let actionButton = '';
        if (isActive) {
            actionButton = `
        <button onclick="window.joinClass('${cls.room_name}')" class="btn-join-live">
          <i class="fas fa-sign-in-alt"></i> Join Class
        </button>
      `;
        } else if (!isCompleted) {
            actionButton = `
        <button onclick="window.goLive('${cls.room_name}')" 
                data-room="${cls.room_name}" 
                class="btn-start-small">
          <i class="fas fa-play"></i> Start Live
        </button>
      `;
        } else {
            actionButton = '<button disabled class="btn-completed">Completed</button>';
        }

        return `
      <div class="meeting-item ${isActive ? 'active-live' : ''}">
        <div class="meeting-header">
          <h4>${escapeHtml(cls.topic) || 'Untitled Class'}</h4>
          ${isToday ? '<span class="badge-today">📅 TODAY</span>' : ''}
        </div>
        
        <div class="room-info">
          <small><i class="fas fa-link"></i> Room: ${cls.room_name}</small>
          <br>
          <small>Students join at: https://meet.jit.si/${cls.room_name}</small>
        </div>
        
        <div class="meeting-details">
          <div><i class="fas fa-graduation-cap"></i> Grade: ${cls.grade || 'N/A'}</div>
          <div><i class="fas fa-calendar"></i> Date: ${formatDisplayDate(cls.scheduled_date)}</div>
          <div><i class="fas fa-clock"></i> Time: ${formatDisplayTime(cls.scheduled_time)}</div>
        </div>
        
        <div class="meeting-footer">
          ${statusBadge}
          ${actionButton}
        </div>
      </div>
    `;
    }).join('');
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function showNotification(msg, type) {
    // Create notification element if doesn't exist
    let notif = document.getElementById('global-notification');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'global-notification';
        notif.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 25px;
      border-radius: 8px;
      color: white;
      font-weight: bold;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      animation: slideIn 0.3s, fadeOut 0.5s 2.5s forwards;
    `;
        document.body.appendChild(notif);
    }

    // Set color based on type
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b'
    };

    notif.style.background = colors[type] || '#3b82f6';
    notif.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-triangle' : 'fa-exclamation'}"></i>
      <span>${msg}</span>
    </div>
  `;

    // Reset animation
    notif.style.animation = 'none';
    setTimeout(() => {
        notif.style.animation = 'slideIn 0.3s, fadeOut 0.5s 2.5s forwards';
    }, 10);
}

function formatDisplayDate(dateStr) {
    if (!dateStr) return 'TBD';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

function formatDisplayTime(timeStr) {
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

// Make functions globally accessible
window.scheduleClass = scheduleClass;
window.loadTutorClasses = loadTutorClasses;
window.goLive = window.goLive || function () { };
window.joinClass = window.joinClass || function () { };
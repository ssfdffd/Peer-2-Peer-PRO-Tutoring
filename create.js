/**
 * PEER-2-PEER PRO: CREATE.JS (v2.0)
 * Updated to handle scheduling with Date/Time and Live status syncing.
 */

const API_BASE = "https://liveclass.buhle-1ce.workers.dev";

document.addEventListener('DOMContentLoaded', function () {
    // Initial animations
    animateFormEntrance();
    animatePageLoad();
    setupInputAnimations();

    // Pull tutor info from sessionStorage (Set by Login Worker)
    const savedEmail = sessionStorage.getItem('p2p_email');
    const savedName = sessionStorage.getItem('p2p_name');

    if (savedEmail) {
        document.getElementById('tutorEmailInput').value = savedEmail;
        document.getElementById('tutorNameInput').value = savedName || "";
        loadTutorClasses(savedEmail);
    }
});

/**
 * SCHEDULE A CLASS
 * Captures data from the form and sends it to the Cloudflare Worker
 */
async function scheduleClass() {
    const topic = document.getElementById('classTopic').value.trim();
    const grade = document.getElementById('classGrade').value;
    const date = document.getElementById('classDate').value; // New Field
    const time = document.getElementById('classTime').value; // New Field
    const email = document.getElementById('tutorEmailInput').value.trim();
    const name = document.getElementById('tutorNameInput').value.trim();

    // Validation
    if (!topic || !date || !time || !email) {
        showNotification("Please fill in Topic, Date, and Time", "error");
        if (typeof shakeForm === 'function') shakeForm();
        return;
    }

    const btn = document.querySelector('.btn-launch');
    btn.disabled = true;
    btn.innerHTML = '<span>Scheduling...</span> <i class="fas fa-spinner fa-spin"></i>';

    try {
        const response = await fetch(`${API_BASE}/api/schedule-class`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                name,
                topic,
                grade,
                scheduled_date: date,
                scheduled_time: time
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification("Class Scheduled Successfully!", "success");
            // Reset fields
            document.getElementById('classTopic').value = '';
            // Refresh the list
            loadTutorClasses(email);
        } else {
            showNotification(data.error || "Schedule failed", "error");
        }
    } catch (error) {
        console.error("Schedule Error:", error);
        showNotification("Network error. Check connection.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Schedule & Broadcast</span> <i class="fas fa-paper-plane"></i>';
    }
}

/**
 * LOAD TUTOR CLASSES
 * Fetches the list of classes for the specific tutor
 */
async function loadTutorClasses(email) {
    const container = document.getElementById('myMeetingsList');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE}/api/get-classes?email=${email}`);
        const classes = await response.json();

        container.innerHTML = '';

        if (classes.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#64748b; margin-top:20px;">No classes scheduled for today.</p>';
            return;
        }

        classes.forEach(cls => {
            const isLive = cls.status === 'active';

            container.innerHTML += `
                <div class="meeting-item" style="border-left: 5px solid ${isLive ? '#ff4d4d' : '#32cd32'}">
                    <div class="meeting-info">
                        <h4>
                            ${cls.topic} 
                            ${isLive ? '<span class="live-indicator"><i class="fas fa-circle"></i> LIVE</span>' : ''}
                        </h4>
                        <p><i class="fas fa-calendar-day"></i> ${cls.scheduled_date} | <i class="fas fa-clock"></i> ${cls.scheduled_time}</p>
                        <small class="grade-pill">${cls.grade}</small>
                    </div>
                    <div class="meeting-actions">
                        <button class="btn-start-small" onclick="startMeeting('${cls.room_name}')">
                            ${isLive ? 'REJOIN' : '<i class="fas fa-play"></i> START'}
                        </button>
                    </div>
                </div>
            `;
        });
    } catch (e) {
        console.error("Load error", e);
        container.innerHTML = '<p style="color:red;">Error loading classes.</p>';
    }
}

/**
 * START MEETING
 * Updates status to 'active' so students can see it, then redirects
 */
async function startMeeting(roomName) {
    const email = sessionStorage.getItem('p2p_email');

    // 1. Notify Worker that this class is now LIVE
    try {
        await fetch(`${API_BASE}/api/go-live`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, roomName })
        });
    } catch (err) {
        console.warn("Could not sync live status, but proceeding to room.");
    }

    // 2. Redirect to the session page
    window.location.href = `live-session.html?room=${roomName}`;
}

/**
 * UI NOTIFICATIONS
 */
function showNotification(message, type) {
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.innerHTML = `<span>${message}</span>`;

    // Dynamic styling
    Object.assign(n.style, {
        position: 'fixed', top: '20px', right: '20px', padding: '15px 25px',
        background: type === 'success' ? '#32cd32' : '#ef4444',
        color: 'white', fontWeight: 'bold',
        borderRadius: '10px', zIndex: '9999',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        fontFamily: 'sans-serif'
    });

    document.body.appendChild(n);
    setTimeout(() => n.remove(), 4000);
}

/**
 * ANIMATIONS (Requires Anime.js if available)
 */
function animateFormEntrance() {
    if (typeof anime !== 'undefined') {
        anime({
            targets: '.input-group, .btn-launch',
            translateY: [30, 0],
            opacity: [0, 1],
            delay: anime.stagger(100, { start: 300 }),
            easing: 'easeOutCubic',
            duration: 800
        });
    }
}

function animatePageLoad() {
    if (typeof anime !== 'undefined') {
        anime({
            targets: '.form-header',
            translateY: [-20, 0],
            opacity: [0, 1],
            duration: 1000,
            easing: 'easeOutCubic'
        });
    }
}

function setupInputAnimations() {
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            if (typeof anime !== 'undefined') {
                anime({
                    targets: input,
                    scale: 1.02,
                    duration: 200,
                    easing: 'easeOutQuad'
                });
            }
        });
        input.addEventListener('blur', () => {
            if (typeof anime !== 'undefined') {
                anime({
                    targets: input,
                    scale: 1,
                    duration: 200,
                    easing: 'easeOutQuad'
                });
            }
        });
    });
}
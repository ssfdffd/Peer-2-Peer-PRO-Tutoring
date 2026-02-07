/**
 * PEER-2-PEER PRO: FINAL UPDATED CREATE.JS
 * Fixes: Date/Time null issues and display synchronization
 */

const API_BASE = "https://liveclass.buhle-1ce.workers.dev";

document.addEventListener('DOMContentLoaded', function () {
    animateFormEntrance();
    animatePageLoad();
    setupInputAnimations();

    // Pull tutor info from sessionStorage
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
 */
async function scheduleClass() {
    // Select inputs
    const topic = document.getElementById('classTopic').value.trim();
    const grade = document.getElementById('classGrade').value;
    const date = document.getElementById('classDate').value;
    const time = document.getElementById('classTime').value;
    const email = document.getElementById('tutorEmailInput').value.trim();
    const name = document.getElementById('tutorNameInput').value.trim();

    // Validation
    if (!topic || !date || !time || !email) {
        showNotification("Please fill in all fields (Topic, Date, and Time)", "error");
        return;
    }

    const btn = document.querySelector('.btn-launch');
    const originalContent = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<span>Scheduling...</span> <i class="fas fa-spinner fa-spin"></i>';

    try {
        const payload = {
            email: email,
            name: name,
            topic: topic,
            grade: grade,
            scheduled_date: date,  // Matches Worker Variable
            scheduled_time: time   // Matches Worker Variable
        };

        const response = await fetch(`${API_BASE}/api/schedule-class`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            showNotification("Class Broadcasted Successfully!", "success");
            // Clear the topic field for next entry
            document.getElementById('classTopic').value = "";
            // Refresh the sidebar list
            loadTutorClasses(email);
        } else {
            showNotification(result.error || "Broadcast failed", "error");
        }
    } catch (err) {
        console.error("Schedule Error:", err);
        showNotification("Connection error. Please try again.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
}

/**
 * FETCH TUTOR'S CLASSES
 */
async function loadTutorClasses(email) {
    const list = document.getElementById('myMeetingsList');
    if (!list) return;

    try {
        const response = await fetch(`${API_BASE}/api/get-classes?email=${encodeURIComponent(email)}`);
        const classes = await response.json();

        if (!classes || classes.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:#64748b; padding:20px;">No classes scheduled yet.</p>';
            return;
        }

        renderTutorClasses(classes);
    } catch (err) {
        console.error("Load classes error:", err);
    }
}

/**
 * RENDER THE SIDEBAR LIST
 */
function renderTutorClasses(classes) {
    const list = document.getElementById('myMeetingsList');
    list.innerHTML = classes.map(cls => `
        <div class="meeting-item animate__animated animate__fadeIn">
            <div class="meeting-info">
                <div class="meeting-topic">${cls.topic}</div>
                <div class="meeting-details">
                    <span><i class="fas fa-graduation-cap"></i> ${cls.grade}</span><br>
                    <span><i class="fas fa-calendar-alt"></i> ${cls.scheduled_date || 'No Date'}</span> | 
                    <span><i class="fas fa-clock"></i> ${cls.scheduled_time || 'No Time'}</span>
                </div>
            </div>
            <div class="meeting-actions">
                ${cls.status === 'active' ?
            `<span class="badge-live-now"><i class="fas fa-circle"></i> LIVE</span>` :

            // Inside your renderTutorClasses function:
            `<button onclick="goLive('${cls.room_name}')" class="btn-start-small">
    <i class="fas fa-play"></i> START
</button>`
        }
            </div>
        </div>
    `).join('');
}

/**
 * GO LIVE FUNCTION
 */
async function goLive(roomName) {
    const email = sessionStorage.getItem('p2p_email');

    if (!roomName) {
        showNotification("Error: Room name missing", "error");
        return;
    }

    try {
        // 1. Tell the Worker to set status to 'active'
        const response = await fetch(`${API_BASE}/api/go-live`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, roomName })
        });

        const result = await response.json();

        if (result.success) {
            // 2. Redirect to the classroom with the room parameter
            // This MUST match the roomName used in live-session.html
            window.location.href = `live-session.html?room=${roomName}`;
        } else {
            showNotification(result.error || "Failed to sync live status", "error");
        }
    } catch (err) {
        console.error("Go Live Error:", err);
        showNotification("Connection error. Try again.", "error");
    }
}

/**
 * NOTIFICATIONS & UTILS
 */
function showNotification(message, type) {
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.innerHTML = `<span>${message}</span>`;
    Object.assign(n.style, {
        position: 'fixed', top: '20px', right: '20px', padding: '15px 25px',
        background: type === 'success' ? '#32cd32' : '#ef4444', color: 'white',
        borderRadius: '10px', zIndex: '9999', boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        fontFamily: 'sans-serif'
    });
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 4000);
}

function setupInputAnimations() {
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('focus', () => { input.parentElement.classList.add('focused'); });
        input.addEventListener('blur', () => { input.parentElement.classList.remove('focused'); });
    });
}

function animateFormEntrance() { /* Anime.js Logic ... */ }
function animatePageLoad() { /* Anime.js Logic ... */ }
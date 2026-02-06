/**
 * PEER-2-PEER PRO: FINAL CREATE.JS
 * Pointing to the Live Class Worker
 */

const API_BASE = "https://liveclass.buhle-1ce.workers.dev";

document.addEventListener('DOMContentLoaded', function () {
    animateFormEntrance();
    animatePageLoad();
    setupInputAnimations();

    const savedEmail = sessionStorage.getItem('p2p_email');
    const savedName = sessionStorage.getItem('p2p_name');

    if (savedEmail) {
        document.getElementById('tutorEmailInput').value = savedEmail;
        document.getElementById('tutorNameInput').value = savedName || "";
        loadTutorClasses(savedEmail);
    }
});

async function scheduleClass() {
    const name = document.getElementById('tutorNameInput').value.trim();
    const email = document.getElementById('tutorEmailInput').value.trim();
    const topic = document.getElementById('classTopic').value.trim();
    const grade = document.getElementById('classGrade').value;

    if (!name || !email || !topic) {
        showNotification("Please fill in all fields", "error");
        return;
    }

    const btn = document.querySelector('.btn-launch');
    btn.disabled = true;
    btn.innerHTML = '<span>Broadcasting...</span> <i class="fas fa-spinner fa-spin"></i>';

    try {
        const response = await fetch(`${API_BASE}/api/schedule-class`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name, topic, grade })
        });

        if (!response.ok) throw new Error("Worker connection failed");

        const result = await response.json();
        if (result.success) {
            showNotification(`Class Live!`, 'success');
            document.getElementById('classTopic').value = '';
            loadTutorClasses(email);
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        showNotification("Failed to connect. Check Worker CORS/Deployment.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Schedule & Broadcast</span> <i class="fas fa-paper-plane"></i>';
    }
}

async function loadTutorClasses(email) {
    const container = document.getElementById('myMeetingsList');
    if (!email || !container) return;

    try {
        const res = await fetch(`${API_BASE}/api/get-classes?email=${encodeURIComponent(email)}`);
        const classes = await res.json();

        container.innerHTML = '';

        if (!classes || classes.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#8892b0; padding:20px;">No active classes.</p>';
            return;
        }

        classes.forEach(meeting => {
            // We pass meeting.room_name directly into the goLive function
            const card = document.createElement('div');
            card.className = 'meeting-item';
            card.innerHTML = `
                <div class="meeting-info">
                    <h4>${meeting.topic}</h4>
                    <span><i class="fas fa-graduation-cap"></i> ${meeting.grade} • Active</span>
                </div>
                <div class="meeting-actions">
                    <button class="btn-start-small" onclick="goLive('${meeting.room_name}')">
                        <i class="fas fa-play"></i> START CLASS
                    </button>
                </div>`;
            container.appendChild(card);
        });
    } catch (e) {
        console.error("Load Error:", e);
    }
}

/**
 * Handles the redirect to the Jitsi Session page
 */
function goLive(roomName) {
    if (!roomName) {
        showNotification("Error: Room name missing", "error");
        return;
    }

    // Clean the room name to ensure it's a valid string for Jitsi
    const cleanRoom = roomName.trim().replace(/['"]+/g, '');

    showNotification("Launching Classroom...", "success");

    // We use a clean redirect to your session page
    setTimeout(() => {
        window.location.href = `live-session.html?room=${encodeURIComponent(cleanRoom)}`;
    }, 600);
}

// --- ANIMATIONS & UI UTILITIES ---

function showNotification(message, type = 'info') {
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.innerHTML = `<span>${message}</span>`;
    Object.assign(n.style, {
        position: 'fixed', top: '20px', right: '20px', padding: '15px 25px',
        background: type === 'success' ? '#32cd32' : '#ef4444', color: 'white',
        borderRadius: '10px', zIndex: '9999', boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
    });
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 4000);
}

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
            if (typeof anime !== 'undefined') anime({ targets: input, scale: 1.02, duration: 300 });
        });
        input.addEventListener('blur', () => {
            if (typeof anime !== 'undefined') anime({ targets: input, scale: 1, duration: 300 });
        });
    });
}
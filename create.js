/**
 * PEER-2-PEER PRO: FINAL CREATE.JS
 * Fully integrated with your Unified Worker & D1 Database
 */

const API_BASE = "https://liveclass.buhle-1ce.workers.dev"; // Your Worker URL

document.addEventListener('DOMContentLoaded', function () {
    // Initial UI Animations
    animateFormEntrance();
    animatePageLoad();
    setupInputAnimations();

    // 1. Auto-fill from login session (if available)
    const savedEmail = sessionStorage.getItem('p2p_email');
    const savedName = sessionStorage.getItem('p2p_name');

    if (savedEmail) {
        document.getElementById('tutorEmailInput').value = savedEmail;
        document.getElementById('tutorNameInput').value = savedName || "";
        loadTutorClasses(savedEmail); // Load existing classes immediately
    }
});

// ==========================================
// 2. SAVE CLASS TO D1 DATABASE
// ==========================================
async function scheduleClass() {
    const name = document.getElementById('tutorNameInput').value.trim();
    const email = document.getElementById('tutorEmailInput').value.trim();
    const topic = document.getElementById('classTopic').value.trim();
    const grade = document.getElementById('classGrade').value;

    if (!name || !email || !topic) {
        showNotification("Please fill in all fields", "error");
        shakeForm();
        return;
    }

    const btn = document.querySelector('.btn-launch');
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span>Saving to DB...</span> <i class="fas fa-spinner fa-spin"></i>';

    try {
        const response = await fetch(`${API_BASE}/api/schedule-class`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name, topic, grade })
        });

        const result = await response.json();

        if (result.success) {
            showNotification(`Class "${topic}" scheduled!`, 'success');
            document.getElementById('classTopic').value = ''; // Clear topic
            loadTutorClasses(email); // Refresh the list from DB
        } else {
            throw new Error(result.error || "Save failed");
        }
    } catch (err) {
        showNotification(err.message, 'error');
        shakeForm();
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
}

// ==========================================
// 3. LOAD CLASSES FROM D1 DATABASE
// ==========================================
async function loadTutorClasses(email) {
    const container = document.getElementById('myMeetingsList');
    if (!email || !container) return;

    try {
        const res = await fetch(`${API_BASE}/api/get-classes?email=${encodeURIComponent(email)}`);
        const classes = await res.json();

        container.innerHTML = ''; // Clear list

        if (!classes || classes.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#8892b0; padding:20px;">No upcoming lessons.</p>';
            return;
        }

        classes.forEach(meeting => {
            const card = document.createElement('div');
            card.className = 'meeting-item';
            card.innerHTML = `
                <div class="meeting-info">
                    <h4>${meeting.topic}</h4>
                    <span><i class="fas fa-graduation-cap"></i> ${meeting.grade} • Active</span>
                    <p style="color: #8892b0; margin-top: 5px; font-size: 0.8rem;">Room: ${meeting.room_name}</p>
                </div>
                <div class="meeting-actions">
                    <button class="btn-start-small" onclick="goLive('${meeting.room_name}')">
                        <i class="fas fa-play"></i> START
                    </button>
                </div>
            `;
            container.appendChild(card);

            anime({
                targets: card,
                translateX: [20, 0],
                opacity: [0, 1],
                duration: 500,
                easing: 'easeOutCubic'
            });
        });
    } catch (e) {
        console.error("Load Error:", e);
    }
}

// ==========================================
// 4. JITSI REDIRECT
// ==========================================
function goLive(roomName) {
    // Redirect to your live session page where Jitsi is embedded
    window.location.href = `live-session.html?room=${roomName}`;
}

// ==========================================
// 5. UI UTILITIES & ANIMATIONS
// ==========================================
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

function shakeForm() {
    anime({
        targets: '.p2p-form',
        translateX: [-10, 10, -10, 10, 0],
        easing: 'easeInOutSine',
        duration: 400
    });
}

function animateFormEntrance() {
    anime({
        targets: '.input-group, .btn-launch',
        translateY: [30, 0],
        opacity: [0, 1],
        delay: anime.stagger(100, { start: 300 }),
        easing: 'easeOutCubic',
        duration: 800
    });
}

function animatePageLoad() {
    anime({
        targets: '.form-header',
        translateY: [-20, 0],
        opacity: [0, 1],
        duration: 1000,
        easing: 'easeOutCubic'
    });
}

function setupInputAnimations() {
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('focus', () => anime({ targets: input, scale: 1.02, duration: 300 }));
        input.addEventListener('blur', () => anime({ targets: input, scale: 1, duration: 300 }));
    });
}
/**
 * PEER-2-PEER PRO: FINAL CREATE.JS
 * Integrated with Anime.js and D1 Worker Backend
 */

const API_BASE = "https://liveclass.buhle-1ce.workers.dev";

document.addEventListener('DOMContentLoaded', function () {
    animateFormEntrance();
    animatePageLoad();
    setupInputAnimations();

    // Auto-load if email exists in session, otherwise wait for input
    const savedEmail = sessionStorage.getItem('p2p_email');
    if (savedEmail) {
        document.getElementById('tutorEmailInput').value = savedEmail;
        document.getElementById('tutorNameInput').value = sessionStorage.getItem('p2p_name') || "";
        loadTutorClasses(savedEmail);
    }
});

// --- API INTEGRATION ---

/**
 * Saves a new class to the D1 Database via the Worker
 */
async function scheduleClass() {
    const tutorName = document.getElementById('tutorNameInput').value.trim();
    const tutorEmail = document.getElementById('tutorEmailInput').value.trim();
    const topic = document.getElementById('classTopic').value.trim();
    const grade = document.getElementById('classGrade').value;

    if (!tutorName || !tutorEmail || !topic || !grade) {
        showNotification('Please fill in all fields', 'error');
        shakeForm();
        return;
    }

    const btn = document.querySelector('.btn-launch');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span>Saving...</span> <i class="fas fa-spinner fa-spin"></i>';

    try {
        const response = await fetch(`${API_BASE}/api/schedule-class`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: tutorEmail,
                name: tutorName,
                topic: topic,
                grade: grade
            })
        });

        const result = await response.json();

        if (result.success) {
            showNotification(`Class scheduled successfully!`, 'success');
            document.getElementById('classTopic').value = ''; // Clear topic field
            loadTutorClasses(tutorEmail); // Refresh the list
        } else {
            throw new Error(result.error || "Failed to save");
        }
    } catch (err) {
        showNotification(err.message, 'error');
        shakeForm();
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

/**
 * Fetches real data from DB based on provided email
 */
async function loadTutorClasses(email) {
    const container = document.getElementById('myMeetingsList');
    if (!email || !container) return;

    try {
        // Calling your worker's GET endpoint
        const res = await fetch(`${API_BASE}/api/get-classes?email=${encodeURIComponent(email)}`);
        const classes = await res.json();

        container.innerHTML = '';

        if (!classes || classes.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#8892b0; padding:20px;">No classes found for this email.</p>';
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

            // Animation for new cards
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
        container.innerHTML = '<p style="color: #ef4444;">Error loading classes.</p>';
    }
}

// --- UI & ANIMATIONS ---

function animateFormEntrance() {
    anime({
        targets: '.input-group, .btn-launch',
        translateY: [30, 0],
        opacity: [0, 1],
        delay: anime.stagger(80, { start: 200 }),
        easing: 'easeOutCubic',
        duration: 800
    });
}

function animatePageLoad() {
    anime({
        targets: '.form-header',
        translateY: [-20, 0],
        opacity: [0, 1],
        duration: 800,
        easing: 'easeOutCubic'
    });
}

function setupInputAnimations() {
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            anime({ targets: input, scale: 1.01, duration: 200, easing: 'easeOutCubic' });
        });
        input.addEventListener('blur', () => {
            anime({ targets: input, scale: 1, duration: 200, easing: 'easeOutCubic' });
        });
    });
}

function goLive(roomName) {
    showNotification(`Entering Room: ${roomName}`, 'success');
    setTimeout(() => {
        window.location.href = `live-session.html?room=${roomName}`;
    }, 800);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<span>${message}</span>`;

    Object.assign(notification.style, {
        position: 'fixed', top: '20px', right: '20px', padding: '15px 25px',
        backgroundColor: type === 'success' ? '#32cd32' : '#ef4444',
        color: 'white', borderRadius: '10px', zIndex: '9999', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        fontFamily: 'sans-serif', fontWeight: 'bold'
    });

    document.body.appendChild(notification);
    setTimeout(() => {
        anime({
            targets: notification,
            opacity: 0,
            translateX: 20,
            duration: 500,
            complete: () => notification.remove()
        });
    }, 3000);
}

function shakeForm() {
    anime({
        targets: '.p2p-form',
        translateX: [-10, 10, -10, 10, 0],
        easing: 'easeInOutSine',
        duration: 400
    });
}
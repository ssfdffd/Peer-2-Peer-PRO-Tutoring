/**
 * PEER-2-PEER PRO: FINAL CREATE.JS
 * Integrated with Anime.js and D1 Worker Backend
 */

const API_BASE = "https://liveclass.buhle-1ce.workers.dev"; // Your Worker URL

document.addEventListener('DOMContentLoaded', function () {
    animateFormEntrance();
    animatePageLoad();
    setupInputAnimations();
    loadTutorClasses(); // Fetch real data from DB on load
});

// --- API INTEGRATION ---

/**
 * Saves a new class to the D1 Database via the Worker
 */
async function scheduleClass() {
    const topic = document.getElementById('classTopic').value.trim();
    const grade = document.getElementById('classGrade').value;
    // Note: We use the tutor data stored in sessionStorage during login
    const tutorEmail = sessionStorage.getItem('p2p_email');
    const tutorName = sessionStorage.getItem('p2p_name');

    // Validation
    if (!topic || !grade) {
        showNotification('Please fill in all required fields', 'error');
        shakeForm();
        return;
    }

    if (!tutorEmail || !tutorName) {
        showNotification('Session expired. Please log in again.', 'error');
        return;
    }

    // Visual Feedback (Button Loading)
    const btn = document.querySelector('.btn-launch');
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span>Saving to DB...</span> <i class="fas fa-spinner fa-spin"></i>';

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
            showNotification(`Class "${topic}" scheduled successfully!`, 'success');
            clearForm();
            loadTutorClasses(); // Refresh the list from the database
        } else {
            throw new Error(result.error || "Failed to schedule");
        }
    } catch (err) {
        console.error("Worker Error:", err);
        showNotification(err.message, 'error');
        shakeForm();
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
}

/**
 * Fetches scheduled classes from the database
 */
async function loadTutorClasses() {
    const email = sessionStorage.getItem('p2p_email');
    const container = document.getElementById('myMeetingsList');
    if (!email || !container) return;

    try {
        const res = await fetch(`${API_BASE}/api/get-classes?email=${email}`);
        const classes = await res.json();

        container.innerHTML = ''; // Clear current list

        if (classes.length === 0) {
            showEmptyState();
            return;
        }

        classes.forEach(meeting => {
            addMeetingCard({
                id: meeting.id,
                topic: meeting.topic,
                grade: meeting.grade,
                room: meeting.room_name,
                description: `Room: ${meeting.room_name} | Created: ${new Date(meeting.created_at).toLocaleDateString()}`
            });
        });
    } catch (e) {
        console.error("Load Error:", e);
    }
}

// --- ANIMATION LOGIC (Anime.js) ---

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
        input.addEventListener('focus', () => {
            anime({ targets: input, scale: 1.02, duration: 300, easing: 'easeOutCubic' });
        });
        input.addEventListener('blur', () => {
            anime({ targets: input, scale: 1, duration: 300, easing: 'easeOutCubic' });
        });
    });
}

function addMeetingCard(meeting) {
    const container = document.getElementById('myMeetingsList');
    const card = document.createElement('div');
    card.className = 'meeting-item';
    card.innerHTML = `
        <div class="meeting-info">
            <h4>${meeting.topic}</h4>
            <span><i class="fas fa-graduation-cap"></i> ${meeting.grade} • Active</span>
            <p style="color: #64748b; margin-top: 8px; font-size: 0.8rem;">${meeting.description}</p>
        </div>
        <div class="meeting-actions">
            <button class="btn-start-small" onclick="goLive('${meeting.room}')">
                <i class="fas fa-play"></i> START
            </button>
        </div>
    `;
    container.insertBefore(card, container.firstChild);

    anime({
        targets: card,
        translateX: [50, 0],
        opacity: [0, 1],
        duration: 800,
        easing: 'easeOutCubic'
    });
}

function goLive(roomName) {
    showNotification(`Launching Room: ${roomName}`, 'success');
    setTimeout(() => {
        // Redirect to your Jitsi implementation or live session page
        window.location.href = `live-session.html?room=${roomName}`;
    }, 1000);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<span>${message}</span>`;

    // Basic styling for dynamic notification
    Object.assign(notification.style, {
        position: 'fixed', top: '20px', right: '20px', padding: '15px 25px',
        backgroundColor: type === 'success' ? '#32cd32' : '#ef4444',
        color: 'white', borderRadius: '10px', zIndex: '9999', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    });

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

function clearForm() {
    document.getElementById('classTopic').value = '';
}

function showEmptyState() {
    document.getElementById('myMeetingsList').innerHTML = '<p style="text-align:center; color:#64748b;">No classes scheduled yet.</p>';
}

function shakeForm() {
    anime({
        targets: '.p2p-form',
        translateX: [-10, 10, -10, 10, 0],
        easing: 'easeInOutSine',
        duration: 400
    });
}
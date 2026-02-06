/**
 * PEER-2-PEER STUDENT VIEW LOGIC
 * Fetches from Unified Live Worker and handles Live Status
 */
const API_BASE = "https://liveclass.buhle-1ce.workers.dev";

document.addEventListener('DOMContentLoaded', () => {
    fetchClasses();
    // Auto-refresh every 30 seconds to sync "Live" status from database
    setInterval(fetchClasses, 30000);
});

async function fetchClasses() {
    const container = document.getElementById('liveClassesContainer');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE}/api/get-all-classes`);
        const classes = await response.json();

        if (!classes || classes.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; padding: 50px;">
                    <i class="fas fa-video-slash" style="font-size: 3rem; color: #475569; margin-bottom: 15px;"></i>
                    <p>No classes are currently scheduled.</p>
                </div>`;
            return;
        }

        container.innerHTML = ''; // Clear current view

        classes.forEach(cls => {
            // Status check: Worker sets status to 'active' when tutor clicks START
            const isLive = cls.status === 'active';
            const card = document.createElement('div');
            card.className = `class-card ${isLive ? 'active-live' : ''}`;

            const timerId = `timer-${cls.id}`;
            const targetDateTime = `${cls.scheduled_date}T${cls.scheduled_time}:00`;

            card.innerHTML = `
                ${isLive ? '<div class="live-badge"><i class="fas fa-circle"></i> LIVE NOW</div>' : ''}
                <div class="class-header">
                    <h3>${cls.topic}</h3>
                    <span class="grade-tag">${cls.grade}</span>
                </div>
                <div class="tutor-info">
                    <i class="fas fa-user-tie"></i> <span>Tutor: ${cls.tutor_name}</span>
                </div>
                <div class="schedule-info">
                    <p><i class="fas fa-calendar-alt"></i> ${cls.scheduled_date}</p>
                    <p id="${timerId}" class="countdown-text">${isLive ? 'Started' : 'Calculating...'}</p>
                </div>
                <button class="join-btn ${isLive ? 'btn-enabled' : 'btn-disabled'}" 
                        onclick="${isLive ? `joinRoom('${cls.room_name}')` : ''}"
                        ${!isLive ? 'disabled' : ''}>
                    ${isLive ? 'JOIN CLASSROOM' : 'WAITING FOR TUTOR'}
                </button>
            `;
            container.appendChild(card);

            if (!isLive) {
                startCountdown(timerId, targetDateTime);
            }
        });
    } catch (err) {
        console.error("Fetch error:", err);
        container.innerHTML = "<p>Error loading classes. Please check your connection.</p>";
    }
}

function startCountdown(elementId, targetDate) {
    const timerElement = document.getElementById(elementId);
    if (!timerElement) return;

    const update = () => {
        const now = new Date().getTime();
        const target = new Date(targetDate).getTime();
        const diff = target - now;

        if (diff <= 0) {
            timerElement.innerHTML = "Starting shortly...";
            return;
        }

        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        timerElement.innerHTML = `Starts in: ${hours}h ${minutes}m ${seconds}s`;
    };

    update();
    setInterval(update, 1000);
}

function joinRoom(roomName) {
    window.location.href = `student-session.html?room=${roomName}`;
}
/**
 * Updated Student View Logic
 */
const API_BASE = "https://liveclass.buhle-1ce.workers.dev";

document.addEventListener('DOMContentLoaded', () => {
    fetchClasses();
    // Auto-refresh every 30 seconds to update Live status
    setInterval(fetchClasses, 30000);
});

async function fetchClasses() {
    // 1. Check that this ID matches your HTML container
    const container = document.getElementById('liveClassesContainer');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE}/api/get-all-classes`);
        const classes = await response.json();

        // 2. Clear loader and check for empty list
        if (!classes || classes.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; padding: 50px;">
                    <i class="fas fa-video-slash" style="font-size: 3rem; color: #475569; margin-bottom: 15px;"></i>
                    <p>No classes are currently scheduled.</p>
                </div>`;
            return;
        }

        container.innerHTML = '';

        classes.forEach(cls => {
            // 3. Status Check: Ensure 'active' matches your Worker's 'go-live' logic
            const isLive = cls.status === 'active';
            const card = document.createElement('div');
            card.className = `class-card ${isLive ? 'active-live' : ''}`;

            const timerId = `timer-${cls.id}`;
            const targetDateTime = `${cls.scheduled_date}T${cls.scheduled_time}:00`;

            card.innerHTML = `
                <div class="status-badge ${isLive ? 'badge-live' : 'badge-waiting'}">
                    ${isLive ? '<i class="fas fa-circle"></i> LIVE NOW' : 'UPCOMING'}
                </div>
                <h3>${cls.topic}</h3>
                <p class="tutor-info"><i class="fas fa-user-tie"></i> ${cls.tutor_name}</p>
                
                <div class="countdown-timer" id="${timerId}">
                    ${isLive ? '<span class="live-text">Session is in progress</span>' : 'Calculating...'}
                </div>

                <div class="class-meta">
                    <span><i class="fas fa-graduation-cap"></i> ${cls.grade}</span> | 
                    <span><i class="fas fa-calendar"></i> ${cls.scheduled_date}</span>
                </div>

                <button class="btn-join ${isLive ? 'btn-enabled' : 'btn-disabled'}" 
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
    window.location.href = `live-session.html?room=${roomName}`;
}
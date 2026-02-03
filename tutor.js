const LIVE_API_BASE = "https://p2p-live-worker.buhle-1ce.workers.dev";
/**
 * TUTOR SESSION GUARD
 * Prevents unauthorized access and updates UI names
 */
function checkTutorSession() {
    const email = sessionStorage.getItem('p2p_email');
    const userType = sessionStorage.getItem('p2p_userType'); // Matches your login.js key

    // 1. Check if session exists and is a tutor
    if (!email || userType !== 'tutor') {
        console.warn("No Tutor session found, redirecting to login.");
        window.location.href = "login.html";
        return;
    }

    // 2. Update the Sidebar/Header Name
    const nameDisplay = document.getElementById('tutorNameDisplay');
    if (nameDisplay) {
        const fullName = sessionStorage.getItem('p2p_name') || "Tutor";
        nameDisplay.innerText = fullName;
    }

    console.log("✅ Tutor Session Verified:", email);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', checkTutorSession);
/**
 * Saves class details to the database and refreshes the meeting list.
 */
async function scheduleClass() {
    const topic = document.getElementById('classTopic').value.trim();
    const desc = document.getElementById('classDesc').value.trim();
    const email = sessionStorage.getItem('p2p_email');

    if (!topic || !desc) return alert("Please fill in both topic and description.");

    try {
        const response = await fetch(`${LIVE_API_BASE}/api/schedule-class`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, topic, description: desc })
        });

        const result = await response.json();
        if (result.success) {
            alert("✅ Class Scheduled successfully!");
            document.getElementById('classTopic').value = '';
            document.getElementById('classDesc').value = '';
            loadMyMeetings(); // Refresh the list
        }
    } catch (err) {
        alert("Failed to schedule class.");
    }
}

/**
 * Fetches scheduled meetings and displays them with a "Go Live" button.
 */
async function loadMyMeetings() {
    const email = sessionStorage.getItem('p2p_email');
    const listContainer = document.getElementById('myMeetingsList');

    try {
        const response = await fetch(`${LIVE_API_BASE}/api/my-meetings?email=${email}`);
        const meetings = await response.json();

        if (meetings.length === 0) {
            listContainer.innerHTML = '<div class="loading-state">No meetings scheduled yet.</div>';
            return;
        }

        listContainer.innerHTML = meetings.map(m => `
            <div class="management-card" style="margin-bottom: 10px; border-left: 4px solid var(--pro-green);">
                <h4>${m.topic}</h4>
                <p style="font-size: 0.9em; color: #666;">${m.description}</p>
                <div style="margin-top: 10px;">
                    ${m.status === 'scheduled'
                ? `<button onclick="goLive(${m.id})" class="btn-deploy" style="background:#ff4757; padding: 8px 15px;">Go Live Now</button>`
                : `<span class="badge" style="background:var(--navy-bg)">Live Room Active</span>`
            }
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error("Error loading meetings:", err);
    }
}

/**
 * Generates the Jitsi room and injects the video iframe.
 */
async function goLive(classId) {
    const email = sessionStorage.getItem('p2p_email');
    const videoArea = document.getElementById('video-area');

    try {
        const response = await fetch(`${LIVE_API_BASE}/api/go-live`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, classId })
        });

        const result = await response.json();
        if (result.success) {
            document.getElementById('live-setup-section').style.display = 'none';
            videoArea.style.display = 'block';
            videoArea.innerHTML = "";

            const options = {
                roomName: result.roomName,
                width: '100%',
                height: 700,
                parentNode: videoArea,
                configOverwrite: { startWithAudioMuted: true, disableInviteFunctions: true },
                interfaceConfigOverwrite: { TOOLBAR_BUTTONS: ['microphone', 'camera', 'chat', 'raisehand', 'security'] },
                userInfo: { displayName: `Tutor: ${sessionStorage.getItem('p2p_name') || 'Official'}` }
            };

            const api = new JitsiMeetExternalAPI("meet.jit.si", options);
            api.addEventListener('videoConferenceLeft', () => location.reload());
        }
    } catch (err) {
        alert("Could not start live session.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadMyMeetings();
});


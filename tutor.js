// Point to your Unified Worker URL
const API_BASE = "https://damp-art-617fp2p-authentification-login.buhle-1ce.workers.dev";

/**
 * 1. Session Guard
 */
/**
 * TUTOR SESSION GUARD
 */
function checkTutorSession() {
    const email = sessionStorage.getItem('p2p_email');

    // Check both potential keys for the role
    const userType = sessionStorage.getItem('p2p_userType') || sessionStorage.getItem('p2p_role');

    console.log("Session Check:", { email, userType });

    // 1. Only redirect if email is missing OR the user is definitely NOT a tutor
    if (!email || userType !== 'tutor') {
        console.warn("Unauthorized access attempt. Redirecting to login.");
        window.location.href = "login.html";
        return;
    }

    // 2. Update UI
    const nameDisplay = document.getElementById('tutorNameDisplay');
    if (nameDisplay) {
        nameDisplay.innerText = sessionStorage.getItem('p2p_name') || "Tutor";
    }
}

// Run immediately
document.addEventListener('DOMContentLoaded', checkTutorSession);
/**
 * 2. Schedule Class to D1 via Worker
 */
async function scheduleClass() {
    const topic = document.getElementById('classTopic').value.trim();
    const desc = document.getElementById('classDesc').value.trim();
    const grade = document.getElementById('classGrade').value;
    const email = sessionStorage.getItem('p2p_email');

    if (!topic || !desc) return alert("Please provide a topic and description.");

    try {
        const response = await fetch(`${API_BASE}/api/schedule-class`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, topic, description: desc, grade })
        });

        const result = await response.json();
        if (result.success) {
            alert(`✅ ${topic} scheduled for ${grade}`);
            location.reload();
        }
    } catch (err) {
        console.error("Schedule Error:", err);
        alert("Failed to reach server.");
    }
}

/**
 * 3. Fetch Classes from Worker
 */
async function loadMyMeetings() {
    const email = sessionStorage.getItem('p2p_email');
    const listContainer = document.getElementById('myMeetingsList');

    try {
        const response = await fetch(`${API_BASE}/api/get-classes?email=${email}`);
        const classes = await response.json();

        if (!classes || classes.length === 0) {
            listContainer.innerHTML = "<p>No lessons scheduled. Create one above!</p>";
            return;
        }

        listContainer.innerHTML = classes.map(cls => `
            <div style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 15px; border-left: 4px solid #32cd32; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <div>
                        <span style="font-size: 0.8rem; background: #000033; color: #7fdff0; padding: 2px 8px; border-radius: 4px;">${cls.grade}</span>
                        <h4 style="margin: 8px 0 5px 0; color: #000033;">${cls.topic}</h4>
                        <p style="font-size: 0.9rem; color: #666;">${cls.description}</p>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 0.8rem; display:block; margin-bottom: 10px; color: ${cls.status === 'live' ? '#32cd32' : '#999'}">
                            ● ${cls.status.toUpperCase()}
                        </span>
                        ${cls.status === 'scheduled' ?
                `<button onclick="goLive(${cls.id})" class="btn-deploy" style="padding: 5px 15px; background: #ff4757;">Start Lesson</button>`
                : `<button class="btn-deploy" style="padding: 5px 15px; background: #ccc;" disabled>Lesson Active</button>`
            }
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        listContainer.innerHTML = "<p>Error loading classes. Please check connection.</p>";
    }
}

/**
 * 4. Launch Jitsi Meeting
 */
async function goLive(classId) {
    const email = sessionStorage.getItem('p2p_email');
    const videoArea = document.getElementById('video-area');

    try {
        const response = await fetch(`${API_BASE}/api/go-live`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, classId })
        });

        const result = await response.json();
        if (result.success) {
            document.getElementById('live-setup-section').style.display = 'none';
            videoArea.style.display = 'block';

            const options = {
                roomName: result.roomName,
                width: '100%',
                height: 700,
                parentNode: videoArea,
                userInfo: { displayName: sessionStorage.getItem('p2p_name') }
            };

            const api = new JitsiMeetExternalAPI("meet.jit.si", options);
            api.addEventListener('videoConferenceLeft', () => location.reload());
        }
    } catch (err) {
        alert("Launch failed.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkTutorSession();
    loadMyMeetings();
});

function logout() {
    sessionStorage.clear();
    window.location.href = 'login.html';
}
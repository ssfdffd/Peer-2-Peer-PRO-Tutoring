/**
 * PEER-2-PEER TUTOR CONTROL CENTER
 * Integration: Jitsi Meet External API
 * Backend: Cloudflare Workers + D1 Database
 */

// Replace with your actual Live Worker URL
const LIVE_API_BASE = "https://p2p-live-worker.buhle-1ce.workers.dev";

/**
 * STEP 1: Set Class Details
 * Captures the topic and description, then reveals the "Start" button.
 */
function setClassDetails() {
    const topic = document.getElementById('classTopic').value.trim();
    const desc = document.getElementById('classDesc').value.trim();

    if (!topic || !desc) {
        alert("Please enter both a topic and a lesson description to proceed.");
        return;
    }

    // Store details in sessionStorage for the next step
    sessionStorage.setItem('temp_class_topic', topic);
    sessionStorage.setItem('temp_class_desc', desc);

    // Update UI: Hide form, show the "Start Live" trigger
    document.getElementById('setup-form').style.display = 'none';
    document.getElementById('displayTopic').innerText = topic;
    document.getElementById('start-live-container').style.display = 'block';

    console.log("✅ Class details staged:", { topic, desc });
}

/**
 * STEP 2: Start Live Class
 * Communicates with the Cloudflare Worker to create a secure room
 * and injects the Jitsi Iframe into the portal.
 */
async function startLiveClass() {
    const userEmail = sessionStorage.getItem("p2p_email");
    const userName = sessionStorage.getItem("p2p_name") || "Tutor";
    const topic = sessionStorage.getItem('temp_class_topic');
    const desc = sessionStorage.getItem('temp_class_desc');
    const videoContainer = document.getElementById('video-area');

    if (!userEmail) {
        alert("Session expired. Please log in again.");
        window.location.href = "login.html";
        return;
    }

    try {
        // 1. Request room creation from the Worker
        const response = await fetch(`${LIVE_API_BASE}/api/create-room`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: userEmail,
                topic: topic,
                description: desc
            })
        });

        const result = await response.json();

        if (result.success && result.roomName) {
            // 2. Prepare the UI
            document.getElementById('live-setup-section').style.display = 'none';
            videoContainer.style.display = "block";
            videoContainer.innerHTML = ""; // Clear any previous instances

            // 3. Initialize Jitsi Meet Iframe
            const domain = "meet.jit.si";
            const options = {
                roomName: result.roomName,
                width: '100%',
                height: 700,
                parentNode: videoContainer,
                configOverwrite: {
                    startWithAudioMuted: true,
                    disableInviteFunctions: true, // Hides "Copy Link" to prevent unauthorized access
                    prejoinPageEnabled: false
                },
                interfaceConfigOverwrite: {
                    TOOLBAR_BUTTONS: [
                        'microphone', 'camera', 'chat', 'raisehand',
                        'tileview', 'desktop', 'security', 'mute-everyone'
                    ]
                },
                userInfo: {
                    displayName: `Tutor: ${userName}`
                }
            };

            const api = new JitsiMeetExternalAPI(domain, options);

            // 4. Handle Meeting Exit
            api.addEventListener('videoConferenceLeft', () => {
                console.log("Meeting ended by tutor.");
                // Optional: Notify worker to mark class as 'finished' in DB
                endClassInDatabase(userEmail);
                location.reload();
            });

            console.log("🚀 Live class is now active:", result.roomName);

        } else {
            alert("Error: " + (result.error || "Could not initialize live session."));
        }
    } catch (err) {
        console.error("Jitsi Launch Error:", err);
        alert("Failed to connect to the live streaming server.");
    }
}

/**
 * Optional: Notify database that class is closed
 */
async function endClassInDatabase(email) {
    try {
        await fetch(`${LIVE_API_BASE}/api/end-class`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });
    } catch (e) {
        console.warn("Could not reach worker to close class record.");
    }
}

// Initialize event listeners on page load
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startLiveBtn');
    if (startBtn) {
        startBtn.addEventListener('click', startLiveClass);
    }
});
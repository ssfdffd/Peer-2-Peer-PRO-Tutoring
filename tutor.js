// ============================================
// TUTOR PORTAL - SECURE PRODUCTION VERSION
// ============================================

const API_BASE = "https://damp-art-617fp2p-authentification-login.buhle-1ce.workers.dev";

// UI-only data from sessionStorage
const tutorName = sessionStorage.getItem("p2p_name") || "Tutor";
const tutorRole = sessionStorage.getItem("p2p_role");

// ============================================
// 1. SECURE SESSION VALIDATION
// ============================================

/**
 * Validates the cookie session with the Cloudflare Worker.
 * If the 30-day refresh token is expired, it redirects to login.
 */
async function validateTutorSession() {
    try {
        const response = await fetch(`${API_BASE}/api/verify-session`, {
            method: 'GET',
            credentials: 'include' // CRITICAL: Sends HTTP-Only cookies to the worker
        });

        const result = await response.json();

        // Check if authenticated and if the user is actually a tutor
        if (!response.ok || !result.authenticated || tutorRole !== "tutor") {
            throw new Error("Unauthorized Tutor Access");
        }

        console.log("✅ Tutor Session Verified");
        
        // Update UI Name
        const display = document.getElementById('tutorNameDisplay');
        if (display) display.innerText = tutorName;

    } catch (err) {
        console.error("❌ Auth Failed:", err);
        sessionStorage.clear();
        window.location.href = "login.html";
    }
}

// ============================================
// 2. LIVE SESSION LOGIC
// ============================================

async function saveAndToggleLive(isStarting) {
    const topic = document.getElementById('lessonTopic').value;
    const subject = document.getElementById('lessonSubject').value;
    const time = document.getElementById('lessonTime').value;
    const link = document.getElementById('meetingLink').value;

    if (isStarting && (!topic || !link || !time)) {
        alert("Please fill in Topic, Link, and Date/Time.");
        return;
    }

    const payload = {
        tutorName, 
        topic, 
        subject, 
        startTime: time, 
        link, 
        active: isStarting
    };

    try {
        const response = await fetch(`${API_BASE}/api/meetings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
        });

        if (response.ok) {
            alert(isStarting ? "🚀 Session is now LIVE!" : "Session ended.");
            loadMyMeetings();
        }
    } catch (err) {
        alert("Failed to update session status.");
    }
}

// ============================================
// 3. MEETING MANAGEMENT
// ============================================

async function loadMyMeetings() {
    const list = document.getElementById('myMeetingsList');
    if (!list) return;

    try {
        const response = await fetch(`${API_BASE}/api/my-meetings`, {
            credentials: 'include'
        });
        const meetings = await response.json();

        list.innerHTML = meetings.length ? '' : '<div class="loading-state">No meetings scheduled.</div>';
        
        meetings.forEach(m => {
            const card = document.createElement('div');
            card.className = 'file-card';
            card.innerHTML = `
                <div class="file-info">
                    <strong>${m.topic}</strong>
                    <span>${m.subject} | ${new Date(m.startTime).toLocaleString()}</span>
                </div>
                <button class="btn-delete" onclick="deleteMeeting(${m.id})">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            list.appendChild(card);
        });
        
        document.getElementById('meetingCount').innerText = `${meetings.length} meetings`;
    } catch (err) {
        list.innerHTML = '<div class="error-state">Error loading meetings.</div>';
    }
}

// ============================================
// 4. UTILITY & LOGOUT
// ============================================

function logout() {
    if (confirm("Are you sure you want to logout?")) {
        sessionStorage.clear();
        // Browser handles cookie clearing or expiry automatically
        window.location.href = "login.html";
    }
}

// ============================================
// INITIALIZE ON LOAD
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Validate session first
    validateTutorSession().then(() => {
        // 2. If valid, load data
        loadMyMeetings();
        
        // Setup form listeners if they exist
        const liveBtn = document.getElementById('startLiveBtn');
        if (liveBtn) {
            liveBtn.addEventListener('click', () => saveAndToggleLive(true));
        }
    });
});
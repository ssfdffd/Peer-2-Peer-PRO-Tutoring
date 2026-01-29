// --- 1. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const userType = localStorage.getItem('userType');
    const userName = localStorage.getItem('userName');

    if (userType !== 'tutor') {
        alert("Access Denied: Tutor privileges required.");
        window.location.href = "login.html";
        return;
    }

    if (document.getElementById('tutorNameDisplay')) {
        document.getElementById('tutorNameDisplay').innerText = userName;
    }

    loadMyMeetings();
    setupFileUpload();
});

// --- 2. LIVE SESSION LOGIC (DATABASE & BROADCAST) ---
async function saveAndToggleLive(isStarting) {
    const topic = document.getElementById('lessonTopic').value;
    const subject = document.getElementById('lessonSubject').value;
    const time = document.getElementById('lessonTime').value;
    const link = document.getElementById('meetingLink').value;
    const tutorName = localStorage.getItem('userName');
    const school_id = localStorage.getItem('school_id') || 'public';

    if (isStarting && (!topic || !link || !time)) {
        alert("Please fill in Topic, Link, and Date/Time.");
        return;
    }

    const payload = {
        tutorName, topic, subject, startTime: time, link, school_id, active: isStarting
    };

    try {
        // 1. Save to Database (Schedule)
        const scheduleRes = await fetch('/api/tutor/schedule-meeting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // 2. Broadcast Live Signal to Platform
        const liveRes = await fetch('/api/admin/toggle-session', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-user-role': 'tutor' 
            },
            body: JSON.stringify(payload)
        });

        if (scheduleRes.ok && liveRes.ok) {
            alert(isStarting ? "Session is now LIVE for all students!" : "Session ended.");
            updateUI(isStarting);
            loadMyMeetings();
        }
    } catch (err) {
        console.error("Error toggling session:", err);
        alert("Server connection failed.");
    }
}

function updateUI(isLive) {
    document.getElementById('liveStatusBadge').innerText = isLive ? "LIVE" : "Offline";
    document.getElementById('liveStatusBadge').className = isLive ? "status-badge online" : "status-badge offline";
    document.getElementById('startBtn').style.display = isLive ? 'none' : 'block';
    document.getElementById('endBtn').style.display = isLive ? 'block' : 'none';
}

// --- 3. MEETING LIST ---
async function loadMyMeetings() {
    const tutorName = localStorage.getItem('userName');
    const container = document.getElementById('myMeetingsList');
    
    try {
        const res = await fetch(`/api/tutor/my-meetings?tutorName=${tutorName}`);
        const meetings = await res.json();
        
        if (!meetings || meetings.length === 0) {
            container.innerHTML = "<p>No scheduled meetings yet.</p>";
            return;
        }

        container.innerHTML = meetings.map(m => `
            <div class="management-card" style="border-left: 5px solid #000080;">
                <h4>${m.topic}</h4>
                <p><strong>Subject:</strong> ${m.subject}</p>
                <p><strong>Date:</strong> ${new Date(m.startTime).toLocaleString()}</p>
                <a href="${m.link}" target="_blank" class="status-badge online" style="text-decoration:none; margin-top:10px;">Join Link</a>
            </div>
        `).join('');
    } catch (err) {
        console.error("Failed to load meetings.");
    }
}

// --- 4. FILE UPLOADS ---
function setupFileUpload() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');

    if(!dropZone || !fileInput) return;

    dropZone.onclick = () => fileInput.click();

    fileInput.onchange = () => {
        if (fileInput.files.length > 0) {
            document.getElementById('drop-text').innerHTML = `<b>Selected: ${fileInput.files[0].name}</b>`;
        }
    };

    uploadBtn.onclick = async () => {
        const file = fileInput.files[0];
        const name = document.getElementById('studentFileName').value;
        const subject = document.getElementById('materialSubject').value;

        if (!file || !name) {
            alert("Please provide a title and select a file.");
            return;
        }

        uploadBtn.style.display = 'none';
        document.getElementById('active-upload-status').style.display = 'block';

        const formData = new FormData();
        formData.append('studyMaterial', file);
        formData.append('displayName', name);
        formData.append('subject', subject);
        formData.append('uploadedBy', localStorage.getItem('userName'));
        formData.append('school_id', localStorage.getItem('school_id') || 'public');

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload', true);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = (e.loaded / e.total) * 100;
                setUploadProgress(percent);
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                alert("Upload Successful!");
                location.reload();
            } else {
                alert("Upload failed.");
                uploadBtn.style.display = 'block';
                document.getElementById('active-upload-status').style.display = 'none';
            }
        };
        xhr.send(formData);
    };
}

function setUploadProgress(percent) {
    const circle = document.getElementById('uploadProgressCircle');
    const circumference = 52 * 2 * Math.PI;
    const offset = circumference - (percent / 100 * circumference);
    circle.style.strokeDashoffset = offset;
    document.getElementById('progressPercent').innerText = `${Math.round(percent)}%`;
}

function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}
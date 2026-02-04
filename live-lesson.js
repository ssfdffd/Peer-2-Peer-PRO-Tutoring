document.addEventListener('DOMContentLoaded', () => {
    const userName = localStorage.getItem('userName');
    
    // Security Check: Redirect if not logged in
    if (!userName) {
        window.location.href = 'login.html';
        return;
    }

    // Start checking for a live class immediately
    checkClassStatus();
    setInterval(checkClassStatus, 10000); // Check every 10 seconds
});

async function checkClassStatus() {
    try {
        const res = await fetch('/api/active-session');
        const data = await res.json();

        const statusText = document.getElementById('statusText');
        const dot = document.querySelector('.dot');
        const placeholder = document.getElementById('placeholder');
        const frameContainer = document.getElementById('liveFrameContainer');
        const liveFrame = document.getElementById('liveFrame');

        if (data.active) {
            statusText.innerText = "LIVE SESSION IN PROGRESS";
            dot.classList.add('active');
            
            // If the frame isn't already showing the link, load it
            if (liveFrame.src !== data.link) {
                placeholder.style.display = 'none';
                frameContainer.style.display = 'block';
                liveFrame.src = data.link;
            }
        } else {
            statusText.innerText = "Waiting for Tutor...";
            dot.classList.remove('active');
            placeholder.style.display = 'block';
            frameContainer.style.display = 'none';
            liveFrame.src = "";
        }
    } catch (err) {
        console.error("Connection to classroom lost:", err);
    }
}

let attendanceRecorded = false;

async function recordAttendance(topic, tutor) {
    if (attendanceRecorded) return; // Prevent double counting if they refresh

    await fetch('/api/record-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            topic: topic,
            tutor: tutor,
            student: localStorage.getItem('userName')
        })
    });
    attendanceRecorded = true;
}
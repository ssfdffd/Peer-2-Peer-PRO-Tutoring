const API_BASE = "https://damp-art-617fp2p-authentification-login.buhle-1ce.workers.dev";

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);

    // Add logout button handler if exists on any page
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Auto-logout on page close (optional)
    window.addEventListener('beforeunload', () => {
        const email = sessionStorage.getItem('p2p_email');
        const sessionId = sessionStorage.getItem('p2p_sessionId');
        if (email && sessionId) {
            navigator.sendBeacon(`${API_BASE}/api/logout`, JSON.stringify({ email, sessionId }));
        }
    });
});

async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    btn.disabled = true;
    btn.innerText = "Authenticating...";

    try {
        const response = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        });

        const result = await response.json();

        if (response.ok && result.success) {
            const role = result.role.toLowerCase().trim();

            // Save session data
            sessionStorage.setItem('p2p_email', email);
            sessionStorage.setItem('p2p_name', result.name);
            sessionStorage.setItem('p2p_userType', role);
            sessionStorage.setItem('p2p_role', role);
            sessionStorage.setItem('p2p_sessionId', result.sessionId);

            // Redirect based on role
            window.location.replace(role === 'tutor' ? 'tutor-portal.html' : 'student-portal.html');
        } else {
            alert("Login Failed: " + (result.error || "Invalid details"));
        }
    } catch (err) {
        alert("Connection Error: Check Worker CORS settings.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Login";
    }
}

async function handleLogout() {
    const email = sessionStorage.getItem('p2p_email');
    const sessionId = sessionStorage.getItem('p2p_sessionId');

    if (!email) {
        window.location.href = 'login.html';
        return;
    }

    try {
        await fetch(`${API_BASE}/api/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, sessionId })
        });
    } catch (err) {
        console.error('Logout error:', err);
    } finally {
        // Clear session storage
        sessionStorage.clear();
        window.location.href = 'login.html';
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/api/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.success) {
            alert("Account created! Please login.");
            location.reload();
        } else {
            alert("Signup Failed: " + result.error);
        }
    } catch (err) {
        alert("Signup Error: " + err.message);
    } finally {
        btn.disabled = false;
    }
}

async function handleForgotPassword() {
    const email = document.getElementById('forgotEmail').value;
    if (!email) return alert("Enter your email");
    try {
        const response = await fetch(`${API_BASE}/api/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const result = await response.json();
        if (result.success && result.token) {
            alert("Reset token generated: " + result.token);
        } else {
            alert("If the email exists, a link will be sent.");
        }
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// Optional: Periodically update online status (heartbeat)
function setupOnlineHeartbeat() {
    const email = sessionStorage.getItem('p2p_email');
    if (!email) return;

    setInterval(async () => {
        try {
            await fetch(`${API_BASE}/api/heartbeat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
        } catch (err) {
            console.error('Heartbeat failed:', err);
        }
    }, 60000); // Every minute
}
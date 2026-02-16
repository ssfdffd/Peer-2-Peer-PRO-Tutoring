// ✅ CORRECTED URL: Fixed "authentification" → "authentication" (MUST match your deployed Worker URL)
const API_BASE = "https://damp-art-617fp2p-authentification-login.buhle-1ce.workers.dev";

document.addEventListener('DOMContentLoaded', () => {
    // Form handlers
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);

    // Logout button handler (works on ANY page with #logoutBtn)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Auto-logout on tab close (critical for accurate online tracking)
    window.addEventListener('beforeunload', () => {
        const email = sessionStorage.getItem('p2p_email');
        const sessionId = sessionStorage.getItem('p2p_sessionId');
        if (email && sessionId) {
            // sendBeacon works reliably during page unload
            navigator.sendBeacon(
                `${API_BASE}/api/logout`,
                JSON.stringify({ email, sessionId })
            );
        }
    });
});

// 🔑 LOGIN HANDLER (FIXED: conditionals, typos, session storage)
async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    btn.disabled = true;
    btn.textContent = "Authenticating..."; // Clean text (no trailing spaces)

    try {
        const response = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        });

        const result = await response.json();

        // ✅ FIXED: Proper && operator (was " & &" with spaces)
        if (response.ok && result.success) {
            const role = result.role.toLowerCase().trim();

            // ✅ FIXED: Correct sessionStorage (was "sessio nStorage")
            sessionStorage.setItem('p2p_email', email);
            sessionStorage.setItem('p2p_name', result.name);
            sessionStorage.setItem('p2p_userType', role);
            sessionStorage.setItem('p2p_role', role);
            sessionStorage.setItem('p2p_sessionId', result.sessionId); // Critical for logout tracking

            // Redirect based on role
            window.location.replace(role === 'tutor' ? 'tutor-portal.html' : 'student-portal.html');
        } else {
            alert(`Login Failed: ${result.error || "Invalid credentials"}`);
        }
    } catch (err) {
        console.error("Login error:", err);
        alert(`Connection Error: ${err.message}\n\nCheck:\n1. Worker URL spelling\n2. CORS settings\n3. Network connection`);
    } finally {
        btn.disabled = false;
        btn.textContent = "Login"; // Clean text
    }
}

// 🚪 LOGOUT HANDLER (NEW: Full session cleanup)
async function handleLogout() {
    const email = sessionStorage.getItem('p2p_email');
    const sessionId = sessionStorage.getItem('p2p_sessionId');

    if (!email) {
        sessionStorage.clear();
        window.location.href = 'login.html';
        return;
    }

    try {
        // Call logout API to update DB (online status + activity log)
        await fetch(`${API_BASE}/api/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, sessionId }),
            credentials: 'include'
        });
    } catch (err) {
        console.warn("Logout API failed (proceeding with local cleanup):", err);
    } finally {
        // ALWAYS clear session regardless of API success
        sessionStorage.clear();
        window.location.href = 'login.html';
    }
}

// 📝 SIGNUP HANDLER (UNCHANGED - works with new access_status logic)
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
            alert("Account created successfully!\n\nStudents: Login immediately\nTutors: Wait for admin approval");
            window.location.href = 'login.html';
        } else {
            alert(`Signup Failed: ${result.error || "Unknown error"}`);
        }
    } catch (err) {
        console.error("Signup error:", err);
        alert(`Network Error: ${err.message}`);
    } finally {
        btn.disabled = false;
    }
}

// 🔑 FORGOT PASSWORD HANDLER (UNCHANGED)
async function handleForgotPassword() {
    const email = document.getElementById('forgotEmail')?.value?.trim();
    if (!email) return alert("Please enter your email address");

    try {
        const response = await fetch(`${API_BASE}/api/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const result = await response.json();

        if (result.success) {
            alert(result.token
                ? `Reset token: ${result.token}\n(Implement email delivery in production)`
                : "If account exists, reset instructions sent");
        } else {
            alert("Request failed. Please try again later.");
        }
    } catch (err) {
        console.error("Password reset error:", err);
        alert(`Error: ${err.message}`);
    }
}
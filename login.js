// ✅ CORRECTED URL
const API_BASE = "https://damp-art-617fp2p-authentification-login.buhle-1ce.workers.dev";

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Auto-logout on tab close
    window.addEventListener('beforeunload', () => {
        const email = sessionStorage.getItem('p2p_email');
        const sessionId = sessionStorage.getItem('p2p_sessionId');
        if (email && sessionId) {
            navigator.sendBeacon(
                `${API_BASE}/api/logout`,
                JSON.stringify({ email, sessionId })
            );
        }
    });
});

// 🔑 LOGIN HANDLER - FIXED
async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    btn.disabled = true;
    btn.textContent = "Authenticating...";

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

            sessionStorage.setItem('p2p_email', email);
            sessionStorage.setItem('p2p_name', result.name);
            sessionStorage.setItem('p2p_userType', role);
            sessionStorage.setItem('p2p_role', role);
            sessionStorage.setItem('p2p_sessionId', result.sessionId);

            // Redirect based on role
            if (role === 'tutor') {
                window.location.replace('tutor-portal.html');
            } else {
                window.location.replace('student-portal.html');
            }
        } else {
            // Show specific error message from server
            alert(`Login Failed: ${result.error || "Invalid credentials"}`);
        }
    } catch (err) {
        console.error("Login error:", err);
        alert(`Connection Error: ${err.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = "Login";
    }
}

// 🚪 LOGOUT HANDLER
async function handleLogout() {
    const email = sessionStorage.getItem('p2p_email');
    const sessionId = sessionStorage.getItem('p2p_sessionId');

    if (!email) {
        sessionStorage.clear();
        window.location.href = 'login.html';
        return;
    }

    try {
        await fetch(`${API_BASE}/api/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, sessionId }),
            credentials: 'include'
        });
    } catch (err) {
        console.warn("Logout API failed:", err);
    } finally {
        sessionStorage.clear();
        window.location.href = 'login.html';
    }
}

// 📝 SIGNUP HANDLER
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
            alert(result.message || "Account created successfully!");
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

// 🔑 FORGOT PASSWORD
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
            alert("If your email exists in our system, you will receive reset instructions.");
            closeForgotModal();
        } else {
            alert("Request failed. Please try again later.");
        }
    } catch (err) {
        console.error("Password reset error:", err);
        alert(`Error: ${err.message}`);
    }
}
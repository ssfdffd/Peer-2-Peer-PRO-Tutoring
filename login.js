// ✅ CORRECTED URL - FIX TYPO: "authentification" → "authentication" (VERIFY IN CLOUDFLARE!)
const API_BASE = "https://damp-art-617fp2p-authentication-login.buhle-1ce.workers.dev";

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);

    // Auto-logout on page close
    window.addEventListener('beforeunload', () => {
        const email = sessionStorage.getItem('p2p_email');
        const sessionId = sessionStorage.getItem('p2p_sessionId');
        if (email && sessionId) {
            navigator.sendBeacon(`${API_BASE}/api/logout`, JSON.stringify({ email, sessionId }));
        }
    });
});

// 🔑 LOGIN HANDLER (FIXED SYNTAX)
async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const email = e.target.querySelector('input[name="email"]').value.trim();
    const password = e.target.querySelector('input[name="password"]').value;

    if (!email || !password) {
        alert("Please enter both email and password");
        return;
    }

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
            // ✅ CORRECTED: No spaces in sessionStorage keys
            sessionStorage.setItem('p2p_email', email);
            sessionStorage.setItem('p2p_name', result.name);
            sessionStorage.setItem('p2p_userType', result.role);
            sessionStorage.setItem('p2p_role', result.role);
            sessionStorage.setItem('p2p_sessionId', result.sessionId);

            // Redirect based on role
            window.location.href = result.role === 'tutor'
                ? 'tutor-portal.html'
                : 'student-portal.html';
        } else {
            alert(`Login Failed: ${result.error || "Invalid credentials"}`);
        }
    } catch (err) {
        console.error("Login error:", err);
        alert(`Connection Error: ${err.message}\n\nCheck:\n1. Worker URL spelling\n2. Internet connection`);
    } finally {
        btn.disabled = false;
        btn.textContent = "Login";
    }
}

// 📝 SIGNUP HANDLER
async function handleSignup(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');

    // Collect form data
    const formData = new FormData(form);
    const payload = {
        firstName: formData.get('firstName')?.trim(),
        lastName: formData.get('lastName')?.trim() || '',
        email: formData.get('email')?.trim(),
        password: formData.get('password'),
        userType: formData.get('userType'),
        age: formData.get('age') || '',
        grade: formData.get('grade') || '',
        phone: formData.get('phone')?.trim(),
        backupPhone: formData.get('backupPhone')?.trim() || '',
        schoolName: formData.get('schoolName')?.trim() || '',
        schoolCode: formData.get('schoolCode')?.trim() || '',
        agreeTerms: formData.get('agreeTerms') === 'on'
    };

    // Validation
    if (!payload.email || !payload.password || !payload.firstName || !payload.userType) {
        alert("Please fill all required fields");
        return;
    }
    if (payload.password.length < 6) {
        alert("Password must be at least 6 characters");
        return;
    }
    if (!payload.agreeTerms) {
        alert("You must agree to the terms");
        return;
    }

    btn.disabled = true;
    btn.textContent = "Creating account...";

    try {
        const response = await fetch(`${API_BASE}/api/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alert(result.message || "Account created successfully!");
            if (payload.userType !== 'tutor') {
                window.location.href = 'login.html';
            } else {
                window.location.href = 'login.html';
            }
        } else {
            alert(`Signup Failed: ${result.error || "Unknown error"}`);
        }
    } catch (err) {
        console.error("Signup error:", err);
        alert(`Connection Error: ${err.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = "Register & Agree";
    }
}

// 🚪 LOGOUT FUNCTION (for portal pages)
window.handleLogout = async function () {
    const email = sessionStorage.getItem('p2p_email');
    const sessionId = sessionStorage.getItem('p2p_sessionId');

    if (email && sessionId) {
        try {
            await fetch(`${API_BASE}/api/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, sessionId }),
                credentials: 'include'
            });
        } catch (err) {
            console.warn("Logout API failed (proceeding):", err);
        }
    }

    sessionStorage.clear();
    window.location.href = 'login.html';
};
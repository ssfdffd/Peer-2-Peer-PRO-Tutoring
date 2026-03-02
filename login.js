// ✅ CORRECTED: API Base URL (ensure this matches your Worker deployment)
const API_BASE = "https://damp-art-617fp2p-authentification-login.buhle-1ce.workers.dev";

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

// 🔑 LOGIN HANDLER - FIXED SYNTAX ERRORS
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

        // ✅ FIXED: Proper logical operator && and no spaces in property access
        if (response.ok && result.success) {
            sessionStorage.setItem('p2p_email', email);
            sessionStorage.setItem('p2p_name', result.name);        // ✅ Fixed: result.name (no space)
            sessionStorage.setItem('p2p_userType', result.role);
            sessionStorage.setItem('p2p_role', result.role);
            sessionStorage.setItem('p2p_sessionId', result.sessionId); // ✅ Fixed: result.sessionId (no space)

            // Redirect based on role - STUDENTS UNCHANGED ✅
            window.location.href = result.role === 'tutor'
                ? 'tutor-portal.html'
                : 'student-portal.html';

        } else {
            // ✅ This will now properly show the tutor pending approval message from Worker
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

// 📝 SIGNUP HANDLER - FIXED SYNTAX ERRORS
async function handleSignup(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');

    const formData = new FormData(form);
    const payload = {
        firstName: formData.get('firstName')?.trim(),
        lastName: formData.get('lastName')?.trim() || '',
        email: formData.get('email')?.trim(),
        password: formData.get('password'),
        userType: formData.get('userType'),
        age: formData.get('age') || '',
        grade: formData.get('grade') || '',                      // ✅ Fixed: formData.get (no space)
        phone: formData.get('phone')?.trim(),
        backupPhone: formData.get('backupPhone')?.trim() || '',
        schoolName: formData.get('schoolName')?.trim() || '',
        schoolCode: formData.get('schoolCode')?.trim() || '',
        agreeTerms: formData.get('agreeTerms') === 'on'
    };

    // Validation
    if (!payload.email || !payload.password || !payload.firstName || !payload.userType) { // ✅ Fixed: payload.firstName
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

        // ✅ FIXED: Proper logical operator &&
        if (response.ok && result.success) {
            alert(result.message || "Account created successfully!");
            window.location.href = 'login.html'; // Same redirect for all user types
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

// 🚪 LOGOUT FUNCTION
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
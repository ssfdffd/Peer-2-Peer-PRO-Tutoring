/**
 * PEER-2-PEER PRO - Authentication Handler
 * Handles Signup and Secure Cookie-based Login
 */
// MUST be your Auth Worker URL (the one that handles signup/login)
const API_BASE = "https://damp-art-617fp2p-authentification-login.buhle-1ce.workers.dev";
document.addEventListener('DOMContentLoaded', () => {
    // Clear any old UI-only data on load to ensure a clean state
    if (window.location.pathname.includes('login.html')) {
        sessionStorage.clear();
    }

    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
});

/**
 * SIGNUP HANDLER
 */
async function handleSignup(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const formData = new FormData(e.target);

    // Prepare data exactly as the Worker expects
    const payload = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        age: formData.get('age'),
        grade: formData.get('grade'),
        phone: formData.get('phone'),
        backupPhone: formData.get('backupPhone'),
        schoolName: formData.get('schoolName'),
        userType: formData.get('userType'),
        schoolCode: formData.get('schoolCode'),
        email: formData.get('email'),
        password: formData.get('password'),
        commercialConsent: formData.get('agreeTerms') !== null
    };

    btn.disabled = true;
    btn.innerText = "Creating Account...";

    try {
        const response = await fetch(`${API_BASE}/api/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            alert("✅ Account created successfully! Please sign in.");
            window.location.reload(); // Refresh to show login state
        } else {
            alert("Signup Error: " + (result.error || "Please try again."));
        }
    } catch (err) {
        alert("Network Error: Please check your internet connection.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Register & Agree";
    }
}

/**
 * LOGIN HANDLER
 * Uses HTTP-Only Cookies for Session Management
 */
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
            // Normalize the role to lowercase to avoid "Tutor" vs "tutor" bugs
            const normalizedRole = result.role.toLowerCase().trim();

            // 1. Save all keys to satisfy portal guards
            sessionStorage.setItem('p2p_email', email);
            sessionStorage.setItem('p2p_name', result.name);
            sessionStorage.setItem('p2p_role', normalizedRole);
            sessionStorage.setItem('p2p_userType', normalizedRole);

            console.log("Login Success. Role identified as:", normalizedRole);

            // 2. Strict Redirection Logic
            if (normalizedRole === 'tutor') {
                window.location.replace('tutor-portal.html');
            } else if (normalizedRole === 'student') {
                window.location.replace('student-portal.html');
            } else {
                alert("Account type not recognized. Please contact support.");
            }
        } else {
            alert("Login Failed: " + (result.error || "Invalid Credentials"));
        }
    } catch (err) {
        console.error("Fetch error:", err);
        alert("Connection Error: Check your internet or server CORS settings.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Login";
    }
}
/**
 * LOGOUT HANDLER
 */
function logout() {
    // Clear UI data
    sessionStorage.clear();
    // Redirect to login (the worker will handle cookie invalidation if needed)
    window.location.href = 'login.html';
}

// --- Forgot Password Logic ---
function showForgotModal() {
    const modal = document.getElementById('forgotModal');
    if (modal) modal.style.display = 'flex';
}

function closeForgotModal() {
    const modal = document.getElementById('forgotModal');
    if (modal) modal.style.display = 'none';
}

// Update this in login.js
async function handleForgotSubmit() {
    const email = document.getElementById('forgotEmail').value;
    const btn = document.getElementById('forgotBtn');

    if (!email) return alert("Please enter your email.");

    // SAFETY CHECK: Ensure EmailJS is loaded to avoid "undefined" errors
    if (typeof emailjs === 'undefined') {
        return alert("Email service is still loading. Please wait a moment and try again.");
    }

    btn.disabled = true;
    btn.innerText = "Sending...";

    try {
        // 1. Request the token from your Worker
        const response = await fetch(`${API_BASE}/api/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
            credentials: 'include'
        });

        // Parse the JSON immediately
        const result = await response.json();

        // 2. Explicitly check if success is true and token exists
        if (result && result.success === true && result.token) {
            await emailjs.send(
                "peer-2-peer_email",
                "template_07x82zzo",
                {
                    to_email: email,
                    reset_token: result.token,
                    reset_link: `https://peer-2-peer.co.za/reset-password.html?token=${result.token}`
                },
                "1MGUTlF8hOxhOc27a"
            );

            alert("Check your email! A secure recovery link has been sent.");
            closeForgotModal();
        } else {
            // Security: show generic message if user not found (success still true but no token)
            alert("If that email is registered, you will receive a reset link shortly.");
            closeForgotModal();
        }
    } catch (err) {
        console.error("Reset Error:", err);
        alert("Recovery Error: " + (err.message || "Unknown error occurred"));
    } finally {
        btn.disabled = false;
        btn.innerText = "Send Recovery Link";
    }
}
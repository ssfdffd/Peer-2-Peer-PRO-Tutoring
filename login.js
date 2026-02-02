/**
 * PEER-2-PEER PRO - Authentication Handler
 * Handles Signup and Secure Cookie-based Login
 */

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
            // CRITICAL: Tells the browser to accept and store the Set-Cookie header
            credentials: 'include' 
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // Save non-sensitive info for UI display only
            sessionStorage.setItem('p2p_name', result.name);
            sessionStorage.setItem('p2p_role', result.role);
            
            // Short delay to ensure browser handles the cookie write
            setTimeout(() => {
                if (result.role === 'tutor') {
                    window.location.href = 'tutor-portal.html';
                } else {
                    window.location.href = 'student-portal.html';
                }
            }, 100);
        } else {
            alert("Login Failed: " + (result.error || "Invalid Credentials"));
        }
    } catch (err) {
        alert("Auth Server Error: " + err.message);
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
    btn.disabled = true;

    try {
        // 1. Tell the Worker to generate a token
        const response = await fetch(`${API_BASE}/api/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const result = await response.json();

        if (result.token) {
            // 2. Send the email via EmailJS
            await emailjs.send("peer-2-peer_email", "template_07x82zzo", {
                to_email: email,
                reset_token: result.token, 
                reset_link: `https://peer-2-peer.co.za/reset-password.html?token=${result.token}`
            }, "1MGUTlF8hOxhOc27a");

            alert("Check your email! A reset link has been sent.");
            closeForgotModal();
        }
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        btn.disabled = false;
    }
}
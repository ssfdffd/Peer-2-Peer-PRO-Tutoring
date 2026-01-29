// 1. CONFIGURATION
const API_BASE = "https://damp-art-617fp2p-authentification-login.buhle-1ce.workers.dev";

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    
    // Check if already logged in
    if (localStorage.getItem('p2p_token')) {
        console.log("Active session found.");
    }
});

// 2. SIGNUP HANDLER
async function handleSignup(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const formData = new FormData(e.target);

    const payload = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        age: formData.get('age') || 0,
        phone: formData.get('phone'),
        backupPhone: formData.get('backupPhone') || null,
        schoolName: formData.get('schoolName'),
        email: formData.get('email'),
        userType: formData.get('userType'),
        grade: formData.get('grade') || null,
        schoolCode: formData.get('schoolCode'),
        password: formData.get('password'),
        commercialConsent: formData.get('agreeTerms') === 'on'
    };

    btn.disabled = true;
    btn.innerText = "Connecting...";

    try {
        const response = await fetch(`${API_BASE}/api/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();

        if (response.ok && result.success) {
            alert("✅ SUCCESS: Account created in database!");
            e.target.reset();
        } else {
            // This will now tell you EXACTLY why the database said no
            alert("❌ DATABASE REJECTED: " + (result.error || "Unknown error"));
        }
    } catch (err) {
        alert("❌ CONNECTION FAILED: The Worker is not responding. Check your API_BASE URL.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Register & Agree";
    }
}

// 3. LOGIN HANDLER
async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const email = e.target.querySelector('input[type="email"]').value;
    const password = e.target.querySelector('input[type="password"]').value;

    btn.disabled = true;
    btn.innerText = "Verifying...";

    try {
        const response = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();

        if (response.ok && result.success) {
            // Save session data
            localStorage.setItem('p2p_token', result.token);
            localStorage.setItem('p2p_role', result.role);
            localStorage.setItem('p2p_name', result.name || "");

            // Success Redirect
            window.location.href = 'resources.html';
        } else {
            alert("Login Failed: " + (result.error || "Invalid credentials"));
        }
    } catch (err) {
        console.error("Login Error:", err);
        alert("Connection error. Is the Auth Worker running?");
    } finally {
        btn.disabled = false;
        btn.innerText = "Login";
    }
}
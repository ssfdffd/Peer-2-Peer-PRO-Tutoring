// 1. CONFIGURATION
const API_BASE = "https://lucky-mud-57bd.buhle-1ce.workers.dev"; // Your Unified Worker URL

document.addEventListener('DOMContentLoaded', () => {
    // Select forms from your HTML
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
});

// 2. SIGNUP LOGIC
async function handleSignup(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const formData = new FormData(e.target);

    // Collect data - matching the Unified Worker keys
    // Backup Phone and Grade are optional
    const payload = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        age: formData.get('age'),
        phone: formData.get('phone'),
        backupPhone: formData.get('backupPhone') || "", // Optional
        schoolName: formData.get('schoolName'),
        email: formData.get('email'),
        userType: formData.get('userType'),
        grade: formData.get('grade') || "",             // Optional
        schoolCode: formData.get('schoolCode'),
        password: formData.get('password')
    };

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/api/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alert("✅ Account created successfully! Please log in.");
            if (typeof toggleForm === "function") toggleForm(); // Switch to login view if function exists
        } else {
            alert("Signup Error: " + (result.error || "Could not complete registration."));
        }
    } catch (error) {
        console.error("Signup Error:", error);
        alert("Connection to server failed. Please try again later.");
    } finally {
        btn.innerHTML = 'Sign Up';
        btn.disabled = false;
    }
}

// 3. LOGIN LOGIC
async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const email = e.target.querySelector('input[type="email"]').value;
    const password = e.target.querySelector('input[type="password"]').value;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // Save session info
            localStorage.setItem('p2p_token', result.token);
            localStorage.setItem('p2p_role', result.role);
            localStorage.setItem('p2p_user_email', email);

            // Redirect to the resource library
            window.location.href = 'resources.html';
        } else {
            alert("Login Failed: " + (result.error || "Invalid email or password."));
        }
    } catch (error) {
        console.error("Login Error:", error);
        alert("Server connection failed.");
    } finally {
        btn.innerHTML = 'Login';
        btn.disabled = false;
    }
}
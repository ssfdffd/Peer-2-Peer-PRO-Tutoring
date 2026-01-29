const API_BASE = "https://damp-art-617fp2p-authentification-login.buhle-1ce.workers.dev";

document.addEventListener('DOMContentLoaded', () => {
    console.log("Login.js Initialized");
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
});

async function handleSignup(e) {
    e.preventDefault();
    console.log("Signup started...");
    
    const btn = e.target.querySelector('button');
    const formData = new FormData(e.target);

    // MAPPING: Ensure these strings match the name="" attribute in your HTML exactly
    const payload = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        age: parseInt(formData.get('age')) || 0,
        phone: formData.get('phone'),
        backupPhone: formData.get('backupPhone') || null,
        schoolName: formData.get('schoolName'),
        email: formData.get('email'),
        userType: formData.get('userType'),
        grade: formData.get('grade') || null,
        schoolCode: formData.get('schoolCode'),
        password: formData.get('password'),
        commercialConsent: formData.get('agreeTerms') === 'on' ? 1 : 0
    };

    console.log("Data to be sent:", payload);

    // Basic Validation: If alert doesn't show, check if payload.email is null here
    if (!payload.email || !payload.password) {
        alert("❌ Please fill in all required fields.");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Saving to Database...";

    try {
        const response = await fetch(`${API_BASE}/api/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        console.log("Server Response:", result);

        if (response.ok && result.success) {
            alert("✅ ACCOUNT CREATED! You can now log in.");
            e.target.reset();
        } else {
            alert("❌ DATABASE ERROR: " + (result.error || "Submission rejected"));
        }
    } catch (err) {
        console.error("Connection Error:", err);
        alert("❌ SERVER UNREACHABLE: Please check your internet or Worker status.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Register & Agree";
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    
    // Using FormData for login too to be consistent
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

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
            localStorage.setItem('p2p_token', result.token);
            localStorage.setItem('p2p_role', result.role);
            localStorage.setItem('p2p_name', result.name || "");
            window.location.href = 'resources.html';
        } else {
            alert("❌ LOGIN FAILED: " + (result.error || "Invalid email or password"));
        }
    } catch (err) {
        alert("❌ CONNECTION ERROR: Auth server is offline.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Login";
    }
}
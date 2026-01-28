const API_BASE = "https://damp-art-617fp2p-authentification-login.buhle-1ce.workers.dev/"; 
// ^ Replace with your actual full Workers.dev URL

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
});

async function handleSignup(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const formData = new FormData(e.target);

    const payload = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        age: formData.get('age') || 0,
        phone: formData.get('phone'),
        backupPhone: formData.get('backupPhone') || "", // Optional
        schoolName: formData.get('schoolName'),
        email: formData.get('email'),
        userType: formData.get('userType'),
        grade: formData.get('grade') || "",             // Optional
        schoolCode: formData.get('schoolCode'),
        password: formData.get('password'),
        commercialConsent: formData.get('agreeTerms') === 'on'
    };

    btn.disabled = true;
    btn.innerText = "Processing...";

    try {
        const response = await fetch(`${API_BASE}/api/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (response.ok) {
            alert("✅ Account Created! Log in now.");
            e.target.reset();
        } else {
            alert("Error: " + result.error);
        }
    } catch (err) {
        alert("Server unreachable.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Register & Agree";
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const email = e.target.querySelector('input[type="email"]').value;
    const password = e.target.querySelector('input[type="password"]').value;

    btn.disabled = true;
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
            window.location.href = 'resources.html';
        } else {
            alert("Invalid Login.");
        }
    } catch (err) {
        alert("Connection Error.");
    } finally {
        btn.disabled = false;
    }
}
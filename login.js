// login.js
const API_BASE = "https://damp-art-617fp2p-authentification-login.buhle-1ce.workers.dev";

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
});

/**
 * LOGOUT LOGIC
 * Wipes the browser memory and returns to login
 */
function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

/**
 * FORGOT PASSWORD MODAL LOGIC
 */
function showForgotModal() {
    document.getElementById('forgotModal').style.display = 'flex';
}

function closeForgotModal() {
    document.getElementById('forgotModal').style.display = 'none';
}

async function handleForgotSubmit() {
    const email = document.getElementById('forgotEmail').value;
    const btn = document.getElementById('forgotBtn');

    if (!email) return alert("Please enter your email address.");

    btn.disabled = true;
    btn.innerText = "Checking...";

    try {
        const response = await fetch(`${API_BASE}/api/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        alert("If an account exists, a recovery link will be sent shortly.");
        closeForgotModal();
    } catch (err) {
        alert("Server error. Please check your connection.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Send Recovery Link";
    }
}

/**
 * SIGNUP LOGIC
 * Creates a new account in the D1 Database
 */
async function handleSignup(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const formData = new FormData(e.target);

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
            alert("✅ Account created successfully! You can now log in.");
            e.target.reset(); 
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            alert("Signup Failed: " + (result.error || "Please check your details."));
        }
    } catch (err) {
        alert("Connection Error: Please check your internet or API status.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Register & Agree";
    }
}

/**
 * LOGIN LOGIC
 * Authenticates user and sets a permanent session
 */
async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
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
            // 1. Wipe any old session artifacts
            localStorage.clear();

            // 2. Save the permanent credentials
            localStorage.setItem('p2p_token', result.token);
            localStorage.setItem('p2p_role', result.role);
            localStorage.setItem('p2p_name', result.name);
            
            // 3. Short delay to ensure the browser has written to storage 
            // before the portal security guards try to read it.
            setTimeout(() => {
                if (result.role === 'tutor') {
                    window.location.href = 'tutor-portal.html';
                } else {
                    window.location.href = 'student-portal.html';
                }
            }, 150);
        } else {
            alert("Login Failed: " + (result.error || "Invalid Credentials"));
        }
    } catch (err) {
        alert("Auth Server Error: Please check your connection.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Login";
    }
}
// login.js
const API_BASE = "https://damp-art-617fp2p-authentification-login.buhle-1ce.workers.dev";

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
});

function logout() {
    localStorage.clear(); // Wipe all permanent data
    window.location.href = 'login.html';
}

// --- FORGOT PASSWORD MODAL LOGIC ---
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
        
        alert("If an account exists for this email, a recovery link will be sent shortly.");
        closeForgotModal();
    } catch (err) {
        alert("Server error. Please check your connection.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Send Recovery Link";
    }
}

// --- SIGNUP LOGIC ---
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
            alert("✅ Registration Successful! Please Log In.");
            e.target.reset(); 
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            alert("Error: " + (result.error || "Signup failed"));
        }
    } catch (err) {
        alert("Check your internet connection or API status.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Register & Agree";
    }
}

// --- UPDATED LOGIN LOGIC (FIXED REDIRECT & PERMANENT SESSION) ---
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
            // 1. Wipe any old session data
            localStorage.clear();

            // 2. Store new permanent details
            localStorage.setItem('p2p_token', result.token);
            localStorage.setItem('p2p_role', result.role);
            localStorage.setItem('p2p_name', result.name);
            
            // 3. 100ms delay ensures localStorage is physically saved
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
        alert("Auth Server Error. Please try again later.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Login";
    }
}
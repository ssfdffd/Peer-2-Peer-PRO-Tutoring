// ==========================================
// CONFIGURATION: Replace with your Worker URL
// ==========================================
const API_BASE = "https://damp-art-617fp2p-authentification-login.buhle-1ce.workers.dev"; 
// AUTO-LOGGING LOGIC
const existingToken = localStorage.getItem('p2p_session_token');
const existingRole = localStorage.getItem('p2p_user_role');

if (existingToken && existingRole) {
    // If they have a token, skip login and go to their page
    window.location.href = existingRole === 'tutor' ? 'tutors-page.html' : 'student-page.html';
}
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const signupMsg = document.getElementById('signupMsg');
    const loginMsg = document.getElementById('loginMsg');

    // ==========================================
    // 1. HANDLE SIGNUP (Create Account)
    // ==========================================
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        
        // Collect all data from the expanded grid
        const formData = new FormData(e.target);
        const payload = Object.fromEntries(formData.entries());

        // Basic password length check
        if (payload.password.length < 8) {
            signupMsg.innerText = "❌ Password must be at least 8 characters.";
            return;
        }

        btn.disabled = true;
        btn.innerText = "Creating Secure Account...";

        try {
            const res = await fetch(`${API_BASE}/api/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();

            if (res.ok && result.success) {
                signupMsg.style.color = "#32cd32";
                signupMsg.innerText = "✅ Account Created! You can now log in on the left.";
                signupForm.reset();
            } else {
                signupMsg.style.color = "#ff4444";
                signupMsg.innerText = "❌ " + (result.error || "Signup failed.");
            }
        } catch (err) {
            signupMsg.innerText = "❌ Server connection failed.";
        } finally {
            btn.disabled = false;
            btn.innerText = "Register & Agree";
        }
    });

    // ==========================================
    // 2. HANDLE LOGIN
    // ==========================================
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const email = e.target.email.value;
        const password = e.target.password.value;

        btn.disabled = true;
        btn.innerText = "Verifying...";

        try {
            const res = await fetch(`${API_BASE}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const result = await res.json();

            if (res.ok && result.success) {
                // Save the session token securely
                localStorage.setItem('p2p_session_token', result.token);
                localStorage.setItem('p2p_user_role', result.role);

                // REDIRECTION LOGIC
                if (result.role === 'tutor') {
                    window.location.href = 'tutors-page.html';
                } else {
                    window.location.href = 'student-page.html';
                }
            } else {
                loginMsg.innerText = "❌ Invalid email or password.";
            }
        } catch (err) {
            loginMsg.innerText = "❌ Login server unavailable.";
        } finally {
            btn.disabled = false;
            btn.innerText = "Login";
        }
    });
});

// ==========================================
// 3. FORGOT PASSWORD MODAL LOGIC
// ==========================================
const forgotBtn = document.getElementById('forgotPassBtn');
const forgotModal = document.getElementById('forgotModal');

if (forgotBtn) {
    forgotBtn.onclick = (e) => {
        e.preventDefault();
        forgotModal.style.display = 'flex';
    };
}

function closeResetModal() {
    forgotModal.style.display = 'none';
}

async function handlePasswordReset() {
    const email = document.getElementById('resetEmail').value;
    if (!email) return alert("Please enter your email.");

    try {
        // This triggers the email verification logic in your worker
        const res = await fetch(`${API_BASE}/api/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        alert("If your email exists in our system, you will receive a reset link shortly.");
        closeResetModal();
    } catch (e) {
        alert("Error sending reset request.");
    }
}
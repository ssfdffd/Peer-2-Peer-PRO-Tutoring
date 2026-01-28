// ==========================================
// CONFIGURATION: Peer-2-Peer PRO Auth
// ==========================================
const API_BASE = "https://damp-art-617fp2p-authentification-login.buhle-1ce.workers.dev"; 

// 1. AUTO-LOGIN CHECK (The "Unlimited Session" Feel)
document.addEventListener('DOMContentLoaded', () => {
    const existingToken = localStorage.getItem('p2p_session_token');
    const existingRole = localStorage.getItem('p2p_user_role');

    // If already logged in, skip this page
    if (existingToken && existingRole) {
        console.log("Found existing session, redirecting...");
        window.location.href = existingRole === 'tutor' ? 'tutors-page.html' : 'student-page.html';
        return; 
    }

    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const signupMsg = document.getElementById('signupMsg');
    const loginMsg = document.getElementById('loginMsg');

    // ==========================================
    // 2. HANDLE SIGNUP (Create Account)
    // ==========================================
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            
            // Get data from the form
            const formData = new FormData(e.target);
            
            // We map the HTML names to match your SQL columns
            const payload = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                age: formData.get('age'),
                phone: formData.get('phone'),
                backupPhone: formData.get('backupPhone'),
                schoolName: formData.get('schoolName'),
                email: formData.get('email'),
                userType: formData.get('userType'),
                grade: formData.get('grade'),
                schoolCode: formData.get('schoolCode'),
                password: formData.get('password'),
                agreeTerms: formData.get('agreeTerms') ? 1 : 0
            };

            // Safety check: Password length
            if (payload.password.length < 8) {
                signupMsg.innerText = "❌ Password must be at least 8 characters.";
                signupMsg.style.color = "#ff4444";
                return;
            }

            btn.disabled = true;
            btn.innerText = "Processing Security...";

            try {
                const res = await fetch(`${API_BASE}/api/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await res.json();

                if (res.ok && result.success) {
                    signupMsg.style.color = "#32cd32";
                    signupMsg.innerText = "✅ Account Created! Log in on the left.";
                    signupForm.reset();
                } else {
                    signupMsg.style.color = "#ff4444";
                    signupMsg.innerText = "❌ " + (result.error || "Signup failed.");
                }
            } catch (err) {
                console.error("Signup Error:", err);
                signupMsg.innerText = "❌ Connection failed. Check if your Worker is online.";
            } finally {
                btn.disabled = false;
                btn.innerText = "Register & Agree";
            }
        });
    }

    // ==========================================
    // 3. HANDLE LOGIN
    // ==========================================
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            const email = e.target.email.value;
            const password = e.target.password.value;

            btn.disabled = true;
            btn.innerText = "Authenticating...";

            try {
                const res = await fetch(`${API_BASE}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const result = await res.json();

                if (res.ok && result.success) {
                    // Save session to browser storage
                    localStorage.setItem('p2p_session_token', result.token);
                    localStorage.setItem('p2p_user_role', result.role);

                    // Redirect based on user type
                    if (result.role === 'tutor') {
                        window.location.href = 'tutors-page.html';
                    } else {
                        window.location.href = 'student-page.html';
                    }
                } else {
                    loginMsg.innerText = "❌ Invalid email or password.";
                    loginMsg.style.color = "#ff4444";
                }
            } catch (err) {
                console.error("Login Error:", err);
                loginMsg.innerText = "❌ Server error. Check your Internet connection.";
            } finally {
                btn.disabled = false;
                btn.innerText = "Login";
            }
        });
    }
});

// ==========================================
// 4. FORGOT PASSWORD MODAL
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
    if(forgotModal) forgotModal.style.display = 'none';
}

async function handlePasswordReset() {
    const emailInput = document.getElementById('resetEmail');
    const email = emailInput ? emailInput.value : "";
    
    if (!email) return alert("Please enter your email.");

    try {
        const res = await fetch(`${API_BASE}/api/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        alert("If your email is registered, a reset link will be sent to " + email);
        closeResetModal();
    } catch (e) {
        alert("Could not process request. Please try again later.");
    }
}
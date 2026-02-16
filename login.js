const API_BASE = "https://damp-art-617fp2p-authentification-login.buhle-1ce.workers.dev";

document.addEventListener('DOMContentLoaded', () => {
    // Test connection to worker
    testWorkerConnection();

    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    window.addEventListener('beforeunload', () => {
        const email = sessionStorage.getItem('p2p_email');
        const sessionId = sessionStorage.getItem('p2p_sessionId');
        if (email && sessionId) {
            navigator.sendBeacon(
                `${API_BASE}/api/logout`,
                JSON.stringify({ email, sessionId })
            );
        }
    });
});

// Test worker connection
async function testWorkerConnection() {
    try {
        const response = await fetch(`${API_BASE}/api/test`);
        const data = await response.json();
        console.log("Worker connection successful:", data);
    } catch (err) {
        console.error("Worker connection failed:", err);
        // Show warning but don't block
        console.warn("Make sure your worker URL is correct and CORS is properly configured");
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    btn.disabled = true;
    btn.textContent = "Authenticating...";

    try {
        console.log("Attempting login for:", email);
        console.log("API URL:", `${API_BASE}/api/login`);

        const response = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password }),
            mode: 'cors', // Explicitly set CORS mode
            credentials: 'omit' // Changed from 'include' for testing
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error response:", errorText);
            try {
                const errorJson = JSON.parse(errorText);
                alert(`Login Failed: ${errorJson.error || "Unknown error"}`);
            } catch {
                alert(`Login Failed: Server returned ${response.status}`);
            }
            return;
        }

        const result = await response.json();
        console.log("Login result:", result);

        if (result.success) {
            const role = result.role.toLowerCase().trim();

            sessionStorage.setItem('p2p_email', email);
            sessionStorage.setItem('p2p_name', result.name);
            sessionStorage.setItem('p2p_userType', role);
            sessionStorage.setItem('p2p_role', role);
            sessionStorage.setItem('p2p_sessionId', result.sessionId);

            if (role === 'tutor') {
                window.location.replace('tutor-portal.html');
            } else {
                window.location.replace('student-portal.html');
            }
        } else {
            alert(`Login Failed: ${result.error || "Invalid credentials"}`);
        }
    } catch (err) {
        console.error("Login error details:", err);
        alert(`Connection Error: ${err.message}\n\nPlease check:\n1. Worker URL is correct\n2. Worker is running\n3. CORS headers are set correctly`);
    } finally {
        btn.disabled = false;
        btn.textContent = "Login";
    }
}

// Rest of your functions remain the same...
async function handleLogout() {
    const email = sessionStorage.getItem('p2p_email');
    const sessionId = sessionStorage.getItem('p2p_sessionId');

    if (!email) {
        sessionStorage.clear();
        window.location.href = 'login.html';
        return;
    }

    try {
        await fetch(`${API_BASE}/api/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, sessionId }),
            mode: 'cors'
        });
    } catch (err) {
        console.warn("Logout API failed:", err);
    } finally {
        sessionStorage.clear();
        window.location.href = 'login.html';
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/api/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            mode: 'cors'
        });

        const result = await response.json();

        if (result.success) {
            alert(result.message || "Account created successfully!");
            window.location.href = 'login.html';
        } else {
            alert(`Signup Failed: ${result.error || "Unknown error"}`);
        }
    } catch (err) {
        console.error("Signup error:", err);
        alert(`Network Error: ${err.message}`);
    } finally {
        btn.disabled = false;
    }
}

// Forgot password functions
window.showForgotModal = function () {
    document.getElementById('forgotModal').style.display = 'flex';
}

window.closeForgotModal = function () {
    document.getElementById('forgotModal').style.display = 'none';
}

window.handleForgotSubmit = async function () {
    const email = document.getElementById('forgotEmail')?.value?.trim();
    if (!email) return alert("Please enter your email address");

    const btn = document.getElementById('forgotBtn');
    btn.disabled = true;
    btn.textContent = "Sending...";

    try {
        const response = await fetch(`${API_BASE}/api/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
            mode: 'cors'
        });

        const result = await response.json();

        if (result.success) {
            alert("If your email exists in our system, you will receive reset instructions.");
            closeForgotModal();
        } else {
            alert("Request failed. Please try again later.");
        }
    } catch (err) {
        console.error("Password reset error:", err);
        alert(`Error: ${err.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = "Send Recovery Link";
    }
}
const API_BASE = "https://damp-art-617fp2p-authentification-login.buhle-1ce.workers.dev";

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

    // Captures all fields from your HTML form
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
        // Checkbox returns null if unchecked, or a value if checked
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
            // Store user details in the browser memory
            localStorage.setItem('p2p_token', result.token);
            localStorage.setItem('p2p_role', result.role);
            localStorage.setItem('p2p_name', result.name);
            
            // SMART REDIRECT: Send user to their specific portal
            if (result.role === 'tutor') {
                window.location.href = 'tutor-portal.html';
            } else {
                window.location.href = 'student-portal.html';
            }
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
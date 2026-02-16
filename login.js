// ============================================
// PEER-2-PEER PRO LOGIN SYSTEM
// Complete Functional Code with All Features
// ============================================

// Worker API URL - Make sure this is correct
const API_BASE = "https://damp-art-617fp2p-authentification-login.buhle-1ce.workers.dev";

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Login page initialized');

    // Get form elements
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    // Attach event listeners if forms exist
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('✅ Login form handler attached');
    }

    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
        console.log('✅ Signup form handler attached');
    }

    // Check if user is already logged in
    checkExistingSession();

    // Test connection to worker on load
    testWorkerConnection();
});

// ============================================
// CONNECTION TESTING
// ============================================
async function testWorkerConnection() {
    try {
        const response = await fetch(`${API_BASE}/api/test`, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Worker connection successful:', data);
        } else {
            console.warn('⚠️ Worker connection returned status:', response.status);
        }
    } catch (err) {
        console.warn('⚠️ Worker connection test failed (might be CORS):', err.message);
        // Don't show error to user, just log it
    }
}

// ============================================
// SESSION MANAGEMENT
// ============================================
function checkExistingSession() {
    const email = sessionStorage.getItem('p2p_email');
    const role = sessionStorage.getItem('p2p_role');

    if (email && role) {
        console.log('👤 Existing session found for:', email);
        // Optional: Auto-redirect if already logged in
        // if (role === 'tutor') window.location.href = 'tutor-portal.html';
        // else window.location.href = 'student-portal.html';
    }
}

// ============================================
// LOGIN HANDLER
// ============================================
async function handleLogin(e) {
    e.preventDefault();

    // Get form elements
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const emailInput = form.querySelector('input[name="email"]');
    const passwordInput = form.querySelector('input[name="password"]');

    // Validate inputs
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showNotification('Please enter both email and password', 'error');
        return;
    }

    // Disable button during processing
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '🔄 Logging in...';

    try {
        console.log('🔐 Attempting login for:', email);

        // Make API request
        const response = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        console.log('📡 Response status:', response.status);

        // Get response text first for debugging
        const responseText = await response.text();
        console.log('📦 Raw response:', responseText);

        // Try to parse JSON
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            console.error('❌ Failed to parse response:', responseText);
            throw new Error('Server returned an invalid response');
        }

        // Handle response
        if (response.ok && result.success) {
            // Successful login
            const role = (result.role || 'student').toLowerCase().trim();
            const name = result.name || email.split('@')[0];
            const sessionId = result.sessionId || Date.now().toString();

            // Store in sessionStorage
            sessionStorage.setItem('p2p_email', email);
            sessionStorage.setItem('p2p_name', name);
            sessionStorage.setItem('p2p_userType', role);
            sessionStorage.setItem('p2p_role', role);
            sessionStorage.setItem('p2p_sessionId', sessionId);
            sessionStorage.setItem('p2p_lastLogin', new Date().toISOString());

            console.log('✅ Login successful for:', email, 'Role:', role);

            // Show success message
            showNotification(`Welcome back, ${name}!`, 'success');

            // Redirect based on role
            setTimeout(() => {
                if (role === 'tutor') {
                    window.location.href = 'tutor-portal.html';
                } else {
                    window.location.href = 'student-portal.html';
                }
            }, 500);

        } else {
            // Login failed
            const errorMsg = result.error || 'Invalid email or password';
            console.warn('❌ Login failed:', errorMsg);
            showNotification(errorMsg, 'error');
        }

    } catch (err) {
        console.error('❌ Login error:', err);

        // User-friendly error message
        let errorMessage = 'Connection error. Please try again.';

        if (err.message.includes('Failed to fetch')) {
            errorMessage = 'Cannot connect to server. Please check your internet connection.';
        } else if (err.message.includes('JSON')) {
            errorMessage = 'Server error. Please try again later.';
        }

        showNotification(errorMessage, 'error');

    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}

// ============================================
// SIGNUP HANDLER
// ============================================
async function handleSignup(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;

    // Collect form data
    const formData = new FormData(form);
    const userData = {
        firstName: formData.get('firstName') || '',
        lastName: formData.get('lastName') || '',
        email: formData.get('email') || '',
        password: formData.get('password') || '',
        userType: formData.get('userType') || 'student',
        age: formData.get('age') || '',
        grade: formData.get('grade') || '',
        phone: formData.get('phone') || '',
        backupPhone: formData.get('backupPhone') || '',
        schoolName: formData.get('schoolName') || '',
        schoolCode: formData.get('schoolCode') || '',
        agreeTerms: formData.get('agreeTerms') === 'on'
    };

    // Validate required fields
    if (!userData.email || !userData.password || !userData.firstName) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    if (!userData.agreeTerms) {
        showNotification('You must agree to the terms and conditions', 'error');
        return;
    }

    if (userData.password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }

    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = '🔄 Creating account...';

    try {
        console.log('📝 Creating account for:', userData.email);

        const response = await fetch(`${API_BASE}/api/signup`, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const responseText = await response.text();
        console.log('📦 Signup response:', responseText);

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            throw new Error('Invalid server response');
        }

        if (response.ok && result.success) {
            // Success
            const message = result.message || 'Account created successfully!';

            if (userData.userType === 'tutor') {
                showNotification('Tutor account created! Please wait for admin approval.', 'success');
            } else {
                showNotification('Account created successfully! You can now login.', 'success');
            }

            // Clear form
            form.reset();

            // Redirect to login after delay
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);

        } else {
            // Error
            const errorMsg = result.error || 'Failed to create account';
            showNotification(errorMsg, 'error');
        }

    } catch (err) {
        console.error('❌ Signup error:', err);
        showNotification('Connection error. Please try again.', 'error');

    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}

// ============================================
// FORGOT PASSWORD MODAL FUNCTIONS
// ============================================

// Show forgot password modal
window.showForgotModal = function () {
    const modal = document.getElementById('forgotModal');
    if (modal) {
        modal.style.display = 'flex';
        // Clear previous input
        const emailInput = document.getElementById('forgotEmail');
        if (emailInput) emailInput.value = '';
    }
};

// Close forgot password modal
window.closeForgotModal = function () {
    const modal = document.getElementById('forgotModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

// Handle forgot password submission
window.handleForgotSubmit = async function () {
    const emailInput = document.getElementById('forgotEmail');
    const email = emailInput?.value?.trim();
    const submitBtn = document.getElementById('forgotBtn');

    if (!email) {
        showNotification('Please enter your email address', 'error');
        return;
    }

    // Disable button
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
        const response = await fetch(`${API_BASE}/api/forgot-password`, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Password reset instructions sent to your email!', 'success');
            closeForgotModal();
        } else {
            showNotification(result.error || 'Failed to send reset email', 'error');
        }

    } catch (err) {
        console.error('Forgot password error:', err);
        showNotification('Connection error. Please try again.', 'error');

    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
};

// ============================================
// LOGOUT FUNCTION
// ============================================
async function handleLogout() {
    const email = sessionStorage.getItem('p2p_email');
    const sessionId = sessionStorage.getItem('p2p_sessionId');

    console.log('🚪 Logging out:', email);

    if (email && sessionId) {
        try {
            // Call logout API (fire and forget)
            fetch(`${API_BASE}/api/logout`, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, sessionId }),
                keepalive: true // Important for page unload
            }).catch(err => console.warn('Logout API error:', err));

        } catch (err) {
            console.warn('Logout error:', err);
        }
    }

    // Clear session storage
    sessionStorage.clear();

    // Redirect to login
    window.location.href = 'login.html';
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Show notification to user
function showNotification(message, type = 'info') {
    // Check if we already have a notification container
    let container = document.getElementById('notification-container');

    if (!container) {
        // Create container
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 350px;
        `;
        document.body.appendChild(container);
    }

    // Create notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
        color: white;
        padding: 15px 20px;
        margin-bottom: 10px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
        cursor: pointer;
        font-weight: 500;
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    notification.textContent = message;
    notification.onclick = () => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    };

    container.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// ============================================
// EXPORT FUNCTIONS FOR GLOBAL ACCESS
// ============================================

// Make functions available globally
window.handleLogout = handleLogout;
window.showNotification = showNotification;

console.log('✅ Login.js fully loaded and ready');
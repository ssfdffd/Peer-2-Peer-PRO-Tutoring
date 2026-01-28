// =====================
// FIXED PRODUCTION CONFIGURATION
// =====================

// Use relative paths for production - this works for both local and production
function getAPIBase() {
    // For production on your domain
    if (window.location.hostname.includes('peer-2-peer.co.za')) {
        // Use relative path (no domain) - this works on same domain
        return '';
    }
    
    // For local development
    return "http://localhost:3000";
}

const API = getAPIBase();
console.log("🌐 API Base URL:", API || "Same domain (relative path)");

// Connection tester with detailed logging
async function testConnection() {
    // Use relative path for API calls
    const testUrl = `${API}/api/health`;
    console.log("🔍 Testing connection to:", testUrl || "/api/health");
    
    try {
        const startTime = Date.now();
        const response = await fetch(testUrl, {
            method: 'GET',
            headers: { 
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        const endTime = Date.now();
        
        console.log(`✅ Response time: ${endTime - startTime}ms`);
        console.log(`✅ Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log("✅ Server response:", data);
            
            // Update UI if elements exist
            const messages = ['loginMsg', 'signupMsg'].map(id => document.getElementById(id)).filter(Boolean);
            messages.forEach(msg => {
                msg.textContent = "✓ Server connected";
                msg.style.color = "green";
            });
            
            return true;
        } else {
            console.error(`❌ Server error: ${response.status}`);
            const errorData = await response.text();
            console.error("Error details:", errorData);
            showErrorMessage(`Server error ${response.status}. Please try again.`);
            return false;
        }
    } catch (error) {
        console.error("❌ Connection failed:", error);
        
        // Detailed error messages
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            showErrorMessage("Cannot connect to server. The server may be starting up or offline.");
        } else if (error.name === 'AbortError') {
            showErrorMessage("Connection timeout. The server is taking too long to respond.");
        } else {
            showErrorMessage("Network error. Please check your connection.");
        }
        
        return false;
    }
}

function showErrorMessage(message) {
    const messages = ['loginMsg', 'signupMsg'].map(id => document.getElementById(id)).filter(Boolean);
    messages.forEach(msg => {
        if (msg) {
            msg.innerHTML = `⚠️ ${message}<br><small>Try refreshing in 30 seconds</small>`;
            msg.style.color = "orange";
        }
    });
}

// Test connection when page loads
document.addEventListener("DOMContentLoaded", function() {
    console.log("🚀 Page loaded. Testing server connection...");
    
    // Run connection test immediately
    testConnection();
    
    // Your existing DOMContentLoaded code...
    const openBtn = document.getElementById("openNav");
    const closeBtn = document.getElementById("closeNav");
    const sideMenu = document.getElementById("side-menu");

    if (openBtn && sideMenu) {
        openBtn.addEventListener("click", () => (sideMenu.style.width = "280px"));
    }

    if (closeBtn && sideMenu) {
        closeBtn.addEventListener("click", () => (sideMenu.style.width = "0"));
    }

    window.addEventListener("click", (e) => {
        if (
            sideMenu &&
            sideMenu.style.width === "280px" &&
            e.target !== sideMenu &&
            !sideMenu.contains(e.target) &&
            e.target !== openBtn
        ) {
            sideMenu.style.width = "0";
        }
    });

    initLoginForm();
    initSignupForm();
});

// =====================
// LOGIN FORM - FIXED
// =====================
function initLoginForm() {
    const loginForm = document.getElementById("loginForm");

    if (!loginForm) {
        console.warn("⚠️ Login form not found on this page");
        return;
    }

    console.log("✅ Login form found, attaching submit handler");

    loginForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const name = document.getElementById("loginUser").value.trim();
        const password = document.getElementById("loginPass").value;
        const loginMsg = document.getElementById("loginMsg");
        const loginBtn = loginForm.querySelector("button");

        console.log(`📝 Login attempt - Username: ${name}, Password length: ${password ? password.length : 0}`);

        if (!name || !password) {
            if (loginMsg) {
                loginMsg.textContent = "Please enter name and password";
                loginMsg.style.color = "red";
            }
            return;
        }

        loginBtn.disabled = true;
        loginBtn.textContent = "Logging in...";

        try {
            console.log(`📤 Sending login request to: ${API}/api/login`);
            
            const res = await fetch(`${API}/api/login`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({ name, password })
            });

            console.log(`📥 Login response status: ${res.status}`);
            
            const data = await res.json();
            console.log("📥 Login response data:", data);

            loginBtn.disabled = false;
            loginBtn.textContent = "Sign In";

            if (!res.ok || !data.success) {
                if (loginMsg) {
                    loginMsg.textContent = data.message || `Login failed (${res.status})`;
                    loginMsg.style.color = "red";
                }
                return;
            }

            // Store user data
            localStorage.setItem("name", data.name);
            localStorage.setItem("userType", data.userType || "student");
            localStorage.setItem("school_id", data.school_id || "public");
            localStorage.setItem("paymentStatus", data.paymentStatus || "unpaid");
            localStorage.setItem("email", data.email || "");
            localStorage.setItem("userId", data.userId || "");

            console.log(`📝 User data saved to localStorage:`, {
                name: data.name,
                userType: data.userType,
                school_id: data.school_id,
                userId: data.userId
            });

            // Show success message
            if (loginMsg) {
                loginMsg.textContent = "✅ Login successful! Redirecting...";
                loginMsg.style.color = "green";
            }

            // Redirect with confirmation
            setTimeout(() => {
                console.log(`🔄 Starting redirect for user type: ${data.userType}`);
                
                let redirectUrl = "index.html"; // default fallback
                
                if (data.userType === "tutor") {
                    redirectUrl = "tutor-portal.html";
                } else if (data.userType === "student") {
                    redirectUrl = "student-portal.html";
                }
                
                console.log(`🎯 Redirecting to: ${redirectUrl}`);
                
                // Simple redirect without file checking
                window.location.href = redirectUrl;
            }, 1000);

        } catch (err) {
            console.error("❌ Login error:", err);
            loginBtn.disabled = false;
            loginBtn.textContent = "Sign In";
            
            if (loginMsg) {
                loginMsg.textContent = "❌ Server error. Check console and server logs.";
                loginMsg.style.color = "red";
            }
            
            // Try to give more specific error message
            if (err.name === 'TypeError') {
                if (loginMsg) {
                    loginMsg.textContent = "❌ Cannot connect to server. Make sure server.js is running.";
                }
            }
        }
    });
}

// =====================
// SIGNUP FORM - FIXED
// =====================
function initSignupForm() {
    const signupForm = document.getElementById("signupForm");

    if (!signupForm) {
        console.warn("⚠️ Signup form not found on this page");
        return;
    }

    console.log("✅ Signup form found, attaching submit handler");

    signupForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const formData = new FormData(signupForm);
        const data = Object.fromEntries(formData.entries());
        const signupMsg = document.getElementById("signupMsg");
        const signupBtn = signupForm.querySelector("button");

        console.log("📝 Raw form data:", data);

        // Validate required fields
        if (!data.name || !data.email || !data.password || !data.userType) {
            if (signupMsg) {
                signupMsg.textContent = "Please fill all required fields";
                signupMsg.style.color = "#ff4444";
            }
            return;
        }

        const fullName = data.name.trim();
        
        const payload = {
            name: fullName,
            email: data.email,
            password: data.password,
            userType: data.userType,
            school_id: data.schoolCode || data.school || "public"
        };

        console.log("📤 Registration payload:", payload);
        console.log("📤 Sending to:", `${API}/api/register`);

        signupBtn.disabled = true;
        signupBtn.textContent = "Creating account...";

        try {
            const res = await fetch(`${API}/api/register`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(payload)
            });

            console.log(`📥 Signup response status: ${res.status}`);
            
            const result = await res.json();
            console.log("📥 Signup response data:", result);

            signupBtn.disabled = false;
            signupBtn.textContent = "Sign Up";

            if (!res.ok || !result.success) {
                if (signupMsg) {
                    signupMsg.textContent = result.message || `Signup failed (${res.status})`;
                    signupMsg.style.color = "#ff4444";
                }
                return;
            }

            // Success
            if (signupMsg) {
                signupMsg.textContent = "✅ Account created successfully! You may now login.";
                signupMsg.style.color = "#32cd32";
            }
            signupForm.reset();

            // Auto-switch to login tab if exists
            setTimeout(() => {
                const loginTab = document.querySelector('a[href="#login"]');
                if (loginTab) loginTab.click();
            }, 2000);

        } catch (err) {
            console.error("❌ Registration error:", err);
            signupBtn.disabled = false;
            signupBtn.textContent = "Sign Up";
            
            if (signupMsg) {
                signupMsg.textContent = "❌ Cannot connect to server. Make sure server is running.";
                signupMsg.style.color = "#ff4444";
            }
        }
    });
}
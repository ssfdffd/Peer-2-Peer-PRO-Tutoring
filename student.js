// ============================================
// STUDENT PORTAL - SECURE PRODUCTION VERSION
// ============================================

const API_BASE = "https://damp-art-617fp2p-authentification-login.buhle-1ce.workers.dev";

// UI-only data from sessionStorage (set during login)
const studentName = sessionStorage.getItem("p2p_name") || "Student";
const studentRole = sessionStorage.getItem("p2p_role");

// ============================================
// 1. SECURE SESSION VALIDATION
// ============================================

/**
 * Validates the cookie session with the Cloudflare Worker
 * This replaces the old localStorage token check
 */
async function validateStudentSession() {
    try {
        const response = await fetch(`${API_BASE}/api/verify-session`, {
            method: 'GET',
            credentials: 'include' // Required to send the HTTP-Only cookies
        });

        const result = await response.json();

        // Ensure user is authenticated AND has the correct role
        if (!response.ok || !result.authenticated || studentRole !== "student") {
            throw new Error("Unauthorized access");
        }

        console.log("✅ Session verified via secure cookies");
        
        // Update the UI with the student's name
        const display = document.getElementById('userNameDisplay');
        if (display) display.innerText = studentName;

    } catch (err) {
        console.error("❌ Auth Failed:", err);
        sessionStorage.clear();
        // Redirect to login if the 30-day refresh token has expired
        window.location.href = "login.html";
    }
}

// ============================================
// 2. CORE PORTAL LOGIC
// ============================================

function initializeStudentPage() {
    console.log("🎓 Initializing Student Dashboard...");
    loadInitialData();
    setupAutoRefresh();
}

/**
 * Fetches available classes/materials
 * Note: Your API endpoints should also check for cookies on the backend
 */
async function loadInitialData() {
    try {
        // Example: loadAvailableClasses();
        // Example: loadStudyMaterials();
    } catch (error) {
        showError("Failed to load dashboard data.");
    }
}

function setupAutoRefresh() {
    // Refresh data every 5 minutes to keep the session active
    setInterval(() => {
        validateStudentSession();
    }, 300000);
}

// ============================================
// 3. UTILITY & UI FUNCTIONS
// ============================================

function showMessage(text, type = "info") {
    const messageDiv = document.createElement('div');
    messageDiv.className = `p2p-toast ${type}`;
    messageDiv.innerHTML = `
        <div class="toast-content">
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i>
            <span>${text}</span>
        </div>
    `;
    document.body.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.classList.add('fade-out');
        setTimeout(() => messageDiv.remove(), 300);
    }, 5000);
}

function showError(text) {
    showMessage(text, "error");
}

/**
 * SECURE LOGOUT
 * Clears UI data and redirects (Cookies will be handled by the browser)
 */
function logout() {
    if (confirm("Are you sure you want to logout?")) {
        sessionStorage.clear();
        window.location.href = "login.html";
    }
}

// ============================================
// INITIALIZE ON LOAD
// ============================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Run the security check first
    validateStudentSession().then(() => {
        // 2. If successful, initialize the rest of the page
        initializeStudentPage();
    });
});
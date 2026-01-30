// auth.js - Secure Cookie & Session Manager
const API_BASE = "https://damp-art-617fp2p-authentification-login.buhle-1ce.workers.dev";

const AuthManager = {
  // Check if session is valid by pinging the Worker
  // This is the ONLY way to check now that tokens are in HttpOnly cookies
  checkSession: async function() {
    try {
      const response = await fetch(`${API_BASE}/api/verify-session`, {
        method: 'GET',
        credentials: 'include' // Mandatory: Sends the 30-day refresh cookie
      });
      
      if (!response.ok) return false;
      
      const data = await response.json();
      return data.authenticated === true;
    } catch (err) {
      console.error("Auth check failed:", err);
      return false;
    }
  },

  // Redirect users if they are on the wrong portal or logged out
  validatePortalAccess: async function() {
    const isAuthenticated = await this.checkSession();
    const userType = sessionStorage.getItem('p2p_role'); // Role kept in sessionStorage for UI logic
    const path = window.location.pathname;

    // 1. If not logged in and trying to access a portal, boot to login
    if (!isAuthenticated) {
      if (path.includes('portal.html')) {
        this.logout();
      }
      return;
    }

    // 2. If logged in, ensure they are on the right portal
    if (userType === 'student' && path.includes('tutor-portal')) {
      window.location.href = 'student-portal.html';
    } else if (userType === 'tutor' && path.includes('student-portal')) {
      window.location.href = 'tutor-portal.html';
    }
  },

  logout: function() {
    // We clear UI data. The browser handles the cookie expiration/cleanup
    sessionStorage.clear();
    localStorage.clear(); 
    window.location.href = 'login.html';
  }
};

// Automatically run on every page load
document.addEventListener('DOMContentLoaded', () => {
  AuthManager.validatePortalAccess();
});
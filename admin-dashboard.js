const API_BASE = "https://damp-art-617fp2p-authentification-login.buhle-1ce.workers.dev";

document.addEventListener('DOMContentLoaded', () => {
    // Check admin authentication
    const adminRole = sessionStorage.getItem('p2p_role');
    if (adminRole !== 'admin') {
        window.location.href = 'admin-login.html';
        return;
    }

    // Display admin name
    const adminName = sessionStorage.getItem('p2p_name');
    if (adminName) {
        document.getElementById('adminName').textContent = `Welcome, ${adminName}`;
    }

    // Load dashboard stats
    loadDashboardStats();
});

async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/stats`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
            document.getElementById('totalUsers').textContent = result.stats.totalUsers;
            document.getElementById('onlineUsers').textContent = result.stats.onlineUsers;
            document.getElementById('totalTutors').textContent = result.stats.totalTutors;
            document.getElementById('pendingTutors').textContent = result.stats.pendingTutors;
        }
    } catch (err) {
        console.error("Failed to load stats:", err);
        document.getElementById('totalUsers').textContent = 'Error';
    }
}

// ✅ Logout Function
window.handleAdminLogout = async function () {
    const email = sessionStorage.getItem('p2p_email');
    const sessionId = sessionStorage.getItem('p2p_sessionId');

    if (email && sessionId) {
        try {
            await fetch(`${API_BASE}/api/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, sessionId }),
                credentials: 'include'
            });
        } catch (err) {
            console.warn("Logout API failed (proceeding):", err);
        }
    }

    sessionStorage.clear();
    window.location.href = 'admin-login.html';
};
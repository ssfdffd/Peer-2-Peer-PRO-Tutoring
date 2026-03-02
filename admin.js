// ============================================
// PEER-2-PEER PRO - ADMIN PORTAL CONTROLLER
// Secure, theme-matched, no data exposure
// ============================================

// ✅ API Base - Match your Worker deployment
const API_BASE = "https://damp-art-617fp2p-authentification-login.buhle-1ce.workers.dev";

// 🔐 Session validation on page load
document.addEventListener('DOMContentLoaded', async () => {
    const email = sessionStorage.getItem('p2p_email');
    const role = sessionStorage.getItem('p2p_role');
    const sessionId = sessionStorage.getItem('p2p_sessionId');

    // Block if no session or not admin
    if (!email || role !== 'admin') {
        await verifyAdminServerSide(email, sessionId);
        return; // Redirect happens inside verifyAdminServerSide if failed
    }

    // Load dashboard
    loadDashboardStats();
    setupEventListeners();
});

// 🔐 Server-side admin verification (fallback)
async function verifyAdminServerSide(email, sessionId) {
    try {
        const res = await fetch(`${API_BASE}/api/verify-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, sessionId }),
            credentials: 'include'
        });
        const result = await res.json();

        if (!result.success) {
            sessionStorage.clear();
            alert('Admin access required. Redirecting to login...');
            window.location.href = 'login.html';
            return false;
        }
        return true;
    } catch (err) {
        console.error('Admin verification failed:', err);
        sessionStorage.clear();
        window.location.href = 'login.html';
        return false;
    }
}

// 📊 Load dashboard statistics via secure API
async function loadDashboardStats() {
    const sessionId = sessionStorage.getItem('p2p_sessionId');

    try {
        const res = await fetch(`${API_BASE}/api/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${sessionId}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!res.ok) throw new Error('Failed to load stats');
        const data = await res.json();

        // Update UI with safe values
        document.getElementById('stat-users').textContent = data.totalUsers ?? 0;
        document.getElementById('stat-online').textContent = data.onlineNow ?? 0;
        document.getElementById('stat-tutors').textContent = data.pendingTutors ?? 0;
        document.getElementById('stat-activity').textContent = data.todayLogins ?? 0;

    } catch (err) {
        console.error('Stats load error:', err);
        document.getElementById('stats-grid').innerHTML =
            '<p style="color: #dc3545; grid-column: 1/-1">⚠️ Unable to load dashboard. Please refresh or contact support.</p>';
    }
}

// 🎛️ Setup admin action buttons
function setupEventListeners() {
    // Review pending tutors
    document.getElementById('btn-review-tutors')?.addEventListener('click', loadPendingTutors);

    // Export user data
    document.getElementById('btn-export-users')?.addEventListener('click', exportUserData);

    // View audit log
    document.getElementById('btn-audit-log')?.addEventListener('click', viewAuditLog);

    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', handleAdminLogout);
}

// 👨‍🏫 Load pending tutor applications
async function loadPendingTutors() {
    const sessionId = sessionStorage.getItem('p2p_sessionId');
    const container = document.getElementById('admin-data-container');
    const content = document.getElementById('data-content');
    const title = document.getElementById('data-section-title');

    try {
        content.innerHTML = '<p style="text-align:center; padding:20px">🔄 Loading applications...</p>';
        container.style.display = 'block';
        title.textContent = '👨‍🏫 Pending Tutor Applications';

        const res = await fetch(`${API_BASE}/api/admin/pending-tutors`, {
            headers: { 'Authorization': `Bearer ${sessionId}` },
            credentials: 'include'
        });

        if (!res.ok) throw new Error('Failed to fetch tutors');
        const data = await res.json();

        if (!data.tutors || data.tutors.length === 0) {
            content.innerHTML = '<p style="text-align:center; color:#666">✅ No pending tutor applications.</p>';
            return;
        }

        // Render tutor cards (NO sensitive data exposed in HTML source)
        content.innerHTML = data.tutors.map(tutor => `
            <div class="tutor-card" data-id="${tutor.id}">
                <div class="tutor-header">
                    <strong>${escapeHtml(tutor.name)}</strong>
                    <span class="badge">Pending</span>
                </div>
                <div class="tutor-details">
                    <p>📧 ${escapeHtml(tutor.email)}</p>
                    <p>🎓 Grade: ${escapeHtml(tutor.grade || 'N/A')}</p>
                    <p>🏫 School: ${escapeHtml(tutor.school || 'N/A')}</p>
                    <p>📱 ${escapeHtml(tutor.phone || 'N/A')}</p>
                    <p>📅 Applied: ${new Date(tutor.applied * 1000).toLocaleDateString()}</p>
                </div>
                <div class="tutor-actions">
                    <button class="action-btn approve" onclick="approveTutor(${tutor.id})">✅ Approve</button>
                    <button class="action-btn reject" onclick="rejectTutor(${tutor.id})">❌ Reject</button>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Load tutors error:', err);
        content.innerHTML = `<p style="color:#dc3545">Error loading applications: ${err.message}</p>`;
    }
}

// ✅ Approve tutor application
async function approveTutor(tutorId) {
    if (!confirm('Approve this tutor? They will gain immediate platform access.')) return;
    await updateTutorAccess(tutorId, 'approve');
}

// ❌ Reject tutor application  
async function rejectTutor(tutorId) {
    if (!confirm('Reject this tutor application? This action cannot be undone.')) return;
    await updateTutorAccess(tutorId, 'reject');
}

// 🔁 Helper: Update tutor Access status
async function updateTutorAccess(tutorId, action) {
    const sessionId = sessionStorage.getItem('p2p_sessionId');

    try {
        const res = await fetch(`${API_BASE}/api/admin/approve-tutor`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${sessionId}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tutorId, action }),
            credentials: 'include'
        });

        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Action failed');

        alert(`✅ Tutor ${action}d successfully!`);
        loadPendingTutors(); // Refresh list

    } catch (err) {
        console.error('Update tutor error:', err);
        alert(`❌ Error: ${err.message}`);
    }
}

// 📥 Export user data as CSV
async function exportUserData() {
    const sessionId = sessionStorage.getItem('p2p_sessionId');

    try {
        const res = await fetch(`${API_BASE}/api/admin/export-users`, {
            headers: { 'Authorization': `Bearer ${sessionId}` },
            credentials: 'include'
        });

        if (!res.ok) throw new Error('Export failed');

        // Trigger download
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `peer2peer-users-${Math.floor(Date.now() / 1000)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        alert('✅ Export started. Check your downloads folder.');

    } catch (err) {
        console.error('Export error:', err);
        alert(`❌ Export failed: ${err.message}`);
    }
}

// 📋 View audit log
async function viewAuditLog() {
    const sessionId = sessionStorage.getItem('p2p_sessionId');
    const container = document.getElementById('admin-data-container');
    const content = document.getElementById('data-content');
    const title = document.getElementById('data-section-title');

    try {
        content.innerHTML = '<p style="text-align:center; padding:20px">🔄 Loading audit trail...</p>';
        container.style.display = 'block';
        title.textContent = '📋 Admin Audit Log';

        const res = await fetch(`${API_BASE}/api/admin/audit-log?limit=100`, {
            headers: { 'Authorization': `Bearer ${sessionId}` },
            credentials: 'include'
        });

        if (!res.ok) throw new Error('Failed to fetch logs');
        const data = await res.json();

        if (!data.logs || data.logs.length === 0) {
            content.innerHTML = '<p style="text-align:center; color:#666">No audit entries found.</p>';
            return;
        }

        content.innerHTML = `
            <table class="audit-table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Action</th>
                        <th>User ID</th>
                        <th>IP Address</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.logs.map(log => `
                        <tr>
                            <td>${new Date(log.timestamp * 1000).toLocaleString()}</td>
                            <td><code>${escapeHtml(log.action)}</code></td>
                            <td>${log.target_user_id || '—'}</td>
                            <td><code>${escapeHtml(log.ip_address)}</code></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

    } catch (err) {
        console.error('Audit log error:', err);
        content.innerHTML = `<p style="color:#dc3545">Error loading audit log: ${err.message}</p>`;
    }
}

// 🚪 Admin logout
async function handleAdminLogout() {
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
            console.warn('Logout API failed (proceeding):', err);
        }
    }

    sessionStorage.clear();
    window.location.href = 'login.html';
}

// 🔒 XSS Protection: Escape HTML entities
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// 🌐 Global error handler for uncaught promises
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Don't show sensitive errors to user
});
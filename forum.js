const FORUM_API = "https://forum-worker.buhle-1ce.workers.dev";

// Global variables
let currentGradeFilter = 'all';
let filterEnabled = false;
let currentUser = {
    email: sessionStorage.getItem('p2p_email') || "guest@peer.co.za",
    name: sessionStorage.getItem('p2p_name') || "Guest Student",
    role: sessionStorage.getItem('p2p_role') || "student"
};
let replyingTo = null; // Stores parent message ID and details

document.addEventListener('DOMContentLoaded', () => {
    initializeForum();
});

async function initializeForum() {
    // Initialize grade tags
    initializeGradeTags();

    // Load initial messages
    await loadMessages();

    // Set up event listeners
    setupEventListeners();

    // Auto-refresh messages every 10 seconds
    setInterval(() => loadMessages(currentGradeFilter, filterEnabled), 10000);
}

function initializeGradeTags() {
    const gradeTagsContainer = document.getElementById('gradeTags');
    const grades = [
        { value: 'all', label: 'All Grades', emoji: '🏫', color: 'grade-all' },
        { value: '1', label: 'Grade 1', emoji: '📘', color: 'grade-1' },
        { value: '2', label: 'Grade 2', emoji: '📗', color: 'grade-2' },
        { value: '3', label: 'Grade 3', emoji: '📕', color: 'grade-3' },
        { value: '4', label: 'Grade 4', emoji: '📔', color: 'grade-4' },
        { value: '5', label: 'Grade 5', emoji: '📙', color: 'grade-5' },
        { value: '6', label: 'Grade 6', emoji: '📘', color: 'grade-6' },
        { value: '7', label: 'Grade 7', emoji: '📗', color: 'grade-7' },
        { value: '8', label: 'Grade 8', emoji: '📕', color: 'grade-8' },
        { value: '9', label: 'Grade 9', emoji: '📔', color: 'grade-9' },
        { value: '10', label: 'Grade 10', emoji: '📙', color: 'grade-10' },
        { value: '11', label: 'Grade 11', emoji: '📘', color: 'grade-11' },
        { value: '12', label: 'Grade 12', emoji: '📗', color: 'grade-12' }
    ];

    gradeTagsContainer.innerHTML = grades.map(grade => `
        <div class="grade-tag ${grade.color} ${grade.value === 'all' ? 'active' : ''}" 
             data-grade="${grade.value}">
            ${grade.emoji} ${grade.label}
        </div>
    `).join('');

    // Add click events to grade tags
    document.querySelectorAll('.grade-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            const grade = tag.dataset.grade;
            setActiveGradeFilter(grade);
            loadMessages(grade, filterEnabled);
        });
    });
}

function setupEventListeners() {
    const form = document.getElementById('messageForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await sendMessage();
    });

    // Grade select change
    const gradeSelect = document.getElementById('gradeSelect');
    gradeSelect.addEventListener('change', (e) => {
        currentGradeFilter = e.target.value;
        setActiveGradeFilter(currentGradeFilter);
        loadMessages(currentGradeFilter, filterEnabled);
    });

    // Toggle filter button
    const toggleFilterBtn = document.getElementById('toggleFilterBtn');
    toggleFilterBtn.addEventListener('click', () => {
        filterEnabled = !filterEnabled;
        toggleFilterBtn.innerHTML = filterEnabled ?
            '<i class="fas fa-eye"></i> Show All Grades' :
            '<i class="fas fa-eye-slash"></i> Hide Other Grades';

        loadMessages(currentGradeFilter, filterEnabled);
    });

    // Cancel reply button
    const cancelReplyBtn = document.getElementById('cancelReplyBtn');
    cancelReplyBtn.addEventListener('click', cancelReply);

    // Typing indicator
    const messageInput = document.getElementById('messageInput');
    messageInput.addEventListener('input', function () {
        const grade = document.getElementById('gradeSelectInput').value;
        if (grade && this.value.length > 0) {
            showTypingIndicator(grade);
        }
    });
}

function setActiveGradeFilter(grade) {
    // Update UI
    document.querySelectorAll('.grade-tag').forEach(tag => {
        tag.classList.remove('active');
        if (tag.dataset.grade === grade) {
            tag.classList.add('active');
        }
    });

    // Update select dropdown
    document.getElementById('gradeSelect').value = grade;
    currentGradeFilter = grade;
}

function setReplyingTo(messageId, userName, messagePreview) {
    replyingTo = {
        id: messageId,
        user_name: userName,
        message: messagePreview
    };

    // Show reply indicator
    const replyIndicator = document.getElementById('replyingTo');
    const replyingToText = document.getElementById('replyingToText');
    replyingToText.innerHTML = `<strong>Replying to ${escapeHTML(userName)}:</strong> "${escapeHTML(messagePreview.substring(0, 50))}${messagePreview.length > 50 ? '...' : ''}"`;
    replyIndicator.style.display = 'block';

    // Scroll to message input
    document.getElementById('messageInput').focus();
}

function cancelReply() {
    replyingTo = null;
    document.getElementById('replyingTo').style.display = 'none';
}

async function loadMessages(gradeFilter = 'all', hideOtherGrades = false) {
    const chatBox = document.getElementById('chatBox');

    try {
        chatBox.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-spin"></i> Loading discussions...</div>';

        const res = await fetch(`${FORUM_API}/api/forum/messages`);
        if (!res.ok) throw new Error('Failed to fetch messages');

        let messages = await res.json();

        // Filter messages based on grade and filter settings
        messages = messages.filter(msg => {
            const msgGrade = msg.grade || 'all';

            if (gradeFilter === 'all' && !hideOtherGrades) {
                return true;
            }

            if (hideOtherGrades) {
                return msgGrade === gradeFilter;
            }

            return gradeFilter === 'all' || msgGrade === gradeFilter;
        });

        if (messages.length === 0) {
            chatBox.innerHTML = `
                <div class="no-messages">
                    <i class="fas fa-comments fa-3x"></i>
                    <h3>No messages yet</h3>
                    <p>Be the first to start a discussion for ${gradeFilter === 'all' ? 'all grades' : 'Grade ' + gradeFilter}!</p>
                </div>
            `;
            return;
        }

        chatBox.innerHTML = messages.map(msg => renderMessage(msg)).join('');

        // Add event listeners to reply buttons
        document.querySelectorAll('.reply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const messageId = btn.dataset.messageId;
                const userName = btn.dataset.userName;
                const messagePreview = btn.dataset.messagePreview;
                setReplyingTo(messageId, userName, messagePreview);
            });
        });

        // Add event listeners to cancel reply buttons in forms
        document.querySelectorAll('.reply-cancel').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const form = btn.closest('.reply-form');
                if (form) form.classList.add('hidden');
            });
        });

        // Add event listeners to reply form submissions
        document.querySelectorAll('.reply-form').forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const messageId = form.dataset.messageId;
                const replyInput = form.querySelector('.reply-input');
                const message = replyInput.value.trim();

                if (message) {
                    await sendReply(messageId, message);
                    replyInput.value = '';
                    form.classList.add('hidden');
                }
            });
        });

        // Scroll to bottom if new message
        chatBox.scrollTop = chatBox.scrollHeight;

    } catch (err) {
        console.error("Chat load error", err);
        chatBox.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle fa-3x"></i>
                <h3>Error loading messages</h3>
                <p>Please check your connection and try again.</p>
            </div>
        `;
    }
}

function renderMessage(msg) {
    const isMe = msg.user_email === currentUser.email;
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = new Date(msg.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const msgGrade = msg.grade || 'all';
    const gradeClass = `grade-${msgGrade}`;

    // Determine message type
    let msgType = 'student';
    if (isMe) msgType = 'me';
    else if (msg.user_role === 'teacher') msgType = 'teacher';

    // Render replies
    const repliesHTML = msg.replies && msg.replies.length > 0
        ? msg.replies.map(reply => renderReply(reply, msg.id)).join('')
        : '';

    const replyCount = msg.reply_count || 0;

    return `
        <div class="msg ${msgType} ${gradeClass}" id="message-${msg.id}">
            <div class="msg-info">
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    <strong>${isMe ? 'You' : escapeHTML(msg.user_name)}</strong>
                    <span class="grade-badge">${msgGrade === 'all' ? 'General' : 'Grade ' + msgGrade}</span>
                    ${msg.user_role === 'teacher' ? '<span class="teacher-badge"><i class="fas fa-chalkboard-teacher"></i> Teacher</span>' : ''}
                    ${msg.user_role === 'tutor' ? '<span class="teacher-badge" style="background: linear-gradient(145deg, #f59e0b, #d97706);"><i class="fas fa-graduation-cap"></i> Tutor</span>' : ''}
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span class="time">${time}</span>
                    <span class="date">${date}</span>
                </div>
            </div>
            <div class="msg-text">${escapeHTML(msg.message)}</div>
            <div style="display: flex; align-items: center; margin-top: 0.8rem;">
                <button class="reply-btn" 
                        data-message-id="${msg.id}" 
                        data-user-name="${escapeHTML(msg.user_name)}"
                        data-message-preview="${escapeHTML(msg.message.substring(0, 100))}">
                    <i class="fas fa-reply"></i> Reply
                    ${replyCount > 0 ? `<span class="reply-count"><i class="fas fa-comment-dots"></i> ${replyCount}</span>` : ''}
                </button>
            </div>
            <div class="replies-container">
                ${repliesHTML}
            </div>
            <div id="reply-form-${msg.id}" class="reply-form hidden" data-message-id="${msg.id}">
                <textarea class="reply-input" placeholder="Write your reply..." rows="2"></textarea>
                <div class="reply-actions">
                    <button type="button" class="reply-cancel">Cancel</button>
                    <button type="submit" class="reply-submit">
                        <i class="fas fa-paper-plane"></i> Post Reply
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderReply(reply, parentId) {
    const isMe = reply.user_email === currentUser.email;
    const time = new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = new Date(reply.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    let replyType = 'student';
    if (isMe) replyType = 'me';
    else if (reply.user_role === 'teacher') replyType = 'teacher';

    return `
        <div class="reply ${replyType}" id="reply-${reply.id}">
            <div class="msg-info">
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    <strong>${isMe ? 'You' : escapeHTML(reply.user_name)}</strong>
                    ${reply.user_role === 'teacher' ? '<span class="teacher-badge"><i class="fas fa-chalkboard-teacher"></i> Teacher</span>' : ''}
                    ${reply.user_role === 'tutor' ? '<span class="teacher-badge" style="background: linear-gradient(145deg, #f59e0b, #d97706);"><i class="fas fa-graduation-cap"></i> Tutor</span>' : ''}
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span class="time">${time}</span>
                    <span class="date">${date}</span>
                </div>
            </div>
            <div class="msg-text">${escapeHTML(reply.message)}</div>
        </div>
    `;
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const gradeSelect = document.getElementById('gradeSelectInput');
    const btn = document.getElementById('sendBtn');
    const msg = input.value.trim();
    const grade = gradeSelect.value;

    if (!msg) {
        alert('Please enter a message');
        return;
    }

    if (!grade) {
        alert('Please select a grade for your question');
        return;
    }

    const payload = {
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role,
        grade: grade,
        message: msg,
        parent_id: replyingTo ? replyingTo.id : null
    };

    // Clear input and reply state
    input.value = '';
    gradeSelect.value = '';

    if (replyingTo) {
        cancelReply();
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
        const response = await fetch(`${FORUM_API}/api/forum/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to send message');

        // Refresh messages
        await loadMessages(currentGradeFilter, filterEnabled);

        // Set grade filter to show the new message
        setActiveGradeFilter(grade);

    } catch (err) {
        alert("Message failed to send. Please try again.");
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
    }
}

async function sendReply(parentId, message) {
    const btn = document.querySelector(`#reply-form-${parentId} .reply-submit`);
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    const payload = {
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role,
        grade: null, // Replies inherit parent's grade visibility
        message: message,
        parent_id: parentId
    };

    try {
        const response = await fetch(`${FORUM_API}/api/forum/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to send reply');

        // Refresh messages
        await loadMessages(currentGradeFilter, filterEnabled);

    } catch (err) {
        alert("Reply failed to send. Please try again.");
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Reply';
    }
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Typing indicator
let typingTimeout;
function showTypingIndicator(grade) {
    const chatBox = document.getElementById('chatBox');

    // Remove existing indicator
    const existing = document.getElementById('typing-indicator');
    if (existing) existing.remove();

    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.id = 'typing-indicator';
    typingIndicator.innerHTML = `
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
        <span>Someone is typing in Grade ${grade}...</span>
    `;

    chatBox.appendChild(typingIndicator);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Clear previous timeout
    if (typingTimeout) clearTimeout(typingTimeout);

    // Remove indicator after 3 seconds
    typingTimeout = setTimeout(() => {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    }, 3000);
}

// Check if user is logged in
function checkAuth() {
    if (!sessionStorage.getItem('p2p_email')) {
        // Store current page for redirect after login
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        window.location.href = 'login.html';
    }
}

// Optional: Call checkAuth on page load if authentication is required
// window.addEventListener('load', checkAuth);
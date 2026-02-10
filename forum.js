const FORUM_API = "https://forum-worker.buhle-1ce.workers.dev";

// Global variables
let currentGradeFilter = 'all';
let filterEnabled = false;

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
        { value: 'all', label: 'All Grades', color: 'grade-all' },
        { value: '1', label: 'Grade 1', color: 'grade-1' },
        { value: '2', label: 'Grade 2', color: 'grade-2' },
        { value: '3', label: 'Grade 3', color: 'grade-3' },
        { value: '4', label: 'Grade 4', color: 'grade-4' },
        { value: '5', label: 'Grade 5', color: 'grade-5' },
        { value: '6', label: 'Grade 6', color: 'grade-6' },
        { value: '7', label: 'Grade 7', color: 'grade-7' },
        { value: '8', label: 'Grade 8', color: 'grade-8' },
        { value: '9', label: 'Grade 9', color: 'grade-9' },
        { value: '10', label: 'Grade 10', color: 'grade-10' },
        { value: '11', label: 'Grade 11', color: 'grade-11' },
        { value: '12', label: 'Grade 12', color: 'grade-12' }
    ];

    gradeTagsContainer.innerHTML = grades.map(grade => `
        <div class="grade-tag ${grade.color} ${grade.value === 'all' ? 'active' : ''}" 
             data-grade="${grade.value}">
            ${grade.label}
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
        loadMessages(currentGradeFilter, filterEnabled);
    });

    // Toggle filter button
    const toggleFilterBtn = document.getElementById('toggleFilterBtn');
    toggleFilterBtn.addEventListener('click', () => {
        filterEnabled = !filterEnabled;
        toggleFilterBtn.innerHTML = filterEnabled ?
            '<i class="fas fa-eye"></i> Show All Grades' :
            '<i class="fas fa-eye-slash"></i> Hide Other Grades';

        if (filterEnabled) {
            toggleFilterBtn.classList.add('grade-all');
        } else {
            toggleFilterBtn.classList.remove('grade-all');
        }

        loadMessages(currentGradeFilter, filterEnabled);
    });

    // Message input grade select
    const gradeSelectInput = document.getElementById('gradeSelectInput');
    gradeSelectInput.addEventListener('change', (e) => {
        // Update active grade filter when user selects a grade for their message
        if (e.target.value) {
            setActiveGradeFilter(e.target.value);
            loadMessages(e.target.value, filterEnabled);
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

async function loadMessages(gradeFilter = 'all', hideOtherGrades = false) {
    const chatBox = document.getElementById('chatBox');
    const myEmail = sessionStorage.getItem('p2p_email') || "guest@peer.co.za";

    try {
        chatBox.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-spin"></i> Loading discussions...</div>';

        const res = await fetch(`${FORUM_API}/api/forum/messages`);
        if (!res.ok) throw new Error('Failed to fetch messages');

        let messages = await res.json();

        // Filter messages based on grade and filter settings
        messages = messages.filter(msg => {
            const msgGrade = msg.grade || 'all';

            if (gradeFilter === 'all' && !hideOtherGrades) {
                return true; // Show all messages
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

        // Sort by timestamp (newest first)
        messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        chatBox.innerHTML = messages.map(msg => {
            const isMe = msg.user_email === myEmail;
            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const date = new Date(msg.timestamp).toLocaleDateString();
            const msgGrade = msg.grade || 'all';
            const gradeClass = `grade-${msgGrade}`;

            // Determine message type
            let msgType = 'student';
            if (isMe) msgType = 'me';
            else if (msg.user_role === 'teacher') msgType = 'teacher';

            return `
                <div class="msg ${msgType} ${gradeClass}">
                    <div class="msg-info">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <strong>${isMe ? 'You' : msg.user_name}</strong>
                            <span class="grade-badge">Grade ${msgGrade}</span>
                            ${msg.user_role === 'teacher' ? '<span class="teacher-badge"><i class="fas fa-chalkboard-teacher"></i> Teacher</span>' : ''}
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span class="time">${time}</span>
                            <span class="date">${date}</span>
                        </div>
                    </div>
                    <div class="msg-text">${escapeHTML(msg.message)}</div>
                </div>
            `;
        }).join('');

        // Scroll to bottom
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
        email: sessionStorage.getItem('p2p_email') || "anonymous@peer.co.za",
        name: sessionStorage.getItem('p2p_name') || "Guest",
        role: sessionStorage.getItem('p2p_role') || "student",
        grade: grade,
        message: msg
    };

    input.value = '';
    gradeSelect.value = '';
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const response = await fetch(`${FORUM_API}/api/forum/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to send message');

        // Refresh messages
        await loadMessages(currentGradeFilter, filterEnabled);

        // Reset grade filter to show the new message
        setActiveGradeFilter(grade);

    } catch (err) {
        alert("Message failed to send. Please try again.");
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i>';
    }
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Add typing indicator functionality
let typingTimeout;
function showTypingIndicator(grade) {
    const chatBox = document.getElementById('chatBox');
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.id = 'typing-indicator';
    typingIndicator.innerHTML = `
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
        <span>Someone is typing in Grade ${grade}...</span>
    `;

    // Remove existing indicator
    const existing = document.getElementById('typing-indicator');
    if (existing) existing.remove();

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

// Simulate typing indicator (you can integrate with WebSockets for real-time)
document.getElementById('messageInput').addEventListener('input', function () {
    const grade = document.getElementById('gradeSelectInput').value;
    if (grade) {
        showTypingIndicator(grade);
    }
});
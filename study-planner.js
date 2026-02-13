const STUDY_API = "https://study-planner-worker.buhle-1ce.workers.dev";

// Global variables
let currentUser = {
    email: sessionStorage.getItem('p2p_email') || "guest@peer.co.za",
    name: sessionStorage.getItem('p2p_name') || "Guest Student"
};

let subjects = [];
let timerInterval = null;
let timerSeconds = 2700; // 45 minutes default
let isTimerRunning = false;
let currentSession = null;

document.addEventListener('DOMContentLoaded', () => {
    initializePlanner();
});

async function initializePlanner() {
    // Load user preferences
    await loadUserPreferences();

    // Load existing study plans
    await loadStudyPlans();

    // Load study sessions
    await loadStudySessions();

    // Get random quote
    await refreshQuote();

    // Get break tip
    await refreshBreakTip();

    // Set up event listeners
    setupEventListeners();

    // Update timer display
    updateTimerDisplay();
}

function setupEventListeners() {
    // Preferences form
    document.getElementById('preferencesForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveUserPreferences();
    });

    // Daily chores checkbox
    document.getElementById('dailyChores').addEventListener('change', (e) => {
        const choresDesc = document.getElementById('choresDescription');
        choresDesc.style.display = e.target.checked ? 'block' : 'none';
    });

    // Distraction level display
    document.getElementById('distractionLevel').addEventListener('input', (e) => {
        const value = e.target.value;
        let text = value + ' - ';
        if (value <= 2) text += 'Easily distracted';
        else if (value <= 3) text += 'Moderate';
        else text += 'Very focused';
        document.getElementById('distractionValue').textContent = text;
    });

    // Support level display
    document.getElementById('supportLevel').addEventListener('input', (e) => {
        const value = e.target.value;
        let text = value + ' - ';
        if (value <= 2) text += 'Little support';
        else if (value <= 3) text += 'Some support';
        else text += 'High support';
        document.getElementById('supportValue').textContent = text;
    });

    // Session length change
    document.getElementById('sessionLength').addEventListener('change', (e) => {
        if (!isTimerRunning) {
            timerSeconds = e.target.value * 60;
            updateTimerDisplay();
        }
    });
}

async function loadUserPreferences() {
    try {
        const response = await fetch(`${STUDY_API}/api/study/preferences?email=${encodeURIComponent(currentUser.email)}`);
        if (!response.ok) throw new Error('Failed to load preferences');

        const prefs = await response.json();

        if (prefs) {
            document.getElementById('studyEnvironment').value = prefs.study_environment || 'quiet';
            document.getElementById('distractionLevel').value = prefs.distraction_level || 3;
            document.getElementById('dailyChores').checked = prefs.daily_chores === 1;
            document.getElementById('supportLevel').value = prefs.support_level || 3;
            document.getElementById('preferredSessionLength').value = prefs.preferred_session_length || 45;
            document.getElementById('breakFrequency').value = prefs.break_frequency || 10;
            document.getElementById('crossNightPreference').checked = prefs.cross_night_preference === 1;

            if (prefs.chores_description) {
                document.getElementById('choresDescription').value = prefs.chores_description;
                document.getElementById('choresDescription').style.display = 'block';
            }

            // Update range displays
            document.getElementById('distractionValue').textContent =
                prefs.distraction_level + ' - ' + getDistractionText(prefs.distraction_level);
            document.getElementById('supportValue').textContent =
                prefs.support_level + ' - ' + getSupportText(prefs.support_level);

            // Update timer if not running
            if (!isTimerRunning) {
                timerSeconds = prefs.preferred_session_length * 60 || 2700;
                updateTimerDisplay();
            }
        }
    } catch (err) {
        console.error('Error loading preferences:', err);
    }
}

function getDistractionText(level) {
    if (level <= 2) return 'Easily distracted';
    if (level <= 3) return 'Moderate';
    return 'Very focused';
}

function getSupportText(level) {
    if (level <= 2) return 'Little support';
    if (level <= 3) return 'Some support';
    return 'High support';
}

async function saveUserPreferences() {
    const prefs = {
        user_email: currentUser.email,
        study_environment: document.getElementById('studyEnvironment').value,
        distraction_level: parseInt(document.getElementById('distractionLevel').value),
        daily_chores: document.getElementById('dailyChores').checked,
        chores_description: document.getElementById('choresDescription').value,
        support_level: parseInt(document.getElementById('supportLevel').value),
        preferred_session_length: parseInt(document.getElementById('preferredSessionLength').value),
        break_frequency: parseInt(document.getElementById('breakFrequency').value),
        cross_night_preference: document.getElementById('crossNightPreference').checked
    };

    try {
        const response = await fetch(`${STUDY_API}/api/study/preferences`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(prefs)
        });

        if (!response.ok) throw new Error('Failed to save preferences');

        showNotification('Preferences saved successfully!', 'success');
    } catch (err) {
        console.error('Error saving preferences:', err);
        showNotification('Failed to save preferences', 'error');
    }
}

async function loadStudyPlans() {
    try {
        const response = await fetch(`${STUDY_API}/api/study/plans?email=${encodeURIComponent(currentUser.email)}`);
        if (!response.ok) throw new Error('Failed to load study plans');

        const plans = await response.json();

        if (plans.length > 0 && plans[0].subjects) {
            subjects = plans[0].subjects;
            renderSubjects();
        }
    } catch (err) {
        console.error('Error loading study plans:', err);
    }
}

function addSubject() {
    const subjectCard = document.createElement('div');
    subjectCard.className = 'subject-card';
    subjectCard.innerHTML = `
        <div class="subject-info">
            <input type="text" class="subject-name-input" placeholder="Subject name (e.g., Mathematics)" value="">
            <input type="date" class="subject-exam-date-input" placeholder="Exam date">
            <select class="subject-priority-select">
                <option value="1">Low Priority</option>
                <option value="2">Medium Priority</option>
                <option value="3" selected>High Priority</option>
            </select>
            <label class="checkbox-label">
                <input type="checkbox" class="subject-struggling"> Struggling with this
            </label>
        </div>
        <div class="subject-actions">
            <button onclick="saveNewSubject(this)" class="save-subject">
                <i class="fas fa-check"></i>
            </button>
            <button onclick="cancelNewSubject(this)" class="cancel-subject">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    document.getElementById('subjectsList').appendChild(subjectCard);
}

function saveNewSubject(btn) {
    const card = btn.closest('.subject-card');
    const nameInput = card.querySelector('.subject-name-input');
    const dateInput = card.querySelector('.subject-exam-date-input');
    const prioritySelect = card.querySelector('.subject-priority-select');
    const strugglingCheck = card.querySelector('.subject-struggling');

    const name = nameInput.value.trim();
    if (!name) {
        alert('Please enter a subject name');
        return;
    }

    const subject = {
        id: Date.now(), // temporary ID
        name: name,
        exam_date: dateInput.value || null,
        priority: parseInt(prioritySelect.value),
        is_struggling: strugglingCheck.checked,
        target_hours: 0,
        completed_hours: 0
    };

    subjects.push(subject);
    renderSubjects();
}

function cancelNewSubject(btn) {
    btn.closest('.subject-card').remove();
}

function editSubject(id) {
    const subject = subjects.find(s => s.id === id);
    if (!subject) return;

    const card = document.getElementById(`subject-${id}`);
    const info = card.querySelector('.subject-info');

    info.innerHTML = `
        <input type="text" class="subject-name-input" value="${subject.name}">
        <input type="date" class="subject-exam-date-input" value="${subject.exam_date || ''}">
        <select class="subject-priority-select">
            <option value="1" ${subject.priority === 1 ? 'selected' : ''}>Low Priority</option>
            <option value="2" ${subject.priority === 2 ? 'selected' : ''}>Medium Priority</option>
            <option value="3" ${subject.priority === 3 ? 'selected' : ''}>High Priority</option>
        </select>
        <label class="checkbox-label">
            <input type="checkbox" class="subject-struggling" ${subject.is_struggling ? 'checked' : ''}> Struggling with this
        </label>
    `;

    const actions = card.querySelector('.subject-actions');
    actions.innerHTML = `
        <button onclick="updateSubject(${id})" class="save-subject">
            <i class="fas fa-check"></i>
        </button>
        <button onclick="renderSubjects()" class="cancel-subject">
            <i class="fas fa-times"></i>
        </button>
    `;
}

function updateSubject(id) {
    const card = document.getElementById(`subject-${id}`);
    const nameInput = card.querySelector('.subject-name-input');
    const dateInput = card.querySelector('.subject-exam-date-input');
    const prioritySelect = card.querySelector('.subject-priority-select');
    const strugglingCheck = card.querySelector('.subject-struggling');

    const subject = subjects.find(s => s.id === id);
    if (subject) {
        subject.name = nameInput.value;
        subject.exam_date = dateInput.value || null;
        subject.priority = parseInt(prioritySelect.value);
        subject.is_struggling = strugglingCheck.checked;
    }

    renderSubjects();
}

function deleteSubject(id) {
    if (confirm('Are you sure you want to delete this subject?')) {
        subjects = subjects.filter(s => s.id !== id);
        renderSubjects();
    }
}

function renderSubjects() {
    const container = document.getElementById('subjectsList');

    if (subjects.length === 0) {
        container.innerHTML = '<p class="no-subjects">No subjects added yet. Click "Add Subject" to get started!</p>';
        return;
    }

    container.innerHTML = subjects.map(subject => `
        <div class="subject-card" id="subject-${subject.id}">
            <div class="subject-info">
                <span class="subject-name">${escapeHTML(subject.name)}</span>
                <span class="subject-exam-date">
                    ${subject.exam_date ? `📅 Exam: ${new Date(subject.exam_date).toLocaleDateString()}` : '📅 No exam date set'}
                </span>
                <span class="subject-priority priority-${getPriorityClass(subject.priority)}">
                    ${getPriorityText(subject.priority)} Priority
                </span>
                ${subject.is_struggling ? '<span class="struggling-badge"><i class="fas fa-exclamation-triangle"></i> Struggling</span>' : ''}
                <span class="subject-hours">📚 ${subject.completed_hours || 0}/${subject.target_hours || 0} hours</span>
            </div>
            <div class="subject-actions">
                <button onclick="editSubject(${subject.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteSubject(${subject.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function getPriorityClass(priority) {
    switch (priority) {
        case 1: return 'low';
        case 2: return 'medium';
        case 3: return 'high';
        default: return 'medium';
    }
}

function getPriorityText(priority) {
    switch (priority) {
        case 1: return 'Low';
        case 2: return 'Medium';
        case 3: return 'High';
        default: return 'Medium';
    }
}

async function generatePlan() {
    if (subjects.length === 0) {
        alert('Please add at least one subject first');
        return;
    }

    const planData = {
        user_email: currentUser.email,
        plan_name: 'My Study Plan - ' + new Date().toLocaleDateString(),
        subjects: subjects.map(s => ({
            name: s.name,
            exam_date: s.exam_date,
            priority: s.priority,
            is_struggling: s.is_struggling,
            target_hours: s.target_hours || 10
        }))
    };

    try {
        document.getElementById('studyPlan').innerHTML = '<div class="loader"><i class="fas fa-spinner fa-spin"></i> Generating your personalized study plan...</div>';

        const response = await fetch(`${STUDY_API}/api/study/plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(planData)
        });

        if (!response.ok) throw new Error('Failed to generate plan');

        const result = await response.json();
        displayStudyPlan(result.schedule);

        showNotification('Study plan generated successfully!', 'success');
    } catch (err) {
        console.error('Error generating plan:', err);
        document.getElementById('studyPlan').innerHTML = '<p class="error">Failed to generate study plan. Please try again.</p>';
    }
}

function displayStudyPlan(schedule) {
    const planDiv = document.getElementById('studyPlan');

    if (!schedule || !schedule.daily_schedule) {
        planDiv.innerHTML = '<p class="no-plan">No schedule available. Try generating a plan first.</p>';
        return;
    }

    // Display recommendations
    let html = '<div class="plan-recommendations">';
    if (schedule.recommendations && schedule.recommendations.length > 0) {
        html += '<h4><i class="fas fa-lightbulb"></i> Personalized Recommendations</h4>';
        html += '<ul>' + schedule.recommendations.map(r => `<li>${r}</li>`).join('') + '</ul>';
    }

    if (schedule.study_tips && schedule.study_tips.length > 0) {
        html += '<h4><i class="fas fa-tips"></i> Study Tips</h4>';
        html += '<ul>' + schedule.study_tips.map(t => `<li>${t}</li>`).join('') + '</ul>';
    }
    html += '</div>';

    // Display daily schedule
    html += '<div class="daily-schedule">';
    schedule.daily_schedule.forEach(day => {
        html += `
            <div class="plan-day">
                <h3>${day.day} - ${new Date(day.date).toLocaleDateString()}</h3>
                <div class="day-subjects">
        `;

        day.subjects.forEach(subject => {
            html += `
                <div class="plan-subject">
                    <span><strong>${subject.subject}</strong></span>
                    <span>${subject.duration} minutes</span>
                    <span class="time-badge">${subject.time_of_day || 'Anytime'}</span>
                </div>
            `;
        });

        html += `
                    <div class="plan-total">
                        Total: ${Math.floor(day.total_minutes / 60)}h ${day.total_minutes % 60}m
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';

    planDiv.innerHTML = html;
}

async function loadStudySessions() {
    try {
        const response = await fetch(`${STUDY_API}/api/study/sessions?email=${encodeURIComponent(currentUser.email)}`);
        if (!response.ok) throw new Error('Failed to load sessions');

        const sessions = await response.json();
        displayStudySessions(sessions);
    } catch (err) {
        console.error('Error loading sessions:', err);
    }
}

function displayStudySessions(sessions) {
    const container = document.getElementById('sessionsLog');

    if (!sessions || sessions.length === 0) {
        container.innerHTML = '<p class="no-sessions">No study sessions recorded yet. Start your first session!</p>';
        return;
    }

    container.innerHTML = sessions.slice(0, 10).map(session => {
        const focusClass = session.focus_level >= 4 ? 'focus-high' :
            session.focus_level >= 3 ? 'focus-medium' : 'focus-low';

        return `
            <div class="session-card">
                <span class="session-date">${new Date(session.session_date).toLocaleDateString()}</span>
                <span class="session-subject">${session.subject_name || 'General Study'}</span>
                <span class="session-duration">${Math.floor(session.duration_minutes / 60)}h ${session.duration_minutes % 60}m</span>
                <span class="focus-indicator ${focusClass}">
                    Focus: ${session.focus_level}/5
                </span>
                ${session.notes ? `<span class="session-notes">📝 ${session.notes}</span>` : ''}
            </div>
        `;
    }).join('');
}

// Timer Functions
function startTimer() {
    if (isTimerRunning) return;

    isTimerRunning = true;
    timerInterval = setInterval(updateTimer, 1000);

    // Start a new session
    startNewSession();
}

function pauseTimer() {
    isTimerRunning = false;
    clearInterval(timerInterval);
}

function resetTimer() {
    pauseTimer();
    const sessionLength = parseInt(document.getElementById('sessionLength').value) || 45;
    timerSeconds = sessionLength * 60;
    updateTimerDisplay();
}

function updateTimer() {
    if (timerSeconds > 0) {
        timerSeconds--;
        updateTimerDisplay();

        // Check for break time
        const breakFrequency = parseInt(document.getElementById('breakFrequency').value) || 10;
        const elapsed = parseInt(document.getElementById('sessionLength').value) * 60 - timerSeconds;

        if (elapsed > 0 && elapsed % (breakFrequency * 60) === 0) {
            refreshBreakTip();
            showNotification('Time for a short break!', 'info');
        }
    } else {
        // Timer finished
        pauseTimer();
        completeSession();
        showNotification('Great job! Session completed! 🎉', 'success');
        playNotificationSound();
        resetTimer();
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    document.getElementById('timerDisplay').textContent =
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startNewSession() {
    const subjectId = subjects.length > 0 ? subjects[0].id : null; // In a real app, let user select subject

    currentSession = {
        user_email: currentUser.email,
        subject_id: subjectId,
        session_date: new Date().toISOString().split('T')[0],
        start_time: new Date().toTimeString().split(' ')[0],
        duration_minutes: parseInt(document.getElementById('sessionLength').value),
        focus_level: 3, // Default, can be updated at end
        completed: false
    };
}

async function completeSession() {
    if (!currentSession) return;

    currentSession.end_time = new Date().toTimeString().split(' ')[0];
    currentSession.completed = true;

    // Ask for focus level
    const focusLevel = prompt('How focused were you? (1-5, 5 being highest):', '3');
    if (focusLevel && focusLevel >= 1 && focusLevel <= 5) {
        currentSession.focus_level = parseInt(focusLevel);
    }

    const notes = prompt('Any notes about this session? (optional):');
    if (notes) {
        currentSession.notes = notes;
    }

    try {
        const response = await fetch(`${STUDY_API}/api/study/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentSession)
        });

        if (response.ok) {
            await loadStudySessions();
        }
    } catch (err) {
        console.error('Error saving session:', err);
    }

    currentSession = null;
}

// Quote Functions
async function refreshQuote() {
    try {
        const response = await fetch(`${STUDY_API}/api/study/quote`);
        if (!response.ok) throw new Error('Failed to load quote');

        const quote = await response.json();
        document.getElementById('motivationQuote').textContent = `"${quote.quote}"`;
        document.getElementById('quoteAuthor').textContent = `- ${quote.author || 'Unknown'}`;
    } catch (err) {
        console.error('Error loading quote:', err);
        document.getElementById('motivationQuote').textContent = '"Keep going! You\'re doing great!"';
        document.getElementById('quoteAuthor').textContent = '- Peer-2-Peer PRO';
    }
}

// Break Tip Functions
async function refreshBreakTip() {
    try {
        const response = await fetch(`${STUDY_API}/api/study/break-tip`);
        if (!response.ok) throw new Error('Failed to load break tip');

        const tip = await response.json();
        const tipElement = document.getElementById('breakTip');
        tipElement.innerHTML = `<i class="fas fa-coffee"></i> <span>${tip.tip} (${tip.duration_minutes} min)</span>`;
    } catch (err) {
        console.error('Error loading break tip:', err);
    }
}

// Utility Functions
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;

    // Style it
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = type === 'success' ? '#4caf50' :
        type === 'error' ? '#f44336' : '#2196f3';
    notification.style.color = 'white';
    notification.style.padding = '1rem';
    notification.style.borderRadius = '8px';
    notification.style.display = 'flex';
    notification.style.alignItems = 'center';
    notification.style.gap = '0.5rem';
    notification.style.zIndex = '1000';
    notification.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function playNotificationSound() {
    // Simple beep sound (can be replaced with actual sound)
    const audio = new Audio('data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCB//6mpqampqampqampqampqampqampqampq6AgICAgICAgICAA=');
    audio.play().catch(() => { }); // Ignore errors if browser blocks autoplay
}

// Check authentication (optional)
function checkAuth() {
    if (!sessionStorage.getItem('p2p_email')) {
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        window.location.href = 'login.html';
    }
}
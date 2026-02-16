const STUDY_API = "https://study-planner.buhle-1ce.workers.dev";

// Global variables
let currentUser = {
    email: sessionStorage.getItem('p2p_email') || localStorage.getItem('p2p_email') || "guest@peer.co.za",
    name: sessionStorage.getItem('p2p_name') || localStorage.getItem('p2p_name') || "Guest Student"
};

let subjects = [];
let tasks = [];
let studySessions = [];
let timerInterval = null;
let timerSeconds = 2700; // 45 minutes default
let isTimerRunning = false;
let currentSession = null;
let currentStreak = 0;
let lastStudyDate = null;

document.addEventListener('DOMContentLoaded', () => {
    initializePlanner();
});

// Back button function
function goBack() {
    window.history.back();
}

async function initializePlanner() {
    try {
        // Load user preferences
        await loadUserPreferences();

        // Load subjects
        await loadSubjects();

        // Load tasks
        await loadTasks();

        // Load study sessions
        await loadStudySessions();

        // Calculate streak
        await calculateStreak();

        // Get random quote
        await refreshQuote();

        // Get break tip
        await refreshBreakTip();

        // Set up event listeners
        setupEventListeners();

        // Update timer display
        updateTimerDisplay();

        // Update all progress displays
        updateAllProgress();

        // Populate subject dropdown for tasks
        populateSubjectDropdown();

        // Check for upcoming exams
        checkExamCountdowns();

        // Set up auto-save
        setInterval(autoSave, 30000); // Auto-save every 30 seconds

    } catch (error) {
        console.error('Error initializing planner:', error);
        showNotification('Error loading planner data', 'error');
    }
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

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + S to save preferences
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveUserPreferences();
        }
        // Space to pause/play timer
        if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            if (isTimerRunning) {
                pauseTimer();
            } else {
                startTimer();
            }
        }
    });
}

// ==================== SUBJECT FUNCTIONS ====================

async function loadSubjects() {
    try {
        const response = await fetch(`${STUDY_API}/api/study/subjects?email=${encodeURIComponent(currentUser.email)}`);

        if (response.status === 404) {
            // No subjects found, try localStorage
            loadLocalSubjects();
            return;
        }

        if (!response.ok) throw new Error('Failed to load subjects');

        subjects = await response.json();
        saveSubjectsToLocal();
        renderSubjects();
        populateSubjectDropdown();
        updateSubjectProgress();
    } catch (err) {
        console.error('Error loading subjects:', err);
        loadLocalSubjects();
    }
}

function loadLocalSubjects() {
    const savedSubjects = localStorage.getItem('studyPlanner_subjects');
    if (savedSubjects) {
        subjects = JSON.parse(savedSubjects);
        renderSubjects();
        populateSubjectDropdown();
        updateSubjectProgress();
    }
}

function saveSubjectsToLocal() {
    localStorage.setItem('studyPlanner_subjects', JSON.stringify(subjects));
}

async function saveSubjectsToServer() {
    try {
        const response = await fetch(`${STUDY_API}/api/study/subjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_email: currentUser.email,
                subjects: subjects
            })
        });

        if (!response.ok) throw new Error('Failed to save subjects');
    } catch (err) {
        console.error('Error saving subjects to server:', err);
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
        showNotification('Please enter a subject name', 'error');
        return;
    }

    const subject = {
        id: Date.now(),
        name: name,
        exam_date: dateInput.value || null,
        priority: parseInt(prioritySelect.value),
        is_struggling: strugglingCheck.checked,
        target_hours: calculateTargetHours(prioritySelect.value),
        completed_hours: 0,
        created_at: new Date().toISOString()
    };

    subjects.push(subject);
    saveSubjectsToLocal();
    saveSubjectsToServer();
    renderSubjects();
    populateSubjectDropdown();
    updateSubjectProgress();
    checkExamCountdowns();
    showNotification('Subject added successfully!', 'success');
}

function calculateTargetHours(priority) {
    switch (parseInt(priority)) {
        case 3: return 20; // High priority
        case 2: return 15; // Medium priority
        case 1: return 10; // Low priority
        default: return 15;
    }
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
        subject.target_hours = calculateTargetHours(prioritySelect.value);

        saveSubjectsToLocal();
        saveSubjectsToServer();
    }

    renderSubjects();
    populateSubjectDropdown();
    updateSubjectProgress();
    checkExamCountdowns();
    showNotification('Subject updated successfully!', 'success');
}

function deleteSubject(id) {
    if (confirm('Are you sure you want to delete this subject?')) {
        subjects = subjects.filter(s => s.id !== id);
        saveSubjectsToLocal();
        saveSubjectsToServer();
        renderSubjects();
        populateSubjectDropdown();
        updateSubjectProgress();
        checkExamCountdowns();
        showNotification('Subject deleted successfully!', 'success');
    }
}

function renderSubjects() {
    const container = document.getElementById('subjectsList');

    if (subjects.length === 0) {
        container.innerHTML = '<p class="no-subjects">No subjects added yet. Click "Add Subject" to get started!</p>';
        return;
    }

    container.innerHTML = subjects.map(subject => {
        const progress = subject.target_hours > 0
            ? Math.min(100, Math.round((subject.completed_hours / subject.target_hours) * 100))
            : 0;

        return `
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
                <span class="subject-hours">📚 ${subject.completed_hours || 0}/${subject.target_hours || 10} hours (${progress}%)</span>
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
    `}).join('');
}

// ==================== TASK FUNCTIONS ====================

async function loadTasks() {
    try {
        const savedTasks = localStorage.getItem('studyPlanner_tasks');
        if (savedTasks) {
            tasks = JSON.parse(savedTasks);
            renderTasks();
        }

        // Try to load from server
        const response = await fetch(`${STUDY_API}/api/study/tasks?email=${encodeURIComponent(currentUser.email)}`);
        if (response.ok) {
            const serverTasks = await response.json();
            tasks = mergeTasks(tasks, serverTasks);
            renderTasks();
            saveTasksToLocal();
        }
    } catch (err) {
        console.error('Error loading tasks:', err);
        renderTasks();
    }
}

function mergeTasks(localTasks, serverTasks) {
    const merged = [...serverTasks];
    const serverIds = new Set(serverTasks.map(t => t.id));

    // Add local tasks that don't exist on server
    for (const localTask of localTasks) {
        if (!serverIds.has(localTask.id)) {
            merged.push(localTask);
        }
    }

    return merged;
}

function saveTasksToLocal() {
    localStorage.setItem('studyPlanner_tasks', JSON.stringify(tasks));
}

async function saveTasksToServer() {
    try {
        const response = await fetch(`${STUDY_API}/api/study/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_email: currentUser.email,
                tasks: tasks
            })
        });
    } catch (err) {
        console.error('Error saving tasks to server:', err);
    }
}

function populateSubjectDropdown() {
    const subjectSelect = document.getElementById('taskSubject');
    if (!subjectSelect) return;

    subjectSelect.innerHTML = '<option value="">Select Subject (optional)</option>';

    subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.id;
        option.textContent = subject.name;
        subjectSelect.appendChild(option);
    });
}

function addTask() {
    const input = document.getElementById('taskInput');
    const subjectSelect = document.getElementById('taskSubject');
    const prioritySelect = document.getElementById('taskPriority');
    const dueDateInput = document.getElementById('taskDueDate');

    const title = input.value.trim();
    if (!title) {
        showNotification('Please enter a task', 'error');
        return;
    }

    const task = {
        id: Date.now(),
        title: title,
        subject_id: subjectSelect.value || null,
        subject_name: subjectSelect.value ? subjects.find(s => s.id == subjectSelect.value)?.name : null,
        priority: prioritySelect.value,
        due_date: dueDateInput.value || null,
        completed: false,
        created_at: new Date().toISOString(),
        completed_at: null
    };

    tasks.push(task);
    saveTasksToLocal();
    saveTasksToServer();
    renderTasks();
    updateWeeklyStats();

    // Clear form
    input.value = '';
    dueDateInput.value = '';

    showNotification('Task added successfully!', 'success');
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        task.completed_at = task.completed ? new Date().toISOString() : null;

        if (task.completed && task.subject_id) {
            // Add 30 minutes of study time to subject
            const subject = subjects.find(s => s.id == task.subject_id);
            if (subject) {
                subject.completed_hours = (subject.completed_hours || 0) + 0.5;
            }
        }

        saveTasksToLocal();
        saveTasksToServer();
        renderTasks();
        updateWeeklyStats();
        updateSubjectProgress();
        updateOverallProgress();

        if (task.completed) {
            showNotification('Task completed! 🎉', 'success');
            checkAchievements();
        }
    }
}

function deleteTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasksToLocal();
        saveTasksToServer();
        renderTasks();
        updateWeeklyStats();
        showNotification('Task deleted', 'info');
    }
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const taskElement = document.getElementById(`task-${id}`);
    const content = taskElement.querySelector('.task-content');

    content.innerHTML = `
        <input type="text" id="edit-title-${id}" class="task-name-input" value="${escapeHTML(task.title)}">
        <select id="edit-subject-${id}" class="task-subject-select">
            <option value="">No Subject</option>
            ${subjects.map(s => `<option value="${s.id}" ${s.id == task.subject_id ? 'selected' : ''}>${escapeHTML(s.name)}</option>`).join('')}
        </select>
        <select id="edit-priority-${id}" class="task-priority-select">
            <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High Priority</option>
            <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium Priority</option>
            <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low Priority</option>
        </select>
        <input type="date" id="edit-date-${id}" class="task-date-input" value="${task.due_date || ''}">
    `;

    const actions = taskElement.querySelector('.task-actions');
    actions.innerHTML = `
        <button onclick="saveTaskEdit(${id})" title="Save">
            <i class="fas fa-check"></i>
        </button>
        <button onclick="loadTasks()" title="Cancel">
            <i class="fas fa-times"></i>
        </button>
    `;
}

function saveTaskEdit(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newTitle = document.getElementById(`edit-title-${id}`).value.trim();
    if (!newTitle) {
        showNotification('Task title cannot be empty', 'error');
        return;
    }

    task.title = newTitle;
    task.subject_id = document.getElementById(`edit-subject-${id}`).value || null;
    task.subject_name = task.subject_id ? subjects.find(s => s.id == task.subject_id)?.name : null;
    task.priority = document.getElementById(`edit-priority-${id}`).value;
    task.due_date = document.getElementById(`edit-date-${id}`).value || null;

    saveTasksToLocal();
    saveTasksToServer();
    renderTasks();
    showNotification('Task updated successfully!', 'success');
}

function renderTasks() {
    const container = document.getElementById('tasksList');
    if (!container) return;

    if (tasks.length === 0) {
        container.innerHTML = '<p class="no-subjects">No tasks yet. Add your first task above!</p>';
        return;
    }

    // Sort tasks: incomplete first, then by priority, then by due date
    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        if (a.completed) return 0;

        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (a.priority !== b.priority) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }

        if (a.due_date && b.due_date) {
            return new Date(a.due_date) - new Date(b.due_date);
        }
        return a.due_date ? -1 : b.due_date ? 1 : 0;
    });

    container.innerHTML = sortedTasks.map(task => {
        const isOverdue = task.due_date && !task.completed && new Date(task.due_date) < new Date();
        const dueDateClass = isOverdue ? 'overdue' : '';

        return `
        <div class="task-item ${task.completed ? 'completed' : ''}" id="task-${task.id}">
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask(${task.id})">
                ${task.completed ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <div class="task-content">
                <div class="task-title ${task.completed ? 'completed-text' : ''}">${escapeHTML(task.title)}</div>
                <div class="task-details">
                    <span class="task-priority priority-${task.priority}">${task.priority.toUpperCase()}</span>
                    ${task.subject_name ? `<span class="task-subject">📚 ${escapeHTML(task.subject_name)}</span>` : ''}
                    ${task.due_date ? `
                        <span class="task-due-date ${dueDateClass}">
                            <i class="far fa-calendar"></i> Due: ${new Date(task.due_date).toLocaleDateString()}
                            ${isOverdue ? ' (Overdue!)' : ''}
                        </span>
                    ` : ''}
                </div>
            </div>
            <div class="task-actions">
                <button onclick="editTask(${task.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteTask(${task.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `}).join('');
}

// ==================== PROGRESS FUNCTIONS ====================

function updateAllProgress() {
    updateOverallProgress();
    updateSubjectProgress();
    updateWeeklyStats();
}

function updateOverallProgress() {
    const totalTarget = subjects.reduce((sum, s) => sum + (s.target_hours || 10), 0);
    const totalCompleted = subjects.reduce((sum, s) => sum + (s.completed_hours || 0), 0);

    const progress = totalTarget > 0 ? Math.min(100, Math.round((totalCompleted / totalTarget) * 100)) : 0;

    const progressCircle = document.querySelector('.circular-progress');
    const progressValue = document.querySelector('.progress-value');

    if (progressCircle && progressValue) {
        const degrees = (progress / 100) * 360;
        progressCircle.style.background = `conic-gradient(var(--pro-green) ${degrees}deg, var(--border-color) ${degrees}deg)`;
        progressValue.textContent = `${progress}%`;
    }
}

function updateSubjectProgress() {
    const container = document.getElementById('subjectProgressList');
    if (!container) return;

    if (subjects.length === 0) {
        container.innerHTML = '<p class="no-subjects">No subjects added yet.</p>';
        return;
    }

    container.innerHTML = subjects.map(subject => {
        const progress = subject.target_hours > 0
            ? Math.min(100, Math.round((subject.completed_hours / subject.target_hours) * 100))
            : 0;

        return `
        <div class="subject-progress-item">
            <div class="subject-progress-header">
                <div class="subject-progress-name">
                    ${escapeHTML(subject.name)}
                    ${subject.is_struggling ? '<span class="subject-progress-struggling"><i class="fas fa-exclamation-triangle"></i> Struggling</span>' : ''}
                </div>
                <div class="subject-progress-stats">
                    ${subject.completed_hours || 0}/${subject.target_hours || 10} hours
                </div>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width: ${progress}%"></div>
            </div>
        </div>
    `}).join('');
}

function updateWeeklyStats() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Calculate weekly study time
    const weeklySessions = studySessions.filter(s => new Date(s.session_date) >= oneWeekAgo);
    const weeklyMinutes = weeklySessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    const weeklyHours = Math.round(weeklyMinutes / 60 * 10) / 10;

    // Calculate weekly tasks completed
    const weeklyTasksCompleted = tasks.filter(t =>
        t.completed && t.completed_at && new Date(t.completed_at) >= oneWeekAgo
    ).length;

    // Calculate average focus
    const weeklyFocus = weeklySessions.reduce((sum, s) => sum + (s.focus_level || 0), 0);
    const avgFocus = weeklySessions.length > 0
        ? Math.round((weeklyFocus / weeklySessions.length) * 10) / 10
        : 0;

    document.getElementById('weeklyStudyTime').textContent = `${weeklyHours}h`;
    document.getElementById('weeklyTasks').textContent = weeklyTasksCompleted;
    document.getElementById('avgFocus').textContent = `${avgFocus}/5`;
}

async function calculateStreak() {
    try {
        const response = await fetch(`${STUDY_API}/api/study/streak?email=${encodeURIComponent(currentUser.email)}`);
        if (response.ok) {
            const data = await response.json();
            currentStreak = data.streak || 0;
            lastStudyDate = data.last_study_date ? new Date(data.last_study_date) : null;
        } else {
            calculateLocalStreak();
        }
    } catch (err) {
        calculateLocalStreak();
    }

    updateStreakDisplay();
}

function calculateLocalStreak() {
    const today = new Date().toDateString();
    let streak = 0;
    let currentDate = new Date();

    // Check if studied today
    const studiedToday = studySessions.some(s =>
        new Date(s.session_date).toDateString() === today
    );

    if (studiedToday) {
        streak = 1;
        // Check previous days
        for (let i = 1; i <= 30; i++) {
            const checkDate = new Date();
            checkDate.setDate(checkDate.getDate() - i);

            const studied = studySessions.some(s =>
                new Date(s.session_date).toDateString() === checkDate.toDateString()
            );

            if (studied) {
                streak++;
            } else {
                break;
            }
        }
    }

    currentStreak = streak;
    updateStreakDisplay();
}

function updateStreakDisplay() {
    const streakElement = document.getElementById('streakCount');
    const streakMessage = document.getElementById('streakMessage');

    if (streakElement) {
        streakElement.textContent = currentStreak;
    }

    if (streakMessage) {
        if (currentStreak === 0) {
            streakMessage.textContent = 'Start studying today to begin your streak!';
        } else if (currentStreak === 1) {
            streakMessage.textContent = 'Great start! Keep it going tomorrow!';
        } else if (currentStreak < 7) {
            streakMessage.textContent = `${currentStreak} day streak! You're building momentum!`;
        } else if (currentStreak < 30) {
            streakMessage.textContent = `Amazing! ${currentStreak} day streak! 🔥`;
        } else {
            streakMessage.textContent = `Incredible! ${currentStreak} day streak! You're a legend! 🏆`;
        }
    }
}

// ==================== EXAM COUNTDOWN FUNCTIONS ====================

function checkExamCountdowns() {
    const container = document.getElementById('examCountdowns');
    if (!container) return;

    const subjectsWithExams = subjects.filter(s => s.exam_date);

    if (subjectsWithExams.length === 0) {
        container.innerHTML = '<p class="no-subjects">No upcoming exams set. Add exam dates to your subjects!</p>';
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const examItems = subjectsWithExams.map(subject => {
        const examDate = new Date(subject.exam_date);
        examDate.setHours(0, 0, 0, 0);

        const daysUntil = Math.round((examDate - today) / (1000 * 60 * 60 * 24));

        let urgencyClass = '';
        let countdownClass = 'countdown-days';

        if (daysUntil < 0) {
            urgencyClass = 'urgent';
            countdownClass = 'countdown-urgent';
        } else if (daysUntil <= 7) {
            urgencyClass = 'urgent';
            countdownClass = 'countdown-urgent';
        } else if (daysUntil <= 30) {
            urgencyClass = 'warning';
            countdownClass = 'countdown-warning';
        }

        return `
        <div class="exam-countdown-item ${urgencyClass}">
            <div class="exam-info">
                <h4>${escapeHTML(subject.name)}</h4>
                <div class="exam-date">${examDate.toLocaleDateString()}</div>
            </div>
            <div class="exam-countdown ${countdownClass}">
                ${daysUntil < 0 ? `${Math.abs(daysUntil)} days ago` : `${daysUntil} days left`}
            </div>
        </div>
    `}).join('');

    container.innerHTML = examItems;
}

// ==================== STUDY PLAN FUNCTIONS ====================

async function generatePlan() {
    if (subjects.length === 0) {
        showNotification('Please add at least one subject first', 'error');
        return;
    }

    const planData = {
        user_email: currentUser.email,
        plan_name: 'My Study Plan - ' + new Date().toLocaleDateString(),
        subjects: subjects.map(s => ({
            id: s.id,
            name: s.name,
            exam_date: s.exam_date,
            priority: s.priority,
            is_struggling: s.is_struggling,
            target_hours: s.target_hours || 10,
            completed_hours: s.completed_hours || 0
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
        console.error('Error generating plan from server:', err);

        // Fallback to local generation
        showNotification('Using offline plan generation', 'info');
        const localSchedule = generateLocalPlan();
        if (localSchedule) {
            displayStudyPlan(localSchedule);
            showNotification('Study plan generated locally!', 'success');
        } else {
            document.getElementById('studyPlan').innerHTML = '<p class="error">Failed to generate study plan. Please try again.</p>';
        }
    }
}

function generateLocalPlan() {
    if (subjects.length === 0) return null;

    const preferences = JSON.parse(localStorage.getItem('studyPlanner_preferences')) || {
        distraction_level: 3,
        daily_chores: false,
        support_level: 3,
        preferred_session_length: 45,
        break_frequency: 10,
        cross_night_preference: false
    };

    const schedule = {
        recommendations: [],
        study_tips: [],
        daily_schedule: []
    };

    // Generate recommendations based on preferences and progress
    if (preferences.distraction_level <= 2) {
        schedule.recommendations.push("Try the Pomodoro technique: 25 min study, 5 min break");
        schedule.recommendations.push("Use noise-cancelling headphones or find a quiet spot");
    }

    if (preferences.daily_chores) {
        schedule.recommendations.push("Break study into chunks around your chores");
        schedule.recommendations.push("Use chore time as active breaks");
    }

    if (preferences.support_level <= 2) {
        schedule.recommendations.push("Join study groups or find online study buddies");
        schedule.study_tips.push("Use educational videos when you need extra help");
    }

    if (preferences.cross_night_preference) {
        schedule.recommendations.push("Schedule important study sessions in the evening");
    }

    // Add progress-based recommendations
    const strugglingSubjects = subjects.filter(s => s.is_struggling);
    if (strugglingSubjects.length > 0) {
        schedule.recommendations.push(`Focus extra time on: ${strugglingSubjects.map(s => s.name).join(', ')}`);
    }

    const lowProgressSubjects = subjects.filter(s => {
        const progress = s.target_hours > 0 ? (s.completed_hours / s.target_hours) * 100 : 0;
        return progress < 30;
    });

    if (lowProgressSubjects.length > 0) {
        schedule.recommendations.push(`Catch up on: ${lowProgressSubjects.map(s => s.name).join(', ')}`);
    }

    // Generate daily schedule for 7 days
    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        let availableHours = preferences.daily_chores ? 2 : 4;
        if (date.getDay() === 0 || date.getDay() === 6) {
            availableHours = preferences.daily_chores ? 3 : 6;
        }

        const daySubjects = [];
        let remainingTime = availableHours * 60;

        // Prioritize struggling and low progress subjects
        const prioritySubjects = [...strugglingSubjects, ...lowProgressSubjects];
        const uniquePriority = [...new Map(prioritySubjects.map(s => [s.id, s])).values()];

        for (const subject of uniquePriority) {
            if (remainingTime <= 0) break;
            const subjectTime = Math.min(45, remainingTime);
            daySubjects.push({
                subject: subject.name,
                duration: subjectTime,
                time_of_day: preferences.cross_night_preference ? "Evening" : "Morning"
            });
            remainingTime -= subjectTime;
        }

        // Add other subjects
        const otherSubjects = subjects.filter(s =>
            !uniquePriority.find(ps => ps.id === s.id)
        );

        for (const subject of otherSubjects) {
            if (remainingTime <= 0) break;
            const subjectTime = Math.min(30, remainingTime);
            daySubjects.push({
                subject: subject.name,
                duration: subjectTime,
                time_of_day: "Afternoon"
            });
            remainingTime -= subjectTime;
        }

        schedule.daily_schedule.push({
            date: dateStr,
            day: date.toLocaleDateString('en-US', { weekday: 'long' }),
            subjects: daySubjects,
            total_minutes: availableHours * 60 - remainingTime
        });
    }

    return schedule;
}

function displayStudyPlan(schedule) {
    const planDiv = document.getElementById('studyPlan');

    if (!schedule || !schedule.daily_schedule || schedule.daily_schedule.length === 0) {
        planDiv.innerHTML = '<p class="no-plan">No schedule available. Try generating a plan first.</p>';
        return;
    }

    let html = '';

    // Display recommendations
    if ((schedule.recommendations && schedule.recommendations.length > 0) ||
        (schedule.study_tips && schedule.study_tips.length > 0)) {
        html += '<div class="plan-recommendations">';

        if (schedule.recommendations && schedule.recommendations.length > 0) {
            html += '<h4><i class="fas fa-lightbulb"></i> Personalized Recommendations</h4>';
            html += '<ul>' + schedule.recommendations.map(r => `<li>${r}</li>`).join('') + '</ul>';
        }

        if (schedule.study_tips && schedule.study_tips.length > 0) {
            html += '<h4><i class="fas fa-tips"></i> Study Tips</h4>';
            html += '<ul>' + schedule.study_tips.map(t => `<li>${t}</li>`).join('') + '</ul>';
        }
        html += '</div>';
    }

    // Display daily schedule with checkboxes
    html += '<div class="daily-schedule">';
    schedule.daily_schedule.forEach(day => {
        if (day.subjects && day.subjects.length > 0) {
            html += `
                <div class="plan-day">
                    <h3>${day.day} - ${new Date(day.date).toLocaleDateString()}</h3>
                    <div class="day-subjects">
            `;

            day.subjects.forEach(subject => {
                const taskId = `plan-${day.date}-${subject.subject.replace(/\s+/g, '-')}`;
                html += `
                    <div class="plan-subject" onclick="togglePlanTask('${taskId}')">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div class="task-checkbox" id="${taskId}-checkbox">
                                <i class="fas fa-check" style="opacity: 0;"></i>
                            </div>
                            <span><strong>${escapeHTML(subject.subject)}</strong></span>
                        </div>
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
        }
    });
    html += '</div>';

    if (html === '<div class="daily-schedule"></div>') {
        html = '<p class="no-plan">No schedule available for the selected preferences.</p>';
    }

    planDiv.innerHTML = html;
}

function togglePlanTask(taskId) {
    const checkbox = document.getElementById(`${taskId}-checkbox`);
    if (checkbox) {
        checkbox.classList.toggle('checked');
        const icon = checkbox.querySelector('i');
        if (icon) {
            icon.style.opacity = checkbox.classList.contains('checked') ? '1' : '0';
        }

        // Add to tasks if checked
        if (checkbox.classList.contains('checked')) {
            const taskTitle = taskId.replace('plan-', '').replace(/-/g, ' ');
            addTaskFromPlan(taskTitle);
        }
    }
}

function addTaskFromPlan(title) {
    const task = {
        id: Date.now(),
        title: title,
        subject_id: null,
        priority: 'medium',
        due_date: null,
        completed: false,
        created_at: new Date().toISOString(),
        completed_at: null
    };

    tasks.push(task);
    saveTasksToLocal();
    saveTasksToServer();
    renderTasks();
    showNotification('Task added to your list!', 'success');
}

// ==================== STUDY SESSION FUNCTIONS ====================

async function loadStudySessions() {
    try {
        const response = await fetch(`${STUDY_API}/api/study/sessions?email=${encodeURIComponent(currentUser.email)}`);

        if (response.status === 404) {
            loadLocalSessions();
            return;
        }

        if (!response.ok) throw new Error('Failed to load sessions');

        studySessions = await response.json();
        saveSessionsToLocal();
        displayStudySessions(studySessions);
        updateWeeklyStats();
        calculateStreak();
    } catch (err) {
        console.error('Error loading sessions:', err);
        loadLocalSessions();
    }
}

function loadLocalSessions() {
    const localSessions = localStorage.getItem('studyPlanner_sessions');
    if (localSessions) {
        studySessions = JSON.parse(localSessions);
        displayStudySessions(studySessions);
        updateWeeklyStats();
        calculateStreak();
    } else {
        displayStudySessions([]);
    }
}

function saveSessionsToLocal() {
    localStorage.setItem('studyPlanner_sessions', JSON.stringify(studySessions.slice(0, 100)));
}

// ==================== TIMER FUNCTIONS ====================

function startTimer() {
    if (isTimerRunning) return;

    isTimerRunning = true;
    timerInterval = setInterval(updateTimer, 1000);

    // Start a new session if not already started
    if (!currentSession) {
        startNewSession();
    }

    // Update button states
    document.querySelector('.timer-btn.start').disabled = true;
    document.querySelector('.timer-btn.pause').disabled = false;

    showNotification('Timer started! Focus mode activated 🎯', 'info');
}

function pauseTimer() {
    isTimerRunning = false;
    clearInterval(timerInterval);

    // Update button states
    document.querySelector('.timer-btn.start').disabled = false;
    document.querySelector('.timer-btn.pause').disabled = true;

    showNotification('Timer paused. Take a deep breath!', 'info');
}

function resetTimer() {
    pauseTimer();
    const sessionLength = parseInt(document.getElementById('sessionLength').value) || 45;
    timerSeconds = sessionLength * 60;
    updateTimerDisplay();

    // Update button states
    document.querySelector('.timer-btn.start').disabled = false;
    document.querySelector('.timer-btn.pause').disabled = true;
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
            showNotification('Time for a short break! 🧘', 'info');
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
    const sessionLength = parseInt(document.getElementById('sessionLength').value) || 45;

    currentSession = {
        user_email: currentUser.email,
        session_date: new Date().toISOString().split('T')[0],
        start_time: new Date().toTimeString().split(' ')[0],
        duration_minutes: sessionLength,
        focus_level: 3, // Default
        completed: false
    };
}

async function completeSession() {
    if (!currentSession) return;

    currentSession.end_time = new Date().toTimeString().split(' ')[0];
    currentSession.completed = true;

    // Show focus level selector
    showFocusSelector(async (focusLevel) => {
        currentSession.focus_level = focusLevel;

        const notes = prompt('Any notes about this session? (optional):');
        if (notes) {
            currentSession.notes = notes;
        }

        // Ask which subject was studied
        if (subjects.length > 0) {
            const subjectOptions = subjects.map(s => `${s.id}: ${s.name}`).join('\n');
            const subjectChoice = prompt(`Which subject did you study?\n${subjectOptions}\n\nEnter subject ID (or leave blank for general study):`);

            if (subjectChoice) {
                const subject = subjects.find(s => s.id == subjectChoice);
                if (subject) {
                    currentSession.subject_id = subject.id;
                    subject.completed_hours = (subject.completed_hours || 0) + (currentSession.duration_minutes / 60);
                }
            }
        }

        try {
            const response = await fetch(`${STUDY_API}/api/study/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentSession)
            });

            if (response.ok) {
                studySessions.unshift(currentSession);
                saveSessionsToLocal();
                await loadStudySessions();
                updateSubjectProgress();
                updateAllProgress();
                calculateStreak();
                checkAchievements();
                showNotification('Session saved successfully!', 'success');
            } else {
                // Save to localStorage as backup
                studySessions.unshift(currentSession);
                saveSessionsToLocal();
                await loadStudySessions();
                updateSubjectProgress();
                updateAllProgress();
                calculateStreak();
                showNotification('Session saved locally', 'info');
            }
        } catch (err) {
            console.error('Error saving session:', err);
            studySessions.unshift(currentSession);
            saveSessionsToLocal();
            await loadStudySessions();
            updateSubjectProgress();
            updateAllProgress();
            calculateStreak();
            showNotification('Session saved locally', 'info');
        }

        currentSession = null;
    });
}

function showFocusSelector(callback) {
    // Create focus selector modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3>How focused were you?</h3>
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="focus-selector">
                    <div class="focus-buttons">
                        <button class="focus-btn" data-focus="1">1 - Very distracted</button>
                        <button class="focus-btn" data-focus="2">2 - Somewhat distracted</button>
                        <button class="focus-btn" data-focus="3" class="selected">3 - Moderately focused</button>
                        <button class="focus-btn" data-focus="4">4 - Focused</button>
                        <button class="focus-btn" data-focus="5">5 - Very focused</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add click handlers
    modal.querySelectorAll('.focus-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const focusLevel = parseInt(btn.dataset.focus);
            modal.remove();
            callback(focusLevel);
        });
    });
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

        const subjectName = session.subject_name ||
            (session.subject_id ? subjects.find(s => s.id == session.subject_id)?.name : 'General Study');

        return `
            <div class="session-card">
                <span class="session-date">${new Date(session.session_date).toLocaleDateString()}</span>
                <span class="session-subject">${escapeHTML(subjectName || 'General Study')}</span>
                <span class="session-duration">${Math.floor(session.duration_minutes / 60)}h ${session.duration_minutes % 60}m</span>
                <span class="focus-indicator ${focusClass}">
                    Focus: ${session.focus_level}/5
                </span>
                ${session.notes ? `<span class="session-notes">📝 ${escapeHTML(session.notes)}</span>` : ''}
            </div>
        `;
    }).join('');
}

// ==================== ACHIEVEMENT FUNCTIONS ====================

function checkAchievements() {
    const achievements = [];

    // First session
    if (studySessions.length === 1) {
        achievements.push("First Study Session! 🎯");
    }

    // 10 sessions
    if (studySessions.length === 10) {
        achievements.push("Getting Serious - 10 sessions! 📚");
    }

    // 50 sessions
    if (studySessions.length === 50) {
        achievements.push("Study Master - 50 sessions! 🏆");
    }

    // 7-day streak
    if (currentStreak >= 7) {
        achievements.push("Week Warrior - 7 day streak! 🔥");
    }

    // 30-day streak
    if (currentStreak >= 30) {
        achievements.push("Month Master - 30 day streak! 👑");
    }

    // First task completed
    const completedTasks = tasks.filter(t => t.completed).length;
    if (completedTasks === 1) {
        achievements.push("First Task Complete! ✓");
    }

    // 10 tasks completed
    if (completedTasks === 10) {
        achievements.push("Task Master - 10 tasks! ✓✓✓");
    }

    // 5 hours studied
    const totalMinutes = studySessions.reduce((sum, s) => sum + s.duration_minutes, 0);
    const totalHours = totalMinutes / 60;

    if (totalHours >= 5 && totalHours < 6) {
        achievements.push("5 Hour Club! ⏱️");
    }

    if (totalHours >= 20 && totalHours < 21) {
        achievements.push("20 Hour Club! ⭐");
    }

    // Display new achievements
    achievements.forEach(achievement => {
        showAchievement(achievement);
    });
}

function showAchievement(title) {
    const achievement = document.createElement('div');
    achievement.className = 'achievement-badge';
    achievement.innerHTML = `
        <i class="fas fa-trophy"></i>
        <div>
            <strong>Achievement Unlocked!</strong><br>
            <span>${title}</span>
        </div>
    `;

    document.body.appendChild(achievement);

    setTimeout(() => {
        achievement.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => achievement.remove(), 300);
    }, 3000);
}

// ==================== AUTO-SAVE FUNCTION ====================

function autoSave() {
    saveSubjectsToLocal();
    saveTasksToLocal();
    saveSessionsToLocal();
    console.log('Auto-saved at', new Date().toLocaleTimeString());
}

// ==================== PREFERENCE FUNCTIONS ====================

async function loadUserPreferences() {
    try {
        const response = await fetch(`${STUDY_API}/api/study/preferences?email=${encodeURIComponent(currentUser.email)}`);

        if (response.status === 404) {
            loadLocalPreferences();
            return;
        }

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
                timerSeconds = (prefs.preferred_session_length || 45) * 60;
                document.getElementById('sessionLength').value = prefs.preferred_session_length || 45;
                updateTimerDisplay();
            }

            // Save to localStorage
            localStorage.setItem('studyPlanner_preferences', JSON.stringify(prefs));
        }
    } catch (err) {
        console.error('Error loading preferences:', err);
        loadLocalPreferences();
    }
}

function loadLocalPreferences() {
    const savedPrefs = localStorage.getItem('studyPlanner_preferences');
    if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);

        document.getElementById('studyEnvironment').value = prefs.study_environment || 'quiet';
        document.getElementById('distractionLevel').value = prefs.distraction_level || 3;
        document.getElementById('dailyChores').checked = prefs.daily_chores || false;
        document.getElementById('supportLevel').value = prefs.support_level || 3;
        document.getElementById('preferredSessionLength').value = prefs.preferred_session_length || 45;
        document.getElementById('breakFrequency').value = prefs.break_frequency || 10;
        document.getElementById('crossNightPreference').checked = prefs.cross_night_preference || false;

        if (prefs.chores_description) {
            document.getElementById('choresDescription').value = prefs.chores_description;
            document.getElementById('choresDescription').style.display = 'block';
        }

        document.getElementById('distractionValue').textContent =
            prefs.distraction_level + ' - ' + getDistractionText(prefs.distraction_level);
        document.getElementById('supportValue').textContent =
            prefs.support_level + ' - ' + getSupportText(prefs.support_level);

        if (!isTimerRunning) {
            timerSeconds = (prefs.preferred_session_length || 45) * 60;
            document.getElementById('sessionLength').value = prefs.preferred_session_length || 45;
            updateTimerDisplay();
        }
    }
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

        localStorage.setItem('studyPlanner_preferences', JSON.stringify(prefs));
        showNotification('Preferences saved successfully!', 'success');
    } catch (err) {
        console.error('Error saving preferences:', err);
        localStorage.setItem('studyPlanner_preferences', JSON.stringify(prefs));
        showNotification('Preferences saved locally', 'info');
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

// ==================== QUOTE FUNCTIONS ====================

async function refreshQuote() {
    try {
        const response = await fetch(`${STUDY_API}/api/study/quote`);
        if (!response.ok) throw new Error('Failed to load quote');

        const quote = await response.json();
        document.getElementById('motivationQuote').textContent = `"${quote.quote}"`;
        document.getElementById('quoteAuthor').textContent = `- ${quote.author || 'Unknown'}`;
    } catch (err) {
        console.error('Error loading quote:', err);
        // Fallback quotes
        const fallbackQuotes = [
            { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
            { quote: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
            { quote: "The future depends on what you do today.", author: "Mahatma Gandhi" },
            { quote: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" }
        ];
        const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
        document.getElementById('motivationQuote').textContent = `"${randomQuote.quote}"`;
        document.getElementById('quoteAuthor').textContent = `- ${randomQuote.author}`;
    }
}

// ==================== BREAK TIP FUNCTIONS ====================

async function refreshBreakTip() {
    try {
        const response = await fetch(`${STUDY_API}/api/study/break-tip`);
        if (!response.ok) throw new Error('Failed to load break tip');

        const tip = await response.json();
        const tipElement = document.getElementById('breakTip');
        tipElement.innerHTML = `<i class="fas fa-coffee"></i> <span>${tip.tip} (${tip.duration_minutes} min)</span>`;
    } catch (err) {
        console.error('Error loading break tip:', err);
        // Fallback tips
        const fallbackTips = [
            { tip: "Take a 5-minute walk around the room", duration_minutes: 5 },
            { tip: "Do some light stretching", duration_minutes: 5 },
            { tip: "Close your eyes and take deep breaths", duration_minutes: 3 },
            { tip: "Grab a healthy snack and water", duration_minutes: 10 },
            { tip: "Step outside for fresh air", duration_minutes: 5 },
            { tip: "Listen to one song you love", duration_minutes: 4 }
        ];
        const randomTip = fallbackTips[Math.floor(Math.random() * fallbackTips.length)];
        const tipElement = document.getElementById('breakTip');
        tipElement.innerHTML = `<i class="fas fa-coffee"></i> <span>${randomTip.tip} (${randomTip.duration_minutes} min)</span>`;
    }
}

// ==================== UTILITY FUNCTIONS ====================

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('notification-removing');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 2700);
}

function playNotificationSound() {
    const audio = new Audio('data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCB//6mpqampqampqampqampqampqampqampq6AgICAgICAgICAA=');
    audio.play().catch(() => { });
}

// Make functions global for onclick handlers
window.goBack = goBack;
window.addSubject = addSubject;
window.saveNewSubject = saveNewSubject;
window.cancelNewSubject = cancelNewSubject;
window.editSubject = editSubject;
window.updateSubject = updateSubject;
window.deleteSubject = deleteSubject;
window.addTask = addTask;
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
window.editTask = editTask;
window.saveTaskEdit = saveTaskEdit;
window.togglePlanTask = togglePlanTask;
window.generatePlan = generatePlan;
window.startTimer = startTimer;
window.pauseTimer = pauseTimer;
window.resetTimer = resetTimer;
window.refreshQuote = refreshQuote;
window.updateTimerDisplay = updateTimerDisplay;
const API_BASE = "https://practice.buhle-1ce.workers.dev";
const ADMIN_EMAIL = "admin@peer-2-peer.co.za";
const ADMIN_PASSWORD = "Admin@2014"; // ⚠️ In production, use secure auth flow

// Tab switching
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(tabName + '-tab').classList.add('active');
    // Load data for the tab
    if (tabName === 'grades') loadGrades();
    if (tabName === 'subjects') { loadGradesForSelect(); loadSubjects(); }
    if (tabName === 'topics') { loadSubjectsForSelect(); loadTopics(); }
    if (tabName === 'questions') { loadGradesForSelect(); loadQuestions(); }
}

// Stats loading
async function loadStats() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/stats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('statUsers').textContent = data.stats.total_users || 0;
            document.getElementById('statQuestions').textContent = data.stats.total_questions || 0;
            document.getElementById('statTopics').textContent = data.stats.total_topics || 0;
            document.getElementById('statGrades').textContent = data.stats.total_grades || 0;
        }
    } catch (e) { console.error("Stats error:", e); }
}

// GRADES
async function loadGrades() {
    const container = document.getElementById('gradesList');
    container.innerHTML = '<div class="loading">Loading...</div>';
    try {
        const res = await fetch(`${API_BASE}/api/grades`);
        const data = await res.json();
        if (data.success && data.grades.length > 0) {
            let html = '<table class="data-table"><thead><tr><th>Grade</th><th>Order</th><th>Actions</th></tr></thead><tbody>';
            data.grades.forEach(g => {
                html += `<tr><td>${g.grade_name}</td><td>${g.grade_order}</td><td><button class="btn-danger" onclick="alert('Delete functionality can be added')">Delete</button></td></tr>`;
            });
            html += '</tbody></table>';
            container.innerHTML = html;
        } else {
            container.innerHTML = '<p>No grades found. Create one above!</p>';
        }
    } catch (e) { container.innerHTML = '<p style="color:red">Error loading grades</p>'; }
}

async function createGrade() {
    const grade_name = document.getElementById('gradeName').value.trim();
    const grade_order = document.getElementById('gradeOrder').value;
    if (!grade_name || !grade_order) { alert("Please fill all required fields"); return; }

    try {
        const res = await fetch(`${API_BASE}/api/grades`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ grade_name, grade_order, adminEmail: ADMIN_EMAIL, adminPassword: ADMIN_PASSWORD })
        });
        const data = await res.json();
        if (data.success) {
            alert("✅ Grade created!");
            document.getElementById('gradeName').value = '';
            loadGrades();
            loadGradesForSelect(); // Refresh dropdowns
        } else { alert("Error: " + data.error); }
    } catch (e) { alert("Connection error"); }
}

async function loadGradesForSelect() {
    try {
        const res = await fetch(`${API_BASE}/api/grades`);
        const data = await res.json();
        const selects = ['subjectGradeSelect', 'qGradeSelect'];
        selects.forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            sel.innerHTML = '<option value="">Select Grade...</option>';
            if (data.success) {
                data.grades.forEach(g => {
                    sel.innerHTML += `<option value="${g.id}">${g.grade_name}</option>`;
                });
            }
        });
    } catch (e) { console.error("Load grades select error:", e); }
}

// SUBJECTS
async function loadSubjects() {
    const container = document.getElementById('subjectsList');
    container.innerHTML = '<div class="loading">Loading...</div>';
    try {
        const res = await fetch(`${API_BASE}/api/subjects`);
        const data = await res.json();
        if (data.success && data.subjects.length > 0) {
            let html = '<table class="data-table"><thead><tr><th>Subject</th><th>Grade</th><th>Description</th></tr></thead><tbody>';
            data.subjects.forEach(s => {
                html += `<tr><td>${s.subject_name}</td><td>${s.grade_name}</td><td>${s.description || '-'}</td></tr>`;
            });
            html += '</tbody></table>';
            container.innerHTML = html;
        } else { container.innerHTML = '<p>No subjects found</p>'; }
    } catch (e) { container.innerHTML = '<p style="color:red">Error</p>'; }
}

async function createSubject() {
    const subject_name = document.getElementById('subjectName').value.trim();
    const grade_id = document.getElementById('subjectGradeSelect').value;
    const description = document.getElementById('subjectDesc').value.trim();
    if (!subject_name || !grade_id) { alert("Please fill required fields"); return; }

    try {
        const res = await fetch(`${API_BASE}/api/subjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject_name, grade_id, description, adminEmail: ADMIN_EMAIL, adminPassword: ADMIN_PASSWORD })
        });
        const data = await res.json();
        if (data.success) {
            alert("✅ Subject created!");
            document.getElementById('subjectName').value = '';
            document.getElementById('subjectDesc').value = '';
            loadSubjects();
            loadSubjectsForSelect();
        } else { alert("Error: " + data.error); }
    } catch (e) { alert("Connection error"); }
}

async function loadSubjectsForSelect() {
    try {
        const grade_id = document.getElementById('qGradeSelect').value;
        let url = `${API_BASE}/api/subjects`;
        if (grade_id) url += `?grade_id=${grade_id}`;
        const res = await fetch(url);
        const data = await res.json();
        const selects = ['topicSubjectSelect', 'qSubjectSelect'];
        selects.forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            sel.innerHTML = '<option value="">Select Subject...</option>';
            if (data.success) {
                data.subjects.forEach(s => {
                    sel.innerHTML += `<option value="${s.id}">${s.subject_name}</option>`;
                });
            }
        });
    } catch (e) { console.error("Load subjects select error:", e); }
}

function filterSubjectsByGrade() { loadSubjectsForSelect(); }
function filterTopicsBySubject() { loadTopicsForQuestionSelect(); }

// TOPICS
async function loadTopics() {
    const container = document.getElementById('topicsList');
    container.innerHTML = '<div class="loading">Loading...</div>';
    try {
        const res = await fetch(`${API_BASE}/api/topics`);
        const data = await res.json();
        if (data.success && data.topics.length > 0) {
            let html = '<table class="data-table"><thead><tr><th>Topic</th><th>Subject</th><th>Grade</th><th>Intro</th></tr></thead><tbody>';
            data.topics.forEach(t => {
                html += `<tr><td>${t.topic_name}</td><td>${t.subject_name}</td><td>${t.grade_name}</td><td>${t.intro?.substring(0, 50) || '-'}...</td></tr>`;
            });
            html += '</tbody></table>';
            container.innerHTML = html;
        } else { container.innerHTML = '<p>No topics found</p>'; }
    } catch (e) { container.innerHTML = '<p style="color:red">Error</p>'; }
}

async function createTopic() {
    const topic_name = document.getElementById('topicName').value.trim();
    const subject_id = document.getElementById('topicSubjectSelect').value;
    const intro = document.getElementById('topicIntro').value.trim();
    const description = document.getElementById('topicDesc').value.trim();
    if (!topic_name || !subject_id) { alert("Please fill required fields"); return; }

    try {
        const res = await fetch(`${API_BASE}/api/topics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic_name, subject_id, intro, description, adminEmail: ADMIN_EMAIL, adminPassword: ADMIN_PASSWORD })
        });
        const data = await res.json();
        if (data.success) {
            alert("✅ Topic created!");
            document.getElementById('topicName').value = '';
            document.getElementById('topicIntro').value = '';
            document.getElementById('topicDesc').value = '';
            loadTopics();
            loadTopicsForQuestionSelect();
        } else { alert("Error: " + data.error); }
    } catch (e) { alert("Connection error"); }
}

async function loadTopicsForQuestionSelect() {
    try {
        const subject_id = document.getElementById('qSubjectSelect').value;
        let url = `${API_BASE}/api/topics`;
        if (subject_id) url += `?subject_id=${subject_id}`;
        const res = await fetch(url);
        const data = await res.json();
        const selects = ['qTopicSelect', 'filterTopic'];
        selects.forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            sel.innerHTML = '<option value="">All Topics</option>';
            if (data.success) {
                data.topics.forEach(t => {
                    sel.innerHTML += `<option value="${t.id}">${t.topic_name} (${t.subject_name})</option>`;
                });
            }
        });
    } catch (e) { console.error("Load topics select error:", e); }
}

// QUESTIONS
function addAnswer() {
    const container = document.getElementById('answersList');
    const div = document.createElement('div');
    div.className = 'answer-item';
    div.innerHTML = `
        <input type="checkbox" class="correct-check" title="Mark as correct answer">
        <input type="text" class="answer-text" placeholder="Answer option...">
        <button class="btn-remove-answer" onclick="removeAnswer(this)">✕</button>
      `;
    container.appendChild(div);
}

function removeAnswer(btn) {
    const item = btn.closest('.answer-item');
    if (document.querySelectorAll('.answer-item').length > 1) {
        item.remove();
    } else {
        alert("At least one answer option is required");
    }
}

async function loadQuestions() {
    const container = document.getElementById('questionsList');
    container.innerHTML = '<div class="loading">Loading...</div>';
    try {
        const topic_id = document.getElementById('filterTopic').value;
        let url = `${API_BASE}/api/questions`;
        if (topic_id) url += `?topic_id=${topic_id}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && data.questions.length > 0) {
            let html = '<table class="data-table"><thead><tr><th>Question</th><th>Type</th><th>Points</th><th>Answers</th><th>Actions</th></tr></thead><tbody>';
            data.questions.forEach(q => {
                const correctCount = q.answers?.filter(a => a.is_correct).length || 0;
                html += `
              <tr>
                <td>${q.question_text.substring(0, 80)}${q.question_text.length > 80 ? '...' : ''}</td>
                <td>${q.question_type}</td>
                <td>${q.points}</td>
                <td>${correctCount} correct / ${q.answers?.length || 0} total</td>
                <td>
                  <button class="btn-secondary" onclick="editQuestion(${q.id})">✏️</button>
                  <button class="btn-danger" onclick="deleteQuestion(${q.id})">🗑️</button>
                </td>
              </tr>
            `;
            });
            html += '</tbody></table>';
            container.innerHTML = html;
        } else { container.innerHTML = '<p>No questions found for this topic</p>'; }
    } catch (e) { container.innerHTML = '<p style="color:red">Error loading questions</p>'; }
}

async function createQuestion() {
    const topic_id = document.getElementById('qTopicSelect').value;
    const question_text = document.getElementById('qText').value.trim();
    if (!topic_id || !question_text) { alert("Please select a topic and enter question text"); return; }

    // Gather answers
    const answers = [];
    document.querySelectorAll('.answer-item').forEach(item => {
        const text = item.querySelector('.answer-text').value.trim();
        const is_correct = item.querySelector('.correct-check').checked;
        if (text) answers.push({ answer_text: text, is_correct });
    });

    // For non-multiple choice, ensure at least one "answer" for validation
    const qType = document.getElementById('qType').value;
    if (qType !== 'multiple_choice' && answers.length === 0) {
        answers.push({ answer_text: "N/A", is_correct: true });
    }

    try {
        const res = await fetch(`${API_BASE}/api/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic_id,
                question_text,
                question_type: qType,
                difficulty: document.getElementById('qDifficulty').value,
                points: document.getElementById('qPoints').value,
                time_limit: document.getElementById('qTimeLimit').value || null,
                hints: document.getElementById('qHints').value.trim() || null,
                explanation: document.getElementById('qExplanation').value.trim() || null,
                answers,
                adminEmail: ADMIN_EMAIL,
                adminPassword: ADMIN_PASSWORD
            })
        });
        const data = await res.json();
        if (data.success) {
            alert("✅ Question saved!");
            // Reset form
            document.getElementById('qText').value = '';
            document.getElementById('qHints').value = '';
            document.getElementById('qExplanation').value = '';
            document.getElementById('qTimeLimit').value = '';
            loadQuestions();
        } else { alert("Error: " + data.error); }
    } catch (e) { alert("Connection error: " + e.message); }
}

async function deleteQuestion(id) {
    if (!confirm("Delete this question permanently?")) return;
    try {
        const res = await fetch(`${API_BASE}/api/questions/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminEmail: ADMIN_EMAIL, adminPassword: ADMIN_PASSWORD })
        });
        const data = await res.json();
        if (data.success) { alert("✅ Deleted"); loadQuestions(); }
        else { alert("Error: " + data.error); }
    } catch (e) { alert("Connection error"); }
}

function editQuestion(id) {
    alert("Edit functionality: Load question data into form (implementation similar to create)");
    // Implementation: Fetch question by ID, populate form fields, change save button to "Update"
}

// Logout
window.handleLogout = function () {
    sessionStorage.clear();
    window.location.href = 'login.html';
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadGrades();
    loadGradesForSelect();
});
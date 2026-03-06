// ============================================
// PEER-2-PEER PRO: ADMIN PORTAL JAVASCRIPT
// Endpoint: https://practice.buhle-1ce.workers.dev
// Features: Grades, Subjects, Topics (+Media), Questions (All Types)
// ============================================

const API_BASE = "https://practice.buhle-1ce.workers.dev";
const ADMIN_EMAIL = "admin@peer-2-peer.co.za";
const ADMIN_PASSWORD = "Admin@2014"; // ⚠️ Use Wrangler secrets in production

// ✅ TAB SWITCHING
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    event.currentTarget.classList.add('active');
    document.getElementById(tabName + '-tab').classList.add('active');

    if (tabName === 'grades') loadGrades();
    if (tabName === 'subjects') { loadGradesForSelect(); loadSubjects(); }
    if (tabName === 'topics') { loadSubjectsForSelect(); loadTopics(); }
    if (tabName === 'questions') { loadGradesForSelect(); loadSubjectsForSelect(); loadTopicsForQuestionSelect(); loadQuestions(); }
}

// ✅ LOAD ADMIN STATS
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

// ============================================
// 📚 GRADES FUNCTIONS
// ============================================
async function loadGrades() {
    const container = document.getElementById('gradesList');
    container.innerHTML = '<div class="loading">Loading grades...</div>';
    try {
        const res = await fetch(`${API_BASE}/api/grades`);
        const data = await res.json();
        if (data.success && data.grades.length > 0) {
            let html = '<table class="data-table"><thead><tr><th>Grade</th><th>Order</th><th>Actions</th></tr></thead><tbody>';
            data.grades.forEach(g => {
                html += `<tr><td>${g.grade_name}</td><td>${g.grade_order}</td><td><button class="btn-danger" onclick="deleteGrade(${g.id})">Delete</button></td></tr>`;
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
            loadGradesForSelect();
        } else { alert("Error: " + data.error); }
    } catch (e) { alert("Connection error"); }
}

async function deleteGrade(id) {
    if (!confirm("Delete this grade? This will also delete associated subjects, topics, and questions.")) return;
    // Note: Implement CASCADE deletes in DB or handle manually
    alert("Delete functionality: Implement CASCADE delete or soft delete as needed");
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

// ============================================
// 📖 SUBJECTS FUNCTIONS
// ============================================
async function loadSubjects() {
    const container = document.getElementById('subjectsList');
    container.innerHTML = '<div class="loading">Loading subjects...</div>';
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
    } catch (e) { container.innerHTML = '<p style="color:red">Error loading subjects</p>'; }
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

// ============================================
// 🎯 TOPICS FUNCTIONS (+ MEDIA)
// ============================================
async function loadTopics() {
    const container = document.getElementById('topicsList');
    container.innerHTML = '<div class="loading">Loading topics...</div>';
    try {
        const res = await fetch(`${API_BASE}/api/topics`);
        const data = await res.json();
        if (data.success && data.topics.length > 0) {
            let html = '<table class="data-table"><thead><tr><th>Topic</th><th>Subject</th><th>Grade</th><th>Intro</th><th>Media</th></tr></thead><tbody>';
            data.topics.forEach(t => {
                const mediaCount = t.media?.length || 0;
                html += `<tr>
          <td>${t.topic_name}</td>
          <td>${t.subject_name}</td>
          <td>${t.grade_name}</td>
          <td>${t.intro?.substring(0, 40) || '-'}${t.intro?.length > 40 ? '...' : ''}</td>
          <td>${mediaCount > 0 ? `${mediaCount} item(s)` : '-'}</td>
        </tr>`;
            });
            html += '</tbody></table>';
            container.innerHTML = html;
        } else { container.innerHTML = '<p>No topics found</p>'; }
    } catch (e) { container.innerHTML = '<p style="color:red">Error loading topics</p>'; }
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
            body: JSON.stringify({
                topic_name, subject_id, intro, description,
                media: gatherTopicMedia(),
                adminEmail: ADMIN_EMAIL, adminPassword: ADMIN_PASSWORD
            })
        });
        const data = await res.json();
        if (data.success) {
            alert("✅ Topic created!");
            document.getElementById('topicName').value = '';
            document.getElementById('topicIntro').value = '';
            document.getElementById('topicDesc').value = '';
            document.getElementById('topicMediaList').innerHTML = '';
            loadTopics();
            loadTopicsForQuestionSelect();
        } else { alert("Error: " + data.error); }
    } catch (e) { alert("Connection error"); }
}

// 🎬 TOPIC MEDIA FUNCTIONS
function addTopicMedia() {
    const container = document.getElementById('topicMediaList');
    const div = document.createElement('div');
    div.className = 'answer-item';
    div.innerHTML = `
    <select class="media-type" style="padding:8px; border-radius:6px; border:1px solid #e1e5eb; min-width:120px;">
      <option value="youtube">🎬 YouTube</option>
      <option value="image">🖼️ Image</option>
    </select>
    <input type="text" class="media-url" placeholder="Paste URL..." style="flex:2; padding:8px; border-radius:6px; border:1px solid #e1e5eb;">
    <input type="text" class="media-caption" placeholder="Caption (optional)" style="flex:1; padding:8px; border-radius:6px; border:1px solid #e1e5eb;">
    <input type="number" class="media-order" placeholder="Order" value="0" style="width:60px; padding:8px; border-radius:6px; border:1px solid #e1e5eb;">
    <button class="btn-remove-answer" onclick="removeTopicMedia(this)" title="Remove">✕</button>
  `;
    container.appendChild(div);
}

function removeTopicMedia(btn) {
    const item = btn.closest('.answer-item');
    item.remove();
}

function gatherTopicMedia() {
    const media = [];
    document.querySelectorAll('#topicMediaList .answer-item').forEach((item, idx) => {
        const type = item.querySelector('.media-type').value;
        const url = item.querySelector('.media-url').value.trim();
        const caption = item.querySelector('.media-caption').value.trim();
        const order = parseInt(item.querySelector('.media-order').value) || idx;
        if (url) {
            media.push({ media_type: type, media_url: url, caption, display_order: order });
        }
    });
    return media;
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

function filterTopicsBySubject() { loadTopicsForQuestionSelect(); }

// ============================================
// ❓ QUESTIONS FUNCTIONS (ALL TYPES)
// ============================================

// Toggle question type fields
function toggleQuestionTypeFields() {
    const type = document.getElementById('qType').value;
    document.querySelectorAll('.question-type-section').forEach(sec => sec.classList.add('hidden'));

    if (type === 'essay') {
        document.getElementById('essayFields').classList.remove('hidden');
        document.getElementById('answersSection').classList.add('hidden');
    } else if (type === 'matching') {
        document.getElementById('matchingFields').classList.remove('hidden');
        document.getElementById('answersSection').classList.add('hidden');
    } else if (type === 'comprehension') {
        document.getElementById('comprehensionFields').classList.remove('hidden');
        document.getElementById('answersSection').classList.remove('hidden');
    } else {
        document.getElementById('answersSection').classList.remove('hidden');
    }
}

// 📝 ESSAY FUNCTIONS
function addEssayPoint() {
    const container = document.getElementById('essayPointsList');
    const div = document.createElement('div');
    div.className = 'answer-item';
    div.innerHTML = `
    <input type="text" class="point-text" placeholder="Key point..." style="flex:2;">
    <input type="number" class="point-marks" placeholder="Marks" value="1" style="width:70px;">
    <label style="display:flex; align-items:center; gap:5px; font-size:0.85rem;">
      <input type="checkbox" class="point-required" checked> Required
    </label>
    <button class="btn-remove-answer" onclick="removeEssayPoint(this)">✕</button>
  `;
    container.appendChild(div);
}
function removeEssayPoint(btn) {
    const item = btn.closest('.answer-item');
    if (document.querySelectorAll('#essayPointsList .answer-item').length > 1) {
        item.remove();
    } else { alert("At least one marking point required"); }
}
function gatherEssayPoints() {
    const points = [];
    document.querySelectorAll('#essayPointsList .answer-item').forEach((item, idx) => {
        const text = item.querySelector('.point-text').value.trim();
        const marks = parseInt(item.querySelector('.point-marks').value) || 1;
        const required = item.querySelector('.point-required').checked;
        if (text) {
            points.push({ point_text: text, point_marks: marks, is_required: required, point_order: idx + 1 });
        }
    });
    return points;
}

// 🔗 MATCHING FUNCTIONS
function addMatchingPair() {
    const container = document.getElementById('matchingPairsList');
    const div = document.createElement('div');
    div.className = 'answer-item';
    div.style.flexWrap = 'wrap';
    div.innerHTML = `
    <input type="text" class="column-a" placeholder="Column A..." style="flex:1; min-width:120px;">
    <span style="margin:0 10px; color:#999;">↔</span>
    <input type="text" class="column-b" placeholder="Column B..." style="flex:1; min-width:120px;">
    <input type="number" class="pair-order" placeholder="Order" value="1" style="width:60px;">
    <button class="btn-remove-answer" onclick="removeMatchingPair(this)">✕</button>
  `;
    container.appendChild(div);
}
function removeMatchingPair(btn) {
    const item = btn.closest('.answer-item');
    if (document.querySelectorAll('#matchingPairsList .answer-item').length > 1) {
        item.remove();
    } else { alert("At least one matching pair required"); }
}
function gatherMatchingPairs() {
    const pairs = [];
    document.querySelectorAll('#matchingPairsList .answer-item').forEach((item, idx) => {
        const a = item.querySelector('.column-a').value.trim();
        const b = item.querySelector('.column-b').value.trim();
        const order = parseInt(item.querySelector('.pair-order').value) || idx + 1;
        if (a && b) {
            pairs.push({ column_a: a, column_b: b, pair_order: order });
        }
    });
    return pairs;
}

// 📖 COMPREHENSION FUNCTIONS
function gatherComprehensionPassage() {
    const text = document.getElementById('passageText').value.trim();
    if (!text) return null;
    return {
        passage_text: text,
        passage_title: document.getElementById('passageTitle').value.trim() || null,
        passage_source: document.getElementById('passageSource').value.trim() || null
    };
}

// Standard answer functions (for MCQ, TF, Short Answer, Comprehension Q&A)
function addAnswer() {
    const container = document.getElementById('answersList');
    const div = document.createElement('div');
    div.className = 'answer-item';
    div.innerHTML = `
    <input type="checkbox" class="correct-check" title="Mark as correct">
    <input type="text" class="answer-text" placeholder="Answer option..." style="flex:1;">
    <button class="btn-remove-answer" onclick="removeAnswer(this)">✕</button>
  `;
    container.appendChild(div);
}
function removeAnswer(btn) {
    const item = btn.closest('.answer-item');
    if (document.querySelectorAll('#answersList .answer-item').length > 1) {
        item.remove();
    } else { alert("At least one answer option required"); }
}
function gatherAnswers() {
    const answers = [];
    document.querySelectorAll('#answersList .answer-item').forEach(item => {
        const text = item.querySelector('.answer-text').value.trim();
        const is_correct = item.querySelector('.correct-check').checked;
        if (text) answers.push({ answer_text: text, is_correct });
    });
    return answers;
}

// LOAD QUESTIONS
async function loadQuestions() {
    const container = document.getElementById('questionsList');
    container.innerHTML = '<div class="loading">Loading questions...</div>';
    try {
        const topic_id = document.getElementById('filterTopic').value;
        let url = `${API_BASE}/api/questions`;
        if (topic_id) url += `?topic_id=${topic_id}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && data.questions.length > 0) {
            let html = '<table class="data-table"><thead><tr><th>Question</th><th>Type</th><th>Points</th><th>Details</th><th>Actions</th></tr></thead><tbody>';
            data.questions.forEach(q => {
                let details = '';
                if (q.question_type === 'essay') details = `${q.essay_points?.length || 0} marking points`;
                else if (q.question_type === 'matching') details = `${q.matching_pairs?.length || 0} pairs`;
                else if (q.question_type === 'comprehension') details = 'Passage + Q&A';
                else details = `${q.answers?.filter(a => a.is_correct).length || 0} correct / ${q.answers?.length || 0} total`;

                html += `<tr>
          <td>${q.question_text.substring(0, 60)}${q.question_text.length > 60 ? '...' : ''}</td>
          <td>${q.question_type}</td>
          <td>${q.points}</td>
          <td>${details}</td>
          <td>
            <button class="btn-secondary" onclick="editQuestion(${q.id})">✏️</button>
            <button class="btn-danger" onclick="deleteQuestion(${q.id})">🗑️</button>
          </td>
        </tr>`;
            });
            html += '</tbody></table>';
            container.innerHTML = html;
        } else { container.innerHTML = '<p>No questions found</p>'; }
    } catch (e) { container.innerHTML = '<p style="color:red">Error loading questions</p>'; }
}

// CREATE QUESTION (SUPPORTS ALL TYPES)
async function createQuestion() {
    const topic_id = document.getElementById('qTopicSelect').value;
    const question_text = document.getElementById('qText').value.trim();
    if (!topic_id || !question_text) { alert("Please select a topic and enter question text"); return; }

    const qType = document.getElementById('qType').value;
    let answers = [], essay_points = [], matching_pairs = [], comprehension_passage = null;

    if (qType === 'essay') {
        essay_points = gatherEssayPoints();
        if (essay_points.length === 0) { alert("Add at least one marking point for essay questions"); return; }
    } else if (qType === 'matching') {
        matching_pairs = gatherMatchingPairs();
        if (matching_pairs.length === 0) { alert("Add at least one matching pair"); return; }
    } else if (qType === 'comprehension') {
        comprehension_passage = gatherComprehensionPassage();
        if (!comprehension_passage) { alert("Enter a comprehension passage"); return; }
        answers = gatherAnswers(); // Q&A for comprehension
    } else {
        answers = gatherAnswers();
        if (answers.length === 0 && qType !== 'short_answer') { alert("Add at least one answer option"); return; }
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
                answers: answers.length > 0 ? answers : undefined,
                essay_points: essay_points.length > 0 ? essay_points : undefined,
                matching_pairs: matching_pairs.length > 0 ? matching_pairs : undefined,
                comprehension_passage,
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
            document.getElementById('essayPointsList').innerHTML = '';
            document.getElementById('matchingPairsList').innerHTML = '';
            document.getElementById('passageText').value = '';
            document.getElementById('passageTitle').value = '';
            document.getElementById('passageSource').value = '';
            document.getElementById('answersList').innerHTML = `
        <div class="answer-item">
          <input type="checkbox" class="correct-check" checked>
          <input type="text" class="answer-text" placeholder="Answer option...">
          <button class="btn-remove-answer" onclick="removeAnswer(this)">✕</button>
        </div>
        <div class="answer-item">
          <input type="checkbox" class="correct-check">
          <input type="text" class="answer-text" placeholder="Answer option...">
          <button class="btn-remove-answer" onclick="removeAnswer(this)">✕</button>
        </div>
      `;
            loadQuestions();
        } else { alert("Error: " + data.error); }
    } catch (e) { alert("Connection error: " + e.message); }
}

// DELETE QUESTION
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

// EDIT QUESTION (Placeholder - implement full edit logic as needed)
function editQuestion(id) {
    alert("Edit functionality: Fetch question by ID and populate form. Implementation similar to create but with PUT request.");
    // Full implementation: 
    // 1. Fetch question: GET /api/questions?topic_id=X, find by id
    // 2. Populate all form fields including essay_points, matching_pairs, etc.
    // 3. Change save button to "Update" and send PUT to /api/questions/{id}
}

// ============================================
// 🚪 LOGOUT & INIT
// ============================================
window.handleLogout = function () {
    sessionStorage.clear();
    window.location.href = 'login.html';
};

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadGrades();
    loadGradesForSelect();
    // Initialize question type toggle
    document.getElementById('qType')?.addEventListener('change', toggleQuestionTypeFields);
});
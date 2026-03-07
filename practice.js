// ============================================
// PEER-2-PEER PRO: STUDENT PRACTICE QUESTIONS (FINAL)
// Endpoint: https://learneranswer.buhle-1ce.workers.dev
// ============================================

const API_BASE = "https://learneranswer.buhle-1ce.workers.dev";

// Student identity (loaded from sessionStorage or form)
let studentNumber = sessionStorage.getItem('p2p_student_number') || '';
let studentName = sessionStorage.getItem('p2p_name') || '';
let studentEmail = sessionStorage.getItem('p2p_email') || '';
let studentGrade = sessionStorage.getItem('p2p_grade') || '';

// Navigation state
let currentView = 'studentId';
let selectedGradeId = null;
let selectedSubjectId = null;
let selectedTopicId = null;

// Quiz state
let currentQuestions = [];
let currentQuestionIndex = 0;
let selectedAnswer = null;
let quizStats = { correct: 0, attempted: 0, points: 0 };

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if student is already identified
    if (studentNumber) {
        // Verify student exists in DB, then show practice
        verifyStudentAndLoad();
    } else {
        // Show identification form
        showView('studentIdView');
        currentView = 'studentId';
        document.getElementById('searchBar').classList.add('hidden');
    }
});

// Register new student with name/surname
async function registerStudent() {
    const firstName = document.getElementById('firstNameInput').value.trim();
    const lastName = document.getElementById('lastNameInput').value.trim();
    const email = document.getElementById('emailInput').value.trim();
    const grade = document.getElementById('gradeInput').value.trim();
    const schoolName = document.getElementById('schoolInput').value.trim();

    if (!firstName || !lastName) {
        alert("Please enter your first name and last name");
        return;
    }

    const btn = event.target;
    btn.disabled = true;
    btn.textContent = "Setting up...";

    try {
        const res = await fetch(`${API_BASE}/api/register-student`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, lastName, email, grade, schoolName })
        });

        const data = await res.json();

        if (data.success) {
            // Save to sessionStorage
            studentNumber = data.student.student_number;
            studentName = `${data.student.first_name} ${data.student.last_name}`;
            studentEmail = data.student.email || '';
            studentGrade = data.student.grade || '';

            sessionStorage.setItem('p2p_student_number', studentNumber);
            sessionStorage.setItem('p2p_name', studentName);
            sessionStorage.setItem('p2p_email', studentEmail);
            sessionStorage.setItem('p2p_grade', studentGrade);

            // Load practice content
            loadGrades();
        } else {
            alert("Error: " + data.error);
            btn.disabled = false;
            btn.textContent = "Start Practicing →";
        }
    } catch (e) {
        console.error("Register error:", e);
        alert("Connection error. Please try again.");
        btn.disabled = false;
        btn.textContent = "Start Practicing →";
    }
}

// Verify existing student by student_number
async function verifyStudentAndLoad() {
    try {
        const res = await fetch(`${API_BASE}/api/verify-student`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_number: studentNumber })
        });
        const data = await res.json();

        if (data.success) {
            // Student verified, load practice
            studentName = `${data.student.first_name} ${data.student.last_name}`;
            studentEmail = data.student.email || '';
            studentGrade = data.student.grade || '';
            sessionStorage.setItem('p2p_name', studentName);
            sessionStorage.setItem('p2p_email', studentEmail);
            sessionStorage.setItem('p2p_grade', studentGrade);
            loadGrades();
        } else {
            // Student not found, show registration form
            sessionStorage.clear();
            studentNumber = '';
            showView('studentIdView');
            currentView = 'studentId';
            document.getElementById('searchBar').classList.add('hidden');
        }
    } catch (e) {
        console.error("Verify error:", e);
        // On error, still try to load (graceful degradation)
        loadGrades();
    }
}

// Load Grades
async function loadGrades(searchQuery = '') {
    showView('gradesView');
    currentView = 'grades';
    document.getElementById('searchBar').classList.remove('hidden');

    const container = document.getElementById('gradesList');
    container.innerHTML = '<div style="padding:40px; text-align:center; color:#666;">Loading...</div>';

    try {
        let url = `${API_BASE}/api/grades`;
        if (searchQuery) url += `?search=${encodeURIComponent(searchQuery)}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.success && data.grades.length > 0) {
            container.innerHTML = data.grades.map(g => `
        <div class="selection-item" onclick="selectGrade(${g.id}, '${g.grade_name}')">
          <h4>${g.grade_name}</h4>
          <p>Practice questions</p>
        </div>
      `).join('');
        } else {
            container.innerHTML = '<div style="padding:40px; text-align:center; color:#666;">No grades found</div>';
        }
    } catch (e) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:red;">Error loading grades</div>';
        console.error("Load grades error:", e);
    }
}

// Select Grade
async function selectGrade(gradeId, gradeName) {
    selectedGradeId = gradeId;
    showView('subjectsView');
    currentView = 'subjects';
    loadSubjects(gradeId);
}

// Load Subjects
async function loadSubjects(gradeId, searchQuery = '') {
    const container = document.getElementById('subjectsList');
    container.innerHTML = '<div style="padding:40px; text-align:center; color:#666;">Loading...</div>';

    try {
        let url = `${API_BASE}/api/subjects?grade_id=${gradeId}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.success && data.subjects.length > 0) {
            container.innerHTML = data.subjects.map(s => `
        <div class="selection-item" onclick="selectSubject(${s.id}, '${s.subject_name}')">
          <h4>${s.subject_name}</h4>
          <p>${s.description?.substring(0, 60) || 'Practice questions'}${s.description?.length > 60 ? '...' : ''}</p>
        </div>
      `).join('');
        } else {
            container.innerHTML = '<div style="padding:40px; text-align:center; color:#666;">No subjects found</div>';
        }
    } catch (e) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:red;">Error loading subjects</div>';
        console.error("Load subjects error:", e);
    }
}

// Select Subject
async function selectSubject(subjectId, subjectName) {
    selectedSubjectId = subjectId;
    showView('topicsView');
    currentView = 'topics';
    loadTopics(subjectId);
}

// Load Topics
async function loadTopics(subjectId, searchQuery = '') {
    const container = document.getElementById('topicsList');
    container.innerHTML = '<div style="padding:40px; text-align:center; color:#666;">Loading...</div>';
    document.getElementById('topicIntro').classList.add('hidden');
    document.getElementById('topicMediaSection').classList.add('hidden');

    try {
        let url = `${API_BASE}/api/topics?subject_id=${subjectId}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.success && data.topics.length > 0) {
            container.innerHTML = data.topics.map(t => {
                const mediaCount = t.media?.length || 0;
                return `
        <div class="selection-item" onclick="startQuiz(${t.id}, '${t.topic_name}', '${(t.intro || '').replace(/'/g, "\\'")}', ${JSON.stringify(t.media || [])})">
          <h4>${t.topic_name}</h4>
          <p>${t.description?.substring(0, 70) || 'Start practicing'}${t.description?.length > 70 ? '...' : ''}</p>
          ${mediaCount > 0 ? `<small style="color:#32cd32; display:block; margin-top:8px;">🎬 ${mediaCount} resource${mediaCount > 1 ? 's' : ''}</small>` : ''}
        </div>
      `;
            }).join('');
        } else {
            container.innerHTML = '<div style="padding:40px; text-align:center; color:#666;">No topics found</div>';
        }
    } catch (e) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:red;">Error loading topics</div>';
        console.error("Load topics error:", e);
    }
}

// Start Quiz
async function startQuiz(topicId, topicName, topicIntro, topicMedia) {
    selectedTopicId = topicId;
    showView('quizView');
    currentView = 'quiz';
    document.getElementById('searchBar').classList.add('hidden');

    // Show topic intro
    if (topicIntro) {
        document.getElementById('topicIntro').textContent = topicIntro;
        document.getElementById('topicIntro').classList.remove('hidden');
    }

    // Display media
    if (topicMedia && topicMedia.length > 0) {
        const mediaGrid = document.getElementById('topicMediaGrid');
        mediaGrid.innerHTML = topicMedia.map(m => {
            if (m.media_type === 'youtube') {
                const videoId = extractYouTubeId(m.media_url);
                if (videoId) {
                    return `
            <div class="media-card" onclick="openFullscreen('youtube', '${videoId}', '${(m.caption || '').replace(/'/g, "\\'")}')">
              <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen title="${m.caption || 'Video'}"></iframe>
              <div class="play-icon">▶</div>
              ${m.caption ? `<div class="media-overlay">${m.caption}</div>` : ''}
            </div>
          `;
                }
            } else if (m.media_type === 'image') {
                return `
          <div class="media-card" onclick="openFullscreen('image', '${m.media_url}', '${(m.caption || '').replace(/'/g, "\\'")}')">
            <img src="${m.media_url}" alt="${m.caption || 'Image'}" onerror="this.parentElement.style.display='none'">
            ${m.caption ? `<div class="media-overlay">${m.caption}</div>` : ''}
          </div>
        `;
            }
            return '';
        }).join('');
        document.getElementById('topicMediaSection').classList.remove('hidden');
    }

    // Load questions
    try {
        const res = await fetch(`${API_BASE}/api/questions?topic_id=${topicId}`);
        const data = await res.json();

        if (data.success && data.questions.length > 0) {
            currentQuestions = data.questions;
            currentQuestionIndex = 0;
            quizStats = { correct: 0, attempted: 0, points: 0 };
            showQuestion();
        } else {
            alert("No questions available for this topic yet.");
            goBack('topics');
        }
    } catch (e) {
        console.error("Load questions error:", e);
        alert("Error loading questions. Please try again.");
        goBack('topics');
    }
}

// Show Question
function showQuestion() {
    const q = currentQuestions[currentQuestionIndex];
    if (!q) return;

    document.getElementById('questionCounter').textContent = `Question ${currentQuestionIndex + 1} of ${currentQuestions.length}`;
    document.getElementById('questionText').textContent = q.question_text;

    const answerList = document.getElementById('answerList');
    answerList.innerHTML = '';

    if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
        q.answers.forEach((ans) => {
            const option = document.createElement('div');
            option.className = 'answer-option';
            option.innerHTML = `
        <input type="radio" name="answer" id="ans${ans.id}" value="${ans.id}" style="width:18px; height:18px;">
        <label for="ans${ans.id}" style="flex:1; cursor:pointer;">${ans.answer_text}</label>
      `;
            option.onclick = () => selectAnswer(ans.id, option);
            answerList.appendChild(option);
        });
    } else if (q.question_type === 'short_answer') {
        answerList.innerHTML = `
      <textarea id="shortAnswerInput" placeholder="Type your answer..." style="width:100%; min-height:80px; padding:12px; border:2px solid #e1e5eb; border-radius:10px; font-size:1rem;"></textarea>
    `;
    }

    selectedAnswer = null;
    document.getElementById('hintBox').classList.add('hidden');
    document.getElementById('explanationBox').classList.add('hidden');
    document.getElementById('hintBtn').style.display = q.hints ? 'inline-block' : 'none';
    document.getElementById('submitBtn').disabled = false;
    document.getElementById('submitBtn').classList.remove('hidden');
    document.getElementById('nextBtn').classList.add('hidden');
}

function selectAnswer(answerId, element) {
    document.querySelectorAll('.answer-option').forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
    selectedAnswer = answerId;
}

function showHint() {
    const q = currentQuestions[currentQuestionIndex];
    if (q.hints) {
        document.getElementById('hintBox').textContent = '💡 ' + q.hints;
        document.getElementById('hintBox').classList.remove('hidden');
        document.getElementById('hintBtn').style.display = 'none';
    }
}

async function submitAnswer() {
    const q = currentQuestions[currentQuestionIndex];
    if (!q) return;

    let answerId = selectedAnswer;
    let answerText = null;

    if (q.question_type === 'short_answer') {
        answerText = document.getElementById('shortAnswerInput')?.value.trim();
        if (!answerText) { alert("Please enter an answer"); return; }
    } else if ((q.question_type === 'multiple_choice' || q.question_type === 'true_false') && !answerId) {
        alert("Please select an answer");
        return;
    }

    document.getElementById('submitBtn').disabled = true;
    document.getElementById('submitBtn').textContent = "Checking...";

    const startTime = Date.now();

    try {
        const res = await fetch(`${API_BASE}/api/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_number: studentNumber,
                question_id: q.id,
                selected_answer_id: answerId,
                answer_text: answerText,
                time_taken: Math.round((Date.now() - startTime) / 1000),
                question_type: q.question_type
            })
        });

        const result = await res.json();

        if (result.success) {
            quizStats.attempted++;
            if (result.is_correct) {
                quizStats.correct++;
                quizStats.points += result.points_earned;
            }

            // Show feedback
            const answerOptions = document.querySelectorAll('.answer-option');
            answerOptions.forEach(opt => {
                const input = opt.querySelector('input');
                const optId = parseInt(input.value);
                const correctAnswer = q.answers.find(a => a.is_correct && a.id === optId);
                if (correctAnswer) opt.classList.add('correct');
                else if (optId === selectedAnswer && !result.is_correct) opt.classList.add('incorrect');
            });

            if (result.explanation) {
                document.getElementById('explanationBox').textContent = '✅ ' + result.explanation;
                document.getElementById('explanationBox').classList.remove('hidden');
            }

            document.getElementById('nextBtn').classList.remove('hidden');
            document.getElementById('submitBtn').classList.add('hidden');
        } else {
            alert("Error: " + result.error);
            document.getElementById('submitBtn').disabled = false;
            document.getElementById('submitBtn').textContent = "Submit Answer";
        }
    } catch (e) {
        console.error("Submit error:", e);
        alert("Connection error. Please try again.");
        document.getElementById('submitBtn').disabled = false;
        document.getElementById('submitBtn').textContent = "Submit Answer";
    }
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuestions.length) {
        showQuestion();
    } else {
        showResults();
    }
}

function showResults() {
    showView('resultsView');
    currentView = 'results';
    document.getElementById('searchBar').classList.add('hidden');

    const total = currentQuestions.length;
    const correct = quizStats.correct;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

    document.getElementById('finalScore').textContent = `${correct}/${total}`;

    let message = "Good effort!";
    if (percentage >= 80) message = "🌟 Outstanding!";
    else if (percentage >= 60) message = "👍 Good job!";
    else if (percentage >= 40) message = "💪 Keep practicing!";
    else message = "📚 Don't give up!";

    document.getElementById('resultsMessage').textContent = `${message} (${percentage}%)`;
}

// Navigation
function goBack(view) {
    if (view === 'grades') { loadGrades(); }
    else if (view === 'subjects' && selectedGradeId) { loadSubjects(selectedGradeId); }
    else if (view === 'topics' && selectedSubjectId) { loadTopics(selectedSubjectId); }
}

function restartPractice() { goBack('topics'); }

// Search
function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;
    if (currentView === 'grades') { loadGrades(query); }
    else if (currentView === 'subjects' && selectedGradeId) { loadSubjects(selectedGradeId, query); }
    else if (currentView === 'topics' && selectedSubjectId) { loadTopics(selectedSubjectId, query); }
}

// Fullscreen Modal
function openFullscreen(type, src, caption) {
    const modal = document.getElementById('fullscreenModal');
    const content = document.getElementById('fullscreenContent');
    if (type === 'youtube') {
        content.innerHTML = `<iframe src="https://www.youtube.com/embed/${src}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="width:90vw; height:80vh; border-radius:8px;"></iframe>`;
    } else if (type === 'image') {
        content.innerHTML = `<img src="${src}" alt="${caption}" style="max-width:100%; max-height:90vh; border-radius:8px;">`;
    }
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeFullscreen(event) {
    if (event.target.id === 'fullscreenModal' || event.target.className === 'fullscreen-close') {
        document.getElementById('fullscreenModal').classList.remove('active');
        document.getElementById('fullscreenContent').innerHTML = '';
        document.body.style.overflow = 'auto';
    }
}

// Utilities
function showView(viewId) {
    ['studentIdView', 'gradesView', 'subjectsView', 'topicsView', 'quizView', 'resultsView'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(viewId).classList.remove('hidden');
}

function extractYouTubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function handleLogout() {
    sessionStorage.clear();
    window.location.href = 'login.html';
}
// ============================================
// PEER-2-PEER PRO: STUDENT PRACTICE QUESTIONS (FINAL FIXED)
// Endpoint: https://learneranswer.buhle-1ce.workers.dev
// Database: auth-db (Cloudflare D1)
// ============================================

const API_BASE = "https://learneranswer.buhle-1ce.workers.dev";

// Student identity from sessionStorage
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
    // Setup back button listeners
    setupBackButtons();

    // Setup search listener
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }

    if (studentNumber) {
        verifyStudentAndLoad();
    } else {
        showView('studentIdView');
        currentView = 'studentId';
        const searchBar = document.getElementById('searchBar');
        if (searchBar) searchBar.classList.add('hidden');
    }
});

// ✅ Setup back button event listeners (replaces inline onclick)
function setupBackButtons() {
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const view = btn.dataset.back;
            if (view) goBack(view);
        });
    });
}

// Register/Identify student
async function registerStudent(event) {
    const firstName = document.getElementById('firstNameInput')?.value.trim();
    const lastName = document.getElementById('lastNameInput')?.value.trim();
    const email = document.getElementById('emailInput')?.value.trim();
    const grade = document.getElementById('gradeInput')?.value.trim();
    const schoolName = document.getElementById('schoolInput')?.value.trim();

    if (!firstName || !lastName) {
        alert("Please enter your first name and last name");
        return;
    }

    const btn = event?.target;
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Setting up...";
    }

    try {
        const res = await fetch(`${API_BASE}/api/register-student`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, lastName, email, grade, schoolName })
        });

        const data = await res.json();

        if (data.success) {
            studentNumber = data.student.student_number;
            studentName = `${data.student.first_name} ${data.student.last_name}`;
            studentEmail = data.student.email || '';
            studentGrade = data.student.grade || '';

            sessionStorage.setItem('p2p_student_number', studentNumber);
            sessionStorage.setItem('p2p_name', studentName);
            sessionStorage.setItem('p2p_email', studentEmail);
            sessionStorage.setItem('p2p_grade', studentGrade);

            if (data.message && data.message.includes('created')) {
                alert(`Welcome ${data.student.first_name}! Your student ID is: ${studentNumber}`);
            }

            loadGrades();
        } else {
            alert("Error: " + data.error);
            if (btn) {
                btn.disabled = false;
                btn.textContent = "Start Practicing →";
            }
        }
    } catch (e) {
        console.error("Register error:", e);
        alert("Connection error. Please try again.");
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Start Practicing →";
        }
    }
}

// Verify student exists in DB
async function verifyStudentAndLoad() {
    try {
        const res = await fetch(`${API_BASE}/api/verify-student`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_number: studentNumber })
        });
        const data = await res.json();

        if (data.success) {
            studentName = `${data.student.first_name} ${data.student.last_name}`;
            studentEmail = data.student.email || '';
            studentGrade = data.student.grade || '';
            sessionStorage.setItem('p2p_name', studentName);
            sessionStorage.setItem('p2p_email', studentEmail);
            sessionStorage.setItem('p2p_grade', studentGrade);
            loadGrades();
        } else {
            sessionStorage.clear();
            studentNumber = '';
            showView('studentIdView');
            currentView = 'studentId';
            const searchBar = document.getElementById('searchBar');
            if (searchBar) searchBar.classList.add('hidden');
        }
    } catch (e) {
        console.error("Verify error:", e);
        loadGrades();
    }
}

// Load Grades - ALL GRADES
async function loadGrades(searchQuery = '') {
    showView('gradesView');
    currentView = 'grades';
    const searchBar = document.getElementById('searchBar');
    if (searchBar) searchBar.classList.remove('hidden');

    const container = document.getElementById('gradesList');
    if (container) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:#666;">Loading...</div>';
    }

    try {
        let url = `${API_BASE}/api/grades`;
        if (searchQuery) url += `?search=${encodeURIComponent(searchQuery)}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.success && data.grades && data.grades.length > 0) {
            container.innerHTML = data.grades.map(g => `
        <div class="selection-item" data-grade-id="${g.id}" data-grade-name="${g.grade_name}">
          <h4>${g.grade_name}</h4>
          <p>Practice questions</p>
        </div>
      `).join('');

            // Add click listeners to grade items
            container.querySelectorAll('.selection-item').forEach(item => {
                item.addEventListener('click', () => {
                    const gradeId = item.dataset.gradeId;
                    const gradeName = item.dataset.gradeName;
                    selectGrade(parseInt(gradeId), gradeName);
                });
            });
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
    if (!container) return;

    container.innerHTML = '<div style="padding:40px; text-align:center; color:#666;">Loading...</div>';

    try {
        let url = `${API_BASE}/api/subjects?grade_id=${gradeId}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.success && data.subjects && data.subjects.length > 0) {
            container.innerHTML = data.subjects.map(s => `
        <div class="selection-item" data-subject-id="${s.id}" data-subject-name="${s.subject_name}">
          <h4>${s.subject_name}</h4>
          <p>${s.description?.substring(0, 60) || 'Practice questions'}${s.description?.length > 60 ? '...' : ''}</p>
        </div>
      `).join('');

            // Add click listeners to subject items
            container.querySelectorAll('.selection-item').forEach(item => {
                item.addEventListener('click', () => {
                    const subjectId = item.dataset.subjectId;
                    const subjectName = item.dataset.subjectName;
                    selectSubject(parseInt(subjectId), subjectName);
                });
            });
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

// Load Topics - ALL TOPICS FROM SUBJECT (SAFE: uses data attributes instead of inline onclick)
async function loadTopics(subjectId, searchQuery = '') {
    const container = document.getElementById('topicsList');
    if (!container) return;

    container.innerHTML = '<div style="padding:40px; text-align:center; color:#666;">Loading...</div>';

    const topicIntroEl = document.getElementById('topicIntro');
    const topicMediaSection = document.getElementById('topicMediaSection');
    if (topicIntroEl) topicIntroEl.classList.add('hidden');
    if (topicMediaSection) topicMediaSection.classList.add('hidden');

    try {
        let url = `${API_BASE}/api/topics?subject_id=${subjectId}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.success && data.topics && data.topics.length > 0) {
            container.innerHTML = data.topics.map(t => {
                const mediaCount = t.media?.length || 0;
                const safeIntro = (t.intro || '').replace(/"/g, '&quot;').replace(/\n/g, '\\n');
                const safeMedia = JSON.stringify(t.media || []).replace(/"/g, '&quot;');

                return `
          <div class="selection-item topic-card" 
               data-topic-id="${t.id}" 
               data-topic-name="${(t.topic_name || '').replace(/"/g, '&quot;')}" 
               data-topic-intro="${safeIntro}" 
               data-topic-media='${safeMedia}'>
            <h4>${t.topic_name}</h4>
            <p>${t.description?.substring(0, 70) || 'Start practicing'}${t.description?.length > 70 ? '...' : ''}</p>
            ${mediaCount > 0 ? `<small style="color:#32cd32; display:block; margin-top:8px;">🎬 ${mediaCount} resource${mediaCount > 1 ? 's' : ''}</small>` : ''}
          </div>
        `;
            }).join('');

            // Add click listeners to topic cards (SAFE: no inline JS, handles special chars)
            container.querySelectorAll('.topic-card').forEach(card => {
                card.addEventListener('click', () => {
                    const topicId = parseInt(card.dataset.topicId);
                    const topicName = card.dataset.topicName;
                    const topicIntro = card.dataset.topicIntro || '';
                    let topicMedia = [];
                    try {
                        topicMedia = JSON.parse(card.dataset.topicMedia || '[]');
                    } catch (e) {
                        console.warn('Failed to parse topic media:', e);
                    }
                    startQuiz(topicId, topicName, topicIntro, topicMedia);
                });
            });
        } else {
            container.innerHTML = '<div style="padding:40px; text-align:center; color:#666;">No topics found</div>';
        }
    } catch (e) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:red;">Error loading topics</div>';
        console.error("Load topics error:", e);
    }
}

// Start Quiz - LOAD ALL QUESTIONS FROM TOPIC
async function startQuiz(topicId, topicName, topicIntro, topicMedia) {
    selectedTopicId = topicId;
    showView('quizView');
    currentView = 'quiz';
    const searchBar = document.getElementById('searchBar');
    if (searchBar) searchBar.classList.add('hidden');

    // Show topic intro if available
    const topicIntroEl = document.getElementById('topicIntro');
    if (topicIntroEl) {
        if (topicIntro && topicIntro.trim()) {
            topicIntroEl.textContent = topicIntro;
            topicIntroEl.classList.remove('hidden');
        } else {
            topicIntroEl.classList.add('hidden');
        }
    }

    // Show media resources if available
    if (topicMedia && topicMedia.length > 0) {
        const mediaGrid = document.getElementById('topicMediaGrid');
        if (mediaGrid) {
            mediaGrid.innerHTML = topicMedia.map(m => {
                if (m.media_type === 'youtube') {
                    const videoId = extractYouTubeId(m.media_url);
                    if (videoId) {
                        return `
              <div class="media-card" data-media-type="youtube" data-media-src="${videoId}" data-media-caption="${(m.caption || '').replace(/"/g, '&quot;')}">
                <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen title="${m.caption || 'Video'}"></iframe>
                <div class="play-icon">▶</div>
                ${m.caption ? `<div class="media-overlay">${m.caption}</div>` : ''}
              </div>
            `;
                    }
                } else if (m.media_type === 'image') {
                    return `
            <div class="media-card" data-media-type="image" data-media-src="${m.media_url}" data-media-caption="${(m.caption || '').replace(/"/g, '&quot;')}">
              <img src="${m.media_url}" alt="${m.caption || 'Image'}" onerror="this.parentElement.style.display='none'">
              ${m.caption ? `<div class="media-overlay">${m.caption}</div>` : ''}
            </div>
          `;
                }
                return '';
            }).join('');

            // Add click listeners to media cards
            mediaGrid.querySelectorAll('.media-card').forEach(card => {
                card.addEventListener('click', () => {
                    const type = card.dataset.mediaType;
                    const src = card.dataset.mediaSrc;
                    const caption = card.dataset.mediaCaption || '';
                    openFullscreen(type, src, caption);
                });
            });

            const topicMediaSection = document.getElementById('topicMediaSection');
            if (topicMediaSection) topicMediaSection.classList.remove('hidden');
        }
    }

    // Load questions
    try {
        const res = await fetch(`${API_BASE}/api/questions?topic_id=${topicId}`);
        const data = await res.json();

        if (data.success && data.questions && data.questions.length > 0) {
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

    const counterEl = document.getElementById('questionCounter');
    if (counterEl) counterEl.textContent = `Question ${currentQuestionIndex + 1} of ${currentQuestions.length}`;

    const questionTextEl = document.getElementById('questionText');
    if (questionTextEl) questionTextEl.textContent = q.question_text;

    const answerList = document.getElementById('answerList');
    if (answerList) {
        answerList.innerHTML = '';

        if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
            q.answers?.forEach((ans) => {
                const option = document.createElement('div');
                option.className = 'answer-option';
                option.innerHTML = `
          <input type="radio" name="answer" id="ans${ans.id}" value="${ans.id}" style="width:18px; height:18px;">
          <label for="ans${ans.id}" style="flex:1; cursor:pointer;">${ans.answer_text}</label>
        `;
                option.addEventListener('click', () => selectAnswer(ans.id, option));
                answerList.appendChild(option);
            });
        } else if (q.question_type === 'short_answer') {
            answerList.innerHTML = `
        <textarea id="shortAnswerInput" placeholder="Type your answer..." style="width:100%; min-height:80px; padding:12px; border:2px solid #e1e5eb; border-radius:10px; font-size:1rem;"></textarea>
      `;
        }
    }

    selectedAnswer = null;

    const hintBox = document.getElementById('hintBox');
    if (hintBox) hintBox.classList.add('hidden');

    const explanationBox = document.getElementById('explanationBox');
    if (explanationBox) explanationBox.classList.add('hidden');

    const hintBtn = document.getElementById('hintBtn');
    if (hintBtn) hintBtn.style.display = q.hints ? 'inline-block' : 'none';

    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('hidden');
    }

    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) nextBtn.classList.add('hidden');
}

function selectAnswer(answerId, element) {
    document.querySelectorAll('.answer-option').forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
    selectedAnswer = answerId;
}

function showHint() {
    const q = currentQuestions[currentQuestionIndex];
    if (q?.hints) {
        const hintBox = document.getElementById('hintBox');
        if (hintBox) {
            hintBox.textContent = '💡 ' + q.hints;
            hintBox.classList.remove('hidden');
        }
        const hintBtn = document.getElementById('hintBtn');
        if (hintBtn) hintBtn.style.display = 'none';
    }
}

async function submitAnswer() {
    const q = currentQuestions[currentQuestionIndex];
    if (!q) return;

    let answerId = selectedAnswer;
    let answerText = null;

    if (q.question_type === 'short_answer') {
        const input = document.getElementById('shortAnswerInput');
        answerText = input?.value.trim();
        if (!answerText) {
            alert("Please enter an answer");
            return;
        }
    } else if ((q.question_type === 'multiple_choice' || q.question_type === 'true_false') && !answerId) {
        alert("Please select an answer");
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Checking...";
    }

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

            const answerOptions = document.querySelectorAll('.answer-option');
            answerOptions.forEach(opt => {
                const input = opt.querySelector('input');
                if (!input) return;
                const optId = parseInt(input.value);
                const correctAnswer = q.answers?.find(a => a.is_correct && a.id === optId);
                if (correctAnswer) opt.classList.add('correct');
                else if (optId === selectedAnswer && !result.is_correct) opt.classList.add('incorrect');
            });

            if (result.explanation) {
                const explanationBox = document.getElementById('explanationBox');
                if (explanationBox) {
                    explanationBox.textContent = '✅ ' + result.explanation;
                    explanationBox.classList.remove('hidden');
                }
            }

            const nextBtn = document.getElementById('nextBtn');
            if (nextBtn) nextBtn.classList.remove('hidden');
            if (submitBtn) submitBtn.classList.add('hidden');
        } else {
            alert("Error: " + result.error);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Submit Answer";
            }
        }
    } catch (e) {
        console.error("Submit error:", e);
        alert("Connection error. Please try again.");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Answer";
        }
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
    const searchBar = document.getElementById('searchBar');
    if (searchBar) searchBar.classList.add('hidden');

    const total = currentQuestions.length;
    const correct = quizStats.correct;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

    const finalScoreEl = document.getElementById('finalScore');
    if (finalScoreEl) finalScoreEl.textContent = `${correct}/${total}`;

    let message = "Good effort!";
    if (percentage >= 80) message = "🌟 Outstanding!";
    else if (percentage >= 60) message = "👍 Good job!";
    else if (percentage >= 40) message = "💪 Keep practicing!";
    else message = "📚 Don't give up!";

    const resultsMessageEl = document.getElementById('resultsMessage');
    if (resultsMessageEl) resultsMessageEl.textContent = `${message} (${percentage}%)`;
}

// ✅ FIXED NAVIGATION - Back buttons work properly
function goBack(view) {
    if (view === 'grades') {
        selectedGradeId = null;
        selectedSubjectId = null;
        selectedTopicId = null;
        loadGrades();
    } else if (view === 'subjects' && selectedGradeId) {
        selectedSubjectId = null;
        selectedTopicId = null;
        loadSubjects(selectedGradeId);
    } else if (view === 'topics' && selectedSubjectId) {
        selectedTopicId = null;
        loadTopics(selectedSubjectId);
    }
}

function restartPractice() {
    selectedTopicId = null;
    goBack('topics');
}

// Search
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput?.value.trim();
    if (!query) return;

    if (currentView === 'grades') {
        loadGrades(query);
    } else if (currentView === 'subjects' && selectedGradeId) {
        loadSubjects(selectedGradeId, query);
    } else if (currentView === 'topics' && selectedSubjectId) {
        loadTopics(selectedSubjectId, query);
    }
}

// Fullscreen Modal
function openFullscreen(type, src, caption) {
    const modal = document.getElementById('fullscreenModal');
    const content = document.getElementById('fullscreenContent');
    if (!modal || !content) return;

    if (type === 'youtube') {
        content.innerHTML = `<iframe src="https://www.youtube.com/embed/${src}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="width:90vw; height:80vh; border-radius:8px;"></iframe>`;
    } else if (type === 'image') {
        content.innerHTML = `<img src="${src}" alt="${caption}" style="max-width:100%; max-height:90vh; border-radius:8px;">`;
    }
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeFullscreen(event) {
    const modal = document.getElementById('fullscreenModal');
    const content = document.getElementById('fullscreenContent');
    if (!modal || !content) return;

    if (event?.target?.id === 'fullscreenModal' || event?.target?.className === 'fullscreen-close') {
        modal.classList.remove('active');
        content.innerHTML = '';
        document.body.style.overflow = 'auto';
    }
}

// Utilities
function showView(viewId) {
    const views = ['studentIdView', 'gradesView', 'subjectsView', 'topicsView', 'quizView', 'resultsView'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(viewId);
    if (target) target.classList.remove('hidden');
    window.scrollTo(0, 0);
}

function extractYouTubeId(url) {
    if (!url) return null;
    // Handle various YouTube URL formats
    const patterns = [
        /youtube\.com\/watch\?v=([^&]+)/,
        /youtu\.be\/([^?]+)/,
        /youtube\.com\/embed\/([^?]+)/,
        /youtube\.com\/v\/([^?]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]?.length === 11) {
            return match[1];
        }
    }
    return null;
}

function handleLogout() {
    sessionStorage.clear();
    window.location.href = 'login.html';
}

// Global error handler for debugging
window.addEventListener('error', (e) => {
    console.error('Global error:', e.message, 'at', e.filename + ':' + e.lineno);
});
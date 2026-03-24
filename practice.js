// ============================================
// PEER-2-PEER PRO: STUDENT PRACTICE QUESTIONS (OPTIMIZED FINAL)
// Endpoint: https://learneranswer.buhle-1ce.workers.dev
// ✅ FIXED: Topic media clickability, localStorage persistence, all buttons working
// ============================================

const API_BASE = "https://learneranswer.buhle-1ce.workers.dev";

// 🎯 Student identity - localStorage for persistence, sessionStorage fallback
let studentNumber = localStorage.getItem('p2p_student_number') || sessionStorage.getItem('p2p_student_number') || '';
let studentName = localStorage.getItem('p2p_name') || sessionStorage.getItem('p2p_name') || '';
let studentEmail = localStorage.getItem('p2p_email') || sessionStorage.getItem('p2p_email') || '';
let studentGrade = localStorage.getItem('p2p_grade') || sessionStorage.getItem('p2p_grade') || '';

// 🧭 Navigation state
let currentView = 'studentId';
let selectedGradeId = null;
let selectedGradeName = null;
let selectedSubjectId = null;
let selectedSubjectName = null;
let selectedTopicId = null;

// 📝 Quiz state
let currentQuestions = [];
let currentQuestionIndex = 0;
let selectedAnswer = null;
let quizStats = { correct: 0, attempted: 0, points: 0 };

// 🔍 Search state
let currentSearchQuery = '';

// ============================================
// 🚀 INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Global error handler
    window.addEventListener('error', (e) => {
        console.error('🚨 Global error:', e.message, 'at', e.filename + ':' + e.lineno);
    });

    // Auto-login if student exists in storage
    if (studentNumber) {
        verifyStudentAndLoad();
    } else {
        showView('studentIdView');
        currentView = 'studentId';
        hideAllSearchBars();
    }

    // Setup search listeners
    setupSearchListeners();

    // Setup fullscreen modal close
    const modal = document.getElementById('fullscreenModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('fullscreen-close')) {
                closeFullscreen();
            }
        });
    }
});

// ============================================
// 👤 STUDENT REGISTRATION
// ============================================
async function registerStudent(event) {
    if (event) event.preventDefault();

    const firstName = document.getElementById('firstNameInput')?.value.trim() || '';
    const lastName = document.getElementById('lastNameInput')?.value.trim() || '';
    const email = document.getElementById('emailInput')?.value.trim() || '';
    const grade = document.getElementById('gradeInput')?.value.trim() || '';
    const schoolName = document.getElementById('schoolInput')?.value.trim() || '';

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

            // ✅ Save to BOTH localStorage (persistent) and sessionStorage (tab navigation)
            saveStudentToStorage();

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

// Save student to both storage types
function saveStudentToStorage() {
    localStorage.setItem('p2p_student_number', studentNumber);
    localStorage.setItem('p2p_name', studentName);
    localStorage.setItem('p2p_email', studentEmail);
    localStorage.setItem('p2p_grade', studentGrade);

    sessionStorage.setItem('p2p_student_number', studentNumber);
    sessionStorage.setItem('p2p_name', studentName);
    sessionStorage.setItem('p2p_email', studentEmail);
    sessionStorage.setItem('p2p_grade', studentGrade);
}

// ============================================
// ✅ VERIFY STUDENT & LOAD
// ============================================
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
            saveStudentToStorage();
            loadGrades();
        } else {
            clearStudentStorage();
            showView('studentIdView');
            currentView = 'studentId';
            hideAllSearchBars();
        }
    } catch (e) {
        console.error("Verify error:", e);
        // Still try to load grades in case of network glitch
        loadGrades();
    }
}

// Clear all student storage
function clearStudentStorage() {
    localStorage.removeItem('p2p_student_number');
    localStorage.removeItem('p2p_name');
    localStorage.removeItem('p2p_email');
    localStorage.removeItem('p2p_grade');
    sessionStorage.clear();
    studentNumber = '';
    studentName = '';
    studentEmail = '';
    studentGrade = '';
}

// ============================================
// 📚 LOAD GRADES
// ============================================
async function loadGrades(searchQuery = '') {
    showView('gradesView');
    currentView = 'grades';
    currentSearchQuery = searchQuery;

    const searchBar = document.getElementById('searchBar');
    if (searchBar) {
        searchBar.classList.remove('hidden');
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = searchQuery;
    }

    const container = document.getElementById('gradesList');
    if (!container) return;
    container.innerHTML = '<div style="padding:40px; text-align:center; color:#666;">Loading grades...</div>';

    try {
        let url = `${API_BASE}/api/grades`;
        if (searchQuery) url += `?search=${encodeURIComponent(searchQuery)}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.success && data.grades && data.grades.length > 0) {
            container.innerHTML = data.grades.map(g => `
        <div class="selection-item grade-card" data-grade-id="${g.id}" data-grade-name="${escapeHtml(g.grade_name)}">
          <h4>${escapeHtml(g.grade_name)}</h4>
          <p>Practice questions</p>
        </div>
      `).join('');

            // Event delegation for grade clicks
            container.onclick = (e) => {
                const card = e.target.closest('.grade-card');
                if (card) {
                    const gradeId = card.dataset.gradeId;
                    const gradeName = card.dataset.gradeName;
                    selectGrade(gradeId, gradeName);
                }
            };
        } else {
            container.innerHTML = '<div style="padding:40px; text-align:center; color:#666;">No grades found</div>';
        }
    } catch (e) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:red;">Error loading grades</div>';
        console.error("Load grades error:", e);
    }
}

// ============================================
// 🎯 SELECT GRADE
// ============================================
function selectGrade(gradeId, gradeName) {
    selectedGradeId = gradeId;
    selectedGradeName = gradeName;
    selectedSubjectId = null;
    selectedSubjectName = null;
    selectedTopicId = null;

    showView('subjectsView');
    currentView = 'subjects';
    currentSearchQuery = '';

    loadSubjects(gradeId);
}

// ============================================
// 📖 LOAD SUBJECTS
// ============================================
async function loadSubjects(gradeId, searchQuery = '') {
    const container = document.getElementById('subjectsList');
    if (!container) return;
    container.innerHTML = '<div style="padding:40px; text-align:center; color:#666;">Loading subjects...</div>';

    currentSearchQuery = searchQuery;

    const searchBar = document.getElementById('searchBarSub');
    if (searchBar) {
        searchBar.classList.remove('hidden');
        const searchInput = document.getElementById('searchInputSub');
        if (searchInput) searchInput.value = searchQuery;
    }

    try {
        let url = `${API_BASE}/api/subjects?grade_id=${gradeId}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.success && data.subjects && data.subjects.length > 0) {
            container.innerHTML = data.subjects.map(s => `
        <div class="selection-item subject-card" data-subject-id="${s.id}" data-subject-name="${escapeHtml(s.subject_name)}">
          <h4>${escapeHtml(s.subject_name)}</h4>
          <p>${s.description ? escapeHtml(s.description.substring(0, 60)) : 'Practice questions'}${s.description && s.description.length > 60 ? '...' : ''}</p>
        </div>
      `).join('');

            // Event delegation for subject clicks
            container.onclick = (e) => {
                const card = e.target.closest('.subject-card');
                if (card) {
                    const subjectId = card.dataset.subjectId;
                    const subjectName = card.dataset.subjectName;
                    selectSubject(subjectId, subjectName);
                }
            };
        } else {
            container.innerHTML = '<div style="padding:40px; text-align:center; color:#666;">No subjects found</div>';
        }
    } catch (e) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:red;">Error loading subjects</div>';
        console.error("Load subjects error:", e);
    }
}

// ============================================
// 🎯 SELECT SUBJECT
// ============================================
function selectSubject(subjectId, subjectName) {
    selectedSubjectId = subjectId;
    selectedSubjectName = subjectName;
    selectedTopicId = null;

    showView('topicsView');
    currentView = 'topics';
    currentSearchQuery = '';

    loadTopics(subjectId);
}

// ============================================
// 📚 LOAD TOPICS - ✅ FIXED: Proper encoding for media data
// ============================================
async function loadTopics(subjectId, searchQuery = '') {
    const container = document.getElementById('topicsList');
    if (!container) return;
    container.innerHTML = '<div style="padding:40px; text-align:center; color:#666;">Loading topics...</div>';

    // Hide intro/media sections initially
    const topicIntro = document.getElementById('topicIntro');
    const topicMediaSection = document.getElementById('topicMediaSection');
    if (topicIntro) topicIntro.classList.add('hidden');
    if (topicMediaSection) topicMediaSection.classList.add('hidden');

    currentSearchQuery = searchQuery;

    const searchBar = document.getElementById('searchBarTop');
    if (searchBar) {
        searchBar.classList.remove('hidden');
        const searchInput = document.getElementById('searchInputTop');
        if (searchInput) searchInput.value = searchQuery;
    }

    try {
        let url = `${API_BASE}/api/topics?subject_id=${subjectId}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.success && data.topics && data.topics.length > 0) {
            container.innerHTML = data.topics.map(t => {
                const mediaCount = t.media ? t.media.length : 0;

                // ✅ FIX: Use encodeURIComponent for JSON in data attributes
                const safeIntro = encodeURIComponent(t.intro || '');
                const safeName = encodeURIComponent(t.topic_name || '');
                const safeMedia = encodeURIComponent(JSON.stringify(t.media || []));

                return `
          <div class="selection-item topic-card"
               data-topic-id="${t.id}"
               data-topic-name="${safeName}"
               data-topic-intro="${safeIntro}"
               data-topic-media="${safeMedia}">
            <h4>${escapeHtml(t.topic_name)}</h4>
            <p>${escapeHtml(t.description ? t.description.substring(0, 70) : 'Start practicing')}${t.description && t.description.length > 70 ? '...' : ''}</p>
            ${mediaCount > 0 ? `<small style="color:#32cd32; display:block; margin-top:8px;">🎬 ${mediaCount} resource${mediaCount > 1 ? 's' : ''}</small>` : ''}
          </div>
        `;
            }).join('');

            // ✅ Event delegation for topic clicks - with proper decoding
            container.onclick = (e) => {
                const card = e.target.closest('.topic-card');
                if (card) {
                    const topicId = card.dataset.topicId;
                    const topicName = decodeURIComponent(card.dataset.topicName || '');
                    const topicIntro = decodeURIComponent(card.dataset.topicIntro || '');

                    let topicMedia = [];
                    try {
                        topicMedia = JSON.parse(decodeURIComponent(card.dataset.topicMedia || '[]'));
                    } catch (err) {
                        console.error("Error parsing media:", err);
                        topicMedia = [];
                    }

                    startQuiz(topicId, topicName, topicIntro, topicMedia);
                }
            };

        } else {
            container.innerHTML = '<div style="padding:40px; text-align:center; color:#666;">No topics found</div>';
        }
    } catch (e) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:red;">Error loading topics</div>';
        console.error("Load topics error:", e);
    }
}

// ============================================
// 🎮 START QUIZ - ✅ Handles null intro/media gracefully
// ============================================
async function startQuiz(topicId, topicName, topicIntro, topicMedia) {
    selectedTopicId = topicId;
    showView('quizView');
    currentView = 'quiz';

    // Hide all search bars in quiz view
    hideAllSearchBars();

    // Display topic intro if available
    const introEl = document.getElementById('topicIntro');
    if (introEl) {
        if (topicIntro && topicIntro.trim()) {
            introEl.textContent = topicIntro;
            introEl.classList.remove('hidden');
        } else {
            introEl.classList.add('hidden');
        }
    }

    // Display media section if available
    const mediaSection = document.getElementById('topicMediaSection');
    const mediaGrid = document.getElementById('topicMediaGrid');

    if (mediaGrid && topicMedia && topicMedia.length > 0) {
        mediaGrid.innerHTML = topicMedia.map(m => {
            const safeCaption = escapeHtml(m.caption || '');
            const safeUrl = escapeHtml(m.media_url || '');

            if (m.media_type === 'youtube') {
                const videoId = extractYouTubeId(m.media_url);
                if (videoId) {
                    return `
            <div class="media-card" data-type="youtube" data-src="${videoId}" data-caption="${safeCaption}" role="button" tabindex="0">
              <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen title="${safeCaption}" loading="lazy"></iframe>
              <div class="play-icon">▶</div>
              ${m.caption ? `<div class="media-overlay">${safeCaption}</div>` : ''}
            </div>
          `;
                }
            } else if (m.media_type === 'image') {
                return `
          <div class="media-card" data-type="image" data-src="${safeUrl}" data-caption="${safeCaption}" role="button" tabindex="0">
            <img src="${safeUrl}" alt="${safeCaption}" onerror="this.parentElement.style.display='none'" loading="lazy">
            ${m.caption ? `<div class="media-overlay">${safeCaption}</div>` : ''}
          </div>
        `;
            }
            return '';
        }).join('');

        // Add click handlers to media cards
        document.querySelectorAll('.media-card').forEach(card => {
            card.onclick = () => {
                const type = card.dataset.type;
                const src = card.dataset.src;
                const caption = card.dataset.caption;
                openFullscreen(type, src, caption);
            };
            // Keyboard accessibility
            card.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    card.click();
                }
            };
        });

        if (mediaSection) mediaSection.classList.remove('hidden');
    } else {
        if (mediaSection) mediaSection.classList.add('hidden');
    }

    // Load questions for this topic
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

// ============================================
// ❓ SHOW QUESTION
// ============================================
function showQuestion() {
    const q = currentQuestions[currentQuestionIndex];
    if (!q) return;

    document.getElementById('questionCounter').textContent = `Question ${currentQuestionIndex + 1} of ${currentQuestions.length}`;
    document.getElementById('questionText').textContent = q.question_text;

    const answerList = document.getElementById('answerList');
    answerList.innerHTML = '';
    selectedAnswer = null;

    // Multiple choice / True-False
    if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
        if (q.answers && q.answers.length > 0) {
            q.answers.forEach((ans) => {
                const option = document.createElement('div');
                option.className = 'answer-option';
                option.innerHTML = `
          <input type="radio" name="answer" id="ans${ans.id}" value="${ans.id}" style="width:18px; height:18px;">
          <label for="ans${ans.id}" style="flex:1; cursor:pointer;">${escapeHtml(ans.answer_text)}</label>
        `;
                option.onclick = () => selectAnswer(ans.id, option);
                answerList.appendChild(option);
            });
        }
    }
    // Short answer
    else if (q.question_type === 'short_answer') {
        answerList.innerHTML = `
      <textarea id="shortAnswerInput" placeholder="Type your answer..." style="width:100%; min-height:80px; padding:12px; border:2px solid #e1e5eb; border-radius:10px; font-size:1rem;"></textarea>
    `;
    }

    // Reset UI elements
    const hintBox = document.getElementById('hintBox');
    const explanationBox = document.getElementById('explanationBox');
    const hintBtn = document.getElementById('hintBtn');
    const submitBtn = document.getElementById('submitBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (hintBox) hintBox.classList.add('hidden');
    if (explanationBox) explanationBox.classList.add('hidden');
    if (hintBtn) hintBtn.style.display = q.hints ? 'inline-block' : 'none';
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('hidden');
        submitBtn.textContent = "Submit Answer";
    }
    if (nextBtn) nextBtn.classList.add('hidden');
}

// ============================================
// ✅ SELECT ANSWER
// ============================================
function selectAnswer(answerId, element) {
    document.querySelectorAll('.answer-option').forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
    selectedAnswer = answerId;
}

// ============================================
// 💡 SHOW HINT
// ============================================
function showHint() {
    const q = currentQuestions[currentQuestionIndex];
    if (q && q.hints) {
        const hintBox = document.getElementById('hintBox');
        const hintBtn = document.getElementById('hintBtn');
        if (hintBox) {
            hintBox.textContent = '💡 ' + q.hints;
            hintBox.classList.remove('hidden');
        }
        if (hintBtn) hintBtn.style.display = 'none';
    }
}

// ============================================
// 📤 SUBMIT ANSWER
// ============================================
async function submitAnswer() {
    const q = currentQuestions[currentQuestionIndex];
    if (!q) return;

    let answerId = selectedAnswer;
    let answerText = null;

    if (q.question_type === 'short_answer') {
        const input = document.getElementById('shortAnswerInput');
        answerText = input ? input.value.trim() : null;
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
                quizStats.points += result.points_earned || 0;
            }

            // Visual feedback for answers
            const answerOptions = document.querySelectorAll('.answer-option');
            answerOptions.forEach(opt => {
                const input = opt.querySelector('input');
                if (input) {
                    const optId = parseInt(input.value);
                    if (q.answers) {
                        const correctAnswer = q.answers.find(a => a.is_correct && a.id === optId);
                        if (correctAnswer) opt.classList.add('correct');
                        else if (optId === selectedAnswer && !result.is_correct) opt.classList.add('incorrect');
                    }
                }
            });

            // Show explanation if available
            const explanationBox = document.getElementById('explanationBox');
            if (result.explanation && explanationBox) {
                explanationBox.textContent = '✅ ' + result.explanation;
                explanationBox.classList.remove('hidden');
            }

            // Show next button, hide submit
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

// ============================================
// ➡️ NEXT QUESTION
// ============================================
function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuestions.length) {
        showQuestion();
    } else {
        showResults();
    }
}

// ============================================
// 🏆 SHOW RESULTS
// ============================================
function showResults() {
    showView('resultsView');
    currentView = 'results';
    hideAllSearchBars();

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

// ============================================
// 🔙 NAVIGATION - All back buttons working
// ============================================
function goBack(view) {
    if (view === 'grades') {
        // Reset all selections
        selectedGradeId = null;
        selectedGradeName = null;
        selectedSubjectId = null;
        selectedSubjectName = null;
        selectedTopicId = null;
        loadGrades();
    }
    else if (view === 'subjects') {
        if (selectedGradeId) {
            selectedSubjectId = null;
            selectedSubjectName = null;
            selectedTopicId = null;
            loadSubjects(selectedGradeId);
        } else {
            loadGrades();
        }
    }
    else if (view === 'topics') {
        if (selectedSubjectId) {
            selectedTopicId = null;
            loadTopics(selectedSubjectId);
        } else if (selectedGradeId) {
            loadSubjects(selectedGradeId);
        } else {
            loadGrades();
        }
    }
    else if (view === 'quiz') {
        if (selectedTopicId) {
            loadTopics(selectedSubjectId);
        } else if (selectedSubjectId) {
            loadSubjects(selectedGradeId);
        } else if (selectedGradeId) {
            loadGrades();
        }
    }
}

// Restart practice from current level
function restartPractice() {
    selectedTopicId = null;
    if (selectedSubjectId) {
        loadTopics(selectedSubjectId);
    } else if (selectedGradeId) {
        loadSubjects(selectedGradeId);
    } else {
        loadGrades();
    }
}

// ============================================
// 🔍 SEARCH FUNCTIONALITY
// ============================================
function setupSearchListeners() {
    // Grades search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch('grades');
        });
    }

    // Subjects search
    const searchInputSub = document.getElementById('searchInputSub');
    if (searchInputSub) {
        searchInputSub.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch('subjects');
        });
    }

    // Topics search
    const searchInputTop = document.getElementById('searchInputTop');
    if (searchInputTop) {
        searchInputTop.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch('topics');
        });
    }
}

function performSearch(view) {
    let query = '';

    if (view === 'grades' || currentView === 'grades') {
        query = document.getElementById('searchInput')?.value.trim() || '';
        loadGrades(query);
    }
    else if (view === 'subjects' || currentView === 'subjects') {
        query = document.getElementById('searchInputSub')?.value.trim() || '';
        if (selectedGradeId) loadSubjects(selectedGradeId, query);
    }
    else if (view === 'topics' || currentView === 'topics') {
        query = document.getElementById('searchInputTop')?.value.trim() || '';
        if (selectedSubjectId) loadTopics(selectedSubjectId, query);
    }
}

// Hide all search bars
function hideAllSearchBars() {
    ['searchBar', 'searchBarSub', 'searchBarTop'].forEach(barId => {
        const bar = document.getElementById(barId);
        if (bar) bar.classList.add('hidden');
    });
}

// ============================================
// 🖼️ FULLSCREEN MODAL
// ============================================
function openFullscreen(type, src, caption) {
    const modal = document.getElementById('fullscreenModal');
    const content = document.getElementById('fullscreenContent');

    if (!modal || !content) return;

    if (type === 'youtube') {
        content.innerHTML = `<iframe src="https://www.youtube.com/embed/${src}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="width:90vw; height:80vh; border-radius:8px;"></iframe>`;
    } else if (type === 'image') {
        content.innerHTML = `<img src="${escapeHtml(src)}" alt="${escapeHtml(caption)}" style="max-width:100%; max-height:90vh; border-radius:8px;">`;
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeFullscreen() {
    const modal = document.getElementById('fullscreenModal');
    const content = document.getElementById('fullscreenContent');

    if (modal) modal.classList.remove('active');
    if (content) content.innerHTML = '';
    document.body.style.overflow = 'auto';
}

// ============================================
// 🔐 LOGOUT
// ============================================
function handleLogout() {
    clearStudentStorage();
    window.location.href = 'login.html';
}

// ============================================
// 🎨 VIEW MANAGEMENT
// ============================================
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

// ============================================
// 🔧 UTILITIES
// ============================================
function extractYouTubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]{11}).*/;
    const match = url.match(regExp);
    return (match && match[2]?.length === 11) ? match[2] : null;
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Export for testing (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { escapeHtml, extractYouTubeId };
}
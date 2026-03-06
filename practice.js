// ============================================
// PEER-2-PEER PRO: STUDENT PRACTICE QUESTIONS
// Endpoint: https://learneranswer.buhle-1ce.workers.dev
// ============================================

const API_BASE = "https://learneranswer.buhle-1ce.workers.dev";
let studentEmail = sessionStorage.getItem('p2p_email') || '';

// Quiz state
let currentQuestions = [];
let currentQuestionIndex = 0;
let selectedAnswer = null;
let selectedEssayText = '';
let selectedMatching = {};
let quizStats = { correct: 0, attempted: 0, points: 0 };
let currentTopicId = null;
let currentQuestionType = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!studentEmail) {
        window.location.href = 'login.html';
        return;
    }
    loadGrades();
});

// 📚 Load Grades
async function loadGrades() {
    showView('gradesView');
    updateBreadcrumb('Select Grade');

    const container = document.getElementById('gradesList');
    container.innerHTML = '<div class="loading">Loading grades...</div>';

    try {
        const res = await fetch(`${API_BASE}/api/grades`);
        const data = await res.json();

        if (data.success && data.grades.length > 0) {
            container.innerHTML = data.grades.map(g => `
        <div class="selection-card" onclick="loadSubjects(${g.id}, '${g.grade_name}')">
          <div class="icon">📚</div>
          <h4>${g.grade_name}</h4>
          <p>Practice questions</p>
        </div>
      `).join('');
        } else {
            container.innerHTML = '<div class="empty-state"><span class="icon">📭</span><p>No grades available yet</p></div>';
        }
    } catch (e) {
        container.innerHTML = '<div class="empty-state"><span class="icon">⚠️</span><p>Error loading grades. Please refresh.</p></div>';
        console.error("Load grades error:", e);
    }
}

// 📖 Load Subjects by Grade
async function loadSubjects(gradeId, gradeName) {
    showView('subjectsView');
    updateBreadcrumb(gradeName, 'subject');

    const container = document.getElementById('subjectsList');
    container.innerHTML = '<div class="loading">Loading subjects...</div>';

    try {
        const res = await fetch(`${API_BASE}/api/subjects?grade_id=${gradeId}`);
        const data = await res.json();

        if (data.success && data.subjects.length > 0) {
            container.innerHTML = data.subjects.map(s => `
        <div class="selection-card" onclick="loadTopics(${s.id}, '${s.subject_name}', ${gradeId})">
          <div class="icon">📖</div>
          <h4>${s.subject_name}</h4>
          <p>${s.description?.substring(0, 40) || 'Practice questions'}${s.description?.length > 40 ? '...' : ''}</p>
        </div>
      `).join('');
        } else {
            container.innerHTML = '<div class="empty-state"><span class="icon">📭</span><p>No subjects found for this grade</p></div>';
        }
    } catch (e) {
        container.innerHTML = '<div class="empty-state"><span class="icon">⚠️</span><p>Error loading subjects</p></div>';
        console.error("Load subjects error:", e);
    }
}

// 🎯 Load Topics by Subject
async function loadTopics(subjectId, subjectName, gradeId) {
    showView('topicsView');
    updateBreadcrumb(subjectName, 'topic');

    const container = document.getElementById('topicsList');
    container.innerHTML = '<div class="loading">Loading topics...</div>';
    document.getElementById('topicIntro').classList.add('hidden');
    document.getElementById('topicMedia').innerHTML = '';

    try {
        const res = await fetch(`${API_BASE}/api/topics?subject_id=${subjectId}`);
        const data = await res.json();

        if (data.success && data.topics.length > 0) {
            container.innerHTML = data.topics.map(t => {
                const mediaCount = t.media?.length || 0;
                return `
        <div class="selection-card" onclick="startQuiz(${t.id}, '${t.topic_name}', '${t.intro || ''}', ${JSON.stringify(t.media || [])})">
          <div class="icon">🎯</div>
          <h4>${t.topic_name}</h4>
          <p>${t.description?.substring(0, 50) || 'Start practicing'}${t.description?.length > 50 ? '...' : ''}</p>
          ${mediaCount > 0 ? `<small style="color:#32cd32; display:block; margin-top:5px;">🎬 ${mediaCount} media item(s)</small>` : ''}
        </div>
      `;
            }).join('');
        } else {
            container.innerHTML = '<div class="empty-state"><span class="icon">📭</span><p>No topics found for this subject</p></div>';
        }
    } catch (e) {
        container.innerHTML = '<div class="empty-state"><span class="icon">⚠️</span><p>Error loading topics</p></div>';
        console.error("Load topics error:", e);
    }
}

// ❓ Start Quiz with Questions
async function startQuiz(topicId, topicName, topicIntro, topicMedia) {
    currentTopicId = topicId;
    showView('quizView');
    updateBreadcrumb(topicName, 'quiz');

    // Show topic intro if available
    const introBox = document.getElementById('topicIntro');
    if (topicIntro) {
        introBox.textContent = `💡 ${topicIntro}`;
        introBox.classList.remove('hidden');
    } else {
        introBox.classList.add('hidden');
    }

    // Show topic media (YouTube videos & images)
    const mediaContainer = document.getElementById('topicMedia');
    if (topicMedia && topicMedia.length > 0) {
        mediaContainer.innerHTML = topicMedia.map(m => {
            if (m.media_type === 'youtube') {
                const videoId = extractYouTubeId(m.media_url);
                return `
          <div class="media-item">
            <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>
            ${m.caption ? `<div class="media-caption">${m.caption}</div>` : ''}
          </div>
        `;
            } else if (m.media_type === 'image') {
                return `
          <div class="media-item">
            <img src="${m.media_url}" alt="${m.caption || 'Topic image'}" onerror="this.parentElement.style.display='none'">
            ${m.caption ? `<div class="media-caption">${m.caption}</div>` : ''}
          </div>
        `;
            }
            return '';
        }).join('');
    } else {
        mediaContainer.innerHTML = '';
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
            document.getElementById('quizView').innerHTML = `
        <div class="empty-state">
          <span class="icon">📭</span>
          <p>No questions available for this topic yet.</p>
          <button class="btn-secondary" onclick="goToTopics()" style="margin-top:15px;">← Choose Another Topic</button>
        </div>
      `;
        }
    } catch (e) {
        console.error("Load questions error:", e);
        alert("Error loading questions. Please try again.");
        goToTopics();
    }
}

// Extract YouTube video ID from URL
function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Display Current Question
function showQuestion() {
    const q = currentQuestions[currentQuestionIndex];
    if (!q) return;

    currentQuestionType = q.question_type;

    // Update counter & meta
    document.getElementById('questionCounter').textContent =
        `Question ${currentQuestionIndex + 1} of ${currentQuestions.length}`;
    document.getElementById('questionMeta').textContent =
        `${formatQuestionType(q.question_type)} • ${q.difficulty} • ${q.points} point${q.points > 1 ? 's' : ''}`;

    // Set question text
    document.getElementById('questionText').textContent = q.question_text;

    // Show/hide comprehension passage
    const passageBox = document.getElementById('comprehensionPassage');
    if (q.question_type === 'comprehension' && q.comprehension_passage) {
        document.getElementById('passageTitle').textContent = q.comprehension_passage.passage_title || 'Reading Passage';
        document.getElementById('passageText').textContent = q.comprehension_passage.passage_text;
        document.getElementById('passageSource').textContent = q.comprehension_passage.passage_source || '';
        passageBox.classList.remove('hidden');
    } else {
        passageBox.classList.add('hidden');
    }

    // Generate answer UI based on question type
    const answerContainer = document.getElementById('answerContainer');
    answerContainer.innerHTML = '';

    if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
        q.answers.forEach((ans, idx) => {
            const option = document.createElement('div');
            option.className = 'answer-option';
            option.innerHTML = `
        <input type="radio" name="answer" id="ans${ans.id}" value="${ans.id}">
        <label for="ans${ans.id}">${ans.answer_text}</label>
      `;
            option.onclick = () => selectAnswer(ans.id, option);
            answerContainer.appendChild(option);
        });
    } else if (q.question_type === 'short_answer') {
        answerContainer.innerHTML = `
      <textarea class="short-answer-input" id="shortAnswerInput" placeholder="Type your answer here..."></textarea>
    `;
    } else if (q.question_type === 'essay') {
        // Show essay rubric
        let rubricHTML = '<div class="essay-rubric"><h4>📝 Marking Rubric (Check your answer against these points):</h4>';
        (q.essay_points || []).forEach((pt, idx) => {
            rubricHTML += `
        <div class="rubric-item">
          <span>${idx + 1}. ${pt.point_text}</span>
          <span class="marks">${pt.point_marks} mark${pt.point_marks > 1 ? 's' : ''} ${pt.is_required ? '• Required' : ''}</span>
        </div>
      `;
        });
        rubricHTML += '</div>';

        answerContainer.innerHTML = `
      ${rubricHTML}
      <textarea class="essay-textarea" id="essayInput" placeholder="Write your essay answer here..."></textarea>
      <small style="color:#666; display:block; margin-bottom:15px;">
        💡 Tip: Include as many rubric points as possible. Your answer will be saved for tutor review.
      </small>
    `;
    } else if (q.question_type === 'matching') {
        // Split pairs into two columns, shuffle column B
        const pairs = q.matching_pairs || [];
        const columnA = [...pairs].sort((a, b) => a.pair_order - b.pair_order);
        const columnB = [...pairs].sort(() => Math.random() - 0.5);

        let matchingHTML = '<div class="matching-container">';
        matchingHTML += `<div class="matching-column"><h4>Column A</h4>`;
        columnA.forEach(item => {
            matchingHTML += `<div class="matching-item" id="colA-${item.id}">${item.column_a}</div>`;
        });
        matchingHTML += `</div><div class="matching-column"><h4>Column B (Select match)</h4>`;
        columnA.forEach(item => {
            matchingHTML += `
        <div style="margin-bottom:10px;">
          <strong>${item.column_a}</strong>
          <select class="matching-pair-select" data-ida="${item.id}">
            <option value="">Select match...</option>
            ${columnB.map(b => `<option value="${b.id}">${b.column_b}</option>`).join('')}
          </select>
        </div>
      `;
        });
        matchingHTML += `</div></div>`;
        answerContainer.innerHTML = matchingHTML;

        // Add event listeners for matching
        document.querySelectorAll('.matching-pair-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const idA = e.target.dataset.ida;
                const idB = e.target.value;
                selectedMatching[idA] = idB || null;
            });
        });
    }

    // Reset UI state
    selectedAnswer = null;
    selectedEssayText = '';
    selectedMatching = {};
    document.getElementById('hintBox').classList.remove('show');
    document.getElementById('explanationBox').classList.remove('show');
    document.getElementById('hintBtn').style.display = q.hints ? 'inline-block' : 'none';
    document.getElementById('submitBtn').disabled = false;
    document.getElementById('submitBtn').style.display = 'inline-block';
    document.getElementById('nextBtn').classList.remove('show');
}

// Format question type for display
function formatQuestionType(type) {
    const map = {
        'multiple_choice': 'Multiple Choice',
        'true_false': 'True/False',
        'short_answer': 'Short Answer',
        'essay': 'Essay',
        'matching': 'Matching',
        'comprehension': 'Comprehension'
    };
    return map[type] || type;
}

// Select Answer Option (MCQ/TF)
function selectAnswer(answerId, element) {
    document.querySelectorAll('.answer-option').forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
    selectedAnswer = answerId;
}

// Show Hint
function showHint() {
    const q = currentQuestions[currentQuestionIndex];
    if (q.hints) {
        document.getElementById('hintBox').textContent = `💡 ${q.hints}`;
        document.getElementById('hintBox').classList.add('show');
        document.getElementById('hintBtn').style.display = 'none';
    }
}

// Submit Answer
async function submitAnswer() {
    const q = currentQuestions[currentQuestionIndex];
    if (!q) return;

    let answerId = selectedAnswer;
    let answerText = null;
    let time_taken = null;

    // Handle different question types
    if (q.question_type === 'short_answer') {
        const input = document.getElementById('shortAnswerInput');
        answerText = input?.value.trim();
        if (!answerText) { alert("Please enter an answer"); return; }
    } else if (q.question_type === 'essay') {
        const input = document.getElementById('essayInput');
        selectedEssayText = input?.value.trim();
        if (!selectedEssayText) { alert("Please write your essay answer"); return; }
        answerText = selectedEssayText;
        // Essay questions are self-assessed
    } else if (q.question_type === 'matching') {
        // For matching, send the selected pairs
        answerText = JSON.stringify(selectedMatching);
        if (Object.keys(selectedMatching).length === 0) { alert("Please match all items"); return; }
    } else if ((q.question_type === 'multiple_choice' || q.question_type === 'true_false') && !answerId) {
        alert("Please select an answer");
        return;
    }

    // Disable submit button
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('submitBtn').textContent = "Checking...";

    const startTime = Date.now();

    try {
        const res = await fetch(`${API_BASE}/api/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_email: studentEmail,
                question_id: q.id,
                selected_answer_id: answerId,
                answer_text: answerText,
                time_taken: Math.round((Date.now() - startTime) / 1000),
                question_type: q.question_type
            })
        });

        const result = await res.json();

        if (result.success) {
            // Update stats
            quizStats.attempted++;
            if (result.is_correct) {
                quizStats.correct++;
                quizStats.points += result.points_earned;
            }

            // Show feedback
            showAnswerFeedback(result.is_correct, result.is_self_assessed, result.explanation, q);

            // Show next button
            document.getElementById('nextBtn').classList.add('show');
            document.getElementById('submitBtn').style.display = 'none';
        } else {
            alert("Error submitting answer: " + result.error);
            document.getElementById('submitBtn').disabled = false;
            document.getElementById('submitBtn').textContent = "Submit Answer";
        }
    } catch (e) {
        console.error("Submit answer error:", e);
        alert("Connection error. Please try again.");
        document.getElementById('submitBtn').disabled = false;
        document.getElementById('submitBtn').textContent = "Submit Answer";
    }
}

// Show Answer Feedback
function showAnswerFeedback(isCorrect, isSelfAssessed, explanation, question) {
    const options = document.querySelectorAll('.answer-option');

    // For multiple choice: highlight correct/incorrect
    if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
        options.forEach(opt => {
            const input = opt.querySelector('input');
            const answerId = parseInt(input.value);
            const correctAnswer = question.answers.find(a => a.is_correct && a.id === answerId);
            const selectedAnswerId = parseInt(selectedAnswer);

            if (correctAnswer) {
                opt.classList.add('correct');
            }
            if (answerId === selectedAnswerId && !isCorrect) {
                opt.classList.add('incorrect');
            }
        });
    }

    // Show explanation or self-assessment note
    const explanationBox = document.getElementById('explanationBox');
    if (isSelfAssessed) {
        explanationBox.innerHTML = `📝 <strong>Self-Assessment:</strong> Review your answer against the rubric above. 
      Your response has been saved for tutor feedback.`;
        explanationBox.classList.add('show');
    } else if (explanation) {
        explanationBox.textContent = `✅ ${explanation}`;
        explanationBox.classList.add('show');
    }
}

// Next Question or Show Results
function nextQuestion() {
    currentQuestionIndex++;

    if (currentQuestionIndex < currentQuestions.length) {
        showQuestion();
    } else {
        showResults();
    }
}

// Show Results Summary
function showResults() {
    showView('resultsView');
    updateBreadcrumb('Results', 'results');

    const total = currentQuestions.length;
    const correct = quizStats.correct;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

    document.getElementById('finalScore').textContent = `${correct}/${total}`;
    document.getElementById('statCorrect').textContent = correct;
    document.getElementById('statAttempted').textContent = quizStats.attempted;
    document.getElementById('statPoints').textContent = quizStats.points;

    // Personalized message
    let message = "Great effort!";
    if (percentage >= 80) message = "🌟 Outstanding! You're a pro!";
    else if (percentage >= 60) message = "👍 Good job! Keep practicing!";
    else if (percentage >= 40) message = "💪 You're getting there! Review and try again.";
    else message = "📚 Don't give up! Practice makes perfect.";

    document.getElementById('resultsMessage').textContent = `${message} (${percentage}%)`;
}

// Restart Practice
function restartPractice() {
    goToTopics();
}

// Navigation Helpers
function goToGrades() {
    showView('gradesView');
    updateBreadcrumb('Select Grade');
    loadGrades();
}
function goToSubjects() {
    showView('subjectsView');
    updateBreadcrumb('Select Subject', 'subject');
}
function goToTopics() {
    showView('topicsView');
    updateBreadcrumb('Select Topic', 'topic');
}

// Update Breadcrumb
function updateBreadcrumb(current, type = 'grade') {
    document.getElementById('crumbCurrent').textContent = current;
    document.getElementById('crumbSubject').classList.toggle('hidden', type !== 'topic' && type !== 'quiz' && type !== 'results');
    document.getElementById('crumbTopic').classList.toggle('hidden', type !== 'quiz' && type !== 'results');
}

// Show/Hide Views
function showView(viewId) {
    ['gradesView', 'subjectsView', 'topicsView', 'quizView', 'resultsView'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(viewId).classList.remove('hidden');
}

// Logout
function handleLogout() {
    sessionStorage.clear();
    window.location.href = 'login.html';
}
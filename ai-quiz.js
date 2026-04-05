// ============================================================
// ai-quiz.js — Fixed: full CAPS subjects, robust API handling
// ============================================================

const API_BASE = 'https://damp-art-617fp2p-authentification-login.buhle-1ce.workers.dev';

// ── Full CAPS subject list keyed by phase ──────────────────
const CAPS_SUBJECTS = {
    foundation: { // Grades R-3
        grades: ['R', '1', '2', '3'],
        subjects: ['Home Language', 'First Additional Language', 'Mathematics', 'Life Skills']
    },
    intermediate: { // Grades 4-6
        grades: ['4', '5', '6'],
        subjects: ['Home Language', 'First Additional Language', 'Mathematics', 'Natural Sciences & Technology', 'Social Sciences', 'Life Skills', 'Economic Management Sciences', 'Creative Arts']
    },
    senior: { // Grades 7-9
        grades: ['7', '8', '9'],
        subjects: ['Home Language', 'First Additional Language', 'Second Additional Language', 'Mathematics', 'Mathematical Literacy', 'Natural Sciences', 'Social Sciences', 'Technology', 'Economic Management Sciences', 'Life Orientation', 'Creative Arts']
    },
    fet: { // Grades 10-12
        grades: ['10', '11', '12'],
        subjects: ['Home Language', 'First Additional Language', 'Second Additional Language', 'Mathematics', 'Mathematical Literacy', 'Life Orientation', 'Physical Sciences', 'Life Sciences', 'Geography', 'History', 'Business Studies', 'Economics', 'Accounting', 'Consumer Studies', 'Tourism', 'Civil Technology', 'Electrical Technology', 'Mechanical Technology', 'Engineering Graphics & Design', 'Information Technology', 'Computer Applications Technology', 'Agricultural Sciences', 'Agricultural Management Practices', 'Agricultural Technology', 'Drama & Theatre Arts', 'Dance Studies', 'Design', 'Music', 'Visual Arts', 'Religion Studies', 'Hospitality Studies']
    }
};

function getSubjectsForGrade(grade) {
    for (const phase of Object.values(CAPS_SUBJECTS)) {
        if (phase.grades.includes(grade)) return phase.subjects;
    }
    return [];
}

// ── App State ──────────────────────────────────────────────
const AppState = {
    learnerId: localStorage.getItem('learnerId') || `learner_${Date.now()}`,
    currentQuestions: [],
    score: 0,
    answered: 0,
    isApiOnline: false
};

document.addEventListener('DOMContentLoaded', () => {
    localStorage.setItem('learnerId', AppState.learnerId);

    const gradeSelect = document.getElementById('grade');
    const subjectSelect = document.getElementById('subject');
    const topicInput = document.getElementById('topic');

    // Grade → populate subjects
    if (gradeSelect) {
        gradeSelect.addEventListener('change', () => {
            const grade = gradeSelect.value;
            subjectSelect.innerHTML = '<option value="">Select Subject</option>';
            subjectSelect.disabled = true;
            topicInput.disabled = true;
            topicInput.value = '';

            if (!grade) return;
            const subjects = getSubjectsForGrade(grade);
            subjects.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                subjectSelect.appendChild(opt);
            });
            subjectSelect.disabled = false;
        });
    }

    // Subject → enable topic
    if (subjectSelect) {
        subjectSelect.addEventListener('change', () => {
            topicInput.disabled = !subjectSelect.value;
            if (!subjectSelect.value) topicInput.value = '';
        });
    }

    checkApiHealth();
});

// ── Health Check ───────────────────────────────────────────
async function checkApiHealth() {
    const statusEl = document.getElementById('api-status');
    const generateBtn = document.getElementById('btn-generate');
    if (!statusEl) return;

    statusEl.className = 'api-status checking';
    statusEl.innerHTML = '🔍 Checking API connection...';

    try {
        const response = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(10000) });
        const data = await response.json();

        if (data.status === 'OK') {
            let detail = '';
            if (!data.gemini) detail = ' ⚠️ Gemini key missing!';

            statusEl.className = 'api-status online';
            statusEl.innerHTML = `🟢 API Connected${detail}`;
            AppState.isApiOnline = true;
            if (generateBtn) generateBtn.disabled = false;
        } else {
            throw new Error('Services not ready');
        }
    } catch (err) {
        statusEl.className = 'api-status offline';
        statusEl.innerHTML = '🔴 API Offline — Check Deployment';
        console.error('Health check failed:', err);
    }
}

// ── Question Type Selector ─────────────────────────────────
function selectType(type) {
    document.querySelectorAll('.type-option').forEach(el => el.classList.remove('selected'));
    const chosen = document.querySelector(`.type-option[data-type="${type}"]`);
    if (chosen) chosen.classList.add('selected');
}

// ── Generate Questions ─────────────────────────────────────
async function generateQuestions() {
    if (!AppState.isApiOnline) {
        alert('API is offline. Please try again shortly.');
        return;
    }

    const grade = document.getElementById('grade').value;
    const subject = document.getElementById('subject').value;
    const topic = document.getElementById('topic').value.trim();
    const type = document.querySelector('.type-option.selected')?.dataset.type || 'MCQ';

    if (!grade || !subject || !topic) {
        alert('Please select Grade, Subject, and enter a Topic.');
        return;
    }

    const quizForm = document.getElementById('quiz-form');
    const loading = document.getElementById('loading');
    const quizArea = document.getElementById('quiz-area');

    quizForm.style.display = 'none';
    loading.classList.add('active');
    animateLoadingSteps();

    try {
        const response = await fetch(`${API_BASE}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ grade, subject, topic, count: 5, type, learnerId: AppState.learnerId }),
            signal: AbortSignal.timeout(45000)   // Gemini can be slow — 45s timeout
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.error || `Server error ${response.status}`);
        }
        if (!data.questions || data.questions.length === 0) {
            throw new Error('No questions returned. Try a more specific topic.');
        }

        AppState.currentQuestions = data.questions;

        loading.classList.remove('active');
        quizArea.classList.add('active');
        document.getElementById('progress-container').classList.add('active');
        renderQuestions(data.questions, data.source);

    } catch (err) {
        const msg = err.name === 'TimeoutError'
            ? 'Request timed out. Gemini may be slow — please try again.'
            : err.message;

        alert('❌ ' + msg);
        console.error(err);
        loading.classList.remove('active');
        quizForm.style.display = 'block';
    }
}

// ── Render Questions ───────────────────────────────────────
function renderQuestions(questions, source) {
    const container = document.getElementById('quiz-area');
    container.innerHTML = `
    <div class="source-info">
      Source: <span class="source-badge">${source || 'AI_GENERATED'}</span>
    </div>
  `;

    questions.forEach((q, index) => {
        const card = document.createElement('div');
        card.className = 'question-card';
        card.dataset.index = index;
        card.style.animation = `card-in 0.4s ease ${index * 0.1}s both`;
        card.innerHTML = `
      <div class="question-header">
        <span class="question-number">Q${index + 1}</span>
        <span class="question-type-badge">${q.question_type || 'MCQ'}</span>
      </div>
      <p class="question-text">${q.question_text || q.question}</p>
      <div class="options-grid">
        ${renderOptions(q, index)}
      </div>
      <button class="btn-hint" onclick="showHint(${index})">💡 Show Hint</button>
      <div class="hint-box" id="hint-${index}">${q.hint || 'Think carefully about the key concepts for this topic.'}</div>
      <div class="feedback" id="feedback-${index}"></div>
    `;
        container.appendChild(card);
    });

    const submitBtn = document.getElementById('btn-submit');
    if (submitBtn) submitBtn.style.display = 'block';

    // Reset progress stats
    document.getElementById('stat-correct').textContent = '0';
    document.getElementById('stat-incorrect').textContent = '0';
    document.getElementById('stat-score').textContent = '0%';
    document.getElementById('progress-fill').style.width = '0%';
    document.getElementById('progress-text').textContent = `0 / ${questions.length} Completed`;
}

function renderOptions(q, index) {
    const type = q.question_type || 'MCQ';
    if (type === 'SHORT_ANSWER' || type === 'ESSAY') {
        return `<textarea class="answer-textarea" id="answer-${index}" placeholder="Type your answer here..." rows="${type === 'ESSAY' ? 6 : 3}"></textarea>`;
    }

    // TRUE_FALSE: ensure options are always present
    let opts = Array.isArray(q.options) && q.options.length > 0
        ? q.options
        : (type === 'TRUE_FALSE' ? ['True', 'False'] : []);

    return opts.map(opt => `
    <label class="option-label" onclick="selectOption(this, ${index})">
      <input type="radio" name="q${index}" value="${opt}">
      <span class="option-dot"></span>
      <span>${opt}</span>
    </label>
  `).join('');
}

function selectOption(label, index) {
    label.parentElement.querySelectorAll('.option-label').forEach(l => l.classList.remove('selected'));
    label.classList.add('selected');
    updateProgress();
}

function showHint(index) {
    document.getElementById(`hint-${index}`).classList.toggle('active');
}

// ── Progress Tracking ──────────────────────────────────────
function updateProgress() {
    const total = AppState.currentQuestions.length;
    let answered = 0;
    AppState.currentQuestions.forEach((q, i) => {
        const type = q.question_type || 'MCQ';
        if (type === 'SHORT_ANSWER' || type === 'ESSAY') {
            if ((document.getElementById(`answer-${i}`)?.value || '').trim()) answered++;
        } else {
            if (document.querySelector(`input[name="q${i}"]:checked`)) answered++;
        }
    });
    const pct = total ? Math.round((answered / total) * 100) : 0;
    document.getElementById('progress-fill').style.width = `${pct}%`;
    document.getElementById('progress-text').textContent = `${answered} / ${total} Completed`;
}

// ── Submit Quiz ────────────────────────────────────────────
function submitQuiz() {
    let correctCount = 0;
    let answeredCount = 0;

    AppState.currentQuestions.forEach((q, index) => {
        const type = q.question_type || 'MCQ';
        let answer;

        if (type === 'SHORT_ANSWER' || type === 'ESSAY') {
            answer = (document.getElementById(`answer-${index}`)?.value || '').trim();
        } else {
            const selected = document.querySelector(`input[name="q${index}"]:checked`);
            if (selected) answer = selected.value;
        }

        if (!answer) return;
        answeredCount++;

        const feedbackEl = document.getElementById(`feedback-${index}`);
        const cardEl = document.querySelector(`[data-index="${index}"]`);
        feedbackEl.classList.add('active');

        if (type === 'SHORT_ANSWER' || type === 'ESSAY') {
            feedbackEl.className = 'feedback active';
            feedbackEl.innerHTML = `📝 Recorded for review. Model answer: <em>${q.correct_answer}</em><br>${q.explanation || ''}`;
        } else {
            const isCorrect = answer.trim().toLowerCase() === (q.correct_answer || '').trim().toLowerCase();
            if (isCorrect) {
                correctCount++;
                feedbackEl.className = 'feedback active correct';
                feedbackEl.innerHTML = `✅ Correct! ${q.explanation || ''}`;
                if (cardEl) cardEl.classList.add('correct-anim');
            } else {
                feedbackEl.className = 'feedback active incorrect';
                feedbackEl.innerHTML = `❌ Incorrect. Correct answer: <strong>${q.correct_answer}</strong><br>${q.explanation || ''}`;
                if (cardEl) cardEl.classList.add('wrong-anim');
            }
        }
    });

    if (answeredCount === 0) {
        alert('Please answer at least one question before submitting.');
        return;
    }

    const scorePct = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    document.getElementById('stat-correct').textContent = correctCount;
    document.getElementById('stat-incorrect').textContent = answeredCount - correctCount;
    document.getElementById('stat-score').textContent = `${scorePct}%`;
    document.getElementById('progress-fill').style.width = '100%';
    document.getElementById('progress-text').textContent = `${answeredCount} / ${AppState.currentQuestions.length} Completed`;

    document.getElementById('btn-submit').style.display = 'none';
    document.getElementById('btn-new-quiz').style.display = 'block';

    // Scroll to top of quiz area
    document.getElementById('quiz-area').scrollIntoView({ behavior: 'smooth' });
}

// ── Reset / New Quiz ───────────────────────────────────────
function resetQuiz() {
    document.getElementById('quiz-form').style.display = 'block';
    document.getElementById('quiz-area').classList.remove('active');
    document.getElementById('quiz-area').innerHTML = '';
    document.getElementById('progress-container').classList.remove('active');
    document.getElementById('btn-new-quiz').style.display = 'none';
    document.getElementById('btn-submit').style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Loading Animation ──────────────────────────────────────
function animateLoadingSteps() {
    const steps = document.querySelectorAll('.loading-step');
    steps.forEach(s => s.classList.remove('active', 'done'));
    steps.forEach((step, i) => {
        setTimeout(() => {
            step.classList.add('active');
            if (i > 0) steps[i - 1].classList.add('done');
        }, i * 900);
    });
}
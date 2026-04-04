// UPDATE THIS to your actual Worker URL
const API_BASE = 'https://gemini-quiz-api.buhle-1ce.workers.dev';

const AppState = {
    learnerId: localStorage.getItem('learnerId') || `learner_${Date.now()}`,
    currentQuestions: [],
    score: 0,
    answered: 0,
    isApiOnline: false
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('Frontend initialized');
    localStorage.setItem('learnerId', AppState.learnerId);

    // Setup Grade -> Subject cascade
    const gradeSelect = document.getElementById('grade');
    const subjectSelect = document.getElementById('subject');
    const topicInput = document.getElementById('topic');

    if (gradeSelect) {
        gradeSelect.addEventListener('change', () => {
            subjectSelect.disabled = false;
            // You can populate subjects dynamically here if needed
            subjectSelect.innerHTML = '<option value="">Select Subject</option><option value="Mathematics">Mathematics</option><option value="Physical Science">Physical Science</option>';
        });
    }

    if (subjectSelect) {
        subjectSelect.addEventListener('change', () => {
            topicInput.disabled = false;
        });
    }

    checkApiHealth();
});

async function checkApiHealth() {
    const statusEl = document.getElementById('api-status');
    if (!statusEl) return;

    statusEl.className = "api-status checking";
    statusEl.innerHTML = "🔍 Checking API connection...";

    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();

        if (data.status === "OK") {
            statusEl.className = "api-status online";
            statusEl.innerHTML = "🟢 API Connected";
            AppState.isApiOnline = true;

            // Enable the generate button once connected
            document.getElementById('btn-generate').disabled = false;
        } else {
            throw new Error("Services not ready");
        }
    } catch (err) {
        statusEl.className = "api-status offline";
        statusEl.innerHTML = "🔴 API Offline - Check Deployment";
        console.error("Health check failed:", err);
    }
}

async function generateQuestions() {
    if (!AppState.isApiOnline) {
        alert("API is offline. Cannot generate questions.");
        return;
    }

    const grade = document.getElementById('grade').value;
    const subject = document.getElementById('subject').value;
    const topic = document.getElementById('topic').value;
    const type = document.querySelector('.type-option.selected')?.dataset.type || 'MCQ';

    // UI Elements
    const quizForm = document.getElementById('quiz-form');
    const loading = document.getElementById('loading');
    const quizArea = document.getElementById('quiz-area');

    if (!grade || !subject || !topic) {
        alert("Please select Grade, Subject, and Topic.");
        return;
    }

    // Show Loading
    quizForm.style.display = 'none';
    loading.classList.add('active');
    animateLoadingSteps();

    try {
        const response = await fetch(`${API_BASE}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grade,
                subject,
                topic,
                count: 5,
                type,
                learnerId: AppState.learnerId
            })
        });

        const data = await response.json();

        if (data.error) throw new Error(data.error);

        AppState.currentQuestions = data.questions;

        // Hide Loading, Show Quiz
        loading.classList.remove('active');
        quizArea.classList.add('active');
        document.getElementById('progress-container').classList.add('active');

        renderQuestions(data.questions, data.source);

    } catch (err) {
        alert("Error: " + err.message);
        console.error(err);
        // Reset UI
        loading.classList.remove('active');
        quizForm.style.display = 'block';
    }
}

function renderQuestions(questions, source) {
    const container = document.getElementById('quiz-area');
    container.innerHTML = `
        <div class="source-info">
            Source: <span class="source-badge">${source || 'AI_WEB'}</span>
        </div>
    `;

    questions.forEach((q, index) => {
        const card = document.createElement('div');
        card.className = 'question-card';
        card.dataset.index = index;
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
            <div class="hint-box" id="hint-${index}">${q.hint || 'No hint available.'}</div>
            <div class="feedback" id="feedback-${index}"></div>
        `;
        container.appendChild(card);
    });

    const submitBtn = document.getElementById('btn-submit');
    submitBtn.style.display = 'block';
}

function renderOptions(q, index) {
    if (q.question_type === 'SHORT_ANSWER' || q.question_type === 'ESSAY') {
        return `<textarea class="answer-textarea" id="answer-${index}" placeholder="Type your answer here..."></textarea>`;
    }

    return (q.options || []).map(opt => `
        <label class="option-label" onclick="selectOption(this, ${index})">
            <input type="radio" name="q${index}" value="${opt}">
            <span class="option-dot"></span>
            <span>${opt}</span>
        </label>
    `).join('');
}

function selectOption(label, index) {
    // Remove selected class from siblings
    const parent = label.parentElement;
    parent.querySelectorAll('.option-label').forEach(l => l.classList.remove('selected'));
    label.classList.add('selected');
}

function showHint(index) {
    const hintBox = document.getElementById(`hint-${index}`);
    hintBox.classList.toggle('active');
}

function submitQuiz() {
    let correctCount = 0;
    let answeredCount = 0;

    AppState.currentQuestions.forEach((q, index) => {
        let answer;
        const type = q.question_type;

        if (type === 'SHORT_ANSWER' || type === 'ESSAY') {
            answer = document.getElementById(`answer-${index}`).value;
        } else {
            const selected = document.querySelector(`input[name="q${index}"]:checked`);
            if (selected) answer = selected.value;
        }

        if (answer) {
            answeredCount++;
            const isCorrect = (answer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase());

            const feedbackEl = document.getElementById(`feedback-${index}`);
            const cardEl = document.querySelector(`[data-index="${index}"]`);

            feedbackEl.classList.add('active');

            if (isCorrect) {
                correctCount++;
                feedbackEl.className = "feedback active correct";
                feedbackEl.innerHTML = `✅ Correct! ${q.explanation || ''}`;
                cardEl.classList.add('correct-anim');
            } else {
                feedbackEl.className = "feedback active incorrect";
                feedbackEl.innerHTML = `❌ Incorrect. Correct Answer: ${q.correct_answer}.<br>${q.explanation || ''}`;
                cardEl.classList.add('wrong-anim');
            }
        }
    });

    // Update Progress
    document.getElementById('stat-correct').textContent = correctCount;
    document.getElementById('stat-incorrect').textContent = answeredCount - correctCount;
    document.getElementById('stat-score').textContent = `${Math.round((correctCount / answeredCount) * 100)}%`;
    document.getElementById('progress-fill').style.width = '100%';

    // Hide Submit, Show Reset
    document.getElementById('btn-submit').style.display = 'none';
    document.getElementById('btn-new-quiz').style.display = 'block';
}

function resetQuiz() {
    document.getElementById('quiz-form').style.display = 'block';
    document.getElementById('quiz-area').classList.remove('active');
    document.getElementById('progress-container').classList.remove('active');
    document.getElementById('btn-new-quiz').style.display = 'none';
    document.getElementById('quiz-area').innerHTML = '';
}

function animateLoadingSteps() {
    const steps = document.querySelectorAll('.loading-step');
    steps.forEach((step, i) => {
        setTimeout(() => {
            step.classList.add('active');
            if (i > 0) steps[i - 1].classList.add('done');
        }, i * 800);
    });
}
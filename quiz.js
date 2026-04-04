/**
 * Peer-2-Peer PRO - Quiz Frontend
 * Connects to Cloudflare Worker API for CAPS-aligned practice questions
 */

const API_BASE = 'https://gemini-quiz-api.buhle-1ce.workers.dev'; // Empty string = same origin (Worker handles CORS)

// State management
const AppState = {
    learnerId: localStorage.getItem('learnerId') || `learner_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    currentQuestions: [],
    currentTopic: null,
    score: 0,
    answered: 0,
    startTime: null,
    hintUsed: false
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Quiz frontend initialized');

    // Save learner ID for session persistence
    localStorage.setItem('learnerId', AppState.learnerId);

    // Setup event listeners
    setupEventListeners();

    // Load available topics for pre-selected grade/subject
    await loadTopics();

    // Check API health
    await checkApiHealth();
});

// ===================================================
// EVENT LISTENERS
// ===================================================
function setupEventListeners() {
    // Grade/Subject change → reload topics
    const gradeSelect = document.getElementById('grade');
    const subjectSelect = document.getElementById('subject');

    if (gradeSelect) gradeSelect.addEventListener('change', loadTopics);
    if (subjectSelect) subjectSelect.addEventListener('change', loadTopics);

    // Generate questions button
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerateQuestions);
    }

    // Submit answers button (delegated event for dynamic questions)
    const questionsContainer = document.getElementById('questionsContainer');
    if (questionsContainer) {
        document.getElementById('submitBtn')?.addEventListener('click', handleSubmitAnswers);
    }

    // Practice more button
    document.getElementById('practiceMoreBtn')?.addEventListener('click', () => {
        document.getElementById('questionsContainer').innerHTML = '';
        document.getElementById('status')?.scrollIntoView({ behavior: 'smooth' });
    });
}

// ===================================================
// API HEALTH CHECK
// ===================================================
async function checkApiHealth() {
    const statusEl = document.getElementById('apiStatus');
    if (!statusEl) return;

    try {
        const res = await fetch(`${API_BASE}/health`);
        const data = await res.json();

        if (data.status === 'OK' && data.gemini) {
            statusEl.innerHTML = '✅ API connected • Ready to generate';
            statusEl.style.color = '#22c55e';
        } else {
            statusEl.innerHTML = `⚠️ API partial: ${data.gemini ? 'Gemini OK' : 'Gemini offline'}`;
            statusEl.style.color = '#f59e0b';
        }
    } catch (err) {
        statusEl.innerHTML = '⚠️ Cannot connect to API. Check deployment.';
        statusEl.style.color = '#ef4444';
        console.error('Health check failed:', err);
    }
}

// ===================================================
// LOAD TOPICS DYNAMICALLY
// ===================================================
async function loadTopics() {
    const grade = document.getElementById('grade')?.value;
    const subject = document.getElementById('subject')?.value;
    const topicSelect = document.getElementById('topic');

    if (!grade || !subject || !topicSelect) return;

    // Show loading
    topicSelect.innerHTML = '<option>Loading topics...</option>';
    topicSelect.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/api/topics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ grade, subject })
        });

        if (!res.ok) throw new Error('Failed to load topics');

        const data = await res.json();

        // Populate dropdown
        topicSelect.innerHTML = '<option value="">Select a topic...</option>';

        if (data.topics?.length) {
            data.topics.forEach(topic => {
                const opt = document.createElement('option');
                opt.value = topic;
                opt.textContent = topic;
                topicSelect.appendChild(opt);
            });
        } else {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'No topics found — type manually';
            topicSelect.appendChild(opt);
            topicSelect.value = '';
        }

    } catch (err) {
        console.error('Load topics error:', err);
        topicSelect.innerHTML = '<option value="">Error loading topics</option>';
    } finally {
        topicSelect.disabled = false;
    }
}

// ===================================================
// GENERATE QUESTIONS
// ===================================================
async function handleGenerateQuestions() {
    const grade = document.getElementById('grade')?.value;
    const subject = document.getElementById('subject')?.value;
    const topic = document.getElementById('topic')?.value;
    const type = document.getElementById('type')?.value || 'MCQ';
    const count = 5;

    // Validation
    if (!grade || !subject || !topic) {
        alert('⚠️ Please select Grade, Subject, and Topic first');
        return;
    }

    // UI updates
    const generateBtn = document.getElementById('generateBtn');
    const statusEl = document.getElementById('apiStatus');
    const loader = document.getElementById('loader');
    const container = document.getElementById('questionsContainer');

    if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.style.opacity = '0.6';
    }
    if (statusEl) statusEl.textContent = '🔌 Generating questions...';
    if (loader) loader.style.display = 'block';
    if (container) container.innerHTML = '';

    // Reset state
    AppState.currentQuestions = [];
    AppState.score = 0;
    AppState.answered = 0;
    AppState.startTime = Date.now();
    AppState.currentTopic = topic;

    try {
        const res = await fetch(`${API_BASE}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grade,
                subject,
                topic,
                count,
                type,
                learnerId: AppState.learnerId
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `API Error: ${res.status}`);
        }

        const data = await res.json();

        if (!data.questions?.length) {
            throw new Error('No questions generated. Try a different topic.');
        }

        // Store and render
        AppState.currentQuestions = data.questions;
        renderQuestions(data.questions, data.source);

        // Update status
        if (statusEl) {
            statusEl.innerHTML = `✅ Generated ${data.questions.length} questions (${data.source})`;
            statusEl.style.color = '#22c55e';
        }

        // Scroll to questions
        container?.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
        console.error('Generate error:', err);
        if (statusEl) {
            statusEl.innerHTML = `⚠️ ${err.message}`;
            statusEl.style.color = '#ef4444';
        }
        alert(`Error: ${err.message}`);
    } finally {
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.style.opacity = '1';
        }
        if (loader) loader.style.display = 'none';
    }
}

// ===================================================
// RENDER QUESTIONS
// ===================================================
function renderQuestions(questions, source) {
    const container = document.getElementById('questionsContainer');
    if (!container) return;

    container.innerHTML = `
    <div class="source-badge">
      Source: ${source === 'R2_CAPS' ? '📚 CAPS Document' : '🤖 AI Generated'}
    </div>
    <form id="quizForm">
      ${questions.map((q, idx) => `
        <div class="question-card" data-question-id="${q.id || `temp_${idx}`}">
          <div class="question-header">
            <span class="question-number">Question ${idx + 1}</span>
            <button type="button" class="hint-btn" data-idx="${idx}">💡 Hint</button>
          </div>
          
          <p class="question-text">${escapeHtml(q.question_text || q.question)}</p>
          
          ${renderOptions(q, idx)}
          
          <div class="question-actions">
            <button type="button" class="check-btn" data-idx="${idx}">
              ✅ Check Answer
            </button>
            <div class="feedback" id="feedback-${idx}"></div>
          </div>
          
          <div class="explanation" id="explanation-${idx}" style="display:none">
            <strong>Explanation:</strong> ${escapeHtml(q.explanation || 'Review the CAPS curriculum for this topic.')}
          </div>
        </div>
      `).join('')}
    </form>
    
    <div class="quiz-footer">
      <button type="button" id="submitAllBtn" class="submit-all-btn">
        🎯 Submit All Answers
      </button>
      <div class="progress-summary" id="progressSummary">
        0 / ${questions.length} Answered • Score: 0
      </div>
    </div>
  `;

    // Attach event listeners to dynamic elements
    attachQuestionListeners(questions);
}

// Render options based on question type
function renderOptions(q, idx) {
    const type = q.question_type || q.type || 'MCQ';
    const options = q.options || [];
    const name = `question_${idx}`;

    if (type === 'MCQ' || type === 'TRUE_FALSE') {
        return `
      <div class="options-grid">
        ${options.map((opt, i) => `
          <label class="option-label">
            <input type="radio" name="${name}" value="${escapeHtml(opt)}">
            <span class="option-text">${escapeHtml(opt)}</span>
          </label>
        `).join('')}
      </div>
    `;
    }

    if (type === 'SHORT_ANSWER') {
        return `
      <input type="text" name="${name}" class="short-answer-input" 
             placeholder="Type your answer..." autocomplete="off">
    `;
    }

    if (type === 'ESSAY') {
        return `
      <textarea name="${name}" class="essay-input" rows="4" 
                placeholder="Write your answer here..."></textarea>
    `;
    }

    return '<p><em>Unsupported question type</em></p>';
}

// Attach listeners to question elements
function attachQuestionListeners(questions) {
    // Hint buttons
    document.querySelectorAll('.hint-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const idx = e.currentTarget.dataset.idx;
            const q = questions[idx];
            await showHint(q, idx);
        });
    });

    // Individual check buttons
    document.querySelectorAll('.check-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.currentTarget.dataset.idx;
            checkSingleAnswer(idx, questions[idx]);
        });
    });

    // Submit all button
    document.getElementById('submitAllBtn')?.addEventListener('click', () => {
        submitAllAnswers(questions);
    });
}

// ===================================================
// HINT FUNCTIONALITY
// ===================================================
async function showHint(question, idx) {
    const feedbackEl = document.getElementById(`feedback-${idx}`);
    if (!feedbackEl) return;

    try {
        const res = await fetch(`${API_BASE}/api/hint`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                questionId: question.id,
                questionText: question.question_text || question.question,
                topic: AppState.currentTopic
            })
        });

        const data = await res.json();

        // Show hint in feedback area
        feedbackEl.innerHTML = `<span style="color:#3b82f6">💡 ${escapeHtml(data.hint)}</span>`;
        feedbackEl.style.display = 'block';

        // Mark hint as used for scoring
        if (question.id) {
            question.hintUsed = true;
        }

    } catch (err) {
        console.error('Hint error:', err);
        feedbackEl.innerHTML = '<span style="color:#ef4444">Could not load hint</span>';
    }
}

// ===================================================
// ANSWER CHECKING & SUBMISSION
// ===================================================
function checkSingleAnswer(idx, question) {
    const name = `question_${idx}`;
    const selected = document.querySelector(`input[name="${name}"]:checked`)?.value
        || document.querySelector(`input[name="${name}"]`)?.value
        || document.querySelector(`textarea[name="${name}"]`)?.value?.trim();

    if (!selected) {
        alert('Please select or enter an answer first');
        return;
    }

    // Simple client-side check for MCQ/True-False (instant feedback)
    const type = question.question_type || question.type || 'MCQ';
    const feedbackEl = document.getElementById(`feedback-${idx}`);
    const explanationEl = document.getElementById(`explanation-${idx}`);

    if (['MCQ', 'TRUE_FALSE'].includes(type)) {
        const isCorrect = selected.trim().toLowerCase() === question.correct_answer?.trim().toLowerCase();

        feedbackEl.innerHTML = isCorrect
            ? '<span style="color:#22c55e">✅ Correct! Well done!</span>'
            : `<span style="color:#ef4444">❌ Incorrect. Correct: ${escapeHtml(question.correct_answer)}</span>`;

        if (explanationEl) explanationEl.style.display = 'block';

        // Update progress
        AppState.answered++;
        if (isCorrect) AppState.score += 10;
        updateProgressSummary();

    } else {
        // For subjective: show "submitted" message, server will grade
        feedbackEl.innerHTML = '<span style="color:#3b82f6">📤 Answer submitted for AI grading...</span>';
        submitSingleAnswer(idx, question, selected);
    }
}

async function submitSingleAnswer(idx, question, answer) {
    try {
        const res = await fetch(`${API_BASE}/api/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                learnerId: AppState.learnerId,
                questionId: question.id,
                answer,
                questionType: question.question_type || question.type,
                correctAnswer: question.correct_answer,
                timeSpent: Math.round((Date.now() - AppState.startTime) / 1000),
                hintUsed: question.hintUsed ? 1 : 0
            })
        });

        const data = await res.json();
        const feedbackEl = document.getElementById(`feedback-${idx}`);

        if (feedbackEl) {
            feedbackEl.innerHTML = `<span style="color:${data.isCorrect ? '#22c55e' : '#f59e0b'}">${escapeHtml(data.feedback)}</span>`;
        }

        // Update progress
        AppState.answered++;
        AppState.score += data.score || 0;
        updateProgressSummary();

    } catch (err) {
        console.error('Submit error:', err);
    }
}

async function submitAllAnswers(questions) {
    const unanswered = questions.filter((_, idx) => {
        const name = `question_${idx}`;
        const val = document.querySelector(`input[name="${name}"]:checked`)?.value
            || document.querySelector(`textarea[name="${name}"]`)?.value?.trim();
        return !val;
    });

    if (unanswered.length) {
        if (!confirm(`You have ${unanswered.length} unanswered questions. Submit anyway?`)) {
            return;
        }
    }

    // Submit each answer
    for (let idx = 0; idx < questions.length; idx++) {
        const q = questions[idx];
        const name = `question_${idx}`;
        const answer = document.querySelector(`input[name="${name}"]:checked`)?.value
            || document.querySelector(`input[name="${name}"]`)?.value
            || document.querySelector(`textarea[name="${name}"]`)?.value?.trim();

        if (answer) {
            await submitSingleAnswer(idx, q, answer);
        }
    }

    // Show final summary
    showFinalSummary();
}

function showFinalSummary() {
    const maxScore = AppState.currentQuestions.length * 10;
    const percentage = Math.round((AppState.score / maxScore) * 100);

    const summary = document.createElement('div');
    summary.className = 'final-summary';
    summary.innerHTML = `
    <h3>🎉 Practice Session Complete!</h3>
    <div class="score-display">
      <div class="score-circle" style="--p:${percentage}">
        <span>${percentage}%</span>
      </div>
    </div>
    <p><strong>Score:</strong> ${AppState.score} / ${maxScore}</p>
    <p><strong>Correct:</strong> ${Math.round(AppState.score / 10)} / ${AppState.currentQuestions.length}</p>
    <p><strong>Time:</strong> ${Math.round((Date.now() - AppState.startTime) / 1000)}s</p>
    <button onclick="location.reload()" class="restart-btn">🔄 Try Another Topic</button>
  `;

    document.getElementById('questionsContainer')?.appendChild(summary);
    summary.scrollIntoView({ behavior: 'smooth' });
}

function updateProgressSummary() {
    const el = document.getElementById('progressSummary');
    if (el) {
        el.textContent = `${AppState.answered} / ${AppState.currentQuestions.length} Answered • Score: ${AppState.score}`;
    }
}

// ===================================================
// UTILITIES
// ===================================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Expose for inline onclick handlers
window.showHint = showHint;
window.checkSingleAnswer = checkSingleAnswer;
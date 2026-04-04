/**
 * Peer-2-Peer PRO - Quiz Frontend (Final Optimized)
 * This file runs in the browser and connects to your Cloudflare AI Worker.
 */

// 1. UPDATE THIS URL to your actual AI Worker .workers.dev address
const API_BASE = 'https://gemini-quiz-api.buhle-1ce.workers.dev';

// State management
const AppState = {
    learnerId: localStorage.getItem('learnerId') || `learner_${Date.now()}`,
    currentQuestions: [],
    score: 0,
    answered: 0,
    isApiOnline: false
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Quiz frontend loading...');
    localStorage.setItem('learnerId', AppState.learnerId);

    // Initial health check
    checkApiHealth();

    // Setup the main action button
    const generateBtn = document.getElementById('btn-generate');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateQuestions);
    }
});

/**
 * Checks if the Worker API is reachable and databases are connected
 */
async function checkApiHealth() {
    const statusEl = document.getElementById('api-status');
    if (!statusEl) return;

    statusEl.innerHTML = "🔍 Checking API connection...";

    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();

        if (data.status === "OK") {
            statusEl.innerHTML = "🟢 API Connected";
            statusEl.style.color = "#32cd32"; // Pro Green
            AppState.isApiOnline = true;
        } else {
            throw new Error("Services not ready");
        }
    } catch (err) {
        statusEl.innerHTML = "🔴 API Offline - Check Worker Deployment";
        statusEl.style.color = "#ff4444";
        console.error("Health check failed:", err);
    }
}

/**
 * Sends request to Worker to generate CAPS-aligned questions
 */
async function generateQuestions() {
    if (!AppState.isApiOnline) {
        alert("API is offline. Please ensure your AI worker is deployed.");
        return;
    }

    const grade = document.getElementById('grade')?.value;
    const subject = document.getElementById('subject')?.value;
    const topic = document.getElementById('topic')?.value;
    const loader = document.getElementById('loader');
    const questionsContainer = document.getElementById('questionsContainer');

    if (!grade || !subject || !topic) {
        alert("Please fill in Grade, Subject, and Topic.");
        return;
    }

    // UI Feedback
    loader.style.display = "block";
    questionsContainer.innerHTML = "";

    try {
        const response = await fetch(`${API_BASE}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grade,
                subject,
                topic,
                count: 5,
                learnerId: AppState.learnerId
            })
        });

        const data = await response.json();

        if (data.error) throw new Error(data.error);

        AppState.currentQuestions = data.questions;
        renderQuestions(data.questions);

    } catch (err) {
        alert("Error: " + err.message);
        console.error("Generation failed:", err);
    } finally {
        loader.style.display = "none";
    }
}

/**
 * Renders the questions into the HTML
 */
function renderQuestions(questions) {
    const container = document.getElementById('questionsContainer');
    if (!container) return;

    container.innerHTML = `<h3>Generated Questions for ${document.getElementById('topic').value}</h3>`;

    questions.forEach((q, index) => {
        const card = document.createElement('div');
        card.className = 'question-card';
        card.innerHTML = `
            <p><strong>Question ${index + 1}:</strong> ${q.question_text || q.question}</p>
            <div class="options-grid">
                ${(q.options || []).map(opt => `
                    <label class="option-label">
                        <input type="radio" name="q${index}" value="${opt}">
                        <span>${opt}</span>
                    </label>
                `).join('')}
            </div>
            <p class="hint-text">💡 <em>Hint: ${q.hint || "Think about the core concept."}</em></p>
        `;
        container.appendChild(card);
    });

    // Add a submit button at the end
    const submitBtn = document.createElement('button');
    submitBtn.textContent = "Check Answers";
    submitBtn.className = "btn-primary";
    submitBtn.style.marginTop = "20px";
    submitBtn.onclick = checkResults;
    container.appendChild(submitBtn);
}

function checkResults() {
    alert("This would now validate against the Worker. Your questions are ready!");
}
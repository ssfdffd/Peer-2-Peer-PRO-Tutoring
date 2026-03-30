async function getQuestions() {
    const btn = document.getElementById('genBtn');
    const output = document.getElementById('quiz-output');

    // UI Feedback
    btn.innerText = "Generating...";
    output.innerHTML = "<p>Please wait, the AI is thinking...</p>";

    const payload = {
        grade: document.getElementById('grade').value,
        subject: document.getElementById('subject').value,
        topic: document.getElementById('topic').value
    };

    try {
        // REPLACE THE URL BELOW WITH YOUR ACTUAL CLOUDFLARE WORKER URL
        const response = await fetch('https://gemini-quiz-api.buhle-1ce.workers.dev', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const rawData = await response.json();

        // Parse the AI's text response into actual JSON
        const quizData = JSON.parse(rawData.candidates[0].content.parts[0].text);

        // Display questions on the screen
        output.innerHTML = quizData.questions.map((item, index) => `
            <div class="question-card">
                <p><strong>Q${index + 1}: ${item.q}</strong></p>
                ${item.options.map(opt => `<button style="background: #eee; color: black; margin-bottom: 5px;">${opt}</button>`).join('<br>')}
            </div>
        `).join('');

    } catch (error) {
        output.innerHTML = "<p style='color:red'>Error: Could not connect to the AI brain.</p>";
        console.error(error);
    } finally {
        btn.innerText = "Generate Questions";
    }
}
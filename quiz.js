// quiz.js - Cloudflare Worker for CAPS Quiz System
export default {
    async fetch(request, env) {
        const origin = request.headers.get("Origin") || "";
        const corsHeaders = {
            "Access-Control-Allow-Origin": origin || "https://peer-2-peer.co.za",
            "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
            "Access-Control-Allow-Headers": "Content-Type",
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        try {
            // === HEALTH CHECK ===
            if (path === "/health") {
                return new Response(JSON.stringify({
                    status: "OK",
                    db: !!env.QUIZ_DB,
                    auth_db: !!env.AUTH_DB,
                    r2: !!env.MY_BUCKET,
                    gemini: !!env.GEMINI_API_KEY
                }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // === SERVE STATIC ASSETS ===
            if (path === "/" || path === "/quiz.html" || path === "/practice.html") {
                return env.ASSETS.fetch(request);
            }

            // === GENERATE QUESTIONS ===
            if (path === "/api/generate" && request.method === "POST") {
                const { grade, subject, topic, count = 5, type = "MCQ", learnerId = "anonymous" } = await request.json();

                if (!grade || !subject || !topic) {
                    return new Response(JSON.stringify({ error: "Missing grade, subject, or topic" }), {
                        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }

                console.log(`[Generate] Request: Grade ${grade} ${subject} - ${topic} (${type}, count: ${count})`);

                // 1. Check D1 cache first — fetch unused questions for this combination
                const { results: cached } = await env.QUIZ_DB.prepare(
                    `SELECT * FROM questions 
           WHERE grade_level = ? AND subject = ? AND topic = ? AND question_type = ? 
           ORDER BY times_used ASC, RANDOM() LIMIT ?`
                ).bind(grade, subject, topic, type, count).all();

                if (cached.length >= count) {
                    // Mark as used
                    for (const q of cached) {
                        await env.QUIZ_DB.prepare("UPDATE questions SET times_used = times_used + 1 WHERE id = ?")
                            .bind(q.id).run();
                    }
                    await saveTopic(env, grade, subject, topic);
                    console.log(`[Generate] Returned ${cached.length} cached questions`);
                    return new Response(JSON.stringify({
                        questions: cached,
                        source: "CACHE",
                        cached: cached.length,
                        new: 0
                    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }

                // 2. Look for CAPS documents in R2 for this grade/subject/topic
                const r2Content = await searchR2ForContent(env, grade, subject, topic);

                // 3. Generate new questions with Gemini (using R2 content if found)
                const needed = count - cached.length;
                console.log(`[Generate] Cache: ${cached.length}, Need: ${needed}, R2: ${r2Content ? 'found' : 'none'}`);

                const newQuestions = await generateWithGemini(env, grade, subject, topic, needed, type, r2Content);

                if (!newQuestions.length && !cached.length) {
                    console.error("[Generate] Failed to generate any questions");
                    return new Response(JSON.stringify({ error: "Could not generate questions. Try a different topic." }), {
                        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }

                // 4. Save new questions to D1
                const savedQuestions = [];
                for (const q of newQuestions) {
                    const sourceType = r2Content ? "R2" : "AI_GENERATED";
                    try {
                        const inserted = await env.QUIZ_DB.prepare(
                            `INSERT INTO questions 
               (grade_level, subject, topic, question_type, question_text, options, correct_answer, explanation, hint, source_type, times_used) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
                        ).bind(
                            grade, subject, topic, type,
                            q.question || q.question_text,
                            JSON.stringify(q.options || []),
                            q.correct_answer,
                            q.explanation || "Review the CAPS curriculum for this topic.",
                            q.hint || "Think carefully about the key concepts in this topic.",
                            sourceType
                        ).run();

                        savedQuestions.push({
                            ...q,
                            id: inserted.meta?.last_row_id,
                            question_type: type,
                            question_text: q.question || q.question_text,
                            grade_level: grade,
                            subject, topic,
                            source_type: sourceType
                        });
                    } catch (dbErr) {
                        console.error("DB insert error:", dbErr);
                        // Still return the question even if save fails
                        savedQuestions.push({
                            ...q,
                            question_type: type,
                            question_text: q.question || q.question_text,
                            id: null
                        });
                    }
                }

                // 5. Save topic for dropdown reuse
                await saveTopic(env, grade, subject, topic);

                const allQuestions = [...cached, ...savedQuestions];
                console.log(`[Generate] Success: ${allQuestions.length} questions (cached: ${cached.length}, new: ${savedQuestions.length})`);

                return new Response(JSON.stringify({
                    questions: allQuestions,
                    source: r2Content ? "R2_CAPS" : "AI_GENERATED",
                    cached: cached.length,
                    new: savedQuestions.length
                }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // === SUBMIT ANSWER ===
            if (path === "/api/submit" && request.method === "POST") {
                const { learnerId, questionId, answer, questionType, correctAnswer, timeSpent = 0, hintUsed = 0 } = await request.json();

                let isCorrect = 0, score = 0, feedback = "";

                if (['MCQ', 'TRUE_FALSE'].includes(questionType)) {
                    isCorrect = (answer?.trim().toLowerCase() === correctAnswer?.trim().toLowerCase()) ? 1 : 0;
                    score = isCorrect * 10;
                    feedback = isCorrect
                        ? "✅ Correct! Well done!"
                        : `❌ Incorrect. The correct answer is: ${correctAnswer}`;
                } else {
                    // Subjective — use Gemini for AI grading if available
                    const aiResult = await gradeSubjectiveWithGemini(env, answer, correctAnswer, questionType);
                    score = aiResult.score;
                    isCorrect = score >= 5 ? 1 : 0;
                    feedback = aiResult.feedback;
                }

                // Save attempt
                try {
                    await env.QUIZ_DB.prepare(
                        `INSERT INTO learner_attempts (learner_id, question_id, learner_answer, is_correct, score, time_spent_seconds, hint_used) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`
                    ).bind(learnerId, questionId || 0, answer, isCorrect, score, timeSpent, hintUsed).run();

                    // Update learner progress
                    await updateLearnerProgress(env, learnerId, questionId, isCorrect);
                } catch (e) {
                    console.error("Attempt save error:", e);
                }

                return new Response(JSON.stringify({
                    isCorrect, score, feedback,
                    correctAnswer: isCorrect ? null : correctAnswer
                }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // === GET TOPICS ===
            if (path === "/api/topics" && request.method === "POST") {
                const { grade, subject } = await request.json();
                const { results } = await env.QUIZ_DB.prepare(
                    "SELECT topic_name, times_selected FROM topics WHERE grade_level = ? AND subject = ? ORDER BY times_selected DESC, topic_name ASC"
                ).bind(grade, subject).all();

                return new Response(JSON.stringify({
                    topics: results.map(r => r.topic_name)
                }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // === SAVE TOPIC ===
            if (path === "/api/save-topic" && request.method === "POST") {
                const { grade, subject, topic } = await request.json();
                await saveTopic(env, grade, subject, topic);
                return new Response(JSON.stringify({ success: true }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            // === GET HINT ===
            if (path === "/api/hint" && request.method === "POST") {
                const { questionId, questionText, topic } = await request.json();

                let hint = "Review the key CAPS concepts for this topic. Think about definitions, examples, and applications.";
                if (questionId) {
                    try {
                        const { results } = await env.QUIZ_DB.prepare("SELECT hint FROM questions WHERE id = ?")
                            .bind(questionId).all();
                        if (results.length && results[0].hint) hint = results[0].hint;
                    } catch (e) { /* fallback to default */ }
                }

                return new Response(JSON.stringify({ hint }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            // === GET LEARNER STATS ===
            if (path === "/api/stats" && request.method === "POST") {
                const { learnerId } = await request.json();
                const { results } = await env.QUIZ_DB.prepare(
                    `SELECT grade_level, subject, topic, questions_attempted, questions_correct, last_practiced 
           FROM learner_progress WHERE learner_id = ? ORDER BY last_practiced DESC LIMIT 10`
                ).bind(learnerId).all();
                return new Response(JSON.stringify({ progress: results }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            // === DEBUG: Test Gemini Connection ===
            if (path === "/api/test-gemini" && request.method === "GET") {
                if (!env.GEMINI_API_KEY) {
                    return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
                        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }
                const testQuestions = await generateWithGemini(env, "10", "Mathematics", "Algebra", 1, "MCQ", null);
                return new Response(JSON.stringify({
                    success: testQuestions.length > 0,
                    questionsGenerated: testQuestions.length,
                    sample: testQuestions[0] || null,
                    timestamp: new Date().toISOString()
                }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // Default response
            return new Response(JSON.stringify({ message: "CAPS Quiz API Ready 🎓", endpoints: ["/health", "/api/generate", "/api/submit", "/api/topics", "/api/hint", "/api/stats", "/api/test-gemini"] }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });

        } catch (err) {
            console.error("Worker Error:", err);
            return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }
    },
};

// ===================================================
// HELPER: Search R2 Bucket for CAPS Content
// ===================================================
async function searchR2ForContent(env, grade, subject, topic) {
    if (!env.MY_BUCKET) return null;

    const topicSlug = topic.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
    const subjectSlug = subject.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
    const gradeSlug = `grade${grade}`.toLowerCase();

    const pathsToTry = [
        `caps/${gradeSlug}/${subjectSlug}/${topicSlug}.txt`,
        `caps/${gradeSlug}/${subjectSlug}/${topic}.txt`,
        `caps/${gradeSlug}/${subject}/${topic}.txt`,
        `${gradeSlug}/${subjectSlug}/${topicSlug}.txt`,
        `${gradeSlug}/${subject}/${topic}.txt`,
    ];

    for (const key of pathsToTry) {
        try {
            const obj = await env.MY_BUCKET.get(key);
            if (obj) {
                const text = await obj.text();
                console.log(`[R2] Hit: ${key}`);
                return text.substring(0, 6000); // Limit to avoid token overflow
            }
        } catch (e) { /* try next path */ }
    }

    // Fuzzy search
    try {
        const prefix = `caps/${gradeSlug}/`;
        const listed = await env.MY_BUCKET.list({ prefix, limit: 100 });
        const topicLower = topic.toLowerCase();

        for (const item of (listed.objects || [])) {
            if (item.key.toLowerCase().includes(topicLower) || item.key.toLowerCase().includes(topicSlug)) {
                const obj = await env.MY_BUCKET.get(item.key);
                if (obj) {
                    const text = await obj.text();
                    console.log(`[R2] Fuzzy hit: ${item.key}`);
                    return text.substring(0, 6000);
                }
            }
        }

        // Broader search
        const allListed = await env.MY_BUCKET.list({ limit: 500 });
        for (const item of (allListed.objects || [])) {
            const keyLower = item.key.toLowerCase();
            if ((keyLower.includes(subjectSlug) || keyLower.includes(subject.toLowerCase())) &&
                (keyLower.includes(topicLower) || keyLower.includes(topicSlug))) {
                const obj = await env.MY_BUCKET.get(item.key);
                if (obj) {
                    const text = await obj.text();
                    console.log(`[R2] Broad hit: ${item.key}`);
                    return text.substring(0, 6000);
                }
            }
        }
    } catch (e) {
        console.error("[R2] Listing error:", e);
    }

    return null;
}

// ===================================================
// HELPER: Generate Questions via Gemini (FIXED)
// ===================================================
async function generateWithGemini(env, grade, subject, topic, count, qType, r2Content = null) {
    console.log(`[Gemini] Generating ${count} ${qType} questions for Grade ${grade} ${subject}: ${topic}`);

    if (!env.GEMINI_API_KEY) {
        console.error("[Gemini] API key missing!");
        return [];
    }
    if (count <= 0) return [];

    const apiKey = env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const contentSection = r2Content
        ? `\n\nCAPS CURRICULUM SOURCE MATERIAL (use this as primary reference):\n---\n${r2Content.substring(0, 5000)}\n---\n`
        : `\n\nNote: No specific curriculum document found. Use your knowledge of the South African CAPS curriculum.\n`;

    const prompt = `You are an expert South African CAPS curriculum examiner for the Department of Basic Education.
Create exactly ${count} ${qType} practice questions for Grade ${grade} ${subject} on "${topic}".
${contentSection}
STRICT OUTPUT RULES:
1. Return ONLY a valid JSON array - no markdown, no code blocks, no explanations.
2. Schema: [{"question":"...","options":[],"correct_answer":"...","explanation":"...","hint":"..."}]
3. MCQ: options = ["A) ...","B) ...","C) ...","D) ..."], correct_answer = exact option string
4. TRUE_FALSE: options = ["True","False"], correct_answer = "True" or "False"
5. SHORT_ANSWER/ESSAY: options = [], correct_answer = model marking guideline
6. Use South African context, CAPS terminology, Grade ${grade} appropriate difficulty.
7. Hints guide without revealing; explanations reference CAPS concepts.

Return ONLY the JSON array:`;

    try {
        console.log("[Gemini] Calling API...");
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.7,
                    maxOutputTokens: 4096,
                    topP: 0.95
                },
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" }
                ]
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[Gemini] HTTP ${response.status}: ${errText}`);
            if (response.status === 401) console.error("[Gemini] Invalid API key - check wrangler secrets!");
            if (response.status === 429) console.error("[Gemini] Rate limit exceeded - wait and retry!");
            return [];
        }

        const data = await response.json();
        console.log("[Gemini] Response received");

        // Extract text with multiple fallback paths
        let text = data?.candidates?.[0]?.content?.parts?.[0]?.text
            || data?.candidates?.[0]?.content?.parts?.[0]?.string_value
            || "[]";

        console.log(`[Gemini] Raw preview: ${text.substring(0, 150)}...`);

        const parsed = parseJSON(text);

        if (!Array.isArray(parsed)) {
            console.error("[Gemini] Parsed result is not an array:", typeof parsed, parsed);
            return [];
        }

        // Validate and normalize questions
        const validQuestions = parsed.filter(q => q.question && q.correct_answer).map(q => ({
            question: q.question,
            options: Array.isArray(q.options) ? q.options : [],
            correct_answer: q.correct_answer,
            explanation: q.explanation || "Review the CAPS curriculum for this topic.",
            hint: q.hint || "Think about the key concepts."
        }));

        console.log(`[Gemini] Success: ${validQuestions.length}/${count} valid questions`);
        return validQuestions;

    } catch (e) {
        console.error("[Gemini] Fetch/Parse Error:", e.message);
        return [];
    }
}

// ===================================================
// HELPER: Grade Subjective Answers via Gemini
// ===================================================
async function gradeSubjectiveWithGemini(env, answer, markingGuideline, questionType) {
    if (!env.GEMINI_API_KEY || !answer) return { score: 5, feedback: "Your answer has been recorded." };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
    const prompt = `Grade this ${questionType} answer against the marking guideline. Return ONLY JSON: {"score": <0-10 integer>, "feedback": "<constructive feedback>"}

Marking Guideline: ${markingGuideline}
Student Answer: ${answer}

Be fair, constructive, and CAPS-aligned. Score 0-10 based on accuracy, completeness, and understanding.`;

    try {
        const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json", temperature: 0.3, maxOutputTokens: 300 }
            })
        });

        if (!resp.ok) {
            console.error(`[Grade] Gemini error: ${resp.status}`);
            return { score: 6, feedback: "Good effort! Review the marking guidelines for more detail." };
        }

        const data = await resp.json();
        const result = parseJSON(data.candidates?.[0]?.content?.parts?.[0]?.text || "{}");

        return {
            score: typeof result.score === 'number' ? Math.max(0, Math.min(10, result.score)) : 6,
            feedback: result.feedback || "Your answer has been recorded and reviewed."
        };
    } catch (e) {
        console.error("[Grade] Error:", e.message);
        return { score: 6, feedback: "Good effort! Review the key concepts for further improvement." };
    }
}

// ===================================================
// HELPER: Save Topic to DB
// ===================================================
async function saveTopic(env, grade, subject, topic) {
    try {
        await env.QUIZ_DB.prepare(
            `INSERT INTO topics (grade_level, subject, topic_name, times_selected) VALUES (?, ?, ?, 1)
       ON CONFLICT(grade_level, subject, topic_name) DO UPDATE SET times_selected = times_selected + 1`
        ).bind(grade, subject, topic).run();
    } catch (e) {
        // Fallback for older SQLite syntax
        try {
            await env.QUIZ_DB.prepare(
                "INSERT OR IGNORE INTO topics (grade_level, subject, topic_name) VALUES (?, ?, ?)"
            ).bind(grade, subject, topic).run();
            await env.QUIZ_DB.prepare(
                "UPDATE topics SET times_selected = times_selected + 1 WHERE grade_level = ? AND subject = ? AND topic_name = ?"
            ).bind(grade, subject, topic).run();
        } catch (e2) {
            console.error("[Topic] Save error:", e2);
        }
    }
}

// ===================================================
// HELPER: Update Learner Progress
// ===================================================
async function updateLearnerProgress(env, learnerId, questionId, isCorrect) {
    if (!questionId) return;

    try {
        const { results } = await env.QUIZ_DB.prepare(
            "SELECT grade_level, subject, topic FROM questions WHERE id = ?"
        ).bind(questionId).all();

        if (!results.length) return;
        const { grade_level, subject, topic } = results[0];

        await env.QUIZ_DB.prepare(
            `INSERT INTO learner_progress (learner_id, grade_level, subject, topic, questions_attempted, questions_correct, last_practiced)
       VALUES (?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(learner_id, grade_level, subject, topic) DO UPDATE SET
         questions_attempted = questions_attempted + 1,
         questions_correct = questions_correct + ?,
         last_practiced = CURRENT_TIMESTAMP`
        ).bind(learnerId, grade_level, subject, topic, isCorrect, isCorrect).run();
    } catch (e) {
        console.error("[Progress] Update error:", e);
    }
}

// ===================================================
// HELPER: Robust JSON Parser
// ===================================================
function parseJSON(text) {
    if (!text) return [];

    try {
        return JSON.parse(text);
    } catch (e) { }

    // Remove markdown code blocks
    let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

    try {
        return JSON.parse(cleaned);
    } catch (e) { }

    // Extract JSON array/object from text
    const match = cleaned.match(/[\[\{][\s\S]*[\]\}]/);
    if (match) {
        try {
            return JSON.parse(match[0]);
        } catch (e) { }
    }

    console.error("[JSON] Parse failed for:", text.substring(0, 300));
    return [];
}
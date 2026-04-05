// ============================================
// PEER-2-PEER PRO: Unified Auth + Quiz Worker
// ============================================

// 🔐 Admin Config (For dev only – use wrangler secret put for prod)
const ADMIN_EMAIL = "admin@peer-2-peer.co.za";
const ADMIN_PASSWORD = "Admin@2014"; // ⚠️ Change this before production

// 🌐 CORS Headers – Allow your domain
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://peer-2-peer.co.za",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true"
};

// 🔐 Password Hashing (PBKDF2)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial, 256
  );
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${saltHex}:${hashHex}`;
}

// 🔐 Password Verification
async function verifyPassword(password, storedHash) {
  if (!storedHash?.includes(":")) return false;
  try {
    const [saltHex, originalHashHex] = storedHash.split(":");
    const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw", encoder.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]
    );
    const hashBuffer = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      keyMaterial, 256
    );
    const currentHashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    return currentHashHex === originalHashHex;
  } catch (e) {
    console.error("Password verification failed:", e);
    return false;
  }
}

// 📡 Client Info Helper
function getClientInfo(request) {
  return {
    ip: request.headers.get("CF-Connecting-IP") || "unknown",
    userAgent: request.headers.get("User-Agent") || "unknown"
  };
}

// 🧠 Gemini API Helper – Generate Questions
async function generateWithGemini(env, grade, subject, topic, count, qType, r2Content = null) {
  if (!env.GEMINI_API_KEY || count <= 0) return [];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`;

  const contextPrompt = r2Content
    ? `\n\n📚 USE THIS CAPS SOURCE MATERIAL (prioritize accuracy):\n---\n${r2Content}\n---\n`
    : "\n\n📚 Base questions on the South African CAPS curriculum.";

  const prompt = `You are an expert CAPS curriculum examiner. Create exactly ${count} ${qType} questions for Grade ${grade} ${subject} on "${topic}". ${contextPrompt}

Return ONLY a valid JSON array (no markdown, no extra text):
[
  {
    "question_text": "Clear, curriculum-aligned question",
    "options": ["A", "B", "C", "D"], // Only for MCQ/TRUE_FALSE
    "correct_answer": "Exact correct answer text",
    "explanation": "Why this answer is correct (CAPS reference if possible)",
    "hint": "Helpful hint without giving away the answer"
  }
]`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }
      })
    });

    if (!response.ok) {
      console.error("Gemini API error:", await response.text());
      return [];
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    return parseJSON(text);
  } catch (e) {
    console.error("Gemini fetch error:", e);
    return [];
  }
}

// 🔍 R2 Content Search – Reduce Hallucinations
async function searchR2ForContent(env, grade, subject, topic) {
  if (!env.MY_BUCKET && !env.AI_FILES) return null;

  const bucket = env.AI_FILES || env.MY_BUCKET;
  const slugify = (str) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');

  const paths = [
    `caps/grade${grade}/${slugify(subject)}/${slugify(topic)}.txt`,
    `caps/grade${grade}/${slugify(subject)}/${topic}.txt`,
    `${slugify(subject)}/${slugify(topic)}.md`,
    `curriculum/${grade}/${subject}/${topic}.txt`
  ];

  for (const key of paths) {
    try {
      const obj = await bucket.get(key);
      if (obj) return (await obj.text()).substring(0, 12000); // Limit context
    } catch (e) { /* continue */ }
  }
  return null;
}

// 🧩 JSON Parser – Handle Gemini's occasional markdown
function parseJSON(text) {
  try { return JSON.parse(text); } catch (e) { }
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  try { return JSON.parse(cleaned); } catch (e) { }
  const match = cleaned.match(/[\[\{][\s\S]*[\]\}]/);
  if (match) try { return JSON.parse(match[0]); } catch (e) { }
  return [];
}

// 📚 Save Topic to Cache
async function saveTopic(db, grade, subject, topic) {
  try {
    await db.prepare(
      `INSERT INTO topics (grade_level, subject, topic_name, times_selected) 
       VALUES (?, ?, ?, 1) 
       ON CONFLICT(grade_level, subject, topic_name) 
       DO UPDATE SET times_selected = times_selected + 1`
    ).bind(grade, subject, topic).run();
  } catch (e) { console.warn("Topic save error:", e); }
}

// 📊 Update Learner Progress
async function updateLearnerProgress(db, learnerId, questionId, isCorrect) {
  try {
    await db.prepare(
      `INSERT INTO learner_progress (learner_id, question_id, correct_count, last_attempt)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(learner_id, question_id)
       DO UPDATE SET correct_count = correct_count + ?, last_attempt = datetime('now')`
    ).bind(learnerId, questionId || 0, isCorrect, isCorrect).run();
  } catch (e) { console.warn("Progress update error:", e); }
}

// 🎓 Grade Subjective Answers with Gemini
async function gradeSubjectiveWithGemini(env, answer, markingGuideline, questionType) {
  if (!env.GEMINI_API_KEY) return { score: 5, feedback: "Answer recorded for review." };

  const prompt = `You are a CAPS examiner. Grade this ${questionType} answer.
Marking Guideline: ${markingGuideline}
Student Answer: ${answer}

Return JSON: {"score": 0-10, "feedback": "Constructive, CAPS-aligned feedback"}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 }
      })
    });
    if (!response.ok) return { score: 5, feedback: "Answer recorded." };
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const result = parseJSON(text);
    return {
      score: Math.min(10, Math.max(0, result.score || 5)),
      feedback: result.feedback || "Good effort. Review the marking guideline."
    };
  } catch (e) {
    console.error("Grading error:", e);
    return { score: 5, feedback: "Answer recorded for manual review." };
  }
}

// ============================================
// 🚀 MAIN WORKER HANDLER (SINGLE EXPORT)
// ============================================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const now = Math.floor(Date.now() / 1000);

    // ✅ CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ============================================
      // 🔐 AUTHENTICATION ENDPOINTS (AUTH_DB)
      // ============================================

      // 🔑 Login
      if (path === "/api/login" && request.method === "POST") {
        const { email, password } = await request.json();
        const clientInfo = getClientInfo(request);

        // Admin bypass (dev only)
        if (email === ADMIN_EMAIL) {
          if (password === ADMIN_PASSWORD) {
            return new Response(JSON.stringify({
              success: true, email, name: "System Administrator", role: "admin",
              sessionId: "admin-" + Date.now()
            }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
          }
          return new Response(JSON.stringify({ success: false, error: "Invalid credentials" }), {
            status: 401, headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        // Normal user login
        const user = await env.AUTH_DB.prepare(
          "SELECT * FROM users WHERE LOWER(email) = LOWER(?)"
        ).bind(email).first();

        if (!user || !(await verifyPassword(password, user.password_hash))) {
          return new Response(JSON.stringify({ success: false, error: "Invalid email or password" }), {
            status: 401, headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        const userType = (user.user_type || " ").toLowerCase().trim();
        const accessValue = (user.Access || " ").toString().toLowerCase().trim();

        if (userType === "tutor" && accessValue !== "granted") {
          return new Response(JSON.stringify({
            success: false, error: "Your tutor account is pending approval. Contact admin."
          }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }

        // Update online status & log activity
        await env.AUTH_DB.prepare(
          "UPDATE users SET is_online = 1, last_login = ? WHERE email = ?"
        ).bind(now, email).run();

        const activity = await env.AUTH_DB.prepare(`
          INSERT INTO user_activity (user_id, email, user_type, login_time, ip_address, user_agent)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(user.id, email, userType, now, clientInfo.ip, clientInfo.userAgent).run();

        return new Response(JSON.stringify({
          success: true, email: user.email,
          name: user.first_name || email.split("@")[0],
          role: userType, sessionId: activity.meta?.last_row_id
        }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      // 📝 Signup
      if (path === "/api/signup" && request.method === "POST") {
        const data = await request.json();
        if (!data.email || !data.password || !data.firstName || !data.userType) {
          return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
            status: 400, headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        const passwordHash = await hashPassword(data.password);
        const accessStatus = data.userType.toLowerCase().trim() === "tutor" ? "not granted" : "granted";

        await env.AUTH_DB.prepare(`
          INSERT INTO users (
            first_name, last_name, email, password_hash, user_type, grade,
            school_name, phone_number, Access, data_consent_commercial
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          data.firstName.trim(), (data.lastName || " ").trim(),
          data.email.trim().toLowerCase(), passwordHash,
          data.userType.toLowerCase().trim(), (data.grade || " ").trim(),
          (data.schoolName || " ").trim(), (data.phone || " ").trim(),
          accessStatus, data.agreeTerms ? 1 : 0
        ).run();

        return new Response(JSON.stringify({
          success: true,
          message: data.userType.toLowerCase().trim() === "tutor"
            ? "Tutor account created! Awaiting admin approval."
            : "Account created successfully! You can now login."
        }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      // 🚪 Logout
      if (path === "/api/logout" && request.method === "POST") {
        const { email, sessionId } = await request.json();
        await env.AUTH_DB.prepare("UPDATE users SET is_online = 0 WHERE email = ?").bind(email).run();
        if (sessionId) {
          await env.AUTH_DB.prepare(`
            UPDATE user_activity SET logout_time = ?, session_duration = logout_time - login_time WHERE id = ?
          `).bind(Math.floor(Date.now() / 1000), sessionId).run();
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // 👥 Online Users (Admin)
      if (path === "/api/online-users" && request.method === "GET") {
        const result = await env.AUTH_DB.prepare(`
          SELECT id, first_name, last_name, email, user_type, Access, last_login 
          FROM users WHERE is_online = 1 ORDER BY last_login DESC
        `).all();
        return new Response(JSON.stringify({ success: true, users: result.results }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // ============================================
      // 🎓 QUIZ GENERATION ENDPOINTS (QUIZ_DB + GEMINI)
      // ============================================

      // ❤️ Health Check
      if (path === "/health") {
        return new Response(JSON.stringify({
          status: "OK",
          auth_db: !!env.AUTH_DB,
          quiz_db: !!env.QUIZ_DB,
          r2: !!(env.MY_BUCKET || env.AI_FILES),
          gemini: !!env.GEMINI_API_KEY
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ⚡ Generate Questions
      if (path === "/api/generate" && request.method === "POST") {
        const { grade, subject, topic, count = 5, type = "MCQ", learnerId = "anonymous" } = await request.json();

        if (!grade || !subject || !topic) {
          return new Response(JSON.stringify({ error: "Missing grade, subject, or topic" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        if (!env.GEMINI_API_KEY) {
          return new Response(JSON.stringify({
            error: "Gemini API key not configured. Run: wrangler secret put GEMINI_API_KEY"
          }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 1️⃣ Check Cache First (Reduce API calls & ensure consistency)
        const { results: cached } = await env.QUIZ_DB.prepare(
          `SELECT * FROM questions 
           WHERE grade_level = ? AND subject = ? AND topic = ? AND question_type = ? 
           ORDER BY times_used ASC, RANDOM() LIMIT ?`
        ).bind(grade, subject, topic, type, count).all();

        if (cached.length >= count) {
          for (const q of cached) {
            await env.QUIZ_DB.prepare("UPDATE questions SET times_used = times_used + 1 WHERE id = ?").bind(q.id).run();
          }
          await saveTopic(env.QUIZ_DB, grade, subject, topic);
          return new Response(JSON.stringify({
            questions: cached, source: "CACHE", cached: cached.length, new: 0
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 2️⃣ Fetch CAPS Source Material from R2 (Reduce hallucinations)
        const r2Content = await searchR2ForContent(env, grade, subject, topic);

        // 3️⃣ Generate Missing Questions with Gemini
        const needed = count - cached.length;
        const newQuestions = await generateWithGemini(env, grade, subject, topic, needed, type, r2Content);

        if (!newQuestions.length && !cached.length) {
          return new Response(JSON.stringify({ error: "Could not generate questions. Try a different topic." }), {
            status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // 4️⃣ Save New Questions to D1
        const savedQuestions = [];
        for (const q of newQuestions) {
          const sourceType = r2Content ? "R2_CAPS" : "AI_GENERATED";
          try {
            const inserted = await env.QUIZ_DB.prepare(
              `INSERT INTO questions 
               (grade_level, subject, topic, question_type, question_text, options, correct_answer, explanation, hint, source_type, times_used) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
            ).bind(
              grade, subject, topic, type,
              q.question_text || q.question,
              JSON.stringify(q.options || []),
              q.correct_answer,
              q.explanation || "Review the CAPS curriculum for this topic.",
              q.hint || "Think carefully about the key concepts.",
              sourceType
            ).run();
            savedQuestions.push({
              ...q, id: inserted.meta?.last_row_id, question_type: type,
              question_text: q.question_text || q.question,
              grade_level: grade, subject, topic, source_type: sourceType
            });
          } catch (dbErr) { console.error("DB insert error:", dbErr); }
        }

        await saveTopic(env.QUIZ_DB, grade, subject, topic);

        return new Response(JSON.stringify({
          questions: [...cached, ...savedQuestions],
          source: r2Content ? "R2_CAPS" : "AI_WEB",
          cached: cached.length, new: savedQuestions.length
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ✅ Submit Answer & Grade
      if (path === "/api/submit" && request.method === "POST") {
        const { learnerId, questionId, answer, questionType, correctAnswer, timeSpent = 0, hintUsed = 0 } = await request.json();
        let isCorrect = 0, score = 0, feedback = "";

        if (['MCQ', 'TRUE_FALSE'].includes(questionType)) {
          isCorrect = (answer?.trim().toLowerCase() === correctAnswer?.trim().toLowerCase()) ? 1 : 0;
          score = isCorrect * 10;
          feedback = isCorrect ? "✅ Correct!" : `❌ Incorrect. Answer: ${correctAnswer}`;
        } else {
          const aiResult = await gradeSubjectiveWithGemini(env, answer, correctAnswer, questionType);
          score = aiResult.score;
          isCorrect = score >= 5 ? 1 : 0;
          feedback = aiResult.feedback;
        }

        try {
          await env.QUIZ_DB.prepare(
            `INSERT INTO learner_attempts (learner_id, question_id, learner_answer, is_correct, score, time_spent_seconds, hint_used) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).bind(learnerId, questionId || 0, answer, isCorrect, score, timeSpent, hintUsed).run();
          await updateLearnerProgress(env.QUIZ_DB, learnerId, questionId, isCorrect);
        } catch (e) { console.error("Attempt save error:", e); }

        return new Response(JSON.stringify({ isCorrect, score, feedback, correctAnswer: isCorrect ? null : correctAnswer }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 📋 Get Available Topics
      if (path === "/api/topics" && request.method === "POST") {
        const { grade, subject } = await request.json();
        const { results } = await env.QUIZ_DB.prepare(
          "SELECT topic_name FROM topics WHERE grade_level = ? AND subject = ? ORDER BY times_selected DESC"
        ).bind(grade, subject).all();
        return new Response(JSON.stringify({ topics: results.map(r => r.topic_name) }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // ❌ 404 Fallback
      return new Response(JSON.stringify({ success: false, error: "Endpoint not found" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders }
      });

    } catch (err) {
      console.error("Worker error:", err);
      return new Response(JSON.stringify({ success: false, error: "Internal server error: " + err.message }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }
};
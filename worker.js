// ============================================
// PEER-2-PEER PRO: Unified Auth + Quiz Worker
// ============================================

// 🔐 Admin Config (Dev only. Use `wrangler secret put` for production)
const ADMIN_EMAIL = "admin@peer-2-peer.co.za";
const ADMIN_PASSWORD = "Admin@2014";

// 🌐 CORS Configuration
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://peer-2-peer.co.za",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true"
};

// ============================================
// 🔐 AUTH HELPERS
// ============================================
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
  const hashBuffer = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, 256);
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password, storedHash) {
  if (!storedHash?.includes(":")) return false;
  try {
    const [saltHex, originalHashHex] = storedHash.split(":");
    const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
    const hashBuffer = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, 256);
    const currentHashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
    return currentHashHex === originalHashHex;
  } catch { return false; }
}

function getClientInfo(request) {
  return {
    ip: request.headers.get("CF-Connecting-IP") || "unknown",
    userAgent: request.headers.get("User-Agent") || "unknown"
  };
}

// ============================================
// 🧠 AI & QUIZ HELPERS
// ============================================
function parseJSON(text) {
  if (!text) return [];
  try { return JSON.parse(text); } catch { }
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  try { return JSON.parse(cleaned); } catch { }
  const match = cleaned.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
  if (match) try { return JSON.parse(match[0]); } catch { }
  // Fallback: fix common Gemini formatting issues
  const fixed = cleaned.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}').replace(/'([^']*)'/g, '"$1"');
  try { return JSON.parse(fixed); } catch { return []; }
}

async function searchR2ForContent(env, grade, subject, topic) {
  // R2 is OPTIONAL. If bucket isn't bound or file doesn't exist, returns null safely.
  const bucket = env.MY_BUCKET || env.AI_FILES;
  if (!bucket) return null;

  const slug = (s) => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  const paths = [
    `caps/grade${grade}/${slug(subject)}/${slug(topic)}.txt`,
    `caps/grade${grade}/${slug(subject)}/${topic}.txt`,
    `${slug(subject)}/${slug(topic)}.md`
  ];
  for (const key of paths) {
    try {
      const obj = await bucket.get(key);
      if (obj) return (await obj.text()).substring(0, 10000);
    } catch { /* Ignore missing files, continue to next path */ }
  }
  return null;
}

async function generateWithGemini(env, grade, subject, topic, count, qType, r2Content = null) {
  if (!env.GEMINI_API_KEY || count <= 0) return [];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`;

  // Dynamic context: R2 first, fallback to CAPS knowledge
  const context = r2Content && r2Content.length > 50
    ? `\n📚 OFFICIAL CAPS SOURCE MATERIAL (base questions STRICTLY on this):\n---\n${r2Content.substring(0, 8000)}\n---`
    : `\n🌐 NO SOURCE FILE FOUND. Use your trained knowledge of the South African CAPS curriculum.\nFocus on core concepts, avoid hallucination, and ensure Grade-${grade} appropriate difficulty.`;

  const prompt = `You are an expert CAPS curriculum examiner. Create exactly ${count} ${qType} questions for Grade ${grade} ${subject} on "${topic}".
${context}

Requirements:
- Clear, unambiguous, age-appropriate for Grade ${grade}
- For MCQ/TRUE_FALSE: Provide plausible options, ONE correct answer
- Include: question_text, options (array), correct_answer, explanation, hint

📤 Return ONLY a valid JSON array. No markdown, no extra text:
[
  {"question_text":"...","options":["...","...","...","..."],"correct_answer":"...","explanation":"...","hint":"..."}
]`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 8192, responseMimeType: "application/json" }
      })
    });

    if (!response.ok) {
      console.error(`❌ Gemini API Error ${response.status}:`, await response.text());
      return [];
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const parsed = parseJSON(raw);

    // Normalize & validate response structure
    return parsed.filter(q => q.question_text && q.correct_answer).map(q => ({
      question_text: q.question_text,
      options: Array.isArray(q.options) ? q.options : [],
      correct_answer: q.correct_answer.toString(),
      explanation: q.explanation || "Review the CAPS curriculum for this concept.",
      hint: q.hint || "Think about key definitions and formulas."
    }));
  } catch (e) {
    console.error("💥 Gemini fetch error:", e);
    return [];
  }
}

async function saveTopic(db, grade, subject, topic) {
  try {
    await db.prepare(
      `INSERT INTO topics (grade_level, subject, topic_name, times_selected) VALUES (?, ?, ?, 1) 
       ON CONFLICT(grade_level, subject, topic_name) DO UPDATE SET times_selected = times_selected + 1`
    ).bind(grade, subject, topic).run();
  } catch (e) { console.warn("Topic save warning:", e.message); }
}

// ============================================
// 🚀 MAIN WORKER HANDLER (SINGLE EXPORT)
// ============================================
export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const now = Math.floor(Date.now() / 1000);

    try {
      // ============================================
      // 🔐 AUTHENTICATION ENDPOINTS (AUTH_DB)
      // ============================================
      if (path === "/api/login" && request.method === "POST") {
        const { email, password } = await request.json();
        if (!email || !password) {
          return new Response(JSON.stringify({ success: false, error: "Missing credentials" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }

        // Admin bypass
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
          return new Response(JSON.stringify({ success: true, email, name: "System Administrator", role: "admin", sessionId: "admin-" + Date.now() }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
        }

        // Normal user
        const user = await env.AUTH_DB.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)").bind(email).first();
        if (!user || !(await verifyPassword(password, user.password_hash))) {
          return new Response(JSON.stringify({ success: false, error: "Invalid email or password" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }

        const userType = (user.user_type || "").toLowerCase().trim();
        const access = (user.Access || "").toLowerCase().trim();
        if (userType === "tutor" && access !== "granted") {
          return new Response(JSON.stringify({ success: false, error: "Your tutor account is pending approval. Contact admin." }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }

        await env.AUTH_DB.prepare("UPDATE users SET is_online = 1, last_login = ? WHERE email = ?").bind(now, email).run();
        const activity = await env.AUTH_DB.prepare(`INSERT INTO user_activity (user_id, email, user_type, login_time, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)`).bind(user.id, email, userType, now, request.headers.get("CF-Connecting-IP") || "unknown", request.headers.get("User-Agent") || "unknown").run();

        return new Response(JSON.stringify({ success: true, email: user.email, name: user.first_name || email.split("@")[0], role: userType, sessionId: activity.meta?.last_row_id }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      if (path === "/api/signup" && request.method === "POST") {
        const data = await request.json();
        if (!data.email || !data.password || !data.firstName || !data.userType) {
          return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }

        const hash = await hashPassword(data.password);
        const access = data.userType.toLowerCase().trim() === "tutor" ? "not granted" : "granted";

        await env.AUTH_DB.prepare(`INSERT INTO users (first_name, last_name, email, password_hash, user_type, grade, school_name, phone_number, Access, data_consent_commercial) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(data.firstName.trim(), (data.lastName || "").trim(), data.email.trim().toLowerCase(), hash, data.userType.toLowerCase().trim(), (data.grade || "").trim(), (data.schoolName || "").trim(), (data.phone || "").trim(), access, data.agreeTerms ? 1 : 0).run();

        return new Response(JSON.stringify({ success: true, message: data.userType.toLowerCase().trim() === "tutor" ? "Tutor account created! Awaiting admin approval." : "Account created successfully! You can now login." }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      if (path === "/api/logout" && request.method === "POST") {
        const { email, sessionId } = await request.json();
        if (email) await env.AUTH_DB.prepare("UPDATE users SET is_online = 0 WHERE email = ?").bind(email).run();
        if (sessionId) await env.AUTH_DB.prepare("UPDATE user_activity SET logout_time = ?, session_duration = logout_time - login_time WHERE id = ?").bind(Math.floor(Date.now() / 1000), sessionId).run();
        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      if (path === "/api/online-users" && request.method === "GET") {
        const res = await env.AUTH_DB.prepare("SELECT id, first_name, last_name, email, user_type, Access, last_login FROM users WHERE is_online = 1 ORDER BY last_login DESC").all();
        return new Response(JSON.stringify({ success: true, users: res.results }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      // ============================================
      // 🎓 QUIZ & AI ENDPOINTS (QUIZ_DB)
      // ============================================
      if (path === "/health") {
        return new Response(JSON.stringify({ status: "OK", auth_db: !!env.AUTH_DB, quiz_db: !!env.QUIZ_DB, r2: !!(env.MY_BUCKET || env.AI_FILES), gemini: !!env.GEMINI_API_KEY }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (path === "/api/generate" && request.method === "POST") {
        const { grade, subject, topic, count = 5, type = "MCQ" } = await request.json();
        if (!grade || !subject || !topic) return new Response(JSON.stringify({ error: "Missing grade, subject, or topic" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (!env.GEMINI_API_KEY) return new Response(JSON.stringify({ error: "Gemini API key missing. Contact admin." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        // 1. Check Cache
        const { results: cached } = await env.QUIZ_DB.prepare(`SELECT * FROM questions WHERE grade_level = ? AND subject = ? AND topic = ? AND question_type = ? ORDER BY times_used ASC, RANDOM() LIMIT ?`).bind(grade, subject, topic, type, count).all();
        if (cached.length >= count) {
          for (const q of cached) await env.QUIZ_DB.prepare("UPDATE questions SET times_used = times_used + 1 WHERE id = ?").bind(q.id).run();
          await saveTopic(env.QUIZ_DB, grade, subject, topic);
          return new Response(JSON.stringify({ questions: cached, source: "CACHE", cached: cached.length, new: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 2. Try R2 (Optional & Safe)
        let r2Content = null;
        try { r2Content = await searchR2ForContent(env, grade, subject, topic); } catch { }

        // 3. Generate with Gemini (Works WITH or WITHOUT R2)
        const needed = count - cached.length;
        const newQs = await generateWithGemini(env, grade, subject, topic, needed, type, r2Content);

        // 4. Fail gracefully only if BOTH cache & AI return nothing
        if (cached.length === 0 && newQs.length === 0) {
          return new Response(JSON.stringify({ error: "Could not generate questions. Try a different topic or check API key." }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 5. Save New Questions
        const saved = [];
        const sourceType = r2Content ? "R2_CAPS" : "AI_GENERATED";
        for (const q of newQs) {
          try {
            const res = await env.QUIZ_DB.prepare(`INSERT INTO questions (grade_level, subject, topic, question_type, question_text, options, correct_answer, explanation, hint, source_type, times_used) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`).bind(grade, subject, topic, type, q.question_text, JSON.stringify(q.options), q.correct_answer, q.explanation, q.hint, sourceType).run();
            saved.push({ ...q, id: res.meta?.last_row_id, grade_level: grade, subject, topic, question_type: type, source_type: sourceType });
          } catch (e) { console.error("DB Save Error:", e.message); }
        }

        await saveTopic(env.QUIZ_DB, grade, subject, topic);
        return new Response(JSON.stringify({ questions: [...cached, ...saved], source: sourceType, cached: cached.length, new: saved.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (path === "/api/submit" && request.method === "POST") {
        const { learnerId, questionId, answer, questionType, correctAnswer, timeSpent = 0, hintUsed = 0 } = await request.json();
        let isCorrect = 0, score = 0, feedback = "";
        if (['MCQ', 'TRUE_FALSE'].includes(questionType)) {
          isCorrect = (answer?.trim().toLowerCase() === correctAnswer?.trim().toLowerCase()) ? 1 : 0;
          score = isCorrect * 10;
          feedback = isCorrect ? "✅ Correct!" : `❌ Incorrect. Answer: ${correctAnswer}`;
        } else {
          score = 5; feedback = "Answer recorded for review."; isCorrect = 0;
        }
        try {
          await env.QUIZ_DB.prepare(`INSERT INTO learner_attempts (learner_id, question_id, learner_answer, is_correct, score, time_spent_seconds, hint_used) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(learnerId, questionId || 0, answer, isCorrect, score, timeSpent, hintUsed).run();
        } catch (e) { console.warn("Attempt log error:", e.message); }
        return new Response(JSON.stringify({ isCorrect, score, feedback, correctAnswer: isCorrect ? null : correctAnswer }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (path === "/api/topics" && request.method === "POST") {
        const { grade, subject } = await request.json();
        const { results } = await env.QUIZ_DB.prepare("SELECT topic_name FROM topics WHERE grade_level = ? AND subject = ? ORDER BY times_selected DESC").bind(grade, subject).all();
        return new Response(JSON.stringify({ topics: results.map(r => r.topic_name) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ❌ 404 Fallback
      return new Response(JSON.stringify({ success: false, error: "Endpoint not found" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });

    } catch (err) {
      console.error("💥 Worker Error:", err);
      return new Response(JSON.stringify({ success: false, error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }
};
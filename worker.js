var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ✅ FIXED CORS: REMOVED TRAILING SPACES
var corsHeaders = {
  "Access-Control-Allow-Origin": "https://peer-2-peer.co.za",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true"
};

// Password hashing functions (keep your existing ones)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
__name(hashPassword, "hashPassword");

async function verifyPassword(password, hash) {
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
}
__name(verifyPassword, "verifyPassword");

function getClientInfo(request) {
  return {
    ip: request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown",
    userAgent: request.headers.get("User-Agent") || "unknown"
  };
}
__name(getClientInfo, "getClientInfo");

var worker_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);
    const now = Math.floor(Date.now() / 1000);

    try {
      // 🔑 LOGIN ENDPOINT - FIXED TUTOR ACCESS LOGIC
      if (url.pathname === "/api/login" && request.method === "POST") {
        const { email, password } = await request.json();
        const clientInfo = getClientInfo(request);

        // Get user from database
        const user = await env.DB.prepare(`
          SELECT * FROM users WHERE email = ?
        `).bind(email).first();

        if (!user) {
          return new Response(JSON.stringify({
            success: false,
            error: "Invalid Credentials"
          }), { status: 401, headers: corsHeaders });
        }

        // Verify password first (security: don't reveal if email exists)
        const passwordValid = await verifyPassword(password, user.password_hash);
        if (!passwordValid) {
          return new Response(JSON.stringify({
            success: false,
            error: "Invalid Credentials"
          }), { status: 401, headers: corsHeaders });
        }

        // Get user type and access status
        const userType = (user.user_type || "").toLowerCase().trim();
        // IMPORTANT: Check column name - it's "Access" with capital A in your schema
        const accessValue = (user.Access || user.access || "").toString().trim().toLowerCase();

        console.log(`Login attempt - User: ${email}, Type: ${userType}, Access: ${accessValue}`);

        // ✅ TUTOR RULE: Must have EXACT string "granted" to login
        if (userType === "tutor") {
          if (accessValue !== "granted") {
            return new Response(JSON.stringify({
              success: false,
              error: "Your tutor account is pending approval. Please wait for admin to grant access."
            }), { status: 403, headers: corsHeaders });
          }
        }
        // ✅ STUDENTS: Can always login (access field doesn't matter)

        // Update online status in users table
        await env.DB.prepare(`
          UPDATE users 
          SET is_online = 1, last_login = ?
          WHERE email = ?
        `).bind(now, email).run();

        // Create session record in user_sessions table
        const sessionResult = await env.DB.prepare(`
          INSERT INTO user_sessions (
            user_id, email, user_type, login_time, ip_address, user_agent
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          user.id,
          email,
          userType,
          now,
          clientInfo.ip,
          clientInfo.userAgent
        ).run();

        return new Response(JSON.stringify({
          success: true,
          email: user.email,
          name: user.first_name || user.firstName || "",
          role: userType,
          sessionId: sessionResult.lastRowId
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // 🔑 LOGOUT ENDPOINT - UPDATED to use user_sessions
      if (url.pathname === "/api/logout" && request.method === "POST") {
        const { email, sessionId } = await request.json();
        const now = Math.floor(Date.now() / 1000);

        // Update user's online status
        await env.DB.prepare(`
          UPDATE users SET is_online = 0 WHERE email = ?
        `).bind(email).run();

        // Update session with logout time and calculate duration
        if (sessionId) {
          // Get login time first
          const session = await env.DB.prepare(`
            SELECT login_time FROM user_sessions WHERE id = ? AND email = ?
          `).bind(sessionId, email).first();

          if (session) {
            const duration = now - session.login_time;
            await env.DB.prepare(`
              UPDATE user_sessions 
              SET logout_time = ?, session_duration = ?
              WHERE id = ? AND email = ?
            `).bind(now, duration, sessionId, email).run();
          }
        }

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // 🔑 SIGNUP ENDPOINT - FIXED ACCESS VALUES
      if (url.pathname === "/api/signup" && request.method === "POST") {
        const d = await request.json();
        const secureHash = await hashPassword(d.password);

        // Set access: "granted" for students, "not granted" for tutors (pending approval)
        const accessValue = d.userType.toLowerCase() === "tutor" ? "not granted" : "granted";

        // Check which column names your form uses
        const firstName = d.firstName || d.first_name || "";
        const lastName = d.lastName || d.last_name || "";
        const grade = d.grade || "";
        const schoolName = d.schoolName || d.school_name || "";
        const phoneNumber = d.phone || d.phoneNumber || d.phone_number || "";

        await env.DB.prepare(`
          INSERT INTO users (
            first_name, last_name, email, password_hash, user_type, grade, 
            school_name, phone_number, access, is_online
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `).bind(
          firstName, lastName, d.email, secureHash,
          d.userType.toLowerCase(), grade, schoolName, phoneNumber, accessValue
        ).run();

        return new Response(JSON.stringify({
          success: true,
          message: d.userType.toLowerCase() === "tutor"
            ? "Tutor account created. Please wait for admin approval."
            : "Account created successfully!"
        }), { headers: corsHeaders });
      }

      // 🔍 GET ONLINE USERS (for admin dashboard)
      if (url.pathname === "/api/online-users" && request.method === "GET") {
        const onlineUsers = await env.DB.prepare(`
          SELECT email, first_name, last_name, user_type, last_login 
          FROM users 
          WHERE is_online = 1
          ORDER BY last_login DESC
        `).all();

        return new Response(JSON.stringify({
          success: true,
          users: onlineUsers.results || []
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // 📊 GET USER SESSIONS (for analytics)
      if (url.pathname === "/api/user-sessions" && request.method === "GET") {
        const urlParams = new URLSearchParams(url.search);
        const email = urlParams.get('email');
        const days = parseInt(urlParams.get('days')) || 7;

        const cutoffTime = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);

        let query = `
          SELECT * FROM user_sessions 
          WHERE login_time > ?
        `;
        const params = [cutoffTime];

        if (email) {
          query += ` AND email = ?`;
          params.push(email);
        }

        query += ` ORDER BY login_time DESC`;

        const sessions = await env.DB.prepare(query).bind(...params).all();

        return new Response(JSON.stringify({
          success: true,
          sessions: sessions.results || []
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // 🔑 FORGOT PASSWORD ENDPOINT
      if (url.pathname === "/api/forgot-password" && request.method === "POST") {
        const { email } = await request.json();
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour

        await env.DB.prepare(`
          UPDATE users 
          SET reset_token = ?, reset_expiry = ?
          WHERE email = ?
        `).bind(token, expiry, email).run();

        // In production, send email here
        return new Response(JSON.stringify({
          success: true,
          token: token // Remove this in production
        }), { headers: corsHeaders });
      }

      return new Response("Not Found", { status: 404, headers: corsHeaders });

    } catch (err) {
      console.error("Worker error:", err);
      return new Response(JSON.stringify({
        success: false,
        error: err.message
      }), { status: 500, headers: corsHeaders });
    }
  }
};

export { worker_default as default };
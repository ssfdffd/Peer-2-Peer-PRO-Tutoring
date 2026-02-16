var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ✅ FIXED CORS - Use * for testing, then change back to your domain
var corsHeaders = {
  "Access-Control-Allow-Origin": "https://peer-2-peer.co.za",  // Changed to * for testing
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true"
};

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
    // Handle OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);
    const now = Math.floor(Date.now() / 1000);

    try {
      // Test endpoint to check if worker is reachable
      if (url.pathname === "/api/test") {
        return new Response(JSON.stringify({
          success: true,
          message: "Worker is running",
          timestamp: now
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 🔑 LOGIN ENDPOINT
      if (url.pathname === "/api/login" && request.method === "POST") {
        try {
          const { email, password } = await request.json();

          if (!email || !password) {
            return new Response(JSON.stringify({
              success: false,
              error: "Email and password required"
            }), { status: 400, headers: corsHeaders });
          }

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

          // Verify password
          const passwordValid = await verifyPassword(password, user.password_hash);
          if (!passwordValid) {
            return new Response(JSON.stringify({
              success: false,
              error: "Invalid Credentials"
            }), { status: 401, headers: corsHeaders });
          }

          // Get user type and access status
          const userType = (user.user_type || "").toLowerCase().trim();
          // Check both possible column names
          const accessValue = (user.Access || user.access || "").toString().trim().toLowerCase();

          // TUTOR RULE: Must have "granted" to login
          if (userType === "tutor") {
            if (accessValue !== "granted") {
              return new Response(JSON.stringify({
                success: false,
                error: "Your tutor account is pending approval. Please wait for admin to grant access."
              }), { status: 403, headers: corsHeaders });
            }
          }

          // Update online status
          await env.DB.prepare(`
            UPDATE users 
            SET is_online = 1, last_login = ?
            WHERE email = ?
          `).bind(now, email).run();

          // Create session record
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
            name: user.first_name || "",
            role: userType,
            sessionId: sessionResult.lastRowId
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

        } catch (error) {
          console.error("Login error:", error);
          return new Response(JSON.stringify({
            success: false,
            error: "Server error during login: " + error.message
          }), { status: 500, headers: corsHeaders });
        }
      }

      // 🔑 LOGOUT ENDPOINT
      if (url.pathname === "/api/logout" && request.method === "POST") {
        try {
          const { email, sessionId } = await request.json();
          const now = Math.floor(Date.now() / 1000);

          // Update user's online status
          await env.DB.prepare(`
            UPDATE users SET is_online = 0 WHERE email = ?
          `).bind(email).run();

          // Update session with logout time
          if (sessionId) {
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

        } catch (error) {
          console.error("Logout error:", error);
          return new Response(JSON.stringify({
            success: false,
            error: error.message
          }), { status: 500, headers: corsHeaders });
        }
      }

      // 🔑 SIGNUP ENDPOINT
      if (url.pathname === "/api/signup" && request.method === "POST") {
        try {
          const d = await request.json();
          const secureHash = await hashPassword(d.password);

          // Set access: "granted" for students, "not granted" for tutors
          const accessValue = d.userType.toLowerCase() === "tutor" ? "not granted" : "granted";

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

        } catch (error) {
          console.error("Signup error:", error);
          return new Response(JSON.stringify({
            success: false,
            error: error.message
          }), { status: 500, headers: corsHeaders });
        }
      }

      return new Response(JSON.stringify({
        success: false,
        error: "Not Found"
      }), { status: 404, headers: corsHeaders });

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
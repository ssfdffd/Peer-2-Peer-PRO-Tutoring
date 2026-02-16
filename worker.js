var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ✅ FIXED CORS: NO TRAILING SPACES IN KEYS OR VALUES
var corsHeaders = {
  "Access-Control-Allow-Origin": "https://peer-2-peer.co.za",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true"
};

// ✅ PROPER PASSWORD HASHING (PBKDF2 - matches signup)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${saltHex}:${hashHex}`;
}
__name(hashPassword, "hashPassword");

// ✅ PROPER PASSWORD VERIFICATION (matches hash format)
async function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  try {
    const [saltHex, originalHashHex] = storedHash.split(":");
    const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );
    const hashBuffer = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      256
    );
    const currentHashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    return currentHashHex === originalHashHex;
  } catch (e) {
    console.error("Password verification error:", e);
    return false;
  }
}
__name(verifyPassword, "verifyPassword");

function getClientInfo(request) {
  return {
    ip: request.headers.get("CF-Connecting-IP") || "unknown",
    userAgent: request.headers.get("User-Agent") || "unknown"
  };
}
__name(getClientInfo, "getClientInfo");

var worker_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const now = Math.floor(Date.now() / 1000);

    try {
      // 🔑 LOGIN ENDPOINT - FIXED PASSWORD VALIDATION + ACCESS CHECK
      if (url.pathname === "/api/login" && request.method === "POST") {
        const { email, password } = await request.json();
        const clientInfo = getClientInfo(request);

        // Get user (case-insensitive email match)
        const user = await env.DB.prepare(
          "SELECT * FROM users WHERE LOWER(email) = LOWER(?)"
        ).bind(email).first();

        if (!user) {
          return new Response(JSON.stringify({
            success: false,
            error: "Invalid email or password"
          }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // ✅ CRITICAL FIX 1: Verify password FIRST before any access checks
        const passwordValid = await verifyPassword(password, user.password_hash);
        if (!passwordValid) {
          return new Response(JSON.stringify({
            success: false,
            error: "Invalid email or password"
          }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // ✅ CRITICAL FIX 2: Handle TEXT "access" column correctly (case-insensitive)
        const userType = (user.user_type || "").toLowerCase().trim();
        const accessValue = (user.access || "").toString().trim().toLowerCase();

        // Block tutors without "granted" access
        if (userType === "tutor" && accessValue !== "granted") {
          return new Response(JSON.stringify({
            success: false,
            error: "Your tutor account is pending approval. Contact admin for access."
          }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Update online status
        await env.DB.prepare(
          "UPDATE users SET is_online = 1, last_login = ? WHERE email = ?"
        ).bind(now, email).run();

        // Record activity
        const activity = await env.DB.prepare(`
          INSERT INTO user_activity (user_id, email, user_type, login_time, ip_address, user_agent)
          VALUES (?, ?, ?, ?, ?, ?)
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
          name: user.first_name || "User",
          role: userType,
          sessionId: activity.lastRowId
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 🔑 SIGNUP ENDPOINT - HASH PASSWORD + SET ACCESS CORRECTLY
      if (url.pathname === "/api/signup" && request.method === "POST") {
        const data = await request.json();

        // Validate required fields
        if (!data.email || !data.password || !data.firstName || !data.userType) {
          return new Response(JSON.stringify({
            success: false,
            error: "Missing required fields"
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Hash password securely
        const passwordHash = await hashPassword(data.password);

        // Set access status: students="granted", tutors="not granted"
        const accessStatus = data.userType.toLowerCase() === "tutor" ? "not granted" : "granted";

        // Insert user with ALL required fields
        await env.DB.prepare(`
          INSERT INTO users (
            first_name, last_name, email, password_hash, user_type, grade, 
            school_name, phone_number, access, data_consent_commercial
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          data.firstName.trim(),
          (data.lastName || "").trim(),
          data.email.trim().toLowerCase(),
          passwordHash,
          data.userType.toLowerCase(),
          (data.grade || "").trim(),
          (data.schoolName || "").trim(),
          (data.phone || "").trim(),
          accessStatus,
          data.agreeTerms ? 1 : 0
        ).run();

        return new Response(JSON.stringify({
          success: true,
          message: data.userType.toLowerCase() === "tutor"
            ? "Tutor account created! Awaiting admin approval."
            : "Account created successfully! You can now login."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 🔑 LOGOUT ENDPOINT
      if (url.pathname === "/api/logout" && request.method === "POST") {
        const { email, sessionId } = await request.json();
        const logoutTime = Math.floor(Date.now() / 1000);

        // Update online status
        await env.DB.prepare("UPDATE users SET is_online = 0 WHERE email = ?")
          .bind(email)
          .run();

        // Record logout time
        if (sessionId) {
          await env.DB.prepare(`
            UPDATE user_activity 
            SET logout_time = ?, session_duration = (logout_time - login_time)
            WHERE id = ?
          `).bind(logoutTime, sessionId).run();
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 🔑 ONLINE USERS ENDPOINT (for admin)
      if (url.pathname === "/api/online-users" && request.method === "GET") {
        const result = await env.DB.prepare(`
          SELECT id, first_name, last_name, email, user_type, access, last_login 
          FROM users 
          WHERE is_online = 1
          ORDER BY last_login DESC
        `).all();

        return new Response(JSON.stringify({
          success: true,
          users: result.results
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 🔑 FORGOT PASSWORD (minimal implementation)
      if (url.pathname === "/api/forgot-password" && request.method === "POST") {
        const { email } = await request.json();
        // In production: generate token, send email, store token with expiry
        return new Response(JSON.stringify({
          success: true,
          message: "If account exists, reset instructions sent"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 404 for unknown routes
      return new Response(JSON.stringify({
        success: false,
        error: "Endpoint not found"
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (err) {
      console.error("Worker error:", err);
      return new Response(JSON.stringify({
        success: false,
        error: "Internal server error"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};

export { worker_default as default };
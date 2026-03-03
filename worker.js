// ============================================
// PEER-2-PEER PRO AUTHENTICATION WORKER
// ============================================

// ✅ ADMIN CONFIGURATION
// For better security, use Wrangler Secrets: `wrangler secret put ADMIN_PASSWORD`
// Then access via env.ADMIN_PASSWORD. For now, we hardcode as requested.
const ADMIN_EMAIL = "admin@peer-2-peer.co.za";
const ADMIN_PASSWORD = "Admin@2014"; // ⚠️ CHANGE THIS PASSWORD

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://peer-2-peer.co.za",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true"
};

// ✅ PASSWORD HASHING
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

// ✅ PASSWORD VERIFICATION
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
    console.error("Password verification failed: ", e);
    return false;
  }
}

function getClientInfo(request) {
  return {
    ip: request.headers.get("CF-Connecting-IP") || "unknown",
    userAgent: request.headers.get("User-Agent") || "unknown"
  };
}

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const now = Math.floor(Date.now() / 1000);

    try {
      // 🔑 LOGIN ENDPOINT
      if (url.pathname === "/api/login" && request.method === "POST") {
        const { email, password } = await request.json();
        const clientInfo = getClientInfo(request);

        // ✅ HARDCODED ADMIN CHECK (Bypasses Database)
        if (email === ADMIN_EMAIL) {
          if (password === ADMIN_PASSWORD) {
            return new Response(JSON.stringify({
              success: true,
              email: email,
              name: "System Administrator",
              role: "admin",
              sessionId: "admin-" + Date.now()
            }), {
              status: 200,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          } else {
            return new Response(JSON.stringify({
              success: false,
              error: "Invalid credentials"
            }), {
              status: 401,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
        }

        // ✅ NORMAL USER CHECK (Database)
        const user = await env.DB.prepare(
          "SELECT * FROM users WHERE LOWER(email) = LOWER(?)"
        ).bind(email).first();

        if (!user) {
          return new Response(JSON.stringify({
            success: false,
            error: "Invalid email or password"
          }), {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        if (!(await verifyPassword(password, user.password_hash))) {
          return new Response(JSON.stringify({
            success: false,
            error: "Invalid email or password"
          }), {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        const userType = (user.user_type || " ").toLowerCase().trim();
        const AccessValue = (user.Access || " ").toString().toLowerCase().trim();

        if (userType === "tutor" && AccessValue !== "granted") {
          return new Response(JSON.stringify({
            success: false,
            error: "Your tutor account is pending approval. Contact admin for access."
          }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders }
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
          name: user.first_name || email.split("@")[0],
          role: userType,
          sessionId: activity.lastRowId
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // 📝 SIGNUP ENDPOINT
      if (url.pathname === "/api/signup" && request.method === "POST") {
        const data = await request.json();

        if (!data.email || !data.password || !data.firstName || !data.userType) {
          return new Response(JSON.stringify({
            success: false,
            error: "Missing required fields"
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        const passwordHash = await hashPassword(data.password);
        const AccessStatus = data.userType.toLowerCase().trim() === "tutor"
          ? "not granted"
          : "granted";

        await env.DB.prepare(`
          INSERT INTO users (
            first_name, last_name, email, password_hash, user_type, grade,
            school_name, phone_number, Access, data_consent_commercial
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          data.firstName.trim(),
          (data.lastName || " ").trim(),
          data.email.trim().toLowerCase(),
          passwordHash,
          data.userType.toLowerCase().trim(),
          (data.grade || " ").trim(),
          (data.schoolName || " ").trim(),
          (data.phone || " ").trim(),
          AccessStatus,
          data.agreeTerms ? 1 : 0
        ).run();

        return new Response(JSON.stringify({
          success: true,
          message: data.userType.toLowerCase().trim() === "tutor"
            ? "Tutor account created! Awaiting admin approval."
            : "Account created successfully! You can now login."
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // 🚪 LOGOUT ENDPOINT
      if (url.pathname === "/api/logout" && request.method === "POST") {
        const { email, sessionId } = await request.json();
        const logoutTime = Math.floor(Date.now() / 1000);

        await env.DB.prepare("UPDATE users SET is_online = 0 WHERE email = ?")
          .bind(email)
          .run();

        if (sessionId) {
          await env.DB.prepare(`
            UPDATE user_activity 
            SET logout_time = ?, session_duration = (logout_time - login_time)
            WHERE id = ?
          `).bind(logoutTime, sessionId).run();
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // 👥 ONLINE USERS ENDPOINT
      if (url.pathname === "/api/online-users" && request.method === "GET") {
        const result = await env.DB.prepare(`
          SELECT id, first_name, last_name, email, user_type, Access, last_login 
          FROM users 
          WHERE is_online = 1
          ORDER BY last_login DESC
        `).all();

        return new Response(JSON.stringify({
          success: true,
          users: result.results
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // ❌ 404
      return new Response(JSON.stringify({
        success: false,
        error: "Endpoint not found"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });

    } catch (err) {
      console.error("Worker error: ", err);
      return new Response(JSON.stringify({
        success: false,
        error: "Internal server error"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }
};
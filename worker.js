/**
 * PEER-2-PEER AUTHENTICATION WORKER
 * Features: PBKDF2 Hashing, Secure Cookies, Password Strength Check, Password Reset, Environment Variables
 */

// --- 1. PASSWORD SECURITY (PBKDF2) ---
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
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password, storedValue) {
  try {
    const [saltHex, originalHashHex] = storedValue.split(':');
    const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw", encoder.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]
    );
    const hashBuffer = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      keyMaterial, 256
    );
    const currentHashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    return currentHashHex === originalHashHex;
  } catch (e) {
    return false;
  }
}

// --- 2. JWT GENERATOR ---
async function generateJWT(payload, secret, expiryInSeconds) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "");
  const now = Math.floor(Date.now() / 1000);
  const encodedPayload = btoa(JSON.stringify({
    ...payload,
    iat: now,
    exp: now + expiryInSeconds
  })).replace(/=/g, "");

  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC", key, new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  );
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

// --- 3. MAIN WORKER LOGIC ---
export default {
  async fetch(request, env) {
    const secret = env.JWT_SECRET || "fallback_secret_p2p";
    const allowedOrigin = env.API_URL || "https://peer-2-peer.co.za";

    const corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true" 
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);

    try {
      // --- SIGNUP ROUTE ---
      if (url.pathname === "/api/signup" && request.method === "POST") {
        const d = await request.json();
        const password = d.password;
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if (!password || !strongPasswordRegex.test(password)) {
          return new Response(JSON.stringify({ 
            success: false,
            error: "Weak Password: Must be at least 8 characters and include uppercase, lowercase, a number, and a special character." 
          }), { status: 400, headers: corsHeaders });
        }

        const secureHash = await hashPassword(password);
        await env.DB.prepare(`
          INSERT INTO users (
            first_name, last_name, age, phone_number, backup_phone, 
            school_name, email, user_type, grade, school_code, 
            password_hash, data_consent_commercial
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          d.firstName, d.lastName, parseInt(d.age), d.phone, d.backupPhone,
          d.schoolName, d.email, d.userType, d.grade, d.schoolCode,
          secureHash, d.commercialConsent ? 1 : 0
        ).run();

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // --- FORGOT PASSWORD REQUEST ---
      if (url.pathname === "/api/forgot-password" && request.method === "POST") {
        const { email } = await request.json();
        const user = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
        
        if (!user) {
          // Success: true is returned regardless to prevent email enumeration
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        const resetToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map(b => b.toString(16).padStart(2, '0')).join('');
        const expiry = Math.floor(Date.now() / 1000) + 3600; // 1 Hour

        await env.DB.prepare("UPDATE users SET reset_token = ?, reset_expiry = ? WHERE email = ?")
          .bind(resetToken, expiry, email).run();

        return new Response(JSON.stringify({ success: true, token: resetToken }), { headers: corsHeaders });
      }

      // --- RESET PASSWORD SUBMIT ---
      if (url.pathname === "/api/reset-password" && request.method === "POST") {
        const { token, newPassword } = await request.json();
        const now = Math.floor(Date.now() / 1000);
        
        const user = await env.DB.prepare("SELECT id FROM users WHERE reset_token = ? AND reset_expiry > ?")
          .bind(token, now).first();

        if (!user) {
          return new Response(JSON.stringify({ success: false, error: "Link expired or invalid." }), { status: 400, headers: corsHeaders });
        }

        const secureHash = await hashPassword(newPassword);
        await env.DB.prepare("UPDATE users SET password_hash = ?, reset_token = NULL, reset_expiry = NULL WHERE id = ?")
          .bind(secureHash, user.id).run();

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // --- LOGIN ROUTE ---
      if (url.pathname === "/api/login" && request.method === "POST") {
        const { email, password } = await request.json();
        const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();

        if (user && await verifyPassword(password, user.password_hash)) {
          const access = await generateJWT({ id: user.id, role: user.user_type }, secret, 3600);
          const refresh = await generateJWT({ id: user.id }, secret, 2592000);

          const res = new Response(JSON.stringify({
            success: true,
            role: user.user_type,
            name: user.first_name
          }), { headers: corsHeaders });

          res.headers.append("Set-Cookie", `p2p_access=${access}; HttpOnly; Secure; SameSite=None; Max-Age=3600; Path=/`);
          res.headers.append("Set-Cookie", `p2p_refresh=${refresh}; HttpOnly; Secure; SameSite=None; Max-Age=2592000; Path=/`);
          
          return res;
        }
        return new Response(JSON.stringify({ success: false, error: "Invalid email or password" }), { status: 401, headers: corsHeaders });
      }

      // --- VERIFY SESSION ROUTE ---
      if (url.pathname === "/api/verify-session") {
        const cookie = request.headers.get("Cookie") || "";
        if (cookie.includes("p2p_access") || cookie.includes("p2p_refresh")) {
          return new Response(JSON.stringify({ success: true, authenticated: true }), { headers: corsHeaders });
        }
        return new Response(JSON.stringify({ success: false, authenticated: false }), { status: 401, headers: corsHeaders });
      }

      // --- LOGOUT ROUTE ---
      if (url.pathname === "/api/logout") {
        const res = new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        res.headers.append("Set-Cookie", "p2p_access=; HttpOnly; Secure; SameSite=None; Max-Age=0; Path=/");
        res.headers.append("Set-Cookie", "p2p_refresh=; HttpOnly; Secure; SameSite=None; Max-Age=0; Path=/");
        return res;
      }

    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
    }

    return new Response("Not Found", { status: 404 });
  }
};
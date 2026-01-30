/**
 * PEER-2-PEER AUTHENTICATION WORKER
 * Features: PBKDF2 Hashing, Secure Cookies, 30-Day Refresh Tokens
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

// --- 2. JWT GENERATOR (Access & Refresh) ---
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
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://peer-2-peer.co.za",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true" 
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);
    const secret = env.JWT_SECRET || "default_secret_p2p_2024";

    try {
      // --- SIGNUP ROUTE ---
      if (url.pathname === "/api/signup" && request.method === "POST") {
        const d = await request.json();
        const secureHash = await hashPassword(d.password);

        try {
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
        } catch (dbErr) {
          if (dbErr.message.includes("UNIQUE")) {
            return new Response(JSON.stringify({ error: "Email already registered." }), { status: 400, headers: corsHeaders });
          }
          throw dbErr;
        }
      }

      // --- LOGIN ROUTE (SETS COOKIES) ---
      if (url.pathname === "/api/login" && request.method === "POST") {
        const { email, password } = await request.json();
        const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();

        if (user && await verifyPassword(password, user.password_hash)) {
          // Access Token (1 Hour) & Refresh Token (30 Days)
          const access = await generateJWT({ id: user.id, role: user.user_type }, secret, 3600);
          const refresh = await generateJWT({ id: user.id }, secret, 2592000);

          const res = new Response(JSON.stringify({
            success: true,
            role: user.user_type,
            name: user.first_name
          }), { headers: corsHeaders });

          // Set HttpOnly Cookies (Security: Cannot be read by JavaScript)
          res.headers.append("Set-Cookie", `p2p_access=${access}; HttpOnly; Secure; SameSite=None; Max-Age=3600; Path=/`);
          res.headers.append("Set-Cookie", `p2p_refresh=${refresh}; HttpOnly; Secure; SameSite=None; Max-Age=2592000; Path=/`);
          
          return res;
        }
        return new Response(JSON.stringify({ error: "Invalid email or password" }), { status: 401, headers: corsHeaders });
      }

      // --- AUTH VERIFICATION ROUTE ---
      if (url.pathname === "/api/verify-session") {
        const cookie = request.headers.get("Cookie") || "";
        // If cookies exist, the browser is authenticated
        if (cookie.includes("p2p_access") || cookie.includes("p2p_refresh")) {
          return new Response(JSON.stringify({ authenticated: true }), { headers: corsHeaders });
        }
        return new Response(JSON.stringify({ authenticated: false }), { status: 401, headers: corsHeaders });
      }

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }

    return new Response("Not Found", { status: 404 });
  }
};
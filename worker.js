// worker.js

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
    return false; // Returns false if the password format is old/incorrect
  }
}

// --- 2. PERMANENT JWT GENERATOR ---
// --- PERMANENT JWT GENERATOR ---
async function generateJWT(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = btoa(JSON.stringify(header));
  
  const encodedPayload = btoa(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000) // 'iat' only, no 'exp'
  }));

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
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);
    const secret = env.JWT_SECRET || "default_secret_change_me";

    try {
      // SIGNUP
      if (url.pathname === "/api/signup" && request.method === "POST") {
        const d = await request.json();
        const secureHash = await hashPassword(d.password);

        await env.DB.prepare(`
          INSERT INTO users (
            first_name, last_name, age, phone_number, backup_phone, 
            school_name, email, user_type, grade, school_code, 
            password_hash, data_consent_commercial
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          d.firstName, d.lastName, parseInt(d.age), d.phone, d.backupPhone,
          d.schoolName, d.email, d.userType, d.grade, d.schoolCode,
          secureHash,
          d.commercialConsent ? 1 : 0
        ).run();

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // LOGIN
      if (url.pathname === "/api/login" && request.method === "POST") {
        const { email, password } = await request.json();
        
        const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();

        // Inside your login block in worker.js
if (user && await verifyPassword(password, user.password_hash)) {
    const token = await generateJWT({
        id: user.id,
        role: user.user_type, // This MUST be 'student' or 'tutor'
        email: user.email
    }, secret);

    return new Response(JSON.stringify({
        success: true,
        token,
        role: user.user_type, // Ensure this matches what you saved in signup
        name: user.first_name
    }), { headers: corsHeaders });
}
    
        return new Response(JSON.stringify({ error: "Invalid email or password" }), { status: 401, headers: corsHeaders });
      }

      // FORGOT PASSWORD
      if (url.pathname === "/api/forgot-password" && request.method === "POST") {
        const { email } = await request.json();
        const user = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();

        if (user) {
          const resetToken = crypto.randomUUID();
          await env.DB.prepare("UPDATE users SET reset_token = ? WHERE email = ?").bind(resetToken, email).run();
          console.log(`RESET: https://peer-2-peer.co.za/reset-password.html?token=${resetToken}`);
        }
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }

    return new Response("Not Found", { status: 404 });
  }
};
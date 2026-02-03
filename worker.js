/**
 * PEER-2-PEER UNIFIED AUTH WORKER
 * Standardized for login.js and D1 Database
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://peer-2-peer.co.za",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

// --- PASSWORD SECURITY (PBKDF2) ---
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
  } catch (e) { return false; }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);

    try {
      // --- SIGNUP ROUTE ---
      if (url.pathname === "/api/signup" && request.method === "POST") {
        const d = await request.json(); // Data from login.js

        // Validate password strength
        const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!d.password || !strongRegex.test(d.password)) {
          return new Response(JSON.stringify({ error: "Weak Password" }), { status: 400, headers: corsHeaders });
        }

        const secureHash = await hashPassword(d.password);

        // Match field names exactly with your login.js payload
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

      // --- LOGIN ROUTE ---
      if (url.pathname === "/api/login" && request.method === "POST") {
        const { email, password } = await request.json();
        const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();

        if (user && await verifyPassword(password, user.password_hash)) {
          return new Response(JSON.stringify({
            success: true,
            role: user.user_type,
            name: user.first_name
          }), { headers: corsHeaders });
        }

        return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401, headers: corsHeaders });
      }

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
    return new Response("Not Found", { status: 404 });
  }
};
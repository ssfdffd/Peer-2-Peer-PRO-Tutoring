/**
 * PEER-2-PEER UNIFIED AUTH WORKER
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://peer-2-peer.co.za",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

// --- PASSWORD SECURITY ---
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
  const hashBuffer = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, 256);
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password, storedValue) {
  if (!storedValue || !storedValue.includes(':')) return false;
  try {
    const [saltHex, originalHashHex] = storedValue.split(':');
    const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
    const hashBuffer = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, 256);
    const currentHashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    return currentHashHex === originalHashHex;
  } catch (e) { return false; }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);

    try {
      // --- LOGIN ROUTE ---
      if (url.pathname === "/api/login" && request.method === "POST") {
        const { email, password } = await request.json();
        const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();

        if (user && await verifyPassword(password, user.password_hash)) {
          return new Response(JSON.stringify({
            success: true,
            email: user.email,
            name: user.first_name,
            role: user.user_type.toLowerCase()
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ success: false, error: "Invalid Credentials" }), { status: 401, headers: corsHeaders });
      }

      // --- SIGNUP ROUTE ---
      if (url.pathname === "/api/signup" && request.method === "POST") {
        const d = await request.json();
        const secureHash = await hashPassword(d.password);
        await env.DB.prepare(`
          INSERT INTO users (first_name, last_name, email, password_hash, user_type, grade, school_name, phone_number)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(d.firstName, d.lastName, d.email, secureHash, d.userType.toLowerCase(), d.grade, d.schoolName, d.phone).run();

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // --- FORGOT PASSWORD ---
      if (url.pathname === "/api/forgot-password" && request.method === "POST") {
        const { email } = await request.json();
        const user = await env.DB.prepare("SELECT email FROM users WHERE email = ?").bind(email).first();
        if (!user) return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

        const token = crypto.randomUUID();
        await env.DB.prepare("UPDATE users SET reset_token = ? WHERE email = ?").bind(token, email).run();
        return new Response(JSON.stringify({ success: true, token }), { headers: corsHeaders });
      }

      return new Response("Not Found", { status: 404, headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
    }
  }
};
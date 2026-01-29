var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// --- NEW SECURITY HELPERS ---
// Inside your worker.js fetch function, add this alongside signup/login:

if (url.pathname === "/api/forgot-password" && request.method === "POST") {
    const { email } = await request.json();

    // 1. Check if user exists
    const user = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();

    if (user) {
        // 2. Generate a secure random token
        const resetToken = crypto.randomUUID();
        
        // 3. Save it to the database so we can recognize it later
        await env.DB.prepare("UPDATE users SET reset_token = ? WHERE email = ?")
                   .bind(resetToken, email).run();
        
        // 4. In a full system, you'd send an email here. 
        // For now, it will be logged in your Wrangler Tail logs.
        console.log(`RESET LINK for ${email}: https://peer-2-peer.co.za/reset-password.html?token=${resetToken}`);
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
}
// Converts a string password into a secure hash
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
__name(hashPassword, "hashPassword");

// Checks if the typed password matches the hash in the DB
async function verifyPassword(password, storedValue) {
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
}
__name(verifyPassword, "verifyPassword");

// --- JWT GENERATOR ---
async function generateJWT(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1e3) + 24 * 60 * 60
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
__name(generateJWT, "generateJWT");

// --- MAIN WORKER ---
var worker_default = {
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
      // --- SIGNUP (ENCRYPT PASSWORD HERE) ---
      if (url.pathname === "/api/signup" && request.method === "POST") {
        const d = await request.json();
        
        // Use our new hasher
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
          secureHash, // Storing the scrambled version
          d.commercialConsent ? 1 : 0
        ).run();

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // --- LOGIN (VERIFY PASSWORD HERE) ---
      if (url.pathname === "/api/login" && request.method === "POST") {
        const { email, password } = await request.json();
        
        // 1. Get user by email only
        const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();

        // 2. Use verifyPassword to check the scrambled hash against what they typed
        if (user && await verifyPassword(password, user.password_hash)) {
          const token = await generateJWT({
            id: user.id,
            role: user.user_type,
            email: user.email
          }, secret);

          return new Response(JSON.stringify({
            success: true,
            token,
            role: user.user_type,
            name: user.first_name
          }), { headers: corsHeaders });
        }

        return new Response(JSON.stringify({ error: "Invalid email or password" }), { status: 401, headers: corsHeaders });
      }
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
    return new Response("Not Found", { status: 404 });
  }
};

export { worker_default as default };
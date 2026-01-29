// worker.js

// 1. Helper to generate a secure JWT token
async function generateJWT(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // Expires in 24 hours
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

export default {
  async fetch(request, env) {
      const corsHeaders = {
          "Access-Control-Allow-Origin": "https://peer-2-peer.co.za", // Updated for your site
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
      };

      // Handle Pre-flight requests
      if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

      const url = new URL(request.url);
      const secret = env.JWT_SECRET || "default_secret_change_me";

      try {
          // --- SIGNUP LOGIC ---
         if (url.pathname === "/api/signup" && request.method === "POST") {
    const d = await request.json();
    
    await env.DB.prepare(`
        INSERT INTO users (
            first_name, last_name, age, phone_number, backup_phone, 
            school_name, email, user_type, grade, school_code, 
            password_hash, data_consent_commercial
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        d.firstName, 
        d.lastName, 
        parseInt(d.age), 
        d.phone, 
        d.backupPhone,  // NEW
        d.schoolName,   // NEW
        d.email, 
        d.userType, 
        d.grade, 
        d.schoolCode,   // NEW
        d.password, 
        d.commercialConsent ? 1 : 0
    ).run();

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
}
          // --- LOGIN LOGIC ---
          if (url.pathname === "/api/login" && request.method === "POST") {
              const { email, password } = await request.json();
              
              // Find user with matching email and password
              const user = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND password_hash = ?")
                  .bind(email, password).first();

              if (user) {
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
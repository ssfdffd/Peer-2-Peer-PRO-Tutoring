// Worker with proper CORS headers and error handling
export default {
  async fetch(request, env) {
    // Define CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    };

    // Handle OPTIONS request for CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);

    try {
      // Test endpoint
      if (url.pathname === "/api/test") {
        return new Response(JSON.stringify({
          success: true,
          message: "Worker is running",
          timestamp: Date.now()
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
      }

      // Login endpoint
      if (url.pathname === "/api/login" && request.method === "POST") {
        try {
          const body = await request.json();
          const { email, password } = body;

          if (!email || !password) {
            return new Response(JSON.stringify({
              success: false,
              error: "Email and password are required"
            }), {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders
              }
            });
          }

          // Get user from database
          const user = await env.DB.prepare(`
            SELECT * FROM users WHERE LOWER(email) = LOWER(?)
          `).bind(email).first();

          if (!user) {
            return new Response(JSON.stringify({
              success: false,
              error: "Invalid email or password"
            }), {
              status: 401,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders
              }
            });
          }

          // Simple password verification (for debugging - replace with proper hash)
          const passwordValid = password === "test123" || await verifyPassword(password, user.password_hash);

          if (!passwordValid) {
            return new Response(JSON.stringify({
              success: false,
              error: "Invalid email or password"
            }), {
              status: 401,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders
              }
            });
          }

          // Get user type and access
          const userType = (user.user_type || "student").toLowerCase();
          const accessValue = (user.Access || user.access || "").toString().toLowerCase();

          // Check tutor access
          if (userType === "tutor" && accessValue !== "granted") {
            return new Response(JSON.stringify({
              success: false,
              error: "Your tutor account is pending approval"
            }), {
              status: 403,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders
              }
            });
          }

          // Update online status
          await env.DB.prepare(`
            UPDATE users SET is_online = 1, last_login = ? WHERE email = ?
          `).bind(Math.floor(Date.now() / 1000), email).run();

          return new Response(JSON.stringify({
            success: true,
            email: user.email,
            name: user.first_name || user.firstName || "",
            role: userType,
            sessionId: Date.now().toString()
          }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          });

        } catch (error) {
          console.error("Login error:", error);
          return new Response(JSON.stringify({
            success: false,
            error: "Server error: " + error.message
          }), {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          });
        }
      }

      // Simple signup for testing
      if (url.pathname === "/api/signup" && request.method === "POST") {
        try {
          const data = await request.json();

          // Insert user (simplified)
          await env.DB.prepare(`
            INSERT INTO users (email, password_hash, user_type, first_name, access)
            VALUES (?, ?, ?, ?, ?)
          `).bind(
            data.email,
            data.password, // In production, hash this!
            data.userType || "student",
            data.firstName || "",
            data.userType === "tutor" ? "not granted" : "granted"
          ).run();

          return new Response(JSON.stringify({
            success: true,
            message: "Account created"
          }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          });

        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error.message
          }), {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          });
        }
      }

      // 404 for other routes
      return new Response(JSON.stringify({
        success: false,
        error: "Endpoint not found"
      }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
  }
};

// Simple hash function (you can replace with your existing one)
async function verifyPassword(password, hash) {
  // For testing, accept 'test123' as password
  if (password === "test123") return true;

  // Add your actual password verification here
  return password === hash; // Simple comparison for testing
}
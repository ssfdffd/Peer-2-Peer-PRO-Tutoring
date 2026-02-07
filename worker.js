export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://peer-2-peer.co.za",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
      // --- FETCHING ---
      if (url.pathname === "/api/resources" && request.method === "GET") {
        const { results } = await env.DB.prepare(`
          SELECT 
            id,
            display_title as title,
            subject,
            grade_level,
            uploader_role,
            doc_type,
            file_url,
            actual_file_key,
            upload_date
          FROM resources 
          ORDER BY upload_date DESC
        `).all();

        // Generate file URLs if missing
        const mapped = results.map(row => ({
          id: row.id,
          title: row.title || "Untitled Document",
          subject: row.subject || "General",
          grade_level: row.grade_level || "N/A",
          uploader_role: row.uploader_role || "unknown",
          doc_type: row.doc_type || "document",
          file_url: row.file_url || `https://peer-2-peer.co.za/uploads/${row.actual_file_key}`,
          actual_file_key: row.actual_file_key,
          upload_date: row.upload_date
        }));

        return new Response(JSON.stringify(mapped), { headers: corsHeaders });
      }

      // --- UPLOADING ---
      if (url.pathname === "/api/upload" && request.method === "POST") {
        const data = await request.json();

        // Validate required fields
        if (!data.title || !data.subject) {
          return new Response(JSON.stringify({ error: "Title and subject are required" }), {
            status: 400,
            headers: corsHeaders
          });
        }

        const fileKey = data.actual_file_key || `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const fileUrl = data.file_url || `https://peer-2-peer.co.za/uploads/${fileKey}`;

        await env.DB.prepare(`
          INSERT INTO resources (
            display_title, 
            subject, 
            grade_level, 
            uploader_role,
            doc_type,
            actual_file_key,
            file_url,
            upload_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          data.title,
          data.subject,
          data.grade || "N/A",
          data.uploader_role || "unknown",
          data.doc_type || "document",
          fileKey,
          fileUrl,
          data.doc_date || new Date().toISOString()
        ).run();

        return new Response(JSON.stringify({
          success: true,
          file_key: fileKey,
          file_url: fileUrl
        }), { headers: corsHeaders });
      }

      // --- SEARCH ENDPOINT ---
      if (url.pathname === "/api/search" && request.method === "GET") {
        const searchQuery = url.searchParams.get('q');
        const subject = url.searchParams.get('subject');
        const grade = url.searchParams.get('grade');

        let query = "SELECT * FROM resources WHERE 1=1";
        let params = [];

        if (searchQuery) {
          query += " AND (display_title LIKE ? OR subject LIKE ?)";
          const likeTerm = `%${searchQuery}%`;
          params.push(likeTerm, likeTerm);
        }

        if (subject) {
          query += " AND subject = ?";
          params.push(subject);
        }

        if (grade) {
          query += " AND grade_level = ?";
          params.push(grade);
        }

        query += " ORDER BY upload_date DESC";

        const { results } = await env.DB.prepare(query).bind(...params).all();
        return new Response(JSON.stringify(results), { headers: corsHeaders });
      }

    } catch (err) {
      return new Response(JSON.stringify({
        error: err.message,
        stack: err.stack
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};
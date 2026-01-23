export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const title = formData.get('title');
        const description = formData.get('description');
        const category = formData.get('category');
        const grade = formData.get('grade');
        const subject = formData.get('subject');

        if (!file) {
            return new Response("No file uploaded", { status: 400 });
        }

        // Generate a unique key using timestamp to prevent overwriting
        const key = `${Date.now()}-${file.name}`;

        // Upload to R2 with metadata
        await env.BUCKET.put(key, file.stream(), {
            httpMetadata: { contentType: file.type },
            customMetadata: {
                title: title,
                description: description,
                category: category,
                grade: grade,
                subject: subject
            }
        });

        return new Response(JSON.stringify({ success: true, key }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
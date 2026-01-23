export async function onRequestGet(context) {
    const { env } = context;
    
    try {
        // 'BUCKET' must match the binding name in your Cloudflare dashboard
        const options = {
            limit: 500,
        };

        const listing = await env.BUCKET.list(options);
        
        // Map the R2 objects to a format your resources.js expects
        const documents = listing.objects.map(obj => ({
            id: obj.key,
            title: obj.customMetadata?.title || obj.key,
            filename: obj.key,
            description: obj.customMetadata?.description || "",
            category: obj.customMetadata?.category || "other",
            grade: obj.customMetadata?.grade || "other",
            subject: obj.customMetadata?.subject || "other",
            upload_date: obj.uploaded,
            file_size: `${(obj.size / 1024 / 1024).toFixed(2)} MB`,
            file_type: obj.key.split('.').pop().toLowerCase(),
            download_count: 0 // R2 doesn't track this natively
        }));

        return new Response(JSON.stringify(documents), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
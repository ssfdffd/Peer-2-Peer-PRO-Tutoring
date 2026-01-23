export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const filename = url.searchParams.get("file");

    if (!filename) {
        return new Response("Missing filename", { status: 400 });
    }

    try {
        const object = await env.BUCKET.get(filename);

        if (object === null) {
            return new Response("Object Not Found", { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        // Force the browser to download the file with its original name
        headers.set("Content-Disposition", `attachment; filename="${filename}"`);

        return new Response(object.body, {
            headers,
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
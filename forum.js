const FORUM_API = "https://forum-worker.buhle-1ce.workers.dev";

document.addEventListener('DOMContentLoaded', () => {
    loadMessages();

    const form = document.getElementById('messageForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await sendMessage();
    });

    // Auto-refresh messages every 10 seconds
    setInterval(loadMessages, 10000);
});

async function loadMessages() {
    const chatBox = document.getElementById('chatBox');
    const myEmail = sessionStorage.getItem('p2p_email');

    try {
        const res = await fetch(`${FORUM_API}/api/forum/messages`);
        const messages = await res.json();

        chatBox.innerHTML = messages.map(msg => {
            const isMe = msg.user_email === myEmail;
            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return `
                <div class="msg ${isMe ? 'me' : msg.user_role}">
                    <div class="msg-info">
                        <strong>${isMe ? 'You' : msg.user_name} (${msg.user_role})</strong>
                        <span>${time}</span>
                    </div>
                    <div class="msg-text">${escapeHTML(msg.message)}</div>
                </div>
            `;
        }).join('');

        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (err) {
        console.error("Chat load error", err);
    }
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const btn = document.getElementById('sendBtn');
    const msg = input.value.trim();

    if (!msg) return;

    const payload = {
        email: sessionStorage.getItem('p2p_email') || "anonymous@peer.co.za",
        name: sessionStorage.getItem('p2p_name') || "Guest",
        role: sessionStorage.getItem('p2p_role') || "student",
        message: msg
    };

    input.value = '';
    btn.disabled = true;

    try {
        await fetch(`${FORUM_API}/api/forum/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        await loadMessages();
    } catch (err) {
        alert("Message failed to send.");
    } finally {
        btn.disabled = false;
    }
}

function escapeHTML(str) {
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
}
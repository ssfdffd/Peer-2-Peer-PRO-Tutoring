const API_URL = "https://booking-worker.buhle-1ce.workers.dev";

document.getElementById('bookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('submitBtn');
    const payload = {
        name: document.getElementById('stuName').value,
        email: document.getElementById('stuEmail').value,
        parentPhone: document.getElementById('parContact').value,
        subject: document.getElementById('subject').value,
        date: document.getElementById('bookDate').value,
        time: document.getElementById('bookTime').value,
        approved: document.getElementById('approval').checked
    };

    btn.disabled = true;
    btn.innerText = "Checking Availability...";

    try {
        const res = await fetch(`${API_URL}/api/book`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (res.ok) {
            document.getElementById('bookingForm').classList.add('hidden');
            const confirmArea = document.getElementById('confirmationArea');
            confirmArea.classList.remove('hidden');

            document.getElementById('detailsText').innerText =
                `Scheduled for ${result.date} at ${result.time}`;

            const link = `https://meet.jit.si/${result.room}`;
            const linkTag = document.getElementById('roomLink');
            linkTag.href = link;
            linkTag.innerText = link;
        } else {
            alert(result.error || "Booking failed");
        }
    } catch (err) {
        alert("Server connection error.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Schedule Class";
    }
});
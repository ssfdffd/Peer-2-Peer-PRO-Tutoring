const API_URL = "https://booking-worker.buhle-1ce.workers.dev";

// Global state
let currentStep = 1;
let selectedTutor = null;
let availableTutors = [];
let userAge = null;
let tutorRate = 250; // Default rate

document.addEventListener('DOMContentLoaded', () => {
    initializeBooking();
});

function initializeBooking() {
    // Set minimum date to 7 days from now
    setMinDate();

    // Event listeners
    document.getElementById('findTutorsBtn').addEventListener('click', findTutors);
    document.getElementById('backBtn').addEventListener('click', goBack);
    document.getElementById('bookingForm').addEventListener('submit', submitBooking);

    // Age validation for parent section
    document.getElementById('studentAge').addEventListener('change', function (e) {
        userAge = parseInt(e.target.value);
        const parentSection = document.getElementById('step4');

        if (userAge < 18) {
            parentSection.classList.remove('hidden');
            // Make parent fields required
            document.getElementById('parentName').required = true;
            document.getElementById('parentRelation').required = true;
            document.getElementById('parentPhone').required = true;
            document.getElementById('parentEmail').required = true;
        } else {
            parentSection.classList.add('hidden');
            // Remove required for parent fields
            document.getElementById('parentName').required = false;
            document.getElementById('parentRelation').required = false;
            document.getElementById('parentPhone').required = false;
            document.getElementById('parentEmail').required = false;
        }
    });

    // Duration change updates price
    document.getElementById('sessionDuration').addEventListener('change', updatePricing);
    document.getElementById('sessionDate').addEventListener('change', loadAvailableSlots);

    // Pre-fill student email if logged in
    const savedEmail = sessionStorage.getItem('p2p_email');
    if (savedEmail) {
        document.getElementById('studentEmail').value = savedEmail;
    }

    const savedName = sessionStorage.getItem('p2p_name');
    if (savedName) {
        document.getElementById('studentName').value = savedName;
    }
}

function setMinDate() {
    const dateInput = document.getElementById('sessionDate');
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const yyyy = nextWeek.getFullYear();
    const mm = String(nextWeek.getMonth() + 1).padStart(2, '0');
    const dd = String(nextWeek.getDate()).padStart(2, '0');

    dateInput.min = `${yyyy}-${mm}-${dd}`;
}

async function findTutors() {
    const subject = document.getElementById('subject').value;
    const grade = document.getElementById('studentGrade').value;

    if (!subject || !grade) {
        alert('Please select both subject and grade');
        return;
    }

    // Show step 2
    document.getElementById('step2').classList.remove('hidden');
    document.getElementById('tutorLoading').style.display = 'block';
    document.getElementById('tutorGrid').style.display = 'none';
    document.getElementById('noTutorsMessage').style.display = 'none';

    // Scroll to step 2
    document.getElementById('step2').scrollIntoView({ behavior: 'smooth' });

    try {
        const response = await fetch(`${API_URL}/api/tutors/available?subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(grade)}`);

        if (!response.ok) throw new Error('Failed to fetch tutors');

        availableTutors = await response.json();

        document.getElementById('tutorLoading').style.display = 'none';

        if (availableTutors.length === 0) {
            document.getElementById('noTutorsMessage').style.display = 'block';
            return;
        }

        // Display tutors
        const tutorGrid = document.getElementById('tutorGrid');
        tutorGrid.style.display = 'flex';
        tutorGrid.innerHTML = availableTutors.map(tutor => renderTutorCard(tutor)).join('');

        // Add event listeners to select buttons
        document.querySelectorAll('.select-tutor-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tutorId = btn.dataset.tutorId;
                const tutor = availableTutors.find(t => t.id == tutorId);
                selectTutor(tutor);
            });
        });

    } catch (error) {
        console.error('Error fetching tutors:', error);
        document.getElementById('tutorLoading').style.display = 'none';
        alert('Error loading tutors. Please try again.');
    }
}

function renderTutorCard(tutor) {
    const subjects = JSON.parse(tutor.subjects || '[]');
    const grades = JSON.parse(tutor.grades || '[]');
    const initials = tutor.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return `
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 20px; transition: all 0.2s;">
            <div style="width: 70px; height: 70px; background: linear-gradient(145deg, #000033, #1a1a4d); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.8rem; font-weight: 700; border: 3px solid #32cd32;">
                ${initials}
            </div>
            <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h3 style="margin: 0 0 4px 0; color: #111827; font-weight: 700; font-size: 1.2rem;">${tutor.name}</h3>
                        <div style="display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
                            <span style="background: #32cd32; color: #000033; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">✓ Verified</span>
                            <span style="background: #f0f2f5; color: #374151; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">
                                <i class="fas fa-star" style="color: #fbbf24;"></i> 4.9 (128 reviews)
                            </span>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-weight: 800; font-size: 1.4rem; color: #000033;">R${tutor.hourly_rate}</span>
                        <span style="color: #6b7280; font-size: 0.85rem;">/hour</span>
                    </div>
                </div>
                <p style="color: #6b7280; font-size: 0.9rem; margin: 8px 0 12px 0;">${tutor.bio || 'Experienced tutor specializing in exam preparation and concept mastery.'}</p>
                <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <i class="fas fa-graduation-cap" style="color: #32cd32;"></i>
                        <span style="font-size: 0.85rem; color: #374151;">${subjects.join(', ')}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <i class="fas fa-users" style="color: #32cd32;"></i>
                        <span style="font-size: 0.85rem; color: #374151;">${grades.join(', ')}</span>
                    </div>
                </div>
            </div>
            <button class="select-tutor-btn" data-tutor-id="${tutor.id}" style="background: #000033; color: white; border: none; padding: 12px 24px; border-radius: 30px; font-weight: 700; cursor: pointer; transition: all 0.2s; border: 2px solid #000033;">
                Select <i class="fas fa-arrow-right" style="margin-left: 6px;"></i>
            </button>
        </div>
    `;
}

function selectTutor(tutor) {
    selectedTutor = tutor;
    tutorRate = parseFloat(tutor.hourly_rate);

    // Update UI with selected tutor info
    document.getElementById('selectedTutorName').textContent = tutor.name;
    document.getElementById('selectedTutorBio').textContent = tutor.bio || 'Experienced tutor';
    document.getElementById('tutorRate').textContent = `R${tutorRate}`;
    document.getElementById('tutorInitials').textContent = tutor.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    // Update pricing in duration dropdown
    updatePricing();

    // Show step 3 and hide step 2
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step3').classList.remove('hidden');
    document.getElementById('backBtn').style.display = 'block';

    currentStep = 3;

    // Scroll to step 3
    document.getElementById('step3').scrollIntoView({ behavior: 'smooth' });
}

function updatePricing() {
    const duration = parseInt(document.getElementById('sessionDuration').value);

    // Update rates display
    document.getElementById('rate30').textContent = (tutorRate * 0.5).toFixed(2);
    document.getElementById('rate60').textContent = tutorRate.toFixed(2);
    document.getElementById('rate90').textContent = (tutorRate * 1.5).toFixed(2);
    document.getElementById('rate120').textContent = (tutorRate * 2).toFixed(2);

    // Update total in confirmation
    const total = (tutorRate * (duration / 60)).toFixed(2);
    document.getElementById('confirmTotal').textContent = `R${total}`;
}

async function loadAvailableSlots() {
    const date = document.getElementById('sessionDate').value;
    if (!date || !selectedTutor) return;

    const timeSelect = document.getElementById('sessionTime');
    timeSelect.innerHTML = '<option value="">Loading available times...</option>';
    timeSelect.disabled = true;

    try {
        const response = await fetch(`${API_URL}/api/tutors/slots?tutor_id=${selectedTutor.id}&date=${date}`);

        if (!response.ok) throw new Error('Failed to load slots');

        const slots = await response.json();

        if (slots.length === 0) {
            timeSelect.innerHTML = '<option value="">No available slots on this date</option>';
        } else {
            timeSelect.innerHTML = '<option value="">-- Select a time --</option>' +
                slots.map(slot => `<option value="${slot}">${slot}</option>`).join('');
        }

        timeSelect.disabled = false;

    } catch (error) {
        console.error('Error loading slots:', error);
        timeSelect.innerHTML = '<option value="">Error loading times</option>';
        timeSelect.disabled = false;
    }
}

function goBack() {
    if (currentStep > 1) {
        // Hide current step
        document.getElementById(`step${currentStep}`).classList.add('hidden');

        // Go to previous step
        currentStep--;

        // Show previous step
        document.getElementById(`step${currentStep}`).classList.remove('hidden');

        // Hide back button if at step 1
        if (currentStep === 1) {
            document.getElementById('backBtn').style.display = 'none';
        }

        // Hide submit button until step 6
        if (currentStep < 6) {
            document.getElementById('submitBtn').classList.add('hidden');
        }

        // Scroll to step
        document.getElementById(`step${currentStep}`).scrollIntoView({ behavior: 'smooth' });
    }
}

function validateStep(step) {
    switch (step) {
        case 3:
            const name = document.getElementById('studentName').value.trim();
            const email = document.getElementById('studentEmail').value.trim();
            const age = document.getElementById('studentAge').value;

            if (!name) return 'Please enter your full name';
            if (!email || !email.includes('@')) return 'Please enter a valid email address';
            if (!age || age < 5 || age > 99) return 'Please enter a valid age';
            return null;

        case 4:
            const parentName = document.getElementById('parentName').value.trim();
            const parentRelation = document.getElementById('parentRelation').value;
            const parentPhone = document.getElementById('parentPhone').value.trim();
            const parentEmail = document.getElementById('parentEmail').value.trim();

            if (!parentName) return 'Please enter parent/guardian name';
            if (!parentRelation) return 'Please select relationship to student';
            if (!parentPhone) return 'Please enter parent/guardian phone number';
            if (!parentEmail || !parentEmail.includes('@')) return 'Please enter a valid parent email';
            return null;

        case 5:
            const date = document.getElementById('sessionDate').value;
            const time = document.getElementById('sessionTime').value;

            if (!date) return 'Please select a date for your session';
            if (!time) return 'Please select a time slot';
            return null;

        case 6:
            if (!document.getElementById('parentApprovalCheck').checked) return 'You must confirm parental approval';
            if (!document.getElementById('contactConsentCheck').checked) return 'You must consent to contact the parent/guardian';
            if (!document.getElementById('termsCheck').checked) return 'You must agree to the Terms & Conditions';
            return null;

        default:
            return null;
    }
}

function nextStep() {
    const validationError = validateStep(currentStep);

    if (validationError) {
        alert(validationError);
        return false;
    }

    // Hide current step
    document.getElementById(`step${currentStep}`).classList.add('hidden');

    // Increment step
    currentStep++;

    // Handle special cases
    if (currentStep === 4 && userAge >= 18) {
        // Skip parent section for adults
        currentStep++;
    }

    if (currentStep === 5) {
        // Update confirmation summary
        updateConfirmationSummary();
    }

    if (currentStep === 6) {
        // Show submit button
        document.getElementById('submitBtn').classList.remove('hidden');
    }

    // Show next step
    document.getElementById(`step${currentStep}`).classList.remove('hidden');

    // Show back button
    document.getElementById('backBtn').style.display = 'block';

    // Scroll to next step
    document.getElementById(`step${currentStep}`).scrollIntoView({ behavior: 'smooth' });

    return true;
}

function updateConfirmationSummary() {
    const subject = document.getElementById('subject').value;
    const date = document.getElementById('sessionDate').value;
    const time = document.getElementById('sessionTime').value;
    const duration = document.getElementById('sessionDuration').value;
    const durationText = duration === '30' ? '30 minutes' :
        duration === '60' ? '1 hour' :
            duration === '90' ? '1.5 hours' : '2 hours';

    // Format date
    const formattedDate = new Date(date).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    document.getElementById('confirmTutorName').textContent = selectedTutor.name;
    document.getElementById('confirmSubject').textContent = subject;
    document.getElementById('confirmDateTime').textContent = `${formattedDate} at ${time}`;
    document.getElementById('confirmDuration').textContent = durationText;

    const total = (tutorRate * (parseInt(duration) / 60)).toFixed(2);
    document.getElementById('confirmTotal').textContent = `R${total}`;
}

async function submitBooking(e) {
    e.preventDefault();

    // Validate final step
    const validationError = validateStep(6);
    if (validationError) {
        alert(validationError);
        return;
    }

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Booking...';

    const userAge = parseInt(document.getElementById('studentAge').value);

    const payload = {
        studentName: document.getElementById('studentName').value,
        studentEmail: document.getElementById('studentEmail').value,
        studentAge: userAge,
        studentGrade: document.getElementById('studentGrade').value,
        studentPhone: document.getElementById('studentPhone').value || null,

        parentName: userAge < 18 ? document.getElementById('parentName').value : null,
        parentRelation: userAge < 18 ? document.getElementById('parentRelation').value : null,
        parentPhone: userAge < 18 ? document.getElementById('parentPhone').value : null,
        parentEmail: userAge < 18 ? document.getElementById('parentEmail').value : null,

        subject: document.getElementById('subject').value,
        sessionDuration: parseInt(document.getElementById('sessionDuration').value),
        date: document.getElementById('sessionDate').value,
        time: document.getElementById('sessionTime').value,
        sessionNotes: document.getElementById('sessionNotes').value || null,

        tutorId: selectedTutor.id,
        approved: true // Verified through checkboxes
    };

    try {
        const res = await fetch(`${API_URL}/api/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (res.ok) {
            // Hide form
            document.getElementById('bookingForm').classList.add('hidden');
            document.getElementById('backBtn').style.display = 'none';

            // Show confirmation
            const confirmArea = document.getElementById('confirmationArea');
            confirmArea.classList.remove('hidden');

            // Format date
            const formattedDate = new Date(payload.date).toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });

            document.getElementById('detailsText').innerHTML =
                `Your session with <strong>${selectedTutor.name}</strong> is scheduled for <strong>${formattedDate} at ${payload.time}</strong>.`;

            document.getElementById('confirmTutorNameSuccess').textContent = selectedTutor.name;

            const link = result.meetingLink || `https://meet.jit.si/${result.room}`;
            const linkTag = document.getElementById('roomLink');
            linkTag.href = link;
            linkTag.textContent = link;

            document.getElementById('meetingPassword').textContent = result.password || 'P2P2024';

            const joinBtn = document.getElementById('joinMeetingBtn');
            joinBtn.href = link;

            // Scroll to confirmation
            confirmArea.scrollIntoView({ behavior: 'smooth' });

            // Store in session storage for dashboard
            sessionStorage.setItem('lastBooking', JSON.stringify({
                tutor: selectedTutor.name,
                date: payload.date,
                time: payload.time,
                link: link,
                password: result.password
            }));

        } else {
            alert(result.error || "Booking failed. Please try again.");
        }
    } catch (err) {
        console.error('Booking error:', err);
        alert("Server connection error. Please check your internet and try again.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-calendar-check"></i> Confirm & Request Booking';
    }
}

// Helper function to copy password
window.copyPassword = function () {
    const password = document.getElementById('meetingPassword').textContent;
    navigator.clipboard.writeText(password).then(() => {
        alert('Password copied to clipboard!');
    });
};

// Add step navigation to Find Tutors button
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('select-tutor-btn')) {
        nextStep();
    }
});

// Override the original form submit
window.addEventListener('load', function () {
    const originalForm = document.getElementById('bookingForm');
    originalForm.addEventListener('submit', function (e) {
        if (currentStep < 6) {
            e.preventDefault();
            nextStep();
        }
    });
});
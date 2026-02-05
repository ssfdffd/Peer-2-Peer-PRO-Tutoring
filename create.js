// Import anime.js library (add this to your HTML: <script src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js"></script>)
const API_BASE = "https://liveclass.buhle-1ce.workers.dev/";
// Global variables
let classCounter = 1;
const meetings = [];

// Initialize animations when DOM loads
document.addEventListener('DOMContentLoaded', function () {
    // Animate form elements
    animateFormEntrance();

    // Animate page elements
    animatePageLoad();

    // Add input focus effects
    setupInputAnimations();

    // Load sample meetings if any
    loadSampleMeetings();
});

// Form entrance animation
function animateFormEntrance() {
    const formElements = document.querySelectorAll('.input-group, .btn-launch');

    anime({
        targets: formElements,
        translateY: [30, 0],
        opacity: [0, 1],
        delay: anime.stagger(100, { start: 300 }),
        easing: 'easeOutCubic',
        duration: 800
    });
}

// Page load animation
function animatePageLoad() {
    // Animate header
    anime({
        targets: '.form-header',
        translateY: [-20, 0],
        opacity: [0, 1],
        duration: 1000,
        easing: 'easeOutCubic'
    });

    // Animate logo
    anime({
        targets: '.logo-container img',
        rotate: {
            value: [0, 360],
            duration: 2000,
            easing: 'easeInOutSine'
        },
        scale: [0.8, 1],
        duration: 1500
    });

    // Animate back button
    anime({
        targets: '.back-link-pill',
        translateX: [20, 0],
        opacity: [0, 1],
        duration: 800,
        delay: 200,
        easing: 'easeOutCubic'
    });
}

// Input field animations
function setupInputAnimations() {
    const inputs = document.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
        // Focus animation
        input.addEventListener('focus', function () {
            anime({
                targets: this,
                scale: 1.02,
                duration: 300,
                easing: 'easeOutCubic'
            });

            // Animate label
            const label = this.parentElement.querySelector('label');
            if (label) {
                anime({
                    targets: label,
                    color: ['#8892b0', '#64ffda'],
                    duration: 300,
                    easing: 'easeOutCubic'
                });
            }
        });

        // Blur animation
        input.addEventListener('blur', function () {
            anime({
                targets: this,
                scale: 1,
                duration: 300,
                easing: 'easeOutCubic'
            });

            const label = this.parentElement.querySelector('label');
            if (label && !this.value) {
                anime({
                    targets: label,
                    color: ['#64ffda', '#8892b0'],
                    duration: 300,
                    easing: 'easeOutCubic'
                });
            }
        });
    });
}

// Schedule class function with animations
function scheduleClass() {
    const topic = document.getElementById('classTopic').value.trim();
    const grade = document.getElementById('classGrade').value;
    const duration = document.getElementById('classDuration').value;
    const description = document.getElementById('classDesc').value.trim();
    const tutorEmail = sessionStorage.getItem('p2p_email');
    // Validation
    if (!topic || !description) {
        showNotification('Please fill in all required fields', 'error');
        shakeForm();
        return;
    }

    // Create new meeting object
    const newMeeting = {
        id: Date.now(),
        tutorEmail: tutorEmail,
        topic: topic,
        grade: grade,
        duration: duration,
        description: description,
        date: new Date().toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        }),
        time: new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        })
    };

    // Add to meetings array
    meetings.unshift(newMeeting);

    // Animation sequence
    animateClassCreation(newMeeting);

    // Clear form
    clearForm();

    // Show success notification
    showNotification(`Class "${topic}" scheduled successfully!`, 'success');
}

// Animate class creation
function animateClassCreation(meeting) {
    // Button animation
    const button = document.querySelector('.btn-launch');
    anime({
        targets: button,
        scale: [1, 0.9, 1],
        duration: 300,
        easing: 'easeInOutSine'
    });

    // Create meeting card animation
    setTimeout(() => {
        addMeetingCard(meeting);
    }, 300);
}

// Add meeting card with animation
function addMeetingCard(meeting) {
    const container = document.getElementById('myMeetingsList');

    // Remove empty state if exists
    const emptyState = container.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    // Create new card
    const card = document.createElement('div');
    card.className = 'meeting-item';
    card.innerHTML = `
        <div class="meeting-info">
            <h4>${meeting.topic}</h4>
            <span><i class="fas fa-graduation-cap"></i> Grade ${meeting.grade} • ${meeting.duration} • Ready to start</span>
            <p style="color: var(--text-muted); margin-top: 8px; font-size: 0.9rem;">${meeting.description}</p>
        </div>
        <div class="meeting-actions">
            <button class="btn-start-small" onclick="goLive(${meeting.id})">
                <i class="fas fa-play"></i> GO LIVE
            </button>
            <button class="btn-delete" onclick="deleteMeeting(${meeting.id})">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;

    // Add to container
    container.insertBefore(card, container.firstChild);

    // Animate card entrance
    anime({
        targets: card,
        translateX: [50, 0],
        opacity: [0, 1],
        scale: [0.8, 1],
        duration: 800,
        easing: 'easeOutCubic',
        complete: function () {
            // Add hover effect animation
            card.addEventListener('mouseenter', function () {
                anime({
                    targets: this,
                    translateX: 8,
                    translateY: -3,
                    duration: 300,
                    easing: 'easeOutCubic'
                });
            });

            card.addEventListener('mouseleave', function () {
                anime({
                    targets: this,
                    translateX: 0,
                    translateY: 0,
                    duration: 300,
                    easing: 'easeOutCubic'
                });
            });
        }
    });

    // Animate other cards
    const allCards = container.querySelectorAll('.meeting-item');
    allCards.forEach((card, index) => {
        if (index > 0) {
            anime({
                targets: card,
                translateY: [0, 10 * index],
                duration: 500,
                easing: 'easeOutCubic'
            });
        }
    });
}

// Delete meeting with animation
function deleteMeeting(id) {
    const meetingIndex = meetings.findIndex(m => m.id === id);
    if (meetingIndex === -1) return;

    const card = document.querySelector(`.meeting-item button[onclick="deleteMeeting(${id})"]`).closest('.meeting-item');

    // Animate deletion
    anime({
        targets: card,
        opacity: [1, 0],
        translateX: [0, 50],
        scale: [1, 0.8],
        duration: 500,
        easing: 'easeInCubic',
        complete: function () {
            card.remove();
            meetings.splice(meetingIndex, 1);

            // Show empty state if no meetings
            if (meetings.length === 0) {
                showEmptyState();
            }

            showNotification('Class deleted successfully', 'info');
        }
    });
}

// Go live function with animations
function goLive(id) {
    const meeting = meetings.find(m => m.id === id);
    if (!meeting) return;

    const button = document.querySelector(`.meeting-item button[onclick="goLive(${id})"]`);

    // Button animation
    anime({
        targets: button,
        scale: [1, 1.2, 1],
        backgroundColor: ['#64ffda', '#00ffaa', '#64ffda'],
        duration: 500,
        easing: 'easeInOutSine'
    });

    // Pulsing animation
    anime({
        targets: button,
        boxShadow: [
            '0 0 0 0 rgba(100, 255, 218, 0.7)',
            '0 0 0 20px rgba(100, 255, 218, 0)'
        ],
        easing: 'easeOutCubic',
        duration: 1000,
        complete: function () {
            showNotification(`Starting live session: ${meeting.topic}`, 'success');

            // Simulate redirect to live session
            setTimeout(() => {
                window.location.href = `live-session.html?meeting=${meeting.id}`;
            }, 1000);
        }
    });
}

// Form validation shake animation
function shakeForm() {
    const form = document.querySelector('.p2p-form');
    anime({
        targets: form,
        translateX: [
            { value: -10, duration: 80 },
            { value: 10, duration: 80 },
            { value: -10, duration: 80 },
            { value: 10, duration: 80 },
            { value: 0, duration: 80 }
        ],
        easing: 'easeInOutSine',
        duration: 400
    });

    // Highlight empty fields
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        if (!input.value.trim()) {
            anime({
                targets: input,
                borderColor: ['#233554', '#ff4444', '#233554'],
                duration: 1000,
                easing: 'easeInOutSine'
            });
        }
    });
}

// Show notification with animation
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #064e3b, #047857)' :
            type === 'error' ? 'linear-gradient(135deg, #7f1d1d, #dc2626)' :
                'linear-gradient(135deg, #1e3a8a, #3b82f6)'};
        color: white;
        padding: 16px 24px;
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 9999;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        transform: translateX(100%);
        opacity: 0;
        transition: transform 0.3s, opacity 0.3s;
        max-width: 400px;
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        anime({
            targets: notification,
            translateX: 0,
            opacity: 1,
            duration: 500,
            easing: 'easeOutCubic'
        });
    }, 10);

    // Auto remove after 5 seconds
    setTimeout(() => {
        anime({
            targets: notification,
            translateX: 100,
            opacity: 0,
            duration: 500,
            easing: 'easeInCubic',
            complete: function () {
                notification.remove();
            }
        });
    }, 5000);
}

// Clear form with animation
function clearForm() {
    const inputs = document.querySelectorAll('#classTopic, #classDesc');

    anime({
        targets: inputs,
        opacity: [1, 0.5, 1],
        duration: 600,
        easing: 'easeInOutSine',
        complete: function () {
            document.getElementById('classTopic').value = '';
            document.getElementById('classDesc').value = '';
            document.getElementById('classGrade').selectedIndex = 0;
            document.getElementById('classDuration').selectedIndex = 0;
        }
    });
}

// Show empty state
function showEmptyState() {
    const container = document.getElementById('myMeetingsList');
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-calendar-plus"></i>
            <p>No classes scheduled yet.</p>
            <p style="font-size: 0.9rem; margin-top: 10px; opacity: 0.7;">Schedule your first class above!</p>
        </div>
    `;

    // Animate empty state
    anime({
        targets: container.querySelector('.empty-state'),
        scale: [0.8, 1],
        opacity: [0, 1],
        duration: 800,
        easing: 'easeOutCubic'
    });
}

// Load sample meetings for demo
function loadSampleMeetings() {
    // Add a sample meeting for demo
    setTimeout(() => {
        const sampleMeeting = {
            id: Date.now(),
            topic: 'Introduction to Quantum Physics',
            grade: '12',
            duration: '120 Minutes',
            description: 'Understanding wave-particle duality and quantum states',
            date: 'Today',
            time: '14:30'
        };

        meetings.push(sampleMeeting);
        addMeetingCard(sampleMeeting);

        // Show welcome notification
        setTimeout(() => {
            showNotification('Welcome to Peer-2-Peer Pro! Demo meeting loaded.', 'info');
        }, 1000);
    }, 1500);
}

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    .notification {
        animation: slideIn 0.5s ease-out;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .notification button {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: background 0.3s;
    }
    
    .notification button:hover {
        background: rgba(255, 255, 255, 0.1);
    }
`;
document.head.appendChild(style);
// ============================================
// STUDENT PORTAL - COMPLETE JAVASCRIPT
// Peer-2-Peer PRO | Mobile-First Design
// ============================================

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Show toast notification messages
 * @param {string} message - Message to display
 * @param {string} type - Message type (success, error, info, warning)
 */
function showMessage(message, type = "info") {
    // Create or use existing message container
    let messageContainer = document.getElementById('messageContainer');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'messageContainer';
        messageContainer.style.cssText = `
            position: fixed; 
            top: 20px; 
            right: 20px; 
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(messageContainer);
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        padding: 14px 20px;
        margin-bottom: 10px;
        border-radius: 12px;
        color: white;
        font-weight: 600;
        font-size: 0.9rem;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out;
        display: flex;
        align-items: center;
        gap: 10px;
        backdrop-filter: blur(10px);
    `;

    // Set background color and icon based on type
    let icon = 'fa-info-circle';
    switch (type) {
        case 'success':
            messageDiv.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            icon = 'fa-check-circle';
            break;
        case 'error':
            messageDiv.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
            icon = 'fa-exclamation-circle';
            break;
        case 'info':
            messageDiv.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
            icon = 'fa-info-circle';
            break;
        case 'warning':
            messageDiv.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
            icon = 'fa-exclamation-triangle';
            break;
        default:
            messageDiv.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
    }

    // Add icon
    const iconSpan = document.createElement('i');
    iconSpan.className = `fas ${icon}`;
    messageDiv.insertBefore(iconSpan, messageDiv.firstChild);

    messageContainer.appendChild(messageDiv);

    // Remove message after 3 seconds
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
            // Remove container if empty
            if (messageContainer.children.length === 0) {
                messageContainer.remove();
            }
        }, 300);
    }, 3000);
}

// Add CSS animations for messages dynamically
(function addMessageAnimations() {
    const existingStyle = document.getElementById('messageAnimations');
    if (existingStyle) return;

    const style = document.createElement('style');
    style.id = 'messageAnimations';
    style.textContent = `
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
        @keyframes slideOut { 
            from { 
                transform: translateX(0); 
                opacity: 1; 
            } 
            to { 
                transform: translateX(100%); 
                opacity: 0; 
            } 
        }
    `;
    document.head.appendChild(style);
})();

// ============================================
// FEATURE NAVIGATION FUNCTIONS
// ============================================

function openLiveClasses() {
    showMessage("Opening Live Classes...", "info");
    setTimeout(() => {
        window.location.href = "student-live-classes.html";
    }, 500);
}

function openStudyMaterials() {
    showMessage("Loading Study Materials...", "info");
    setTimeout(() => {
        window.location.href = "student-materials.html";
    }, 500);
}

function openPracticeTests() {
    showMessage("Launching Practice Tests...", "info");
    setTimeout(() => {
        window.location.href = "student-tests.html";
    }, 500);
}

function openStudyGroups() {
    showMessage("Joining Study Groups...", "info");
    setTimeout(() => {
        window.location.href = "student-groups.html";
    }, 500);
}

function openForum() {
    showMessage("Opening Student Forum...", "info");
    setTimeout(() => {
        window.location.href = "forum.html";
    }, 500);
}

function openShareNotes() {
    showMessage("Opening Note Sharing...", "info");
    setTimeout(() => {
        window.location.href = "student-upload.html";
    }, 500);
}

function openProgressTracker() {
    showMessage("Loading Progress Tracker...", "info");
    setTimeout(() => {
        window.location.href = "student-progress.html";
    }, 500);
}

function openTutoringRequests() {
    showMessage("Opening Tutoring Requests...", "info");
    setTimeout(() => {
        window.location.href = "student-tutoring.html";
    }, 500);
}

function openResourceLibrary() {
    showMessage("Accessing Resource Library...", "info");
    setTimeout(() => {
        window.location.href = "student-library.html";
    }, 500);
}

// ============================================
// QUICK ACTION FUNCTIONS
// ============================================

function quickJoinClass() {
    showMessage("Finding available classes...", "info");
    setTimeout(() => {
        const availableRooms = ["P2P-Live-Math101", "P2P-Live-Science202"];
        if (availableRooms.length > 0) {
            window.location.href = `student-live.html?room=${availableRooms[0]}`;
        } else {
            showMessage("No classes available at the moment", "error");
        }
    }, 1000);
}

function quickUpload() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.doc,.docx,.txt,.jpg,.png';
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            showMessage(`Uploading ${file.name}...`, "info");
            // Upload logic would go here
        }
    };
    fileInput.click();
}

function quickAsk() {
    const question = prompt("What would you like to ask?");
    if (question && question.trim()) {
        showMessage("Question posted to forum!", "success");
        // Post to forum logic would go here
    }
}

function quickSchedule() {
    showMessage("Opening tutor scheduling...", "info");
    setTimeout(() => {
        window.location.href = "student-schedule.html";
    }, 500);
}

function quickGrades() {
    showMessage("Loading your grades...", "info");
    setTimeout(() => {
        showMessage("Average: 85% | Top Subject: Mathematics (92%)", "success");
    }, 1500);
}

function quickDownload() {
    showMessage("Preparing all resources for download...", "info");
    setTimeout(() => {
        showMessage("Download started!", "success");
    }, 2000);
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

function filterFeatures() {
    const searchInput = document.getElementById('globalSearch');
    if (!searchInput) return;

    const searchTerm = searchInput.value.toLowerCase().trim();
    const cards = document.querySelectorAll('.feature-card, .quick-action-card');

    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(searchTerm) || searchTerm === '') {
            card.style.display = 'flex';
            card.classList.add('animate__animated', 'animate__fadeIn');
        } else {
            card.style.display = 'none';
        }
    });
}

// ============================================
// MOBILE MENU FUNCTIONALITY
// ============================================

/**
 * Toggle mobile menu visibility
 */
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const toggleIcon = document.querySelector('.mobile-menu-toggle i');

    if (mobileMenu && toggleIcon) {
        mobileMenu.classList.toggle('active');

        // Toggle icon between bars and times
        if (mobileMenu.classList.contains('active')) {
            toggleIcon.classList.remove('fa-bars');
            toggleIcon.classList.add('fa-times');
            document.body.style.overflow = 'hidden'; // Prevent scrolling when menu is open
        } else {
            toggleIcon.classList.remove('fa-times');
            toggleIcon.classList.add('fa-bars');
            document.body.style.overflow = '';
        }
    }
}

/**
 * Close mobile menu
 */
function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const toggleIcon = document.querySelector('.mobile-menu-toggle i');

    if (mobileMenu && toggleIcon) {
        mobileMenu.classList.remove('active');
        toggleIcon.classList.remove('fa-times');
        toggleIcon.classList.add('fa-bars');
        document.body.style.overflow = '';
    }
}

// ============================================
// LOGOUT FUNCTIONALITY
// ============================================

/**
 * Enhanced logout function with confirmation
 */
function logout() {
    if (confirm("Are you sure you want to logout?")) {
        // Show loading state on logout button
        const logoutBtn = document.querySelector('.logout-minimal');
        if (logoutBtn) {
            const originalHTML = logoutBtn.innerHTML;
            logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
            logoutBtn.disabled = true;
            logoutBtn.style.cursor = 'not-allowed';
            logoutBtn.style.opacity = '0.7';
        }

        // Clear session storage
        sessionStorage.clear();
        localStorage.clear();

        // Show success message
        showMessage("Logging out successfully...", "success");

        // Redirect to login page
        setTimeout(() => {
            window.location.href = "login.html";
        }, 1000);
    }
}

// ============================================
// INITIALIZATION FUNCTIONS
// ============================================

/**
 * Initialize student information display
 */
function initializeStudentInfo() {
    const studentName = sessionStorage.getItem('p2p_name') || 'Student';
    const studentEmail = sessionStorage.getItem('p2p_email') || '';
    const studentGrade = sessionStorage.getItem('p2p_grade') || 'Learner';

    // Desktop display
    const nameDisplay = document.getElementById('studentNameDisplay');
    const avatar = document.getElementById('studentAvatar');

    // Mobile display
    const mobileName = document.getElementById('mobileStudentName');
    const mobileAvatar = document.getElementById('mobileAvatar');

    // Update desktop elements
    if (nameDisplay) {
        nameDisplay.textContent = studentName;
    }
    if (avatar) {
        avatar.textContent = studentName.charAt(0).toUpperCase();
    }

    // Update mobile elements
    if (mobileName) {
        mobileName.textContent = studentName;
    }
    if (mobileAvatar) {
        mobileAvatar.textContent = studentName.charAt(0).toUpperCase();
    }

    // Update user role if element exists
    const userRoles = document.querySelectorAll('.user-role, .mobile-user-role');
    userRoles.forEach(role => {
        role.textContent = studentGrade;
    });
}

/**
 * Add hover animations to feature cards
 */
function initializeCardAnimations() {
    const cards = document.querySelectorAll('.feature-card, .quick-action-card, .activity-item');

    cards.forEach(card => {
        // Mouse enter
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-8px)';
        });

        // Mouse leave
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });

        // Touch feedback for mobile
        card.addEventListener('touchstart', () => {
            card.style.transform = 'scale(0.98)';
        });

        card.addEventListener('touchend', () => {
            card.style.transform = 'translateY(-8px)';
        });
    });
}

/**
 * Initialize scroll animations
 */
function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all fade-in elements
    document.querySelectorAll('.fade-in').forEach(el => {
        observer.observe(el);
    });
}

/**
 * Initialize progress bar animations
 */
function initializeProgressBars() {
    const progressBars = document.querySelectorAll('.progress-fill');

    const progressObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const width = entry.target.style.width;
                entry.target.style.width = '0';
                setTimeout(() => {
                    entry.target.style.width = width;
                }, 100);
                progressObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    progressBars.forEach(bar => {
        progressObserver.observe(bar);
    });
}

/**
 * Close mobile menu when clicking outside
 */
function initializeMobileMenuClickOutside() {
    document.addEventListener('click', function (e) {
        const mobileMenu = document.getElementById('mobileMenu');
        const toggle = document.querySelector('.mobile-menu-toggle');

        if (mobileMenu && mobileMenu.classList.contains('active')) {
            if (!mobileMenu.contains(e.target) && !toggle.contains(e.target)) {
                closeMobileMenu();
            }
        }
    });
}

/**
 * Close mobile menu when clicking on a link
 */
function initializeMobileMenuLinkClicks() {
    const mobileLinks = document.querySelectorAll('.mobile-menu .nav-link');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            closeMobileMenu();
        });
    });
}

/**
 * Add smooth scroll to all anchor links
 */
function initializeSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
}

/**
 * Add loading state to all clickable cards
 */
function initializeCardLoadingStates() {
    const clickableCards = document.querySelectorAll('.feature-card[onclick]');

    clickableCards.forEach(card => {
        card.addEventListener('click', function (e) {
            // Add loading indicator
            const originalContent = this.innerHTML;
            this.style.pointerEvents = 'none';
            this.style.opacity = '0.7';

            // Reset after navigation (in case navigation fails)
            setTimeout(() => {
                this.style.pointerEvents = '';
                this.style.opacity = '';
            }, 2000);
        });
    });
}

/**
 * Initialize floating elements animation pause on hover
 */
function initializeFloatingElements() {
    const floatingElements = document.querySelectorAll('.floating-element');

    floatingElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            element.style.animationPlayState = 'paused';
        });

        element.addEventListener('mouseleave', () => {
            element.style.animationPlayState = 'running';
        });
    });
}

/**
 * Check if user is logged in
 */
function checkAuthentication() {
    const userName = sessionStorage.getItem('p2p_name');

    if (!userName) {
        // User not logged in, redirect to login
        showMessage("Please login to access the student portal", "warning");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 1500);
        return false;
    }

    return true;
}

// ============================================
// DOM READY INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    // Check authentication
    checkAuthentication();

    // Initialize all components
    initializeStudentInfo();
    initializeCardAnimations();
    initializeScrollAnimations();
    initializeProgressBars();
    initializeMobileMenuClickOutside();
    initializeMobileMenuLinkClicks();
    initializeSmoothScroll();
    initializeCardLoadingStates();
    initializeFloatingElements();

    // Add page load animation
    document.body.classList.add('page-loaded');

    // Show welcome message
    const studentName = sessionStorage.getItem('p2p_name') || 'Student';
    setTimeout(() => {
        showMessage(`Welcome back, ${studentName}!`, "success");
    }, 500);

    // Log initialization complete
    console.log('Student Portal initialized successfully');
});

// ============================================
// WINDOW LOAD EVENTS
// ============================================

window.addEventListener('load', function () {
    // Remove any loading screens
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.remove();
        }, 300);
    }
});

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener('keydown', function (e) {
    // Press 'M' to toggle mobile menu (for testing)
    if (e.key === 'm' || e.key === 'M') {
        if (window.innerWidth <= 768) {
            toggleMobileMenu();
        }
    }

    // Press 'L' to logout (for testing)
    if (e.key === 'l' || e.key === 'L') {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            logout();
        }
    }

    // Press 'Escape' to close mobile menu
    if (e.key === 'Escape') {
        closeMobileMenu();
    }
});

// ============================================
// RESIZE HANDLER
// ============================================

let resizeTimer;
window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        // Close mobile menu on resize to desktop
        if (window.innerWidth > 768) {
            closeMobileMenu();
        }
    }, 250);
});

// ============================================
// ERROR HANDLING
// ============================================

window.addEventListener('error', function (e) {
    console.error('Student Portal Error:', e.message);
    // Don't show error messages to users in production
    // showMessage("An error occurred. Please refresh the page.", "error");
});

// ============================================
// PERFORMANCE OPTIMIZATION
// ============================================

// Lazy load images
if ('loading' in HTMLImageElement.prototype) {
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
        img.src = img.dataset.src;
    });
} else {
    // Fallback for browsers that don't support lazy loading
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lazysizes/5.3.2/lazysizes.min.js';
    document.body.appendChild(script);
}

// ============================================
// SERVICE WORKER REGISTRATION (Optional PWA)
// ============================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Uncomment to enable service worker
        // navigator.serviceWorker.register('/sw.js')
        //     .then(registration => {
        //         console.log('ServiceWorker registration successful');
        //     })
        //     .catch(err => {
        //         console.log('ServiceWorker registration failed: ', err);
        //     });
    });
}

// ============================================
// ANALYTICS TRACKING (Optional)
// ============================================

function trackPageView(pageName) {
    // Add your analytics tracking code here
    console.log(`Page view tracked: ${pageName}`);
}

function trackEvent(category, action, label) {
    // Add your event tracking code here
    console.log(`Event tracked: ${category} - ${action} - ${label}`);
}

// Track initial page view
trackPageView('Student Portal Dashboard');
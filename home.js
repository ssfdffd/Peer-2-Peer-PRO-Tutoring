/**
 * PEER-2-PEER PROJECT - UPDATED
 */

// =================================
// ADVERTISEMENT CAROUSEL CONFIGURATION
// =================================
// Set your image URLs here
const advertisementImages = {
    image1: 'https://example.com/ad1.jpg',  // Replace with your image URL
    image2: 'https://example.com/ad2.jpg',  // Replace with your image URL
    image3: 'https://example.com/ad3.jpg'   // Replace with your image URL
};

// Initialize images when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Set advertisement images
    document.getElementById('adImage1').src = advertisementImages.image1;
    document.getElementById('adImage2').src = advertisementImages.image2;
    document.getElementById('adImage3').src = advertisementImages.image3;

    // Start auto-play
    startAutoPlay();

    // Check authentication
    const userName = localStorage.getItem('userName');
    const userType = localStorage.getItem('userType');
    const navRight = document.querySelector('.nav-right');

    if (userName && navRight) {
        navRight.innerHTML = `
            <a href="index.html" class="nav-link-home">
                <i class="fas fa-home"></i> Home
            </a>
            <span class="user-welcome" style="color:white; margin-right:10px;">Hi, ${userName}</span>
            <button onclick="logout()" style="background:none; border:1px solid white; color:white; cursor:pointer; padding:8px 16px; border-radius:50px; font-weight:600; transition: all 0.3s ease;">Logout</button>
            <span id="openNavTrigger" style="margin-left:10px; cursor:pointer; font-size: 1.5rem;">☰</span>
        `;
        document.getElementById('openNavTrigger').onclick = () => sideMenu.style.width = "300px";
    }
});

// =================================
// CAROUSEL FUNCTIONALITY
// =================================
let currentSlide = 0;
let autoPlayInterval;

function changeSlide(direction) {
    const slides = document.querySelectorAll('.ad-slide');
    const indicators = document.querySelectorAll('.indicator');

    // Remove active class from current slide
    slides[currentSlide].classList.remove('active');
    indicators[currentSlide].classList.remove('active');

    // Calculate new slide index
    currentSlide = (currentSlide + direction + slides.length) % slides.length;

    // Add active class to new slide
    slides[currentSlide].classList.add('active');
    indicators[currentSlide].classList.add('active');

    // Reset auto-play timer
    resetAutoPlay();
}

function goToSlide(index) {
    const slides = document.querySelectorAll('.ad-slide');
    const indicators = document.querySelectorAll('.indicator');

    // Remove active class from current slide
    slides[currentSlide].classList.remove('active');
    indicators[currentSlide].classList.remove('active');

    // Set new slide
    currentSlide = index;

    // Add active class to new slide
    slides[currentSlide].classList.add('active');
    indicators[currentSlide].classList.add('active');

    // Reset auto-play timer
    resetAutoPlay();
}

function startAutoPlay() {
    autoPlayInterval = setInterval(() => {
        changeSlide(1);
    }, 5000); // Change slide every 5 seconds
}

function resetAutoPlay() {
    clearInterval(autoPlayInterval);
    startAutoPlay();
}

// Pause auto-play when user hovers over carousel
const carouselElement = document.querySelector('.ad-carousel');
if (carouselElement) {
    carouselElement.addEventListener('mouseenter', () => {
        clearInterval(autoPlayInterval);
    });

    carouselElement.addEventListener('mouseleave', () => {
        startAutoPlay();
    });
}

// =================================
// SIDEBAR TOGGLE LOGIC
// =================================
const openNav = document.getElementById('openNav');
const closeNav = document.getElementById('closeNav');
const sideMenu = document.getElementById('side-menu');

if (openNav) {
    openNav.onclick = () => sideMenu.style.width = "300px";
}

if (closeNav) {
    closeNav.onclick = () => sideMenu.style.width = "0";
}

// =================================
// AUTHENTICATION
// =================================
function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// =================================
// SMOOTH SCROLLING FOR ANCHOR LINKS
// =================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// =================================
// FADE IN ANIMATION ON SCROLL
// =================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe feature cards
document.querySelectorAll('.feature-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'all 0.6s ease-out';
    observer.observe(card);
});
document.addEventListener('DOMContentLoaded', function() {
    initNavbarScroll();
    initSmoothScroll();
    initActiveNavLink();
    initMobileMenu();
    initAnimations();
    initButtonFeedback();
    console.log('✅ EnrollSched System Initialized');
});

function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            navbar.classList.add('is-scrolled');
        } else {
            navbar.classList.remove('is-scrolled');
        }
    });
}

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const navbarHeight = 64;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

function initActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');

    const observerOptions = {
        root: null,
        rootMargin: '-40% 0px -60% 0px',
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const activeSection = entry.target.id;
                
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${activeSection}`) {
                        link.classList.add('active');
                    }
                });

                document.querySelectorAll('.mobile-nav-menu a').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${activeSection}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
    });
}

function initMobileMenu() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const closeBtn = document.getElementById('mobileCloseBtn');
    const overlay = document.getElementById('mobileNavOverlay');
    const menu = document.getElementById('mobileNavMenu');
    const mobileLinks = menu.querySelectorAll('a');

    function openMenu() {
        overlay.classList.add('active');
        menu.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (menuBtn) {
            menuBtn.setAttribute('aria-expanded', 'true');
        }
        if (overlay) {
            overlay.setAttribute('aria-hidden', 'false');
        }
        if (menu) {
            menu.setAttribute('aria-hidden', 'false');
        }
    }

    function closeMenu() {
        overlay.classList.remove('active');
        menu.classList.remove('active');
        document.body.style.overflow = '';
        if (menuBtn) {
            menuBtn.setAttribute('aria-expanded', 'false');
        }
        if (overlay) {
            overlay.setAttribute('aria-hidden', 'true');
        }
        if (menu) {
            menu.setAttribute('aria-hidden', 'true');
        }
    }

    if (menuBtn) {
        menuBtn.addEventListener('click', openMenu);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeMenu);
    }

    if (overlay) {
        overlay.addEventListener('click', closeMenu);
    }

    mobileLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });
}

function initAnimations() {
    const animatedElements = document.querySelectorAll(
        '.problem-card, .feature-card, .step-item, .benefit-item'
    );

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                animationObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animatedElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        animationObserver.observe(element);
    });
}

function initButtonFeedback() {
    document.querySelectorAll('.btn-primary, .btn-white').forEach(button => {
        button.addEventListener('click', function() {
            const buttonText = this.textContent.trim();
            console.log(`🔘 Button clicked: ${buttonText}`);

            this.classList.add('is-pressed');
            setTimeout(() => {
                this.classList.remove('is-pressed');
            }, 140);
        });
    });
}

document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!form.classList.contains('contact-form')) return;

    e.preventDefault();
    console.log('📨 Contact form submitted');
    form.reset();
});

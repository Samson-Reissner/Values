// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Lending card click handler
    const lendingCard = document.getElementById('verifiedBorrowersCard');
    if (lendingCard) {
        lendingCard.addEventListener('click', function() {
            // Add click animation
            this.style.transform = "scale(0.98)";
            this.style.boxShadow = "0 5px 15px rgba(67, 97, 238, 0.2)";
            
            setTimeout(() => {
                this.style.transform = "";
                this.style.boxShadow = "";
                
                // Check authentication and redirect
                const token = localStorage.getItem("authToken");
                if (!token) {
                    window.location.href = "login.html?redirect=credit_enquiry.html";
                } else {
                    window.location.href = "credit_enquiry.html";
                }
            }, 200);
        });
    }

    // Start lending button handler
    const startLendingBtn = document.getElementById('startLendingBtn');
    if (startLendingBtn) {
        startLendingBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Add click animation
            this.style.transform = "scale(0.95)";
            
            setTimeout(() => {
                this.style.transform = "";
                
                // Check authentication and redirect
                const token = localStorage.getItem("authToken");
                if (!token) {
                    window.location.href = "login.html?redirect=lender_form.html";
                } else {
                    window.location.href = "lender_form.html";
                }
            }, 200);
        });
    }

    // FAQ functionality
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            // Close all other FAQ items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });
            
            // Toggle current item
            item.classList.toggle('active');
        });
    });

    // Add entrance animations
    const animateOnScroll = function() {
        const elements = document.querySelectorAll('.benefit-card, .step-card, .lending-card, .security-feature');
        
        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const screenPosition = window.innerHeight / 1.2;
            
            if (elementPosition < screenPosition) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    };

    // Set initial state for animated elements
    const animatedElements = document.querySelectorAll('.benefit-card, .step-card, .lending-card, .security-feature');
    animatedElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });

    // Run on load and scroll
    animateOnScroll();
    window.addEventListener('scroll', animateOnScroll);

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            if (this.getAttribute('href').startsWith('#') && 
                this.getAttribute('href') !== '#') {
                e.preventDefault();
                
                const targetId = this.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 100,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // Add hover effect for lending card
    if (lendingCard) {
        lendingCard.addEventListener('mouseenter', function() {
            const indicator = this.querySelector('.btn-primary i');
            if (indicator) {
                indicator.style.transform = "translateX(5px)";
            }
        });
        
        lendingCard.addEventListener('mouseleave', function() {
            const indicator = this.querySelector('.btn-primary i');
            if (indicator) {
                indicator.style.transform = "translateX(0)";
            }
        });
    }

    // Stats counter animation
    const animateCounters = function() {
        const statValues = document.querySelectorAll('.stat-value');
        
        statValues.forEach(stat => {
            const target = stat.textContent;
            const numericValue = parseFloat(target.replace('%', ''));
            
            if (!isNaN(numericValue)) {
                let current = 0;
                const increment = numericValue / 50;
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= numericValue) {
                        current = numericValue;
                        clearInterval(timer);
                    }
                    
                    if (target.includes('%')) {
                        stat.textContent = current.toFixed(1) + '%';
                    } else {
                        stat.textContent = Math.floor(current);
                    }
                }, 30);
            }
        });
    };

    // Trigger counter animation when hero section is in view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setTimeout(animateCounters, 500);
            }
        });
    });

    const heroSection = document.querySelector('.p2p-hero');
    if (heroSection) {
        observer.observe(heroSection);
    }
});
// Navbar scroll effect
window.addEventListener('scroll', function() {
    if (window.scrollY > 50) {
        document.querySelector('.navbar').classList.add('navbar-shrink');
    } else {
        document.querySelector('.navbar').classList.remove('navbar-shrink');
    }
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        // Only smooth scroll for on-page anchors
        const href = this.getAttribute('href');
        if (href && href.startsWith('#') && document.querySelector(href)) {
            e.preventDefault();
            document.querySelector(href).scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
}); 
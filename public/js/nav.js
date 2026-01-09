// Navigation utility - highlights active nav link and adds smooth transitions
(function() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }

  function initNav() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
      try {
        // Get the pathname from the href
        let linkPath;
        if (link.href) {
          linkPath = new URL(link.href, window.location.origin).pathname;
        } else {
          linkPath = link.getAttribute('href') || '';
        }
        
        // Remove trailing slashes for comparison (except root)
        const normalizedCurrent = currentPath.replace(/\/$/, '') || '/';
        const normalizedLink = linkPath.replace(/\/$/, '') || '/';
        
        // Check if current path matches link path
        if (normalizedCurrent === normalizedLink) {
          link.classList.add('active');
        } else if (normalizedCurrent !== '/' && normalizedCurrent.startsWith(normalizedLink) && normalizedLink !== '/') {
          // For nested routes (e.g., /shop/product matches /shop)
          link.classList.add('active');
        }

        // Add smooth transition on click for internal links
        if (linkPath && linkPath.startsWith('/') && !linkPath.startsWith('//')) {
          link.addEventListener('click', function(e) {
            // Add visual feedback
            this.style.transition = 'all 0.2s ease';
            this.style.transform = 'scale(0.98)';
            
            setTimeout(() => {
              this.style.transform = '';
            }, 150);
          });
        }
      } catch (e) {
        // If URL parsing fails, skip this link
        console.warn('Could not parse nav link:', link.href);
      }
    });

    // Fade in page content on load for smooth appearance
    if (document.body) {
      const container = document.querySelector('.container');
      if (container) {
        container.style.opacity = '0';
        container.style.transform = 'translateY(10px)';
        
        requestAnimationFrame(() => {
          container.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
          container.style.opacity = '1';
          container.style.transform = 'translateY(0)';
        });
      }
    }
  }
})();


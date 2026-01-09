// Load dark mode on page load - check both localStorage and settings
(function() {
  // First check localStorage
  const darkMode = localStorage.getItem('darkMode') === 'true';
  const darkModeSetting = localStorage.getItem('darkModeSetting');
  
  // If setting exists, use it; otherwise use localStorage
  const isDark = darkModeSetting ? darkModeSetting === 'true' : darkMode;
  
  // Apply dark mode immediately
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
  
  // Also try to fetch from server settings if available
  if (typeof fetch !== 'undefined') {
    fetch('/api/settings/dark_mode')
      .then(res => res.json())
      .then(data => {
        if (data && data.value === 'true') {
          document.documentElement.setAttribute('data-theme', 'dark');
          localStorage.setItem('darkMode', 'true');
          localStorage.setItem('darkModeSetting', 'true');
        }
      })
      .catch(() => {
        // Ignore errors if not authenticated
      });
  }
})();

// Function to apply dark mode globally
function applyDarkMode(isDark) {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  localStorage.setItem('darkMode', isDark);
  localStorage.setItem('darkModeSetting', isDark);
}

// Update theme toggle if exists
function updateThemeToggle() {
  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    toggle.textContent = isDark ? '☀️' : '🌙';
  }
}

// Initialize theme toggle on page load
document.addEventListener('DOMContentLoaded', function() {
  updateThemeToggle();
});

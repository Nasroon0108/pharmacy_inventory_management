// Check authentication status
async function checkAuth() {
  try {
    const response = await fetch('/api/session', { cache: 'no-store' }); // Ensure fresh session check
    if (response.ok) {
      const data = await response.json();
      return data.user;
    }
    return null;
  } catch (error) {
    console.error('Auth check failed:', error);
    return null;
  }
}

// Login function with role support
async function login(username, password, role = null) {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password, role })
    });

    const data = await response.json();
    
    if (response.ok) {
      // Redirect based on role
      if (data.user.role === 'admin') {
        window.location.href = '/dashboard';
      } else {
        // Redirect to shop for regular users
        window.location.href = '/shop';
      }
    } else {
      // Show specific error message
      const errorMsg = data.error || 'Login failed. Please check your credentials.';
      showAlert(errorMsg, 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showAlert('Network error. Please check your connection and try again.', 'error');
  }
}

// Register function
async function register(username, password, email) {
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password, email })
    });

    const data = await response.json();
    
    if (response.ok) {
      showAlert('Registration successful! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = '/shop';
      }, 1000);
    } else {
      showAlert(data.error || 'Registration failed', 'error');
    }
  } catch (error) {
    showAlert('An error occurred during registration', 'error');
  }
}

// Logout function
async function logout() {
  try {
    const response = await fetch('/api/logout', { method: 'POST' });
    if (response.ok) {
      // Clear any local storage items related to auth
      localStorage.removeItem('cart');
      // Redirect to home page
      window.location.href = '/';
    } else {
      // Even if logout fails, try to redirect
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Logout failed:', error);
    // Still redirect even on error
    window.location.href = '/';
  }
}

// Show alert message
function showAlert(message, type = 'info') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;
  
  const container = document.querySelector('.container');
  if (container) {
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
      alertContainer.innerHTML = '';
      alertContainer.appendChild(alertDiv);
    } else {
      container.insertBefore(alertDiv, container.firstChild);
    }
    
    setTimeout(() => {
      alertDiv.remove();
    }, 5000);
  }
}

// Protect routes
async function protectRoute() {
  const user = await checkAuth();
  if (!user) {
    window.location.href = '/user-login';
    return false;
  }
  return user;
}

// Protect admin routes
async function protectAdminRoute() {
  const user = await checkAuth();
  if (!user) {
    window.location.href = '/admin-login';
    return false;
  }
  if (user.role !== 'admin') {
    window.location.href = '/shop';
    return false;
  }
  return user;
}


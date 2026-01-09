let products = [];
let categories = [];
let currentProduct = null;

let lowStockThreshold = 10; // Default value, will be loaded from settings
let expiryAlertDays = 30; // Default value, will be loaded from settings

// Load products
async function loadProducts(search = '', category = '') {
  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);

    const response = await fetch(`/api/products?${params.toString()}`);
    products = await response.json();
    displayProducts();
  } catch (error) {
    console.error('Error loading products:', error);
    showAlert('Failed to load products', 'error');
  }
}

// Load categories
async function loadCategories() {
  try {
    const response = await fetch('/api/categories');
    categories = await response.json();
    populateCategorySelect();
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

// Load settings on page load
async function loadSettings() {
  try {
    const response = await fetch('/api/settings/low_stock_threshold');
    if (response.ok) {
      const setting = await response.json();
      lowStockThreshold = parseInt(setting.value) || 10;
    }
    
    // Load expiry alert days
    const expiryResponse = await fetch('/api/settings/expiry_alert_days');
    if (expiryResponse.ok) {
      const expirySetting = await expiryResponse.json();
      expiryAlertDays = parseInt(expirySetting.value) || 30;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    // Use default value if settings fail to load
  }
}

// Check if product is expiring soon
function isExpiringSoon(expiryDate) {
  if (!expiryDate) return false;
  
  const expiry = toSriLankanDate(expiryDate);
  const today = getSriLankanToday();
  
  const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  
  return daysUntilExpiry >= 0 && daysUntilExpiry <= expiryAlertDays;
}

// Get days until expiry
function getDaysUntilExpiry(expiryDate) {
  if (!expiryDate) return null;
  
  const expiry = toSriLankanDate(expiryDate);
  const today = getSriLankanToday();
  
  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
}

// Display products in table
function displayProducts() {
  const tbody = document.querySelector('#productsTable tbody');
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No products found</td></tr>';
    return;
  }

  // Check if dark mode is active
  const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
  
  // Dark mode compatible colors
  const lowStockBg = isDarkMode ? '#7f1d1d' : '#fee2e2'; // Dark red for dark mode, light red for light mode
  const expiryUrgentBg = isDarkMode ? '#7f1d1d' : '#fee2e2'; // Dark red for urgent expiry
  const expiryWarningBg = isDarkMode ? '#78350f' : '#fef3c7'; // Dark orange for warning expiry
  const rowBg = isDarkMode ? '#1f1f1f' : '#fef2f2'; // Dark gray for row background

  // Check for low stock items using dynamic threshold
  const lowStockItems = products.filter(p => p.quantity < lowStockThreshold);
  
  // Check for expiring soon items
  const expiringItems = products.filter(p => isExpiringSoon(p.expiry_date));
  
  // Show alerts if there are low stock or expiring items
  if (lowStockItems.length > 0) {
    showLowStockAlert(lowStockItems.length);
  }
  
  if (expiringItems.length > 0) {
    showExpiryAlert(expiringItems.length);
  }

  tbody.innerHTML = products.map(product => {
    const isLowStock = product.quantity < lowStockThreshold;
    const isExpiring = isExpiringSoon(product.expiry_date);
    const daysUntilExpiry = getDaysUntilExpiry(product.expiry_date);
    
    const quantityStyle = isLowStock 
      ? `color: var(--danger-color); font-weight: bold; background-color: ${lowStockBg}; padding: 0.25rem 0.5rem; border-radius: 4px;` 
      : '';
    
    // Expiry date styling
    let expiryStyle = '';
    let expiryBadge = '';
    if (isExpiring && daysUntilExpiry !== null) {
      const isUrgent = daysUntilExpiry <= 7;
      expiryStyle = isUrgent 
        ? `color: var(--danger-color); font-weight: bold; background-color: ${expiryUrgentBg}; padding: 0.25rem 0.5rem; border-radius: 4px;`
        : `color: var(--warning-color); font-weight: bold; background-color: ${expiryWarningBg}; padding: 0.25rem 0.5rem; border-radius: 4px;`;
      expiryBadge = ` <span style="${expiryStyle}">⚠️ ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}</span>`;
    }
    
    const rowStyle = isLowStock || isExpiring ? `background-color: ${rowBg};` : '';
    const defaultImage = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22%3E%3Crect width=%2250%22 height=%2250%22 fill=%22%23f3f4f6%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2220%22 fill=%22%239ca3af%22%3E💊%3C/text%3E%3C/svg%3E';
    
    return `
      <tr style="${rowStyle}">
        <td>
          <img 
            src="${product.image || defaultImage}" 
            alt="${product.name}" 
            style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color);"
            onerror="this.src='${defaultImage}'"
          >
        </td>
        <td>${product.name} ${isLowStock ? '⚠️' : ''} ${isExpiring ? '📅' : ''}</td>
        <td>${product.category}</td>
        <td><span style="${quantityStyle}">${product.quantity}</span></td>
        <td>Rs ${parseFloat(product.price).toFixed(2)}</td>
        <td>${product.expiry_date ? formatSriLankanDate(product.expiry_date) : 'N/A'}${expiryBadge}</td>
        <td>${product.supplier || 'N/A'}</td>
        <td>
          <button onclick="editProduct(${product.id})" class="btn btn-primary" style="padding: 0.5rem 1rem; margin-right: 0.5rem;">Edit</button>
          <button onclick="deleteProduct(${product.id})" class="btn btn-danger" style="padding: 0.5rem 1rem;">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

// Populate category select
function populateCategorySelect() {
  const select = document.getElementById('category');
  const filterSelect = document.getElementById('categoryFilter');
  
  if (select) {
    select.innerHTML = '<option value="">Select Category</option>' +
      categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('');
  }

  if (filterSelect) {
    filterSelect.innerHTML = '<option value="">All Categories</option>' +
      categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('');
  }
}

// Open add product modal
function openAddModal() {
  currentProduct = null;
  document.getElementById('productForm').reset();
  document.getElementById('modalTitle').textContent = 'Add New Product';
  // Reset image previews
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('currentImage').style.display = 'none';
  document.getElementById('previewImg').src = '';
  document.getElementById('currentImg').src = '';
  document.getElementById('productImage').value = '';
  document.getElementById('productModal').style.display = 'block';
}

// Edit product
async function editProduct(id) {
  try {
    const response = await fetch(`/api/products/${id}`);
    const product = await response.json();
    
    currentProduct = product;
    document.getElementById('name').value = product.name;
    document.getElementById('description').value = product.description || '';
    document.getElementById('category').value = product.category;
    document.getElementById('quantity').value = product.quantity;
    document.getElementById('price').value = product.price;
    document.getElementById('expiry_date').value = product.expiry_date || '';
    document.getElementById('supplier').value = product.supplier || '';
    document.getElementById('barcode').value = product.barcode || '';
    
    // Handle image display
    const currentImageDiv = document.getElementById('currentImage');
    const currentImg = document.getElementById('currentImg');
    const imagePreviewDiv = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const imageInput = document.getElementById('productImage');
    
    // Reset image preview
    imagePreviewDiv.style.display = 'none';
    previewImg.src = '';
    imageInput.value = '';
    
    // Show current image if exists
    if (product.image) {
      currentImg.src = product.image;
      currentImageDiv.style.display = 'block';
    } else {
      currentImageDiv.style.display = 'none';
    }
    
    document.getElementById('modalTitle').textContent = 'Edit Product';
    document.getElementById('productModal').style.display = 'block';
  } catch (error) {
    console.error('Error loading product:', error);
    showAlert('Failed to load product', 'error');
  }
}

// Save product
async function saveProduct() {
  const form = document.getElementById('productForm');
  const formData = new FormData(form);
  
  // Note: Don't set Content-Type header - browser will set it with boundary for multipart/form-data
  // The image file will be included in FormData automatically

  try {
    const url = currentProduct 
      ? `/api/products/${currentProduct.id}`
      : '/api/products';
    
    const method = currentProduct ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      // Don't set Content-Type - let browser set it for FormData
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      showAlert(data.message || 'Product saved successfully', 'success');
      closeModal();
      loadProducts();
    } else {
      showAlert(data.error || 'Failed to save product', 'error');
    }
  } catch (error) {
    console.error('Error saving product:', error);
    showAlert('An error occurred', 'error');
  }
}

// Delete product
async function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product?')) {
    return;
  }

  try {
    const response = await fetch(`/api/products/${id}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (response.ok) {
      showAlert(data.message || 'Product deleted successfully', 'success');
      loadProducts();
    } else {
      showAlert(data.error || 'Failed to delete product', 'error');
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    showAlert('An error occurred', 'error');
  }
}

// Close modal
function closeModal() {
  document.getElementById('productModal').style.display = 'none';
  currentProduct = null;
  document.getElementById('productForm').reset();
  // Reset image previews
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('currentImage').style.display = 'none';
  document.getElementById('previewImg').src = '';
  document.getElementById('currentImg').src = '';
  document.getElementById('productImage').value = '';
}

// Preview product image before upload
function previewProductImage(event) {
  const file = event.target.files[0];
  const previewDiv = document.getElementById('imagePreview');
  const previewImg = document.getElementById('previewImg');
  const currentImageDiv = document.getElementById('currentImage');
  
  if (file) {
    // Hide current image when new one is selected
    currentImageDiv.style.display = 'none';
    
    const reader = new FileReader();
    reader.onload = function(e) {
      previewImg.src = e.target.result;
      previewDiv.style.display = 'block';
    };
    reader.readAsDataURL(file);
  } else {
    previewDiv.style.display = 'none';
  }
}

// Remove image preview
function removeImagePreview() {
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('previewImg').src = '';
  document.getElementById('productImage').value = '';
}

// Search products
function searchProducts() {
  const search = document.getElementById('searchInput').value;
  const category = document.getElementById('categoryFilter').value;
  loadProducts(search, category);
}

// Show alert
function showAlert(message, type = 'info') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;
  
  const container = document.querySelector('.container');
  if (container) {
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
      alertDiv.remove();
    }, 5000);
  }
}

// Show low stock alert
function showLowStockAlert(count) {
  const alertContainer = document.getElementById('alertContainer');
  if (!alertContainer) return;
  
  // Remove existing low stock alert
  const existingAlert = document.getElementById('lowStockAlert');
  if (existingAlert) existingAlert.remove();
  
  const alertDiv = document.createElement('div');
  alertDiv.id = 'lowStockAlert';
  alertDiv.className = 'alert alert-error';
  alertDiv.innerHTML = `
    <strong>⚠️ Low Stock Alert:</strong> ${count} product(s) have low stock (quantity < ${lowStockThreshold}). 
    <button onclick="filterLowStock()" class="btn btn-primary" style="margin-left: 1rem; padding: 0.5rem 1rem; font-size: 0.875rem;">View Low Stock Items</button>
  `;
  
  alertContainer.appendChild(alertDiv);
}

// Filter to show only low stock items
function filterLowStock() {
  const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
  const lowStockBg = isDarkMode ? '#7f1d1d' : '#fee2e2';
  const rowBg = isDarkMode ? '#1f1f1f' : '#fef2f2';
  
  const lowStockProducts = products.filter(p => p.quantity < lowStockThreshold);
  
  const tbody = document.querySelector('#productsTable tbody');
  const resetBtn = document.getElementById('resetBtn');
  
  if (!tbody) return;
  
  if (lowStockProducts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No low stock items found</td></tr>';
    if (resetBtn) resetBtn.style.display = 'none';
    return;
  }
  
  const defaultImage = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22%3E%3Crect width=%2250%22 height=%2250%22 fill=%22%23f3f4f6%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2220%22 fill=%22%239ca3af%22%3E💊%3C/text%3E%3C/svg%3E';
  
  tbody.innerHTML = lowStockProducts.map(product => `
    <tr style="background-color: ${rowBg};">
      <td>
        <img 
          src="${product.image || defaultImage}" 
          alt="${product.name}" 
          style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color);"
          onerror="this.src='${defaultImage}'"
        >
      </td>
      <td>${product.name} ⚠️</td>
      <td>${product.category}</td>
      <td><span style="color: var(--danger-color); font-weight: bold; background-color: ${lowStockBg}; padding: 0.25rem 0.5rem; border-radius: 4px;">${product.quantity}</span></td>
      <td>Rs ${parseFloat(product.price).toFixed(2)}</td>
      <td>${product.expiry_date ? formatSriLankanDate(product.expiry_date) : 'N/A'}</td>
      <td>${product.supplier || 'N/A'}</td>
      <td>
        <button onclick="editProduct(${product.id})" class="btn btn-primary" style="padding: 0.5rem 1rem; margin-right: 0.5rem;">Edit</button>
        <button onclick="deleteProduct(${product.id})" class="btn btn-danger" style="padding: 0.5rem 1rem;">Delete</button>
      </td>
    </tr>
  `).join('');
  
  if (resetBtn) resetBtn.style.display = 'inline-block';
}

// Show expiry alert
function showExpiryAlert(count) {
  const alertContainer = document.getElementById('alertContainer');
  if (!alertContainer) return;
  
  // Remove existing expiry alert
  const existingAlert = document.getElementById('expiryAlert');
  if (existingAlert) existingAlert.remove();
  
  const alertDiv = document.createElement('div');
  alertDiv.id = 'expiryAlert';
  alertDiv.className = 'alert alert-warning';
  alertDiv.innerHTML = `
    <strong>📅 Expiry Alert:</strong> ${count} product(s) are expiring within ${expiryAlertDays} days. 
    <button onclick="filterExpiring()" class="btn btn-warning" style="margin-left: 1rem; padding: 0.5rem 1rem; font-size: 0.875rem;">View Expiring Items</button>
  `;
  
  alertContainer.appendChild(alertDiv);
}

// Filter to show only expiring items
function filterExpiring() {
  const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
  const expiryUrgentBg = isDarkMode ? '#7f1d1d' : '#fee2e2';
  const expiryWarningBg = isDarkMode ? '#78350f' : '#fef3c7';
  const rowBg = isDarkMode ? '#1f1f1f' : '#fef2f2';
  
  const expiringProducts = products.filter(p => isExpiringSoon(p.expiry_date));
  
  const tbody = document.querySelector('#productsTable tbody');
  const resetBtn = document.getElementById('resetBtn');
  
  if (!tbody) return;
  
  if (expiringProducts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No expiring items found</td></tr>';
    if (resetBtn) resetBtn.style.display = 'none';
    return;
  }
  
  const defaultImage = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22%3E%3Crect width=%2250%22 height=%2250%22 fill=%22%23f3f4f6%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2220%22 fill=%22%239ca3af%22%3E💊%3C/text%3E%3C/svg%3E';
  
  tbody.innerHTML = expiringProducts.map(product => {
    const daysUntilExpiry = getDaysUntilExpiry(product.expiry_date);
    const isUrgent = daysUntilExpiry <= 7;
    const expiryStyle = isUrgent 
      ? `color: var(--danger-color); font-weight: bold; background-color: ${expiryUrgentBg}; padding: 0.25rem 0.5rem; border-radius: 4px;`
      : `color: var(--warning-color); font-weight: bold; background-color: ${expiryWarningBg}; padding: 0.25rem 0.5rem; border-radius: 4px;`;
    
    return `
      <tr style="background-color: ${rowBg};">
        <td>
          <img 
            src="${product.image || defaultImage}" 
            alt="${product.name}" 
            style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color);"
            onerror="this.src='${defaultImage}'"
          >
        </td>
        <td>${product.name} 📅</td>
        <td>${product.category}</td>
        <td>${product.quantity}</td>
        <td>Rs ${parseFloat(product.price).toFixed(2)}</td>
        <td>
          ${formatSriLankanDate(product.expiry_date)} 
          <span style="${expiryStyle}">⚠️ ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}</span>
        </td>
        <td>${product.supplier || 'N/A'}</td>
        <td>
          <button onclick="editProduct(${product.id})" class="btn btn-primary" style="padding: 0.5rem 1rem; margin-right: 0.5rem;">Edit</button>
          <button onclick="deleteProduct(${product.id})" class="btn btn-danger" style="padding: 0.5rem 1rem;">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
  
  if (resetBtn) resetBtn.style.display = 'inline-block';
}

// Reset filter to show all products
function resetFilter() {
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) resetBtn.style.display = 'none';
  
  // Reload all products
  const search = document.getElementById('searchInput').value;
  const category = document.getElementById('categoryFilter').value;
  loadProducts(search, category);
}

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('productModal');
  if (event.target == modal) {
    closeModal();
  }
}


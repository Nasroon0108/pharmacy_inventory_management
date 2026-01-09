const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Helper function to get current date in Sri Lankan timezone (UTC+5:30)
function getSriLankanDate() {
  const now = new Date();
  // Sri Lanka is UTC+5:30
  const sriLankanOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const sriLankanTime = new Date(utcTime + sriLankanOffset);
  return sriLankanTime;
}

// Helper function to get today's date string in Sri Lankan timezone (YYYY-MM-DD)
function getSriLankanDateString() {
  const date = getSriLankanDate();
  return date.toISOString().split('T')[0];
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'profile-' + (req.session?.user?.id || 'temp') + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Multer configuration for product images
const productStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + ext);
  }
});

const uploadProduct = multer({
  storage: productStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for product images
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Session configuration
app.use(session({
  secret: 'pharmacy-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// User authentication middleware - redirects HTML requests to login
const requireUserAuth = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    // If it's an HTML request, redirect to login
    if (req.accepts('html')) {
      res.redirect('/user-login');
    } else {
      // For API requests, return JSON error
      res.status(401).json({ error: 'Unauthorized' });
    }
  }
};

// Admin middleware - for HTML pages, redirect instead of JSON error
const requireAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    next();
  } else {
    // If it's an HTML request, redirect to login
    if (req.accepts('html')) {
      if (!req.session.user) {
        res.redirect('/admin-login');
      } else {
        res.redirect('/shop');
      }
    } else {
      // For API requests, return JSON error
      return res.status(403).json({ error: 'Admin access required' });
    }
  }
};

// Routes

// Serve HTML pages
app.get('/', (req, res) => {
  // Always show home page, don't auto-redirect
  // Users can navigate manually
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'contact.html'));
});

app.get('/login', (req, res) => {
  res.redirect('/user-login');
});

app.get('/user-login', (req, res) => {
  // Always show login page - let client-side handle redirects if needed
  // This ensures logout works properly
  res.sendFile(path.join(__dirname, 'views', 'user-login.html'));
});

app.get('/admin-login', (req, res) => {
  if (req.session.user && req.session.user.role === 'admin') {
    res.redirect('/dashboard');
  } else if (req.session.user && req.session.user.role !== 'admin') {
    // If a regular user is logged in, clear their session and show admin login
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
      }
      res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
    });
  } else {
    res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
  }
});

// User dashboard (for regular users)
app.get('/user-dashboard', requireAuth, (req, res) => {
  // Redirect admin to admin dashboard
  if (req.session.user.role === 'admin') {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'views', 'user-dashboard.html'));
});

// Protect admin routes
app.get('/dashboard', requireAuth, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/inventory', requireAuth, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'inventory.html'));
});

app.get('/users', requireAuth, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'users.html'));
});

app.get('/settings', requireAuth, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'settings.html'));
});

app.get('/shop', requireUserAuth, (req, res) => {
  // Shop requires user login
  res.sendFile(path.join(__dirname, 'views', 'shop.html'));
});

app.get('/cart', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'cart.html'));
});

app.get('/checkout', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'checkout.html'));
});

app.get('/my-orders', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'my-orders.html'));
});

app.get('/order-management', requireAuth, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'order-management.html'));
});

// API Routes

// Login
app.post('/api/login', (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const getUser = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = getUser.get(username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check if user has a role, default to 'user' if not set
    const userRole = user.role || 'user';

    // Check role if specified
    if (role && userRole !== role) {
      return res.status(403).json({ 
        error: `Access denied. This account is for ${userRole === 'admin' ? 'admin' : 'customer'} login. Please use the ${userRole === 'admin' ? 'admin' : 'customer'} login page.` 
      });
    }

    bcrypt.compare(password, user.password, (err, match) => {
      if (err) {
        console.error('Password comparison error:', err);
        return res.status(500).json({ error: 'Authentication error. Please try again.' });
      }
      
      if (!match) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      req.session.user = { 
        id: user.id, 
        username: user.username, 
        email: user.email,
        role: userRole
      };
      res.json({ success: true, user: req.session.user });
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Database error. Please try again.' });
  }
});

// Register (only for customers)
app.post('/api/register', (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if username already exists
    const checkUser = db.prepare('SELECT * FROM users WHERE username = ?');
    const existingUser = checkUser.get(username);

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Insert new user with 'user' role
    const insertUser = db.prepare('INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)');
    const result = insertUser.run(username, hashedPassword, email || null, 'user');

    // Auto-login after registration
    req.session.user = { 
      id: result.lastInsertRowid, 
      username: username, 
      email: email || null,
      role: 'user'
    };
    res.json({ success: true, user: req.session.user, message: 'Registration successful' });
  } catch (error) {
    return res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  const sessionId = req.sessionID;
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    // Clear session cookie with proper options
    res.clearCookie('connect.sid', { 
      path: '/',
      httpOnly: true,
      secure: false
    });
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Check session
app.get('/api/session', (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Products API

// Get all products
app.get('/api/products', requireAuth, (req, res) => {
  try {
    const { search, category } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ? OR barcode LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC';

    const getProducts = db.prepare(query);
    const rows = getProducts.all(...params);
    res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get single product
app.get('/api/products/:id', requireAuth, (req, res) => {
  try {
    const getProduct = db.prepare('SELECT * FROM products WHERE id = ?');
    const row = getProduct.get(req.params.id);
    
    if (!row) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(row);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Create product
app.post('/api/products', requireAuth, uploadProduct.single('image'), (req, res) => {
  try {
    const { name, description, category, quantity, price, expiry_date, supplier, barcode } = req.body;

    if (!name || !category || quantity === undefined || !price) {
      // If image was uploaded but validation failed, delete it
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Handle image upload
    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    const insertProduct = db.prepare(
      `INSERT INTO products (name, description, category, quantity, price, expiry_date, supplier, barcode, image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    
    const result = insertProduct.run(
      name, 
      description || null, 
      category, 
      quantity, 
      price, 
      expiry_date || null, 
      supplier || null, 
      barcode || null,
      imagePath
    );
    
    res.json({ id: result.lastInsertRowid, message: 'Product created successfully' });
  } catch (error) {
    // If image was uploaded but error occurred, delete it
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ error: error.message });
  }
});

// Update product
app.put('/api/products/:id', requireAuth, uploadProduct.single('image'), (req, res) => {
  try {
    const { name, description, category, quantity, price, expiry_date, supplier, barcode } = req.body;

    // Get existing product to check for old image
    const getProduct = db.prepare('SELECT image FROM products WHERE id = ?');
    const existingProduct = getProduct.get(req.params.id);
    
    if (!existingProduct) {
      // If new image was uploaded but product not found, delete it
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Product not found' });
    }

    // Handle image upload
    let imagePath = existingProduct.image; // Keep existing image by default
    if (req.file) {
      // Delete old image if it exists
      if (existingProduct.image) {
        const oldImagePath = path.join(__dirname, 'public', existingProduct.image);
        if (fs.existsSync(oldImagePath)) {
          try {
            fs.unlinkSync(oldImagePath);
          } catch (err) {
            console.error('Error deleting old product image:', err);
          }
        }
      }
      imagePath = `/uploads/${req.file.filename}`;
    }

    const updateProduct = db.prepare(
      `UPDATE products 
       SET name = ?, description = ?, category = ?, quantity = ?, price = ?, 
           expiry_date = ?, supplier = ?, barcode = ?, image = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    );
    
    const result = updateProduct.run(
      name, 
      description || null, 
      category, 
      quantity, 
      price, 
      expiry_date || null, 
      supplier || null, 
      barcode || null,
      imagePath,
      req.params.id
    );
    
    if (result.changes === 0) {
      // If new image was uploaded but update failed, delete it
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    // If image was uploaded but error occurred, delete it
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ error: error.message });
  }
});

// Delete product
app.delete('/api/products/:id', requireAuth, (req, res) => {
  try {
    // Get product image path before deletion
    const getProduct = db.prepare('SELECT image FROM products WHERE id = ?');
    const product = getProduct.get(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const deleteProduct = db.prepare('DELETE FROM products WHERE id = ?');
    const result = deleteProduct.run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete product image if it exists
    if (product.image) {
      const imagePath = path.join(__dirname, 'public', product.image);
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
        } catch (err) {
          console.error('Error deleting product image:', err);
          // Continue even if image deletion fails - product is already deleted
        }
      }
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get categories
app.get('/api/categories', requireAuth, (req, res) => {
  try {
    const getCategories = db.prepare('SELECT * FROM categories ORDER BY name');
    const rows = getCategories.all();
    res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get all users (for admin panel)
app.get('/api/users', requireAuth, requireAdmin, (req, res) => {
  try {
    const getUsers = db.prepare('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC');
    const users = getUsers.all();
    res.json(users);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete user (admin only)
app.delete('/api/users/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = req.session.user.id;

    // Prevent deleting yourself
    if (userId === currentUserId) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    // Check if user exists and get their role
    const getUser = db.prepare('SELECT id, username, role FROM users WHERE id = ?');
    const user = getUser.get(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting admin users
    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Cannot delete admin users' });
    }

    // Check if user has orders
    const getOrderCount = db.prepare('SELECT COUNT(*) as count FROM orders WHERE user_id = ?');
    const orderCount = getOrderCount.get(userId).count;

    // Get user's profile picture path before deletion
    const getUserForPicture = db.prepare('SELECT profile_picture FROM users WHERE id = ?');
    const userWithPicture = getUserForPicture.get(userId);
    const profilePicturePath = userWithPicture && userWithPicture.profile_picture 
      ? path.join(__dirname, 'public', userWithPicture.profile_picture) 
      : null;

    // Prepare deletion statements - delete in order: order_items -> orders -> user
    const deleteOrderItems = db.prepare('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)');
    const deleteOrders = db.prepare('DELETE FROM orders WHERE user_id = ?');
    const deleteUser = db.prepare('DELETE FROM users WHERE id = ?');

    // Execute deletions in a transaction
    const transaction = db.transaction(() => {
      // Delete order items first
      deleteOrderItems.run(userId);
      // Delete orders
      deleteOrders.run(userId);
      // Delete user
      const result = deleteUser.run(userId);
      return result;
    });

    const result = transaction();

    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found or could not be deleted' });
    }

    // Delete user's profile picture after successful database deletion
    if (profilePicturePath && fs.existsSync(profilePicturePath)) {
      try {
        fs.unlinkSync(profilePicturePath);
      } catch (err) {
        console.error('Error deleting profile picture:', err);
        // Continue even if picture deletion fails - user is already deleted
      }
    }

    res.json({ 
      success: true, 
      message: `User "${user.username}" has been deleted successfully.`,
      deletedOrders: orderCount
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});

// Get settings
app.get('/api/settings', requireAuth, (req, res) => {
  try {
    const getSettings = db.prepare('SELECT setting_key, setting_value, description FROM settings');
    const settings = getSettings.all();
    
    // Convert to object format
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.setting_key] = {
        value: setting.setting_value,
        description: setting.description
      };
    });
    
    res.json(settingsObj);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get single setting
app.get('/api/settings/:key', requireAuth, (req, res) => {
  try {
    const getSetting = db.prepare('SELECT setting_key, setting_value, description FROM settings WHERE setting_key = ?');
    const setting = getSetting.get(req.params.key);
    
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    res.json({
      key: setting.setting_key,
      value: setting.setting_value,
      description: setting.description
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Update setting
app.put('/api/settings/:key', requireAuth, (req, res) => {
  try {
    const { value, description } = req.body;
    
    if (value === undefined || value === null) {
      return res.status(400).json({ error: 'Setting value is required' });
    }
    
    // Check if setting exists
    const getSetting = db.prepare('SELECT * FROM settings WHERE setting_key = ?');
    const existing = getSetting.get(req.params.key);
    
    if (existing) {
      // Update existing setting
      const updateSetting = db.prepare(
        'UPDATE settings SET setting_value = ?, description = COALESCE(?, description), updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?'
      );
      updateSetting.run(value, description || null, req.params.key);
    } else {
      // Create new setting
      const insertSetting = db.prepare(
        'INSERT INTO settings (setting_key, setting_value, description) VALUES (?, ?, ?)'
      );
      insertSetting.run(req.params.key, value, description || null);
    }
    
    res.json({ success: true, message: 'Setting updated successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Update dashboard stats to use dynamic threshold
app.get('/api/dashboard/stats', requireAuth, (req, res) => {
  try {
    const stats = {};

    // Get low stock threshold from settings
    const getThreshold = db.prepare('SELECT setting_value FROM settings WHERE setting_key = ?');
    const thresholdSetting = getThreshold.get('low_stock_threshold');
    const lowStockThreshold = thresholdSetting ? parseInt(thresholdSetting.setting_value) : 10;

    // Get expiry alert days from settings
    const expirySetting = getThreshold.get('expiry_alert_days');
    const expiryAlertDays = expirySetting ? parseInt(expirySetting.setting_value) : 30;

    // Total products
    const countProducts = db.prepare('SELECT COUNT(*) as total FROM products');
    stats.totalProducts = countProducts.get().total;

    // Low stock (using dynamic threshold)
    const countLowStock = db.prepare(`SELECT COUNT(*) as total FROM products WHERE quantity < ?`);
    stats.lowStock = countLowStock.get(lowStockThreshold).total;
    stats.lowStockThreshold = lowStockThreshold;

    // Expiring soon products (using Sri Lankan timezone)
    const today = getSriLankanDate();
    const expiryDate = new Date(today);
    expiryDate.setDate(expiryDate.getDate() + expiryAlertDays);
    const expiryDateStr = expiryDate.toISOString().split('T')[0];
    const todayStr = getSriLankanDateString();
    
    const countExpiring = db.prepare(`
      SELECT COUNT(*) as total FROM products 
      WHERE expiry_date IS NOT NULL 
      AND expiry_date != '' 
      AND expiry_date <= ? 
      AND expiry_date >= ?
    `);
    stats.expiringSoon = countExpiring.get(expiryDateStr, todayStr).total;
    stats.expiryAlertDays = expiryAlertDays;

    // Total value
    const sumValue = db.prepare('SELECT SUM(quantity * price) as total FROM products');
    stats.totalValue = sumValue.get().total || 0;

    // Products by category
    const byCategory = db.prepare('SELECT category, COUNT(*) as count FROM products GROUP BY category');
    stats.byCategory = byCategory.all();

    res.json(stats);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ========== ORDERS API ==========

// Generate unique order number
function generateOrderNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
}

// Get all orders (for admin)
app.get('/api/orders', requireAuth, requireAdmin, (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT o.*, u.username as customer_username 
      FROM orders o 
      LEFT JOIN users u ON o.user_id = u.id 
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }

    query += ' ORDER BY o.created_at DESC';

    const getOrders = db.prepare(query);
    const orders = getOrders.all(...params);

    // Get order items for each order
    const getOrderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    const ordersWithItems = orders.map(order => {
      const items = getOrderItems.all(order.id);
      return { ...order, items };
    });

    res.json(ordersWithItems);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get order statistics (MUST be before /api/orders/:id route)
app.get('/api/orders/stats', requireAuth, requireAdmin, (req, res) => {
  try {
    const stats = {};

    // First, let's check if orders table exists and has data
    try {
      const checkOrders = db.prepare('SELECT COUNT(*) as count FROM orders');
      const orderCheck = checkOrders.get();
      console.log('Orders table check - Total rows:', orderCheck);
    } catch (checkError) {
      console.error('Error checking orders table:', checkError);
    }

    // Total orders
    const countOrders = db.prepare('SELECT COUNT(*) as total FROM orders');
    const totalOrdersResult = countOrders.get();
    // Ensure we get the number value, not the object
    stats.totalOrders = totalOrdersResult && totalOrdersResult.total !== undefined ? Number(totalOrdersResult.total) : 0;
    console.log('Total orders query result:', totalOrdersResult, 'Stats:', stats.totalOrders);

    // Pending orders
    const countPending = db.prepare("SELECT COUNT(*) as total FROM orders WHERE status = 'pending'");
    const pendingOrdersResult = countPending.get();
    stats.pendingOrders = pendingOrdersResult && pendingOrdersResult.total !== undefined ? Number(pendingOrdersResult.total) : 0;
    console.log('Pending orders query result:', pendingOrdersResult, 'Stats:', stats.pendingOrders);

    // Total revenue - check all orders first
    const allOrders = db.prepare('SELECT total_amount, status FROM orders').all();
    console.log('All orders in database:', allOrders);
    
    const sumRevenue = db.prepare("SELECT SUM(total_amount) as total FROM orders WHERE status != 'cancelled'");
    const revenueResult = sumRevenue.get();
    stats.totalRevenue = revenueResult && revenueResult.total !== null && revenueResult.total !== undefined ? Number(revenueResult.total) : 0;
    console.log('Revenue query result:', revenueResult, 'Stats:', stats.totalRevenue);

    // Orders by status
    const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM orders GROUP BY status');
    stats.byStatus = byStatus.all();
    console.log('Orders by status:', stats.byStatus);

    console.log('Final stats being sent:', stats);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching order stats:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get user's orders
app.get('/api/orders/my-orders', requireAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const getOrders = db.prepare(`
      SELECT * FROM orders 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `);
    const orders = getOrders.all(userId);

    // Get order items for each order
    const getOrderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    const ordersWithItems = orders.map(order => {
      const items = getOrderItems.all(order.id);
      return { ...order, items };
    });

    res.json(ordersWithItems);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get single order
app.get('/api/orders/:id', requireAuth, (req, res) => {
  try {
    const getOrder = db.prepare('SELECT * FROM orders WHERE id = ?');
    const order = getOrder.get(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user owns the order or is admin
    if (order.user_id !== req.session.user.id) {
      // For now, allow any authenticated user to view orders
      // You can add admin check here later
    }

    const getOrderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    const items = getOrderItems.all(req.params.id);

    res.json({ ...order, items });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Create order
app.post('/api/orders', requireAuth, (req, res) => {
  try {
    const { items, customer_name, customer_email, customer_phone, customer_address, payment_method, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order items are required' });
    }

    if (!customer_name || !customer_address) {
      return res.status(400).json({ error: 'Customer name and address are required' });
    }

    // Validate stock availability and calculate total
    let totalAmount = 0;
    const validateItems = [];

    for (const item of items) {
      const getProduct = db.prepare('SELECT * FROM products WHERE id = ?');
      const product = getProduct.get(item.product_id);

      if (!product) {
        return res.status(400).json({ error: `Product ${item.product_id} not found` });
      }

      if (product.quantity < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}` 
        });
      }

      const subtotal = product.price * item.quantity;
      totalAmount += subtotal;

      validateItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        price: product.price,
        subtotal: subtotal
      });
    }

    // Create order
    const orderNumber = generateOrderNumber();
    // Store timestamp in UTC format (SQLite stores as text, we'll format it as ISO UTC)
    const utcTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const insertOrder = db.prepare(`
      INSERT INTO orders (user_id, order_number, customer_name, customer_email, customer_phone, 
                         customer_address, total_amount, payment_method, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertOrder.run(
      req.session.user.id,
      orderNumber,
      customer_name,
      customer_email || null,
      customer_phone || null,
      customer_address,
      totalAmount,
      payment_method || 'cash',
      notes || null,
      utcTimestamp
    );

    const orderId = result.lastInsertRowid;

    // Insert order items
    const insertOrderItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, quantity, price, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Deduct inventory (but don't commit until order is confirmed)
    // For now, we'll deduct on order creation. You can change this to deduct on status change to 'confirmed'
    const updateProduct = db.prepare('UPDATE products SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');

    for (const item of validateItems) {
      insertOrderItem.run(orderId, item.product_id, item.product_name, item.quantity, item.price, item.subtotal);
      updateProduct.run(item.quantity, item.product_id);
    }

    // Get created order with items
    const getOrder = db.prepare('SELECT * FROM orders WHERE id = ?');
    const order = getOrder.get(orderId);
    const getOrderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    const orderItems = getOrderItems.all(orderId);

    res.json({ 
      success: true, 
      order: { ...order, items: orderItems },
      message: 'Order created successfully' 
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Update order status
app.put('/api/orders/:id/status', requireAuth, (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }

    const updateOrder = db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const result = updateOrder.run(status, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // If order is cancelled, restore inventory
    if (status === 'cancelled') {
      const getOrderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
      const items = getOrderItems.all(req.params.id);
      const restoreProduct = db.prepare('UPDATE products SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');

      for (const item of items) {
        restoreProduct.run(item.quantity, item.product_id);
      }
    }

    res.json({ success: true, message: 'Order status updated successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Pharmacy Inventory Management System running on http://localhost:${PORT}`);
});

// Contact form submission
app.post('/api/contact', (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All required fields must be filled' });
    }

    // For now, just return success
    // You can add a contact_messages table later to store these
    console.log('Contact form submission:', { name, email, phone, subject, message });
    
    res.json({ 
      success: true, 
      message: 'Thank you for your message! We will get back to you within 24 hours.' 
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to submit contact form' });
  }
});

// User settings page
app.get('/user-settings', requireAuth, (req, res) => {
  // Redirect admin to admin settings
  if (req.session.user.role === 'admin') {
    return res.redirect('/settings');
  }
  res.sendFile(path.join(__dirname, 'views', 'user-settings.html'));
});

// User Profile API Routes

// Get user profile
app.get('/api/user/profile', requireAuth, (req, res) => {
  try {
    const getUser = db.prepare('SELECT id, username, email, profile_picture, created_at FROM users WHERE id = ?');
    const user = getUser.get(req.session.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Update user profile
app.put('/api/user/profile', requireAuth, (req, res) => {
  try {
    const { username, email } = req.body;
    
    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required' });
    }
    
    // Check if username is already taken by another user
    const checkUsername = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?');
    const existingUser = checkUsername.get(username, req.session.user.id);
    
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    
    // Update user
    const updateUser = db.prepare('UPDATE users SET username = ?, email = ? WHERE id = ?');
    updateUser.run(username, email, req.session.user.id);
    
    // Update session
    req.session.user.username = username;
    req.session.user.email = email;
    
    res.json({ success: true, user: req.session.user });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Upload profile picture
app.post('/api/user/upload-photo', requireAuth, upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Delete old profile picture if exists
    const getUser = db.prepare('SELECT profile_picture FROM users WHERE id = ?');
    const user = getUser.get(req.session.user.id);
    
    if (user && user.profile_picture) {
      const oldPhotoPath = path.join(uploadsDir, user.profile_picture);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }
    
    // Update database with new filename
    const updatePhoto = db.prepare('UPDATE users SET profile_picture = ? WHERE id = ?');
    updatePhoto.run(req.file.filename, req.session.user.id);
    
    res.json({ success: true, filename: req.file.filename });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Remove profile picture
app.post('/api/user/remove-photo', requireAuth, (req, res) => {
  try {
    const getUser = db.prepare('SELECT profile_picture FROM users WHERE id = ?');
    const user = getUser.get(req.session.user.id);
    
    if (user && user.profile_picture) {
      const photoPath = path.join(uploadsDir, user.profile_picture);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }
    
    const updatePhoto = db.prepare('UPDATE users SET profile_picture = NULL WHERE id = ?');
    updatePhoto.run(req.session.user.id);
    
    res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Change password
app.post('/api/user/change-password', requireAuth, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    
    // Get user
    const getUser = db.prepare('SELECT * FROM users WHERE id = ?');
    const user = getUser.get(req.session.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    bcrypt.compare(currentPassword, user.password, (err, match) => {
      if (err) {
        return res.status(500).json({ error: 'Password verification error' });
      }
      
      if (!match) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      
      // Hash new password
      bcrypt.hash(newPassword, 10, (err, hash) => {
        if (err) {
          return res.status(500).json({ error: 'Password hashing error' });
        }
        
        // Update password
        const updatePassword = db.prepare('UPDATE users SET password = ? WHERE id = ?');
        updatePassword.run(hash, req.session.user.id);
        
        res.json({ success: true, message: 'Password changed successfully' });
      });
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});


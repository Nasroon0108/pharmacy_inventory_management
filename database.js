const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'pharmacy.db');
const db = new Database(dbPath);

// Initialize database
// Users table with role
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Add role column to existing users table if it doesn't exist
try {
  db.exec('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "user"');
} catch (e) {
  // Column already exists, ignore
}

// Add profile_picture column to existing users table if it doesn't exist
try {
  db.exec('ALTER TABLE users ADD COLUMN profile_picture TEXT');
} catch (e) {
  // Column already exists, ignore
}

// Products table
db.exec(`CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  price REAL NOT NULL,
  expiry_date TEXT,
  supplier TEXT,
  barcode TEXT UNIQUE,
  image TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Add image column to existing products table if it doesn't exist
try {
  db.exec('ALTER TABLE products ADD COLUMN image TEXT');
} catch (e) {
  // Column already exists, ignore
}

// Categories table
db.exec(`CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT
)`);

// Settings table
db.exec(`CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Orders table
db.exec(`CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  total_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT DEFAULT 'cash',
  payment_status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
)`);

// Order items table
db.exec(`CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  subtotal REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
)`);

// Insert default categories
const categories = [
  ['Medications', 'Prescription and over-the-counter medications'],
  ['Supplements', 'Vitamins and dietary supplements'],
  ['Medical Supplies', 'Bandages, syringes, and other medical supplies'],
  ['Personal Care', 'Personal hygiene and care products'],
  ['Baby Care', 'Baby products and care items']
];

const insertCategory = db.prepare(`INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)`);
categories.forEach(cat => insertCategory.run(cat));

// Insert default settings
const insertSetting = db.prepare(`INSERT OR IGNORE INTO settings (setting_key, setting_value, description) VALUES (?, ?, ?)`);
insertSetting.run('low_stock_threshold', '10', 'Minimum quantity threshold for low stock alerts');
insertSetting.run('expiry_alert_days', '30', 'Number of days before expiry to show alert');
insertSetting.run('items_per_page', '25', 'Number of items to display per page');
insertSetting.run('currency_symbol', 'Rs', 'Currency symbol');
insertSetting.run('dark_mode', 'false', 'Dark mode preference');
insertSetting.run('date_format', 'MM/DD/YYYY', 'Date format preference');
insertSetting.run('low_stock_alerts', 'true', 'Enable low stock alerts');
insertSetting.run('new_order_notifications', 'true', 'Enable new order notifications');
insertSetting.run('expiry_alerts', 'true', 'Enable expiry date alerts');

// Insert default admin user (create if doesn't exist, update if exists but wrong role)
const defaultAdminPassword = bcrypt.hashSync('admin123', 10);
const checkAdmin = db.prepare('SELECT * FROM users WHERE username = ?');
const existingAdmin = checkAdmin.get('admin');

if (!existingAdmin) {
  // Admin doesn't exist, create it
  const insertAdmin = db.prepare(`INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)`);
  insertAdmin.run('admin', defaultAdminPassword, 'admin@pharmacy.com', 'admin');
  console.log('Default admin user created: admin / admin123');
} else if (existingAdmin.role !== 'admin') {
  // Admin exists but wrong role, update it
  const updateAdmin = db.prepare('UPDATE users SET role = ?, password = ? WHERE username = ?');
  updateAdmin.run('admin', defaultAdminPassword, 'admin');
  console.log('Admin user role updated');
}

// Verify admin user was created
const verifyAdmin = db.prepare('SELECT username, role FROM users WHERE username = ?');
const adminCheck = verifyAdmin.get('admin');
if (adminCheck) {
  console.log('✓ Admin user verified:', adminCheck.username, '- Role:', adminCheck.role);
} else {
  console.log('✗ Admin user not found!');
}

module.exports = db;


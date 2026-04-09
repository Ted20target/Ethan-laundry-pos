const pool = require("../config/db");

async function ensureColumnExists(tableName, columnName, definition) {
  const [[result]] = await pool.query(`
    SELECT COUNT(*) AS total
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
  `, [tableName, columnName]);

  if (!result.total) {
    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

async function initializeDatabase() {
  console.log("Database init target:", {
    host: process.env.DB_HOST || process.env.MYSQLHOST || "localhost",
    port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
    user: process.env.DB_USER || process.env.MYSQLUSER || "root",
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || "ethan_laundry"
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('Administrator', 'Attendant') NOT NULL DEFAULT 'Attendant',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      date_registered TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS services (
      id INT AUTO_INCREMENT PRIMARY KEY,
      service_name VARCHAR(100) NOT NULL,
      price DECIMAL(10, 2) NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invoice_number VARCHAR(30) NOT NULL UNIQUE,
      customer_id INT NOT NULL,
      status ENUM('Pending', 'Processing', 'Ready', 'Collected') NOT NULL DEFAULT 'Pending',
      payment_method ENUM('Cash', 'Mobile') NOT NULL,
      total_price DECIMAL(10, 2) NOT NULL,
      archived TINYINT(1) NOT NULL DEFAULT 0,
      archived_at TIMESTAMP NULL DEFAULT NULL,
      order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      service_id INT NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(10, 2) NOT NULL,
      line_total DECIMAL(10, 2) NOT NULL,
      CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders(id),
      CONSTRAINT fk_items_service FOREIGN KEY (service_id) REFERENCES services(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      payment_method ENUM('Cash', 'Mobile') NOT NULL,
      provider VARCHAR(50) DEFAULT NULL,
      status ENUM('Pending', 'Completed', 'Failed') NOT NULL DEFAULT 'Completed',
      phone_number VARCHAR(20) DEFAULT NULL,
      merchant_request_id VARCHAR(100) DEFAULT NULL,
      checkout_request_id VARCHAR(100) DEFAULT NULL,
      receipt_number VARCHAR(100) DEFAULT NULL,
      result_code INT DEFAULT NULL,
      result_description VARCHAR(255) DEFAULT NULL,
      transaction_date VARCHAR(20) DEFAULT NULL,
      request_payload JSON DEFAULT NULL,
      callback_payload JSON DEFAULT NULL,
      paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);

  await pool.query(`
    INSERT INTO services (service_name, price)
    SELECT * FROM (
      SELECT 'Washing', 350.00 UNION ALL
      SELECT 'Ironing', 150.00 UNION ALL
      SELECT 'Dry Cleaning', 700.00
    ) AS seed
    WHERE NOT EXISTS (SELECT 1 FROM services)
  `);

  await ensureColumnExists("orders", "archived", "TINYINT(1) NOT NULL DEFAULT 0");
  await ensureColumnExists("orders", "archived_at", "TIMESTAMP NULL DEFAULT NULL");
}

module.exports = {
  initializeDatabase
};

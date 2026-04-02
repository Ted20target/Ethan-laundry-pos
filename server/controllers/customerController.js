const pool = require("../config/db");

exports.getCustomers = async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.id, c.full_name, c.phone, c.date_registered, COUNT(o.id) AS order_count
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
      GROUP BY c.id, c.full_name, c.phone, c.date_registered
      ORDER BY c.date_registered DESC
    `);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Failed to load customers.", error: error.message });
  }
};

exports.createCustomer = async (req, res) => {
  const { full_name, phone } = req.body;

  if (!full_name || !phone) {
    return res.status(400).json({ message: "Full name and phone are required." });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO customers (full_name, phone) VALUES (?, ?)",
      [full_name, phone]
    );

    const [rows] = await pool.query(
      "SELECT id, full_name, phone, date_registered FROM customers WHERE id = ?",
      [result.insertId]
    );

    return res.status(201).json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create customer.", error: error.message });
  }
};

exports.updateCustomer = async (req, res) => {
  const { id } = req.params;
  const { full_name, phone } = req.body;

  try {
    await pool.query(
      "UPDATE customers SET full_name = ?, phone = ? WHERE id = ?",
      [full_name, phone, id]
    );

    const [rows] = await pool.query(
      "SELECT id, full_name, phone, date_registered FROM customers WHERE id = ?",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Customer not found." });
    }

    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update customer.", error: error.message });
  }
};

exports.deleteCustomer = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query("DELETE FROM customers WHERE id = ?", [id]);

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Customer not found." });
    }

    return res.json({ message: "Customer deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete customer.", error: error.message });
  }
};

const pool = require("../config/db");

exports.getServices = async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, service_name, price FROM services ORDER BY service_name ASC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Failed to load services.", error: error.message });
  }
};

exports.createService = async (req, res) => {
  const { service_name, price } = req.body;

  if (!service_name || price == null) {
    return res.status(400).json({ message: "Service name and price are required." });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO services (service_name, price) VALUES (?, ?)",
      [service_name, price]
    );

    const [rows] = await pool.query(
      "SELECT id, service_name, price FROM services WHERE id = ?",
      [result.insertId]
    );

    return res.status(201).json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create service.", error: error.message });
  }
};

exports.updateService = async (req, res) => {
  const { id } = req.params;
  const { service_name, price } = req.body;

  try {
    await pool.query(
      "UPDATE services SET service_name = ?, price = ? WHERE id = ?",
      [service_name, price, id]
    );

    const [rows] = await pool.query(
      "SELECT id, service_name, price FROM services WHERE id = ?",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Service not found." });
    }

    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update service.", error: error.message });
  }
};

exports.deleteService = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query("DELETE FROM services WHERE id = ?", [id]);

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Service not found." });
    }

    return res.json({ message: "Service deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete service.", error: error.message });
  }
};

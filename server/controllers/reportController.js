const pool = require("../config/db");

exports.getSummary = async (_req, res) => {
  try {
    const [[summary]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM customers) AS total_customers,
        (SELECT COUNT(*) FROM orders WHERE archived = 0) AS total_orders,
        (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE archived = 0) AS revenue,
        (SELECT COUNT(*) FROM orders WHERE archived = 0 AND status = 'Ready') AS ready_orders,
        (SELECT COUNT(*) FROM payments p INNER JOIN orders o ON o.id = p.order_id WHERE o.archived = 0 AND p.payment_method = 'Cash') AS cash_payments,
        (SELECT COUNT(*) FROM payments p INNER JOIN orders o ON o.id = p.order_id WHERE o.archived = 0 AND p.payment_method = 'Mobile') AS mobile_payments
    `);

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: "Failed to load report summary.", error: error.message });
  }
};

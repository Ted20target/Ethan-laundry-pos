const pool = require("../config/db");
const { initiateStkPush, normalizePhoneNumber } = require("../services/mpesaService");

const orderSelect = `
  SELECT
    o.id,
    o.invoice_number,
    o.customer_id,
    c.full_name AS customer_name,
    c.phone AS customer_phone,
    oi.service_id,
    s.service_name,
    oi.quantity,
    oi.unit_price,
    oi.line_total AS total_price,
    o.payment_method,
    o.status,
    o.order_date,
    p.id AS payment_id,
    p.amount AS payment_amount,
    p.status AS payment_status,
    p.provider,
    p.phone_number,
    p.checkout_request_id,
    p.receipt_number,
    p.result_description,
    p.paid_at
  FROM orders o
  INNER JOIN customers c ON c.id = o.customer_id
  INNER JOIN order_items oi ON oi.order_id = o.id
  INNER JOIN services s ON s.id = oi.service_id
  INNER JOIN payments p ON p.order_id = o.id
  WHERE o.archived = 0
`;

const receiptSelect = `
  SELECT
    o.id,
    o.invoice_number,
    o.order_date,
    o.status AS order_status,
    o.payment_method,
    o.total_price,
    c.full_name AS customer_name,
    c.phone AS customer_phone,
    s.service_name,
    oi.quantity,
    oi.unit_price,
    oi.line_total,
    p.id AS payment_id,
    p.amount AS payment_amount,
    p.payment_method AS payment_method_record,
    p.provider,
    p.status AS payment_status,
    p.phone_number,
    p.receipt_number,
    p.result_code,
    p.result_description,
    p.transaction_date,
    p.paid_at
  FROM orders o
  INNER JOIN customers c ON c.id = o.customer_id
  INNER JOIN order_items oi ON oi.order_id = o.id
  INNER JOIN services s ON s.id = oi.service_id
  INNER JOIN payments p ON p.order_id = o.id
  WHERE o.id = ?
  LIMIT 1
`;

async function fetchReceipt(orderId) {
  const [rows] = await pool.query(receiptSelect, [orderId]);
  if (!rows.length) {
    return null;
  }

  return {
    business_name: "Ethan Laundry POS",
    ...rows[0]
  };
}

exports.getOrders = async (_req, res) => {
  try {
    const [rows] = await pool.query(`${orderSelect} ORDER BY o.order_date DESC, o.id DESC`);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Failed to load orders.", error: error.message });
  }
};

exports.getOrderReceipt = async (req, res) => {
  try {
    const receipt = await fetchReceipt(req.params.id);
    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found." });
    }

    return res.json(receipt);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load receipt.", error: error.message });
  }
};

exports.archiveActiveOrders = async (req, res) => {
  try {
    const [result] = await pool.query(`
      UPDATE orders
      SET archived = 1, archived_at = CURRENT_TIMESTAMP
      WHERE archived = 0
    `);

    return res.json({
      message: `${result.affectedRows} active order(s) archived successfully.`,
      archived_count: result.affectedRows
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to archive current orders.", error: error.message });
  }
};

exports.createOrder = async (req, res) => {
  const { customer_id, service_id, quantity, payment_method, status, phone_number } = req.body;

  if (!customer_id || !service_id || !quantity || !payment_method || !status) {
    return res.status(400).json({ message: "Customer, service, quantity, payment method, and status are required." });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [customerRows] = await connection.query(
      "SELECT id, full_name, phone FROM customers WHERE id = ?",
      [customer_id]
    );
    const [serviceRows] = await connection.query(
      "SELECT id, service_name, price FROM services WHERE id = ?",
      [service_id]
    );

    if (!customerRows.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Selected customer was not found." });
    }

    if (!serviceRows.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Selected service was not found." });
    }

    const customer = customerRows[0];
    const service = serviceRows[0];
    const unitPrice = Number(service.price);
    const lineTotal = unitPrice * Number(quantity);
    const invoiceNumber = `INV-${Date.now()}`;
    const normalizedPhone = payment_method === "Mobile"
      ? normalizePhoneNumber(phone_number || customer.phone)
      : null;

    const [orderResult] = await connection.query(
      "INSERT INTO orders (invoice_number, customer_id, status, payment_method, total_price) VALUES (?, ?, ?, ?, ?)",
      [invoiceNumber, customer_id, status, payment_method, lineTotal]
    );

    await connection.query(
      "INSERT INTO order_items (order_id, service_id, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?)",
      [orderResult.insertId, service_id, quantity, unitPrice, lineTotal]
    );

    const [paymentResult] = await connection.query(`
      INSERT INTO payments (order_id, amount, payment_method, provider, status, phone_number)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      orderResult.insertId,
      lineTotal,
      payment_method,
      payment_method === "Mobile" ? "M-Pesa" : null,
      payment_method === "Mobile" ? "Pending" : "Completed",
      normalizedPhone
    ]);

    await connection.commit();

    let stk = null;
    if (payment_method === "Mobile") {
      try {
        stk = await initiateStkPush({
          amount: lineTotal,
          phoneNumber: normalizedPhone,
          reference: invoiceNumber,
          description: `Laundry order ${invoiceNumber}`
        });

        await pool.query(`
          UPDATE payments
          SET merchant_request_id = ?, checkout_request_id = ?, request_payload = ?
          WHERE id = ?
        `, [
          stk.MerchantRequestID || null,
          stk.CheckoutRequestID || null,
          JSON.stringify(stk),
          paymentResult.insertId
        ]);
      } catch (stkError) {
        await pool.query(
          "UPDATE payments SET status = 'Failed', result_description = ? WHERE id = ?",
          [stkError.message, paymentResult.insertId]
        );

        return res.status(502).json({
          message: `Order created, but STK Push failed: ${stkError.message}`,
          error: stkError.message
        });
      }
    }

    const [rows] = await pool.query(`${orderSelect} AND o.id = ?`, [orderResult.insertId]);
    return res.status(201).json({
      ...rows[0],
      stk
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ message: "Failed to create order.", error: error.message });
  } finally {
    connection.release();
  }
};

exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await pool.query("UPDATE orders SET status = ? WHERE id = ? AND archived = 0", [status, id]);

    const [rows] = await pool.query(`${orderSelect} AND o.id = ?`, [id]);
    if (!rows.length) {
      return res.status(404).json({ message: "Order not found." });
    }

    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update order status.", error: error.message });
  }
};

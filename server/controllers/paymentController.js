const pool = require("../config/db");
const { initiateStkPush, queryStkPush } = require("../services/mpesaService");

function extractCallbackItem(items, key) {
  return items.find((item) => item.Name === key)?.Value ?? null;
}

exports.handleMpesaCallback = async (req, res) => {
  const callback = req.body?.Body?.stkCallback;

  if (!callback) {
    return res.status(400).json({ message: "Invalid callback payload." });
  }

  const checkoutRequestId = callback.CheckoutRequestID;
  const callbackItems = callback.CallbackMetadata?.Item || [];
  const resultCode = Number(callback.ResultCode);
  const resultDescription = callback.ResultDesc || null;
  const mpesaReceiptNumber = extractCallbackItem(callbackItems, "MpesaReceiptNumber");
  const amount = extractCallbackItem(callbackItems, "Amount");
  const phoneNumber = extractCallbackItem(callbackItems, "PhoneNumber");
  const transactionDate = extractCallbackItem(callbackItems, "TransactionDate");
  const status = resultCode === 0 ? "Completed" : "Failed";

  try {
    await pool.query(`
      UPDATE payments
      SET
        status = ?,
        result_code = ?,
        result_description = ?,
        receipt_number = COALESCE(?, receipt_number),
        amount = COALESCE(?, amount),
        phone_number = COALESCE(?, phone_number),
        transaction_date = COALESCE(?, transaction_date),
        callback_payload = ?
      WHERE checkout_request_id = ?
    `, [
      status,
      resultCode,
      resultDescription,
      mpesaReceiptNumber,
      amount,
      phoneNumber,
      transactionDate ? String(transactionDate) : null,
      JSON.stringify(req.body),
      checkoutRequestId
    ]);

    return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to process M-Pesa callback.", error: error.message });
  }
};

exports.queryMpesaPayment = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      "SELECT id, checkout_request_id FROM payments WHERE id = ? LIMIT 1",
      [id]
    );

    const payment = rows[0];
    if (!payment || !payment.checkout_request_id) {
      return res.status(404).json({ message: "STK payment not found." });
    }

    const response = await queryStkPush({ checkoutRequestId: payment.checkout_request_id });
    return res.json(response);
  } catch (error) {
    return res.status(500).json({ message: "Failed to query STK payment.", error: error.message });
  }
};

exports.pushExistingPayment = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(`
      SELECT
        p.id,
        p.amount,
        p.phone_number,
        o.invoice_number
      FROM payments p
      INNER JOIN orders o ON o.id = p.order_id
      WHERE p.id = ?
      LIMIT 1
    `, [id]);

    const payment = rows[0];
    if (!payment) {
      return res.status(404).json({ message: "Payment not found." });
    }

    const stkResponse = await initiateStkPush({
      amount: payment.amount,
      phoneNumber: payment.phone_number,
      reference: payment.invoice_number,
      description: "Laundry payment"
    });

    await pool.query(`
      UPDATE payments
      SET
        provider = 'M-Pesa',
        status = 'Pending',
        merchant_request_id = ?,
        checkout_request_id = ?,
        request_payload = ?
      WHERE id = ?
    `, [
      stkResponse.MerchantRequestID || null,
      stkResponse.CheckoutRequestID || null,
      JSON.stringify(stkResponse),
      id
    ]);

    return res.json(stkResponse);
  } catch (error) {
    return res.status(500).json({ message: "Failed to send STK Push.", error: error.message });
  }
};

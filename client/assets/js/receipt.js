function currency(value) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  }).format(Number(value || 0)).replace("KES", "KSh");
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

async function apiFetch(url) {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || "Failed to load receipt.");
  }

  return data;
}

function renderReceipt(receipt) {
  const container = document.getElementById("receiptPrintCard");
  container.innerHTML = `
    <div class="receipt-print-header">
      <div>
        <p class="eyebrow dark">Payment Receipt</p>
        <h1>${receipt.business_name}</h1>
        <p class="muted">Invoice ${receipt.invoice_number}</p>
      </div>
      <div class="receipt-print-total">${currency(receipt.payment_amount || receipt.total_price)}</div>
    </div>

    <div class="receipt-print-meta">
      <div><span>Customer</span><strong>${receipt.customer_name}</strong></div>
      <div><span>Phone</span><strong>${receipt.customer_phone || "-"}</strong></div>
      <div><span>Service</span><strong>${receipt.service_name}</strong></div>
      <div><span>Quantity</span><strong>${receipt.quantity}</strong></div>
      <div><span>Payment Method</span><strong>${receipt.payment_method}</strong></div>
      <div><span>Payment Status</span><strong>${receipt.payment_status}</strong></div>
      <div><span>Order Status</span><strong>${receipt.order_status}</strong></div>
      <div><span>Receipt No.</span><strong>${receipt.receipt_number || receipt.invoice_number}</strong></div>
      <div><span>Paid On</span><strong>${formatDateTime(receipt.paid_at || receipt.order_date)}</strong></div>
      <div><span>M-Pesa Ref</span><strong>${receipt.receipt_number || "-"}</strong></div>
    </div>

    <div class="receipt-print-line-items">
      <div class="receipt-print-row header">
        <span>Description</span>
        <span>Unit Price</span>
        <span>Qty</span>
        <span>Total</span>
      </div>
      <div class="receipt-print-row">
        <span>${receipt.service_name}</span>
        <span>${currency(receipt.unit_price)}</span>
        <span>${receipt.quantity}</span>
        <span>${currency(receipt.line_total || receipt.total_price)}</span>
      </div>
    </div>

    <div class="receipt-print-summary">
      <div><span>Amount Paid</span><strong>${currency(receipt.payment_amount || receipt.total_price)}</strong></div>
      <div><span>Provider</span><strong>${receipt.provider || receipt.payment_method}</strong></div>
      <div><span>Note</span><strong>${receipt.result_description || "Payment recorded successfully."}</strong></div>
    </div>

    <div class="receipt-print-actions no-print">
      <button type="button" class="secondary-btn" id="closeReceiptBtn">Close</button>
      <button type="button" class="primary-btn" id="printReceiptBtn">Print Receipt</button>
    </div>
  `;

  document.getElementById("printReceiptBtn").addEventListener("click", () => window.print());
  document.getElementById("closeReceiptBtn").addEventListener("click", () => window.close());
}

async function bootstrap() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("orderId");
  const shouldPrint = params.get("print") === "1";

  if (!orderId) {
    document.getElementById("receiptPrintCard").innerHTML = `<p class="muted">No receipt was selected.</p>`;
    return;
  }

  try {
    const receipt = await apiFetch(`/api/orders/${orderId}/receipt`);
    renderReceipt(receipt);
    if (shouldPrint) {
      window.setTimeout(() => window.print(), 350);
    }
  } catch (error) {
    document.getElementById("receiptPrintCard").innerHTML = `<p class="muted">${error.message}</p>`;
  }
}

bootstrap();

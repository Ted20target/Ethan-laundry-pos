const state = {
  customers: [],
  services: [],
  orders: [],
  summary: {
    total_customers: 0,
    total_orders: 0,
    revenue: 0,
    ready_orders: 0,
    cash_payments: 0,
    mobile_payments: 0
  },
  user: null
};

const navLinks = [...document.querySelectorAll(".nav-link")];
const screens = [...document.querySelectorAll(".screen")];
const screenTitle = document.getElementById("screenTitle");
const todayDate = document.getElementById("todayDate");
const customerForm = document.getElementById("customerForm");
const serviceForm = document.getElementById("serviceForm");
const clearServiceBtn = document.getElementById("clearServiceBtn");
const orderForm = document.getElementById("orderForm");
const loginForm = document.getElementById("loginForm");
const changePasswordForm = document.getElementById("changePasswordForm");
const authOverlay = document.getElementById("authOverlay");
const logoutBtn = document.getElementById("logoutBtn");
const userMenuBtn = document.getElementById("userMenuBtn");
const orderCustomer = document.getElementById("orderCustomer");
const orderService = document.getElementById("orderService");
const orderQuantity = document.getElementById("orderQuantity");
const paymentMethod = document.getElementById("paymentMethod");
const mpesaPhone = document.getElementById("mpesaPhone");
const mobilePhoneWrap = document.getElementById("mobilePhoneWrap");
const orderStatus = document.getElementById("orderStatus");
const calculatedTotal = document.getElementById("calculatedTotal");
const receiptPreview = document.getElementById("receiptPreview");
const globalSearch = document.getElementById("globalSearch");
const appStatus = document.getElementById("appStatus");
const flashMessage = document.getElementById("flashMessage");

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

function currency(value) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  }).format(Number(value || 0)).replace("KES", "KSh");
}

function setTodayDate() {
  todayDate.textContent = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());
}

function setStatus(text, connected = true) {
  appStatus.textContent = text;
  appStatus.style.color = connected ? "#1c7a48" : "#a13d35";
}

function showMessage(message, isError = false) {
  flashMessage.textContent = message;
  flashMessage.className = `flash-message show${isError ? " error" : ""}`;
  window.clearTimeout(showMessage.timeoutId);
  showMessage.timeoutId = window.setTimeout(() => {
    flashMessage.className = "flash-message";
  }, 3000);
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || "Request failed.");
  }

  return data;
}

function getCustomerById(id) {
  return state.customers.find((customer) => Number(customer.id) === Number(id));
}

function getServiceById(id) {
  return state.services.find((service) => Number(service.id) === Number(id));
}

function statusClass(status) {
  return `status-${String(status).toLowerCase()}`;
}

function updateUserDisplay() {
  if (!state.user) {
    userMenuBtn.textContent = "Guest";
    return;
  }

  userMenuBtn.textContent = `${state.user.username} (${state.user.role})`;
}

function setAuthState(isAuthenticated) {
  authOverlay.classList.toggle("hidden", isAuthenticated);
  logoutBtn.style.display = isAuthenticated ? "inline-flex" : "none";
  globalSearch.disabled = !isAuthenticated;
}

function renderCustomers(filter = "") {
  const tbody = document.getElementById("customerTable");
  const query = filter.trim().toLowerCase();
  const rows = state.customers
    .filter((customer) => !query || customer.full_name.toLowerCase().includes(query) || customer.phone.includes(query))
    .map((customer) => `
      <tr>
        <td>${customer.full_name}</td>
        <td>${customer.phone}</td>
        <td>${customer.order_count || 0}</td>
        <td>
          <div class="table-actions">
            <button class="ghost-btn" data-edit-customer="${customer.id}">Edit</button>
            <button class="danger-btn" data-delete-customer="${customer.id}">Delete</button>
          </div>
        </td>
      </tr>
    `)
    .join("");

  tbody.innerHTML = rows || `<tr><td colspan="4">No customers found.</td></tr>`;
}

function renderServices() {
  const serviceCards = document.getElementById("serviceCards");
  const serviceMix = document.getElementById("serviceMix");

  serviceCards.innerHTML = state.services.map((service) => `
    <article class="service-card">
      <h4>${service.service_name}</h4>
      <p class="muted">Base price</p>
      <strong>${currency(service.price)}</strong>
      <div class="card-actions">
        <button class="ghost-btn" data-edit-service="${service.id}">Edit</button>
        <button class="danger-btn" data-delete-service="${service.id}">Delete</button>
      </div>
    </article>
  `).join("") || `<p class="muted">No services available yet.</p>`;

  const mixData = state.services.map((service) => {
    const count = state.orders.filter((order) => Number(order.service_id) === Number(service.id)).length;
    return { service, count };
  });

  serviceMix.innerHTML = mixData.map(({ service, count }) => `
    <div class="mix-item">
      <span>${service.service_name}</span>
      <strong>${count} orders</strong>
    </div>
  `).join("") || `<p class="muted">Service activity will appear here.</p>`;
}

function populateOrderSelectors() {
  orderCustomer.innerHTML = state.customers.map((customer) => `
    <option value="${customer.id}">${customer.full_name}</option>
  `).join("");

  orderService.innerHTML = state.services.map((service) => `
    <option value="${service.id}">${service.service_name} - ${currency(service.price)}</option>
  `).join("");

  syncCustomerPhone();
}

function calculateOrderTotal() {
  const service = getServiceById(orderService.value);
  const quantity = Number(orderQuantity.value || 0);
  const total = service ? Number(service.price) * quantity : 0;
  calculatedTotal.textContent = currency(total);
  return total;
}

function renderOrders(filter = "") {
  const query = filter.trim().toLowerCase();
  const recentOrdersTable = document.getElementById("recentOrdersTable");
  const reportTable = document.getElementById("reportTable");
  const filteredOrders = state.orders.filter((order) => {
    const searchBase = `${order.invoice_number} ${order.customer_name} ${order.service_name}`.toLowerCase();
    return !query || searchBase.includes(query);
  });

  recentOrdersTable.innerHTML = filteredOrders.slice(0, 5).map((order) => `
    <tr>
      <td>${order.invoice_number}</td>
      <td>${order.customer_name}</td>
      <td><span class="status-badge ${statusClass(order.status)}">${order.status}</span></td>
      <td>${currency(order.total_price)}</td>
    </tr>
  `).join("") || `<tr><td colspan="4">No orders found.</td></tr>`;

  reportTable.innerHTML = filteredOrders.map((order) => `
    <tr>
      <td>${order.invoice_number}</td>
      <td>${order.customer_name}</td>
      <td>${order.service_name}</td>
      <td>${order.payment_method}</td>
      <td>${order.status}</td>
      <td>${currency(order.total_price)}</td>
      <td><button class="ghost-btn" data-open-receipt="${order.id}">View Receipt</button></td>
    </tr>
  `).join("") || `<tr><td colspan="7">No transactions found.</td></tr>`;
}

function renderDashboardStats() {
  const pendingCollection = state.orders.filter((order) => order.status !== "Collected").length;

  document.getElementById("activeOrders").textContent = pendingCollection;
  document.getElementById("todayRevenue").textContent = currency(state.summary.revenue);
  document.getElementById("totalCustomers").textContent = state.summary.total_customers;
  document.getElementById("ordersToday").textContent = state.summary.total_orders;
  document.getElementById("pendingCollection").textContent = pendingCollection;
  document.getElementById("serviceCount").textContent = state.services.length;
  document.getElementById("monthlyRevenue").textContent = currency(state.summary.revenue);
  document.getElementById("cashPayments").textContent = state.summary.cash_payments;
  document.getElementById("mobilePayments").textContent = state.summary.mobile_payments;
  document.getElementById("readyOrders").textContent = state.summary.ready_orders;
}

function renderReceipt(order) {
  if (!order) {
    receiptPreview.innerHTML = `<p class="muted">Create an order to preview the generated invoice and receipt details here.</p>`;
    return;
  }

  receiptPreview.innerHTML = `
    <div class="receipt-header">
      <div>
        <strong>Ethan Laundry POS</strong>
        <p class="muted">Invoice ${order.invoice_number}</p>
      </div>
      <div><strong>${currency(order.total_price)}</strong></div>
    </div>
    <div class="receipt-divider"></div>
    <div class="receipt-line"><span>Date</span><strong>${formatDateTime(order.paid_at || order.order_date)}</strong></div>
    <div class="receipt-line"><span>Customer</span><strong>${order.customer_name || "Unknown"}</strong></div>
    <div class="receipt-line"><span>Phone</span><strong>${order.customer_phone || "-"}</strong></div>
    <div class="receipt-line"><span>Service</span><strong>${order.service_name || "Unknown"}</strong></div>
    <div class="receipt-line"><span>Quantity</span><strong>${order.quantity}</strong></div>
    <div class="receipt-line"><span>Payment</span><strong>${order.payment_method}</strong></div>
    <div class="receipt-line"><span>Payment Status</span><strong>${order.payment_status || order.status}</strong></div>
    <div class="receipt-line"><span>Receipt No.</span><strong>${order.receipt_number || order.invoice_number}</strong></div>
    <div class="receipt-divider"></div>
    <div class="receipt-line"><span>Total</span><strong>${currency(order.total_price)}</strong></div>
    <div class="receipt-actions">
      <button type="button" class="secondary-btn" data-open-receipt="${order.id}">Open Receipt</button>
      <button type="button" class="primary-btn" data-print-receipt="${order.id}">Print Receipt</button>
    </div>
  `;
}

function openReceipt(orderId, autoPrint = false) {
  const suffix = autoPrint ? "&print=1" : "";
  window.open(`/receipt.html?orderId=${orderId}${suffix}`, "_blank", "noopener");
}

function switchScreen(screenId) {
  screens.forEach((screen) => screen.classList.toggle("active", screen.id === screenId));
  navLinks.forEach((link) => link.classList.toggle("active", link.dataset.screen === screenId));
  screenTitle.textContent = screenId.charAt(0).toUpperCase() + screenId.slice(1);
}

function renderAll(filter = "") {
  renderCustomers(filter);
  renderServices();
  populateOrderSelectors();
  toggleMobilePhoneField();
  calculateOrderTotal();
  renderOrders(filter);
  renderDashboardStats();
  renderReceipt(state.orders[0]);
  updateUserDisplay();
}

function syncCustomerPhone() {
  const customer = getCustomerById(orderCustomer.value);
  if (!customer) {
    return;
  }

  const digits = String(customer.phone || "").replace(/\D/g, "");
  if (!mpesaPhone.value) {
    mpesaPhone.value = digits.startsWith("254")
      ? digits
      : digits.startsWith("0")
        ? `254${digits.slice(1)}`
        : digits;
  }
}

function toggleMobilePhoneField() {
  const isMobile = paymentMethod.value === "Mobile";
  mobilePhoneWrap.classList.toggle("hidden", !isMobile);
  mpesaPhone.required = isMobile;
  if (isMobile) {
    syncCustomerPhone();
  }
}

async function loadDashboardData() {
  const [customers, services, orders, summary] = await Promise.all([
    apiFetch("/api/customers"),
    apiFetch("/api/services"),
    apiFetch("/api/orders"),
    apiFetch("/api/reports/summary")
  ]);

  state.customers = customers;
  state.services = services;
  state.orders = orders;
  state.summary = summary;
}

async function login(username, password) {
  const data = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });

  state.user = data.user;
  setAuthState(true);
  showMessage(`Welcome back, ${data.user.username}.`);
}

async function restoreSession() {
  try {
    const data = await apiFetch("/api/auth/me");
    state.user = data.user;
    setAuthState(true);
    return true;
  } catch (_error) {
    state.user = null;
    setAuthState(false);
    setStatus("Awaiting sign in", false);
    return false;
  }
}

async function logout() {
  await apiFetch("/api/auth/logout", { method: "POST" });
  state.user = null;
  state.customers = [];
  state.services = [];
  state.orders = [];
  state.summary = {
    total_customers: 0,
    total_orders: 0,
    revenue: 0,
    ready_orders: 0,
    cash_payments: 0,
    mobile_payments: 0
  };
  setAuthState(false);
  setStatus("Signed out", false);
  renderAll();
}

async function bootstrap() {
  setTodayDate();
  setAuthState(false);

  const authenticated = await restoreSession();
  if (!authenticated) {
    renderAll();
    return;
  }

  try {
    await loadDashboardData();
    renderAll();
    setStatus("Connected");
  } catch (error) {
    setStatus("Database unavailable", false);
    showMessage(error.message, true);
    renderAll();
  }
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => switchScreen(link.dataset.screen));
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await login(
      document.getElementById("loginUsername").value.trim(),
      document.getElementById("loginPassword").value
    );
    await loadDashboardData();
    switchScreen("dashboard");
    renderAll();
    setStatus("Connected");
    loginForm.reset();
  } catch (error) {
    showMessage(error.message, true);
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await logout();
  } catch (error) {
    showMessage(error.message, true);
  }
});

changePasswordForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const data = await apiFetch("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({
        current_password: document.getElementById("currentPassword").value,
        new_password: document.getElementById("newPassword").value,
        confirm_password: document.getElementById("confirmPassword").value
      })
    });

    changePasswordForm.reset();
    showMessage(data.message);
  } catch (error) {
    showMessage(error.message, true);
  }
});

customerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await apiFetch("/api/customers", {
      method: "POST",
      body: JSON.stringify({
        full_name: document.getElementById("customerName").value.trim(),
        phone: document.getElementById("customerPhone").value.trim()
      })
    });

    customerForm.reset();
    await loadDashboardData();
    renderAll(globalSearch.value);
    showMessage("Customer saved successfully.");
  } catch (error) {
    showMessage(error.message, true);
  }
});

serviceForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await apiFetch("/api/services", {
      method: "POST",
      body: JSON.stringify({
        service_name: document.getElementById("serviceName").value.trim(),
        price: Number(document.getElementById("servicePrice").value)
      })
    });

    serviceForm.reset();
    await loadDashboardData();
    renderAll(globalSearch.value);
    showMessage("Service saved successfully.");
  } catch (error) {
    showMessage(error.message, true);
  }
});

clearServiceBtn.addEventListener("click", () => {
  serviceForm.reset();
  document.getElementById("serviceName").focus();
  showMessage("Service form cleared.");
});

orderService.addEventListener("change", calculateOrderTotal);
orderQuantity.addEventListener("input", calculateOrderTotal);
paymentMethod.addEventListener("change", toggleMobilePhoneField);
orderCustomer.addEventListener("change", syncCustomerPhone);

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const createdOrder = await apiFetch("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        customer_id: Number(orderCustomer.value),
        service_id: Number(orderService.value),
        quantity: Number(orderQuantity.value),
        payment_method: paymentMethod.value,
        status: orderStatus.value,
        phone_number: mpesaPhone.value.trim()
      })
    });

    orderForm.reset();
    orderQuantity.value = 1;
    await loadDashboardData();
    renderAll(globalSearch.value);
    renderReceipt(createdOrder);
    showMessage(
      createdOrder.stk?.CheckoutRequestID
        ? `Invoice ${createdOrder.invoice_number} created, STK Push sent, and receipt is ready.`
        : `Invoice ${createdOrder.invoice_number} created successfully. Receipt is ready.`
    );
  } catch (error) {
    showMessage(error.message, true);
  }
});

globalSearch.addEventListener("input", (event) => {
  renderCustomers(event.target.value);
  renderOrders(event.target.value);
});

document.getElementById("printReportBtn").addEventListener("click", () => window.print());

document.addEventListener("click", async (event) => {
  const customerDeleteId = event.target.dataset.deleteCustomer;
  const serviceDeleteId = event.target.dataset.deleteService;
  const customerEditId = event.target.dataset.editCustomer;
  const serviceEditId = event.target.dataset.editService;
  const openReceiptId = event.target.dataset.openReceipt;
  const printReceiptId = event.target.dataset.printReceipt;

  try {
    if (openReceiptId) {
      openReceipt(openReceiptId);
      return;
    }

    if (printReceiptId) {
      openReceipt(printReceiptId, true);
      return;
    }

    if (customerDeleteId) {
      await apiFetch(`/api/customers/${customerDeleteId}`, { method: "DELETE" });
      await loadDashboardData();
      renderAll(globalSearch.value);
      showMessage("Customer deleted successfully.");
      return;
    }

    if (serviceDeleteId) {
      await apiFetch(`/api/services/${serviceDeleteId}`, { method: "DELETE" });
      await loadDashboardData();
      renderAll(globalSearch.value);
      showMessage("Service deleted successfully.");
      return;
    }

    if (customerEditId) {
      const customer = getCustomerById(customerEditId);
      const fullName = window.prompt("Edit customer name", customer.full_name);
      const phone = window.prompt("Edit customer phone", customer.phone);

      if (fullName && phone) {
        await apiFetch(`/api/customers/${customerEditId}`, {
          method: "PUT",
          body: JSON.stringify({ full_name: fullName.trim(), phone: phone.trim() })
        });
        await loadDashboardData();
        renderAll(globalSearch.value);
        showMessage("Customer updated successfully.");
      }
      return;
    }

    if (serviceEditId) {
      const service = getServiceById(serviceEditId);
      const serviceName = window.prompt("Edit service name", service.service_name);
      const price = window.prompt("Edit service price", service.price);

      if (serviceName && price) {
        await apiFetch(`/api/services/${serviceEditId}`, {
          method: "PUT",
          body: JSON.stringify({ service_name: serviceName.trim(), price: Number(price) })
        });
        await loadDashboardData();
        renderAll(globalSearch.value);
        showMessage("Service updated successfully.");
      }
    }
  } catch (error) {
    showMessage(error.message, true);
  }
});

bootstrap();

const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");

const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/customerRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const reportRoutes = require("./routes/reportRoutes");
const { requireAuth } = require("./middleware/authMiddleware");

const app = express();

app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || "ethan-laundry-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: "auto",
    maxAge: 1000 * 60 * 60 * 8
  }
}));
app.use(express.static(path.join(__dirname, "..", "client")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Ethan Laundry POS API is running." });
});

app.use("/api/auth", authRoutes);
app.use("/api/customers", requireAuth, customerRoutes);
app.use("/api/services", requireAuth, serviceRoutes);
app.use("/api/orders", requireAuth, orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reports", requireAuth, reportRoutes);

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "index.html"));
});

module.exports = app;

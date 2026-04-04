const pool = require("../config/db");
const { hashPassword } = require("./passwordService");

async function ensureDefaultAdmin() {
  const [rows] = await pool.query("SELECT COUNT(*) AS user_count FROM users");
  const userCount = rows[0]?.user_count || 0;

  if (userCount > 0) {
    return;
  }

  const passwordHash = hashPassword("admin123");
  await pool.query(
    "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
    ["admin", passwordHash, "Administrator"]
  );
}

module.exports = {
  ensureDefaultAdmin
};

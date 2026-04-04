const pool = require("../config/db");
const { verifyPassword } = require("../services/passwordService");
const { ensureDefaultAdmin } = require("../services/userService");

exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  try {
    await ensureDefaultAdmin();

    const [rows] = await pool.query(
      "SELECT id, username, password_hash, role FROM users WHERE username = ? LIMIT 1",
      [username]
    );

    const user = rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    return req.session.save((sessionError) => {
      if (sessionError) {
        return res.status(500).json({ message: "Session problem.", error: sessionError.message });
      }

      return res.json({
        message: "Login successful.",
        user: req.session.user
      });
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed.", error: error.message });
  }
};

exports.me = async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  return res.json({ user: req.session.user });
};

exports.logout = async (req, res) => {
  if (!req.session) {
    return res.json({ message: "Logged out." });
  }

  return req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({ message: "Logout failed." });
    }

    res.clearCookie("connect.sid");
    return res.json({ message: "Logged out." });
  });
};

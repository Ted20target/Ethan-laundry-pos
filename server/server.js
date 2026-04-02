require("dotenv").config();

const app = require("./app");
const { initializeDatabase } = require("./services/databaseInitService");

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`Laundry POS server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  }
})();

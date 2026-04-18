require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { query, shouldUseDatabase, closePool } = require("../config/database");

async function run() {
  if (!shouldUseDatabase()) {
    console.log(
      "Skipping migrations: DATABASE_URL not configured or USE_MOCK_DB=true",
    );
    return;
  }

  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, "utf8");
    console.log(`Running migration: ${file}`);
    await query(sql);
  }

  console.log("Migrations completed successfully.");
}

run()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });

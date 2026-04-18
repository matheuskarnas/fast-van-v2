const { Pool } = require("pg");

let pool;

function shouldUseDatabase() {
  return (
    process.env.USE_MOCK_DB !== "true" && Boolean(process.env.DATABASE_URL)
  );
}

function getPool() {
  if (!shouldUseDatabase()) {
    return null;
  }

  if (!pool) {
    const isProduction = process.env.NODE_ENV === "production";

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    });
  }

  return pool;
}

async function query(text, params) {
  const dbPool = getPool();

  if (!dbPool) {
    throw new Error(
      "Database is not configured. Set DATABASE_URL and USE_MOCK_DB=false.",
    );
  }

  return dbPool.query(text, params);
}

async function testConnection() {
  const dbPool = getPool();

  if (!dbPool) {
    return { connected: false, mode: "mock" };
  }

  await dbPool.query("SELECT 1");
  return { connected: true, mode: "postgres" };
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

module.exports = {
  query,
  testConnection,
  closePool,
  shouldUseDatabase,
};

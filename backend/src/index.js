require("dotenv").config();

const express = require("express");
const authRoutes = require("./routes/authRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const geofencingRoutes = require("./routes/geofencingRoutes");
const chatRoutes = require("./routes/chatRoutes");
const presenceRoutes = require("./routes/presenceRoutes");
const operationsRoutes = require("./routes/operationsRoutes");
const { testConnection, closePool } = require("./config/database");

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

// CORS básico para app mobile/web durante desenvolvimento
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.get("/health", async (req, res) => {
  try {
    const dbStatus = await testConnection();
    return res.status(200).json({
      status: "ok",
      service: "fastvan-backend",
      db: dbStatus,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      service: "fastvan-backend",
      db: { connected: false, mode: "postgres", error: error.message },
    });
  }
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/vehicles", vehicleRoutes);
app.use("/api/v1/geofencing", geofencingRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/presence", presenceRoutes);
app.use("/api/v1/operations", operationsRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
    },
  });
});

app.use((error, req, res, _next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    },
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`FastVan backend running on port ${port}`);
  });

  process.on("SIGINT", async () => {
    await closePool();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await closePool();
    process.exit(0);
  });
}

module.exports = app;

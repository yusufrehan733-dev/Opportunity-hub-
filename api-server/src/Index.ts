import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";

const app = express();

const PORT = Number(process.env.PORT || 5000);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* Health check */
app.get("/test", (_req, res) => {
  res.json({
    ok: true,
    message: "Opportunity Hub API Server is working",
  });
});

/* API health check */
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    service: "opportunity-hub-api",
    status: "online",
  });
});

/* API root */
app.get("/api", (_req, res) => {
  res.json({
    success: true,
    service: "Opportunity Hub API",
    message: "API is running",
  });
});

/* 404 API handler */
app.use("/api", (_req, res) => {
  res.status(404).json({
    success: false,
    error: "API endpoint not found",
  });
});

/* Global error handler */
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("API error:", err);

    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Opportunity Hub API Server running on port ${PORT}`);
});

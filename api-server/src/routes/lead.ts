import express from "express";

const router = express.Router();

/*
 * Legacy test route.
 * Real leads are served by ./leads.ts
 */
router.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Legacy lead route is active",
    use: "/api/leads",
  });
});

export default router;

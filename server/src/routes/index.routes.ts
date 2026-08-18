import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    success: true,
    version: "1.0.0",
    message: "ON AIR",
    timestamp: new Date().toISOString(),
  });
});

router.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    success: true,
    version: "1.0.0",
    message: "ON AIR",
    timestamp: new Date().toISOString(),
  });
});

export default router;

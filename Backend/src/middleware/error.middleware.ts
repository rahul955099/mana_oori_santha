import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}`, error: "NOT_FOUND" });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, message: err.message, error: err.code });
  }

  const message = err instanceof Error ? err.message : "Unexpected error";
  if (env.nodeEnv !== "production") {
    console.error(err);
  }

  res.status(500).json({
    success: false,
    message: env.nodeEnv === "production" ? "Internal server error" : message,
    error: "SERVER_ERROR",
  });
}

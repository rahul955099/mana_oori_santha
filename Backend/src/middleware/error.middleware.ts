import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}`, error: "NOT_FOUND" });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: err.code,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
  }

  // A request body that isn't valid JSON is the caller's mistake, not a server fault.
  if ((err as { type?: string }).type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "The request body isn't valid JSON.", error: "INVALID_JSON" });
  }

  // Body larger than express.json's limit.
  if ((err as { type?: string }).type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "The request is too large.", error: "PAYLOAD_TOO_LARGE" });
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

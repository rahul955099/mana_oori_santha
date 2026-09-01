import type { Response } from "express";

export function success(res: Response, message: string, data: unknown = null, statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data });
}

export function failure(res: Response, message: string, error = "ERROR", statusCode = 400) {
  return res.status(statusCode).json({ success: false, message, error });
}

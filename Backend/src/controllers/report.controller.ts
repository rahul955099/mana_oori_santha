import type { Response } from "express";
import { success } from "../utils/response";
import { ordersCsv, parseRange, platformSnapshot, salesSummary } from "../services/report.service";
import type { AuthRequest } from "../middleware/auth.middleware";

export async function getSummary(req: AuthRequest, res: Response) {
  const range = parseRange(req.query.from as string | undefined, req.query.to as string | undefined);
  const [summary, snapshot] = await Promise.all([salesSummary(range), platformSnapshot()]);
  success(res, "Report generated", { ...summary, snapshot });
}

export async function downloadOrdersCsv(req: AuthRequest, res: Response) {
  const range = parseRange(req.query.from as string | undefined, req.query.to as string | undefined);
  const csv = await ordersCsv(range);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="orders-${range.from}-to-${range.to}.csv"`);
  res.send(csv);
}

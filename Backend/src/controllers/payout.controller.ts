import type { Response } from "express";
import { Seller } from "../models/Seller";
import { Payout } from "../models/Payout";
import { AppError } from "../utils/AppError";
import { success } from "../utils/response";
import { mask } from "../utils/serialize";
import { sellerEarnings } from "../services/earnings.service";
import type { AuthRequest } from "../middleware/auth.middleware";
import { onPayoutRecorded } from "../services/events.service";

/** Admin: what the platform owes each seller right now. */
export async function listBalances(_req: AuthRequest, res: Response) {
  const sellers = await Seller.find({ isActive: true }).populate("user", "name").sort({ farmName: 1 });
  const rows = await Promise.all(
    sellers.map(async (s) => {
      const { totals } = await sellerEarnings(s._id);
      const user = s.user as unknown as { name?: string };
      return {
        sellerId: s._id.toString(),
        farmName: s.farmName,
        name: user?.name ?? "",
        status: s.status,
        payout: s.payout
          ? {
              method: s.payout.method,
              upiId: s.payout.upiId,
              accountHolder: s.payout.accountHolder,
              accountNumber: mask(s.payout.accountNumber),
              ifsc: s.payout.ifsc,
            }
          : null,
        ...totals,
      };
    })
  );
  success(res, "Balances fetched", { balances: rows });
}

/** Admin: record a payment already made to a seller (via UPI/bank outside the platform). */
export async function recordPayout(req: AuthRequest, res: Response) {
  const seller = await Seller.findOne({ _id: req.body.sellerId, isActive: true });
  if (!seller) {
    throw new AppError("Seller not found", 404, "NOT_FOUND");
  }
  const { totals } = await sellerEarnings(seller._id);
  const amount = Math.round(Number(req.body.amount) * 100) / 100;
  if (amount > totals.balance) {
    throw new AppError(
      `This is more than the seller's payable balance of ₹${totals.balance}.`,
      400,
      "AMOUNT_EXCEEDS_BALANCE"
    );
  }
  const payout = await Payout.create({
    seller: seller._id,
    amount,
    method: req.body.method,
    reference: req.body.reference,
    note: req.body.note,
    paidAt: req.body.paidAt ?? new Date(),
    recordedBy: req.userId,
  });
  onPayoutRecorded(seller.user, amount, payout.reference);
  success(
    res,
    `Payout of ₹${amount} recorded for ${seller.farmName}`,
    { payout: { id: payout._id.toString(), amount, method: payout.method, reference: payout.reference, paidAt: payout.paidAt } },
    201
  );
}

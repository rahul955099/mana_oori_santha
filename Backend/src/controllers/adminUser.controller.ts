import type { Response } from "express";
import type { Types } from "mongoose";
import { User } from "../models/User";
import { Order } from "../models/Order";
import { AppError } from "../utils/AppError";
import { success } from "../utils/response";
import { escapeRegex } from "../utils/slugify";
import type { AuthRequest } from "../middleware/auth.middleware";

/** Admin: customers with their order count and lifetime spend. */
export async function listCustomers(req: AuthRequest, res: Response) {
  const search = (req.query.search as string | undefined)?.trim();
  const filter: Record<string, unknown> = { role: "customer" };
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }, { userCode: pattern }];
  }
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(500);

  const stats = await Order.aggregate<{ _id: Types.ObjectId; orders: number; spent: number; lastOrderAt: Date }>([
    { $match: { user: { $in: users.map((u) => u._id) } } },
    {
      $group: {
        _id: "$user",
        orders: { $sum: 1 },
        spent: { $sum: { $cond: [{ $in: ["$status", ["cancelled", "returned"]] }, 0, "$total"] } },
        lastOrderAt: { $max: "$createdAt" },
      },
    },
  ]);
  const byUser = new Map(stats.map((s) => [s._id.toString(), s]));

  success(res, "Customers fetched", {
    customers: users.map((u) => {
      const s = byUser.get(u._id.toString());
      const defaultAddress = u.addresses.find((a) => a.isDefault) ?? u.addresses[0];
      return {
        id: u._id.toString(),
        userCode: u.userCode,
        name: u.name,
        email: u.email,
        phone: u.phone,
        location: defaultAddress ? `${defaultAddress.city}, ${defaultAddress.state}` : "",
        joinedAt: u.createdAt,
        isActive: u.isActive,
        orders: s?.orders ?? 0,
        spent: s?.spent ?? 0,
        lastOrderAt: s?.lastOrderAt ?? null,
      };
    }),
  });
}

/** Admin: block or unblock a customer. Sellers are managed from the sellers screen. */
export async function setCustomerActive(req: AuthRequest, res: Response) {
  const user = await User.findById(req.params.id);
  if (!user || user.role !== "customer") {
    throw new AppError("Customer not found", 404, "NOT_FOUND");
  }
  user.isActive = req.body.isActive;
  await user.save();
  success(res, user.isActive ? "Customer unblocked" : "Customer blocked", { id: user._id.toString(), isActive: user.isActive });
}


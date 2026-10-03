import type { Response } from "express";
import { User, type UserDocument } from "../models/User";
import { AppError } from "../utils/AppError";
import { success } from "../utils/response";
import { toAddress } from "../utils/serialize";
import type { AuthRequest } from "../middleware/auth.middleware";

const MAX_ADDRESSES = 20;
const FIELDS = ["type", "fullName", "phone", "houseNo", "street", "city", "district", "state", "pincode", "landmark"] as const;

async function loadUser(req: AuthRequest): Promise<UserDocument> {
  const user = await User.findById(req.userId).select("addresses");
  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }
  return user;
}

function findAddress(user: UserDocument, id: string) {
  const address = user.addresses.id(id);
  if (!address) {
    throw new AppError("Address not found", 404, "NOT_FOUND");
  }
  return address;
}

function respond(res: Response, message: string, user: UserDocument, status = 200) {
  success(res, message, { addresses: user.addresses.map(toAddress) }, status);
}

export async function listAddresses(req: AuthRequest, res: Response) {
  respond(res, "Addresses fetched", await loadUser(req));
}

export async function addAddress(req: AuthRequest, res: Response) {
  const user = await loadUser(req);
  if (user.addresses.length >= MAX_ADDRESSES) {
    throw new AppError(`You can save up to ${MAX_ADDRESSES} addresses.`, 400, "LIMIT_REACHED");
  }
  const values: Record<string, unknown> = {};
  for (const f of FIELDS) values[f] = req.body[f];
  // The first saved address becomes the default automatically.
  user.addresses.push({ ...values, isDefault: user.addresses.length === 0 });
  await user.save();
  respond(res, "Address added", user, 201);
}

export async function updateAddress(req: AuthRequest, res: Response) {
  const user = await loadUser(req);
  const address = findAddress(user, String(req.params.id));
  for (const f of FIELDS) {
    if (req.body[f] !== undefined) address.set(f, req.body[f]);
  }
  await user.save();
  respond(res, "Address updated", user);
}

export async function deleteAddress(req: AuthRequest, res: Response) {
  const user = await loadUser(req);
  const address = findAddress(user, String(req.params.id));
  const wasDefault = address.isDefault;
  address.deleteOne();
  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }
  await user.save();
  respond(res, "Address deleted", user);
}

export async function setDefaultAddress(req: AuthRequest, res: Response) {
  const user = await loadUser(req);
  const target = findAddress(user, String(req.params.id));
  for (const a of user.addresses) {
    a.isDefault = a._id.equals(target._id);
  }
  await user.save();
  respond(res, "Default address updated", user);
}

import type { Request, Response } from "express";
import { User } from "../models/User";
import { Seller } from "../models/Seller";
import { Product } from "../models/Product";
import { comparePassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import { success } from "../utils/response";
import { toSafeUser } from "../utils/serialize";
import type { AuthRequest } from "../middleware/auth.middleware";

async function assertEmailFree(email: string, exceptUserId?: string) {
  const existing = await User.findOne({ email });
  if (existing && existing._id.toString() !== exceptUserId) {
    throw new AppError("An account with this email already exists", 409, "DUPLICATE_EMAIL");
  }
}

async function loadSafeUser(userId: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }
  const seller = user.role === "seller" ? await Seller.findOne({ user: user._id }) : null;
  return toSafeUser(user, seller);
}

export async function register(req: Request, res: Response) {
  const { name, email, phone, password, address } = req.body;
  await assertEmailFree(email);

  // Public registration can only ever create "customer" accounts — role is
  // never taken from the request body, regardless of what a caller sends.
  const user = await User.create({ name, email, phone, password, role: "customer", address });

  const token = signToken({ userId: user._id.toString(), role: user.role });
  success(res, "Registered successfully", { token, user: toSafeUser(user) }, 201);
}

export async function registerSeller(req: Request, res: Response) {
  const { name, email, phone, password, shopName, location } = req.body;
  await assertEmailFree(email);

  const user = await User.create({ name, email, phone, password, role: "seller" });
  let seller;
  try {
    // New sellers start unverified; an admin verifies them from the admin panel.
    seller = await Seller.create({ user: user._id, farmName: shopName, location, district: location });
  } catch (err) {
    await User.deleteOne({ _id: user._id });
    throw err;
  }

  const token = signToken({ userId: user._id.toString(), role: user.role });
  success(res, "Seller account created successfully", { token, user: toSafeUser(user, seller) }, 201);
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  // password has `select: false` in the schema, so it must be explicitly
  // selected here to verify it — it is never included in the response.
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const matches = await comparePassword(password, user.password);
  if (!matches) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  if (!user.isActive) {
    throw new AppError("This account has been deactivated", 403, "ACCOUNT_INACTIVE");
  }

  const token = signToken({ userId: user._id.toString(), role: user.role });
  success(res, "Logged in successfully", { token, user: await loadSafeUser(user._id.toString()) });
}

export async function me(req: AuthRequest, res: Response) {
  success(res, "Current user fetched successfully", { user: await loadSafeUser(req.userId!) });
}

export async function updateMe(req: AuthRequest, res: Response) {
  const { name, email, phone, profileImage } = req.body;
  const user = await User.findById(req.userId);
  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }

  if (email !== undefined && email !== user.email) {
    await assertEmailFree(email, user._id.toString());
    user.email = email;
  }
  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (profileImage !== undefined) user.profileImage = profileImage;
  await user.save();

  success(res, "Profile updated successfully", { user: await loadSafeUser(req.userId!) });
}

export async function changePassword(req: AuthRequest, res: Response) {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.userId).select("+password");
  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }

  if (!(await comparePassword(currentPassword, user.password))) {
    throw new AppError("Current password is incorrect", 400, "INVALID_CREDENTIALS");
  }

  user.password = newPassword;
  await user.save();
  success(res, "Password updated successfully");
}

/** Deactivates (rather than erases) the account so order history stays
 * consistent. A seller's shop and listings are hidden along with it. */
export async function deleteMe(req: AuthRequest, res: Response) {
  const user = await User.findById(req.userId);
  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }

  user.isActive = false;
  await user.save();

  if (user.role === "seller") {
    const seller = await Seller.findOneAndUpdate({ user: user._id }, { isActive: false });
    if (seller) {
      await Product.updateMany({ seller: seller._id }, { isActive: false });
    }
  }

  success(res, "Account deleted");
}

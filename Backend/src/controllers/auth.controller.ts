import type { Request, Response } from "express";
import { User, type UserDocument } from "../models/User";
import { comparePassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import { success } from "../utils/response";
import type { AuthRequest } from "../middleware/auth.middleware";

/** Shape returned to clients — never includes the password hash. */
function toSafeUser(user: UserDocument) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    address: user.address,
    profileImage: user.profileImage,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

export async function register(req: Request, res: Response) {
  const { name, email, phone, password, address } = req.body ?? {};

  if (!name || !email || !phone || !password) {
    throw new AppError("Name, email, phone and password are required", 400, "VALIDATION_ERROR");
  }
  if (typeof password !== "string" || password.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400, "VALIDATION_ERROR");
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw new AppError("An account with this email already exists", 409, "DUPLICATE_EMAIL");
  }

  // Public registration can only ever create "customer" accounts — role is
  // never taken from the request body, regardless of what a caller sends.
  const user = await User.create({
    name,
    email: normalizedEmail,
    phone,
    password,
    role: "customer",
    address,
  });

  const token = signToken({ userId: user._id.toString(), role: user.role });
  success(res, "Registered successfully", { token, user: toSafeUser(user) }, 201);
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    throw new AppError("Email and password are required", 400, "VALIDATION_ERROR");
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  // password has `select: false` in the schema, so it must be explicitly
  // selected here to verify it — it is never included in the response.
  const user = await User.findOne({ email: normalizedEmail }).select("+password");
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
  success(res, "Logged in successfully", { token, user: toSafeUser(user) });
}

export async function me(req: AuthRequest, res: Response) {
  const user = await User.findById(req.userId);
  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }

  success(res, "Current user fetched successfully", { user: toSafeUser(user) });
}

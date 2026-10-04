import type { Types } from "mongoose";
import { User } from "../models/User";
import { Order } from "../models/Order";
import { Review } from "../models/Review";
import { SupportTicket } from "../models/SupportTicket";
import { Cart } from "../models/Cart";
import { Notification } from "../models/Notification";
import { AppError } from "../utils/AppError";

export const FORMER_CUSTOMER = "Former customer";

/** Deletes a customer account. If they have no history it's removed entirely;
 * otherwise their personal details are erased but their orders, reviews and
 * support requests remain (anonymously) so business records stay correct.
 * Either way the email is freed so they could sign up again. */
export async function deleteCustomerAccount(userId: Types.ObjectId | string): Promise<"removed" | "anonymized"> {
  const user = await User.findById(userId);
  if (!user || user.deletedAt) {
    throw new AppError("Customer not found", 404, "NOT_FOUND");
  }
  if (user.role !== "customer") {
    throw new AppError("Only customer accounts can be deleted here.", 400, "NOT_A_CUSTOMER");
  }

  const [orders, reviews, tickets] = await Promise.all([
    Order.countDocuments({ user: user._id }),
    Review.countDocuments({ user: user._id }),
    SupportTicket.countDocuments({ user: user._id }),
  ]);
  await Promise.all([Cart.deleteOne({ user: user._id }), Notification.deleteMany({ user: user._id })]);

  if (orders + reviews + tickets === 0) {
    await user.deleteOne();
    return "removed";
  }

  const id = user._id.toString();
  user.set({
    name: FORMER_CUSTOMER,
    email: `deleted-${id}@deleted.invalid`, // frees the real address; .invalid can never receive mail
    phone: "deleted",
    addresses: [],
    wishlist: [],
    profileImage: undefined,
    address: undefined,
    emailVerified: false,
    notificationPrefs: { orderUpdates: false, deliveryAlerts: false, promotions: false },
    emailVerifyTokenHash: undefined,
    emailVerifyExpires: undefined,
    passwordResetTokenHash: undefined,
    passwordResetExpires: undefined,
    // Unusable random password: the account can never be logged into again.
    password: `${id}-${Math.random().toString(36)}-${Date.now()}`,
    isActive: false,
    deletedAt: new Date(),
  });
  await user.save({ validateBeforeSave: false });

  // Reviews stay (they're about the product) but no longer show the person's name.
  await Review.updateMany({ user: user._id }, { userName: FORMER_CUSTOMER });

  return "anonymized";
}

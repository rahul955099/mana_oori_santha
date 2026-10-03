import type { Types } from "mongoose";
import type { OrderDocument, OrderStatus } from "../models/Order";
import type { UserRole } from "../models/User";
import { User } from "../models/User";
import { Seller } from "../models/Seller";
import { notifyAdmins, notifyUser } from "./notification.service";
import { orderPlaced, orderStatusEmail, payoutEmail, sellerStatusEmail, supportReply } from "./emailTemplates";

/** Who to tell, and how, when things happen. Every function here is
 * fire-and-forget: callers don't await them, and failures are only logged. */

const STATUS_TEXT: Record<OrderStatus, string> = {
  pending: "placed",
  confirmed: "confirmed",
  packed: "packed",
  "out-for-delivery": "out for delivery",
  delivered: "delivered",
  cancelled: "cancelled",
  "return-requested": "awaiting a return decision",
  returned: "returned",
};

async function nameOf(userId: Types.ObjectId | string) {
  return (await User.findById(userId).select("name"))?.name ?? "there";
}

/** The User ids behind the sellers whose items are in an order. */
async function sellerUserIds(order: OrderDocument) {
  const sellers = await Seller.find({ _id: { $in: order.items.map((i) => i.seller) } }).select("user");
  return sellers.map((s) => s.user);
}

function safely(task: () => Promise<unknown>) {
  task().catch((err) => console.error("Event handling failed:", err instanceof Error ? err.message : err));
}

export function onOrderPlaced(order: OrderDocument) {
  safely(async () => {
    const buyer = order.user as unknown as Types.ObjectId;
    await notifyUser(
      buyer,
      {
        type: "order-placed",
        title: `Order ${order.orderNumber} placed`,
        message: `${order.items.length} item(s), ₹${order.total} to pay on delivery.`,
        link: "/my-orders",
      },
      { content: orderPlaced(await nameOf(buyer), order), pref: "orderUpdates" }
    );
    for (const sellerUser of await sellerUserIds(order)) {
      await notifyUser(sellerUser, {
        type: "order-placed",
        title: `New order ${order.orderNumber}`,
        message: "A customer ordered your products. Please confirm it.",
        link: "/seller/orders",
      });
    }
  });
}

export function onOrderStatusChanged(order: OrderDocument, from: OrderStatus, to: OrderStatus, byRole: UserRole) {
  safely(async () => {
    const buyer = (order.user as unknown as { _id?: Types.ObjectId })._id ?? (order.user as unknown as Types.ObjectId);
    const returnRejected = from === "return-requested" && to === "delivered";
    const title = returnRejected ? `Return not accepted for ${order.orderNumber}` : `Order ${order.orderNumber} ${STATUS_TEXT[to]}`;

    // The customer hears about everything they didn't do themselves.
    if (byRole !== "customer") {
      const email = orderStatusEmail(await nameOf(buyer), order, to, returnRejected);
      await notifyUser(
        buyer,
        { type: "order-status", title, message: `Your order is now ${STATUS_TEXT[to]}.`, link: "/my-orders" },
        email ? { content: email, pref: to === "out-for-delivery" || to === "delivered" ? "deliveryAlerts" : "orderUpdates" } : undefined
      );
    }

    // Sellers and admins hear about customer actions they need to handle.
    if (byRole === "customer") {
      const message = to === "cancelled" ? "The customer cancelled this order." : "The customer asked to return this order.";
      for (const sellerUser of await sellerUserIds(order)) {
        await notifyUser(sellerUser, { type: "order-status", title, message, link: "/seller/orders" });
      }
      if (to === "return-requested") {
        await notifyAdmins({ type: "order-status", title, message: "Review the return request.", link: "/admin/orders" });
      }
    }
  });
}

export function onSupportReply(ticketNumber: string, customerId: Types.ObjectId, message: string, byRole: UserRole) {
  safely(async () => {
    if (byRole === "admin") {
      await notifyUser(
        customerId,
        { type: "support-update", title: `Reply on ${ticketNumber}`, message: message.slice(0, 140), link: "/my-support" },
        { content: supportReply(await nameOf(customerId), ticketNumber, message) }
      );
    } else {
      await notifyAdmins({ type: "support-update", title: `Customer replied on ${ticketNumber}`, message: message.slice(0, 140), link: "/admin/support" });
    }
  });
}

export function onSupportCreated(ticketNumber: string, category: string) {
  safely(() =>
    notifyAdmins({ type: "support-update", title: `New support request ${ticketNumber}`, message: `Category: ${category.replace("-", " ")}`, link: "/admin/support" })
  );
}

export function onSupportStatusChanged(ticketNumber: string, customerId: Types.ObjectId, status: string) {
  safely(() =>
    notifyUser(customerId, {
      type: "support-update",
      title: `${ticketNumber} is now ${status.replace("-", " ")}`,
      message: status === "resolved" ? "We've marked this resolved. Reply if you still need help." : "We're working on it.",
      link: "/my-support",
    })
  );
}

export function onSellerStatusChanged(sellerUserId: Types.ObjectId, shop: string, status: string, reason?: string) {
  safely(async () => {
    const email = sellerStatusEmail(await nameOf(sellerUserId), shop, status, reason);
    await notifyUser(
      sellerUserId,
      {
        type: "account",
        title: email?.subject ?? `Shop status: ${status}`,
        message: reason ? `Reason: ${reason}` : status === "approved" ? "Your products are now visible to customers." : "",
        link: "/seller/dashboard",
      },
      email ? { content: email } : undefined
    );
  });
}

export function onKycSubmitted(shop: string) {
  safely(() =>
    notifyAdmins({ type: "account", title: "Seller details submitted", message: `${shop} is ready for review.`, link: "/admin/sellers" })
  );
}

export function onPayoutRecorded(sellerUserId: Types.ObjectId, amount: number, reference: string) {
  safely(async () => {
    await notifyUser(
      sellerUserId,
      { type: "account", title: `Payout of ₹${amount} sent`, message: `Reference ${reference}`, link: "/seller/earnings" },
      { content: payoutEmail(await nameOf(sellerUserId), amount, reference) }
    );
  });
}

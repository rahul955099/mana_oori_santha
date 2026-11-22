import { api, startTestServer, stopTestServer, statusBody } from "./setup";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { seedCatalog } from "../seed/seed";
import { testOutbox } from "../services/mail.service";
import { Order } from "../models/Order";
import { Seller } from "../models/Seller";
import { expireStaleAssignments } from "../services/delivery.service";

const SELLER_PASSWORD = "seller-pass-123";
const ADMIN = { email: "admin@test.local", password: "admin-pass-123" };
const PINCODE = "517501";

const shippingAddress = {
  fullName: "Anita Reddy",
  mobile: "9876543210",
  email: "anita@mail.in",
  address: "12-3, Temple Street",
  village: "Tirupati",
  district: "Chittoor",
  state: "Andhra Pradesh",
  pincode: PINCODE,
};

let admin = "";
let customer = "";
let ramulu = ""; // switches to partner delivery
let partner = "";
let partnerId = "";
let ramuluProduct = "";

const settle = () => new Promise((r) => setTimeout(r, 200));
const linkToken = (text: string) => text.match(/token=([a-f0-9]{64})/)?.[1] ?? "";
const login = async (email: string, password: string) => (await api("POST", "/auth/login", { body: { email, password } })).body.data.token as string;

async function placeOrder(productIds: string[]) {
  const res = await api("POST", "/orders", {
    token: customer,
    body: { items: productIds.map((productId) => ({ productId, quantity: 1 })), shippingAddress },
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data.order.id as string;
}
const setStatus = async (token: string, id: string, status: string) =>
  api("PATCH", `/orders/${id}/status`, { token, body: await statusBody(id, status) });
const codeOf = async (id: string) => (await Order.findOne({ orderNumber: id }))!.delivery!.code;

before(async () => {
  await startTestServer();
  await seedCatalog({ adminEmail: ADMIN.email, adminPassword: ADMIN.password, sellerPassword: SELLER_PASSWORD });
  admin = await login(ADMIN.email, ADMIN.password);
  ramulu = await login("ramulu.farms@example.com", SELLER_PASSWORD);
  customer = (await api("POST", "/auth/register", { body: { name: "Anita", email: "anita@mail.in", phone: "9876543210", password: "secret12" } }))
    .body.data.token;

  const foxtail = (await api("GET", "/products/foxtail-millet")).body.data.product;
  ramuluProduct = foxtail.id;
});
after(stopTestServer);

describe("seller delivery method", () => {
  it("needs an admin's approval to switch to delivery partners", async () => {
    const req = await api("PUT", "/sellers/me/delivery-method", { token: ramulu, body: { method: "partner" } });
    assert.equal(req.body.data.seller.deliveryMethod, "self", "not until approved");
    assert.equal(req.body.data.seller.deliveryMethodRequest.method, "partner");

    const sellerId = req.body.data.seller.id;
    assert.equal((await api("PATCH", `/sellers/${sellerId}/delivery-method`, { token: ramulu, body: { approve: true } })).status, 403);
    const ok = await api("PATCH", `/sellers/${sellerId}/delivery-method`, { token: admin, body: { approve: true } });
    assert.equal(ok.body.data.seller.deliveryMethod, "partner");
    assert.equal(ok.body.data.seller.deliveryMethodRequest, null);
  });

  it("keeps a self-delivering seller order with the seller, using the customer's code", async () => {
    const shop = (await api("GET", "/sellers/me", { token: ramulu })).body.data.seller;
    await Seller.updateOne({ _id: shop.id }, { deliveryMethod: "self" });
    const id = await placeOrder([ramuluProduct]);
    const order = (await api("GET", `/orders/${id}`, { token: customer })).body.data.order;
    assert.equal(order.delivery.mode, "self");
    assert.match(order.delivery.code, /^\d{4}$/, "the customer sees their code");
    assert.equal((await api("GET", `/orders/${id}`, { token: ramulu })).body.data.order.delivery.code, undefined, "the seller doesn't");

    for (const s of ["confirmed", "packed", "out-for-delivery"]) await setStatus(ramulu, id, s);
    const wrong = await api("PATCH", `/orders/${id}/status`, { token: ramulu, body: { status: "delivered", code: "0000" === order.delivery.code ? "1111" : "0000" } });
    assert.equal(wrong.body.error, "WRONG_CODE");
    assert.equal((await setStatus(ramulu, id, "delivered")).body.data.order.status, "delivered");
  });
});

describe("delivery partners", () => {
  it("are invited by an admin and set up their own login", async () => {
    const taken = await api("POST", "/admin/delivery/partners/invite", { token: admin, body: { email: "anita@mail.in", vehicle: "bike" } });
    assert.equal(taken.body.error, "EMAIL_IN_USE");

    testOutbox.length = 0;
    const res = await api("POST", "/admin/delivery/partners/invite", {
      token: admin,
      body: { email: "ravi.rider@mail.in", vehicle: "bike", serviceAreas: `${PINCODE}, 517502, bad` },
    });
    assert.equal(res.status, 201);
    await settle();
    const token = linkToken(testOutbox.find((m) => m.to === "ravi.rider@mail.in")!.text);
    assert.equal((await api("GET", `/auth/admin-invite?token=${token}`)).body.data.role, "delivery");

    const accepted = await api("POST", "/auth/admin-invite/accept", { body: { token, name: "Ravi", phone: "9123456789", password: "ravipass1" } });
    assert.equal(accepted.body.data.user.role, "delivery");
    partner = accepted.body.data.token;

    const me = (await api("GET", "/delivery/me", { token: partner })).body.data;
    assert.deepEqual(me.partner.serviceAreas, [PINCODE, "517502"]);
    partnerId = me.partner.id;
    assert.equal((await api("GET", "/admin/team", { token: admin })).body.data.invites.length, 0, "not shown as an admin invite");
    assert.equal((await api("GET", "/admin/users", { token: partner })).status, 403, "no admin access");
  });

  let orderId = "";

  it("are only suggested when available and covering the area", async () => {
    const shop = (await api("GET", "/sellers/me", { token: ramulu })).body.data.seller;
    await Seller.updateOne({ _id: shop.id }, { deliveryMethod: "partner" });
    orderId = await placeOrder([ramuluProduct]);
    const admView = (await api("GET", `/orders/${orderId}`, { token: admin })).body.data.order;
    assert.equal(admView.delivery.mode, "partner");
    assert.equal(admView.delivery.code, undefined, "admins never see the code");

    let [s] = (await api("GET", `/admin/delivery/orders/${orderId}/suggestions`, { token: admin })).body.data.suggestions;
    assert.equal(s.eligible, false);
    assert.ok(s.blockers.includes("Not available today"));

    await api("PATCH", "/delivery/me/availability", { token: partner, body: { available: true } });
    [s] = (await api("GET", `/admin/delivery/orders/${orderId}/suggestions`, { token: admin })).body.data.suggestions;
    assert.equal(s.eligible, true, JSON.stringify(s));

    await api("PATCH", `/admin/delivery/partners/${partnerId}`, { token: admin, body: { serviceAreas: ["500079"] } });
    [s] = (await api("GET", `/admin/delivery/orders/${orderId}/suggestions`, { token: admin })).body.data.suggestions;
    assert.ok(s.blockers.includes(`Doesn't cover ${PINCODE}`));
    await api("PATCH", `/admin/delivery/partners/${partnerId}`, { token: admin, body: { serviceAreas: [PINCODE] } });
  });

  it("deliver an assigned order end to end, earning the fee", async () => {
    await setStatus(ramulu, orderId, "confirmed");
    const unassigned = (await api("GET", "/orders?delivery=unassigned", { token: admin })).body.data.orders;
    assert.ok(unassigned.some((o: { id: string }) => o.id === orderId), "confirmed orders waiting for a partner");
    const assigned = await api("POST", "/admin/delivery/assign", { token: admin, body: { orderNumbers: [orderId], partnerId } });
    assert.equal(assigned.status, 200, JSON.stringify(assigned.body));

    let jobs = (await api("GET", "/delivery/orders", { token: partner })).body.data;
    assert.equal(jobs.active[0].customer.phone, "9876543210", "contact details while it's their job");
    assert.equal(jobs.active[0].pickups.length, 1);
    assert.equal((await api("POST", `/delivery/orders/${orderId}/pickup`, { token: partner })).body.error, "NOT_PACKED");

    await api("POST", `/delivery/orders/${orderId}/accept`, { token: partner });
    await setStatus(ramulu, orderId, "packed");
    assert.equal((await setStatus(ramulu, orderId, "out-for-delivery")).body.error, "PARTNER_DELIVERY", "the seller can't deliver it");

    assert.equal((await api("POST", `/delivery/orders/${orderId}/pickup`, { token: partner })).body.data.job.status, "out-for-delivery");
    const forCustomer = (await api("GET", `/orders/${orderId}`, { token: customer })).body.data.order;
    assert.equal(forCustomer.delivery.partnerName, "Ravi");
    assert.equal(forCustomer.delivery.partnerPhone, "9123456789");

    const code = await codeOf(orderId);
    const total = forCustomer.total;
    const wrong = await api("POST", `/delivery/orders/${orderId}/deliver`, { token: partner, body: { code: code === "0000" ? "1111" : "0000", cashCollected: total } });
    assert.equal(wrong.body.error, "WRONG_CODE");
    const done = await api("POST", `/delivery/orders/${orderId}/deliver`, { token: partner, body: { code, cashCollected: total } });
    assert.equal(done.body.data.job.status, "delivered");
    assert.equal(done.body.data.job.fee, 30);

    jobs = (await api("GET", "/delivery/orders", { token: partner })).body.data;
    assert.equal(jobs.history[0].customer.phone, undefined, "contact details hidden once delivered");
    const me = (await api("GET", "/delivery/me", { token: partner })).body.data.stats;
    assert.equal(me.cashInHand, total);
    assert.equal(me.feesEarned, 30);
    assert.equal(me.owes, total - 30);
    assert.equal((await api("GET", `/orders/${orderId}`, { token: customer })).body.data.order.delivery.code, undefined, "code gone after delivery");
  });

  it("send failed and declined deliveries back to the admins", async () => {
    const failId = await placeOrder([ramuluProduct]);
    for (const s of ["confirmed", "packed"]) await setStatus(ramulu, failId, s);
    await api("POST", "/admin/delivery/assign", { token: admin, body: { orderNumbers: [failId], partnerId } });
    await api("POST", `/delivery/orders/${failId}/pickup`, { token: partner });
    const failed = await api("POST", `/delivery/orders/${failId}/fail`, { token: partner, body: { reason: "Customer not available" } });
    assert.equal(failed.body.data.job.status, "packed");
    const attention = (await api("GET", "/orders?delivery=attention", { token: admin })).body.data.orders;
    const row = attention.find((o: { id: string }) => o.id === failId);
    assert.equal(row.delivery.needsAttention, "failed");
    assert.equal(row.delivery.attempts[0].reason, "Customer not available");

    await api("PATCH", `/admin/delivery/orders/${failId}/attempts/0/fee`, { token: admin, body: { fee: 15 } });
    assert.equal((await api("GET", "/delivery/me", { token: partner })).body.data.stats.feesEarned, 45, "granted fee for the attempt");

    const declineId = await placeOrder([ramuluProduct]);
    await setStatus(ramulu, declineId, "confirmed");
    await api("POST", "/admin/delivery/assign", { token: admin, body: { orderNumbers: [declineId], partnerId } });
    await api("POST", `/delivery/orders/${declineId}/decline`, { token: partner, body: { reason: "Too far today" } });
    const after = (await api("GET", `/orders/${declineId}`, { token: admin })).body.data.order;
    assert.equal(after.delivery.partnerId, undefined);
    assert.equal(after.delivery.needsAttention, "declined");
    assert.equal((await api("POST", `/delivery/orders/${declineId}/accept`, { token: partner })).status, 403, "no longer theirs");
  });

  it("go back to unassigned when not accepted in time", async () => {
    const id = await placeOrder([ramuluProduct]);
    await setStatus(ramulu, id, "confirmed");
    await api("POST", "/admin/delivery/assign", { token: admin, body: { orderNumbers: [id], partnerId } });
    await Order.updateOne({ orderNumber: id }, { "delivery.assignedAt": new Date(Date.now() - 31 * 60 * 1000) });
    assert.equal(await expireStaleAssignments(), 1);
    const o = (await api("GET", `/orders/${id}`, { token: admin })).body.data.order;
    assert.equal(o.delivery.needsAttention, "no-response");
    assert.equal(o.delivery.attempts.at(-1).kind, "no-response");
  });

  it("let only an admin mark delivered without the code, with a reason", async () => {
    const id = await placeOrder([ramuluProduct]);
    for (const s of ["confirmed", "packed"]) await setStatus(ramulu, id, s);
    await api("POST", "/admin/delivery/assign", { token: admin, body: { orderNumbers: [id], partnerId } });
    await api("POST", `/delivery/orders/${id}/pickup`, { token: partner });

    const noCode = await api("PATCH", `/orders/${id}/status`, { token: admin, body: { status: "delivered" } });
    assert.equal(noCode.body.error, "WRONG_CODE");
    const skipped = await api("PATCH", `/orders/${id}/status`, {
      token: admin,
      body: { status: "delivered", skipCodeReason: "Customer didn't get the email; confirmed on a call" },
    });
    assert.equal(skipped.status, 200, JSON.stringify(skipped.body));
    assert.equal(skipped.body.data.order.delivery.codeSkipped.reason, "Customer didn't get the email; confirmed on a call");
    assert.equal(skipped.body.data.order.delivery.fee, 30, "the partner still earns the delivery");
  });

  it("delivers a single-farm order with one pickup", async () => {
    const id = await placeOrder([ramuluProduct]);
    const o = (await api("GET", `/orders/${id}`, { token: admin })).body.data.order;
    assert.equal(o.delivery.mode, "partner");
    assert.equal(o.delivery.pickups, 1);
    for (const s of ["confirmed", "packed"]) await setStatus(admin, id, s);
    await api("POST", "/admin/delivery/assign", { token: admin, body: { orderNumbers: [id], partnerId } });
    assert.equal((await api("GET", "/delivery/orders", { token: partner })).body.data.active.find((j: { id: string }) => j.id === id).pickups.length, 1);
    await api("POST", `/delivery/orders/${id}/pickup`, { token: partner });
    const done = await api("POST", `/delivery/orders/${id}/deliver`, { token: partner, body: { code: await codeOf(id), cashCollected: o.total } });
    assert.equal(done.body.data.job.fee, 30);
  });

  it("are settled by the owner, within what they hold and are owed", async () => {
    const before = (await api("GET", "/delivery/me", { token: partner })).body.data.stats;
    const tooMuch = await api("POST", "/admin/delivery/settlements", {
      token: admin,
      body: { partnerId, cashReceived: before.cashInHand + 1, method: "cash" },
    });
    assert.equal(tooMuch.body.error, "AMOUNT_TOO_HIGH");

    const ok = await api("POST", "/admin/delivery/settlements", {
      token: admin,
      body: { partnerId, cashReceived: before.cashInHand, feesPaid: before.unpaidFees, method: "cash", note: "Weekly handover" },
    });
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    const afterStats = (await api("GET", "/delivery/me", { token: partner })).body.data.stats;
    assert.equal(afterStats.cashInHand, 0);
    assert.equal(afterStats.owes, 0);
    const list = (await api("GET", "/admin/delivery/settlements", { token: admin })).body.data;
    assert.equal(list.history.length, 2);
  });

  it("stop getting new work above the cash limit", async () => {
    await api("PUT", "/admin/delivery/settings", { token: admin, body: { cashLimit: 0 } });
    const id = await placeOrder([ramuluProduct]);
    for (const s of ["confirmed", "packed"]) await setStatus(ramulu, id, s);
    await api("POST", "/admin/delivery/assign", { token: admin, body: { orderNumbers: [id], partnerId } });
    await api("POST", `/delivery/orders/${id}/pickup`, { token: partner });
    await api("POST", `/delivery/orders/${id}/deliver`, { token: partner, body: { code: await codeOf(id), cashCollected: 1 } });

    const next = await placeOrder([ramuluProduct]);
    const [s] = (await api("GET", `/admin/delivery/orders/${next}/suggestions`, { token: admin })).body.data.suggestions;
    assert.ok(s.blockers.some((b: string) => b.startsWith("Holding ₹1 cash")), JSON.stringify(s.blockers));
    const mismatch = (await api("GET", "/orders?delivery=attention", { token: admin })).body.data.orders.find((o: { id: string }) => o.id === id);
    assert.equal(mismatch.delivery.needsAttention, "cash-mismatch", "collected less than the total");
  });
});

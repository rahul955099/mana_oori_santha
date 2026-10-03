// Fake Cloudinary credentials so upload signing can be exercised offline.
process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
process.env.CLOUDINARY_API_KEY = "test-key";
process.env.CLOUDINARY_API_SECRET = "test-secret";

import { api, startTestServer, stopTestServer } from "./setup";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { seedCatalog } from "../seed/seed";
import { Order } from "../models/Order";
import { env } from "../config/env";
import { signParams } from "../services/cloudinary.service";

const ADMIN = { email: "admin@test.local", password: "admin-pass-123" };
const SELLER_PASSWORD = "seller-pass-123";
const shippingAddress = {
  fullName: "Anita",
  mobile: "9876543210",
  email: "anita@example.com",
  address: "1 Main Rd",
  village: "Tirupati",
  state: "AP",
  pincode: "517501",
};
const kyc = {
  legalName: "Ravi Kumar",
  pan: "abcde1234f",
  payout: { method: "bank", accountHolder: "Ravi Kumar", accountNumber: "123456789012", ifsc: "sbin0001234" },
};

let admin = "";
let customer = "";
let ramulu = "";
let newSeller = "";
let newSellerId = "";
let newProductId = "";

before(async () => {
  await startTestServer();
  await seedCatalog({ reset: true, adminEmail: ADMIN.email, adminPassword: ADMIN.password, sellerPassword: SELLER_PASSWORD });
  admin = (await api("POST", "/auth/login", { body: ADMIN })).body.data.token;
  ramulu = (await api("POST", "/auth/login", { body: { email: "ramulu.farms@example.com", password: SELLER_PASSWORD } })).body.data.token;
  customer = (
    await api("POST", "/auth/register", { body: { name: "Anita", email: "anita@example.com", phone: "9876543210", password: "secret12" } })
  ).body.data.token;
  const reg = await api("POST", "/auth/register/seller", {
    body: { name: "Ravi", email: "ravi@farm.in", phone: "9123456789", password: "secret12", shopName: "Ravi Farms", location: "Guntur" },
  });
  newSeller = reg.body.data.token;
  newSellerId = reg.body.data.user.sellerId;
});
after(stopTestServer);

describe("image uploads", () => {
  it("signs exactly like Cloudinary's documented example", () => {
    const signature = signParams(
      { eager: "w_400,h_300,c_pad|w_260,h_200,c_crop", public_id: "sample_image", timestamp: 1315060510 },
      "abcd"
    );
    assert.equal(signature, "bfd09f95f331f558cbd1320e67aa8d488770583e");
  });

  it("gives sellers a signature for their own folder, never the secret", async () => {
    const res = await api("POST", "/uploads/signature", { token: newSeller, body: { purpose: "product" } });
    assert.equal(res.status, 200);
    const data = res.body.data;
    assert.equal(data.cloudName, "test-cloud");
    assert.match(data.folder, /^mana-oori-santha\/product\/[a-f0-9]{24}$/);
    assert.equal(data.signature, signParams({ allowed_formats: data.allowed_formats, folder: data.folder, timestamp: data.timestamp }, "test-secret"));
    assert.ok(!JSON.stringify(data).includes("test-secret"));
  });

  it("limits who can upload what", async () => {
    assert.equal((await api("POST", "/uploads/signature", { body: { purpose: "profile" } })).status, 401);
    assert.equal((await api("POST", "/uploads/signature", { token: customer, body: { purpose: "product" } })).status, 403);
    assert.equal((await api("POST", "/uploads/signature", { token: customer, body: { purpose: "profile" } })).status, 200);
  });

  it("explains when uploads aren't configured", async () => {
    const secret = env.cloudinary.apiSecret;
    env.cloudinary.apiSecret = "";
    const res = await api("POST", "/uploads/signature", { token: customer, body: { purpose: "profile" } });
    env.cloudinary.apiSecret = secret;
    assert.equal(res.status, 503);
    assert.equal(res.body.error, "UPLOADS_NOT_CONFIGURED");
  });

  it("only accepts https image URLs", async () => {
    const res = await api("PATCH", "/auth/me", { token: customer, body: { profileImage: "data:image/png;base64,AAAA" } });
    assert.equal(res.status, 400);
    const ok = await api("PATCH", "/auth/me", { token: customer, body: { profileImage: "https://res.cloudinary.com/x/image/upload/a.jpg" } });
    assert.equal(ok.status, 200);
  });
});

describe("seller onboarding", () => {
  it("lets a pending seller prepare products that stay hidden from the store", async () => {
    const created = await api("POST", "/products", {
      token: newSeller,
      body: { name: "Guntur Chilli", category: "powders", price: 120, mrp: 150, unit: "500 g", stock: 3 },
    });
    assert.equal(created.status, 201);
    newProductId = created.body.data.product.id;

    const mine = await api("GET", "/products/mine", { token: newSeller });
    assert.equal(mine.body.data.products.length, 1);
    assert.equal((await api("GET", `/products/${newProductId}`)).status, 404);
    assert.equal((await api("GET", `/products/${newProductId}`, { token: newSeller })).status, 200);
    const store = await api("GET", "/products?limit=500");
    assert.ok(!store.body.data.products.some((p: { id: string }) => p.id === newProductId));
    assert.equal((await api("GET", `/sellers/${newSellerId}`)).status, 404);

    const quote = await api("POST", "/orders/quote", { body: { items: [{ productId: newProductId, quantity: 1 }] } });
    assert.equal(quote.body.data.problems[0].reason, "unavailable");
  });

  it("validates KYC and payout details", async () => {
    const bad = await api("PUT", "/sellers/me/kyc", { token: newSeller, body: { ...kyc, pan: "123" } });
    assert.equal(bad.status, 400);
    const badIfsc = await api("PUT", "/sellers/me/kyc", {
      token: newSeller,
      body: { ...kyc, payout: { ...kyc.payout, ifsc: "XXXX" } },
    });
    assert.equal(badIfsc.status, 400);
    const badUpi = await api("PUT", "/sellers/me/kyc", { token: newSeller, body: { ...kyc, payout: { method: "upi", upiId: "nope" } } });
    assert.equal(badUpi.status, 400);
  });

  it("won't approve a seller without KYC", async () => {
    const res = await api("PATCH", `/sellers/${newSellerId}/status`, { token: admin, body: { status: "approved" } });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "KYC_MISSING");
  });

  it("masks sensitive details for the seller and keeps them out of public views", async () => {
    const res = await api("PUT", "/sellers/me/kyc", { token: newSeller, body: kyc });
    assert.equal(res.status, 200);
    const mine = res.body.data.seller;
    assert.equal(mine.kyc.pan, "••••••234F");
    assert.equal(mine.payout.accountNumber, "••••••9012");
    assert.equal(mine.payout.ifsc, "SBIN0001234");

    const full = await api("GET", `/sellers/${newSellerId}/kyc`, { token: admin });
    assert.equal(full.body.data.seller.kyc.pan, "ABCDE1234F");
    assert.equal(full.body.data.seller.payout.accountNumber, "123456789012");
    assert.equal((await api("GET", `/sellers/${newSellerId}/kyc`, { token: newSeller })).status, 403);

    const list = await api("GET", "/sellers?all=true", { token: admin });
    const row = list.body.data.sellers.find((s: { id: string }) => s.id === newSellerId);
    assert.equal(row.status, "pending");
    assert.equal(row.payout.accountNumber, "••••••9012");
  });

  it("requires a reason to reject, and a rejected seller can fix and resubmit", async () => {
    assert.equal((await api("PATCH", `/sellers/${newSellerId}/status`, { token: admin, body: { status: "rejected" } })).status, 400);
    const rejected = await api("PATCH", `/sellers/${newSellerId}/status`, {
      token: admin,
      body: { status: "rejected", reason: "PAN name doesn't match" },
    });
    assert.equal(rejected.body.data.seller.statusReason, "PAN name doesn't match");
    const blocked = await api("PATCH", `/products/${newProductId}`, { token: newSeller, body: { stock: 5 } });
    assert.equal(blocked.status, 403);
    const resubmitted = await api("PUT", "/sellers/me/kyc", { token: newSeller, body: kyc });
    assert.equal(resubmitted.body.data.seller.status, "pending");
  });

  it("shows the shop and its products once approved, and hides them when suspended", async () => {
    await api("PATCH", `/sellers/${newSellerId}/status`, { token: admin, body: { status: "approved" } });
    assert.equal((await api("GET", `/products/${newProductId}`)).status, 200);
    assert.equal((await api("GET", `/sellers/${newSellerId}`)).status, 200);

    await api("PATCH", `/sellers/${newSellerId}/status`, { token: admin, body: { status: "suspended", reason: "Quality complaints" } });
    assert.equal((await api("GET", `/products/${newProductId}`)).status, 404);
    await api("PATCH", `/sellers/${newSellerId}/status`, { token: admin, body: { status: "approved" } });
  });
});

describe("earnings and payouts", () => {
  let orderId = "";
  const setStatus = (token: string, status: string) =>
    api("PATCH", `/orders/${orderId}/status`, { token, body: { status } });

  it("tracks a sale through the return window to a payable balance", async () => {
    const foxtail = (await api("GET", "/products/foxtail-millet")).body.data.product;
    const placed = await api("POST", "/orders", {
      token: customer,
      body: { items: [{ productId: foxtail.id, quantity: 4 }], shippingAddress },
    });
    orderId = placed.body.data.order.id;
    const gross = foxtail.price * 4;
    const commission = Math.round(gross * env.commissionPercent) / 100;

    let earnings = (await api("GET", "/sellers/me/earnings", { token: ramulu })).body.data;
    assert.equal(earnings.totals.inProgress, gross - commission);
    assert.equal(earnings.totals.balance, 0);

    for (const s of ["confirmed", "packed", "out-for-delivery", "delivered"]) await setStatus(ramulu, s);
    earnings = (await api("GET", "/sellers/me/earnings", { token: ramulu })).body.data;
    assert.equal(earnings.totals.returnWindow, gross - commission);
    assert.equal(earnings.totals.balance, 0, "not payable during the return window");

    // Pretend the return window has passed.
    await Order.updateOne({ orderNumber: orderId }, { deliveredAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) });
    earnings = (await api("GET", "/sellers/me/earnings", { token: ramulu })).body.data;
    assert.equal(earnings.totals.settledGross, gross);
    assert.equal(earnings.totals.commission, commission);
    assert.equal(earnings.totals.balance, gross - commission);
    assert.equal(earnings.orders[0].state, "settled");
  });

  it("lets admins record payouts up to the balance only", async () => {
    const balances = (await api("GET", "/payouts/balances", { token: admin })).body.data.balances;
    const row = balances.find((b: { farmName: string }) => b.farmName === "Sri Lakshmi Organic Farms");
    assert.ok(row.balance > 0);
    const sellerId = row.sellerId;

    assert.equal((await api("GET", "/payouts/balances", { token: ramulu })).status, 403);
    const tooMuch = await api("POST", "/payouts", {
      token: admin,
      body: { sellerId, amount: row.balance + 1, method: "upi", reference: "UTR123456" },
    });
    assert.equal(tooMuch.status, 400);

    const paid = await api("POST", "/payouts", {
      token: admin,
      body: { sellerId, amount: row.balance, method: "bank", reference: "UTR998877" },
    });
    assert.equal(paid.status, 201);
    const earnings = (await api("GET", "/sellers/me/earnings", { token: ramulu })).body.data;
    assert.equal(earnings.totals.balance, 0);
    assert.equal(earnings.payouts[0].reference, "UTR998877");
  });
});

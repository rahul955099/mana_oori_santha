import { api, rawGet, startTestServer, stopTestServer } from "./setup";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { seedCatalog } from "../seed/seed";
import { csvCell } from "../services/report.service";

const ADMIN = { email: "admin@test.local", password: "admin-pass-123" };
const SELLER_PASSWORD = "seller-pass-123";
const shippingAddress = {
  fullName: "=HYPERLINK(\"http://evil\")",
  mobile: "9876543210",
  email: "anita@example.com",
  address: "1 Main Rd",
  village: "Tirupati",
  state: "AP",
  pincode: "517501",
};

let admin = "";
let seller = "";
let customer = "";
let other = "";
let productId = "";
let orderId = "";
let price = 0;

async function register(name: string, email: string) {
  const res = await api("POST", "/auth/register", { body: { name, email, phone: "9876543210", password: "secret12" } });
  return res.body.data.token as string;
}

before(async () => {
  await startTestServer();
  await seedCatalog({ reset: true, adminEmail: ADMIN.email, adminPassword: ADMIN.password, sellerPassword: SELLER_PASSWORD });
  admin = (await api("POST", "/auth/login", { body: ADMIN })).body.data.token;
  seller = (await api("POST", "/auth/login", { body: { email: "ramulu.farms@example.com", password: SELLER_PASSWORD } })).body.data.token;
  customer = await register("Anita", "anita@example.com");
  other = await register("Ravi", "ravi@example.com");
  const product = (await api("GET", "/products/foxtail-millet")).body.data.product;
  productId = product.id;
  price = product.price;
});
after(stopTestServer);

describe("reviews", () => {
  it("starts with no fabricated ratings", async () => {
    const product = (await api("GET", `/products/${productId}`)).body.data.product;
    assert.equal(product.rating, 0);
    assert.equal(product.reviewCount, 0);
  });

  it("only lets customers review products they've received", async () => {
    const before = await api("PUT", `/products/${productId}/reviews/mine`, { token: customer, body: { rating: 5 } });
    assert.equal(before.status, 403);
    assert.equal(before.body.error, "NOT_PURCHASED");

    const placed = await api("POST", "/orders", {
      token: customer,
      body: { items: [{ productId, quantity: 2 }], shippingAddress },
    });
    orderId = placed.body.data.order.id;
    const list = await api("GET", `/products/${productId}/reviews`, { token: customer });
    assert.equal(list.body.data.canReview, false, "not yet delivered");

    for (const s of ["confirmed", "packed", "out-for-delivery", "delivered"]) {
      await api("PATCH", `/orders/${orderId}/status`, { token: seller, body: { status: s } });
    }
    const created = await api("PUT", `/products/${productId}/reviews/mine`, {
      token: customer,
      body: { rating: 4, comment: "Clean grains, cooked well." },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.review.verifiedPurchase, true);
  });

  it("keeps one review per customer and updates the product rating", async () => {
    await api("PUT", `/products/${productId}/reviews/mine`, { token: customer, body: { rating: 2, comment: "Changed my mind" } });
    const list = await api("GET", `/products/${productId}/reviews`);
    assert.equal(list.body.data.reviews.length, 1);
    assert.equal(list.body.data.reviews[0].rating, 2);
    const product = (await api("GET", `/products/${productId}`)).body.data.product;
    assert.equal(product.rating, 2);
    assert.equal(product.reviewCount, 1);
    const sellerProfile = (await api("GET", "/sellers/me", { token: seller })).body.data.seller;
    assert.equal(sellerProfile.rating, 2);
  });

  it("lets admins hide a review, which removes it from ratings until restored", async () => {
    assert.equal((await api("GET", "/reviews", { token: customer })).status, 403);
    const all = await api("GET", "/reviews", { token: admin });
    const review = all.body.data.reviews[0];
    assert.equal(review.productName, "Foxtail Millet");

    const hidden = await api("PATCH", `/reviews/${review.id}`, { token: admin, body: { status: "hidden", note: "Off-topic" } });
    assert.equal(hidden.body.data.review.status, "hidden");
    assert.equal((await api("GET", `/products/${productId}/reviews`)).body.data.reviews.length, 0);
    assert.equal((await api("GET", `/products/${productId}`)).body.data.product.reviewCount, 0);

    // The author still sees it (marked hidden), and editing doesn't publish it again.
    await api("PUT", `/products/${productId}/reviews/mine`, { token: customer, body: { rating: 5 } });
    const mine = (await api("GET", `/products/${productId}/reviews`, { token: customer })).body.data.mine;
    assert.equal(mine.status, "hidden");

    await api("PATCH", `/reviews/${review.id}`, { token: admin, body: { status: "published" } });
    assert.equal((await api("GET", `/products/${productId}`)).body.data.product.rating, 5);
  });

  it("lists a customer's own reviews with product names", async () => {
    const res = await api("GET", "/reviews/mine", { token: customer });
    assert.equal(res.body.data.reviews[0].productName, "Foxtail Millet");
    assert.equal(res.body.data.reviews[0].moderationNote, undefined, "admin notes stay private");
  });

  it("lets the author delete their review", async () => {
    assert.equal((await api("DELETE", `/products/${productId}/reviews/mine`, { token: customer })).status, 200);
    assert.equal((await api("GET", `/products/${productId}`)).body.data.product.reviewCount, 0);
  });
});

describe("support tickets", () => {
  let ticketId = "";

  it("creates tickets, only for the customer's own orders", async () => {
    const stolen = await api("POST", "/support", {
      token: other,
      body: { category: "order-issue", message: "Where is my order?", orderId },
    });
    assert.equal(stolen.status, 400);

    const res = await api("POST", "/support", {
      token: customer,
      body: { category: "delivery-issue", message: "The package was damaged.", orderId },
    });
    assert.equal(res.status, 201);
    assert.match(res.body.data.ticket.id, /^SUP-\d{5}$/);
    assert.equal(res.body.data.ticket.status, "open");
    ticketId = res.body.data.ticket.id;
  });

  it("keeps tickets private to their owner and admins", async () => {
    assert.equal((await api("GET", `/support/${ticketId}`, { token: other })).status, 404);
    assert.equal((await api("GET", "/support", { token: customer })).status, 403);
    const mine = await api("GET", "/support/mine", { token: customer });
    assert.equal(mine.body.data.tickets.length, 1);
    const all = await api("GET", "/support?status=open", { token: admin });
    assert.equal(all.body.data.tickets[0].id, ticketId);
  });

  it("moves through replies and status changes", async () => {
    const reply = await api("POST", `/support/${ticketId}/replies`, {
      token: admin,
      body: { message: "Sorry! A replacement is on its way." },
    });
    assert.equal(reply.body.data.ticket.status, "in-progress");
    assert.equal(reply.body.data.ticket.replies[0].authorName, "Mana Oori Santha Support");

    await api("PATCH", `/support/${ticketId}/status`, { token: admin, body: { status: "resolved" } });
    assert.equal((await api("PATCH", `/support/${ticketId}/status`, { token: customer, body: { status: "open" } })).status, 403);

    const reopened = await api("POST", `/support/${ticketId}/replies`, {
      token: customer,
      body: { message: "The replacement is also damaged." },
    });
    assert.equal(reopened.body.data.ticket.status, "open");
    assert.equal(reopened.body.data.ticket.replies.length, 2);
  });
});

describe("customer management", () => {
  it("lists customers with their orders and spend", async () => {
    assert.equal((await api("GET", "/admin/users", { token: seller })).status, 403);
    const res = await api("GET", "/admin/users", { token: admin });
    const anita = res.body.data.customers.find((c: { email: string }) => c.email === "anita@example.com");
    assert.equal(anita.orders, 1);
    assert.ok(anita.spent >= price * 2);
    assert.ok(!res.body.data.customers.some((c: { email: string }) => c.email === ADMIN.email), "customers only");
  });

  it("blocks a customer immediately and can unblock them", async () => {
    const list = (await api("GET", "/admin/users?search=ravi", { token: admin })).body.data.customers;
    const ravi = list[0];
    await api("PATCH", `/admin/users/${ravi.id}`, { token: admin, body: { isActive: false } });
    assert.equal((await api("GET", "/auth/me", { token: other })).status, 401);
    const login = await api("POST", "/auth/login", { body: { email: "ravi@example.com", password: "secret12" } });
    assert.equal(login.status, 403);
    await api("PATCH", `/admin/users/${ravi.id}`, { token: admin, body: { isActive: true } });
    assert.equal((await api("GET", "/auth/me", { token: other })).status, 200);
  });
});

describe("reports", () => {
  it("summarises sales for a date range", async () => {
    const res = await api("GET", "/admin/reports/summary", { token: admin });
    assert.equal(res.status, 200);
    const d = res.body.data;
    assert.equal(d.totals.orders, 1);
    assert.equal(d.totals.itemSales, price * 2);
    assert.equal(d.daily.length, 30);
    assert.equal(d.daily.at(-1).orders, 1, "today's order lands on today (IST)");
    assert.equal(d.byCategory[0].category, "millets");
    assert.equal(d.topProducts[0].units, 2);
    assert.equal(d.bySeller[0].farmName, "Sri Lakshmi Organic Farms");
    assert.equal(d.snapshot.openTickets, 1);
  });

  it("rejects backwards date ranges", async () => {
    const res = await api("GET", "/admin/reports/summary?from=2026-10-10&to=2026-10-01", { token: admin });
    assert.equal(res.status, 400);
  });

  it("exports orders as CSV with formula injection neutralised", async () => {
    assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
    assert.equal(csvCell("a,b"), '"a,b"');

    assert.equal((await rawGet("/admin/reports/orders.csv", customer)).status, 403);
    const csv = await rawGet("/admin/reports/orders.csv", admin);
    assert.equal(csv.status, 200);
    assert.match(csv.contentType, /text\/csv/);
    const lines = csv.text.replace(/^﻿/, "").trim().split("\r\n");
    assert.match(lines[0], /^Order Number,Order Date/);
    assert.equal(lines.length, 2, "header plus one order item");
    assert.ok(lines[1].startsWith(orderId));
    assert.ok(lines[1].includes(`"'=HYPERLINK(""http://evil"")"`), "customer name can't run as a formula");
  });
});

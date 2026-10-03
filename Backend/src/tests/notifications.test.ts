import { api, rawGet, startTestServer, stopTestServer } from "./setup";
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { seedCatalog } from "../seed/seed";
import { testOutbox, isReservedTestAddress } from "../services/mail.service";

const ADMIN = { email: "admin@test.local", password: "admin-pass-123" };
const SELLER_PASSWORD = "seller-pass-123";
const shippingAddress = {
  fullName: "Anita",
  mobile: "9876543210",
  email: "anita@mail.in",
  address: "1 Main Rd",
  village: "Tirupati",
  state: "AP",
  pincode: "517501",
};

let admin = "";
let seller = "";
let customer = "";
let productId = "";

/** Notifications and emails are sent in the background; give them a moment. */
const settle = () => new Promise((r) => setTimeout(r, 200));
const linkToken = (text: string) => text.match(/token=([a-f0-9]{64})/)?.[1] ?? "";
const lastMailTo = (to: string) => [...testOutbox].reverse().find((m) => m.to === to);

before(async () => {
  await startTestServer();
  await seedCatalog({ reset: true, adminEmail: ADMIN.email, adminPassword: ADMIN.password, sellerPassword: SELLER_PASSWORD });
  admin = (await api("POST", "/auth/login", { body: ADMIN })).body.data.token;
  seller = (await api("POST", "/auth/login", { body: { email: "ramulu.farms@example.com", password: SELLER_PASSWORD } })).body.data.token;
  productId = (await api("GET", "/products/foxtail-millet")).body.data.product.id;
});
after(stopTestServer);
beforeEach(() => {
  testOutbox.length = 0;
});

describe("email verification", () => {
  it("emails a confirmation link on sign-up that works once", async () => {
    const res = await api("POST", "/auth/register", {
      body: { name: "Anita", email: "anita@mail.in", phone: "9876543210", password: "secret12" },
    });
    customer = res.body.data.token;
    assert.equal(res.body.data.user.emailVerified, false);

    const mail = lastMailTo("anita@mail.in");
    assert.match(mail!.subject, /Confirm your email/);
    const token = linkToken(mail!.text);
    assert.equal((await api("POST", "/auth/verify-email", { body: { token } })).status, 200);
    assert.equal((await api("GET", "/auth/me", { token: customer })).body.data.user.emailVerified, true);
    assert.equal((await api("POST", "/auth/verify-email", { body: { token } })).status, 400, "single use");
  });
});

describe("password reset", () => {
  it("answers the same way for unknown emails, without sending anything", async () => {
    const res = await api("POST", "/auth/forgot-password", { body: { email: "nobody@mail.in" } });
    assert.equal(res.status, 200);
    assert.equal(testOutbox.length, 0);
  });

  it("resets the password with the emailed link and signs out old sessions", async () => {
    await api("POST", "/auth/forgot-password", { body: { email: "ANITA@mail.in" } });
    const token = linkToken(lastMailTo("anita@mail.in")!.text);
    assert.ok(token);

    const bad = await api("POST", "/auth/reset-password", { body: { token: "0".repeat(64), password: "brandnew1" } });
    assert.equal(bad.status, 400);

    // jsonwebtoken timestamps are in whole seconds.
    await new Promise((r) => setTimeout(r, 1100));
    const reset = await api("POST", "/auth/reset-password", { body: { token, password: "brandnew1" } });
    assert.equal(reset.status, 200);
    assert.ok(reset.body.data.token, "logged in after reset");

    assert.equal((await api("GET", "/auth/me", { token: customer })).status, 401, "old session ended");
    assert.equal((await api("POST", "/auth/reset-password", { body: { token, password: "another1" } })).status, 400, "single use");
    const login = await api("POST", "/auth/login", { body: { email: "anita@mail.in", password: "brandnew1" } });
    assert.equal(login.status, 200);
    customer = login.body.data.token;
  });

  it("keeps the current session after changing the password, ending the others", async () => {
    const other = (await api("POST", "/auth/login", { body: { email: "anita@mail.in", password: "brandnew1" } })).body.data.token;
    await new Promise((r) => setTimeout(r, 1100));
    const res = await api("PATCH", "/auth/me/password", {
      token: customer,
      body: { currentPassword: "brandnew1", newPassword: "secret12" },
    });
    customer = res.body.data.token;
    assert.equal((await api("GET", "/auth/me", { token: customer })).status, 200);
    assert.equal((await api("GET", "/auth/me", { token: other })).status, 401);
  });
});

describe("order notifications", () => {
  let orderId = "";

  it("tells the customer (in-app and email) and the seller about a new order", async () => {
    const placed = await api("POST", "/orders", { token: customer, body: { items: [{ productId, quantity: 2 }], shippingAddress } });
    orderId = placed.body.data.order.id;
    await settle();

    const mine = (await api("GET", "/notifications", { token: customer })).body.data;
    assert.equal(mine.notifications[0].title, `Order ${orderId} placed`);
    assert.equal(mine.notifications[0].link, "/my-orders");
    assert.match(lastMailTo("anita@mail.in")!.subject, new RegExp(`Order ${orderId} placed`));

    const sellerFeed = (await api("GET", "/notifications", { token: seller })).body.data;
    assert.equal(sellerFeed.notifications[0].title, `New order ${orderId}`);
  });

  it("respects the customer's email preferences", async () => {
    await api("PATCH", "/auth/me", { token: customer, body: { notificationPrefs: { deliveryAlerts: false } } });
    for (const status of ["confirmed", "packed", "out-for-delivery", "delivered"]) {
      await api("PATCH", `/orders/${orderId}/status`, { token: seller, body: { status } });
    }
    await settle();
    const subjects = testOutbox.filter((m) => m.to === "anita@mail.in").map((m) => m.subject);
    assert.ok(subjects.some((s) => s.startsWith("Order confirmed")), "order updates still emailed");
    assert.ok(!subjects.some((s) => s.startsWith("Out for delivery") || s.startsWith("Delivered")), "delivery emails turned off");

    const feed = (await api("GET", "/notifications", { token: customer })).body.data;
    assert.ok(feed.notifications.some((n: { title: string }) => n.title === `Order ${orderId} delivered`), "still shown in-app");
  });

  it("marks notifications read", async () => {
    let feed = (await api("GET", "/notifications", { token: customer })).body.data;
    assert.ok(feed.unreadCount > 1);
    await api("PATCH", `/notifications/${feed.notifications[0].id}/read`, { token: customer });
    const after = (await api("GET", "/notifications", { token: customer })).body.data;
    assert.equal(after.unreadCount, feed.unreadCount - 1);

    assert.equal((await api("PATCH", `/notifications/${feed.notifications[1].id}/read`, { token: seller })).status, 404, "can't touch others'");
    await api("POST", "/notifications/read-all", { token: customer });
    feed = (await api("GET", "/notifications", { token: customer })).body.data;
    assert.equal(feed.unreadCount, 0);
  });
});

describe("broadcasts and support replies", () => {
  it("broadcasts offers to every customer, emailing only those who opted in", async () => {
    assert.equal((await api("POST", "/notifications/broadcast", { token: customer, body: { title: "Sale", message: "Big sale" } })).status, 403);
    await api("PATCH", "/auth/me", { token: customer, body: { notificationPrefs: { promotions: true } } });
    const other = (await api("POST", "/auth/register", { body: { name: "Ravi", email: "ravi@mail.in", phone: "9123456789", password: "secret12" } })).body.data.token;
    testOutbox.length = 0;

    const res = await api("POST", "/notifications/broadcast", {
      token: admin,
      body: { title: "Weekend millet sale", message: "10% off all millets this weekend.", email: true },
    });
    assert.equal(res.body.data.broadcast.emailed, 1);
    await settle();
    assert.deepEqual(testOutbox.map((m) => m.to), ["anita@mail.in"]);

    const otherFeed = (await api("GET", "/notifications", { token: other })).body.data;
    assert.equal(otherFeed.notifications[0].title, "Weekend millet sale");
    await api("POST", "/notifications/read-all", { token: other });
    const anitaFeed = (await api("GET", "/notifications", { token: customer })).body.data;
    assert.equal(anitaFeed.notifications[0].read, false, "read state is per customer");
    assert.equal((await api("GET", "/notifications/broadcasts", { token: admin })).body.data.broadcasts[0].reads, 1);
  });

  it("emails the customer when support replies, with the message escaped", async () => {
    const t = (await api("POST", "/support", { token: customer, body: { category: "order-issue", message: "Where is my order?" } })).body.data.ticket;
    await api("POST", `/support/${t.id}/replies`, { token: admin, body: { message: "On its way <b>today</b>!" } });
    await settle();
    const mail = lastMailTo("anita@mail.in")!;
    assert.match(mail.subject, new RegExp(t.id));
    assert.ok(mail.html.includes("&lt;b&gt;today&lt;/b&gt;"), "user text can't inject HTML");
    const adminFeed = (await api("GET", "/notifications", { token: admin })).body.data;
    assert.ok(adminFeed.notifications.some((n: { title: string }) => n.title === `New support request ${t.id}`));
  });
});

describe("misc", () => {
  it("never emails reserved test domains", () => {
    assert.equal(isReservedTestAddress("ramulu.farms@example.com"), true);
    assert.equal(isReservedTestAddress("admin@shop.local"), true);
    assert.equal(isReservedTestAddress("anita@gmail.com"), false);
  });

  it("serves a sitemap of live pages and a robots.txt", async () => {
    const sitemap = await rawGet("/../sitemap.xml");
    assert.equal(sitemap.status, 200);
    assert.ok(sitemap.text.includes("/products/foxtail-millet</loc>"));
    const robots = await rawGet("/../robots.txt");
    assert.match(robots.text, /Disallow: \/admin/);
    assert.match(robots.text, /Sitemap: .*\/sitemap\.xml/);
  });
});

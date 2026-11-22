import { api, startTestServer, stopTestServer } from "./setup";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { seedCatalog } from "../seed/seed";
import { testOutbox } from "../services/mail.service";
import { User } from "../models/User";
import { ensureOwner } from "../config/migrations";

const ADMIN = { email: "admin@test.local", password: "admin-pass-123" };
const SELLER_PASSWORD = "seller-pass-123";

let admin = "";
let customer = "";
let customerId = "";
let kiranToken = "";

const settle = () => new Promise((r) => setTimeout(r, 200));
const linkToken = (text: string) => text.match(/token=([a-f0-9]{64})/)?.[1] ?? "";

before(async () => {
  await startTestServer();
  await seedCatalog({ adminEmail: ADMIN.email, adminPassword: ADMIN.password, sellerPassword: SELLER_PASSWORD });
  admin = (await api("POST", "/auth/login", { body: ADMIN })).body.data.token;
  const reg = await api("POST", "/auth/register", {
    body: { name: "Priya", email: "priya@mail.in", phone: "9876543210", password: "secret12" },
  });
  customer = reg.body.data.token;
  customerId = reg.body.data.user.id;
});
after(stopTestServer);

describe("admin team", () => {
  it("is only for admins", async () => {
    assert.equal((await api("GET", "/admin/team", { token: customer })).status, 403);
    const team = (await api("GET", "/admin/team", { token: admin })).body.data;
    assert.equal(team.admins.length, 1);
    assert.equal(team.admins[0].isYou, true);
  });

  it("makes an existing customer an admin only after they accept", async () => {
    testOutbox.length = 0;
    const res = await api("POST", "/admin/team", { token: admin, body: { email: "PRIYA@mail.in" } });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.invited, true);
    await settle();
    const mail = testOutbox.find((m) => m.to === "priya@mail.in")!;
    assert.match(mail.text, /Log in with your existing account/);
    const token = linkToken(mail.text);

    // Nothing changes until she accepts.
    assert.equal((await api("GET", "/admin/team", { token: customer })).status, 403);
    assert.equal((await api("GET", `/auth/admin-invite?token=${token}`)).body.data.hasAccount, true);
    assert.equal((await api("POST", "/admin/team", { token: admin, body: { email: "priya@mail.in" } })).status, 409, "one invite at a time");

    // Only the invited account can accept it.
    const other = (await api("POST", "/auth/register", { body: { name: "Other", email: "other@mail.in", phone: "9876543210", password: "secret12" } })).body.data.token;
    const wrong = await api("POST", "/auth/admin-invite/accept-existing", { token: other, body: { token } });
    assert.equal(wrong.status, 403);
    assert.equal(wrong.body.error, "WRONG_ACCOUNT");

    const accepted = await api("POST", "/auth/admin-invite/accept-existing", { token: customer, body: { token } });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.data.user.role, "admin");
    assert.equal((await api("GET", "/admin/users", { token: customer })).status, 200);
    assert.equal((await api("POST", "/auth/admin-invite/accept-existing", { token: customer, body: { token } })).status, 400, "single use");
    assert.equal((await api("POST", "/admin/team", { token: admin, body: { email: "priya@mail.in" } })).status, 409, "already admin");
  });

  it("won't turn a seller's shop account into an admin", async () => {
    const res = await api("POST", "/admin/team", { token: admin, body: { email: "ramulu.farms@example.com" } });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "SELLER_ACCOUNT");
  });

  it("invites someone new, who sets their own password and is logged in as admin", async () => {
    testOutbox.length = 0;
    const res = await api("POST", "/admin/team", { token: admin, body: { email: "kiran@mail.in" } });
    assert.equal(res.body.data.invited, true);
    assert.equal((await api("POST", "/admin/team", { token: admin, body: { email: "kiran@mail.in" } })).status, 409, "no duplicate invites");
    await settle();
    const firstToken = linkToken(testOutbox.find((m) => m.to === "kiran@mail.in")!.text);

    // Resending replaces the link: the old one stops working.
    const invites = (await api("GET", "/admin/team", { token: admin })).body.data.invites;
    testOutbox.length = 0;
    await api("POST", `/admin/team/invites/${invites[0].id}/resend`, { token: admin });
    await settle();
    const token = linkToken(testOutbox.find((m) => m.to === "kiran@mail.in")!.text);
    assert.notEqual(token, firstToken);
    assert.equal((await api("GET", `/auth/admin-invite?token=${firstToken}`)).status, 400);

    const preview = await api("GET", `/auth/admin-invite?token=${token}`);
    assert.equal(preview.body.data.email, "kiran@mail.in");

    const accepted = await api("POST", "/auth/admin-invite/accept", {
      body: { token, name: "Kiran", phone: "9123456789", password: "kiranpass1" },
    });
    assert.equal(accepted.status, 201);
    assert.equal(accepted.body.data.user.role, "admin");
    assert.equal(accepted.body.data.user.emailVerified, true);
    assert.equal((await api("GET", "/admin/users", { token: accepted.body.data.token })).status, 200);
    kiranToken = accepted.body.data.token;
    assert.equal(
      (await api("POST", "/auth/admin-invite/accept", { body: { token, name: "Kiran", phone: "9123456789", password: "kiranpass1" } })).status,
      400,
      "single use"
    );
  });

  it("cancels invitations", async () => {
    await api("POST", "/admin/team", { token: admin, body: { email: "temp@mail.in" } });
    const invite = (await api("GET", "/admin/team", { token: admin })).body.data.invites.find((i: { email: string }) => i.email === "temp@mail.in");
    assert.equal((await api("DELETE", `/admin/team/invites/${invite.id}`, { token: admin })).status, 200);
    const after = (await api("GET", "/admin/team", { token: admin })).body.data.invites;
    assert.ok(!after.some((i: { email: string }) => i.email === "temp@mail.in"));
  });

  it("keeps the team, bank details and payouts for the owner only", async () => {
    assert.equal((await api("GET", "/auth/me", { token: admin })).body.data.user.isOwner, true);
    assert.equal((await api("GET", "/auth/me", { token: customer })).body.data.user.isOwner, false);
    const sellerId = (await api("GET", "/sellers")).body.data.sellers[0].id;
    for (const path of ["/admin/team", "/payouts/balances", `/sellers/${sellerId}/kyc`, `/sellers/${sellerId}/earnings`]) {
      const res = await api("GET", path, { token: customer });
      assert.equal(res.status, 403, path);
      assert.equal(res.body.error, "OWNER_ONLY", path);
      assert.equal((await api("GET", path, { token: admin })).status, 200, path);
    }
    assert.equal((await api("POST", "/admin/team", { token: customer, body: { email: "x@mail.in" } })).status, 403);
    assert.equal((await api("POST", "/payouts", { token: customer, body: {} })).status, 403);
    const team = (await api("GET", "/admin/team", { token: admin })).body.data;
    assert.deepEqual(team.admins.filter((a: { isOwner: boolean }) => a.isOwner).map((a: { isYou: boolean }) => a.isYou), [true]);
  });

  it("never removes or deletes the owner, who can hand ownership over", async () => {
    const team = (await api("GET", "/admin/team", { token: admin })).body.data;
    const me = team.admins.find((a: { isYou: boolean }) => a.isYou);
    const kiran = team.admins.find((a: { email: string }) => a.email === "kiran@mail.in");
    const removeOwner = await api("DELETE", `/admin/team/${me.id}`, { token: admin });
    assert.equal(removeOwner.status, 400);
    assert.equal(removeOwner.body.error, "OWNER");
    assert.equal((await api("DELETE", "/auth/me", { token: admin })).body.error, "OWNER");

    assert.equal((await api("POST", "/admin/team/transfer-ownership", { token: customer, body: { userId: kiran.id } })).status, 403);
    assert.equal((await api("POST", "/admin/team/transfer-ownership", { token: admin, body: { userId: "0".repeat(24) } })).status, 404);
    const res = await api("POST", "/admin/team/transfer-ownership", { token: admin, body: { userId: kiran.id } });
    assert.equal(res.status, 200);
    assert.equal((await api("GET", "/payouts/balances", { token: admin })).status, 403, "old owner loses owner rights");
    assert.equal((await api("GET", "/admin/users", { token: admin })).status, 200, "but stays an admin");
    assert.equal((await api("GET", "/payouts/balances", { token: kiranToken })).status, 200);
    const activity = (await api("GET", "/admin/team", { token: kiranToken })).body.data.activity;
    assert.equal(activity[0].action, "owner.transferred");

    // Hand it back for the rest of the tests.
    assert.equal((await api("POST", "/admin/team/transfer-ownership", { token: kiranToken, body: { userId: me.id } })).status, 200);
    assert.equal(await User.countDocuments({ isOwner: true }), 1);
  });

  it("picks the earliest admin as owner when nobody is", async () => {
    await User.updateMany({}, { isOwner: false });
    await ensureOwner();
    assert.equal((await api("GET", "/auth/me", { token: admin })).body.data.user.isOwner, true);
    assert.equal(await User.countDocuments({ isOwner: true }), 1);
  });

  it("removes admin access immediately but never the last admin", async () => {
    const res = await api("DELETE", `/admin/team/${customerId}`, { token: admin });
    assert.equal(res.status, 200);
    assert.equal((await api("GET", "/admin/team", { token: customer })).status, 403, "access ends at once");
    assert.equal((await api("GET", "/auth/me", { token: customer })).body.data.user.role, "customer");

    // Remove Kiran, leaving one admin, who can't remove themselves.
    const team = (await api("GET", "/admin/team", { token: admin })).body.data;
    const kiran = team.admins.find((a: { email: string }) => a.email === "kiran@mail.in");
    await api("DELETE", `/admin/team/${kiran.id}`, { token: admin });
    const me = team.admins.find((a: { isYou: boolean }) => a.isYou);
    const last = await api("DELETE", `/admin/team/${me.id}`, { token: admin });
    assert.equal(last.status, 400);
    assert.equal(last.body.error, "OWNER", "the last admin is the owner");
  });

  it("keeps a history of who changed what", async () => {
    const activity = (await api("GET", "/admin/team", { token: admin })).body.data.activity;
    const actions = activity.map((a: { action: string }) => a.action);
    for (const a of ["admin.invited", "admin.invite-resent", "admin.invite-accepted", "admin.invite-cancelled", "admin.removed"]) {
      assert.ok(actions.includes(a), `missing ${a}`);
    }
  });
});

describe("deleting customers", () => {
  const shippingAddress = {
    fullName: "Lakshmi",
    mobile: "9876543210",
    email: "lakshmi@mail.in",
    address: "1 Main Rd",
    village: "Tirupati",
    state: "AP",
    pincode: "517501",
  };

  async function newCustomer(email: string) {
    const res = await api("POST", "/auth/register", { body: { name: "Lakshmi", email, phone: "9876543210", password: "secret12" } });
    return { token: res.body.data.token as string, id: res.body.data.user.id as string };
  }

  it("removes a customer with no history completely, freeing the email", async () => {
    const c = await newCustomer("nohistory@mail.in");
    assert.equal((await api("DELETE", `/admin/users/${c.id}`, { token: customer })).status, 403, "admins only");
    const res = await api("DELETE", `/admin/users/${c.id}`, { token: admin });
    assert.equal(res.body.data.mode, "removed");
    assert.equal((await api("GET", "/auth/me", { token: c.token })).status, 401);
    const list = (await api("GET", "/admin/users?search=nohistory", { token: admin })).body.data.customers;
    assert.equal(list.length, 0);
    assert.equal((await newCustomer("nohistory@mail.in")).id.length, 24, "can sign up again");
  });

  it("erases personal details but keeps the orders of a customer with history", async () => {
    const c = await newCustomer("lakshmi@mail.in");
    const product = (await api("GET", "/products/foxtail-millet")).body.data.product;
    const order = (await api("POST", "/orders", { token: c.token, body: { items: [{ productId: product.id, quantity: 1 }], shippingAddress } })).body.data.order;

    const res = await api("DELETE", `/admin/users/${c.id}`, { token: admin });
    assert.equal(res.body.data.mode, "anonymized");
    assert.equal((await api("POST", "/auth/login", { body: { email: "lakshmi@mail.in", password: "secret12" } })).status, 401);
    assert.equal((await api("GET", `/orders/${order.id}`, { token: admin })).status, 200, "order kept for records");
    assert.equal((await api("GET", "/admin/users?search=lakshmi@mail.in", { token: admin })).body.data.customers.length, 0);
    assert.equal((await newCustomer("lakshmi@mail.in")).id.length, 24, "email is free again");

    const activity = (await api("GET", "/admin/team", { token: admin })).body.data.activity;
    assert.ok(activity.some((a: { action: string; targetEmail: string }) => a.action === "customer.deleted" && a.targetEmail === "lakshmi@mail.in"));
  });

  it("only deletes customer accounts from here", async () => {
    const team = (await api("GET", "/admin/team", { token: admin })).body.data;
    assert.equal((await api("DELETE", `/admin/users/${team.admins[0].id}`, { token: admin })).status, 404);
  });

  it("uses the same deletion when customers delete their own account", async () => {
    const c = await newCustomer("selfdelete@mail.in");
    assert.equal((await api("DELETE", "/auth/me", { token: c.token })).status, 200);
    assert.equal((await newCustomer("selfdelete@mail.in")).id.length, 24, "email is free again");
  });

  it("stops the only admin deleting their own account", async () => {
    const res = await api("DELETE", "/auth/me", { token: admin });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "LAST_ADMIN");
  });
});

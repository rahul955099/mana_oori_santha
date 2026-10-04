import { api, startTestServer, stopTestServer } from "./setup";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { seedCatalog } from "../seed/seed";
import { testOutbox } from "../services/mail.service";

const ADMIN = { email: "admin@test.local", password: "admin-pass-123" };
const SELLER_PASSWORD = "seller-pass-123";

let admin = "";
let customer = "";
let customerId = "";

const settle = () => new Promise((r) => setTimeout(r, 200));
const linkToken = (text: string) => text.match(/token=([a-f0-9]{64})/)?.[1] ?? "";

before(async () => {
  await startTestServer();
  await seedCatalog({ reset: true, adminEmail: ADMIN.email, adminPassword: ADMIN.password, sellerPassword: SELLER_PASSWORD });
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

  it("upgrades an existing customer immediately and tells them", async () => {
    testOutbox.length = 0;
    const res = await api("POST", "/admin/team", { token: admin, body: { email: "PRIYA@mail.in" } });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.added, true);
    await settle();
    assert.match(testOutbox.find((m) => m.to === "priya@mail.in")!.subject, /now an admin/);
    // Her existing session gains admin access straight away.
    assert.equal((await api("GET", "/admin/team", { token: customer })).status, 200);
    assert.equal((await api("POST", "/admin/team", { token: admin, body: { email: "priya@mail.in" } })).status, 409);
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
    assert.equal((await api("GET", "/admin/team", { token: accepted.body.data.token })).status, 200);
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
    assert.equal(last.body.error, "LAST_ADMIN");
  });

  it("keeps a history of who changed what", async () => {
    const activity = (await api("GET", "/admin/team", { token: admin })).body.data.activity;
    const actions = activity.map((a: { action: string }) => a.action);
    for (const a of ["admin.added", "admin.invited", "admin.invite-resent", "admin.invite-accepted", "admin.invite-cancelled", "admin.removed"]) {
      assert.ok(actions.includes(a), `missing ${a}`);
    }
  });
});

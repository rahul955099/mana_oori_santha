import { api, startTestServer, stopTestServer } from "./setup";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { seedCatalog } from "../seed/seed";

const SELLER_PASSWORD = "seller-pass-123";
const ADMIN = { email: "admin@test.local", password: "admin-pass-123" };
const seedOptions = { adminEmail: ADMIN.email, adminPassword: ADMIN.password, sellerPassword: SELLER_PASSWORD };

let adminToken = "";
let sellerToken = "";
let customerToken = "";

before(async () => {
  await startTestServer();
  await seedCatalog({ ...seedOptions, reset: true });
});
after(stopTestServer);

describe("seed", () => {
  it("is idempotent", async () => {
    const first = await api("GET", "/products?limit=500");
    await seedCatalog({ ...seedOptions, reset: false });
    const second = await api("GET", "/products?limit=500");
    assert.equal(second.body.data.total, first.body.data.total);
    assert.ok(first.body.data.total > 0);
  });
});

describe("auth", () => {
  it("registers a customer, ignoring any role in the body", async () => {
    const res = await api("POST", "/auth/register", {
      body: { name: "Anita", email: "Anita@Example.com", phone: "9876543210", password: "secret12", role: "admin" },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.role, "customer");
    assert.equal(res.body.data.user.email, "anita@example.com");
    assert.match(res.body.data.user.userCode, /^MOS-\d{5}$/);
    customerToken = res.body.data.token;
  });

  it("rejects duplicate emails and bad input", async () => {
    const dup = await api("POST", "/auth/register", {
      body: { name: "Anita", email: "anita@example.com", phone: "9876543210", password: "secret12" },
    });
    assert.equal(dup.status, 409);
    const bad = await api("POST", "/auth/register", { body: { name: "A", email: "nope", phone: "1", password: "x" } });
    assert.equal(bad.status, 400);
  });

  it("logs in with the right password only", async () => {
    const wrong = await api("POST", "/auth/login", { body: { email: "anita@example.com", password: "wrong-pass" } });
    assert.equal(wrong.status, 401);
    const ok = await api("POST", "/auth/login", { body: { email: "ANITA@example.com", password: "secret12" } });
    assert.equal(ok.status, 200);
  });

  it("registers a seller with an unverified shop", async () => {
    const res = await api("POST", "/auth/register/seller", {
      body: {
        name: "Ravi",
        email: "ravi@farm.in",
        phone: "9123456789",
        password: "secret12",
        shopName: "Ravi Farms",
        location: "Guntur",
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.role, "seller");
    assert.equal(res.body.data.user.shopName, "Ravi Farms");
    sellerToken = res.body.data.token;
    const shop = await api("GET", `/sellers/${res.body.data.user.sellerId}`);
    assert.equal(shop.body.data.seller.verified, false);
  });

  it("updates profile and password", async () => {
    const upd = await api("PATCH", "/auth/me", { token: customerToken, body: { name: "Anita Reddy" } });
    assert.equal(upd.body.data.user.name, "Anita Reddy");
    const badPw = await api("PATCH", "/auth/me/password", {
      token: customerToken,
      body: { currentPassword: "wrong", newPassword: "newsecret1" },
    });
    assert.equal(badPw.status, 400);
    const pw = await api("PATCH", "/auth/me/password", {
      token: customerToken,
      body: { currentPassword: "secret12", newPassword: "newsecret1" },
    });
    assert.equal(pw.status, 200);
    const login = await api("POST", "/auth/login", { body: { email: "anita@example.com", password: "newsecret1" } });
    assert.equal(login.status, 200);
  });

  it("logs in the seeded admin", async () => {
    const res = await api("POST", "/auth/login", { body: ADMIN });
    assert.equal(res.body.data.user.role, "admin");
    adminToken = res.body.data.token;
  });
});

describe("catalog", () => {
  it("lists active categories with product counts", async () => {
    const res = await api("GET", "/categories");
    const millets = res.body.data.categories.find((c: { slug: string }) => c.slug === "millets");
    assert.ok(millets.productCount > 0);
    assert.ok(!res.body.data.categories.some((c: { slug: string }) => c.slug === "spices"), "inactive hidden");
  });

  it("filters, searches, sorts and paginates products", async () => {
    const page = await api("GET", "/products?limit=5&page=2");
    assert.equal(page.body.data.products.length, 5);
    assert.equal(page.body.data.page, 2);

    const cat = await api("GET", "/products?category=millets,pulses&limit=500");
    assert.ok(cat.body.data.products.every((p: { category: string }) => ["millets", "pulses"].includes(p.category)));

    const sorted = await api("GET", "/products?sort=price-low&maxPrice=200&limit=500");
    const prices: number[] = sorted.body.data.products.map((p: { price: number }) => p.price);
    assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
    assert.ok(prices.every((p) => p <= 200));

    const search = await api("GET", "/products?search=foxtail");
    assert.equal(search.body.data.products[0].slug, "foxtail-millet");

    const regexSafe = await api("GET", "/products?search=" + encodeURIComponent("(.*"));
    assert.equal(regexSafe.status, 200);
  });

  it("fetches a product by slug or id", async () => {
    const bySlug = await api("GET", "/products/foxtail-millet");
    assert.equal(bySlug.status, 200);
    const byId = await api("GET", `/products/${bySlug.body.data.product.id}`);
    assert.equal(byId.body.data.product.slug, "foxtail-millet");
    const missing = await api("GET", "/products/does-not-exist");
    assert.equal(missing.status, 404);
  });
});

describe("product management permissions", () => {
  let productId = "";

  it("blocks customers and anonymous users from creating products", async () => {
    const body = { name: "Test Rice", category: "rice", price: 50, mrp: 60, unit: "1 kg", stock: 5 };
    assert.equal((await api("POST", "/products", { body })).status, 401);
    assert.equal((await api("POST", "/products", { body, token: customerToken })).status, 403);
  });

  it("lets a seller create their own product, but not feature it", async () => {
    const res = await api("POST", "/products", {
      token: sellerToken,
      body: { name: "Sona Masoori Rice", category: "rice", price: 70, mrp: 80, unit: "1 kg", stock: 10, isFeatured: true },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.product.isFeatured, false);
    productId = res.body.data.product.id;
  });

  it("validates category and price vs MRP", async () => {
    const badCat = await api("POST", "/products", {
      token: sellerToken,
      body: { name: "X Item", category: "nope", price: 10, mrp: 20, unit: "1 kg", stock: 1 },
    });
    assert.equal(badCat.status, 400);
    const badPrice = await api("PATCH", `/products/${productId}`, { token: sellerToken, body: { price: 999 } });
    assert.equal(badPrice.status, 400);
  });

  it("stops a seller editing another seller's product", async () => {
    const other = await api("GET", "/products/foxtail-millet");
    const res = await api("PATCH", `/products/${other.body.data.product.id}`, { token: sellerToken, body: { stock: 0 } });
    assert.equal(res.status, 403);
  });

  it("soft-deletes so the product disappears from the store", async () => {
    const del = await api("DELETE", `/products/${productId}`, { token: sellerToken });
    assert.equal(del.status, 200);
    assert.equal((await api("GET", `/products/${productId}`)).status, 404);
  });

  it("lets an admin verify and remove a seller, hiding their products", async () => {
    const me = await api("GET", "/sellers/me", { token: sellerToken });
    const sellerId = me.body.data.seller.id;
    const forbidden = await api("PATCH", `/sellers/${sellerId}`, { token: sellerToken, body: { verified: true } });
    assert.equal(forbidden.status, 403);
    const verified = await api("PATCH", `/sellers/${sellerId}`, { token: adminToken, body: { verified: true } });
    assert.equal(verified.body.data.seller.verified, true);

    await api("POST", "/products", {
      token: sellerToken,
      body: { name: "Brown Rice", category: "rice", price: 70, mrp: 80, unit: "1 kg", stock: 10 },
    });
    assert.equal((await api("DELETE", `/sellers/${sellerId}`, { token: adminToken })).status, 200);
    const list = await api("GET", `/products?seller=${sellerId}`);
    assert.equal(list.body.data.total, 0);
    // The removed seller's existing token stops working immediately.
    assert.equal((await api("GET", "/auth/me", { token: sellerToken })).status, 401);
  });
});

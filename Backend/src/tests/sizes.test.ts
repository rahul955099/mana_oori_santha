import { api, startTestServer, stopTestServer } from "./setup";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { seedCatalog } from "../seed/seed";
import { ensureFashionCategories } from "../config/migrations";
import { Product } from "../models/Product";

const SELLER_PASSWORD = "seller-pass-123";
const ADMIN = { email: "admin@test.local", password: "admin-pass-123" };

const shippingAddress = {
  fullName: "Anita Reddy",
  mobile: "9876543210",
  email: "anita@example.com",
  address: "12-3, Temple Street",
  village: "Tirupati",
  district: "Chittoor",
  state: "Andhra Pradesh",
  pincode: "517501",
};

let customer = "";
let seller = "";
let admin = "";
let dressId = "";

before(async () => {
  await startTestServer();
  await seedCatalog({ reset: true, adminEmail: ADMIN.email, adminPassword: ADMIN.password, sellerPassword: SELLER_PASSWORD });
  await ensureFashionCategories();
  customer = (await api("POST", "/auth/register", { body: { name: "Anita", email: "anita@example.com", phone: "9876543210", password: "secret12" } }))
    .body.data.token;
  seller = (await api("POST", "/auth/login", { body: { email: "ramulu.farms@example.com", password: SELLER_PASSWORD } })).body.data.token;
  admin = (await api("POST", "/auth/login", { body: ADMIN })).body.data.token;
});
after(stopTestServer);

describe("product sizes", () => {
  it("lets sellers list the sizes a dress comes in, cleaned up", async () => {
    const res = await api("POST", "/products", {
      token: seller,
      body: {
        name: "Cotton Anarkali Dress",
        category: "dresses",
        description: "Soft cotton anarkali.",
        price: 1200,
        mrp: 1500,
        unit: "1 piece",
        stock: 3,
        image: "https://res.cloudinary.com/demo/image/upload/dress.jpg",
        sizes: [" S ", "M", "m", "L", ""],
      },
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.deepEqual(res.body.data.product.sizes, ["S", "M", "L"]);
    dressId = res.body.data.product.id;
    // New listings go on sale once the site owner approves them.
    await api("PATCH", `/products/${dressId}/approval`, { token: admin, body: { decision: "approve" } });

    const edited = await api("PATCH", `/products/${dressId}`, { token: seller, body: { sizes: ["S", "M", "L", "XL"] } });
    assert.deepEqual(edited.body.data.product.sizes, ["S", "M", "L", "XL"]);
  });

  it("needs a size the dress actually comes in", async () => {
    const none = await api("POST", "/orders/quote", { body: { items: [{ productId: dressId, quantity: 1 }] } });
    assert.equal(none.body.data.problems[0].reason, "size-required");
    const wrong = await api("POST", "/orders/quote", { body: { items: [{ productId: dressId, quantity: 1, size: "XXL" }] } });
    assert.equal(wrong.body.data.problems[0].reason, "size-required");
    const ok = await api("POST", "/orders/quote", { body: { items: [{ productId: dressId, quantity: 1, size: "m" }] } });
    assert.equal(ok.body.data.problems.length, 0);
    assert.equal(ok.body.data.items[0].size, "M", "stored with the seller's spelling");
  });

  it("counts every size against the one stock", async () => {
    const items = [
      { productId: dressId, quantity: 2, size: "S" },
      { productId: dressId, quantity: 2, size: "M" },
    ];
    const res = await api("POST", "/orders/quote", { body: { items } });
    assert.equal(res.body.data.problems[0].reason, "insufficient-stock");
  });

  it("keeps the size on the saved cart and the order, and takes stock once", async () => {
    const items = [
      { productId: dressId, quantity: 1, size: "S" },
      { productId: dressId, quantity: 2, size: "L" },
    ];
    const cart = await api("PUT", "/cart", { token: customer, body: { items } });
    assert.deepEqual(
      cart.body.data.items.map((i: { size: string; quantity: number }) => `${i.size}x${i.quantity}`),
      ["Sx1", "Lx2"]
    );

    const order = await api("POST", "/orders", { token: customer, body: { items, shippingAddress } });
    assert.equal(order.status, 201, JSON.stringify(order.body));
    assert.deepEqual(
      order.body.data.order.items.map((i: { size: string }) => i.size),
      ["S", "L"]
    );
    assert.equal((await Product.findById(dressId))!.stock, 0);
  });

  it("leaves products without sizes unchanged", async () => {
    const millet = (await api("GET", "/products/foxtail-millet")).body.data.product;
    assert.deepEqual(millet.sizes, []);
    const res = await api("POST", "/orders/quote", { body: { items: [{ productId: millet.id, quantity: 1, size: "M" }] } });
    assert.equal(res.body.data.problems.length, 0);
    assert.equal(res.body.data.items[0].size, undefined, "a size sent for an unsized product is ignored");
  });
});

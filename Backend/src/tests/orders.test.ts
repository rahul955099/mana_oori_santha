import { api, startTestServer, stopTestServer } from "./setup";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { seedCatalog } from "../seed/seed";
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
let otherCustomer = "";
let admin = "";
let ramulu = ""; // seller of foxtail millet
let lakshmi = ""; // a different seller

type P = { id: string; slug: string; price: number; stock: number; sellerId: string; category: string };
let foxtail: P;
let otherSellersProduct: P;

async function register(name: string, email: string) {
  const res = await api("POST", "/auth/register", { body: { name, email, phone: "9876543210", password: "secret12" } });
  return res.body.data.token as string;
}
async function login(email: string, password: string) {
  return (await api("POST", "/auth/login", { body: { email, password } })).body.data.token as string;
}
async function stockOf(id: string) {
  return (await Product.findById(id))!.stock;
}

before(async () => {
  await startTestServer();
  await seedCatalog({ reset: true, adminEmail: ADMIN.email, adminPassword: ADMIN.password, sellerPassword: SELLER_PASSWORD });
  customer = await register("Anita", "anita@example.com");
  otherCustomer = await register("Ravi", "ravi@example.com");
  admin = await login(ADMIN.email, ADMIN.password);
  ramulu = await login("ramulu.farms@example.com", SELLER_PASSWORD);
  lakshmi = await login("vanabhoomi@example.com", SELLER_PASSWORD);

  foxtail = (await api("GET", "/products/foxtail-millet")).body.data.product;
  const all: P[] = (await api("GET", "/products?limit=500")).body.data.products;
  otherSellersProduct = all.find((p) => p.sellerId !== foxtail.sellerId && p.price > 0 && p.stock > 5)!;
});
after(stopTestServer);

describe("cart, wishlist and addresses", () => {
  it("saves the cart, merging duplicates and dropping unknown products", async () => {
    const res = await api("PUT", "/cart", {
      token: customer,
      body: {
        items: [
          { productId: foxtail.id, quantity: 1 },
          { productId: foxtail.id, quantity: 2 },
          { productId: "000000000000000000000000", quantity: 1 },
        ],
        couponCode: "farm10",
      },
    });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.items, [{ productId: foxtail.id, quantity: 3 }]);
    assert.equal(res.body.data.couponCode, "FARM10");
    const get = await api("GET", "/cart", { token: customer });
    assert.deepEqual(get.body.data.items, [{ productId: foxtail.id, quantity: 3 }]);
  });

  it("saves the wishlist", async () => {
    const res = await api("PUT", "/wishlist", { token: customer, body: { productIds: [foxtail.id, foxtail.id] } });
    assert.deepEqual(res.body.data.productIds, [foxtail.id]);
  });

  it("manages addresses with exactly one default", async () => {
    const address = { fullName: "Anita", phone: "9876543210", houseNo: "1", street: "Main Rd", city: "Tirupati", state: "AP", pincode: "517501" };
    const first = await api("POST", "/addresses", { token: customer, body: address });
    assert.equal(first.status, 201);
    assert.equal(first.body.data.addresses[0].isDefault, true);
    const second = await api("POST", "/addresses", { token: customer, body: { ...address, type: "work" } });
    const secondId = second.body.data.addresses[1].id;
    const def = await api("POST", `/addresses/${secondId}/default`, { token: customer });
    assert.deepEqual(def.body.data.addresses.map((a: { isDefault: boolean }) => a.isDefault), [false, true]);
    const del = await api("DELETE", `/addresses/${secondId}`, { token: customer });
    assert.equal(del.body.data.addresses[0].isDefault, true);
    const bad = await api("POST", "/addresses", { token: customer, body: { ...address, pincode: "12" } });
    assert.equal(bad.status, 400);
  });
});

describe("quotes and coupons", () => {
  it("prices from the database and adds delivery under ₹500", async () => {
    const res = await api("POST", "/orders/quote", { body: { items: [{ productId: foxtail.id, quantity: 2 }] } });
    assert.equal(res.body.data.subtotal, foxtail.price * 2);
    assert.equal(res.body.data.deliveryCharge, foxtail.price * 2 >= 500 ? 0 : 40);
  });

  it("delivers free at ₹500 and above", async () => {
    const qty = Math.ceil(500 / foxtail.price);
    const res = await api("POST", "/orders/quote", { body: { items: [{ productId: foxtail.id, quantity: qty }] } });
    assert.equal(res.body.data.deliveryCharge, 0);
  });

  it("applies category and minimum-order coupon rules", async () => {
    const millet = await api("POST", "/orders/quote", {
      body: { items: [{ productId: foxtail.id, quantity: 2 }], couponCode: "millet10" },
    });
    assert.equal(millet.body.data.coupon.valid, true);
    assert.equal(millet.body.data.discount, Math.round(foxtail.price * 2 * 0.1));

    const tooSmall = await api("POST", "/orders/quote", {
      body: { items: [{ productId: foxtail.id, quantity: 1 }], couponCode: "FARM10" },
    });
    assert.equal(tooSmall.body.data.coupon.valid, false);
    assert.equal(tooSmall.body.data.discount, 0);

    const bogus = await api("POST", "/orders/quote", { body: { items: [{ productId: foxtail.id, quantity: 1 }], couponCode: "NOPE" } });
    assert.equal(bogus.body.data.coupon.valid, false);
  });

  it("reports items that exceed stock", async () => {
    const res = await api("POST", "/orders/quote", { body: { items: [{ productId: foxtail.id, quantity: 99 }] } });
    if (foxtail.stock < 99) {
      assert.equal(res.body.data.problems[0].reason, "insufficient-stock");
      assert.equal(res.body.data.problems[0].available, foxtail.stock);
    }
  });
});

describe("placing orders", () => {
  let orderNumber = "";

  it("requires login", async () => {
    const res = await api("POST", "/orders", { body: { items: [{ productId: foxtail.id, quantity: 1 }], shippingAddress } });
    assert.equal(res.status, 401);
  });

  it("places an order, takes stock, applies FIRSTORDER and empties the server cart", async () => {
    const before = await stockOf(foxtail.id);
    const res = await api("POST", "/orders", {
      token: customer,
      body: {
        // The client price is ignored; only id and quantity matter.
        items: [{ productId: foxtail.id, quantity: 2, price: 1 }],
        couponCode: "FIRSTORDER",
        shippingAddress,
      },
    });
    assert.equal(res.status, 201);
    const order = res.body.data.order;
    assert.match(order.id, /^MOS-\d{6}$/);
    assert.equal(order.items[0].price, foxtail.price);
    assert.equal(order.discount, 50);
    assert.equal(order.total, order.subtotal - 50 + order.deliveryCharge);
    assert.equal(order.status, "pending");
    assert.equal(order.paymentMethod, "cod");
    assert.equal(await stockOf(foxtail.id), before - 2);
    assert.deepEqual((await api("GET", "/cart", { token: customer })).body.data.items, []);
    orderNumber = order.id;
  });

  it("allows FIRSTORDER only once per customer", async () => {
    const res = await api("POST", "/orders", {
      token: customer,
      body: { items: [{ productId: foxtail.id, quantity: 1 }], couponCode: "FIRSTORDER", shippingAddress },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "INVALID_COUPON");
  });

  it("rejects orders beyond available stock without taking any", async () => {
    await Product.updateOne({ _id: otherSellersProduct.id }, { stock: 1 });
    const before = await stockOf(foxtail.id);
    const res = await api("POST", "/orders", {
      token: customer,
      body: {
        items: [
          { productId: foxtail.id, quantity: 1 },
          { productId: otherSellersProduct.id, quantity: 2 },
        ],
        shippingAddress,
      },
    });
    assert.equal(res.status, 409);
    assert.equal(res.body.error, "CART_CHANGED");
    assert.equal(await stockOf(foxtail.id), before);
    await Product.updateOne({ _id: otherSellersProduct.id }, { stock: 50 });
  });

  it("never oversells the last unit under concurrent checkouts", async () => {
    await Product.updateOne({ _id: otherSellersProduct.id }, { stock: 1 });
    const attempt = (token: string) =>
      api("POST", "/orders", { token, body: { items: [{ productId: otherSellersProduct.id, quantity: 1 }], shippingAddress } });
    const results = await Promise.all([attempt(customer), attempt(otherCustomer)]);
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
    assert.equal(await stockOf(otherSellersProduct.id), 0);
    await Product.updateOne({ _id: otherSellersProduct.id }, { stock: 50 });
  });

  it("validates the shipping pincode", async () => {
    const res = await api("POST", "/orders", {
      token: customer,
      body: { items: [{ productId: foxtail.id, quantity: 1 }], shippingAddress: { ...shippingAddress, pincode: "000000" } },
    });
    assert.equal(res.status, 400);
  });

  it("shows orders to the buyer, admin and involved seller only", async () => {
    assert.equal((await api("GET", `/orders/${orderNumber}`, { token: customer })).status, 200);
    assert.equal((await api("GET", `/orders/${orderNumber}`, { token: admin })).status, 200);
    assert.equal((await api("GET", `/orders/${orderNumber}`, { token: ramulu })).status, 200);
    assert.equal((await api("GET", `/orders/${orderNumber}`, { token: otherCustomer })).status, 404);
    assert.equal((await api("GET", `/orders/${orderNumber}`, { token: lakshmi })).status, 404);

    const mine = await api("GET", "/orders/mine", { token: customer });
    assert.ok(mine.body.data.orders.some((o: { id: string }) => o.id === orderNumber));
    const sales = await api("GET", "/orders/seller", { token: ramulu });
    assert.ok(sales.body.data.orders.some((o: { id: string }) => o.id === orderNumber));
    assert.equal((await api("GET", "/orders", { token: customer })).status, 403);
    assert.equal((await api("GET", "/orders", { token: admin })).status, 200);
  });
});

describe("order status flow", () => {
  async function newOrder(items: { productId: string; quantity: number }[]) {
    const res = await api("POST", "/orders", { token: customer, body: { items, shippingAddress } });
    assert.equal(res.status, 201, res.body.message);
    return res.body.data.order.id as string;
  }
  const setStatus = (token: string, id: string, status: string) =>
    api("PATCH", `/orders/${id}/status`, { token, body: { status } });

  it("lets the customer cancel a pending order and restores stock once", async () => {
    const before = await stockOf(foxtail.id);
    const id = await newOrder([{ productId: foxtail.id, quantity: 3 }]);
    assert.equal(await stockOf(foxtail.id), before - 3);
    const [a, b] = await Promise.all([setStatus(customer, id, "cancelled"), setStatus(customer, id, "cancelled")]);
    const statuses = [a.status, b.status].sort();
    assert.equal(statuses[0], 200);
    assert.ok([400, 409].includes(statuses[1]), `second cancel rejected (got ${statuses[1]})`);
    assert.equal(await stockOf(foxtail.id), before, "stock restored exactly once");
  });

  it("lets the owning seller fulfil a single-seller order, then COD is marked paid", async () => {
    const id = await newOrder([{ productId: foxtail.id, quantity: 1 }]);
    assert.equal((await setStatus(lakshmi, id, "confirmed")).status, 404, "other seller can't see it");
    assert.equal((await setStatus(customer, id, "confirmed")).status, 403, "customer can't confirm");
    assert.equal((await setStatus(ramulu, id, "delivered")).status, 400, "can't skip steps");
    for (const status of ["confirmed", "packed", "out-for-delivery", "delivered"]) {
      const res = await setStatus(ramulu, id, status);
      assert.equal(res.status, 200, `${status}: ${res.body.message}`);
    }
    const order = (await api("GET", `/orders/${id}`, { token: customer })).body.data.order;
    assert.equal(order.paymentStatus, "paid");
    assert.ok(order.deliveredAt);
    assert.equal(order.statusHistory.length, 5);
    assert.equal((await setStatus(customer, id, "cancelled")).status, 400, "can't cancel after delivery");

    assert.equal((await setStatus(customer, id, "return-requested")).status, 200);
    assert.equal((await setStatus(ramulu, id, "returned")).status, 403, "only admins approve returns");
    const returned = await setStatus(admin, id, "returned");
    assert.equal(returned.body.data.order.paymentStatus, "refunded");
  });

  it("leaves mixed-seller orders to admins and hides other sellers' items", async () => {
    const id = await newOrder([
      { productId: foxtail.id, quantity: 1 },
      { productId: otherSellersProduct.id, quantity: 1 },
    ]);
    assert.equal((await setStatus(ramulu, id, "confirmed")).status, 403);
    assert.equal((await setStatus(admin, id, "confirmed")).status, 200);
    const sellerView = (await api("GET", `/orders/${id}`, { token: ramulu })).body.data.order;
    assert.equal(sellerView.items.length, 1);
    assert.equal(sellerView.partial, true);
  });
});

describe("coupon administration", () => {
  it("lets only admins create coupons, and validates them", async () => {
    const body = { code: "monsoon20", type: "percent", value: 20, maxDiscount: 100, description: "Monsoon sale" };
    assert.equal((await api("POST", "/coupons", { token: customer, body })).status, 403);
    const created = await api("POST", "/coupons", { token: admin, body });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.coupon.code, "MONSOON20");
    assert.equal((await api("POST", "/coupons", { token: admin, body })).status, 409);
    assert.equal((await api("POST", "/coupons", { token: admin, body: { ...body, code: "BAD150", value: 150 } })).status, 400);

    const qty = Math.ceil(1000 / foxtail.price);
    const quote = await api("POST", "/orders/quote", { body: { items: [{ productId: foxtail.id, quantity: qty }], couponCode: "MONSOON20" } });
    assert.equal(quote.body.data.discount, 100, "capped at maxDiscount");

    const id = created.body.data.coupon.id;
    await api("PATCH", `/coupons/${id}`, { token: admin, body: { active: false } });
    const publicList = await api("GET", "/coupons");
    assert.ok(!publicList.body.data.coupons.some((c: { code: string }) => c.code === "MONSOON20"));
  });
});

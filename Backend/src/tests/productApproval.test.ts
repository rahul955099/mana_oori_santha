import { api, startTestServer, stopTestServer } from "./setup";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { seedCatalog } from "../seed/seed";
import { runMigrations } from "../config/migrations";
import { Product } from "../models/Product";
import { Seller } from "../models/Seller";
import { User } from "../models/User";

const SELLER_PASSWORD = "seller-pass-123";
const OWNER = { email: "admin@test.local", password: "admin-pass-123" };
const ADMIN = { email: "helper@test.local", password: "helper-pass-123" };

let owner = "";
let admin = "";
let seller = "";
let customer = "";
let sellerId = "";

const productBody = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  category: "millets",
  description: "Fresh from the farm.",
  price: 100,
  mrp: 120,
  unit: "1 kg",
  stock: 5,
  image: "https://res.cloudinary.com/demo/image/upload/millet.jpg",
  ...extra,
});

const publicIds = async (search?: string) =>
  ((await api("GET", `/products?limit=500${search ? `&search=${encodeURIComponent(search)}` : ""}`)).body.data.products as { id: string }[]).map(
    (p) => p.id
  );

before(async () => {
  await startTestServer();
  await seedCatalog({ reset: true, adminEmail: OWNER.email, adminPassword: OWNER.password, sellerPassword: SELLER_PASSWORD });
  await User.create({ name: "Helper Admin", email: ADMIN.email, phone: "9000000001", password: ADMIN.password, role: "admin", emailVerified: true });
  owner = (await api("POST", "/auth/login", { body: OWNER })).body.data.token;
  admin = (await api("POST", "/auth/login", { body: ADMIN })).body.data.token;
  seller = (await api("POST", "/auth/login", { body: { email: "ramulu.farms@example.com", password: SELLER_PASSWORD } })).body.data.token;
  customer = (
    await api("POST", "/auth/register", { body: { name: "Anita", email: "anita@example.com", phone: "9876543210", password: "secret12" } })
  ).body.data.token;
  const ramuluUser = await User.findOne({ email: "ramulu.farms@example.com" });
  sellerId = (await Seller.findOne({ user: ramuluUser!._id }))!._id.toString();
});
after(stopTestServer);

describe("product approval", () => {
  let sellerProduct = { id: "", slug: "" };
  let adminProduct = { id: "", slug: "" };

  it("keeps the existing catalog live, including products from before approval existed", async () => {
    const millet = await api("GET", "/products/foxtail-millet");
    assert.equal(millet.status, 200);
    assert.equal(millet.body.data.product.approvalStatus, "approved");

    // A product saved before the field existed is approved by the startup migration.
    await Product.collection.updateOne({ slug: "foxtail-millet" }, { $unset: { approvalStatus: "" } });
    await runMigrations();
    assert.equal((await Product.findOne({ slug: "foxtail-millet" }))!.approvalStatus, "approved");
  });

  it("holds a seller's new product for review and hides it from customers", async () => {
    // A client can't approve its own product by sending the status.
    const res = await api("POST", "/products", { token: seller, body: productBody("Kodo Millet", { approvalStatus: "approved" }) });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.product.approvalStatus, "pending");
    sellerProduct = res.body.data.product;

    assert.ok(!(await publicIds()).includes(sellerProduct.id));
    assert.ok(!(await publicIds("Kodo")).includes(sellerProduct.id), "search doesn't leak it");
    assert.equal((await api("GET", `/products/${sellerProduct.slug}`)).status, 404, "anonymous");
    assert.equal((await api("GET", `/products/${sellerProduct.id}`, { token: customer })).status, 404, "customer");
    assert.equal((await api("GET", `/products/${sellerProduct.id}`, { token: seller })).status, 200, "its seller can preview it");

    const mine = (await api("GET", "/products/mine", { token: seller })).body.data.products as { id: string; approvalStatus: string }[];
    assert.equal(mine.find((p) => p.id === sellerProduct.id)?.approvalStatus, "pending");
  });

  it("can't be bought, carted or counted while pending", async () => {
    const quote = await api("POST", "/orders/quote", { body: { items: [{ productId: sellerProduct.id, quantity: 1 }] } });
    assert.equal(quote.body.data.problems[0].reason, "unavailable");
    const cart = await api("PUT", "/cart", { token: customer, body: { items: [{ productId: sellerProduct.id, quantity: 1 }] } });
    assert.deepEqual(cart.body.data.items, []);
    const before = (await api("GET", "/categories/millets")).body.data.category.productCount;
    assert.equal(before, await Product.countDocuments({ category: "millets", isActive: true, approvalStatus: "approved" }));
  });

  it("holds a normal admin's new product for review too", async () => {
    const res = await api("POST", "/products", { token: admin, body: productBody("Little Millet", { sellerId, nameTe: "సామలు" }) });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.product.approvalStatus, "pending");
    adminProduct = res.body.data.product;
    assert.ok(!(await publicIds()).includes(adminProduct.id));
  });

  it("publishes the owner's own products straight away", async () => {
    const res = await api("POST", "/products", { token: owner, body: productBody("Browntop Millet", { sellerId }) });
    assert.equal(res.body.data.product.approvalStatus, "approved");
    assert.ok((await publicIds()).includes(res.body.data.product.id));
  });

  it("lets only the site owner approve or reject", async () => {
    const path = `/products/${adminProduct.id}/approval`;
    assert.equal((await api("PATCH", path, { body: { decision: "approve" } })).status, 401, "anonymous");
    assert.equal((await api("PATCH", path, { token: customer, body: { decision: "approve" } })).status, 403, "customer");
    assert.equal((await api("PATCH", path, { token: seller, body: { decision: "approve" } })).status, 403, "seller");
    assert.equal((await api("PATCH", path, { token: admin, body: { decision: "approve" } })).status, 403, "normal admin, even for their own product");
    assert.equal((await Product.findById(adminProduct.id))!.approvalStatus, "pending");
  });

  it("shows admins the review queue with who submitted each product", async () => {
    assert.equal((await api("GET", "/products/manage", { token: customer })).status, 403);
    assert.equal((await api("GET", "/products/manage", { token: seller })).status, 403);
    assert.equal((await api("GET", "/products/manage?status=bogus", { token: owner })).status, 400);
    const queue = (await api("GET", "/products/manage?status=pending", { token: admin })).body.data.products as {
      id: string;
      nameTe: string;
      submittedBy: { name: string; role: string } | null;
    }[];
    assert.deepEqual(queue.map((p) => p.id).sort(), [sellerProduct.id, adminProduct.id].sort());
    const fromAdmin = queue.find((p) => p.id === adminProduct.id)!;
    assert.equal(fromAdmin.submittedBy?.name, "Helper Admin");
    assert.equal(fromAdmin.nameTe, "సామలు");
  });

  it("puts an approved product on sale", async () => {
    const res = await api("PATCH", `/products/${adminProduct.id}/approval`, { token: owner, body: { decision: "approve" } });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.product.approvalStatus, "approved");
    assert.ok((await publicIds()).includes(adminProduct.id));
    assert.equal((await api("GET", `/products/${adminProduct.slug}`)).status, 200);
    const quote = await api("POST", "/orders/quote", { body: { items: [{ productId: adminProduct.id, quantity: 1 }] } });
    assert.equal(quote.body.data.problems.length, 0);
  });

  it("needs a reason to reject, and keeps a rejected product hidden", async () => {
    const path = `/products/${sellerProduct.id}/approval`;
    assert.equal((await api("PATCH", path, { token: owner, body: { decision: "reject" } })).status, 400);
    assert.equal((await api("PATCH", path, { token: owner, body: { decision: "maybe" } })).status, 400);
    const res = await api("PATCH", path, { token: owner, body: { decision: "reject", reason: "Photo is blurry" } });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.product.approvalStatus, "rejected");
    assert.ok(!(await publicIds()).includes(sellerProduct.id));
    assert.equal((await api("GET", `/products/${sellerProduct.id}`)).status, 404);
    const mine = (await api("GET", "/products/mine", { token: seller })).body.data.products as { id: string; rejectionReason?: string }[];
    assert.equal(mine.find((p) => p.id === sellerProduct.id)?.rejectionReason, "Photo is blurry");
  });

  it("resubmits a rejected product when its seller edits it", async () => {
    const res = await api("PATCH", `/products/${sellerProduct.id}`, { token: seller, body: { image: "https://res.cloudinary.com/demo/image/upload/sharp.jpg" } });
    assert.equal(res.body.data.product.approvalStatus, "pending");
    assert.equal(res.body.data.product.rejectionReason, undefined);
  });

  it("sends content edits of a live product back for review, but not price or stock changes", async () => {
    const path = `/products/${adminProduct.id}`;
    const priced = await api("PATCH", path, { token: seller, body: { price: 90, stock: 9 } });
    assert.equal(priced.body.data.product.approvalStatus, "approved");

    const renamed = await api("PATCH", path, { token: admin, body: { nameTe: "సామ బియ్యం" } });
    assert.equal(renamed.body.data.product.approvalStatus, "pending");
    assert.ok(!(await publicIds()).includes(adminProduct.id));

    // A client can't skip the review by sending the status with its edit.
    const sneaky = await api("PATCH", path, { token: seller, body: { approvalStatus: "approved", description: "Even fresher." } });
    assert.equal(sneaky.body.data.product.approvalStatus, "pending");

    await api("PATCH", `${path}/approval`, { token: owner, body: { decision: "approve" } });
    const ownerEdit = await api("PATCH", path, { token: owner, body: { description: "Checked by the owner." } });
    assert.equal(ownerEdit.body.data.product.approvalStatus, "approved", "the owner's own edits stay live");
  });
});

describe("Telugu names", () => {
  it("stores Telugu text alongside the English name and finds products by it", async () => {
    const millet = (await api("GET", "/products/foxtail-millet")).body.data.product;
    assert.equal(millet.nameTe, "", "missing Telugu names come back empty, never null");

    const res = await api("PATCH", `/products/${millet.id}`, { token: owner, body: { nameTe: "  కొర్రలు  " } });
    assert.equal(res.body.data.product.nameTe, "కొర్రలు");
    assert.equal(res.body.data.product.name, millet.name, "the English name is kept");
    assert.ok((await publicIds("కొర్ర")).includes(millet.id));
    assert.ok((await publicIds("foxtail")).includes(millet.id), "English search still works");
  });

  it("limits the Telugu name's length", async () => {
    const millet = (await api("GET", "/products/foxtail-millet")).body.data.product;
    const res = await api("PATCH", `/products/${millet.id}`, { token: owner, body: { nameTe: "క".repeat(121) } });
    assert.equal(res.status, 400);
  });
});

describe("admin products by category", () => {
  type Managed = { id: string; category: string; approvalStatus: string };
  const manage = async (query: string) => (await api("GET", `/products/manage${query}`, { token: admin })).body.data.products as Managed[];

  it("lists exactly each category's products, in any review state, by category id", async () => {
    const categories = (await api("GET", "/categories?all=true", { token: admin })).body.data.categories as { id: string; slug: string }[];
    assert.ok(categories.length > 1);
    const everything = await manage("");
    assert.ok(everything.some((p) => p.approvalStatus !== "approved"), "the queue includes unapproved products");

    let seen = 0;
    for (const c of categories) {
      const listed = await manage(`?category=${c.id}`);
      assert.ok(listed.every((p) => p.category === c.slug), `only ${c.slug} products appear`);
      assert.deepEqual(
        listed.map((p) => p.id).sort(),
        everything.filter((p) => p.category === c.slug).map((p) => p.id).sort(),
        `every ${c.slug} product appears`
      );
      seen += listed.length;
    }
    assert.equal(seen, everything.length, "every product belongs to exactly one category's list");
  });

  it("combines the category with the review status", async () => {
    const millets = ((await api("GET", "/categories?all=true", { token: admin })).body.data.categories as { id: string; slug: string }[]).find(
      (c) => c.slug === "millets"
    )!;
    const pending = await manage(`?category=${millets.id}&status=pending`);
    assert.ok(pending.every((p) => p.category === "millets" && p.approvalStatus === "pending"));
  });

  it("rejects bad or unknown category ids and non-admins", async () => {
    assert.equal((await api("GET", "/products/manage?category=millets", { token: admin })).status, 400);
    assert.equal((await api("GET", "/products/manage?category=64b7f0c2a1b2c3d4e5f60718", { token: admin })).status, 404);
    const any = ((await api("GET", "/categories")).body.data.categories as { id: string }[])[0];
    assert.equal((await api("GET", `/products/manage?category=${any.id}`, { token: seller })).status, 403);
  });
});

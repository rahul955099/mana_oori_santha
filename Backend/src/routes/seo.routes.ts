import { Router } from "express";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { Seller } from "../models/Seller";
import { env } from "../config/env";
import { esc } from "../services/emailTemplates";
import { sellableSellerIds } from "../services/sellerAccess.service";

/** Search-engine files built from the live catalog. In production the web
 * host forwards /sitemap.xml and /robots.txt on the site's domain to these. */
const router = Router();
const site = () => env.clientUrl.replace(/\/$/, "");

router.get("/sitemap.xml", async (_req, res) => {
  const sellable = await sellableSellerIds();
  const [products, categories, sellers] = await Promise.all([
    Product.find({ isActive: true, seller: { $in: sellable } }).select("slug updatedAt"),
    Category.find({ isActive: true }).select("slug updatedAt"),
    Seller.find({ _id: { $in: sellable } }).select("_id updatedAt"),
  ]);
  const url = (path: string, lastmod?: Date) =>
    `<url><loc>${esc(site() + path)}</loc>${lastmod ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : ""}</url>`;
  const urls = [
    url("/"),
    url("/products"),
    url("/sellers"),
    url("/about"),
    url("/contact"),
    url("/help"),
    ...categories.map((c) => url(`/category/${c.slug}`, c.updatedAt)),
    ...products.map((p) => url(`/products/${p.slug}`, p.updatedAt)),
    ...sellers.map((s) => url(`/sellers/${s._id}`, s.updatedAt)),
  ];
  res.type("application/xml").send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`
  );
});

router.get("/robots.txt", (_req, res) => {
  res
    .type("text/plain")
    .send(
      ["User-agent: *", "Disallow: /admin", "Disallow: /seller", "Disallow: /checkout", "Disallow: /orders", "Allow: /", "", `Sitemap: ${site()}/sitemap.xml`, ""].join("\n")
    );
});

export default router;

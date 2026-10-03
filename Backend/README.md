# Mana Oori Santha — Backend API

Express 5 + MongoDB (Mongoose) + JWT. All responses look like `{ success, message, data }`.

## Run it

```bash
npm install
cp .env.example .env     # fill in MONGODB_URI, JWT_SECRET and the SEED_* values
npm run seed             # load sample categories, sellers, products and the admin account
npm run dev              # http://localhost:5000
```

No MongoDB Atlas yet? `npm run dev:memory` starts the API on a throwaway in-memory
database, seeded with the sample catalog, and prints test logins. Data resets on restart.

`npm test` runs the API tests against an in-memory database.

## Endpoints

| Method | Path | Who |
|---|---|---|
| POST | `/api/auth/register` | public — always creates a customer |
| POST | `/api/auth/register/seller` | public — creates an unverified seller shop |
| POST | `/api/auth/login` | public |
| GET / PATCH / DELETE | `/api/auth/me` | logged in (DELETE deactivates the account) |
| PATCH | `/api/auth/me/password` | logged in |
| GET | `/api/categories` | public (`?all=true` includes hidden ones for admins) |
| POST / PATCH / DELETE | `/api/categories/:id` | admin |
| GET | `/api/products` | public — `search, category (comma list), seller, minPrice, maxPrice, organic, featured, inStock, sort (relevance, newest, price-low, price-high, rating), page, limit` |
| GET | `/api/products/:idOrSlug` | public |
| POST / PATCH / DELETE | `/api/products/:id` | the owning seller or an admin; only admins can set `isFeatured` |
| GET | `/api/products/mine` | seller — own products, including while awaiting approval |
| GET | `/api/sellers`, `/api/sellers/:id` | public — approved sellers (`?all=true` for admins: every status, KYC masked) |
| GET / PATCH | `/api/sellers/me` | seller — own shop with status and masked KYC |
| PUT | `/api/sellers/me/kyc` | seller — submit PAN and UPI / bank payout details |
| GET | `/api/sellers/me/earnings` | seller — sales, commission, payable balance, payouts |
| GET | `/api/sellers/:id/kyc`, `/api/sellers/:id/earnings` | admin — full KYC for review; seller's earnings |
| PATCH | `/api/sellers/:id/status` | admin — approve / reject / suspend (reason required to reject or suspend) |
| PATCH / DELETE | `/api/sellers/:id` | admin (verify badge, remove seller) |
| GET | `/api/payouts/balances` | admin — what each seller is owed |
| POST | `/api/payouts` | admin — record a payment made to a seller (up to their balance) |
| GET | `/api/products/:id/reviews` | public — published reviews; logged-in callers also get their own review and whether they may write one |
| PUT / DELETE | `/api/products/:id/reviews/mine` | logged in — write/edit/delete own review (needs a delivered order) |
| GET | `/api/reviews/mine` | logged in — own reviews across products |
| GET | `/api/reviews` | admin — all reviews (`?status=`, `?rating=`, `?search=`) |
| PATCH / DELETE | `/api/reviews/:reviewId` | admin — hide/publish (with private note) or delete |
| POST | `/api/support` | logged in — raise a request, optionally about one of your orders |
| GET | `/api/support/mine` | logged in — own requests with replies |
| GET | `/api/support` | admin — all requests (`?status=`, `?search=`) |
| GET | `/api/support/:ticketNumber` | owner or admin |
| POST | `/api/support/:ticketNumber/replies` | owner or admin |
| PATCH | `/api/support/:ticketNumber/status` | admin |
| GET / PATCH | `/api/admin/users`, `/api/admin/users/:id` | admin — customers with orders and spend; block/unblock |
| GET | `/api/admin/reports/summary` | admin — sales for `?from=&to=` (IST, default last 30 days) plus live counts |
| GET | `/api/admin/reports/orders.csv` | admin — one row per order item, spreadsheet-safe |
| POST | `/api/uploads/signature` | logged in — short-lived Cloudinary upload signature (`purpose`: product, seller, profile) |
| GET / PUT | `/api/cart` | logged in — PUT replaces the whole cart `{ items, couponCode }` |
| GET / PUT | `/api/wishlist` | logged in — PUT replaces `{ productIds }` |
| GET / POST | `/api/addresses` | logged in — address book; first address becomes the default |
| PATCH / DELETE | `/api/addresses/:id` | logged in |
| POST | `/api/addresses/:id/default` | logged in |
| GET | `/api/coupons` | public — active offers (`?all=true` for admins) |
| POST / PATCH / DELETE | `/api/coupons/:id` | admin |
| POST | `/api/orders/quote` | public — server price breakdown `{ items, couponCode }` → totals, coupon result, stock problems |
| POST | `/api/orders` | logged in — places a cash-on-delivery order |
| GET | `/api/orders/mine` | logged in — orders I placed |
| GET | `/api/orders/seller` | seller — orders containing my products (other sellers' items hidden) |
| GET | `/api/orders` | admin — all orders (`?status=`, `?search=`) |
| GET | `/api/orders/:orderNumber` | buyer, involved seller, or admin |
| PATCH | `/api/orders/:orderNumber/status` | see order rules below |

Deleting products, sellers or accounts is a soft delete (`isActive: false`), so order history stays intact.

## Order rules

- Prices, discounts and delivery are always calculated on the server; the client only sends product ids and quantities.
- Stock is reserved atomically when an order is placed, so the last unit can't be sold twice. Cancelling returns the stock.
- Delivery is ₹40 below ₹500 and free above (configurable in `.env`).
- Status flow: `pending → confirmed → packed → out-for-delivery → delivered`, plus `cancelled` and `return-requested → returned`.
  - Customers can cancel while `pending`/`confirmed` and request a return within 7 days of delivery.
  - A seller can move an order through fulfilment (or cancel it) when every item in it is theirs; mixed-seller orders are handled by an admin.
  - Admins can make any valid move, including approving or rejecting returns.
- Payment is cash on delivery: marked `paid` on delivery and `refunded` when a return is approved.

## Reviews and ratings

- Only customers with a delivered order of a product can review it, so every review is a verified purchase. One review per customer per product.
- Product and seller ratings are calculated only from published reviews (recomputed whenever a review changes, and in full at server start). Seed data no longer includes sample ratings.
- Admins can hide a review (it leaves the store and the rating; the author sees it marked as not shown) or delete it.

## Sellers, images and payouts

- New sellers start **pending**. They can set up their shop and add products, but nothing is shown or sold until an admin approves them, which requires PAN and payout (UPI or bank) details. Admins can also reject (the seller can fix and resubmit) or suspend (products hidden).
- PAN and bank account numbers are only ever shown masked, except in the admin KYC review.
- Images upload straight from the browser to Cloudinary using a signature from `/api/uploads/signature`. The signature locks the folder and file types; the API secret never leaves the server. Set the `CLOUDINARY_*` values in `.env`.
- Sellers earn their item prices minus `PLATFORM_COMMISSION_PERCENT` (default 5%, recorded on each order). Coupon discounts and delivery charges are the platform's. Earnings become payable once the order's return window closes; admins pay sellers outside the platform and record each payment with its UTR.

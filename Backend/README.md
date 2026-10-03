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
| GET | `/api/sellers`, `/api/sellers/:id` | public |
| GET / PATCH | `/api/sellers/me` | seller |
| PATCH / DELETE | `/api/sellers/:id` | admin (verify badge, remove seller) |
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

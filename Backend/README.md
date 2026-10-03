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

## Endpoints (Phase 1)

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

Deleting products, sellers or accounts is a soft delete (`isActive: false`), so order history stays intact.

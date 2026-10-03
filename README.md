# Mana Oori Santha

An online marketplace where local farmers sell millets, pulses, oils, dry fruits and
traditional foods directly to customers. Three kinds of users:

- **Customers** browse, order (cash on delivery), track orders, review products and get support.
- **Sellers** (farmers) apply, list products with photos, fulfil orders and see their earnings and payouts.
- **Admins** approve sellers, manage the catalogue, orders, coupons, reviews and support, pay sellers and see reports.

| Part | Folder | Built with | Hosted on |
|---|---|---|---|
| Website | `frontend/` | React, Vite, Tailwind | Vercel |
| API | `Backend/` | Node.js, Express, MongoDB (Mongoose) | Render |
| Database | — | MongoDB Atlas | Atlas (Mumbai) |
| Images | — | Cloudinary | Cloudinary |
| Email | — | Brevo SMTP | Brevo |

API details (every endpoint, order rules, payouts) are in [Backend/README.md](Backend/README.md).

---

## 1. Run it on your computer

Needs Node.js 20 or newer.

```bash
cd Backend && npm install
cd ../frontend && npm install
```

**Quickest (no database needed):** start the API on a temporary in-memory database
filled with sample data. Everything resets when it stops, and no real email is sent.

```bash
cd Backend && npm run dev:memory     # API on http://localhost:5000, prints test logins
cd frontend && npm run dev           # website on http://localhost:5173
```

**With your real database:** fill in `Backend/.env` (see section 2), then

```bash
cd Backend && npm run seed           # once: categories, sample products, coupons, your admin login
cd Backend && npm run dev
cd frontend && npm run dev
```

Checks: `npm test` (Backend, 72 API tests) · `npm run build` and `npm run lint` (both folders).

---

## 2. Settings (`Backend/.env`)

Copy `Backend/.env.example` to `Backend/.env` and fill it in. **Never commit `.env` or
paste its values anywhere public** — it holds passwords and keys.

| Setting | What it is |
|---|---|
| `MONGODB_URI` | Database address from Atlas (section 3) |
| `JWT_SECRET` | Long random text that signs logins — generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLIENT_URL` | Website address(es), comma-separated. First one is used in email links |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Your admin login, created by `npm run seed` |
| `SEED_SELLER_PASSWORD` | Password for the sample seller accounts |
| `CLOUDINARY_*` | Image uploads (Cloudinary → Settings → API Keys) |
| `SMTP_*`, `MAIL_FROM` | Email (Brevo → SMTP & API). Test with `npm run mail:test -- you@example.com` |
| `DELIVERY_CHARGE`, `FREE_DELIVERY_ABOVE`, `RETURN_WINDOW_DAYS`, `SERVICEABLE_PINCODE_PREFIXES`, `PLATFORM_COMMISSION_PERCENT` | Shop rules (optional) |

Website settings (`frontend/.env`, see `frontend/.env.example`): `VITE_API_URL` (the API address),
`VITE_SUPPORT_PHONE`, `VITE_SUPPORT_EMAIL`, and `VITE_SOCIAL_*` links for the footer icons.

---

## 3. Create the database (MongoDB Atlas)

1. Sign up at [mongodb.com/atlas](https://www.mongodb.com/atlas) (free).
2. **Create a cluster** → choose **M0 Free**, provider **AWS**, region **Mumbai (ap-south-1)** → Create.
3. **Database Access** → Add New Database User → username + a strong password (save it) → role
   "Read and write to any database".
4. **Network Access** → Add IP Address → **Allow access from anywhere (0.0.0.0/0)**.
   Render's free servers don't have a fixed address, so this is required; the database is still
   protected by the username and password.
5. **Database → Connect → Drivers** → copy the connection string. It looks like
   `mongodb+srv://USER:<password>@cluster0.xxxxx.mongodb.net/?...`
6. In `Backend/.env`, set `MONGODB_URI` to it, replacing `<password>` with your password and adding the
   database name after `.net/`: `...mongodb.net/mana-oori-santha?retryWrites=true&w=majority`
7. Fill in `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` and `SEED_SELLER_PASSWORD`, then run
   `npm run seed` in `Backend/`.

> The free plan has **no automatic backups**. Before taking real orders, upgrade to a paid tier
> (from about $9/month, includes backups) or export the data regularly.

---

## 4. Put it online

Push this branch to GitHub first. Then:

### API on Render

1. Sign up at [render.com](https://render.com) with your GitHub account.
2. **New → Blueprint** → choose this repository. Render reads [`render.yaml`](render.yaml) and creates
   the `mana-oori-santha-api` service (region Singapore, the closest to India).
3. It asks for the secret settings: `MONGODB_URI`, `CLIENT_URL` (fill in after the website is
   deployed; use `http://localhost:5173` for now), `CLOUDINARY_*`, `SMTP_USER`, `SMTP_PASS`,
   `MAIL_FROM` — the same values as your `.env`. `JWT_SECRET` is generated automatically.
4. When it's live, open `https://<your-api>.onrender.com/api/health` — it should say the API is running.

The free plan sleeps after 15 minutes without visitors; the next visit then waits about 50 seconds.
The **Starter** plan (~$7/month) stays awake — recommended once customers use the site.

### Website on Vercel

1. Sign up at [vercel.com](https://vercel.com) with your GitHub account.
2. **Add New → Project** → import this repository → set **Root Directory** to `frontend`
   (Vercel detects Vite).
3. Add the environment variable `VITE_API_URL` = `https://<your-api>.onrender.com/api`.
4. Deploy. If your API address differs from `mana-oori-santha-api.onrender.com`, update the two
   addresses in [`frontend/vercel.json`](frontend/vercel.json) (they serve `/sitemap.xml` and `/robots.txt`).

### Connect them

1. In Render, set `CLIENT_URL` to your website address, e.g. `https://manaoorisantha.vercel.app`
   (add your own domain too, comma-separated, if you connect one). Render restarts the API.
2. Open the website, log in with your admin email and password, and check: products load, an
   image upload works, and an order email arrives.

### Your own domain (optional)

Buy a domain (e.g. `manaoorisantha.in`), add it in Vercel → Project → Domains, and follow its DNS
steps. Then add it to `CLIENT_URL` on Render, and in Brevo add the domain as a sender so emails come
from it and don't land in spam.

---

## 5. After going live

- **Search engines:** submit `https://<your-site>/sitemap.xml` in [Google Search Console](https://search.google.com/search-console).
- **Sample data:** the seed adds four sample sellers with `@example.com` emails and their products.
  Remove or replace them from **Admin → Farmers/Sellers** before real customers arrive.
- **Admin password:** after the first login you can change it in the profile; remove
  `SEED_ADMIN_PASSWORD` from `.env` once the admin exists.
- **Email limits:** Brevo's free plan sends 300 emails a day.
- **Payments:** cash on delivery only. Online payments (e.g. Razorpay) can be added later.

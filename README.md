# Ghorer Bazar · e-commerce for Bangladesh

A complete, white-label online store for Bangladeshi shops. Cash on delivery, bKash / Nagad / Rocket, SSLCommerz, courier tracking for all 64 districts, printable invoices, automatic e-mails, live chat, pop-ups and a full admin panel. The storefront uses a frosted-glass design that the owner can restyle from the admin panel without touching code.

| | |
|---|---|
| **Storefront + admin** | Next.js 14 (App Router) · React 18 · `frontend/` |
| **API** | Node.js 18+ · Express 4 · Mongoose 8 · `backend/` |
| **Database** | MongoDB (Atlas or self-hosted) |

🆕 **[NEW_FEATURES_BN.md](NEW_FEATURES_BN.md)**: landing pages, COD advance, staff roles, SEO, tracking, blog, product importer (Bangla) · 📘 **[USER_GUIDE.md](USER_GUIDE.md)**: how the shop owner runs the store · 🚀 **[DEPLOYMENT.md](DEPLOYMENT.md)**: put it on a server (Vercel / Render / VPS / cPanel)

---

## Highlights

### Customer experience
- Categories (carousel / grid / pills), live search suggestions, filters (category, colour, price, stock, sale), sorting
- **Product options**: colours with swatches and sizes, each with price, stock and image; gallery with thumbnails, arrows and hover zoom; specification table
- Card actions: **Add to bag**, **Buy now** (opens quick checkout right on the page), **Quick view**, **Wishlist**, **Compare** (up to 4 products)
- Cart drawer with free-delivery progress, guest or account checkout, saved addresses, coupons, 64-district picker
- Reviews with star ratings and verified-buyer badge, recently viewed, order tracking timeline, printable invoice, cancel while pending
- Promotional **pop-ups**, scrolling **offer ticker**, floating **WhatsApp / Messenger** buttons, **tawk.to / Crisp** live chat

### Payments and delivery
- Cash on delivery (auto-paid on delivery) · **SSLCommerz** (cards, bKash, Nagad, Rocket, Upay, net banking) · **bKash** tokenized checkout · manual **Send Money** with transaction ID verification
- Delivery zones and fees, free-delivery threshold
- **Steadfast** API booking; manual tracking for Pathao, RedX, Paperfly, eCourier, Sundarban, SA Paribahan, Karatoa, Janani and own riders

### Admin panel (`/admin`)
| Section | What you can do |
|---|---|
| Dashboard | Revenue & orders charts with period comparison, top products, sales by category / district / payment method, low stock |
| Orders | Search, filters, status workflow, payment verification, courier booking, **return / refund / reopen**, notes, history, invoice |
| Products | Full editor (images, colour/size options, specs), quick price/stock edits, categories, **CSV import** |
| Customers · Coupons | Spend and orders, roles · percent/flat coupons, limits, expiry, show in top bar |
| Content | Top bar (one line / ticker / off), hero text and buttons, trust badges, promo banner, section titles, newsletter text |
| Pop-ups | Layouts, coupon code, trigger (delay / scroll / exit), frequency, pages, audience, schedule |
| Appearance | 12 themes (incl. dark), accent colour, shapes, blur, 8 hero layouts, 4 header styles, 6 card styles, grid/carousel lists, category style, 4 footers |
| Shipping · Payments · E-mails · Store | Zones and fees, gateway switches, themed automatic e-mails with log, store details, GA4 / Meta Pixel, live chat |
| Data & backup | Excel/CSV exports, full backup, restore, daily server backups, admin activity log |

### Automatic e-mails (themed, with invoice)
Welcome · sign-in alert (optional) · order received · confirmed · shipped (tracking) · delivered · cancelled · returned · refunded · new-order alert to the owner. Invoices show the true state: **PAID / PAYMENT DUE / REFUNDED / RETURNED / CANCELLED**.

### Security
Helmet security headers, rate limits (sign-in, orders, API), NoSQL-injection filtering, bcrypt (cost 12) with password rules, JWT sessions, server-side pricing and atomic stock reservation, gateway-verified payments, CSV formula-injection protection, admin audit log, strict CORS and mandatory strong `JWT_SECRET` in production. Checklist in [DEPLOYMENT.md](DEPLOYMENT.md#6-security-checklist-go-live).

### SEO
Per-product titles, descriptions, Open Graph images and Product structured data; `sitemap.xml`; `robots.txt`.

---

## Quick start (local)

Requirements: **Node.js 18+**. MongoDB is optional locally: with an empty `MONGO_URI` an in-memory database is used (data resets on restart).

```bash
git clone <your-repo> ghorerbazar && cd ghorerbazar

# 1. API
cd backend
cp .env.example .env          # on Windows: copy .env.example .env
npm install
npm run seed                  # demo products, coupons and the first admin
npm run dev                   # → http://localhost:5001

# 2. Storefront (new terminal)
cd ../frontend
cp .env.example .env.local
npm install
npm run dev                   # → http://localhost:3000
```

Sign in at **/login** with mobile `01700000000` and the admin password printed by `npm run seed` (default `Admin12345`, or set `ADMIN_PASSWORD` in `backend/.env` first), then open **/admin**. **Change the password right away** (Account → Change password).

### Environment files
| File | Purpose |
|---|---|
| `backend/.env` | Database, secrets, SMTP, payment and courier keys. Every variable is explained in `backend/.env.example`. |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL` (backend URL ending in `/api`) and `NEXT_PUBLIC_SITE_URL` (public store URL for SEO) |

Never commit `.env` files or `backend/backups/`; both are in `.gitignore`.

### Backend commands
| Command | What it does |
|---|---|
| `npm run dev` / `npm start` | Run the API (watch mode / production) |
| `npm run seed` | Adds demo categories, products, coupons and the first admin. Safe to re-run. |
| `npm run make-admin -- 01XXXXXXXXX Pass1234` | Create an admin or reset an admin's password |
| `npm run backup` | Write a full JSON backup to `backend/backups/` |
| `npm run restore -- file.json --yes` | Replace the database with a backup (a safety copy is taken first) |

### Frontend commands
`npm run dev` (development) · `npm run build` then `npm start` (production)

---

## Project structure

```
backend/
  src/
    app.js, server.js, db.js        Express app, startup, MongoDB
    security.js                     Helmet, rate limits, input sanitising
    pricing.js                      Settings cache, delivery fee and coupon maths
    gateways.js                     SSLCommerz, bKash, Steadfast clients
    mailer.js                       SMTP + themed HTML e-mail templates
    backup.js, cli.js               Backup / restore
    models/index.js                 All Mongoose models + default content
    routes/                         auth, catalog, orders, payments, settings, extras (coupons, reviews, pop-ups), admin
frontend/
  app/                              Pages: home, shop, product, cart, checkout, orders, account, compare, wishlist, admin …
  components/                       Header, Hero (8 layouts), ProductCard, QuickView, CheckoutForm, PromoPopup, ChatWidgets …
  components/admin/                 Dashboard, Orders, Catalog, Content, Popups, Import, Data, StoreSettings …
  app/*.css                         Theme system (colour tokens, shapes, 12 themes, component styles)
```

## How to customise (developers)

- **Colours / themes**: tokens and theme blocks at the top of `frontend/app/globals.css` and `v3.css`; theme list in `frontend/lib/theme.js` and `backend/src/routes/settings.js`.
- **Add a hero layout**: add a component in `frontend/components/Hero.js`, register it in `HEROES` (`lib/theme.js`) and in the `OPTIONS.hero` list in `backend/src/routes/settings.js`.
- **Default texts**: `DEFAULT_CONTENT` in `backend/src/models/index.js`.
- **Delivery districts → zones**: `frontend/lib/bd.js`.

## Troubleshooting

| Problem | Fix |
|---|---|
| `Failed to fetch` in the browser | The API is not running or `NEXT_PUBLIC_API_URL` is wrong; open `<api>/health` |
| `querySrv ECONNREFUSED` when connecting to Atlas | Your network blocks SRV DNS lookups; the API already retries with public DNS. If it persists, use Atlas's *standard* (non-SRV) connection string |
| Atlas connection times out | Atlas → Network Access must allow your IP (or `0.0.0.0/0` while testing) |
| Locked out of admin | `npm run make-admin -- <phone> <new password>` |
| Product page shows old data | Hard-refresh; the storefront never caches API responses |

---

**Selling this project to a client?** Hand over the repository (without `.env` files) plus [DEPLOYMENT.md](DEPLOYMENT.md) and [USER_GUIDE.md](USER_GUIDE.md). Each client creates their own MongoDB, SMTP, payment and courier accounts and configures everything in the admin panel.

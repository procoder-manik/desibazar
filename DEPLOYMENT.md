# Deployment guide

The project has two apps that are deployed separately and talk over HTTPS:

```
customer browser ──► frontend (Next.js)  e.g. https://shop.com
                       │
                       ▼
                     backend (Express API)  e.g. https://api.shop.com/api
                       │
                       ▼
                     MongoDB Atlas
```

Pick one of the recipes below. **Recipe A** is the easiest and free to start.

---

## 0. Before you start (all recipes)

1. **Database: MongoDB Atlas** (free M0 tier is fine to start)
   1. Create an account at mongodb.com/atlas → *Create cluster* → M0, region **Mumbai (ap-south-1)** or Singapore (closest to Bangladesh).
   2. *Database Access* → add a user with a long random password.
   3. *Network Access* → add `0.0.0.0/0` (or your server's IP for extra safety).
   4. *Connect → Drivers* → copy the connection string, put your password in it and add a database name:
      `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/ghorerbazar?retryWrites=true&w=majority`
2. **JWT secret**: run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` and keep the output.
3. **Domain** (optional but recommended): e.g. `shop.com` for the store and `api.shop.com` for the API.

---

## Recipe A: Vercel (frontend) + Render (backend)

### A1. Backend on Render
1. Push the project to a GitHub repository (private is fine).
2. render.com → *New* → *Web Service* → pick the repo.
   - **Root directory**: `backend`
   - **Build command**: `npm install`
   - **Start command**: `npm start`
   - **Instance type**: Starter or above (the free tier sleeps after inactivity, which makes the first request slow).
3. *Environment* → add the variables from `backend/.env.example`. At minimum:
   ```
   NODE_ENV=production
   MONGO_URI=<your Atlas string>
   JWT_SECRET=<your secret>
   CLIENT_URL=https://shop.com           # your Vercel / custom domain
   API_URL=https://api.shop.com          # this Render service's URL (without /api)
   TRUST_PROXY=1
   ADMIN_PASSWORD=<first admin password>
   ```
4. Deploy. Open `https://<render-url>/api/health` → you should see `{"ok":true}`.
5. Render → *Shell* (or locally with the same `MONGO_URI`): `npm run seed` once to create the admin, categories and demo products. Delete demo products later from the admin panel.
6. Backups: Render's disk is temporary, so use **Admin → Data & backup → Download full backup** regularly (or a cron job, see §5).

### A2. Frontend on Vercel
1. vercel.com → *Add New Project* → pick the repo.
   - **Root directory**: `frontend`
   - Framework: Next.js (auto-detected)
2. *Environment Variables*:
   ```
   NEXT_PUBLIC_API_URL=https://api.shop.com/api
   NEXT_PUBLIC_SITE_URL=https://shop.com
   ```
3. Deploy, then add your domain under *Settings → Domains*.
4. Back on Render, make sure `CLIENT_URL` exactly matches the Vercel/custom domain (with `https://`, no trailing slash). Redeploy the backend.

**Cloudflare (frontend):** the same two variables must be set in *Workers & Pages → Settings → Variables and Secrets* and the site must be rebuilt afterwards (`NEXT_PUBLIC_*` values are baked in at build time). The production build now stops with a clear error if `NEXT_PUBLIC_API_URL` is missing, instead of silently calling `localhost` and showing "Failed to fetch".

Railway, Fly.io or DigitalOcean App Platform work the same way as Render (root `backend`, start `npm start`, same variables).

---

## Recipe B: one VPS (Hostinger VPS, DigitalOcean, AWS Lightsail, Contabo…)

Ubuntu 22.04+, 1 GB RAM minimum (2 GB recommended).

```bash
# 1. Node.js 20, Nginx, PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx
sudo npm i -g pm2

# 2. Code
git clone <your repo> /var/www/ghorerbazar && cd /var/www/ghorerbazar

# 3. API
cd backend && npm ci --omit=dev
cp .env.example .env && nano .env      # NODE_ENV=production, MONGO_URI, JWT_SECRET, CLIENT_URL, API_URL, TRUST_PROXY=1 ...
npm run seed
pm2 start src/server.js --name gb-api

# 4. Storefront
cd ../frontend && npm ci
cp .env.example .env.local && nano .env.local   # NEXT_PUBLIC_API_URL=https://api.shop.com/api, NEXT_PUBLIC_SITE_URL=https://shop.com
npm run build
pm2 start npm --name gb-web -- start

pm2 save && pm2 startup                 # restart both after a reboot
```

Nginx (`/etc/nginx/sites-available/ghorerbazar`, then `ln -s` it into `sites-enabled` and `sudo nginx -t && sudo systemctl reload nginx`):

```nginx
server {
  server_name shop.com www.shop.com;
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
}
server {
  server_name api.shop.com;
  client_max_body_size 60m;   # allows restoring large backups
  location / { proxy_pass http://127.0.0.1:5001; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
}
```

Free HTTPS: `sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d shop.com -d www.shop.com -d api.shop.com`.

On a VPS the automatic daily backup in `backend/backups/` persists. Copy it off the server too (§5).

**Updating later:** `git pull`, then `cd backend && npm ci --omit=dev && pm2 restart gb-api`, `cd ../frontend && npm ci && npm run build && pm2 restart gb-web`.

---

## Recipe C: Hostinger / cPanel shared hosting with "Node.js App"

Shared hosting can run the API if the plan has *Setup Node.js App* (Hostinger Business/Cloud, many cPanel hosts).
1. Create a Node.js app: Node 18+, application root `backend`, startup file `src/server.js`.
2. Add the environment variables from `backend/.env.example` in the panel; run *NPM install*; start the app.
3. Point a subdomain such as `api.shop.com` at the app.
4. Host the **frontend on Vercel** (Recipe A2). Next.js needs a Node server, which most shared plans can't keep running reliably.

---

## 1. Payments

**SSLCommerz** (cards + all mobile wallets)
1. Get sandbox credentials at developer.sslcommerz.com and test end to end.
2. Apply for a live merchant account (trade licence, bank details). SSLCommerz will ask for your website URL and callback URLs:
   - Success / Fail / Cancel: `https://api.shop.com/api/payments/sslcommerz/return`
   - IPN: `https://api.shop.com/api/payments/sslcommerz/ipn`
3. Set `SSLCZ_STORE_ID`, `SSLCZ_STORE_PASSWD`, `SSLCZ_SANDBOX=false`, restart the API. Turn it on in **Admin → Payments**.

**bKash direct checkout**: apply for a bKash merchant (PGW) account, then set the four `BKASH_*` values and `BKASH_SANDBOX=false`. Callback: `https://api.shop.com/api/payments/bkash/callback`.

**Send Money (no merchant account needed)**: Admin → Payments → enter your bKash / Nagad / Rocket numbers. Verify each payment from Orders.

## 2. Couriers
Steadfast: merchant panel → API → copy keys into `STEADFAST_API_KEY` / `STEADFAST_SECRET_KEY`. Orders then get a *Book with Steadfast* button. Other couriers: book in their panel and paste the consignment ID and tracking link on the order.

## 3. E-mail
Any SMTP account works. For Gmail: turn on 2-step verification → *App passwords* → create one → `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=you@gmail.com`, `SMTP_PASS=<app password>`. For higher volume use Brevo, Zoho Mail, Mailgun or your host's mailbox. Send a test from **Admin → E-mails**.

## 4. Analytics & ads
Admin → Store & tracking → paste your **GA4 ID** (`G-…`) and **Meta Pixel ID**. Page views, product views, add-to-cart and checkout events are sent automatically.

## 5. Backups and disaster recovery
- **Admin → Data & backup → Download full backup** saves everything (products, orders, customers, settings) as one JSON file. Do this at least weekly and keep copies in Google Drive / e-mail.
- On a VPS the API also writes a daily backup to `backend/backups/` (last 14 kept).
- Automatic off-site copy (VPS): add a cron job, e.g. `0 3 * * * cd /var/www/ghorerbazar/backend && npm run backup` plus `rclone copy backups remote:gb-backups`.
- MongoDB Atlas paid tiers also have built-in point-in-time backups.
- **Recover a hacked or broken site**: deploy fresh code, set the same environment variables, then *Admin → Data & backup → Restore from file* (or `npm run restore -- backup.json --yes`). Afterwards change `JWT_SECRET` (signs everyone out), the admin password and the Atlas database password.

## 6. Security checklist (go-live)
- [ ] `NODE_ENV=production` and a 32+ character random `JWT_SECRET` (the API refuses to start without it).
- [ ] `CLIENT_URL` set to your real domain only; `TRUST_PROXY=1` behind a proxy.
- [ ] HTTPS on both domains (Vercel/Render do this automatically; certbot on a VPS).
- [ ] Changed the seeded admin password; one admin account per person (roles in Admin → Customers).
- [ ] Atlas: strong DB password; network access limited to your server IP if it has a static one.
- [ ] Payment gateways in live mode only after a successful sandbox test.
- [ ] Backups downloaded and stored outside the server.
- [ ] Keep dependencies updated: `npm audit` and `npm update` monthly.
- [ ] Review **Admin → Data & backup → Admin activity log** from time to time.

## 7. Handing the project to a buyer
1. Give them the repository (without `.env` files or the `backups/` folder; both are git-ignored).
2. They create their own Atlas database, payment, courier and SMTP accounts and fill in `.env` from the examples.
3. They follow one recipe above, run `npm run seed`, sign in, then set the store name, logo text, colours and content in the admin panel. No code changes needed.

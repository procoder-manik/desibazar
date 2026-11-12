# Store owner's guide

Everything about running the store day to day. No coding needed. Open **`https://your-store.com/admin`** after signing in with your admin account.

> Tip: the admin menu on the left has four groups: **Sales**, **Catalog**, **Storefront** and **Settings**. Most changes are live the moment you press *Save* or *Publish*.

---

## 1. Your first hour

1. **Store details**: Admin → *Store & tracking* → name, tagline, phone, e-mail, address. These appear in the header, footer, invoices and e-mails.
2. **Colours**: Admin → *Appearance*: pick a theme, a custom accent colour if you want, shape, header, card and hero styles. Everything previews live; press *Save changes*.
3. **Delivery**: Admin → *Shipping* → set your zones and fees, and the free-delivery amount.
4. **Payments**: Admin → *Payments* → switch methods on or off and enter your bKash / Nagad / Rocket numbers for Send Money.
5. **E-mail**: Admin → *E-mails* → check it says *SMTP connected* and press **Send test**.
6. **Products**: delete the demo products and add your own (section 3), or import many at once from a spreadsheet.

---

## 2. Orders

**Admin → Orders.** Search by customer name, phone, order number (`#A1B2C3`) or courier ID. Filter by status or payment. Click any order to open its panel.

**Status flow:** Pending → Confirmed → Processing → Shipped → Delivered. Customers get an e-mail with their invoice at *order received*, *confirmed*, *shipped*, *delivered*, *cancelled*, *returned* and *refunded*.

- **Cash on delivery** orders become **Paid** automatically when you mark them *Delivered*.
- **Manual Send Money** (bKash/Nagad/Rocket): the order arrives as *Awaiting verification* with the sender number and transaction ID. Check it in your wallet, then press **Verify payment & confirm**.
- **SSLCommerz / bKash**: paid orders are confirmed automatically after the gateway confirms the payment.

### Returns, refunds and taking them back
- **Cancel / return**: choose *Cancelled* or *Returned*. Stock goes back to the shelf automatically.
- **Refund**: on a *Paid* order, enter the amount and press **Refund & mark returned**. The invoice then shows a **REFUNDED** stamp and the refunded amount, and the customer gets a refund e-mail.
- **Changed your mind?** Click the old status again (for example *Delivered*). The order is reopened, stock is taken again and you can set payment back to *Paid*. Every step is saved in the order history, so you always know what happened.
- Invoice stamps follow the real situation: **PAID**, **PAYMENT DUE**, **REFUNDED**, **RETURNED** or **CANCELLED**.

### Shipping a parcel
1. Open the order. Under **Shipping & courier**:
   - **Steadfast** (if connected): press *Book with Steadfast*. The consignment ID and tracking link are saved and the order becomes *Shipped*.
   - **Other couriers** (Pathao, RedX, Paperfly, eCourier, Sundarban, SA Paribahan, Karatoa, Janani, own rider): book in their panel, then choose the courier here and paste the consignment ID (and optional tracking link). Save.
2. The customer sees the tracking button on their order page and in the e-mail.

### Invoices
Press **Print invoice** in the order panel (or the customer presses *Invoice* on their order page) → *Print / Save as PDF*.

---

## 3. Products

**Admin → Products.**

- **New product**: press *+ New product*. Fill name, category, price, stock. Add images (paste image links), a description and specification rows.
- **Colours and sizes**: in *Options: colour & size* press *Add option*. Give each option a colour (with swatch), size, its own price and stock. Customers must choose an option before buying; the product page changes image and price as they choose.
- **Quick edits**: change price, sale price, stock or *Featured* directly in the table and press *Save*.
- **Featured** products appear in *Best sellers* and in the home page **hero slider**.
- **Hide** a product without deleting it: Edit → untick *Visible in shop*.
- **Categories** are managed at the bottom of the Products page (rename, add a picture, delete).

### Import many products from a spreadsheet
Admin → **Data & backup → Import products from CSV**. Press *Sample file*, fill it in Excel or Google Sheets, save as CSV and upload it. Rows with the same *name* become one product with colour/size options. Existing products with the same name are updated.

> **Images:** use photos you own or have permission to use. Upload them to any image host (Cloudinary, ImgBB, your own site) and paste the links.

### Coupons
Admin → **Coupons**. Percent or flat discount, minimum order, maximum discount, usage limit and expiry. Switch on **In top bar** to advertise a coupon in the announcement bar automatically.

---

## 4. Changing what the site says

**Admin → Content** edits the words on the home page: top bar, hero headline, paragraph and buttons, trust badges, the promo banner (the *Limited time* section), section titles and the footer newsletter text. A live preview updates as you type; press **Publish** to make it public.

- **Top bar**: *One line*, a *Scrolling ticker* that moves right to left, or *Hidden*. Add one message per line. Tick *show live offers automatically* to include free-delivery and coupon offers.
- **Trust badges** (free delivery, secure payment…): switch the whole row off with the toggle.
- **Promo banner**: edit the label, title, text, button and link, or hide it.

### Pop-ups
**Admin → Pop-ups → New pop-up.** Choose a layout (image + text, centered card, corner card or bottom bar), the text, an optional coupon code with a copy button, the button, and when to show it:
- **Trigger**: after a delay, after scrolling, or exit intent (desktop).
- **How often**: once per visitor, once a day, once per visit or every page view.
- **Pages / audience**: everywhere or only home / shop / product pages; everyone, signed-out visitors or members.
- **Schedule**: start and end date, plus priority when several are active.

To test a pop-up yourself, open the store in a private window (a visitor sees each pop-up according to its frequency rule).

### Look and feel
**Admin → Appearance** controls: 12 colour themes (including a dark one), custom accent colour, round / soft / sharp shapes, glass blur, **8 hero layouts**, **4 header styles**, **6 product-card styles**, home product lists as grid or **carousel**, category section as **carousel / grid / pills**, and **4 footer styles**.

---

## 5. Customers and marketing

- **Customers**: spend, orders, contact details. You can promote a trusted person to *admin* (use sparingly).
- **Live chat**: Admin → *Store & tracking* → *Live chat*. Choose **tawk.to** (free) and paste your Property ID, or Crisp. You can also switch on floating **WhatsApp** and **Messenger** buttons.
- **Tracking**: add your Google Analytics 4 ID and Meta Pixel ID in the same place.
- **E-mails**: Admin → *E-mails* lets you switch each automatic e-mail on or off, set the address that receives *new order* alerts, and see a log of what was sent.

---

## 6. Reports, exports and backups

- **Dashboard**: choose 7 days / 30 days / 90 days / 12 months. See revenue and orders against the previous period, top products, sales by category and district, payment methods, low stock.
- **Excel / CSV exports** (Admin → Data & backup): all orders, order items, **daily sales**, customers, products & stock, subscribers. Pick a date range if you like. The files open directly in Excel.
- **Backups**: *Download full backup* saves everything (products, orders, customers, settings, pop-ups) in one file. Do it weekly and keep the file in Google Drive. The server also keeps a daily automatic backup.
- **Restore**: *Restore from file* replaces everything with a backup. A safety copy of the current data is saved first. If the site is ever damaged, deploy it again and restore the latest backup.
- **Activity log**: shows who changed what in the admin panel.

---

## 7. Quick answers

| Question | Answer |
|---|---|
| A customer says they paid by bKash but the order shows unpaid | Check the sender number and transaction ID in the order panel, then *Verify payment* |
| I sold something offline | Reduce the stock in Products → the table |
| How do I give a one-off discount? | Create a coupon with a usage limit of 1 |
| I forgot my admin password | On the server: `npm run make-admin -- 01XXXXXXXXX NewPassword1` |
| Emails are not sending | Admin → E-mails: check *SMTP connected* and the log for the error text |
| A product does not show | Check *Visible in shop* and that stock is above 0 |
| How do I switch the site colour? | Admin → Appearance → pick a theme or accent colour |

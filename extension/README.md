# Product importer (Chrome extension)

Imports a product from any shop page into your store: name, price, sale price, description, every image, specification rows and options (Shopify).

## Install (once)
1. Open `chrome://extensions` and switch on **Developer mode** (top right).
2. Click **Load unpacked** and choose this `extension` folder.
3. Pin the extension (puzzle icon → pin).

## Connect
Click the icon and fill in:
- **Store API address**: the same value as `NEXT_PUBLIC_API_URL`, e.g. `https://api.yourshop.com/api`
- **Store website**: e.g. `https://yourshop.com`
- Mobile number and password of the owner or a staff member whose role has **Products**.

## Import
Open a product page on any website → click the icon → check the name, price (in taka), category and images → **Import to store**.
The product is saved hidden unless you tick *Show in the shop right away*, so you can review it in Admin → Products.

How it reads pages: Shopify product data, then schema.org (most WooCommerce, Shopify and big shops), then common shop markup, Open Graph tags and the biggest pictures on the page.

Notes
- Images stay on the original website's server. For anything long-term, upload them to your own image host and change the links.
- Only import products you have the right to sell and pictures you may use.

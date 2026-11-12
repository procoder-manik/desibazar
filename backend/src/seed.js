// Demo data. Safe to run again: it only adds categories, products and coupons that don't exist yet.
const bcrypt = require('bcryptjs');
const { User, Category, Product, Coupon } = require('./models');

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const img = (text, bg = 'f4ead5', fg = '6b4f1d') => `https://placehold.co/800x800/${bg}/${fg}/png?text=${encodeURIComponent(text).replace(/%0A/g, '%5Cn')}`; // placehold.co wants a literal "\n" for line breaks
const gallery = (name, bg, fg) => [img(name, bg, fg), img(`${name}\nDetail`, bg, fg), img(`${name}\nPack shot`, 'efede9', fg)];

const CATS = ['Honey', 'Dates', 'Nuts & Seeds', 'Ghee & Oil', 'Spices', 'Rice & Grains', 'Tea & Coffee', 'Kitchen & Gifts'];

// [name, category, description, unit, price, salePrice, stock, featured, details?, variants?]
const PRODUCTS = [
  ['Sundarban Khalisha Honey', 'Honey', 'Pure wild honey collected from Khalisha flowers in the Sundarbans. Raw, unheated and unfiltered.', '1 kg', 1200, 1050, 40, true,
    [['Origin', 'Sundarbans, Khulna'], ['Type', 'Raw, unheated'], ['Shelf life', '24 months']],
    [{ size: '250 g', price: 350, stock: 30 }, { size: '500 g', price: 650, salePrice: 590, stock: 25 }, { size: '1 kg', price: 1200, salePrice: 1050, stock: 40 }]],
  ['Mustard Flower Honey', 'Honey', 'Light, naturally sweet honey from mustard fields. Crystallises naturally in winter.', '1 kg', 650, null, 60, true, [['Origin', 'Sirajganj'], ['Type', 'Raw']]],
  ['Black Seed Honey', 'Honey', 'Honey from kalojira (black seed) blossoms, rich and slightly herbal.', '500 g', 850, 790, 35, false, [['Origin', 'Faridpur'], ['Type', 'Raw']]],
  ['Ajwa Dates', 'Dates', 'Premium soft Ajwa dates from Madinah.', '500 g', 1400, 1250, 30, true, [['Origin', 'Madinah, KSA'], ['Texture', 'Soft']]],
  ['Mabroom Dates', 'Dates', 'Rich, chewy Mabroom dates.', '1 kg', 1800, null, 25, false, [['Origin', 'KSA'], ['Texture', 'Chewy']]],
  ['Medjool Dates', 'Dates', 'Large, caramel-sweet Medjool dates.', '1 kg', 2200, 1990, 18, true, [['Origin', 'Jordan'], ['Texture', 'Soft, large']],
    [{ size: '500 g', price: 1150, stock: 20 }, { size: '1 kg', price: 2200, salePrice: 1990, stock: 18 }]],
  ['Almonds (Badam)', 'Nuts & Seeds', 'Crunchy California almonds.', '500 g', 850, 790, 50, true, [['Origin', 'California, USA']]],
  ['Cashew Nuts', 'Nuts & Seeds', 'Whole, unsalted cashews.', '500 g', 780, null, 45, false, [['Grade', 'W320']]],
  ['Chia Seeds', 'Nuts & Seeds', 'Organic chia seeds, high in fibre and omega-3.', '250 g', 320, null, 70, false, [['Certification', 'Organic']]],
  ['Pure Cow Ghee', 'Ghee & Oil', 'Traditional slow-cooked ghee from grass-fed cows.', '1 kg', 1100, 1000, 35, true, [['Method', 'Bilona, slow-cooked']],
    [{ size: '500 g', price: 580, stock: 30 }, { size: '1 kg', price: 1100, salePrice: 1000, stock: 35 }]],
  ['Cold Pressed Mustard Oil', 'Ghee & Oil', 'Kachi ghani mustard oil, pressed in a wooden ghani.', '1 L', 320, null, 80, false, [['Method', 'Wooden ghani']]],
  ['Turmeric Powder', 'Spices', 'Stone-ground turmeric with high curcumin.', '500 g', 280, null, 70, false, [['Origin', 'Bogura']]],
  ['Black Cumin (Kalo Jira)', 'Spices', 'Fresh and aromatic black cumin.', '250 g', 220, 199, 90, false, []],
  ['Chinigura Rice', 'Rice & Grains', 'Aromatic Bangladeshi fragrant rice.', '5 kg', 800, null, 100, true, [['Origin', 'Dinajpur']]],
  ['Sylhet Premium Tea', 'Tea & Coffee', 'Hand-picked Sylhet tea leaves.', '500 g', 450, 420, 55, false, [['Origin', 'Sylhet']]],
  // colour variants
  ['Ceramic Honey Jar', 'Kitchen & Gifts', 'Hand-glazed ceramic jar with wooden dipper. Holds 500 ml.', '500 ml', 950, null, 0, true,
    [['Material', 'Stoneware'], ['Capacity', '500 ml'], ['Care', 'Hand wash']],
    [{ color: 'Ivory', hex: '#efe9dc', price: 950, stock: 12 }, { color: 'Sage', hex: '#9fb59a', price: 950, stock: 9 }, { color: 'Terracotta', hex: '#c0704f', price: 990, stock: 6 }, { color: 'Midnight', hex: '#2b3440', price: 990, stock: 0 }]],
  ['Festive Gift Hamper', 'Kitchen & Gifts', 'A gift box of honey, dates, nuts and ghee. Perfect for Eid and weddings.', '1 box', 4500, 3990, 0, true,
    [['Includes', 'Honey 500 g, Ajwa 500 g, Almonds 250 g, Ghee 250 g'], ['Gift note', 'Free']],
    [{ color: 'Forest Green', hex: '#2f4a3a', price: 4500, salePrice: 3990, stock: 10 }, { color: 'Maroon', hex: '#7b2d3a', price: 4500, salePrice: 3990, stock: 8 }, { color: 'Gold', hex: '#c9a14a', price: 4800, salePrice: 4290, stock: 5 }]],
  ['Jute Market Tote', 'Kitchen & Gifts', 'Sturdy, reusable jute tote for your market runs.', '1 pc', 450, null, 0, false, [['Material', 'Jute'], ['Size', '40 × 35 cm']],
    [{ color: 'Natural', hex: '#cdb38a', price: 450, stock: 40 }, { color: 'Charcoal', hex: '#3b3b3b', price: 450, stock: 25 }, { color: 'Olive', hex: '#6b7342', price: 480, stock: 18 }]],
  ['Glass Spice Jar Set', 'Kitchen & Gifts', 'Set of 6 airtight glass jars with bamboo lids.', 'Set of 6', 1250, 1090, 0, false, [['Material', 'Glass, bamboo']],
    [{ color: 'Bamboo', hex: '#d8b98a', size: 'Set of 6', price: 1250, salePrice: 1090, stock: 15 }, { color: 'Black', hex: '#222222', size: 'Set of 6', price: 1350, stock: 10 }, { color: 'Bamboo', hex: '#d8b98a', size: 'Set of 12', price: 2300, salePrice: 1990, stock: 6 }]],
];

const swatch = (hex) => (hex || 'f4ead5').replace('#', '');
const dark = (hex) => { const h = swatch(hex); const n = parseInt(h, 16); return ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) < 140; };

async function run({ quiet } = {}) {
  const log = (...a) => !quiet && console.log(...a);
  if (!(await Coupon.countDocuments())) {
    await Coupon.create([
      { code: 'WELCOME10', type: 'percent', value: 10, minSubtotal: 500, maxDiscount: 300 },
      { code: 'FLAT100', type: 'flat', value: 100, minSubtotal: 1500 },
    ]);
    log('Added coupons WELCOME10, FLAT100');
  }
  const cats = {};
  for (const n of CATS) cats[n] = (await Category.findOne({ slug: slug(n) })) || (await Category.create({ name: n, slug: slug(n) }));

  let added = 0, upgraded = 0;
  for (const [name, cat, description, unit, price, salePrice, stock, featured, details = [], variants = []] of PRODUCTS) {
    const s = slug(name);
    const vs = variants.map((v) => ({
      ...v, label: [v.color, v.size].filter(Boolean).join(' / '),
      image: v.hex ? img(`${name}\n${v.color}`, swatch(v.hex), dark(v.hex) ? 'ffffff' : '333333') : undefined,
    }));
    const doc = {
      name, slug: s, category: cats[cat]._id, description, unit, price, salePrice: salePrice || undefined, featured,
      stock: vs.length ? vs.reduce((t, v) => t + v.stock, 0) : stock,
      image: vs[0]?.image || img(name), images: gallery(name).slice(1), details: details.map(([label, value]) => ({ label, value })), variants: vs,
    };
    const existing = await Product.findOne({ slug: s });
    if (!existing) { await Product.create(doc); added++; }
    else if (!existing.details?.length && !existing.variants?.length) {
      // older demo product: add gallery, specs and variants without touching price edits
      Object.assign(existing, { details: doc.details, images: existing.images?.length ? existing.images : doc.images, ...(vs.length && { variants: vs, stock: doc.stock }) });
      await existing.save(); upgraded++;
    }
  }
  log(`Products: ${added} added, ${upgraded} upgraded with gallery/specs/variants`);

  if (!(await User.findOne({ role: 'admin' }))) {
    if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_PASSWORD) {
      throw new Error('Set ADMIN_PASSWORD in the environment before seeding in production (the default password is public).');
    }
    const pw = process.env.ADMIN_PASSWORD || 'Admin12345';
    await User.create({ name: 'Admin', phone: '01700000000', role: 'admin', password: await bcrypt.hash(pw, 12) });
    log(`Admin created: 01700000000 / ${process.env.ADMIN_PASSWORD ? '(ADMIN_PASSWORD)' : pw}  -> change it after signing in`);
  }
}
module.exports = { run };

if (require.main === module) {
  require('dotenv').config();
  require('./db').connect().then(() => run()).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}

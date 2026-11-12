const mongoose = require('mongoose');
const { Schema } = mongoose;

// SEO fields shared by products, categories, blog posts and landing pages. Empty fields fall back to sensible defaults.
const seoSchema = new Schema({
    title: { type: String, maxlength: 120 }, description: { type: String, maxlength: 320 },
    keywords: { type: String, maxlength: 300 }, image: String, canonical: String, noindex: { type: Boolean, default: false },
  }, { _id: false });

// Staff roles: a named set of admin-panel permissions (see PERMISSIONS in middleware/auth.js).
const Role = mongoose.model('Role', new Schema({
  name: { type: String, required: true, trim: true, unique: true, maxlength: 60 },
  description: { type: String, maxlength: 200 },
  permissions: [String],
}, { timestamps: true }));

const User = mongoose.model('User', new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  phone: { type: String, required: true, unique: true },
  email: { type: String, trim: true, lowercase: true, maxlength: 120 },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'staff', 'admin'], default: 'customer' }, // admin = owner (everything)
  staffRole: { type: Schema.Types.ObjectId, ref: 'Role' },                          // permissions for role "staff"
  active: { type: Boolean, default: true },
  address: String,
  area: { type: String, default: 'inside' },
  lastLoginAt: Date,
}, { timestamps: true }));

const Category = mongoose.model('Category', new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  image: String,
  description: String,
  seo: seoSchema,
}));

// A variant is one buyable option of a product (a colour, a size, or both) with its own price and stock.
const variantSchema = new Schema({
  label: { type: String, required: true, trim: true }, // e.g. "Sage / 500 ml"
  color: String,   // colour name, e.g. "Sage"
  hex: String,     // swatch colour, e.g. "#9fb59a"
  size: String,    // e.g. "500 ml", "1 kg"
  price: { type: Number, min: 0 },
  salePrice: { type: Number, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  image: String,
  sku: String,
});

const Product = mongoose.model('Product', new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  image: String,
  images: [String],
  description: String,
  details: [{ label: String, value: String }], // spec rows, also used by Compare
  unit: { type: String, default: '1 kg' },
  price: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, min: 0 },
  stock: { type: Number, default: 0, min: 0 }, // for products with variants this is the sum of variant stock
  variants: [variantSchema],
  featured: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  rating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  sold: { type: Number, default: 0 },
  seo: seoSchema,
  sourceUrl: String, // where the product was imported from (Chrome extension)
}, { timestamps: true }));

const reviewSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: String,
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 1000 },
  verified: { type: Boolean, default: false },
}, { timestamps: true });
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
const Review = mongoose.model('Review', reviewSchema);

const Coupon = mongoose.model('Coupon', new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['percent', 'flat'], required: true },
  value: { type: Number, required: true, min: 0 },
  minSubtotal: { type: Number, default: 0 },
  maxDiscount: Number,
  usageLimit: Number,
  used: { type: Number, default: 0 },
  expiresAt: Date,
  active: { type: Boolean, default: true },
  showInBar: { type: Boolean, default: false }, // advertise in the scrolling top bar
}, { timestamps: true }));

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
const PAYMENT_METHODS = ['cod', 'sslcommerz', 'bkash', 'manual_bkash', 'manual_nagad', 'manual_rocket'];

const Order = mongoose.model('Order', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  accessKey: { type: String, index: true }, // lets guests open their own order / invoice
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    variant: Schema.Types.ObjectId,
    variantLabel: String,
    name: String, price: Number, qty: Number, image: String, unit: String,
  }],
  shipping: {
    name: String, phone: String, email: String, address: String, district: String,
    zone: String, zoneName: String,
    area: String, // legacy ('inside' | 'outside')
    note: String,
  },
  paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'cod' },
  payment: {
    status: { type: String, enum: ['unpaid', 'submitted', 'paid', 'failed', 'refunded'], default: 'unpaid' },
    trxId: String, sender: String, gatewayRef: String, amount: Number, paidAt: Date,
    refundAmount: Number, refundedAt: Date,
  },
  courier: { name: String, consignmentId: String, trackingCode: String, trackingUrl: String, status: String, bookedAt: Date },
  // Cash on delivery with the delivery charge (or a fixed amount) paid in advance.
  advance: {
    required: { type: Boolean, default: false },
    amount: { type: Number, default: 0 },
    status: { type: String, enum: ['unpaid', 'submitted', 'paid', 'failed'], default: 'unpaid' },
    method: String, trxId: String, sender: String, gatewayRef: String, paidAt: Date,
  },
  // Where the order came from: a landing page, a blog post, and the ad campaign (UTM tags).
  source: {
    kind: { type: String, enum: ['store', 'landing', 'quick'], default: 'store' },
    landing: { type: Schema.Types.ObjectId, ref: 'LandingPage', index: true },
    landingSlug: String,
    utm: { source: String, medium: String, campaign: String, content: String, term: String },
    referrer: String, fbclid: String, gclid: String,
  },
  coupon: String,
  subtotal: Number,
  discount: { type: Number, default: 0 },
  deliveryFee: Number,
  total: Number,
  status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
  history: [{ status: String, note: String, at: { type: Date, default: Date.now } }],
  adminNote: String,
}, { timestamps: true }));

// Blog posts. Each post can target products: they are shown as cards in and below the article,
// and the product page links back to the posts that target it.
const Post = mongoose.model('Post', new Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  slug: { type: String, required: true, unique: true },
  excerpt: { type: String, maxlength: 400 },
  content: { type: String, default: '' },        // Markdown; [product:slug] inserts a product card
  cover: String,
  author: String,
  tags: [String],
  products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  publishedAt: Date,
  seo: seoSchema,
  views: { type: Number, default: 0 },
}, { timestamps: true }));

// Sales landing pages with a one-page checkout (like CartFlows). Sections are an ordered list of blocks.
const landingProduct = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variant: Schema.Types.ObjectId,        // lock to one option, or leave empty to let the buyer choose
  label: String,                          // e.g. "Himsagar mango · 5 kg"
  badge: String,                          // e.g. "Best value"
  price: { type: Number, min: 0 },        // special price on this page (optional)
  qty: { type: Number, default: 1, min: 1 },
  selected: { type: Boolean, default: false },
}, { _id: true });
const LandingPage = mongoose.model('LandingPage', new Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  slug: { type: String, required: true, unique: true },
  status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  accent: String,                         // optional colour for this page only
  header: { type: String, enum: ['minimal', 'store', 'none'], default: 'minimal' },
  sections: { type: [Schema.Types.Mixed], default: [] },
  products: [landingProduct],
  checkout: {
    mode: { type: String, enum: ['multi', 'single'], default: 'multi' }, // multi = tick any, single = choose one
    title: { type: String, default: 'Fill in the form to order' },
    button: { type: String, default: 'Confirm order' },
    allowQty: { type: Boolean, default: true },
    coupon: { type: Boolean, default: true },
    note: String,                          // text above the form, e.g. advance delivery charge policy
    freeDelivery: { type: Boolean, default: false },
    thankYou: String,
    lang: { type: String, enum: ['bn', 'en'], default: 'bn' }, // language of the order form labels
  },
  seo: seoSchema,
  views: { type: Number, default: 0 },
}, { timestamps: true, minimize: false }));

// Incomplete checkouts: the customer typed a valid phone number but did not place the order.
const Lead = mongoose.model('Lead', new Schema({
  key: { type: String, index: true, unique: true },     // browser session id, so one visitor = one lead
  name: String, phone: { type: String, index: true }, address: String, district: String,
  items: [{ product: { type: Schema.Types.ObjectId, ref: 'Product' }, name: String, qty: Number, price: Number, variantLabel: String }],
  total: Number,
  source: { type: String, default: 'store' }, landing: { type: Schema.Types.ObjectId, ref: 'LandingPage' }, landingSlug: String,
  status: { type: String, enum: ['open', 'called', 'converted', 'lost'], default: 'open', index: true },
  note: String,
  order: { type: Schema.Types.ObjectId, ref: 'Order' },
}, { timestamps: true }));

const Subscriber = mongoose.model('Subscriber', new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
}, { timestamps: true }));

// Every e-mail the store tries to send, so admins can see what went out (or why it failed).
const EmailLog = mongoose.model('EmailLog', new Schema({
  to: String, subject: String, event: String,
  status: { type: String, enum: ['sent', 'failed', 'skipped'] },
  error: String,
  order: { type: Schema.Types.ObjectId, ref: 'Order' },
}, { timestamps: true }));

// Who changed what in the admin panel.
const AuditLog = mongoose.model('AuditLog', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  userName: String, method: String, path: String, ip: String, status: Number,
}, { timestamps: true }));

// Promotional pop-ups managed from Admin → Pop-ups.
const Popup = mongoose.model('Popup', new Schema({
  name: { type: String, required: true, trim: true },           // internal name
  active: { type: Boolean, default: true },
  layout: { type: String, enum: ['center', 'split', 'corner', 'bar'], default: 'split' },
  eyebrow: String, title: { type: String, required: true }, text: String, image: String,
  code: String,                                                  // coupon code shown with a copy button
  ctaLabel: String, ctaLink: String,
  trigger: { type: String, enum: ['delay', 'scroll', 'exit'], default: 'delay' },
  delay: { type: Number, default: 4, min: 0, max: 120 },         // seconds, for "delay"
  frequency: { type: String, enum: ['once', 'daily', 'session', 'always'], default: 'daily' },
  pages: { type: String, enum: ['all', 'home', 'shop', 'product'], default: 'all' },
  audience: { type: String, enum: ['all', 'guests', 'members'], default: 'all' },
  startsAt: Date, endsAt: Date,
  priority: { type: Number, default: 0 },
}, { timestamps: true }));

const DEFAULT_CONTENT = {
  // top bar: "static" shows one line, "ticker" scrolls every message right-to-left, "off" hides it
  bar: { mode: 'static', messages: [], autoOffers: true },
  perksEnabled: true,
  announcement: 'Free delivery on orders over ৳3,000 · Delivery across all 64 districts · Cash on delivery',
  hero: {
    eyebrow: 'New season harvest',
    title: 'Pure food,',
    titleEm: 'honestly sourced.',
    text: 'Raw honey, premium dates, slow-cooked ghee and stone-ground spices from trusted farms, delivered to all 64 districts.',
    cta1Label: 'Shop the collection', cta1Link: '/shop',
    cta2Label: 'View offers', cta2Link: '/shop?sale=true',
    proof: '4.8/5 from happy households across Bangladesh',
    image: '',
  },
  perks: [
    { title: 'Free delivery', text: 'On orders over ৳3,000' },
    { title: 'Secure payment', text: 'COD, bKash, Nagad, cards' },
    { title: '100% pure', text: 'Lab-checked sourcing' },
    { title: 'Easy returns', text: 'Within 7 days' },
  ],
  sections: { categories: 'Shop by category', best: 'Best sellers', fresh: 'New arrivals' },
  promo: {
    enabled: true, eyebrow: 'Limited time', title: 'Seasonal savings on pantry staples',
    text: 'Use code FLAT100 for ৳100 off orders over ৳1,500.', code: 'FLAT100',
    ctaLabel: 'Shop the sale', ctaLink: '/shop?sale=true',
  },
  newsletter: { title: 'Get 10% off your first order', text: 'Seasonal harvests, restocks and members-only offers. No spam.' },
};

const Settings = mongoose.model('Settings', new Schema({
  key: { type: String, default: 'store', unique: true },
  store: {
    name: { type: String, default: 'Ghorer Bazar' },
    tagline: { type: String, default: 'Pure food, honestly sourced' },
    phone: { type: String, default: '+880 1700-000000' },
    email: { type: String, default: 'hello@example.com' },
    address: { type: String, default: 'Dhaka, Bangladesh' },
    logo: String,
  },
  appearance: {
    theme: { type: String, default: 'sage' },
    accent: { type: String, default: '' },
    shape: { type: String, default: 'round' },
    hero: { type: String, default: 'split' },
    header: { type: String, default: 'floating' }, // floating | classic | centered | bar
    card: { type: String, default: 'glass' },      // glass | minimal | overlay | elevated
    listing: { type: String, default: 'grid' },    // grid | carousel (home sections)
    categories: { type: String, default: 'carousel' }, // carousel | grid | pills
    footer: { type: String, default: 'classic' },  // classic | minimal | dark | centered
    glass: { type: Number, default: 24 },
    floatingCart: { type: Boolean, default: true }, // bag button fixed on the right edge
  },
  content: { type: Schema.Types.Mixed, default: () => JSON.parse(JSON.stringify(DEFAULT_CONTENT)) },
  shipping: {
    freeOver: { type: Number, default: 3000 },
    zones: {
      type: [{ key: String, name: String, fee: Number, eta: String, active: { type: Boolean, default: true } }],
      default: [
        { key: 'dhaka', name: 'Inside Dhaka city', fee: 60, eta: '1-2 days' },
        { key: 'suburb', name: 'Dhaka suburbs (Savar, Gazipur, Narayanganj, Keraniganj)', fee: 100, eta: '2-3 days' },
        { key: 'outside', name: 'Outside Dhaka', fee: 120, eta: '2-4 days' },
      ],
    },
  },
  // Store-wide SEO. pages.<key> overrides the title / description / image of one storefront page.
  seo: {
    title: { type: String, default: '' },          // home page title; empty = "<store name> - <tagline>"
    titleTemplate: { type: String, default: '' },  // e.g. "%s | Desi Bazar"; empty = "%s · <store name>"
    description: { type: String, default: '' },
    keywords: { type: String, default: '' },
    image: { type: String, default: '' },          // default social sharing image
    pages: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  payments: {
    codAdvance: {
      enabled: { type: Boolean, default: false },
      type: { type: String, enum: ['delivery', 'fixed'], default: 'delivery' },
      amount: { type: Number, default: 0, min: 0 },
      note: { type: String, default: '' },
    },
    cod: { type: Boolean, default: true },
    sslcommerz: { type: Boolean, default: true },
    bkash: { type: Boolean, default: true },
    manual: { type: Boolean, default: true },
    manualNumbers: { bkash: { type: String, default: '' }, nagad: { type: String, default: '' }, rocket: { type: String, default: '' } },
  },
  emails: {
    welcome: { type: Boolean, default: true },
    login: { type: Boolean, default: false },
    orderPlaced: { type: Boolean, default: true },
    confirmed: { type: Boolean, default: true },
    shipped: { type: Boolean, default: true },
    delivered: { type: Boolean, default: true },
    cancelled: { type: Boolean, default: true },
    returned: { type: Boolean, default: true },
    refunded: { type: Boolean, default: true },
    adminNewOrder: { type: Boolean, default: true },
    adminEmail: { type: String, default: '' },
  },
  integrations: {
    gaId: { type: String, default: '' },        // Google Analytics 4, e.g. G-XXXXXXX
    fbPixelId: { type: String, default: '' },   // Meta pixel id
    fbCapiToken: { type: String, default: '' }, // Meta Conversions API access token (server-side Purchase)
    fbTestCode: { type: String, default: '' },  // Meta "Test events" code while testing
    gtmId: { type: String, default: '' },       // Google Tag Manager, e.g. GTM-XXXXXXX
    adsId: { type: String, default: '' },       // Google Ads conversion id, e.g. AW-123456789
    adsLabel: { type: String, default: '' },    // Google Ads purchase conversion label
    tiktokPixelId: { type: String, default: '' },
    clarityId: { type: String, default: '' },   // Microsoft Clarity heatmaps
    gscVerification: { type: String, default: '' },  // Google Search Console HTML tag content
    bingVerification: { type: String, default: '' },
    fbDomainVerification: { type: String, default: '' },
    headScripts: { type: String, default: '' }, // any other tag the owner wants in <head> (owner only)
    chat: { type: String, default: 'none' },    // none | tawk | crisp | tidio | reve
    tidioKey: { type: String, default: '' },
    reveId: { type: String, default: '' },      // REVE Chat account id
    tawkProperty: { type: String, default: '' },
    tawkWidget: { type: String, default: 'default' },
    crispId: { type: String, default: '' },
    whatsapp: { type: String, default: '' },    // floating WhatsApp button, e.g. 8801711000000
    messenger: { type: String, default: '' },   // Facebook page username for m.me link
  },
  backups: { auto: { type: Boolean, default: true }, lastAt: Date },
}, { timestamps: true, minimize: false }));

module.exports = {
  User, Role, Category, Product, Review, Coupon, Order, Subscriber, Settings, EmailLog, AuditLog, Popup, Post, LandingPage, Lead,
  ORDER_STATUSES, PAYMENT_METHODS, DEFAULT_CONTENT,
};

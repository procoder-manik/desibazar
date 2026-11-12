const mongoose = require('mongoose');
const { Schema } = mongoose;

const User = mongoose.model('User', new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  phone: { type: String, required: true, unique: true },
  email: { type: String, trim: true, lowercase: true, maxlength: 120 },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  address: String,
  area: { type: String, default: 'inside' },
  lastLoginAt: Date,
}, { timestamps: true }));

const Category = mongoose.model('Category', new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  image: String,
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
  coupon: String,
  subtotal: Number,
  discount: { type: Number, default: 0 },
  deliveryFee: Number,
  total: Number,
  status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
  history: [{ status: String, note: String, at: { type: Date, default: Date.now } }],
  adminNote: String,
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
  payments: {
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
    chat: { type: String, default: 'none' },    // none | tawk | crisp
    tawkProperty: { type: String, default: '' },
    tawkWidget: { type: String, default: 'default' },
    crispId: { type: String, default: '' },
    whatsapp: { type: String, default: '' },    // floating WhatsApp button, e.g. 8801711000000
    messenger: { type: String, default: '' },   // Facebook page username for m.me link
  },
  backups: { auto: { type: Boolean, default: true }, lastAt: Date },
}, { timestamps: true, minimize: false }));

module.exports = {
  User, Category, Product, Review, Coupon, Order, Subscriber, Settings, EmailLog, AuditLog, Popup,
  ORDER_STATUSES, PAYMENT_METHODS, DEFAULT_CONTENT,
};

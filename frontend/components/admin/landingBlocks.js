// Landing page blocks: the fields the editor shows for each block type, and ready-made page templates.
// Field: [key, kind, label, options]. kinds: text, textarea, markdown, image, lines, select, bool, datetime, list (sub-fields in options).
export const BLOCKS = {
  hero: { label: 'Hero (top banner)', hint: 'Headline, picture and the first Order button', fields: [
    ['eyebrow', 'text', 'Small label above the headline'], ['title', 'text', 'Headline'], ['subtitle', 'textarea', 'Sub-headline'],
    ['image', 'image', 'Image (empty = first product photo)'], ['cta', 'text', 'Button text'],
    ['layout', 'select', 'Layout', [['split', 'Text + image'], ['center', 'Centered']]], ['bg', 'select', 'Background', [['light', 'Light'], ['accent', 'Accent colour'], ['image', 'Image behind text']]],
    ['showPrice', 'bool', 'Show the price of the first product'], ['badges', 'lines', 'Badges (one per line), e.g. ১০০% ফরমালিন মুক্ত'],
  ] },
  gallery: { label: 'Photo gallery', hint: 'Grid or slider of product photos', fields: [
    ['title', 'text', 'Title'], ['images', 'lines', 'Image links (one per line)'], ['style', 'select', 'Style', [['grid', 'Grid'], ['slider', 'Slider']]],
    ['columns', 'select', 'Columns', [['4', '4'], ['3', '3'], ['2', '2']]], ['cta', 'text', 'Button under it (optional)'],
  ] },
  video: { label: 'YouTube video', hint: 'Paste a YouTube link', fields: [['title', 'text', 'Title'], ['url', 'text', 'YouTube link'], ['caption', 'text', 'Caption'], ['cta', 'text', 'Button under it (optional)']] },
  text: { label: 'Text & image', hint: 'Benefits, story, nutrition…', fields: [
    ['title', 'text', 'Title'], ['body', 'markdown', 'Text (**bold**, - lists, ## headings)'], ['image', 'image', 'Image (optional)'],
    ['imagePos', 'select', 'Image side', [['right', 'Right'], ['left', 'Left']]], ['cta', 'text', 'Button (optional)'],
  ] },
  checklist: { label: 'Checklist', hint: 'Why buy from us, product details', fields: [
    ['title', 'text', 'Title'], ['items', 'lines', 'Points (one per line)'], ['icon', 'select', 'Icon', [['check', '✓ Tick'], ['star', '★ Star'], ['arrow', '➜ Arrow'], ['cross', '✕ Cross']]], ['cta', 'text', 'Button (optional)'],
  ] },
  features: { label: 'Feature cards', hint: 'e.g. Why we are the best', fields: [
    ['title', 'text', 'Title'], ['items', 'list', 'Cards', [['icon', 'text', 'Emoji / icon'], ['title', 'text', 'Card title'], ['text', 'textarea', 'Card text']]],
  ] },
  testimonials: { label: 'Customer reviews', hint: 'Text reviews or review screenshots', fields: [
    ['title', 'text', 'Title'], ['items', 'list', 'Reviews', [['name', 'text', 'Name'], ['text', 'textarea', 'Review'], ['image', 'image', 'Photo / screenshot (optional)'], ['rating', 'select', 'Stars', [['5', '5'], ['4', '4'], ['', 'none']]]]],
  ] },
  faq: { label: 'Questions & answers', hint: 'Common questions', fields: [['title', 'text', 'Title'], ['items', 'list', 'Questions', [['q', 'text', 'Question'], ['a', 'textarea', 'Answer']]]] },
  notice: { label: 'Notice box', hint: 'Delivery / advance policy', fields: [['text', 'textarea', 'Text'], ['tone', 'select', 'Style', [['accent', 'Accent (dashed)'], ['info', 'Info'], ['warning', 'Warning']]]] },
  cta: { label: 'Call to action banner', hint: 'Big banner with Order button', fields: [['title', 'text', 'Title'], ['text', 'textarea', 'Text'], ['button', 'text', 'Button text'], ['image', 'image', 'Background image (optional)']] },
  image: { label: 'Single image', hint: 'Banner, offer graphic', fields: [['url', 'image', 'Image link'], ['alt', 'text', 'Description (for Google)'], ['link', 'text', 'Link (#order scrolls to the form)']] },
  countdown: { label: 'Countdown timer', hint: 'Offer ends in…', fields: [['title', 'text', 'Title'], ['endsAt', 'datetime', 'Ends at'], ['endedText', 'text', 'Text after it ends']] },
  trust: { label: 'Trust badges', hint: 'Cash on delivery, fast delivery…', fields: [['items', 'lines', 'Badges (one per line)']] },
  checkout: { label: 'Order form (checkout)', hint: 'Product selection + customer form', fields: [] },
};

export const newBlock = (type) => ({ id: `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, type, ...(BLOCKS[type].fields.some(([, k]) => k === 'list') ? { items: [] } : {}) });

const id = () => `s${Math.random().toString(36).slice(2, 9)}`;
const NOTICE = 'ঢাকার বাহিরে অর্ডার করলে ডেলিভারি চার্জ অগ্রিম পরিশোধ করে অর্ডার কনফার্ম করতে হবে। পণ্য হাতে পেয়ে বাকি টাকা পরিশোধ করবেন।';

export const TEMPLATES = {
  single: {
    label: 'Single product', desc: 'One product for a Facebook / Google ad: hero, photos, video, benefits, order form, reviews.',
    page: {
      checkout: { mode: 'single', title: 'ফর্মটি পূরণ করে অর্ডার করুন', button: 'অর্ডার কনফার্ম করুন', lang: 'bn', allowQty: true, coupon: true },
      sections: [
        { id: id(), type: 'hero', eyebrow: '১০০% ফ্রেশ ও ফরমালিনমুক্ত', title: 'একমাত্র আমরাই দিচ্ছি সুস্বাদু প্রোডাক্ট', subtitle: 'সরাসরি বাগান থেকে আপনার দরজায়। ক্যাশ অন ডেলিভারি।', cta: 'অর্ডার করুন', layout: 'split', bg: 'accent', showPrice: true, badges: 'ক্যাশ অন ডেলিভারি\nসারা দেশে ডেলিভারি' },
        { id: id(), type: 'gallery', title: 'আমাদের প্রোডাক্ট', images: '', style: 'grid', columns: '4' },
        { id: id(), type: 'video', title: 'পুষ্টিগুণ এবং উপকারিতা', url: '', cta: 'অর্ডার করুন' },
        { id: id(), type: 'checklist', title: 'কেন আমাদের থেকে নিবেন?', icon: 'check', items: '১০০% কেমিক্যাল ও ফরমালিন মুক্ত\nসরাসরি বাগান থেকে সংগ্রহ\nপ্রাকৃতিক মিষ্টি স্বাদ ও ঘ্রাণ\nডেলিভারির সময় চেক করে নেওয়ার সুবিধা', cta: 'অর্ডার করুন' },
        { id: id(), type: 'notice', text: NOTICE, tone: 'accent' },
        { id: id(), type: 'checkout' },
        { id: id(), type: 'testimonials', title: 'কাস্টমার রিভিউ', items: [] },
        { id: id(), type: 'faq', title: 'সাধারণ প্রশ্ন', items: [{ q: 'ডেলিভারি কত দিনে পাবো?', a: 'ঢাকার ভিতরে ১-২ দিন, ঢাকার বাহিরে ২-৪ দিন।' }, { q: 'পণ্য খারাপ হলে কী করবো?', a: 'ডেলিভারির সময় চেক করে নিবেন। সমস্যা থাকলে রাইডারকে ফেরত দিন, আমরা নতুন পাঠিয়ে দিবো।' }] },
      ],
    },
  },
  package: {
    label: 'Multi-product packages', desc: 'Several sizes or products; the buyer ticks one or more and orders in one form (like CartFlows).',
    page: {
      checkout: { mode: 'multi', title: 'ফর্মটি পূরণ করে অর্ডার করুন', button: 'অর্ডার করুন', lang: 'bn', allowQty: true, coupon: true },
      sections: [
        { id: id(), type: 'hero', title: 'বাগান থেকে ফ্রেশ প্রোডাক্ট ঘরে বসে পান!', subtitle: 'আপনার পছন্দের প্যাকেজ বেছে নিন, এক ক্লিকে অর্ডার করুন।', cta: 'অর্ডার করুন', layout: 'split', bg: 'accent' },
        { id: id(), type: 'gallery', title: '', images: '', style: 'slider' },
        { id: id(), type: 'video', title: 'উপকারিতা', url: '', cta: 'অর্ডার করুন' },
        { id: id(), type: 'checklist', title: 'কেন আমাদের প্রোডাক্ট নিবেন?', icon: 'check', items: '১০০% কেমিক্যাল মুক্ত ও টাটকা\nসরাসরি বাগান থেকে সংগ্রহ\nপ্রাকৃতিক মিষ্টি স্বাদ ও রসালো\nসুন্দর প্যাকেজিং ও দ্রুত ডেলিভারি' },
        { id: id(), type: 'checklist', title: 'প্রোডাক্ট ডিটেইলস', icon: 'arrow', items: 'জাত: \nওজন: \nউৎস: \nডেলিভারি: সারা বাংলাদেশে' },
        { id: id(), type: 'notice', text: NOTICE, tone: 'accent' },
        { id: id(), type: 'checkout' },
      ],
    },
  },
  story: {
    label: 'Long story page', desc: 'Detailed sales letter: why us, benefits, reviews, FAQ, gallery and a strong call to action.',
    page: {
      checkout: { mode: 'multi', title: 'অর্ডার করতে নিচের ফর্মটি পূরণ করুন', button: 'অর্ডার কনফার্ম করুন', lang: 'bn', allowQty: true, coupon: true },
      sections: [
        { id: id(), type: 'hero', title: 'ফরমালিন মুক্ত প্রোডাক্ট!', subtitle: 'কেন আমাদের থেকে কিনবেন, কীভাবে আমরা সংগ্রহ করি, সব জানুন।', cta: 'অর্ডার করুন', layout: 'center', bg: 'light' },
        { id: id(), type: 'features', title: 'কেন আমরাই সেরা', items: [{ icon: '🌿', title: 'অর্গানিক প্রোডাক্ট', text: 'কোনো কেমিক্যাল ছাড়াই প্রাকৃতিকভাবে উৎপাদিত।' }, { icon: '🏆', title: 'বিশ্বস্ততার প্রতীক', text: 'হাজারো সন্তুষ্ট কাস্টমার।' }, { icon: '🚚', title: 'দ্রুত ডেলিভারি', text: 'সারা দেশে ২-৪ দিনে।' }, { icon: '💵', title: 'ক্যাশ অন ডেলিভারি', text: 'পণ্য হাতে পেয়ে টাকা দিন।' }] },
        { id: id(), type: 'text', title: 'উপকারিতা ও পুষ্টিগুণ', body: '- রোগ প্রতিরোধ ক্ষমতা বাড়ায়\n- হজমে সহায়তা করে\n- ত্বক ও চোখের জন্য উপকারী', imagePos: 'right' },
        { id: id(), type: 'testimonials', title: 'কাস্টমার রিভিউ', items: [] },
        { id: id(), type: 'cta', title: 'রেগুলার অফার', text: 'সীমিত সময়ের জন্য বিশেষ মূল্যে।', button: 'অর্ডার করুন' },
        { id: id(), type: 'faq', title: 'নিচের প্রশ্নগুলোর উত্তর জেনে নিন', items: [] },
        { id: id(), type: 'gallery', title: 'গ্যালারি', images: '', style: 'grid', columns: '4' },
        { id: id(), type: 'notice', text: 'সাহায্য প্রয়োজন? যেকোনো প্রশ্নে আমাদের কল করুন।', tone: 'info' },
        { id: id(), type: 'checkout' },
      ],
    },
  },
  blank: { label: 'Blank', desc: 'Just a hero and the order form; add the blocks you want.', page: { checkout: { mode: 'multi', lang: 'bn' }, sections: [{ id: id(), type: 'hero', title: '', cta: 'অর্ডার করুন', layout: 'split', bg: 'light' }, { id: id(), type: 'checkout' }] } },
};

const copy = {
  ar: {
    nav: { how: "كيف يعمل", features: "المزايا", pricing: "الاشتراك", faq: "أسئلة شائعة", audience: "حلّ للمطاعم المستقلة", menu: "فتح القائمة", close: "إغلاق", startFree: "ابدأ مجانًا" },
    hero: { titleA: "منيو رقمي.", titleB: "وطلب أسهل.", description: "اعرض أطباقك وأسعارها في منيو يفتحه ضيوفك عبر رابط أو QR، ويتيح لهم إرسال طلباتهم بسهولة — بلا تطبيق أو عمولة. ابدأ بتجربة مجانية لمدة 7 أيام، بدون بطاقة، ثم 4.99 US$ شهريًا.", request: "تعرّف على Ordora", demo: "جرّب المنيو التجريبي مجانًا" },
    ticker: ["بدون عمولة على الطلبات", "لا يحتاج الضيف إلى تطبيق", "منيو بهوية مطعمك", "اشتراك شهري واضح"],
    story: { eyebrow: "من مطبخك إلى شاشة ضيفك", titleA: "منيو يحمل هويتك.", titleB: "وطلب أسهل لضيفك.", body: "اعرض أطباقك بصورها وأسعارها بوضوح، ليختار الضيف ما يحب ويراجع طلبه قبل إرساله. تجمع الصفحة المنيو والطلب في تجربة واحدة.", tag: "أطباقك، كما تحب أن يراها ضيوفك.", owner: "منيو رقمي على جهاز لوحي", note: "مصمم لصاحب المطعم وفريق الخدمة." },
    how: { eyebrow: "من الاختيار إلى الطلب", titleA: "ثلاث خطوات.", titleB: "وطلب يصل بوضوح.", body: "يمسح الضيف رمز QR، يتصفح المنيو ويضيف أطباقه إلى السلة، ثم يرسل ملخص الطلب لفريقك.", steps: [["يمسح", "رمز QR يفتح المنيو"], ["يختار", "يضيف أطباقه إلى السلة"], ["يرسل", "ملخص واضح للمطعم"]] },
    features: { eyebrow: "كل ما تحتاجه للبدء", titleA: "منيو يعرّف بمطعمك.", titleB: "وطلب أسهل.", aside: "كل ما يحتاجه ضيفك للاختيار، وفريقك لاستقبال الطلب بوضوح.", items: [
      ["منيو باسم مطعمك", "اعرض شعارك وألوانك وصور أطباقك في صفحة واحدة سهلة المشاركة.", "store"],
      ["رمز QR جاهز للمشاركة", "ضعه على الطاولات أو شاركه أونلاين؛ يفتح الضيف المنيو مباشرة.", "qr"],
      ["سلة طلب واضحة", "يختار الضيف أطباقه ويراجع الكميات والملاحظات قبل الإرسال.", "bag"],
      ["لوحة لمتابعة الطلبات", "تابع الطلبات والأطباق الأكثر اختيارًا من مكان واحد.", "chart"]
    ] },
    dashboard: { eyebrow: "كل طلب، بتفاصيله", titleA: "الطلب يصل", titleB: "جاهزًا للتحضير.", body: "يرتب Ordora الأصناف والكميات والملاحظات في ملخص واحد، ويعرض الطلبات في لوحة مطعمك لتعرف ما يحتاجه فريقك.", chips: ["ملخص واضح", "متابعة الطلبات", "الأكثر طلبًا"], label: "لوحة الطلبات", date: "معاينة لوحة المطعم", today: "طلبات اليوم", yesterday: "خلال هذا اليوم", top: "الأكثر طلبًا", item: "برجر سموكي", count: "١٨ طلب", fresh: "جديد", done: "مكتمل", orders: ["#1042  برجر سموكي × 2", "#1041  ليمون ونعناع × 1", "#1040  وجبة بَسْطة × 3"] },
    pricing: { eyebrow: "ببساطة", titleA: "خطة واحدة.", titleB: "سعر واضح.", body: "ابدأ بمنيو رقمي وسلة طلب ومتابعة للطلبات — تجربة مجانية لمدة 7 أيام، ثم اشتراك شهري واضح 4.99 US$ شهريًا، ومن دون عمولة على الطلبات.", label: "Ordora للمطاعم", month: "/ شهريًا", features: ["صفحة مطعم بهويتك", "رمز QR قابل للطباعة", "سلة طلب أونلاين", "ملخص جاهز لـ WhatsApp", "لوحة لمتابعة الطلبات", "بدون عمولة"], request: "ابدأ بمنيو مطعمك" },
    live: { eyebrow: "مطاعم حيّة على Ordora", title: "قوائم حقيقية، تعمل الآن.", viewAll: "عرض كل المطاعم", compare: "قارن Ordora مع MenuX" },
    faq: { eyebrow: "قبل أن تبدأ", title: "إجابات قبل الاشتراك.", items: [
      ["هل أحتاج إلى تطبيق خاص؟", "لا. يفتح Ordora في متصفح جوال الضيف مباشرة، من دون تحميل تطبيق أو إنشاء حساب."],
      ["هل يأخذ Ordora عمولة على الطلبات؟", "لا. الاشتراك الشهري ثابت، ولا توجد عمولة على طلبات مطعمك."],
      ["أين تصل الطلبات؟", "تظهر الطلبات في لوحة مطعمك، ويمكنك مشاركة ملخصها عبر WhatsApp."],
      ["هل يمكنني استخدام ألوان وهوية مطعمي؟", "نعم. الصفحة مصممة لتشبه مطعمك، من الاسم والألوان إلى صور الأصناف وطريقة عرضها."]
    ] },
    final: { titleA: "منيو يليق بمطعمك.", titleB: "وطلب أسهل لضيوفك.", body: "اعرض أطباقك بوضوح، وخلي ضيوفك يرسلون طلبهم بثقة.", request: "ابدأ بمنيو مطعمك" },
    footer: ["منيو رقمي وطلبات أونلاين", "مصممان لعمل المطاعم اليومي."],
    modal: {
      badge: "تواصل مع Ordora",
      choiceBadge: "ابدأ الآن",
      choiceTitleA: "كيف تحب",
      choiceTitleB: "أن تبدأ؟",
      choiceDescription: "ابدأ بتجربة مجانية الآن، أو اطلب اشتراكًا وسنتواصل معك لتفعيله.",
      freeTag: "تجربة مجانية",
      freeTitle: "ابدأ مجانًا",
      freeDesc: "أنشئ صفحتك وجرّب المنيو والطلبات. بدون بطاقة.",
      subscribeTag: "اشتراك شهري",
      subscribeTitle: "اشترك",
      subscribeDesc: "أرسل طلبًا وسنتواصل معك لتأكيد الخطة وتفعيلها.",
      choiceNote: "لا يوجد دفع الآن.",
      back: "رجوع إلى الخيارات",
      subscribeBadge: "طلب اشتراك",
      subscribeTitleA: "اطلب اشتراك",
      subscribeTitleB: "مطعمك.",
      subscribeDescription: "أرسل بياناتك وسنتواصل معك على واتساب لتأكيد الخطة.",
      subscribeNote: "لا يوجد دفع الآن. سنؤكد الخطة معك على واتساب قبل التفعيل.",
      subscribeTail: "سنتواصل معك على واتساب لتأكيد الاشتراك وتفعيله.",
      subscribeSubmit: "أرسل طلب الاشتراك",
      subscribeSuccess: "وصلنا طلب الاشتراك.",
      titleA: "أخبرنا عن",
      titleB: "مطعمك.",
      description: "أرسل بياناتك وسنتواصل معك على واتساب بخصوص صفحة مطعمك على Ordora.",
      name: "اسمك",
      namePlaceholder: "مثال: محمد",
      restaurant: "اسم المطعم",
      restaurantPlaceholder: "مثال: مطعم واحة",
      phone: "رقم واتساب",
      phonePlaceholder: "+970 59 123 4567",
      submit: "أرسل الطلب",
      sending: "جارٍ الإرسال…",
      error: "تعذّر إرسال الطلب. تحقق من الاتصال وحاول مجددًا.",
      note: "بدون التزام. سنستخدم رقمك للتواصل بشأن Ordora فقط.",
      success: "وصلنا طلبك.",
      thanks: "شكرًا",
      tail: "سنتواصل معك على واتساب قريبًا.",
      done: "تمام"
    },
    phone: { name: "ذا ريد بن", status: "مفتوح الآن", description: "برغر طازج على الفحم، وصوصاتنا الخاصة", location: "يافا، فلسطين", search: "ابحث عن طبقك المفضل", categories: ["الكل", "برغر", "جانبيات", "مشروبات"], featured: "الأكثر طلبًا", burger: "ريد بن الأصلي", burgerDesc: "جبنة شيدر، خس، طماطم وصوصنا الخاص", second: "سموكي هاوس", secondDesc: "برغر مدخن مع جبنة ذائبة", cart: "عرض السلة", count: "2 أصناف", button: "افتح المنيو الكامل" }
  },
  en: {
    nav: { how: "How it works", features: "Features", pricing: "Pricing", faq: "FAQ", audience: "For independent restaurants", menu: "Open menu", close: "Close", startFree: "Start for free" },
    hero: { titleA: "Digital menu.", titleB: "Simpler orders.", description: "Show your dishes and prices in one menu guests can open by link or QR, then send an order—no app download or commission. Start with a 7-day free trial, no card required, then 4.99 US$ per month.", request: "Talk to the Ordora team", demo: "Try the sample menu free" },
    ticker: ["No commission on orders", "No app for guests", "A menu in your brand", "One clear monthly price"],
    story: { eyebrow: "From your kitchen to their screen", titleA: "A menu in your brand.", titleB: "An easier order for guests.", body: "Show every dish with clear photos and prices. Guests can choose what they want and review the order before sending. Your menu and online ordering live in one simple page.", tag: "Your dishes, shown the way you want.", owner: "A digital menu on a tablet", note: "Made for owners and the people serving guests." },
    how: { eyebrow: "From browsing to ordering", titleA: "Three simple steps.", titleB: "One clear order.", body: "Guests scan a QR code, browse the menu, add dishes to their cart, then send an order summary straight to your team.", steps: [["Scan", "A QR code opens the menu"], ["Choose", "Add dishes to the cart"], ["Send", "A clear order summary"]] },
    features: { eyebrow: "Everything you need to start", titleA: "A menu for your brand.", titleB: "Ordering made easier.", aside: "Give guests what they need to choose, and your team what it needs to handle each order.", items: [
      ["Your restaurant, your menu", "Bring your logo, colors, and dish photos together in one easy-to-share page.", "store"],
      ["A QR code ready to share", "Place it on tables or share it online. Guests open your menu directly.", "qr"],
      ["A clear order cart", "Guests review their dishes, quantities, and notes before they send the order.", "bag"],
      ["One place to follow orders", "See incoming orders and your most popular dishes in one dashboard.", "chart"]
    ] },
    dashboard: { eyebrow: "Every order, in detail", titleA: "Orders arrive", titleB: "ready for your team.", body: "Ordora groups dishes, quantities, and notes into one clear summary, then shows incoming orders in your restaurant dashboard.", chips: ["Clear order summary", "Order tracking", "Popular dishes"], label: "Restaurant orders", date: "Dashboard preview", today: "Today’s orders", yesterday: "Since opening", top: "Most ordered", item: "Smoky burger", count: "18 orders", fresh: "New", done: "Complete", orders: ["#1042  Smoky burger × 2", "#1041  Lemon mint × 1", "#1040  Basta meal × 3"] },
    pricing: { eyebrow: "Simple", titleA: "One plan.", titleB: "One clear price.", body: "Get a branded menu, an online order cart, and a place to follow orders—7-day free trial, then one monthly price of 4.99 US$ and no order commissions.", label: "Ordora for restaurants", month: "/ month", features: ["Restaurant page in your brand", "Printable QR code", "Online order cart", "WhatsApp-ready summary", "Order dashboard", "No commission"], request: "Start your restaurant menu" },
    live: { eyebrow: "Live on Ordora", title: "Real menus, working now.", viewAll: "View all restaurants", compare: "Compare Ordora with MenuX" },
    faq: { eyebrow: "Before you start", title: "Answers before you sign up.", items: [
      ["Do my guests need an app?", "No. Ordora opens in the guest’s mobile browser. There’s nothing to download and no account to create."],
      ["Does Ordora charge a commission?", "No. The monthly subscription is flat, with no commission on your restaurant orders."],
      ["Where do orders arrive?", "Orders appear in your restaurant dashboard, and you can share their summaries through WhatsApp."],
      ["Can I use my restaurant’s colors and identity?", "Yes. Your page is made to feel like your restaurant, from the name and colors to the food photos and menu presentation."]
    ] },
    final: { titleA: "A menu that fits", titleB: "your restaurant.", body: "Show your dishes clearly and make it easier for guests to send an order.", request: "Start your restaurant menu" },
    footer: ["Digital menus and online ordering", "built for the day-to-day of restaurants."],
    modal: {
      badge: "Contact Ordora",
      choiceBadge: "Get started",
      choiceTitleA: "How would you like",
      choiceTitleB: "to start?",
      choiceDescription: "Start a free trial now, or request a subscription and we’ll contact you to activate it.",
      freeTag: "Free trial",
      freeTitle: "Start for free",
      freeDesc: "Create your page and try the menu and orders. No card needed.",
      subscribeTag: "Monthly plan",
      subscribeTitle: "Subscribe",
      subscribeDesc: "Send a request and we’ll contact you to confirm and activate your plan.",
      choiceNote: "No payment now.",
      back: "Back to options",
      subscribeBadge: "Subscription request",
      subscribeTitleA: "Request your",
      subscribeTitleB: "subscription.",
      subscribeDescription: "Send your details and we’ll contact you on WhatsApp to confirm your plan.",
      subscribeNote: "No payment now. We’ll confirm the plan with you on WhatsApp before activation.",
      subscribeTail: "We’ll contact you on WhatsApp to confirm and activate your subscription.",
      subscribeSubmit: "Send subscription request",
      subscribeSuccess: "Subscription request received.",
      titleA: "Tell us about",
      titleB: "your restaurant.",
      description: "Send your details and we’ll contact you on WhatsApp about your Ordora restaurant page.",
      name: "Your name",
      namePlaceholder: "Example: Alex",
      restaurant: "Restaurant name",
      restaurantPlaceholder: "Example: Oasis Restaurant",
      phone: "WhatsApp number",
      phonePlaceholder: "+970 59 123 4567",
      submit: "Send request",
      sending: "Sending…",
      error: "We couldn’t send your request. Check your connection and try again.",
      note: "No commitment. We’ll only use your number to contact you about Ordora.",
      success: "Request received.",
      thanks: "Thanks",
      tail: "We’ll contact you on WhatsApp soon.",
      done: "Done"
    },
    phone: { name: "The Red Bun", status: "Open now", description: "Flame-grilled burgers and house-made sauces", location: "Jaffa, Palestine", search: "Find your next favorite", categories: ["All", "Burgers", "Sides", "Drinks"], featured: "BEST SELLER", burger: "The Red Bun", burgerDesc: "Cheddar, lettuce, tomato & house sauce", second: "Smokehouse Stack", secondDesc: "Smoky burger, melty cheese", cart: "View your bag", count: "2 items", button: "Open the full menu" }
  }
};

const app = document.querySelector("#app");
const LANG_STORE_KEY = "site_lang";
let language = "ar";
try {
  const queryLanguage = new URLSearchParams(location.search).get("lang");
  const savedLanguage = localStorage.getItem(LANG_STORE_KEY);
  if (queryLanguage === "ar" || queryLanguage === "en") language = queryLanguage;
  else if (savedLanguage === "ar" || savedLanguage === "en") language = savedLanguage;
} catch (_) { /* storage may be blocked */ }
let mobileOpen = false;
let modalOpen = false;
let submitted = false;
let modalView = "form";
let modalIntent = "request";
let customerName = "";
let pricing = null;
const demoUrl = "./demo/index.html";
const asset = (path) => `./${path}`;
const apiUrl = (path) => {
  let base = "";
  try {
    const meta = document.querySelector('meta[name="api-base"]');
    base = String(window.__API_BASE__ || (meta && meta.content) || "").replace(/\/+$/, "");
  } catch (_) { base = ""; }
  return base + path;
};
const money = (cents, currency) => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(cents / 100);
  } catch (_) {
    return "$" + (cents / 100).toFixed(2);
  }
};
const planPrice = () => pricing && pricing.pricing_cents != null ? money(pricing.pricing_cents, pricing.pricing_currency) : "—";
const planPeriod = () => {
  const period = pricing && pricing.pricing_period;
  if (period === "year") return language === "ar" ? "/ سنويًا" : "/ year";
  return language === "ar" ? "/ شهريًا" : "/ month";
};
// Live section: real restaurants come only from the public directory (no
// invented names, no testimonials). The one exception is the showcase card
// ("دار الحلو"), which is explicitly labelled "مثال تجريبي" and links to a
// page that itself says it is a fictional demo — it is never presented as
// a real restaurant. Because the showcase always exists, the section now
// shows even if the directory API is unreachable; real rows are appended
// after it whenever they load.
// The showcase storefront ("دار الحلو") is a clearly labelled fictional demo
// page (client/showcase.html) that always leads the section, so visitors see
// a perfect example first. Real API restaurants follow unchanged after it;
// nothing here removes or alters any real restaurant's data.
async function loadLiveRestaurants() {
  const section = document.getElementById("live-restaurants");
  const grid = document.getElementById("liveGrid");
  if (!section || !grid) return;
  const showcaseCard = `<a class="live-card" href="/showcase.html"><strong>دار الحلو</strong><span>مثال تجريبي · 7 أصناف</span></a>`;
  let rows = [];
  try {
    const res = await fetch(apiUrl("/api/restaurants?limit=50&offset=0"), { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      rows = (data.restaurants || []).slice(0, 6);
    }
  } catch (_) { /* showcase card still shows without the API */ }
  grid.innerHTML = showcaseCard + rows.map((r) => {
    const name = String(r.name || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
    const slug = encodeURIComponent(r.slug || "");
    return `<a class="live-card" href="/restaurant?r=${slug}"><strong>${name}</strong><span>${r.item_count != null ? r.item_count : ""}</span></a>`;
  }).join("");
  section.hidden = false;
}
async function loadPricing() {
  try {
    const res = await fetch(apiUrl("/api/pricing"), { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    const value = data.pricing || data;
    if (value && value.pricing_cents != null) pricing = value;
  } catch (_) { /* keep the neutral placeholder */ }
  const el = document.getElementById("livePrice");
  if (el) el.textContent = planPrice();
  const periodEl = document.getElementById("livePricePeriod");
  if (periodEl) periodEl.textContent = planPeriod();
}
const safe = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

function icon(name, size = 20) {
  const shapes = {
    arrow: '<path d="M19 12H5m7 7-7-7 7-7"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    bag: '<path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
    wifi: '<path d="M5 9a11 11 0 0 1 14 0M8 12a6 6 0 0 1 8 0m-5 4h.01"/>',
    store: '<path d="M3 10h18l-2-6H5l-2 6Z"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>',
    qr: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zm4 0h2v6h-2zm-4 4h2v2h-2z"/>',
    chart: '<path d="M4 19V5m0 14h17"/><path d="m7 14 4-4 3 2 5-6"/>',
    scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3m8 0h3a1 1 0 0 1 1 1v3M4 16v3a1 1 0 0 0 1 1h3m8 0h3a1 1 0 0 0 1-1v-3M4 12h16"/>',
    pointer: '<path d="m5 3 14 10-7 1-3 7L5 3Z"/>',
    message: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3H13a8.5 8.5 0 0 1 8 8v.5Z"/>',
    dashboard: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="5" rx="1"/><rect x="13" y="10" width="8" height="11" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/>',
    spark: '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Zm7 12 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"/>',
    close: '<path d="m18 6-12 12M6 6l12 12"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    minus: '<path d="M5 12h14"/>',
    plus: '<path d="M12 5v14m-7-7h14"/>',
    star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
    zap: '<path d="m13 2-3 8h7l-6 12 2-9H6l7-11Z"/>'
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] || shapes.spark}</svg>`;
}

function logo(light = false) {
  return `<a class="brand${light ? " brand-light" : ""}" href="#top" aria-label="Ordora — Your Food, Online"><img src="${asset("images/ordora-lockup.png")}" alt="Ordora — Your Food, Online"></a>`;
}

function qrMockup() {
  const size = 21;
  const finderOrigins = [[0, 0], [14, 0], [0, 14]];
  const modules = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let reserved = false;
      let dark = false;
      for (const [originX, originY] of finderOrigins) {
        const localX = x - originX;
        const localY = y - originY;
        if (localX >= 0 && localX < 7 && localY >= 0 && localY < 7) {
          reserved = true;
          dark = localX === 0 || localX === 6 || localY === 0 || localY === 6
            || (localX >= 2 && localX <= 4 && localY >= 2 && localY <= 4);
          break;
        }
      }
      if (!reserved) dark = (x * 7 + y * 11 + x * y * 3) % 9 < 4;
      if (dark) modules.push(`M${x} ${y}h1v1h-1z`);
    }
  }
  return `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="${language === "ar" ? "نموذج بصري لرمز QR" : "QR code visual mockup"}"><path d="${modules.join("")}"/></svg>`;
}

function langToggle() {
  return `<div class="language-toggle" aria-label="Language"><button type="button" data-language="ar" aria-label="العربية" aria-pressed="${language === "ar"}">ع</button><button type="button" data-language="en" aria-label="English" aria-pressed="${language === "en"}">EN</button></div>`;
}

function phonePreview(t) {
  const p = t.phone;
  return `<div class="phone-stage">
    <div class="floating-note floating-order"><span class="float-icon">${icon("bag", 17)}</span><strong>${language === "ar" ? "طلبك<br><small>جاهز للإرسال</small>" : "Your order<br><small>ready to send</small>"}</strong></div>
    <div class="qr-mockup" aria-hidden="true"><span class="qr-label">${language === "ar" ? "نموذج QR للمنيو" : "MENU QR MOCKUP"}</span><div class="qr-code">${qrMockup()}</div><b>ORDORA</b></div>
    <div class="phone-frame"><div class="phone-screen" dir="${language === "ar" ? "rtl" : "ltr"}">
      <div class="phone-notch"></div><div class="statusbar"><span>9:41</span><span>${icon("wifi", 13)} ▰</span></div>
      <header class="restaurant-head"><img src="${asset("demo/images/red-bun-logo.svg")}" alt=""><div class="restaurant-copy"><strong>${p.name} <i></i></strong><small>${p.description}</small></div><span class="open-pill">${p.status}</span></header>
      <div class="phone-cover"><img src="${asset("demo/images/red-bun-campaign-1.jpg")}" alt=""><div class="cover-caption"><span>${p.featured}</span><b>${p.name}</b></div><span class="rating">${icon("star", 13)} 4.9</span></div>
      <div class="phone-meta"><span>${icon("clock", 13)} ${language === "ar" ? "20–30 دقيقة" : "20–30 min"}</span><span>${icon("pin", 13)} ${p.location}</span></div>
      <div class="phone-search">${icon("search", 14)} ${p.search}</div>
      <div class="phone-categories">${p.categories.map((category, i) => `<span class="${i === 1 ? "selected" : ""}">${category}</span>`).join("")}</div>
      <div class="phone-products"><div class="product-heading"><strong>${p.categories[1]}</strong><small>${language === "ar" ? "8 أصناف" : "8 items"}</small></div>
        <article class="phone-product"><div class="product-photo"><img src="${asset("images/red-bun-signature-burger.jpg")}" alt=""><span>${p.featured}</span></div><div class="product-info"><div><b>${p.burger}</b><small>${p.burgerDesc}</small><strong>₪54</strong></div><span class="add-dot">${icon("plus", 15)}</span></div></article>
        <article class="phone-product compact-product"><img src="${asset("images/red-bun-smokehouse-burger.jpg")}" alt=""><div><b>${p.second}</b><small>${p.secondDesc}</small><strong>₪68</strong></div><span class="add-dot">${icon("plus", 14)}</span></article>
      </div>
      <a class="phone-cart" href="${demoUrl}" aria-label="${p.button}"><span class="cart-icon">${icon("bag", 17)}</span><span><b>${p.cart}</b><small>${p.count}</small></span><strong>₪122</strong>${icon("arrow", 15)}</a>
    </div></div>
  </div>`;
}

function startChoiceMarkup(m) {
  return `<div class="start-choice-panel">
    <a class="start-choice start-choice-free" href="/signup.html">
      <span class="start-choice-icon">${icon("spark", 21)}</span>
      <span class="start-choice-copy"><small class="start-choice-tag">${m.freeTag}</small><strong>${m.freeTitle}</strong><span class="start-choice-desc">${m.freeDesc}</span></span>
      <span class="start-choice-arrow">${icon("arrow", 18)}</span>
    </a>
    <button class="start-choice start-choice-subscribe" type="button" data-action="choose-subscribe">
      <span class="start-choice-icon">${icon("message", 20)}</span>
      <span class="start-choice-copy"><small class="start-choice-tag">${m.subscribeTag}</small><strong>${m.subscribeTitle}</strong><span class="start-choice-desc">${m.subscribeDesc}</span></span>
      <span class="start-choice-arrow">${icon("arrow", 18)}</span>
    </button>
    <p class="start-choice-note">${m.choiceNote}</p>
  </div>`;
}

function resetModalState() {
  modalOpen = false;
  submitted = false;
  modalView = "form";
  modalIntent = "request";
}

function modalMarkup(t) {
  const m = t.modal;
  const choosing = modalView === "choice";
  const subscribing = modalIntent === "subscribe";
  const badge = choosing ? m.choiceBadge : subscribing ? m.subscribeBadge : m.badge;
  const titleA = choosing ? m.choiceTitleA : subscribing ? m.subscribeTitleA : m.titleA;
  const titleB = choosing ? m.choiceTitleB : subscribing ? m.subscribeTitleB : m.titleB;
  const description = choosing ? m.choiceDescription : subscribing ? m.subscribeDescription : m.description;
  const tail = subscribing ? m.subscribeTail : m.tail;
  const successTitle = subscribing ? m.subscribeSuccess : m.success;
  const submitLabel = subscribing ? m.subscribeSubmit : m.submit;
  const noteMarkup = subscribing
    ? `<p class="form-note form-note-info">${icon("check", 15)}<span>${m.subscribeNote}</span></p>`
    : `<p class="form-note">${m.note}</p>`;
  let body;
  if (submitted) {
    body = `<div class="success-state"><span class="success-icon">${icon("check", 34)}</span><h3>${successTitle}</h3><p>${m.thanks} ${safe(customerName || (language === "ar" ? "لك" : "there"))}. ${tail}</p><button type="button" class="button button-dark" data-action="close-modal">${m.done}</button></div>`;
  } else if (choosing) {
    body = startChoiceMarkup(m);
  } else {
    body = `<form class="request-form">
      ${subscribing ? `<button type="button" class="modal-back" data-action="choose-start">${icon("arrow", 15)}${m.back}</button>` : ""}
      <label>${m.name}<input name="customerName" autocomplete="name" enterkeyhint="next" required placeholder="${m.namePlaceholder}"></label>
      <label>${m.restaurant}<input name="restaurant" autocomplete="organization" enterkeyhint="next" required placeholder="${m.restaurantPlaceholder}"></label>
      <label>${m.phone}<input name="phone" autocomplete="tel" inputmode="tel" enterkeyhint="send" required type="tel" placeholder="${m.phonePlaceholder || "+970 5X XXX XXXX"}" dir="ltr"></label>
      <button type="submit" class="button button-coral form-submit">${submitLabel}${icon("arrow", 17)}</button>
      <p class="form-error hidden" role="alert"></p>
      ${noteMarkup}
    </form>`;
  }
  return `<div class="modal-backdrop" role="presentation"><section class="request-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-description">
    <button class="modal-close" type="button" data-action="close-modal" aria-label="${m.close || (language === "ar" ? "إغلاق" : "Close")}">${icon("close", 18)}</button>
    <div class="modal-scroll">
      <div class="modal-heading"><span class="eyebrow-pill">${badge}</span><h2 id="modal-title">${titleA}<br>${titleB}</h2><p id="modal-description">${description}</p></div>
      ${body}
    </div>
  </section></div>`;
}

function render() {
  const t = copy[language];
  const rtl = language === "ar";
  document.documentElement.lang = language;
  document.documentElement.dir = rtl ? "rtl" : "ltr";
  document.title = rtl ? "Ordora — منيو رقمي وطلبات أوضح لمطعمك" : "Ordora — Digital menus and clearer restaurant orders";
  document.body.classList.toggle("modal-open", modalOpen);
  app.innerHTML = `<div id="top" class="site-shell">
    <header class="site-header"><div class="container header-inner">${logo()}
      <nav class="desktop-nav"><a href="#how-it-works">${t.nav.how}</a><a href="#features">${t.nav.features}</a><a href="#pricing">${t.nav.pricing}</a><a href="#faq">${t.nav.faq}</a></nav>
      <div class="header-actions"><a class="button button-dark" href="/signup.html">${t.nav.startFree}</a>${langToggle()}</div>
      <div class="mobile-actions">${langToggle()}<button class="menu-button" type="button" data-action="mobile-menu" aria-expanded="${mobileOpen}" aria-label="${mobileOpen ? t.nav.close : t.nav.menu}">${icon(mobileOpen ? "close" : "menu", 21)}</button></div>
    </div>${mobileOpen ? `<div class="mobile-menu"><nav><a href="#how-it-works">${t.nav.how}</a><a href="#features">${t.nav.features}</a><a href="#pricing">${t.nav.pricing}</a><a href="#faq">${t.nav.faq}</a><a class="mobile-demo" href="/signup.html">${t.nav.startFree}</a><a class="mobile-demo" href="${demoUrl}">${t.hero.demo}</a><button type="button" data-action="request">${t.hero.request}</button></nav></div>` : ""}</header>
    <main>
      <section class="hero"><div class="page-grid"></div><div class="hero-glow glow-one"></div><div class="hero-glow glow-two"></div>
        <div class="container hero-content">
          <div class="hero-grid"><div class="hero-copy">
            <h1>${t.hero.titleA}<span>${t.hero.titleB}<svg viewBox="0 0 330 13" aria-hidden="true"><path d="M2 9.5C82 2 236 1.5 328 7"/></svg></span></h1>
            <p class="hero-description">${t.hero.description}</p>
            <div class="hero-ctas"><a class="button hero-start" href="/signup.html">${t.nav.startFree}${icon("arrow", 17)}</a><a class="button hero-demo" href="${demoUrl}">${t.hero.demo}${icon("arrow", 17)}</a></div>
          </div><div class="hero-preview">${phonePreview(t)}</div></div>
        </div>
      </section>
      <section class="ticker"><div class="container ticker-inner">${t.ticker.map((item, index) => `<span class="${index === 0 || index === 3 ? "ticker-muted" : ""}">${item}</span>`).join("")}</div></section>
      <section class="story-section"><div class="container story-grid"><div class="story-art"><div class="story-photo"><img src="${asset("images/ordora-food-table.jpg")}" alt="${t.story.tag}"><span>${t.story.tag}</span></div><div class="owner-photo"><img src="${asset("images/ordora-owner-tablet.jpg")}" alt="${t.story.owner}"><b>${t.story.owner}</b></div></div><div class="story-copy"><span class="section-kicker">${t.story.eyebrow}</span><h2>${t.story.titleA}<br><em>${t.story.titleB}</em></h2><p>${t.story.body}</p><div class="story-note"><span>01</span>${t.story.note}</div></div></div></section>
      <section class="how-section" id="how-it-works"><div class="container"><div class="section-intro split-intro"><div><span class="section-kicker">${t.how.eyebrow}</span><h2>${t.how.titleA}<br><em>${t.how.titleB}</em></h2></div><p>${t.how.body}</p></div><div class="steps-grid">${t.how.steps.map((step, i) => `<article class="step-card"><div class="step-top"><span>0${i + 1}</span><i>${icon(["scan", "pointer", "message"][i], 21)}</i></div><h3>${step[0]}</h3><p>${step[1]}</p></article>`).join("")}</div></div></section>
      <section class="features-section" id="features"><div class="container"><div class="section-intro feature-intro"><div><span class="section-kicker">${t.features.eyebrow}</span><h2>${t.features.titleA}<br><em>${t.features.titleB}</em></h2></div><p>${t.features.aside}</p></div><div class="features-grid">${t.features.items.map((item, i) => `<article class="feature-card tone-${i + 1}"><div class="feature-top"><span>0${i + 1}</span><i>${icon(item[2], 21)}</i></div><div class="feature-copy"><h3>${item[0]}</h3><p>${item[1]}</p></div></article>`).join("")}</div></div></section>
      <section class="dashboard-section"><div class="container dashboard-grid"><div class="dashboard-copy"><span class="section-kicker">${t.dashboard.eyebrow}</span><h2>${t.dashboard.titleA}<br><em>${t.dashboard.titleB}</em></h2><p>${t.dashboard.body}</p><div class="dashboard-chips">${t.dashboard.chips.map((item) => `<span>${icon("check", 14)}${item}</span>`).join("")}</div></div><div class="dashboard-visual"><div class="dashboard-panel"><div class="panel-heading"><div><small>${t.dashboard.label}</small><b>${t.dashboard.date}</b></div><span>${icon("dashboard", 18)}</span></div><div class="stats-grid"><div><small>${t.dashboard.today}</small><strong>47</strong><em>${t.dashboard.yesterday}</em></div><div><small>${t.dashboard.top}</small><b>${t.dashboard.item}</b><em>${t.dashboard.count}</em></div></div><div class="order-list">${t.dashboard.orders.map((order, i) => `<div><span>${order}</span><b class="${i === 0 ? "order-new" : ""}">${i === 0 ? t.dashboard.fresh : t.dashboard.done}</b></div>`).join("")}</div></div></div></div></section>
      <section class="pricing-section" id="pricing"><div class="container pricing-grid"><div class="pricing-copy"><span class="section-kicker">${t.pricing.eyebrow}</span><h2>${t.pricing.titleA}<br><em>${t.pricing.titleB}</em></h2><p>${t.pricing.body}</p></div><div class="price-card"><span class="price-label">${t.pricing.label}</span><div class="price"><strong id="livePrice">${planPrice()}</strong><span id="livePricePeriod">${planPeriod()}</span></div><div class="price-divider"></div><div class="price-features">${t.pricing.features.map((item) => `<span><i>${icon("check", 13)}</i>${item}</span>`).join("")}</div><button type="button" class="button button-coral price-cta" data-action="start">${t.pricing.request}${icon("arrow", 16)}</button></div></div></section>
      <section class="live-section" id="live-restaurants" hidden><div class="container"><div class="section-intro"><div><span class="section-kicker">${t.live.eyebrow}</span><h2>${t.live.title}</h2></div></div><div class="live-grid" id="liveGrid"></div><p><a href="/app/">${t.live.viewAll}</a> · <a href="/ordora-vs-menux.html">${t.live.compare}</a></p></div></section>
      <section class="faq-section" id="faq"><div class="container faq-container"><div class="faq-heading"><span class="section-kicker">${t.faq.eyebrow}</span><h2>${t.faq.title}</h2></div><div class="faq-list">${t.faq.items.map((item, i) => `<details class="faq-item"${i === 0 ? " open" : ""}><summary>${item[0]}<span>${icon("plus", 17)}</span></summary><p>${item[1]}</p></details>`).join("")}</div></div></section>
      <section class="final-section"><span class="final-spark">${icon("spark", 32)}</span><h2>${t.final.titleA}<br>${t.final.titleB}</h2><p>${t.final.body}</p><button type="button" class="button final-button" data-action="start">${t.final.request}${icon("arrow", 17)}</button></section>
    </main>
      <footer class="site-footer"><div class="container footer-inner"><div>${logo(true)}<p>${t.footer[0]}<br>${t.footer[1]}</p></div><nav><a href="#features">${t.nav.features}</a><a href="#pricing">${t.nav.pricing}</a><a href="${demoUrl}">${t.hero.demo}</a><span>© Ordora</span></nav></div></footer>
    ${modalOpen ? modalMarkup(t) : ""}
  </div>`;
  // Re-fill the live-restaurants section after every re-render (e.g. the
  // language toggle rebuilds #app). It hides itself when data is absent.
  loadLiveRestaurants();
}

app.addEventListener("click", (event) => {
  const languageButton = event.target.closest("[data-language]");
  if (languageButton) {
    language = languageButton.dataset.language;
    try { localStorage.setItem(LANG_STORE_KEY, language); } catch (_) { /* storage may be blocked */ }
    try {
      const url = new URL(location.href);
      url.searchParams.set("lang", language);
      history.replaceState(null, "", url.toString());
    } catch (_) { /* ignore malformed URLs */ }
    mobileOpen = false;
    render();
    return;
  }
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  if (action === "start") {
    mobileOpen = false;
    modalOpen = true;
    submitted = false;
    modalView = "choice";
    modalIntent = "start";
    render();
    document.querySelector(".start-choice")?.focus();
  } else if (action === "request") {
    mobileOpen = false;
    modalOpen = true;
    submitted = false;
    modalView = "form";
    modalIntent = "request";
    render();
    document.querySelector(".request-modal input")?.focus();
  } else if (action === "choose-subscribe") {
    modalView = "form";
    modalIntent = "subscribe";
    submitted = false;
    render();
    document.querySelector(".request-modal input")?.focus();
  } else if (action === "choose-start") {
    modalView = "choice";
    modalIntent = "start";
    submitted = false;
    render();
    document.querySelector(".start-choice")?.focus();
  } else if (action === "close-modal") {
    resetModalState();
    render();
  } else if (action === "mobile-menu") {
    mobileOpen = !mobileOpen;
    render();
  }
});

app.addEventListener("submit", async (event) => {
  if (!event.target.matches(".request-form")) return;
  event.preventDefault();
  const form = event.target;
  const t = copy[language];
  const btn = form.querySelector(".form-submit");
  const errorEl = form.querySelector(".form-error");
  const data = new FormData(form);
  customerName = String(data.get("customerName") || "").trim();
  const restaurant = String(data.get("restaurant") || "").trim();
  const phone = String(data.get("phone") || "").trim();
  const notes = modalIntent === "subscribe"
    ? (language === "ar" ? "طلب اشتراك من الصفحة الرئيسية" : "Subscription request from the landing page")
    : (language === "ar" ? "طلب من الصفحة الرئيسية" : "Landing page request");
  const original = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = t.modal.sending;
  }
  if (errorEl) errorEl.classList.add("hidden");
  try {
    const res = await fetch(apiUrl("/api/restaurant-requests"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName,
        restaurantName: restaurant,
        phone,
        whatsapp: phone,
        notes,
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error((body && body.error && body.error.message) || t.modal.error);
    }
    submitted = true;
    render();
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = err.message || t.modal.error;
      errorEl.classList.remove("hidden");
    }
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  }
});

app.addEventListener("click", (event) => {
  if (event.target.classList.contains("modal-backdrop")) {
    resetModalState();
    render();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modalOpen) {
    resetModalState();
    render();
  }
});

render();
loadPricing();
loadLiveRestaurants();

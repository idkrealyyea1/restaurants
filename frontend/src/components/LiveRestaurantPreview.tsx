import { useMemo, useState } from 'react';
import { Check, ChevronLeft, Clock3, MapPin, MessageCircle, Minus, Plus, Search, Share2, ShoppingBag, Star, X } from 'lucide-react';
import foodTableImage from '@assets/generated_images/restivo-food-table.jpg';
import type { Language } from '../content';

type Category = 'all' | 'popular' | 'shawarma' | 'meals' | 'sides' | 'drinks';
type MenuItem = {
  id: string;
  category: Exclude<Category, 'all'>;
  ar: { name: string; description: string };
  en: { name: string; description: string };
  price: number;
  featured?: boolean;
  position: string;
};

const menuItems: MenuItem[] = [
  { id: 'shawarma', category: 'shawarma', ar: { name: 'شاورما عربي', description: 'شاورما دجاج، ثوم، مخلل وبطاطس داخل خبز الصاج' }, en: { name: 'Arabic shawarma', description: 'Chicken shawarma, garlic, pickles and fries in saj bread' }, price: 15, featured: true, position: '78% 65%' },
  { id: 'burger', category: 'popular', ar: { name: 'برجر موجّه دبل', description: 'قطعتان لحم مشوي، جبنة شيدر، صوص موجّه وخس' }, en: { name: 'Mowajjah double burger', description: 'Two grilled beef patties, cheddar, house sauce and lettuce' }, price: 28, featured: true, position: '68% 51%' },
  { id: 'crispy', category: 'meals', ar: { name: 'وجبة كرسبي', description: 'قطع دجاج مقرمشة مع بطاطس، كول سلو وصوص خاص' }, en: { name: 'Crispy chicken meal', description: 'Crispy chicken strips with fries, coleslaw and house sauce' }, price: 25, position: '71% 54%' },
  { id: 'grill', category: 'meals', ar: { name: 'مشاوي مشكلة', description: 'كباب، شيش طاووق وكفتة مع أرز وسلطة طازجة' }, en: { name: 'Mixed grill', description: 'Kebab, shish tawook and kofta with rice and fresh salad' }, price: 44, position: '82% 68%' },
  { id: 'fries', category: 'sides', ar: { name: 'بطاطس بالجبنة', description: 'بطاطس ذهبية، صوص جبنة وشطة اختيارية' }, en: { name: 'Cheesy fries', description: 'Golden fries, cheese sauce and optional chilli' }, price: 12, position: '94% 48%' },
  { id: 'lemon', category: 'drinks', ar: { name: 'ليمون بالنعناع', description: 'ليمون طازج، نعناع وماء بارد' }, en: { name: 'Lemon mint', description: 'Fresh lemon, mint and chilled water' }, price: 10, position: '55% 40%' },
];

const copy = {
  ar: {
    switch: 'English', restaurant: 'مطعم مهند', subtitle: 'MOHAND RESTAURANT', open: 'مفتوح الآن',
    description: 'أكل طازج، نكهة على أصولها، وطلبك يوصلنا مرتب.', location: 'الرياض · حي النخيل', hours: 'اليوم ١٢:٠٠ م — ١:٠٠ ص',
    menu: 'تصفح القائمة واطلب بسهولة', search: 'ابحث في القائمة...', all: 'الكل', popular: 'الأكثر طلبًا', shawarma: 'شاورما', meals: 'وجبات', sides: 'إضافات', drinks: 'مشروبات',
    featured: 'أطباقنا المميزة', fullMenu: 'كل القائمة', add: 'أضف', cart: 'سلة الطلب', viewCart: 'عرض السلة', items: 'أصناف', total: 'الإجمالي',
    send: 'إرسال عبر واتساب', close: 'إغلاق المعاينة', empty: 'سلتك فاضية', emptyBody: 'أضف طبقًا تحبه، وسيظهر هنا ملخص طلبك.', browse: 'تصفح القائمة',
    orderReady: 'تم تجهيز طلبك', orderBody: 'افتح واتساب لإرسال الطلب للمطعم.', share: 'مشاركة', copied: 'تم نسخ رابط المنيو',
  },
  en: {
    switch: 'العربية', restaurant: 'Mohand Restaurant', subtitle: 'MOHAND RESTAURANT', open: 'Open now',
    description: 'Fresh food, honest flavor, and an order that reaches us clearly.', location: 'Riyadh · Al Nakheel', hours: 'Today 12:00 PM — 1:00 AM',
    menu: 'Browse the menu and order with ease', search: 'Search the menu...', all: 'All', popular: 'Most ordered', shawarma: 'Shawarma', meals: 'Meals', sides: 'Sides', drinks: 'Drinks',
    featured: 'Our signature dishes', fullMenu: 'Full menu', add: 'Add', cart: 'Your order', viewCart: 'View cart', items: 'items', total: 'Total',
    send: 'Send via WhatsApp', close: 'Close live preview', empty: 'Your cart is empty', emptyBody: 'Add something you love and your order summary will appear here.', browse: 'Browse menu',
    orderReady: 'Your order is ready', orderBody: 'Open WhatsApp to send the order.', share: 'Share', copied: 'Menu link copied',
  },
} as const;

function Quantity({ value, onMinus, onPlus, label }: { value: number; onMinus: () => void; onPlus: () => void; label: string }) {
  return (
    <div className="flex h-10 items-center rounded-full bg-[#1f3439] p-1 text-[#f8f0df]" aria-label={label}>
      <button type="button" onClick={onMinus} className="grid size-8 place-items-center rounded-full hover:bg-[#36545a]" aria-label={`Decrease ${label}`}><Minus className="size-3.5" /></button>
      <span className="min-w-6 text-center text-xs font-black">{value}</span>
      <button type="button" onClick={onPlus} className="grid size-8 place-items-center rounded-full hover:bg-[#36545a]" aria-label={`Increase ${label}`}><Plus className="size-3.5" /></button>
    </div>
  );
}

export function LiveRestaurantPreview({ lang: initialLang, onClose }: { lang: Language; onClose: () => void }) {
  const [lang, setLang] = useState<Language>(initialLang);
  const [category, setCategory] = useState<Category>('all');
  const [search, setSearch] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [notice, setNotice] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const t = copy[lang];
  const labels: Record<Category, string> = { all: t.all, popular: t.popular, shawarma: t.shawarma, meals: t.meals, sides: t.sides, drinks: t.drinks };
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return menuItems.filter((item) => {
      const categoryMatch = category === 'all' || item.category === category || (category === 'popular' && item.featured);
      const text = `${item.ar.name} ${item.en.name} ${item.ar.description} ${item.en.description}`.toLocaleLowerCase();
      return categoryMatch && (!query || text.includes(query));
    });
  }, [category, search]);
  const totalItems = Object.values(cart).reduce((sum, count) => sum + count, 0);
  const total = menuItems.reduce((sum, item) => sum + item.price * (cart[item.id] ?? 0), 0);
  const featured = menuItems.filter((item) => item.featured);
  const change = (id: string, delta: number) => setCart((current) => {
    const next = { ...current };
    const value = Math.max(0, (next[id] ?? 0) + delta);
    if (value) next[id] = value; else delete next[id];
    return next;
  });
  const share = async () => {
    if (navigator.share) await navigator.share({ title: t.restaurant, text: t.menu, url: window.location.href }).catch(() => undefined);
    else {
      await navigator.clipboard?.writeText(window.location.href);
      setNotice(t.copied);
      window.setTimeout(() => setNotice(''), 2200);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-[#1f3439]/75 p-2 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label={t.restaurant}>
      <div className="relative mx-auto flex h-full max-w-[1180px] flex-col overflow-hidden rounded-[24px] bg-[#f5eddd] shadow-[0_25px_90px_rgba(0,0,0,.3)]">
        <div className="flex shrink-0 items-center justify-between border-b border-[#203d3a]/10 bg-[#fffaf0] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#d84632] text-[#fff9ed] shadow-[3px_3px_0_#f1bf54]"><span className="font-display text-xl font-black">م</span></div>
            <div><p className="font-display text-lg font-black leading-none">{t.restaurant}</p><p className="mt-1 text-[9px] font-bold tracking-[.12em] text-[#203d3a]/45">{t.subtitle}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setLang((current) => current === 'ar' ? 'en' : 'ar')} className="min-h-10 rounded-full border border-[#203d3a]/15 px-3 text-[11px] font-black text-[#203d3a]">{t.switch}</button>
            <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full bg-[#203d3a] text-[#fffaf0]" aria-label={t.close} data-testid="button-close-live-preview"><X className="size-4" /></button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang} className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
            <section className="relative mt-4 overflow-hidden rounded-[26px] bg-[#203d3a] shadow-[0_12px_35px_rgba(32,61,58,.14)]">
              <img src={foodTableImage} alt="" className="absolute inset-0 size-full object-cover opacity-60" style={{ objectPosition: '70% 58%' }} />
              <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(25,51,48,.94),rgba(25,51,48,.28))]" />
              <div className="relative flex min-h-[230px] flex-col justify-between p-5 text-[#fffaf0] sm:min-h-[270px] sm:p-7">
                <div className="flex items-start justify-between"><span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/10 px-3 py-2 text-[11px] font-bold"><span className="size-2 rounded-full bg-[#52a579]" /> {t.open}</span><button type="button" onClick={share} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/25 bg-black/10 px-3 text-[11px] font-bold"><Share2 className="size-3.5" /> {t.share}</button></div>
                <div><h1 className="font-display text-4xl font-black leading-none sm:text-6xl">{t.restaurant}</h1><p className="mt-3 max-w-[360px] text-xs leading-6 text-white/75">{t.description}</p><div className="mt-3 flex flex-wrap gap-3 text-[10px] font-bold text-white/70"><span className="inline-flex items-center gap-1"><MapPin className="size-3.5 text-[#f1bf54]" /> {t.location}</span><span className="inline-flex items-center gap-1"><Clock3 className="size-3.5 text-[#f1bf54]" /> {t.hours}</span></div></div>
              </div>
            </section>
            <section className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black tracking-[.18em] text-[#d84632]">{lang === 'ar' ? 'قائمتنا' : 'THE MENU'}</p><h2 className="mt-1 font-display text-2xl font-black sm:text-3xl">{t.menu}</h2></div><button type="button" onClick={share} className="inline-flex min-h-10 items-center gap-2 self-start rounded-full border border-[#203d3a]/15 bg-[#fffaf0] px-4 text-xs font-black"><Share2 className="size-3.5" /> {t.share}</button></section>
            <label className="relative mt-4 block"><Search className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#203d3a]/45 rtl:right-4 ltr:left-4" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.search} className="h-12 w-full rounded-2xl border border-[#203d3a]/10 bg-[#fffaf0] px-11 text-sm font-bold outline-none focus:border-[#d84632]" /></label>
            <nav className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-1">{(['all', 'popular', 'shawarma', 'meals', 'sides', 'drinks'] as Category[]).map((key) => <button key={key} type="button" onClick={() => setCategory(key)} className={`min-h-10 shrink-0 rounded-full border px-4 text-[11px] font-black ${category === key ? 'border-[#d84632] bg-[#d84632] text-[#fffaf0] shadow-[3px_3px_0_#f1bf54]' : 'border-[#203d3a]/10 bg-[#fffaf0] text-[#203d3a]/65'}`}>{labels[key]}</button>)}</nav>
            {category === 'all' && !search && <section className="mt-7"><div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl font-black">{t.featured}</h2><span className="text-xs font-bold text-[#203d3a]/35">02</span></div><div className="grid gap-3 lg:grid-cols-2">{featured.map((item) => <Dish key={item.id} item={item} lang={lang} t={t} quantity={cart[item.id] ?? 0} onAdd={() => change(item.id, 1)} onMinus={() => change(item.id, -1)} onPlus={() => change(item.id, 1)} />)}</div></section>}
            <section className="mt-7"><div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl font-black">{category === 'all' && !search ? t.fullMenu : labels[category]}</h2><span className="text-xs font-bold text-[#203d3a]/35">{filtered.length.toString().padStart(2, '0')}</span></div><div className="grid gap-3 lg:grid-cols-2">{filtered.filter((item) => !(category === 'all' && !search && item.featured)).map((item) => <Dish key={item.id} item={item} lang={lang} t={t} quantity={cart[item.id] ?? 0} onAdd={() => change(item.id, 1)} onMinus={() => change(item.id, -1)} onPlus={() => change(item.id, 1)} />)}</div></section>
          </div>
        </div>
        {totalItems > 0 && <button type="button" onClick={() => setCartOpen(true)} className="absolute bottom-4 left-1/2 z-10 flex min-h-14 w-[calc(100%-32px)] max-w-[430px] -translate-x-1/2 items-center justify-between rounded-2xl bg-[#203d3a] px-5 text-[#fffaf0] shadow-[0_12px_35px_rgba(32,61,58,.28)]" data-testid="button-live-cart"><span className="flex items-center gap-2 text-sm font-black"><ShoppingBag className="size-4 text-[#f1bf54]" /> {t.cart} ({totalItems})</span><span className="text-xs font-black text-[#f1bf54]">{total.toFixed(2)} ر.س <ChevronLeft className="inline size-4" /></span></button>}
        {cartOpen && <div className="absolute inset-0 z-20 flex items-end justify-center bg-[#203d3a]/55 p-2 sm:items-center sm:p-6"><section className="max-h-[88%] w-full max-w-[500px] overflow-y-auto rounded-[26px] bg-[#fffaf0] p-5 shadow-2xl"><div className="flex items-center justify-between border-b border-[#203d3a]/10 pb-4"><div><p className="text-xs font-bold text-[#d84632]">{totalItems} {t.items}</p><h2 className="font-display text-2xl font-black">{t.cart}</h2></div><button type="button" onClick={() => setCartOpen(false)} className="grid size-10 place-items-center rounded-full bg-[#f3ead7]" aria-label={t.close}><X className="size-4" /></button></div><div className="divide-y divide-[#203d3a]/10">{menuItems.filter((item) => cart[item.id]).map((item) => <div key={item.id} className="flex items-center gap-3 py-3"><img src={foodTableImage} alt="" className="size-12 rounded-xl object-cover" style={{ objectPosition: item.position }} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{item[lang].name}</p><p className="text-xs font-bold text-[#d84632]">{(item.price * cart[item.id]).toFixed(2)} ر.س</p></div><Quantity value={cart[item.id]} onMinus={() => change(item.id, -1)} onPlus={() => change(item.id, 1)} label={item[lang].name} /></div>)}</div><div className="mt-4 flex justify-between rounded-2xl bg-[#f3ead7] p-4 text-lg font-black"><span>{t.total}</span><span className="text-[#d84632]">{total.toFixed(2)} ر.س</span></div><button type="button" onClick={() => { setSent(true); window.open(`https://wa.me/?text=${encodeURIComponent(`${t.restaurant}\n${t.total}: ${total.toFixed(2)} ر.س`)}`, '_blank', 'noopener,noreferrer'); }} className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#1c8a69] text-sm font-black text-white shadow-[4px_4px_0_#f1bf54]"><MessageCircle className="size-5" /> {sent ? t.orderReady : t.send}</button>{sent && <p className="mt-3 text-center text-xs font-bold text-[#1c8a69]">{t.orderBody}</p>}</section></div>}
        {notice && <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#203d3a] px-4 py-3 text-xs font-bold text-[#fffaf0]"><Check className="size-4 text-[#f1bf54]" /> {notice}</div>}
      </div>
    </div>
  );
}

function Dish({ item, lang, t, quantity, onAdd, onMinus, onPlus }: { item: MenuItem; lang: Language; t: typeof copy.ar | typeof copy.en; quantity: number; onAdd: () => void; onMinus: () => void; onPlus: () => void }) {
  const itemCopy = item[lang];
  return <article className="group flex min-h-[138px] gap-3 rounded-[22px] border border-[#203d3a]/10 bg-[#fffaf0] p-3 shadow-[0_5px_18px_rgba(32,61,58,.045)]"><div className="relative size-[110px] shrink-0 overflow-hidden rounded-[16px] bg-[#d8a569]"><img src={foodTableImage} alt={itemCopy.name} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" style={{ objectPosition: item.position }} />{item.featured && <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-[#f1bf54] px-1.5 py-1 text-[9px] font-black"><Star className="size-2.5 fill-current" /> {lang === 'ar' ? 'مميز' : 'Top'}</span>}</div><div className="flex min-w-0 flex-1 flex-col justify-between py-0.5"><div><h3 className="text-sm font-black leading-6">{itemCopy.name}</h3><p className="mt-0.5 line-clamp-2 text-[11px] leading-5 text-[#203d3a]/55">{itemCopy.description}</p></div><div className="mt-2 flex items-end justify-between gap-2"><span className="text-sm font-black text-[#d84632]">{item.price.toFixed(2)} <small className="text-[9px]">ر.س</small></span>{quantity ? <Quantity value={quantity} onMinus={onMinus} onPlus={onPlus} label={itemCopy.name} /> : <button type="button" onClick={onAdd} className="inline-flex min-h-10 items-center gap-1 rounded-full bg-[#d84632] px-3.5 text-[11px] font-black text-[#fff9ed] shadow-[3px_3px_0_#f1bf54]"><Plus className="size-3.5" /> {t.add}</button>}</div></div></article>;
}
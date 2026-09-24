import React, { useState } from 'react';
import { Link } from 'react-router';
import {
  ScanLine, MousePointer2, MessageCircle, Check, Minus, ChevronDown,
  QrCode, ShoppingBag, BarChart3, Store, LayoutDashboard, Sparkles,
  ArrowLeft, Zap
} from 'lucide-react';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { LanguageToggle } from '@/components/LanguageToggle';
import { RequestModal } from '@/components/RequestModal';
import { useI18n } from '@/lib/i18n';

const STEPS = {
  ar: [
    { icon: ScanLine, title: 'يمسح', copy: 'QR على الطاولة' },
    { icon: MousePointer2, title: 'يختار', copy: 'منيو واضح وسريع' },
    { icon: MessageCircle, title: 'يرسل', copy: 'ملخص الطلب جاهز' },
  ],
  en: [
    { icon: ScanLine, title: 'Scan', copy: 'The QR on the table' },
    { icon: MousePointer2, title: 'Choose', copy: 'A clear, quick menu' },
    { icon: MessageCircle, title: 'Send', copy: 'A ready order summary' },
  ],
};

const FEATURES = [
  {
    number: '01', icon: Store,
    ar: { title: 'صفحة تحمل اسم مطعمك', description: 'منيو مرتب بصورك وألوانك ورابط واحد سهل الحفظ والمشاركة.' },
    en: { title: 'A page with your restaurant name', description: 'A menu with your photos, colors, and one link that is easy to save and share.' },
  },
  {
    number: '02', icon: QrCode,
    ar: { title: 'QR على الطاولة وفي كل مكان', description: 'رمز واضح يصل بضيفك إلى المنيو مباشرة، بلا تطبيق وبلا تسجيل.' },
    en: { title: 'QR on the table and everywhere', description: 'A clear code that takes guests straight to your menu, with no app and no sign-up.' },
  },
  {
    number: '03', icon: ShoppingBag,
    ar: { title: 'سلة طلب بلا رسائل ضائعة', description: 'الضيف يختار، يراجع، ويرسل الطلب مرتبًا إلى المكان الذي تتابعه.' },
    en: { title: 'An order cart with no lost messages', description: 'Guests choose, review, and send an organized order to the place your team already follows.' },
  },
  {
    number: '04', icon: BarChart3,
    ar: { title: 'Dashboard يفهم يومك', description: 'تابع الطلبات والأصناف الأكثر طلبًا من لوحة واحدة خفيفة.' },
    en: { title: 'A dashboard that understands your day', description: 'Track orders and best-sellers from one lightweight dashboard.' },
  },
];

const FAQS = {
  ar: [
    { q: 'هل أحتاج إلى تطبيق خاص؟', a: 'لا. Restivo يعمل من المتصفح مباشرة على جوال العميل.' },
    { q: 'هل يأخذ Restivo عمولة على الطلبات؟', a: 'لا. الاشتراك ثابت بقيمة $8.99 شهريًا.' },
    { q: 'أين تصل الطلبات؟', a: 'يظهر الطلب في Dashboard وواتساب.' },
    { q: 'هل يمكنني استخدام ألوان مطعمي؟', a: 'نعم. الصفحة مصممة لتشبه مطعمك.' },
  ],
  en: [
    { q: 'Do I need a special app?', a: 'No. Restivo works directly in the browser.' },
    { q: 'Does Restivo take a commission?', a: 'No. Flat $8.99/month, no commission.' },
    { q: 'Where do the orders arrive?', a: 'Orders appear in your dashboard and WhatsApp.' },
    { q: 'Can I use my restaurant colors?', a: 'Yes. Your page is made to feel like your restaurant.' },
  ],
};

export function HomePage() {
  const [requestOpen, setRequestOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(-1);
  const { lang } = useI18n();

  const s = lang === 'ar';
  const t = (ar: string, en: string) => s ? ar : en;
  const steps = STEPS[lang];
  const faqs = FAQS[lang];

  const bgCream = 'var(--bg)';
  const bgAlt = 'var(--surface-muted)';
  const bgTeal = 'var(--teal)';
  const ink = 'var(--ink)';
  const coral = 'var(--coral)';
  const sun = 'var(--sun)';
  const teal = 'var(--teal)';

  return (
    <div lang={lang} dir={s ? 'rtl' : 'ltr'} className="page-noise">
      <div className="page-glow" />
      <Nav />
      <main>

        {/* ====== HERO ====== */}
        <section className="relative min-h-[760px] overflow-hidden pb-16 pt-32 sm:pt-44" style={{ background: bgCream }}>
          <div className="page-grid absolute inset-0 opacity-50" />
          <div className="absolute -left-28 top-28" style={{ width: 288, height: 288, background: 'rgba(245,200,75,.45)', filter: 'blur(48px)', borderRadius: '50%' }} />
          <div className="absolute right-[-120px] top-[-80px]" style={{ width: 320, height: 320, background: 'rgba(237,107,76,.2)', filter: 'blur(48px)', borderRadius: '50%' }} />

          <div className="container relative">
            {/* Strip */}
            <div className="mb-8 flex flex-col gap-3 rounded-[22px] p-4 sm:flex-row sm:items-center sm:justify-between"
              style={{ background: ink, color: '#f8f0df', boxShadow: '6px 6px 0 var(--coral)' }}>
              <div className="flex items-center gap-3">
                <div className="grid place-items-center rounded-xl" style={{ width: 36, height: 36, background: sun, color: ink }}>
                  <Zap size={16} />
                </div>
                <div>
                  <b className="text-[12px] font-black block">{t('جاهز لمطعمك المستقل', 'Ready for your restaurant')}</b>
                  <small className="opacity-55" style={{ fontSize: 11 }}>{t('اشتراك واحد · بدون عمولة · $8.99 / شهر', 'One plan · No commission · $8.99 / month')}</small>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold" style={{ color: 'rgba(248,240,223,.75)' }}>
                {['QR', t('سلة', 'Cart'), 'WhatsApp'].map(tag => (
                  <span key={tag} className="rounded-full border px-2.5 py-1" style={{ borderColor: 'rgba(255,255,255,.15)' }}>{tag}</span>
                ))}
              </div>
            </div>

            {/* Hero grid */}
            <div className="grid gap-6 lg:grid-cols-[1fr_440px] lg:gap-12">
              <div>
                <div className="mb-7 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold"
                  style={{ background: 'rgba(248,240,223,.75)', borderColor: 'rgba(31,52,57,.15)', color: teal }}>
                  <span className="rounded-full" style={{ width: 8, height: 8, background: '#52a579' }} />
                  {t('منيوك جاهز للزحمة', 'Your menu, ready for the rush')} <span style={{ color: 'rgba(31,52,57,.25)' }}>/</span> Restivo
                </div>

                <h1 className="font-display font-black leading-[1.11] tracking-[-.045em] mb-4"
                  style={{ fontSize: 'clamp(2.6rem, 6vw, 4.6rem)', color: ink }}>
                  {t('من المسح إلى الطلب', 'From the scan to the order')}<br />
                  <em className="not-italic" style={{ color: coral, position: 'relative', display: 'inline-block' }}>
                    {t('في أقل من 30 ثانية', 'in under 30 seconds')}
                  </em>
                </h1>

                <p className="text-lg leading-[1.8]" style={{ color: 'rgba(31,52,57,.6)', maxWidth: '46ch' }}>
                  {t(
                    'امنح زبائنك قائمة رقمية سريعة وتجربة طلب عبر QR وطريقة سهلة لإرسال الطلبات مباشرة إلى مطعمك.',
                    'Digital menus and online ordering for independent restaurants. A page that feels like you, organized orders, and more time for what matters: the food and the guest.'
                  )}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link to="/app/" className="btn btn-primary">
                    {t('جرّب الديمو الحي', 'Try the live demo')} ←
                  </Link>
                  <button onClick={() => setRequestOpen(true)} className="font-bold py-3 px-2" style={{ color: ink, background: 'none', border: 'none', cursor: 'pointer' }}>
                    {t('ابدأ الآن', 'Get started')} →
                  </button>
                </div>
              </div>

              {/* Phone mockup */}
              <div className="relative mx-auto" style={{ maxWidth: 430 }}>
                <div className="absolute left-0 top-16 z-10 grid place-items-center rounded-2xl border rotate-[-12deg]"
                  style={{ width: 80, height: 80, background: '#f6e8c9', borderColor: 'rgba(31,52,57,.1)', boxShadow: '7px 8px 0 var(--ink)' }}>
                  <QrCode size={36} strokeWidth={1.4} style={{ color: ink }} />
                </div>
                <div className="float-slow absolute left-1/2 top-0 w-[276px] -translate-x-1/2 rounded-[38px] border-[7px] p-2.5"
                  style={{ borderColor: ink, background: '#f8f0df', boxShadow: '16px 20px 0 var(--sun)' }}>
                  <div className="h-full overflow-hidden rounded-[29px]" style={{ background: '#f1e4c9' }}>
                    <div className="relative overflow-hidden" style={{ height: 176 }}>
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #2f3f2e, #1a1f1c)', height: 176 }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(31,52,57,.45)' }} />
                        <div className="absolute bottom-4 right-5 text-right" style={{ color: '#f8f0df' }}>
                          <p className="text-[10px]" style={{ opacity: 0.8 }}>{lang === 'ar' ? 'مطعم مهند' : 'Mohand Restaurant'}</p>
                          <p className="font-display font-black leading-none" style={{ fontSize: 23 }}>
                            {lang === 'ar' ? 'منيو المطعم' : 'Live menu'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-t-[28px] px-4 pb-4 pt-5" style={{ background: '#f8f0df' }}>
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-[10px] font-bold" style={{ color: 'rgba(31,52,57,.5)' }}>MENU / 01</span>
                        <span className="rounded-full px-2 py-1 text-[9px] font-bold" style={{ background: '#dce8df', color: teal }}>
                          {t('مفتوح الآن', 'Open now')}
                        </span>
                      </div>
                      <div className="mb-4 flex gap-2 overflow-hidden text-[10px] font-bold">
                        <span className="rounded-full px-3 py-1.5" style={{ background: coral, color: '#fff4e4' }}>{t('الأكثر طلبًا', 'Popular')}</span>
                        <span className="rounded-full px-3 py-1.5" style={{ background: '#f1e4c9', color: 'rgba(31,52,57,.6)' }}>{t('قائمة', 'Menu')}</span>
                      </div>
                      {[
                        { name: lang === 'ar' ? 'برجر سموكي' : 'Smoky burger', price: '12.00', bg: '#d99156' },
                        { name: lang === 'ar' ? 'بطاطس بالجبنة' : 'Cheese fries', price: '6.50', bg: '#e7bd62' },
                        { name: lang === 'ar' ? 'ليمون ونعناع' : 'Lemon mint', price: '4.00', bg: '#8fae91' },
                      ].map(item => (
                        <div key={item.name} className="mb-2 flex items-center gap-2.5">
                          <div className="shrink-0 rounded-xl" style={{ width: 44, height: 44, background: item.bg }} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-bold" style={{ color: ink }}>{item.name}</p>
                            <p className="text-[10px]" style={{ color: 'rgba(31,52,57,.5)' }}>{t('طازج اليوم', 'Fresh today')}</p>
                          </div>
                          <span className="text-[10px] font-bold" style={{ color: coral }}>${item.price}</span>
                        </div>
                      ))}
                      <Link to="/app/"
                        className="mt-4 flex w-full items-center justify-between rounded-2xl px-3 py-3 text-[10px] font-bold"
                        style={{ background: ink, color: '#f8f0df' }}>
                        <span>{t('جرّب منيو المطعم', 'Try live restaurant')}</span>
                        <span className="rounded-lg px-2 py-1 text-[10px] font-black" style={{ background: sun, color: ink }}>↗</span>
                      </Link>
                    </div>
                  </div>
                </div>
                {/* Cart float */}
                <div className="absolute -bottom-2 right-0 z-20 hidden w-44 rotate-6 rounded-[22px] p-3 sm:block"
                  style={{ background: ink, color: '#f8f0df', boxShadow: '10px 12px 0 var(--coral)' }}>
                  <div className="mb-3 flex items-center justify-between text-[10px]">
                    <span className="opacity-60">{t('طلب جديد', 'New order')}</span>
                    <span className="rounded-full px-2 py-0.5 font-bold" style={{ background: sun, color: ink }}>{t('الآن', 'Now')}</span>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between"><span>{lang === 'ar' ? 'برجر سموكي' : 'Smoky burger'}</span><span>× 2</span></div>
                    <div className="flex justify-between font-black" style={{ color: sun }}><span>{t('المجموع', 'Total')}</span><span>$24</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====== TICKER ====== */}
        <section className="border-y py-5" style={{ background: ink, color: '#f8f0df', borderColor: 'rgba(255,255,255,.1)' }}>
          <div className="container flex items-center justify-between gap-7 overflow-hidden text-[12px] font-bold">
            {[
              t('لا عمولة على الطلب', 'No commission on orders'),
              t('بدون تطبيق للعميل', 'No app for guests'),
              t('صفحة بهوية مطعمك', 'A page in your identity'),
              t('اشتراك واحد واضح', 'One clear subscription'),
            ].map((item, i) => (
              <span key={i} className="whitespace-nowrap" style={{ opacity: i === 1 ? 1 : 0.55 }}>{item}</span>
            ))}
          </div>
        </section>

        {/* ====== STORY ====== */}
        <section className="py-20 sm:py-28" style={{ background: bgCream }}>
          <div className="container">
            <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:gap-16 items-center">
              <div className="relative min-h-[340px]">
                <div className="absolute inset-x-0 top-0 overflow-hidden rounded-[28px] border-8 border-current sm:left-10"
                  style={{ background: '#e5a55f', borderColor: ink, boxShadow: '10px 12px 0 var(--sun)' }}>
                  {/* Food table SVG */}
                  <svg viewBox="0 0 400 340" style={{ height: 310, width: '100%', display: 'block' }}>
                    <rect width="400" height="340" fill="#2f3f2e"/>
                    <ellipse cx="200" cy="280" rx="160" ry="40" fill="#1a1f1c"/>
                    <rect x="60" y="100" width="120" height="8" rx="4" fill="#c96f2a"/>
                    <rect x="80" y="80" width="80" height="24" rx="4" fill="#e8a34c"/>
                    <circle cx="120" cy="200" r="40" fill="#d99156"/>
                    <circle cx="120" cy="200" r="16" fill="#c73d18" opacity=".7"/>
                    <ellipse cx="200" cy="180" rx="60" ry="20" fill="#e5a55f"/>
                    <circle cx="280" cy="210" r="30" fill="#8fae91"/>
                    <circle cx="280" cy="210" r="12" fill="#27615f" opacity=".5"/>
                    <text x="200" y="300" textAnchor="middle" fill="#f8f0df" fontSize="12" opacity=".6">Restivo — Real food, clear ordering</text>
                  </svg>
                  <div className="absolute bottom-4 left-4 right-4 rounded-2xl px-4 py-3 text-xs font-black" style={{ background: 'rgba(248,240,223,.9)' }}>
                    {t('صورة حقيقية. تجربة أوضح.', 'Real food. Clearer ordering.')}
                  </div>
                </div>
                <div className="absolute -bottom-2 right-0 z-10 w-44 rotate-3 overflow-hidden rounded-[22px] border-8 sm:right-4"
                  style={{ borderColor: '#f8f0df', background: teal, boxShadow: '8px 9px 0 var(--coral)' }}>
                  <svg viewBox="0 0 176 88" style={{ height: 88, width: '100%', display: 'block' }}>
                    <rect width="176" height="88" fill="#27615f"/>
                    <rect x="20" y="15" width="136" height="8" rx="4" fill="#f8f0df" opacity=".3"/>
                    <rect x="20" y="30" width="100" height="8" rx="4" fill="#f8f0df" opacity=".2"/>
                    <rect x="20" y="45" width="120" height="8" rx="4" fill="#f8f0df" opacity=".25"/>
                    <text x="88" y="75" textAnchor="middle" fill="#f8f0df" fontSize="11" fontWeight="bold">Dashboard</text>
                  </svg>
                  <div className="px-3 py-2 text-[10px] font-bold" style={{ background: ink, color: '#f8f0df' }}>
                    {t('صاحب مطعم مستقل', 'Independent restaurant owner')}
                  </div>
                </div>
              </div>
              <div style={{ maxWidth: 560 }}>
                <span className="mb-5 block text-[11px] font-black tracking-[.2em]" style={{ color: coral }}>{t('من مطبخك إلى شاشة العميل', 'From your kitchen to their screen')}</span>
                <h2 className="font-display font-black leading-[1.12]" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', color: ink }}>
                  {t('خلّ الناس تشوف', 'Let people see')}<br />
                  <span style={{ color: teal }}>{t('اللي تقدمه فعلًا.', 'what you actually serve.')}</span>
                </h2>
                <p className="mt-6 max-w-[490px] text-[16px] leading-8" style={{ color: 'rgba(31,52,57,.6)' }}>
                  {t(
                    'الصورة الجيدة تفتح الشهية، والطلب المرتب يخلّي فريقك أسرع. Restivo يجمع الاثنين في تجربة واحدة تشبه مطعمك.',
                    'A good photo opens the appetite, and an organized order keeps your team moving. Restivo brings both into one experience that feels like your restaurant.'
                  )}
                </p>
                <div className="mt-8 flex items-center gap-3 border-t pt-5 text-xs font-bold" style={{ borderColor: 'rgba(31,52,57,.1)', color: 'rgba(31,52,57,.6)' }}>
                  <span className="grid place-items-center rounded-full" style={{ width: 36, height: 36, background: sun, color: ink }}>01</span>
                  {t('كل شيء يبدأ من مطبخك.', 'Everything starts in your kitchen.')}
                </div>
                <div className="mt-4 flex gap-3 flex-wrap">
                  <Link to="/app/" className="btn btn-primary">{t('جرّب الديمو الحي', 'Try the demo')}</Link>
                  <button onClick={() => setRequestOpen(true)} className="btn btn-outline">{t('ابدأ الآن', 'Get started')} →</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====== HOW IT WORKS ====== */}
        <section id="how-it-works" className="scroll-mt-10 py-24 sm:py-32" style={{ background: bgAlt }}>
          <div className="container">
            <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr] mb-16">
              <div>
                <span className="mb-5 block text-[11px] font-black tracking-[.2em]" style={{ color: coral }}>{t('الرحلة القصيرة', 'The short journey')}</span>
                <h2 className="font-display font-black leading-[1.15]" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: ink }}>
                  {t('ثلاث خطوات.', 'Three steps.')}<br />
                  <span style={{ color: teal }}>{t('ولا رسالة ضائعة.', 'No order lost.')}</span>
                </h2>
              </div>
              <p className="max-w-[470px] text-[16px] leading-8" style={{ color: 'rgba(31,52,57,.6)' }}>
                {t(
                  'كل شيء في Restivo مبني حول لحظة الطلب — من أول ما يلمح الضيف الـ QR إلى أن يصلك الطلب بصورته المفهومة.',
                  'Everything in Restivo is built around the ordering moment — from the first QR scan to the clear order that reaches your team.'
                )}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="border-t-2 pt-5" style={{ borderColor: 'rgba(31,52,57,.15)' }}>
                    <div className="mb-12 flex justify-between">
                      <span className="text-sm font-bold" style={{ color: 'rgba(31,52,57,.35)' }}>0{index + 1}</span>
                      <div className="grid place-items-center rounded-full" style={{ width: 48, height: 48, background: '#f8f0df', color: coral }}>
                        <Icon size={20} />
                      </div>
                    </div>
                    <h3 className="font-display text-2xl font-black" style={{ color: ink }}>{step.title}</h3>
                    <p className="mt-2 text-sm font-semibold" style={{ color: 'rgba(31,52,57,.55)' }}>{step.copy}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ====== FEATURES ====== */}
        <section id="features" className="scroll-mt-10 py-24 sm:py-32" style={{ background: bgCream }}>
          <div className="container">
            <div className="mb-14 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <span className="mb-5 block text-[11px] font-black tracking-[.2em]" style={{ color: coral }}>{t('مو بس منيو', 'More than a menu')}</span>
                <h2 className="font-display font-black leading-[1.16]" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: ink }}>
                  {t('الأدوات التي يحتاجها', 'The tools your')}<br />
                  <span style={{ color: coral }}>{t('مطعمك فعلًا.', 'restaurant actually needs.')}</span>
                </h2>
              </div>
              <p className="max-w-[280px] text-sm leading-7" style={{ color: 'rgba(31,52,57,.55)' }}>
                {t('خفف الزحمة عن فريقك، وخلي تجربة ضيفك على مزاجك.', 'Take the rush off your team and keep the guest experience in your hands.')}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                const content = feature[lang];
                const bgColors = ['#e8d6b7', '#dce8df', '#f3ded0', '#d8e0d4'];
                return (
                  <article key={feature.number}
                    className="min-h-[220px] rounded-[24px] p-7 sm:p-9"
                    style={{ background: bgColors[index] }}>
                    <div className="flex justify-between">
                      <span className="text-sm font-bold" style={{ color: 'rgba(31,52,57,.35)' }}>{feature.number}</span>
                      <div className="grid place-items-center rounded-2xl" style={{ width: 48, height: 48, background: ink, color: '#f8f0df' }}>
                        <Icon size={20} />
                      </div>
                    </div>
                    <div className="mt-12 max-w-[350px]">
                      <h3 className="font-display text-[24px] font-black" style={{ color: ink }}>{content.title}</h3>
                      <p className="mt-2 text-sm leading-7" style={{ color: 'rgba(31,52,57,.6)' }}>{content.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ====== DASHBOARD PREVIEW ====== */}
        <section className="overflow-hidden py-24 text-[#f8f0df] sm:py-32" style={{ background: teal }}>
          <div className="container">
            <div className="grid gap-14 lg:grid-cols-[1fr_.85fr] items-center">
              <div>
                <span className="mb-5 block text-[11px] font-black tracking-[.2em]" style={{ color: sun }}>{t('الوضوح يبيع', 'Clarity sells')}</span>
                <h2 className="max-w-[630px] font-display font-black leading-[1.12]" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}>
                  {t('كل طلب مرتب.', 'Every order organized.')}<br />
                  <span style={{ color: sun }}>{t('وكل قرار أوضح.', 'Every decision clearer.')}</span>
                </h2>
                <p className="mt-7 max-w-[470px] text-[16px] leading-8" style={{ color: 'rgba(248,240,223,.7)' }}>
                  {t('بدل ما تدور بين محادثات واتساب، شوف طلباتك في مكان واحد.', 'Stop digging through WhatsApp chats. See every order in one place.')}
                </p>
                <div className="mt-9 flex flex-wrap gap-3">
                  {[t('ملخص جاهز للإرسال', 'Ready-to-send summary'), t('تحديثات مباشرة', 'Live updates'), t('إحصائيات بسيطة', 'Simple stats')].map(item => (
                    <span key={item} className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold" style={{ borderColor: 'rgba(248,240,223,.2)' }}>
                      <Check size={12} style={{ color: sun }} />{item}
                    </span>
                  ))}
                </div>
              </div>
              {/* Dashboard mock */}
              <div className="relative min-h-[340px]">
                <div className="absolute right-0 top-8 w-[90%] rounded-[23px] border p-4 sm:p-6" style={{ background: ink, borderColor: 'rgba(248,240,223,.2)', boxShadow: '12px 15px 0 var(--sun)' }}>
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px]" style={{ color: 'rgba(248,240,223,.45)' }}>{t('لوحة المطعم', 'Restaurant dashboard')}</p>
                      <p className="font-display text-xl font-black">{t('اليوم، الثلاثاء ٢١ مايو', 'Today, Tuesday May 21')}</p>
                    </div>
                    <div className="grid place-items-center rounded-xl" style={{ width: 36, height: 36, background: sun, color: ink }}>
                      <LayoutDashboard size={16} />
                    </div>
                  </div>
                  <div className="mb-5 grid grid-cols-2 gap-2">
                    <div className="rounded-xl p-3" style={{ background: teal }}>
                      <p className="text-[10px]" style={{ color: 'rgba(248,240,223,.55)' }}>{t('طلبات اليوم', 'Today\'s orders')}</p>
                      <p className="mt-1 text-2xl font-black">47</p>
                      <p className="text-[10px]" style={{ color: sun }}>{t('+ 8 من أمس', '+ 8 from yesterday')}</p>
                    </div>
                    <div className="rounded-xl p-3" style={{ background: sun, color: ink }}>
                      <p className="text-[10px]" style={{ opacity: 0.6 }}>{t('الأكثر طلبًا', 'Most ordered')}</p>
                      <p className="mt-1 truncate text-sm font-black">{t('برجر سموكي', 'Smoky burger')}</p>
                      <p className="text-[10px]" style={{ opacity: 0.6 }}>{t('١٨ طلب', '18 orders')}</p>
                    </div>
                  </div>
                  {[t('جديد', 'New'), t('قيد التحضير', 'Preparing'), t('مكتمل', 'Complete')].map((label, i) => (
                    <div key={label} className="mb-2 flex items-center gap-3 rounded-xl p-3" style={{ background: 'rgba(248,240,223,.08)' }}>
                      <span className="rounded-full px-2 py-1 text-[10px] font-bold" style={{ background: i === 0 ? sun : i === 1 ? coral : teal, color: i === 0 ? ink : '#fff4e4' }}>
                        {label}
                      </span>
                      <span className="font-black">#A3F9K2</span>
                      <span className="mr-auto text-[10px]" style={{ color: sun }}>$24.50</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====== PRICING ====== */}
        <section id="pricing" className="scroll-mt-10 py-24 sm:py-32" style={{ background: bgCream }}>
          <div className="container">
            <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] items-center">
              <div>
                <span className="mb-5 block text-[11px] font-black tracking-[.2em]" style={{ color: coral }}>{t('ببساطة', 'Simple')}</span>
                <h2 className="font-display font-black leading-[1.12]" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', color: ink }}>
                  {t('خطة واحدة.', 'One plan.')}<br />
                  <span style={{ color: coral }}>{t('سعر واضح.', 'Clear price.')}</span>
                </h2>
                <p className="mt-6 max-w-[350px] text-sm leading-7" style={{ color: 'rgba(31,52,57,.6)' }}>
                  {t('كل ما تحتاجه لتبدأ استقبال الطلبات بشكل أرتب.', 'Everything you need to start taking orders cleanly.')}
                </p>
              </div>
              <div className="rounded-[28px] p-7 sm:p-10" style={{ background: ink, boxShadow: '9px 10px 0 var(--coral)' }}>
                <p className="text-sm font-bold" style={{ color: 'rgba(248,240,223,.55)' }}>{t('Restivo للمطاعم', 'Restivo for restaurants')}</p>
                <div className="mt-6 flex items-end gap-2">
                  <span className="text-6xl font-black">$8.99</span>
                  <span className="mb-2 text-sm" style={{ color: 'rgba(248,240,223,.5)' }}>{t('/ شهريًا', '/ month')}</span>
                </div>
                <div className="my-8 h-px" style={{ background: 'rgba(255,255,255,.15)' }} />
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    t('صفحة مطعم بهويتك', 'Restaurant page in your identity'),
                    t('QR menu قابل للطباعة', 'Printable QR menu'),
                    t('سلة طلب أونلاين', 'Online order cart'),
                    t('WhatsApp-ready summary', 'ملخص جاهز لـ WhatsApp'),
                    t('Dashboard للطلبات', 'Order dashboard'),
                    t('بدون عمولة', 'No commission'),
                  ].map(item => (
                    <div key={item} className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'rgba(248,240,223,.8)' }}>
                      <span className="grid place-items-center rounded-full shrink-0" style={{ width: 20, height: 20, background: teal }}>
                        <Check size={12} style={{ color: sun }} />
                      </span>
                      {item}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setRequestOpen(true)}
                  className="mt-9 flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-black"
                  style={{ background: coral, color: '#fff4e4' }}>
                  {t('اطلب صفحتك الآن', 'Get your page now')} <ArrowLeft size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ====== FAQ ====== */}
        <section id="faq" className="scroll-mt-10 py-24 sm:py-32" style={{ background: bgCream }}>
          <div className="container-sm">
            <div className="mb-12 text-center">
              <span className="mb-5 block text-[11px] font-black tracking-[.2em]" style={{ color: coral }}>{t('قبل أن تبدأ', 'Before you start')}</span>
              <h2 className="font-display font-black sm:text-[52px]" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: ink }}>
                {t('الأسئلة التي في بالك.', 'Questions on your mind.')}
              </h2>
            </div>
            <div className="border-t" style={{ borderColor: 'rgba(31,52,57,.15)' }}>
              {faqs.map((faq, index) => (
                <div key={faq.q} className="border-b" style={{ borderColor: 'rgba(31,52,57,.15)' }}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                    className="flex w-full items-center justify-between gap-5 py-5 text-right font-display text-lg font-bold"
                    style={{ color: ink }}
                    aria-expanded={openFaq === index}
                  >
                    <span>{faq.q}</span>
                    <span className="grid shrink-0 place-items-center rounded-full"
                      style={{ width: 32, height: 32, background: openFaq === index ? coral : '#f1e4c9', color: openFaq === index ? '#fff4e4' : ink }}>
                      {openFaq === index ? <Minus size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </button>
                  {openFaq === index && (
                    <p className="max-w-[650px] pb-6 text-sm leading-7" style={{ color: 'rgba(31,52,57,.6)' }}>{faq.a}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ====== FINAL CTA ====== */}
        <section className="py-24 text-center text-[#fff4e4] sm:py-32" style={{ background: coral }}>
          <div className="container">
            <Sparkles className="mx-auto mb-7" size={32} style={{ color: sun }} />
            <h2 className="font-display font-black leading-[1.15]" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
              {t('مطعمك يستحق', 'Your restaurant deserves')}<br />
              {t('منيو يشتغل.', 'a menu that works.')}
            </h2>
            <p className="mx-auto mt-6 max-w-[430px] text-[16px] leading-8" style={{ color: 'rgba(255,244,228,.75)' }}>
              {t('خلّ أول انطباع عن مطعمك يبدأ من المكان الصح.', 'Make your restaurant\'s first impression start in the right place.')}
            </p>
            <button
              onClick={() => setRequestOpen(true)}
              className="mt-9 inline-flex items-center gap-3 rounded-full px-7 py-4 text-sm font-black shadow-lg"
              style={{ background: '#f8f0df', color: ink, boxShadow: '6px 6px 0 #1f3439' }}>
              {t('اطلب صفحة مطعمك', 'Get your restaurant page')} <ArrowLeft size={16} />
            </button>
          </div>
        </section>
      </main>
      <Footer />

      {requestOpen && <RequestModal onClose={() => setRequestOpen(false)} />}

      {/* WhatsApp float */}
      <a
        href="https://wa.me/972567439846?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%20Restivo%20%E2%80%94%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%B5%D9%81%D8%AD%D8%A9%20%D9%84%D9%85%D8%B7%D8%B9%D9%85%D9%8A"
        target="_blank" rel="noopener"
        aria-label="WhatsApp"
        style={{ position: 'fixed', bottom: 18, insetInlineEnd: 18, zIndex: 60, width: 52, height: 52, borderRadius: '50%', background: '#25D366', display: 'grid', placeItems: 'center', boxShadow: '0 8px 24px rgba(0,0,0,.22)' }}>
        <span style={{ fontSize: 26 }}>💬</span>
      </a>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { useI18n } from '@/lib/i18n';
import { Check } from 'lucide-react';

export function FeaturesPage() {
  const { lang } = useI18n();
  const t = (ar: string, en: string) => lang === 'ar' ? ar : en;
  const bg = 'var(--bg)', alt = 'var(--surface-muted)', ink = 'var(--ink)', coral = 'var(--coral)', teal = 'var(--teal)', sun = 'var(--sun)';

  const features = [
    { title: t('قائمة رقمية', 'Digital Menu'), desc: t('أقسام وأصناف وأسعار وصور وتوفر. ميّز الشائع أو غير المتوفر.', 'Categories, items, prices, images, availability flag and popular badge.'), icon: '🍽️' },
    { title: t('قائمة QR', 'QR Code Menu'), desc: t('رابط واحد لكل مطعم مع QR قابل للطباعة. بدون تطبيق.', 'One link per restaurant + printable QR from dashboard. No app install.'), icon: '⛶' },
    { title: t('طلب أونلاين', 'Online Ordering'), desc: t('تصفح وسلة ودفع وفرز عبر الجوال، بدون حساب.', 'Customer adds to cart on phone, picks pickup or delivery, submits. Server computes totals.'), icon: '🛒' },
    { title: t('طلب واتساب', 'WhatsApp Ordering'), desc: t('طلب عبر الموقع أو رسالة واتساب جاهزة بنفس السلة.', 'Two flows: order via website (organized) or pre-filled wa.me message.'), icon: '💬' },
    { title: t('لوحة المطعم', 'Restaurant Dashboard'), desc: t('إدارة الأقسام والأصناف مع رفع الصور وتتبع مباشر.', 'Manage categories & items with image upload, edit availability, popular, price.'), icon: '📊' },
    { title: t('تحليلات', 'Analytics & QR'), desc: t('طلبات اليوم والإيراد والأصناف الأكثر مبيعًا.', 'Dashboard KPIs: orders today, pending, revenue, plus analytics and QR generator.'), icon: '📈' },
    { title: t('حجوزات طاولات', 'Table Bookings'), desc: t('الزبائن يحجزون طاولات بالتاريخ والوقت والعدد.', 'Customers book tables with date/time and count. You confirm or cancel.'), icon: '📅' },
    { title: t('إعدادات المطعم', 'Restaurant Settings'), desc: t('الشعار والغلاف والألوان وساعات العمل ورسوم التوصيل.', 'Logo, cover, brand colors, open hours, delivery fee — all customizable per restaurant.'), icon: '⚙️' },
  ];

  return (
    <div lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} className="page-noise">
      <div className="page-glow" />
      <Nav />
      <main>
        <section className="py-16 sm:py-20" style={{ background: bg }}>
          <div className="container">
            <h1 className="section-title text-center" style={{ color: ink }}>
              {t('مميزات حقيقية — لا شيء وهمي', 'Features that actually exist — no mockups')}
            </h1>
            <p className="text-center mt-4 max-w-[62ch] mx-auto" style={{ color: 'rgba(31,52,57,.6)' }}>
              {t('كل بطاقة أدناه هي قدرة موجودة فعلًا في المنصة.', 'Every card below is a real capability in the platform.')}
            </p>
          </div>
        </section>
        <section className="pb-16" style={{ background: alt, borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div className="container">
            <div className="grid gap-4 md:grid-cols-2 mt-2">
              {features.map((f, i) => (
                <div key={f.title} className="card" style={{ background: i % 3 === 0 ? 'var(--surface)' : i % 3 === 1 ? 'var(--teal-light)' : 'var(--surface)' }}>
                  <div className="flex items-start gap-3">
                    <span style={{ fontSize: 24 }}>{f.icon}</span>
                    <div>
                      <h3 className="font-bold text-lg mb-1" style={{ color: ink }}>{f.title}</h3>
                      <p className="text-sm" style={{ color: 'rgba(31,52,57,.6)' }}>{f.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex gap-3 justify-center flex-wrap">
              <Link to="/app/" className="btn btn-primary">{t('جرّب الديمو الحي', 'Try the demo')}</Link>
              <Link to="/#pricing" className="btn btn-outline">{t('انظر الأسعار', 'See pricing')}</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { useI18n } from '@/lib/i18n';
import { Check } from 'lucide-react';

export function PricingPage() {
  const { lang } = useI18n();
  const t = (ar: string, en: string) => lang === 'ar' ? ar : en;
  const ink = 'var(--ink)', coral = 'var(--coral)', sun = 'var(--sun)', teal = 'var(--teal)';

  const features = [
    t('صفحة مطعم بهويتك', 'Restaurant page in your identity'),
    t('QR menu قابل للطباعة', 'Printable QR menu'),
    t('سلة طلب أونلاين', 'Online order cart'),
    t('WhatsApp summary', 'WhatsApp-ready summary'),
    t('Dashboard للطلبات', 'Order dashboard'),
    t('بدون عمولة', 'No commission'),
    t('إحصائيات ومبيعات', 'Stats & sales'),
    t('تخصيص الألوان والشعار', 'Colors & logo'),
  ];

  return (
    <div lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} className="page-noise">
      <div className="page-glow" />
      <Nav />
      <main>
        <section className="py-16 sm:py-20" style={{ background: 'var(--bg)' }}>
          <div className="container">
            <h1 className="section-title text-center" style={{ color: ink }}>
              {t('سعر بسيط', 'Simple pricing')} — $8.99/{t('شهر', 'month')}
            </h1>
            <p className="text-center mt-4 max-w-[62ch] mx-auto" style={{ color: 'rgba(31,52,57,.6)' }}>
              {t('خطة واحدة. بدون عمولة. احتفظ بـ 100% من طلباتك.', 'One plan, everything included. No commission, no hidden fees.')}
            </p>
          </div>
        </section>

        <section style={{ background: 'var(--surface-muted)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div className="container py-16">
            <div className="mx-auto max-w-lg rounded-[28px] p-8 sm:p-10" style={{ background: ink, boxShadow: '9px 10px 0 var(--coral)' }}>
              <span className="text-sm font-bold" style={{ color: 'rgba(248,240,223,.55)' }}>Restivo</span>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-6xl font-black" style={{ color: '#f8f0df' }}>$8.99</span>
                <span className="mb-2 text-sm" style={{ color: 'rgba(248,240,223,.5)' }}>/{t('شهر', 'month')}</span>
              </div>
              <p className="mt-3 text-sm" style={{ color: 'rgba(248,240,223,.55)' }}>
                {t('احتفظ بـ 100% من طلباتك — بدون عمولة.', 'Keep 100% of your orders — no commission.')}
              </p>
              <div className="my-8 h-px" style={{ background: 'rgba(255,255,255,.15)' }} />
              <div className="space-y-3">
                {features.map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'rgba(248,240,223,.8)' }}>
                    <span className="grid place-items-center rounded-full shrink-0" style={{ width: 20, height: 20, background: teal }}>
                      <Check size={12} style={{ color: sun }} />
                    </span>
                    {f}
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-3">
                <Link to="/contact" className="btn btn-coral w-full justify-center">{t('اطلب صفحتك', 'Get your page')}</Link>
                <Link to="/app/" className="btn btn-outline w-full justify-center" style={{ borderColor: 'rgba(248,240,223,.2)', color: '#f8f0df' }}>{t('جرّب مجانًا', 'Try demo')}</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { useI18n } from '@/lib/i18n';

export function ContactPage() {
  const { lang } = useI18n();
  const t = (ar: string, en: string) => lang === 'ar' ? ar : en;

  return (
    <div lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} className="page-noise">
      <div className="page-glow" />
      <Nav />
      <main>
        <section className="py-16 sm:py-20" style={{ background: 'var(--bg)' }}>
          <div className="container">
            <h1 className="section-title" style={{ color: 'var(--ink)' }}>{t('تواصل معنا', 'Contact Us')}</h1>
            <p className="mt-4 max-w-[62ch]" style={{ color: 'rgba(31,52,57,.6)' }}>
              {t('واتسابنا جاهز للرد: +972567439846', 'WhatsApp us and we set up your restaurant in minutes.')}
            </p>
          </div>
        </section>
        <section style={{ background: 'var(--surface-muted)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div className="container py-16">
            <div className="mx-auto max-w-lg">
              <div className="card text-center">
                <h2 className="font-bold text-xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
                  WhatsApp: +972567439846
                </h2>
                <p className="text-sm mb-4" style={{ color: 'rgba(31,52,57,.6)' }}>
                  {t('سننشئ لك مطعمك + حسابك في دقائق.', 'We create your restaurant slug and admin account in minutes.')}
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <a
                    href="https://wa.me/972567439846?text=Hi%20Restivo%20—%20I%20want%20my%20restaurant%20online"
                    target="_blank" rel="noopener"
                    className="btn btn-coral">
                    💬 {t('راسل على واتساب', 'Message on WhatsApp')}
                  </a>
                  <Link to="/app/" className="btn btn-outline">{t('جرّب أولاً', 'View demo first')}</Link>
                </div>
              </div>
              <div className="mt-4 card">
                <h3 className="font-bold mb-3" style={{ color: 'var(--ink)' }}>{t('ما نحتاجه منك', 'What we need from you')}</h3>
                <ul className="space-y-2 text-sm" style={{ color: 'rgba(31,52,57,.7)', lineHeight: 1.8 }}>
                  <li>• {t('اسم المطعم + الرابط', 'Restaurant name + link')}</li>
                  <li>• {t('شعار وغلاف (اختياري)', 'Logo & cover (optional)')}</li>
                  <li>• {t('الأقسام والأصناف والأسعار', 'Categories + items + prices')}</li>
                  <li>• {t('رقم واتساب للطلبات', 'WhatsApp number for orders')}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

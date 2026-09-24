import React from 'react';
import { Link } from 'react-router';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { useI18n } from '@/lib/i18n';
import { ScanLine, MousePointer2, MessageCircle } from 'lucide-react';

export function HowItWorksPage() {
  const { lang } = useI18n();
  const t = (ar: string, en: string) => lang === 'ar' ? ar : en;

  const steps = [
    { icon: ScanLine, num: '01', title: t('أنشئ مطعمك', 'Create your restaurant'), desc: t('أضف شعارك وأقسامك ومنتجاتك وأسعارك. يستغرق ~10 دقائق.', 'Add logo, cover, categories, items and prices. Takes ~10 minutes.') },
    { icon: MousePointer2, num: '02', title: t('شارك قائمتك', 'Share your menu'), desc: t('استخدم رمز QR ورابط موقعك. يفتح على أي هاتف دون حساب.', 'Share the link on socials or print QR for tables. One link works everywhere.') },
    { icon: MessageCircle, num: '03', title: t('استلم الطلبات', 'Receive orders'), desc: t('يتصفح الزبائن ويبني السلة ويرسل الطلب. تديره في لوحة التحكم.', 'Customer builds cart and submits. You get instant alert in dashboard + WhatsApp.') },
  ];

  const flow = lang === 'ar' ? ['QR', '→', 'قائمة', '→', 'سلة', '→', 'طلب + واتساب'] : ['QR', '→', 'Menu', '→', 'Cart', '→', 'Order + WhatsApp'];

  return (
    <div lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} className="page-noise">
      <div className="page-glow" />
      <Nav />
      <main>
        <section className="py-16 sm:py-20" style={{ background: 'var(--bg)' }}>
          <div className="container">
            <h1 className="section-title text-center" style={{ color: 'var(--ink)' }}>
              {t('كيف Restivo يعمل', 'How Restivo works')}
            </h1>
            <p className="text-center mt-4 max-w-[62ch] mx-auto" style={{ color: 'rgba(31,52,57,.6)' }}>
              {t('ثلاث خطوات من المسح إلى الطلب — تُفهم في ثوانٍ.', 'Three steps from scan to order — understood in seconds.')}
            </p>
          </div>
        </section>

        <section style={{ background: 'var(--surface-muted)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div className="container py-16">
            <div className="grid gap-4 md:grid-cols-3">
              {steps.map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.num} className="card">
                    <div className="mb-6 flex justify-between items-center">
                      <span className="font-black text-lg" style={{ color: 'rgba(31,52,57,.35)' }}>{s.num}</span>
                      <div className="grid place-items-center rounded-full" style={{ width: 48, height: 48, background: 'var(--coral)', color: '#fff4e4' }}>
                        <Icon size={20} />
                      </div>
                    </div>
                    <h3 className="font-display text-xl font-black mb-2" style={{ color: 'var(--ink)' }}>{s.title}</h3>
                    <p className="text-sm" style={{ color: 'rgba(31,52,57,.6)' }}>{s.desc}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-2 text-sm font-bold" style={{ color: 'rgba(31,52,57,.5)' }}>
              {flow.map((item, i) => (
                <span key={i} className={i % 2 === 1 ? 'text-[var(--coral)]' : ''}>{item}</span>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link to="/app/" className="btn btn-primary">{t('جرّب الآن', 'Try now')}</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

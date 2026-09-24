import React from 'react';
import { Link } from 'react-router';
import { useI18n } from '@/lib/i18n';

export function LeadsPage() {
  const { lang, t } = useI18n();
  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--ink)', color: '#f8f0df', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" className="font-display font-black text-xl" style={{ color: '#f8f0df', textDecoration: 'none' }}>Restivo</Link>
      </header>
      <main className="container mt-6">
        <div className="card">
          <h1 className="section-title mb-4" style={{ fontSize: '1.5rem' }}>{t('leadsTitle')}</h1>
          <Link to="/login" className="btn btn-primary">{t('signIn')}</Link>
        </div>
      </main>
    </div>
  );
}

export function OffersPage() {
  const { lang, t } = useI18n();
  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--ink)', color: '#f8f0df', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" className="font-display font-black text-xl" style={{ color: '#f8f0df', textDecoration: 'none' }}>Restivo</Link>
      </header>
      <main className="container mt-6">
        <div className="card">
          <h1 className="section-title mb-4" style={{ fontSize: '1.5rem' }}>{t('offerTitle')}</h1>
          <Link to="/login" className="btn btn-primary">{t('signIn')}</Link>
        </div>
      </main>
    </div>
  );
}

export function OfferPage() {
  const { lang } = useI18n();
  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--ink)', color: '#f8f0df', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" className="font-display font-black text-xl" style={{ color: '#f8f0df', textDecoration: 'none' }}>Restivo</Link>
      </header>
      <main className="container mt-6">
        <div className="card">
          <p style={{ color: 'var(--muted)' }}>{lang === 'ar' ? 'العروض' : 'Offers'}</p>
        </div>
      </main>
    </div>
  );
}

export function NotFoundPage() {
  const { lang } = useI18n();
  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, textAlign: 'center', padding: 24 }}>
      <h1 className="font-display font-black" style={{ fontSize: 'clamp(4rem, 15vw, 8rem)', color: 'var(--coral)', lineHeight: 1 }}>404</h1>
      <p className="text-lg" style={{ color: 'var(--ink)' }}>{lang === 'ar' ? 'الصفحة غير موجودة' : 'Page not found'}</p>
      <Link to="/" className="btn btn-primary">{lang === 'ar' ? 'العودة للرئيسية' : 'Back to home'}</Link>
    </div>
  );
}

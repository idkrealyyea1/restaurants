import React, { useEffect } from 'react';
import { Link, Navigate } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { api } from '@/lib/api';

export function DeliveryPage() {
  const { lang, t } = useI18n();
  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--ink)', color: '#f8f0df', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" className="font-display font-black text-xl" style={{ color: '#f8f0df', textDecoration: 'none' }}>Restivo</Link>
        <span className="badge">{t('deliveryTitle')}</span>
      </header>
      <main className="container mt-6">
        <div className="card">
          <h1 className="section-title mb-4" style={{ fontSize: '1.5rem' }}>{t('deliveryGroups')}</h1>
          <p className="small" style={{ color: 'var(--muted)' }}>
            {lang === 'ar'
              ? 'هذه الصفحة للفريق — تحتاج إلى تسجيل الدخول.'
              : 'This page is for delivery staff — requires sign-in.'}
          </p>
          <Link to="/login" className="btn btn-primary mt-4">{t('signIn')}</Link>
        </div>
      </main>
    </div>
  );
}

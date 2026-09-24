import React from 'react';
import { Link } from 'react-router';
import { Logo } from './Logo';
import { useI18n } from '@/lib/i18n';

export function Footer() {
  const { t, lang } = useI18n();
  return (
    <footer style={{ background: 'var(--ink)', color: '#f8f0df' }}>
      <div className="container py-10">
        <div className="flex flex-wrap justify-between gap-8" style={{ alignItems: 'flex-end' }}>
          <div>
            <Logo light />
            <p className="small mt-4" style={{ color: 'rgba(248,240,223,.45)' }}>
              {t('footNote')}
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-xs font-bold" style={{ color: 'rgba(248,240,223,.55)' }}>
            <Link to="/features" style={{ color: 'inherit' }}>{t('navFeatures')}</Link>
            <Link to="/#how-it-works" style={{ color: 'inherit' }}>{t('navHow')}</Link>
            <Link to="/#pricing" style={{ color: 'inherit' }}>{t('navPricing')}</Link>
            <Link to="/app/" style={{ color: 'inherit' }}>{t('navLive')}</Link>
            <Link to="/contact" style={{ color: 'inherit' }}>{t('contactLink')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

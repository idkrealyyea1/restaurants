import React, { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Logo } from './Logo';
import { LanguageToggle } from './LanguageToggle';
import { useI18n } from '@/lib/i18n';
import { Menu, X } from 'lucide-react';

interface NavProps {
  showCTA?: boolean;
  ctaText?: string;
  ctaHref?: string;
  onTryLive?: () => void;
}

export function Nav({ showCTA = true, ctaText, ctaHref, onTryLive }: NavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, lang } = useI18n();
  const location = useLocation();

  const links = [
    { to: '/#how-it-works', label: t('navHow') },
    { to: '/#features', label: t('navFeatures') },
    { to: '/#pricing', label: t('navPricing') },
    { to: '/app/', label: t('navLive') },
  ];

  return (
    <>
      <nav
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(248,240,223,.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="container flex items-center justify-between" style={{ minHeight: 68 }}>
          <Logo />

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6" role="navigation">
            {links.map(link => (
              <Link
                key={link.to}
                to={link.to}
                style={{ color: 'rgba(31,52,57,.65)', fontWeight: 700, fontSize: '.88rem' }}
                className="transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="btn btn-outline btn-sm"
              style={{ color: 'var(--ink)' }}
            >
              {t('signIn')}
            </Link>
            {showCTA && (
              <Link
                to="/app/"
                className="rounded-full px-5 py-2.5 text-sm font-bold transition-all hover:brightness-110"
                style={{ background: 'var(--ink)', color: '#f8f0df', boxShadow: '5px 5px 0 var(--coral)' }}
              >
                {ctaText || (lang === 'ar' ? 'جرّب المطعم' : 'Try live restaurant')}
              </Link>
            )}
          </div>

          {/* Mobile */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageToggle />
            <button
              type="button"
              onClick={() => setMobileOpen(v => !v)}
              className="grid place-items-center rounded-full"
              style={{ width: 44, height: 44, background: 'var(--ink)', color: '#f8f0df' }}
              aria-label="Menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div
            className="md:hidden mx-4 rounded-2xl border p-4 mb-4"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: '0 8px 32px rgba(30,45,48,.12)' }}
          >
            <div className="flex flex-col gap-1">
              {links.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3 font-bold transition-colors hover:bg-[var(--surface-muted)]"
                  style={{ color: 'var(--ink)' }}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-4 py-3 font-bold transition-colors hover:bg-[var(--surface-muted)]"
                style={{ color: 'var(--ink)' }}
              >
                {t('signIn')}
              </Link>
              <Link
                to="/app/"
                onClick={() => setMobileOpen(false)}
                className="mt-2 rounded-xl px-4 py-3 font-bold text-center"
                style={{ background: 'var(--coral)', color: '#fff4e4' }}
              >
                {lang === 'ar' ? 'جرّب المطعم' : 'Try live restaurant'}
              </Link>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}

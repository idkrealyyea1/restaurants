import React from 'react';
import { Link } from 'react-router';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { useI18n } from '@/lib/i18n';

interface IndustryPageProps {
  title: string;
  subtitle: string;
  whyTitle: string;
  bullets: { bold: string; text: string }[];
  perfectFor: string;
  example?: string;
  relatedPages: { href: string; label: string }[];
}

export function IndustryPage({
  title, subtitle, whyTitle, bullets, perfectFor, example, relatedPages,
}: IndustryPageProps) {
  const { lang } = useI18n();

  return (
    <div lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} className="page-noise">
      <div className="page-glow" />
      <Nav />
      <main>
        <section className="py-16 sm:py-20" style={{ background: 'var(--bg)' }}>
          <div className="container">
            <h1 className="section-title" style={{ color: 'var(--ink)' }}>{title}</h1>
            <p className="mt-4 max-w-[62ch]" style={{ color: 'rgba(31,52,57,.6)' }}>{subtitle}</p>
          </div>
        </section>
        <section style={{ background: 'var(--surface-muted)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div className="container py-16">
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h2 className="section-title mb-6" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', color: 'var(--ink)' }}>{whyTitle}</h2>
                <ul className="space-y-3" style={{ lineHeight: 1.8 }}>
                  {bullets.map((b, i) => (
                    <li key={i} className="text-sm" style={{ color: 'rgba(31,52,57,.7)' }}>
                      <b style={{ color: 'var(--ink)' }}>{b.bold}</b> — {b.text}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex gap-3 flex-wrap">
                  <Link to="/app/" className="btn btn-primary">{lang === 'ar' ? 'شاهد الديمو' : 'See demo'}</Link>
                  <Link to="/#pricing" className="btn btn-outline">{lang === 'ar' ? 'الأسعار' : 'Pricing'}</Link>
                </div>
              </div>
              <div className="card self-start">
                <h3 className="font-bold mb-3" style={{ color: 'var(--ink)' }}>{lang === 'ar' ? 'مثالي لـ' : 'Perfect for'}</h3>
                <p className="text-sm mb-3" style={{ color: 'rgba(31,52,57,.6)' }}>{perfectFor}</p>
                {example && (
                  <p className="text-xs" style={{ color: 'rgba(31,52,57,.5)' }}>{example}</p>
                )}
              </div>
            </div>
            {relatedPages.length > 0 && (
              <nav className="mt-8 flex gap-3 flex-wrap">
                {relatedPages.map(p => (
                  <Link key={p.href} to={p.href} className="btn btn-outline btn-sm">{p.label} →</Link>
                ))}
              </nav>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

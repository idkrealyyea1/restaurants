import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { useI18n } from '@/lib/i18n';
import { api, fmtMoney } from '@/lib/api';

interface Restaurant {
  slug: string;
  name: string;
  description?: string;
  coverPath?: string;
  logoPath?: string;
  openNow: boolean;
  itemCount: number;
}

export function AppPage() {
  const { lang, t } = useI18n();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<{ restaurants: Restaurant[] }>('/api/restaurants')
      .then(data => setRestaurants(data.restaurants || []))
      .catch(() => setError(t('error')))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? restaurants.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        (r.description || '').toLowerCase().includes(search.toLowerCase())
      )
    : restaurants;

  return (
    <div lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <header className="topbar">
        <div className="container flex-between" style={{ minHeight: 60 }}>
          <span className="font-display font-black text-xl" style={{ color: 'var(--ink)' }}>Restivo</span>
          <div className="flex gap-2">
            <Link to="/track" className="btn btn-outline btn-sm">{t('trackAnOrder')}</Link>
            <Link to="/login" className="btn btn-outline btn-sm">{t('signIn')}</Link>
          </div>
        </div>
      </header>

      <main className="container mt-6">
        <section className="home-hero">
          <span className="home-eye">{t('homeEyebrow')}</span>
          <h1 className="section-title">{t('homeTitle')}</h1>
          <p className="mt-2" style={{ color: 'var(--muted)', maxWidth: '60ch', lineHeight: 1.8 }}>
            {t('homeDesc')}
          </p>
        </section>

        <div className="flex-between mb-4 mt-6">
          <h2 className="section-title" style={{ fontSize: '1.4rem' }}>{t('homeRestH')}</h2>
          <input
            className="search-input"
            type="text"
            placeholder={t('searchRest')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 14px', border: '2px solid var(--border)', borderRadius: '12px', background: 'var(--surface-muted)', outline: 'none', fontSize: '0.875rem', width: 200 }}
          />
        </div>

        {loading && (
          <div className="page-loading" style={{ minHeight: 200 }}>
            <div className="page-loading-spinner" />
          </div>
        )}

        {error && (
          <div className="card text-center mt-4" style={{ background: 'rgba(237,107,76,.1)', borderColor: 'var(--coral)' }}>
            <p style={{ color: 'var(--coral)', fontWeight: 700 }}>{error}</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <p>{restaurants.length === 0 ? t('noRests') : t('searchRest')}</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="rest-grid mt-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filtered.map(r => (
              <Link key={r.slug} to={`/restaurant/${encodeURIComponent(r.slug)}`} className="rest-card" style={{ display: 'block', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface)', textDecoration: 'none', transition: 'transform .2s, box-shadow .2s' }}>
                <div className="rest-cover" style={{ position: 'relative', height: 140, background: '#e5a55f' }}>
                  {r.coverPath
                    ? <img src={r.coverPath} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div className="rest-cover-fallback" style={{ display: 'grid', placeItems: 'center', height: '100%', fontSize: '2rem', fontWeight: 900, color: '#f8f0df', background: 'linear-gradient(135deg, #2f3f2e, #1a1f1c)' }}>{(r.name || '?').charAt(0)}</div>
                  }
                  <span className={`badge ${r.openNow ? 'badge-open' : ''}`} style={{ position: 'absolute', top: 8, insetInlineStart: 8 }}>
                    {r.openNow ? t('openNow') : t('closed')}
                  </span>
                </div>
                <div className="p-4">
                  {r.logoPath && <img src={r.logoPath} alt="" loading="lazy" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', marginBottom: 8 }} />}
                  <h3 className="font-bold" style={{ color: 'var(--ink)' }}>{r.name}</h3>
                  {r.description && <p className="small truncate mt-1" style={{ color: 'var(--muted)' }}>{r.description}</p>}
                  <div className="flex-between mt-3">
                    <span className="small" style={{ color: 'var(--muted)' }}>{r.itemCount} {t('itemsCount')}</span>
                    <span className="btn btn-sm" style={{ background: 'var(--primary)', color: '#fff', borderRadius: '50%', width: 36, height: 36, display: 'grid', placeItems: 'center', padding: 0 }}>→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <p className="footer-note mt-8 text-center small" style={{ color: 'var(--muted)' }}>
          <a href="/login">{t('footerOwner')}</a>
        </p>
      </main>

      <style>{`
        .topbar { background: var(--surface); border-bottom: 1px solid var(--border); }
        .home-hero { text-align: start; margin-bottom: 8px; }
        .home-eye { font-size: .8rem; font-weight: 700; color: var(--teal); display: block; margin-bottom: 6px; letter-spacing: .05em; }
        .home-hero h1 { font-family: var(--font-display); font-weight: 800; letter-spacing: -.04em; }
      `}</style>
    </div>
  );
}

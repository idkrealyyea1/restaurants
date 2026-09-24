import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { api, toast } from '@/lib/api';

export function LoginPage() {
  const { lang, t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ user: any }>('/api/auth/me')
      .then(data => {
        if (data.user) {
          const dest = data.user.role === 'owner' || data.user.role === 'admin' ? '/admin' : '/owner';
          navigate(dest);
        }
      })
      .catch(() => {});
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/api/auth/login', { email, password });
      const me = await api.get<{ user: any }>('/api/auth/me');
      const dest = me.user?.role === 'owner' || me.user?.role === 'admin' ? '/admin' : '/owner';
      navigate(dest);
    } catch (err: any) {
      setError(t('loginError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <Link to="/" className="font-display font-black text-2xl block text-center mb-8" style={{ color: 'var(--ink)', textDecoration: 'none' }}>
          Restivo
        </Link>
        <div className="card">
          <h1 className="section-title mb-6" style={{ fontSize: '1.5rem' }}>{t('loginTitle')}</h1>
          <form onSubmit={login} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-bold" style={{ color: 'var(--muted)' }}>{t('loginEmail')}</span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{ width: '100%', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: '12px', background: 'var(--surface-muted)', outline: 'none', fontSize: '.9rem', fontFamily: 'inherit' }}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold" style={{ color: 'var(--muted)' }}>{t('loginPassword')}</span>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ width: '100%', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: '12px', background: 'var(--surface-muted)', outline: 'none', fontSize: '.9rem', fontFamily: 'inherit' }}
              />
            </label>
            {error && <p style={{ color: 'var(--coral)', fontWeight: 700, fontSize: '.85rem' }}>{error}</p>}
            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center" style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? t('loading') : t('loginBtn')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

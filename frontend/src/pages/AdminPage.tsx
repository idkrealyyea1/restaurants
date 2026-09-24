import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { api, toast, fmtMoney, STATUS_LABELS } from '@/lib/api';

interface User { id: number; email: string; role: string; isActive: boolean; createdAt: string; }
interface Restaurant { id: number; name: string; slug: string; isActive: boolean; itemCount: number; orderCount: number; revenueCents: number; subscriptionEndsAt?: string; }
interface Order { id: number; code: string; status: string; totalCents: number; customerName: string; orderType: string; createdAt: string; restaurantName: string; }

export function AdminPage() {
  const { lang, t } = useI18n();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState<'overview' | 'restaurants' | 'orders' | 'users'>('overview');
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    api.get<{ user: User }>('/api/auth/me')
      .then(data => {
        if (!data.user) { navigate('/login'); return; }
        if (data.user.role !== 'owner' && data.user.role !== 'admin') { navigate('/owner'); return; }
        setUser(data.user);
        if (data.user.role === 'owner' || data.user.role === 'admin') {
          api.get<{ restaurants: Restaurant[] }>('/api/owner/restaurants').then(d => setRestaurants(d.restaurants || [])).catch(() => {});
        }
      })
      .catch(() => navigate('/login'))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    await api.post('/api/auth/logout').catch(() => {});
    navigate('/login');
  }

  if (loading) return <div className="page-loading"><div className="page-loading-spinner" /></div>;
  if (!user) return null;

  const roleLabel = user.role === 'owner' ? (lang === 'ar' ? 'مالك المنصة' : 'Platform Owner') : (lang === 'ar' ? 'مدير' : 'Admin');

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--ink)', color: '#f8f0df', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div className="flex items-center gap-4">
          <Link to="/" className="font-display font-black text-xl" style={{ color: '#f8f0df', textDecoration: 'none' }}>Restivo</Link>
          <span className="badge" style={{ background: 'rgba(255,255,255,.15)', color: '#f8f0df', borderColor: 'transparent' }}>{roleLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/owner" className="btn btn-sm" style={{ background: 'rgba(255,255,255,.15)', color: '#f8f0df', border: 'none' }}>
            {t('ownerOverview')}
          </Link>
          <span className="small" style={{ opacity: 0.7 }}>{user.email}</span>
          <button onClick={logout} className="btn btn-sm" style={{ background: 'rgba(255,255,255,.15)', color: '#f8f0df', border: 'none' }}>{t('logout')}</button>
        </div>
      </header>

      <div className="container mt-6 pb-16">
        <h1 className="section-title mb-6">{t('adminTitle')}</h1>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: lang === 'ar' ? 'المطاعم' : 'Restaurants', value: restaurants.length },
            { label: lang === 'ar' ? 'المطاعم النشطة' : 'Active', value: restaurants.filter(r => r.isActive).length },
            { label: lang === 'ar' ? 'إجمالي الإيراد' : 'Revenue', value: fmtMoney(restaurants.reduce((s, r) => s + (r.revenueCents || 0), 0)) },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center' }}>
              <p className="small" style={{ color: 'var(--muted)' }}>{s.label}</p>
              <p className="font-black text-2xl mt-1" style={{ color: 'var(--ink)' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {([
            ['overview', t('overview')],
            ['restaurants', t('restaurantList')],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="btn"
              style={tab === key ? { background: 'var(--ink)', color: '#f8f0df' } : { background: 'var(--surface)', border: '2px solid var(--border)' }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="card">
            <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--ink)' }}>{t('overview')}</h2>
            <p className="small" style={{ color: 'var(--muted)' }}>
              {lang === 'ar' ? 'مرحبًا بك في لوحة تحكم المنصة.' : 'Welcome to the platform admin dashboard.'}
            </p>
            <div className="mt-4" style={{ display: 'grid', gap: 10 }}>
              <Link to="/owner" className="btn btn-primary">{t('restaurantRequests')}</Link>
            </div>
          </div>
        )}

        {tab === 'restaurants' && (
          <div>
            <div className="flex-between mb-4">
              <h2 className="font-bold" style={{ color: 'var(--ink)' }}>{t('restaurantList')}</h2>
            </div>
            {restaurants.length === 0 ? (
              <div className="empty-state card">{lang === 'ar' ? 'لا توجد مطاعم' : 'No restaurants'}</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                      <th>Slug</th>
                      <th>{lang === 'ar' ? 'الأصناف' : 'Items'}</th>
                      <th>{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th>{lang === 'ar' ? 'الإيراد' : 'Revenue'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restaurants.map(r => (
                      <tr key={r.id}>
                        <td className="font-bold">{r.name}</td>
                        <td><span style={{ fontFamily: 'monospace', fontSize: '.85rem' }}>/restaurant/{r.slug}</span></td>
                        <td>{r.itemCount || 0}</td>
                        <td>
                          <span className={`badge ${r.isActive ? 'badge-open' : ''}`}>
                            {r.isActive ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'غير نشط' : 'Inactive')}
                          </span>
                        </td>
                        <td>{r.revenueCents ? fmtMoney(r.revenueCents) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { api, toast, fmtMoney, STATUS_LABELS } from '@/lib/api';

interface User { id: number; email: string; role: string; isActive: boolean; createdAt: string; }
interface Restaurant { id: number; name: string; slug: string; isActive: boolean; itemCount: number; orderCount: number; revenueCents: number; }
interface Order { id: number; code: string; status: string; totalCents: number; customerName: string; orderType: string; createdAt: string; restaurantName: string; }
interface RequestItem { id: number; code: string; customerName: string; restaurantName: string; phone: string; whatsapp: string; city: string; notes: string; status: string; createdAt: string; }

export function OwnerPage() {
  const { lang, t } = useI18n();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState<'overview' | 'requests' | 'settings'>('overview');
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ user: User }>('/api/auth/me')
      .then(data => {
        if (!data.user) { navigate('/login'); return; }
        if (data.user.role !== 'owner' && data.user.role !== 'staff') { navigate('/admin'); return; }
        setUser(data.user);
      })
      .catch(() => navigate('/login'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.role === 'owner') {
      api.get<{ requests: RequestItem[] }>('/api/owner/restaurant-requests')
        .then(d => setRequests(d.requests || []))
        .catch(() => {});
    }
  }, [user]);

  async function logout() {
    await api.post('/api/auth/logout').catch(() => {});
    navigate('/login');
  }

  if (loading) return <div className="page-loading"><div className="page-loading-spinner" /></div>;
  if (!user) return null;

  const pending = requests.filter(r => r.status === 'pending').length;

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Topbar */}
      <header style={{ background: 'var(--ink)', color: '#f8f0df', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div className="flex items-center gap-4">
          <Link to="/" className="font-display font-black text-xl" style={{ color: '#f8f0df', textDecoration: 'none' }}>Restivo</Link>
          <span className="badge" style={{ background: 'rgba(255,255,255,.15)', color: '#f8f0df', borderColor: 'transparent' }}>
            {user.role === 'owner' ? (lang === 'ar' ? 'مالك' : 'Owner') : (lang === 'ar' ? 'فريق' : 'Staff')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="small" style={{ opacity: 0.7 }}>{user.email}</span>
          <button onClick={logout} className="btn btn-sm" style={{ background: 'rgba(255,255,255,.15)', color: '#f8f0df', border: 'none' }}>
            {t('logout')}
          </button>
        </div>
      </header>

      <div className="container mt-6 pb-16">
        <h1 className="section-title mb-6">{t('dashboard')}</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {([
            ['overview', t('overview')],
            ['requests', t('restaurantRequests') + (pending > 0 ? ` (${pending})` : '')],
            ['settings', t('settings')],
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

        {/* Overview */}
        {tab === 'overview' && <OwnerOverview />}

        {/* Requests */}
        {tab === 'requests' && user.role === 'owner' && (
          <RequestsTab requests={requests} setRequests={setRequests} />
        )}
        {tab === 'requests' && user.role !== 'owner' && (
          <p style={{ color: 'var(--muted)' }}>{lang === 'ar' ? 'غير مصرح' : 'Unauthorized'}</p>
        )}

        {/* Settings */}
        {tab === 'settings' && (
          <div className="card max-w-lg">
            <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--ink)' }}>{t('settings')}</h2>
            <p className="small" style={{ color: 'var(--muted)' }}>
              {lang === 'ar' ? 'إعدادات المنصة في لوحة المالك.' : 'Platform settings in owner panel.'}
            </p>
            <Link to="/admin" className="btn btn-primary mt-4">{lang === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</Link>
          </div>
        )}
      </div>
    </div>
  );
}

function OwnerOverview() {
  const [stats, setStats] = useState<{ restaurants: number; ordersToday: number; revenueToday: number; pending: number }>({ restaurants: 0, ordersToday: 0, revenueToday: 0, pending: 0 });
  useEffect(() => {
    api.get('/api/owner/overview').then((d: any) => setStats(d)).catch(() => {});
  }, []);
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'المطاعم', value: stats.restaurants },
          { label: 'طلبات اليوم', value: stats.ordersToday },
          { label: 'الإيراد', value: stats.revenueToday > 0 ? fmtMoney(stats.revenueToday) : '—' },
          { label: 'قيد الانتظار', value: stats.pending },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center' }}>
            <p className="small" style={{ color: 'var(--muted)' }}>{s.label}</p>
            <p className="font-black text-2xl mt-1" style={{ color: 'var(--ink)' }}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequestsTab({ requests, setRequests }: { requests: RequestItem[]; setRequests: (r: RequestItem[]) => void }) {
  const { lang, t } = useI18n();
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = statusFilter ? requests.filter(r => r.status === statusFilter) : requests;

  async function updateStatus(id: number, status: string) {
    try {
      await api.patch(`/api/owner/restaurant-requests/${id}`, { status });
      setRequests(requests.map(r => r.id === id ? { ...r, status } : r));
    } catch { toast(lang === 'ar' ? 'حدث خطأ' : 'Error', 'error'); }
  }

  async function deleteRequest(id: number) {
    if (!confirm(lang === 'ar' ? 'حذف هذا الطلب؟' : 'Delete this request?')) return;
    try {
      await api.del(`/api/owner/restaurant-requests/${id}`);
      setRequests(requests.filter(r => r.id !== id));
    } catch { toast(lang === 'ar' ? 'حدث خطأ' : 'Error', 'error'); }
  }

  return (
    <div>
      <div className="flex-between mb-4">
        <h2 className="font-bold" style={{ color: 'var(--ink)' }}>{t('restaurantRequests')}</h2>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="badge" style={{ cursor: 'pointer', border: '2px solid var(--border)', background: 'var(--surface)', padding: '6px 12px', fontSize: '.8rem' }}>
          <option value="">الكل</option>
          <option value="pending">قيد الانتظار</option>
          <option value="contacted">تم التواصل</option>
          <option value="approved">موافق</option>
          <option value="rejected">مرفوض</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state card">
          <p>{lang === 'ar' ? 'لا توجد طلبات' : 'No requests yet'}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                <th>{lang === 'ar' ? 'المطعم' : 'Restaurant'}</th>
                <th>{lang === 'ar' ? 'الهاتف' : 'Phone'}</th>
                <th>{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                <th>WhatsApp</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td><span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{r.code}</span></td>
                  <td>{r.customerName}</td>
                  <td>{r.restaurantName}</td>
                  <td dir="ltr">{r.phone}</td>
                  <td>
                    <select
                      value={r.status}
                      onChange={e => updateStatus(r.id, e.target.value)}
                      className="badge"
                      style={{ cursor: 'pointer', border: '2px solid var(--border)', background: 'var(--surface)', fontSize: '.75rem', padding: '2px 8px' }}
                    >
                      <option value="pending">Pending</option>
                      <option value="contacted">Contacted</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                  <td>
                    {r.whatsapp && (
                      <a href={`https://wa.me/${r.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener" className="btn btn-sm" style={{ background: '#25D366', color: '#fff', border: 'none', padding: '4px 10px', fontSize: '.7rem' }}>
                        💬
                      </a>
                    )}
                  </td>
                  <td>
                    <button onClick={() => deleteRequest(r.id)} className="btn btn-sm" style={{ background: 'rgba(237,107,76,.1)', color: 'var(--coral)', border: 'none', fontSize: '.7rem' }}>
                      {t('delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

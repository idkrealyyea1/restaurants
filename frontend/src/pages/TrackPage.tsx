import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { api, fmtMoney, STATUS_LABELS } from '@/lib/api';
import { Search } from 'lucide-react';

interface Order {
  code: string;
  status: string;
  totalCents: number;
  subtotalCents: number;
  deliveryFeeCents: number;
  orderType: string;
  customerName: string;
  whatsapp?: string;
  address?: string;
  notes?: string;
  items: { name: string; qty: number; priceCents: number }[];
  createdAt: string;
}

export function TrackPage() {
  const [params] = useSearchParams();
  const { lang, t } = useI18n();
  const [code, setCode] = useState(params.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<Order | null>(null);

  const s = lang === 'ar';
  const t2 = (ar: string, en: string) => s ? ar : en;

  async function search() {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const res = await api.get<{ order: Order }>(`/api/orders/track/${encodeURIComponent(code.trim())}`);
      setOrder(res.order);
    } catch {
      setError(t2('لم يتم العثور على طلب بهذا الرمز', 'No order found with this tracking code'));
    } finally {
      setLoading(false);
    }
  }

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: '#f5c84b', confirmed: '#27615f', preparing: '#ed6b4c',
      ready: '#27615f', out_for_delivery: '#ed6b4c', completed: '#27615f', cancelled: '#999',
    };
    return map[status] || '#999';
  };

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <header className="topbar">
        <div className="container flex-between" style={{ minHeight: 60 }}>
          <Link to="/" className="font-display font-black text-xl" style={{ color: 'var(--ink)', textDecoration: 'none' }}>Restivo</Link>
        </div>
      </header>
      <main className="container mt-8" style={{ maxWidth: 560 }}>
        <h1 className="section-title mb-6">{t('trackTitle')}</h1>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder={t('trackPlaceholder')}
            style={{ flex: 1, padding: '10px 16px', border: '2px solid var(--border)', borderRadius: '14px', background: 'var(--surface-muted)', outline: 'none', fontSize: '.9rem', fontFamily: 'inherit' }}
          />
          <button onClick={search} disabled={loading} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
            {loading ? '…' : t('trackBtn')}
          </button>
        </div>

        {error && (
          <div className="card" style={{ background: 'rgba(237,107,76,.1)', borderColor: 'var(--coral)', textAlign: 'center' }}>
            <p style={{ color: 'var(--coral)', fontWeight: 700 }}>{error}</p>
          </div>
        )}

        {order && (
          <div className="card">
            <div className="flex-between mb-4">
              <div>
                <p className="small" style={{ color: 'var(--muted)' }}>{t('trackCode')}</p>
                <p className="font-display font-black text-xl" style={{ letterSpacing: '.05em', color: 'var(--ink)' }}>{order.code}</p>
              </div>
              <div className="text-right">
                <p className="small" style={{ color: 'var(--muted)' }}>{t('trackStatus')}</p>
                <span className="badge" style={{ background: statusColor(order.status), color: '#fff', borderColor: statusColor(order.status), fontSize: '.8rem', padding: '4px 12px' }}>
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
              <p className="small mb-3" style={{ color: 'var(--muted)' }}>{t('cartTitle')}</p>
              {order.items.map((item, i) => (
                <div key={i} className="flex-between mb-2 text-sm">
                  <span>{item.name} × {item.qty}</span>
                  <span style={{ color: 'var(--coral)', fontWeight: 700 }}>{fmtMoney(item.priceCents * item.qty)}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '2px solid var(--border)', marginTop: 12, paddingTop: 12 }}>
              <div className="flex-between text-sm mb-1">
                <span style={{ color: 'var(--muted)' }}>{t('cartSubtotal')}</span>
                <span>{fmtMoney(order.subtotalCents)}</span>
              </div>
              {order.deliveryFeeCents > 0 && (
                <div className="flex-between text-sm mb-1">
                  <span style={{ color: 'var(--muted)' }}>{t('cartDelivery')}</span>
                  <span>{fmtMoney(order.deliveryFeeCents)}</span>
                </div>
              )}
              <div className="flex-between font-black text-base mt-2">
                <span>{t('cartTotal')}</span>
                <span style={{ color: 'var(--coral)' }}>{fmtMoney(order.totalCents)}</span>
              </div>
            </div>

            <div className="mt-4 small" style={{ color: 'var(--muted)', lineHeight: 1.8 }}>
              <p>📅 {new Date(order.createdAt).toLocaleString()}</p>
              {order.customerName && <p>👤 {order.customerName}</p>}
              {order.address && <p>📍 {order.address}</p>}
              {order.notes && <p>📝 {order.notes}</p>}
            </div>
          </div>
        )}

        <style>{`
          .topbar { background: var(--surface); border-bottom: 1px solid var(--border); }
        `}</style>
      </main>
    </div>
  );
}

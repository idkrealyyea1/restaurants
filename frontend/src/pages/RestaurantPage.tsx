import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useI18n } from '@/lib/i18n';
import { api, fmtMoney, toast, qsParam, buildThemeTokens, compressImage } from '@/lib/api';
import { X, Plus, Minus, Search, ShoppingBag } from 'lucide-react';

interface MenuItem {
  id: number;
  name: string;
  description?: string;
  priceCents: number;
  imagePath?: string;
  isAvailable: boolean;
  isPopular: boolean;
  categoryId: number;
}

interface MenuCategory {
  id: number;
  name: string;
}

interface RestaurantView {
  name: string;
  slug: string;
  openNow: boolean;
  settings: {
    description?: string;
    coverPath?: string;
    logoPath?: string;
    whatsapp?: string;
    phone?: string;
    address?: string;
    currency?: string;
    deliveryFeeCents?: number;
    primaryColor?: string;
    secondaryColor?: string;
  };
  categories: MenuCategory[];
  items: MenuItem[];
}

export function RestaurantPage() {
  const params = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { lang, t } = useI18n();
  const slug = (params.slug || qsParam('r') || '').toLowerCase();

  const [view, setView] = useState<RestaurantView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [cart, setCart] = useState<Record<number, number>>(loadCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderType, setOrderType] = useState<'pickup' | 'delivery'>(() =>
    (localStorage.getItem('ordertype_' + slug) as 'pickup' | 'delivery') || 'pickup'
  );
  const [placing, setPlacing] = useState(false);
  const [orderDone, setOrderDone] = useState<{ code: string; totalCents: number } | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  function loadCart(): Record<number, number> {
    try {
      const raw = JSON.parse(localStorage.getItem('cart_' + slug) || '{}');
      const clean: Record<number, number> = {};
      for (const [k, v] of Object.entries(raw)) {
        if (Number.isInteger(v) && v > 0 && v <= 99) clean[+k] = v;
      }
      return clean;
    } catch (_) { return {}; }
  }

  useEffect(() => { localStorage.setItem('cart_' + slug, JSON.stringify(cart)); }, [cart, slug]);
  useEffect(() => { localStorage.setItem('ordertype_' + slug, orderType); }, [orderType, slug]);

  useEffect(() => {
    if (!slug) { setError(t('missingRestaurant')); setLoading(false); return; }
    api.get<RestaurantView>(`/api/restaurants/${encodeURIComponent(slug)}/menu`)
      .then(data => {
        setView(data);
        const tokens = buildThemeTokens(data.settings?.primaryColor, data.settings?.secondaryColor);
        Object.entries(tokens).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
      })
      .catch(() => setError(t('missingRestaurant')))
      .finally(() => setLoading(false));
  }, [slug]);

  const currency = view?.settings?.currency || 'USD';
  const deliveryFee = view?.settings?.deliveryFeeCents || 0;

  const itemsByCat = useMemo(() => {
    const map: Record<number, MenuItem[]> = {};
    view?.items?.forEach(i => {
      if (!map[i.categoryId]) map[i.categoryId] = [];
      map[i.categoryId].push(i);
    });
    return map;
  }, [view]);

  const visibleItems = useMemo(() => {
    let list = view?.items || [];
    if (activeCat) list = list.filter(i => i.categoryId === activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [view, activeCat, search]);

  const cartItems = useMemo(() => {
    if (!view) return [];
    return Object.entries(cart)
      .map(([id, qty]) => {
        const item = view.items.find(i => i.id === +id);
        return item ? { ...item, qty } : null;
      })
      .filter(Boolean) as (MenuItem & { qty: number })[];
  }, [view, cart]);

  const subtotal = cartItems.reduce((sum, i) => sum + i.priceCents * i.qty, 0);
  const total = orderType === 'delivery' ? subtotal + deliveryFee : subtotal;

  function addToCart(id: number) {
    setCart(c => ({ ...c, [id]: Math.min((c[id] || 0) + 1, 99) }));
  }
  function removeFromCart(id: number) {
    setCart(c => {
      const next = { ...c };
      const n = (next[id] || 0) - 1;
      if (n <= 0) delete next[id]; else next[id] = n;
      return next;
    });
  }
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  async function checkout() {
    if (!slug || cartCount === 0) return;
    setPlacing(true);
    try {
      const res = await api.post<{ order: { code: string; totalCents: number } }>(
        `/api/restaurants/${encodeURIComponent(slug)}/orders`,
        {
          items: Object.entries(cart).map(([id, qty]) => ({ itemId: +id, qty })),
          orderType,
          customerName: name,
          whatsapp: phone,
          address: orderType === 'delivery' ? address : undefined,
          notes: notes || undefined,
        }
      );
      setCart({});
      setOrderDone(res.order);
      setCartOpen(false);
    } catch (err: any) {
      toast(err.message || t('error'), 'error');
    } finally {
      setPlacing(false);
    }
  }

  function share() {
    if (navigator.share) {
      navigator.share({ title: view?.name, url: location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(location.href);
      toast(lang === 'ar' ? 'تم النسخ' : 'Link copied', 'success');
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="page-loading-spinner" />
      </div>
    );
  }

  if (error || !view) {
    return (
      <div className="page-loading">
        <p style={{ color: 'var(--coral)', fontWeight: 700 }}>{error || t('missingRestaurant')}</p>
      </div>
    );
  }

  if (orderDone) {
    return (
      <div className="page-loading" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>✓</div>
          <h1 className="section-title" style={{ fontSize: '1.8rem' }}>{t('cartSuccess')}</h1>
          <p className="mt-3 small" style={{ color: 'var(--muted)' }}>{t('cartSuccessCode')}:</p>
          <p className="font-display font-black text-2xl mt-1" style={{ color: 'var(--coral)', letterSpacing: '.05em' }}>{orderDone.code}</p>
          <p className="mt-3" style={{ color: 'var(--muted)' }}>{t('cartTotal')}: {fmtMoney(orderDone.totalCents, currency)}</p>
          <div className="mt-6 flex gap-3 justify-center flex-wrap">
            <button className="btn btn-primary" onClick={() => navigate(`/track?code=${orderDone.code}`)}>{t('cartShareTrack')}</button>
            <button className="btn btn-outline" onClick={() => setOrderDone(null)}>{t('cartOrderAgain')}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ paddingBottom: 80 }}>
      {/* Hero */}
      <div style={{ position: 'relative', height: 180, background: 'var(--ink)', overflow: 'hidden' }}>
        {view.settings?.coverPath && (
          <img src={view.settings.coverPath} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: .75 }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(31,52,57,.4)' }} />
        <div className="container" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', paddingBottom: 16 }}>
          <div>
            <span className="badge badge-open" style={{ marginBottom: 6, background: view.openNow ? '#dce8df' : 'rgba(237,107,76,.2)', color: view.openNow ? 'var(--teal)' : 'var(--coral)' }}>
              {view.openNow ? t('openNow') : t('closed')}
            </span>
            <h1 className="font-display font-black text-white" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', lineHeight: 1 }}>{view.name}</h1>
            {view.settings?.description && (
              <p className="small mt-1" style={{ color: 'rgba(255,255,255,.8)' }}>{view.settings.description}</p>
            )}
          </div>
        </div>
        <button onClick={share} className="btn btn-sm" style={{ position: 'absolute', top: 12, insetInlineEnd: 12, background: 'rgba(255,255,255,.9)', color: 'var(--ink)' }}>
          {t('shareBtn')}
        </button>
      </div>

      {/* Search + category pills */}
      <div className="container mt-4">
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', top: '50%', insetInlineStart: 14, transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            type="text"
            placeholder={t('menuSearch')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 40px', border: '2px solid var(--border)', borderRadius: '14px', background: 'var(--surface-muted)', outline: 'none', fontSize: '.9rem' }}
          />
        </div>
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveCat(null)}
            className="badge shrink-0"
            style={activeCat === null ? { background: 'var(--coral)', color: '#fff4e4', borderColor: 'var(--coral)' } : {}}
          >
            {t('all')}
          </button>
          {view.categories.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCat(activeCat === c.id ? null : c.id)}
              className="badge shrink-0"
              style={activeCat === c.id ? { background: 'var(--coral)', color: '#fff4e4', borderColor: 'var(--coral)' } : {}}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu grid */}
      <div className="container mt-4">
        {visibleItems.length === 0 ? (
          <div className="empty-state">{t('noMenuItems')}</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {visibleItems.map(item => (
              <div key={item.id} className="card" style={{ padding: 12, opacity: item.isAvailable ? 1 : 0.55 }}>
                <div className="flex gap-3">
                  <div style={{
                    width: 64, height: 64, borderRadius: 14, flexShrink: 0, overflow: 'hidden',
                    background: 'linear-gradient(135deg, #fde9e2, #f8c8a0)',
                    display: 'grid', placeItems: 'center',
                  }}>
                    {item.imagePath
                      ? <img src={item.imagePath} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 24 }}>🍽️</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex-between gap-2">
                      <h3 className="font-bold truncate" style={{ color: 'var(--ink)' }}>{item.name}</h3>
                      {item.isPopular && <span className="badge" style={{ background: 'var(--sun)', color: 'var(--ink)', borderColor: 'var(--sun)' }}>⭐ {t('popularBadge')}</span>}
                    </div>
                    {item.description && <p className="small mt-1" style={{ color: 'var(--muted)' }}>{item.description}</p>}
                    <div className="flex-between mt-2">
                      <span className="font-bold" style={{ color: 'var(--coral)' }}>{fmtMoney(item.priceCents, currency)}</span>
                      {item.isAvailable && (
                        cart[item.id] ? (
                          <div className="flex items-center gap-2">
                            <button onClick={() => removeFromCart(item.id)} className="btn btn-outline btn-sm" style={{ width: 32, height: 32, padding: 0, borderRadius: '50%' }}>
                              <Minus size={14} />
                            </button>
                            <span className="font-black" style={{ minWidth: 20, textAlign: 'center' }}>{cart[item.id]}</span>
                            <button onClick={() => addToCart(item.id)} className="btn btn-sm" style={{ width: 32, height: 32, padding: 0, borderRadius: '50%', background: 'var(--coral)', color: '#fff' }}>
                              <Plus size={14} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(item.id)} className="btn btn-sm" style={{ background: 'var(--coral)', color: '#fff', borderRadius: '50%', width: 32, height: 32, padding: 0 }}>
                            <Plus size={16} />
                          </button>
                        )
                      )}
                      {!item.isAvailable && <span className="badge">{t('itemUnavailable')}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating cart button */}
      {cartCount > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="btn btn-primary"
          style={{
            position: 'fixed', bottom: 20, insetInlineStart: '50%', transform: 'translateX(50%)',
            zIndex: 50, borderRadius: 999, padding: '14px 24px', boxShadow: '0 8px 32px rgba(30,45,48,.3)',
            background: 'var(--ink)', color: '#f8f0df',
          }}>
          <ShoppingBag size={18} />
          {t('cartTitle')} · {cartCount} · {fmtMoney(total, currency)}
        </button>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(31,52,57,.5)', backdropFilter: 'blur(2px)' }} onClick={() => setCartOpen(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, insetInline: 0, maxHeight: '85vh', overflowY: 'auto',
              background: 'var(--surface)', borderTopLeftRadius: 24, borderTopRightRadius: 24,
              padding: 20, boxShadow: '0 -10px 40px rgba(30,45,48,.2)',
            }}>
            <div className="flex-between mb-4">
              <h2 className="section-title" style={{ fontSize: '1.3rem' }}>{t('cartTitle')}</h2>
              <button onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)' }}>
                <X size={22} />
              </button>
            </div>

            {cartItems.length === 0 ? (
              <div className="empty-state">
                <p>{t('cartEmpty')}</p>
                <p className="small mt-1">{t('cartAddItems')}</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gap: 10 }}>
                  {cartItems.map(item => (
                    <div key={item.id} className="flex-between" style={{ gap: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                      <div className="min-w-0">
                        <p className="font-bold truncate" style={{ color: 'var(--ink)' }}>{item.name}</p>
                        <p className="small" style={{ color: 'var(--coral)' }}>{fmtMoney(item.priceCents, currency)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => removeFromCart(item.id)} className="btn btn-outline btn-sm" style={{ width: 30, height: 30, padding: 0, borderRadius: '50%' }}>
                          <Minus size={12} />
                        </button>
                        <span className="font-black" style={{ minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                        <button onClick={() => addToCart(item.id)} className="btn btn-sm" style={{ width: 30, height: 30, padding: 0, borderRadius: '50%', background: 'var(--coral)', color: '#fff' }}>
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order type toggle */}
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setOrderType('pickup')}
                    className="btn btn-sm flex-1"
                    style={orderType === 'pickup' ? { background: 'var(--ink)', color: '#f8f0df' } : {}}>
                    {t('cartPickup')}
                  </button>
                  <button onClick={() => setOrderType('delivery')}
                    className="btn btn-sm flex-1"
                    style={orderType === 'delivery' ? { background: 'var(--ink)', color: '#f8f0df' } : {}}>
                    {t('cartDeliveryOpt')}
                  </button>
                </div>

                {/* Totals */}
                <div className="mt-4 space-y-1 text-sm">
                  <div className="flex-between"><span style={{ color: 'var(--muted)' }}>{t('cartSubtotal')}</span><span>{fmtMoney(subtotal, currency)}</span></div>
                  {orderType === 'delivery' && (
                    <div className="flex-between"><span style={{ color: 'var(--muted)' }}>{t('cartDelivery')}</span><span>{fmtMoney(deliveryFee, currency)}</span></div>
                  )}
                  <div className="flex-between font-black text-base pt-2" style={{ borderTop: '2px solid var(--border)', color: 'var(--ink)' }}>
                    <span>{t('cartTotal')}</span><span>{fmtMoney(total, currency)}</span>
                  </div>
                </div>

                {/* Form */}
                <div className="mt-4 space-y-3">
                  <input placeholder={t('cartNamePh')} value={name} onChange={e => setName(e.target.value)} required
                    style={{ width: '100%', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: '12px', background: 'var(--surface-muted)', outline: 'none', fontSize: '.9rem' }} />
                  <input placeholder={t('cartPhonePh')} value={phone} onChange={e => setPhone(e.target.value)} required dir="ltr"
                    style={{ width: '100%', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: '12px', background: 'var(--surface-muted)', outline: 'none', fontSize: '.9rem' }} />
                  {orderType === 'delivery' && (
                    <input placeholder={t('cartAddressPh')} value={address} onChange={e => setAddress(e.target.value)} required
                      style={{ width: '100%', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: '12px', background: 'var(--surface-muted)', outline: 'none', fontSize: '.9rem' }} />
                  )}
                  <textarea placeholder={t('cartNotesPh')} value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    style={{ width: '100%', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: '12px', background: 'var(--surface-muted)', outline: 'none', fontSize: '.9rem', resize: 'vertical' }} />
                </div>

                <button
                  onClick={checkout}
                  disabled={placing || !name || !phone}
                  className="btn btn-coral w-full justify-center mt-4"
                  style={{ opacity: placing || !name || !phone ? 0.6 : 1, cursor: placing ? 'wait' : 'pointer' }}>
                  {placing ? t('loading') : t('cartCheckout')}
                </button>

                {view.settings?.whatsapp && (
                  <a
                    href={`https://wa.me/${view.settings.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Order from ${view.name}\n${cartItems.map(i => `${i.name} x${i.qty}`).join('\n')}`)}`}
                    target="_blank" rel="noopener"
                    className="btn btn-outline w-full justify-center mt-2"
                    style={{ background: '#25D366', color: '#fff', borderColor: '#25D366' }}>
                    💬 {t('cartWatsapp')}
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

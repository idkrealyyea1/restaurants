import React, { useState, type FormEvent } from 'react';
import { X, CircleCheck, ArrowLeft } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { api, toast } from '@/lib/api';

export function RequestModal({ onClose }: { onClose: () => void }) {
  const { t, lang } = useI18n();
  const [submitted, setSubmitted] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [restaurant, setRestaurant] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const res = await api.post<{ ok: boolean; request: { code: string } }>('/api/restaurant-requests', {
        customerName: name,
        restaurantName: restaurant,
        phone,
        whatsapp: phone,
      });
      setCode(res.request.code);
      setSubmitted(true);
    } catch (err) {
      toast(lang === 'ar' ? 'حدث خطأ — حاول مجددًا' : 'Something went wrong — try again', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-6"
      style={{ background: 'rgba(31,52,57,.7)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <section className="relative w-full max-w-[560px] overflow-hidden rounded-[28px]" style={{ background: 'var(--surface)', boxShadow: '0 30px 70px rgba(30,45,48,.3)' }}>
        <button
          type="button"
          onClick={onClose}
          className="absolute left-5 top-5 z-10 grid place-items-center rounded-full hover:!bg-[var(--coral)] hover:!text-white transition-colors"
          style={{ width: 40, height: 40, background: 'rgba(31,52,57,.05)', color: 'var(--ink)' }}
          aria-label="Close"
        >
          <X size={16} />
        </button>
        <div className="border-b px-6 pb-6 pt-8 sm:px-9" style={{ borderColor: 'rgba(31,52,57,.1)' }}>
          <span className="inline-flex rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: 'rgba(237,107,76,.1)', color: 'var(--coral)' }}>
            {lang === 'ar' ? 'نبدأ من مطعمك' : 'Start with your restaurant'}
          </span>
          <h2 className="mt-4 font-display text-[29px] font-black leading-tight" style={{ color: 'var(--ink)' }}>
            {lang === 'ar' ? <>خلّ منيو مطعمك<br />يشتغل معك.</> : <>Let your restaurant menu<br />work for you.</>}
          </h2>
          <p className="mt-2 max-w-[400px] text-sm leading-7" style={{ color: 'rgba(31,52,57,.6)' }}>
            {t('rqDesc')}
          </p>
        </div>
        {submitted ? (
          <div className="px-6 py-12 text-center sm:px-9">
            <div className="mx-auto mb-5 grid place-items-center rounded-full" style={{ width: 64, height: 64, background: '#dce8df', color: 'var(--teal)' }}>
              <CircleCheck size={32} />
            </div>
            <h3 className="font-display text-2xl font-black" style={{ color: 'var(--ink)' }}>{t('requestSent')}</h3>
            <p className="mx-auto mt-2 max-w-[320px] text-sm leading-7" style={{ color: 'rgba(31,52,57,.6)' }}>
              {t('requestCode')}: <b style={{ color: 'var(--ink)' }}>{code}</b>
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-7 rounded-full px-6 py-3 text-sm font-bold"
              style={{ background: 'var(--ink)', color: 'var(--bg)' }}
            >
              {lang === 'ar' ? 'تمام' : 'Done'}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 px-6 py-6 sm:px-9">
            <label className="block">
              <span className="mb-2 block text-xs font-bold" style={{ color: 'var(--ink)' }}>{t('rqNameL')}</span>
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('rqNamePh')}
                className="h-12 w-full rounded-xl border px-4 text-sm outline-none focus:border-[var(--coral)]"
                style={{ borderColor: 'rgba(31,52,57,.1)', background: 'rgba(241,228,201,.5)' }}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold" style={{ color: 'var(--ink)' }}>{t('rqRestL')}</span>
              <input
                required
                value={restaurant}
                onChange={e => setRestaurant(e.target.value)}
                placeholder={t('rqRestPh')}
                className="h-12 w-full rounded-xl border px-4 text-sm outline-none focus:border-[var(--coral)]"
                style={{ borderColor: 'rgba(31,52,57,.1)', background: 'rgba(241,228,201,.5)' }}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold" style={{ color: 'var(--ink)' }}>{t('rqPhoneL')}</span>
              <input
                required
                dir="ltr"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+972 5X XXX XXXX"
                className="h-12 w-full rounded-xl border px-4 text-left text-sm outline-none focus:border-[var(--coral)]"
                style={{ borderColor: 'rgba(31,52,57,.1)', background: 'rgba(241,228,201,.5)' }}
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl font-bold disabled:opacity-50"
              style={{ background: 'var(--coral)', color: '#fff4e4', boxShadow: '4px 4px 0 var(--sun)' }}
            >
              {loading ? t('loading') : t('rqSubmit')}
              <ArrowLeft size={16} />
            </button>
            <p className="text-center text-[11px]" style={{ color: 'rgba(31,52,57,.4)' }}>{t('rqConsent')}</p>
          </form>
        )}
      </section>
    </div>
  );
}

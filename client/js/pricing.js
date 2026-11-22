'use strict';
(function () {
  let pricing = null;
  let failed = false;
  const amount = document.getElementById('pricing-amount');
  const period = document.getElementById('pricing-period');
  const status = document.getElementById('pricing-status');
  const trial = document.getElementById('pricing-trial');
  if (!amount || !period || !status || !trial) return;
  function render() {
    const en = window.I18N && window.I18N.lang === 'en';
    document.querySelectorAll('[data-price-ar][data-price-en]').forEach((element) => {
      element.textContent = element.getAttribute(en ? 'data-price-en' : 'data-price-ar');
    });
    if (!pricing) {
      amount.textContent = '—';
      period.textContent = '';
      status.textContent = failed
        ? (en ? 'Current pricing is unavailable. Contact us to confirm before subscribing.' : 'السعر الحالي غير متاح. تواصل معنا للتأكد قبل الاشتراك.')
        : (en ? 'Loading current pricing…' : 'جاري تحميل السعر الحالي…');
      trial.hidden = true;
      return;
    }
    // Keep currency and Latin digits in one isolated unit, even in RTL.
    amount.textContent = new Intl.NumberFormat('en-US', {
      style: 'currency', currency: pricing.pricing_currency,
      currencyDisplay: 'code', minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(pricing.pricing_cents / 100);
    period.textContent = pricing.pricing_period === 'year'
      ? (en ? 'per year' : 'سنويًا') : (en ? 'per month' : 'شهريًا');
    status.textContent = pricing.pricing_period === 'year'
      ? (en ? 'Billed yearly. No commission on your orders.' : 'تُدفع سنويًا. بدون عمولة على طلباتك.')
      : (en ? 'Billed monthly. No commission on your orders.' : 'تُدفع شهريًا. بدون عمولة على طلباتك.');
    const days = Number(pricing.trial_days);
    trial.hidden = !(Number.isInteger(days) && days > 0);
    trial.textContent = trial.hidden ? '' : (en
      ? `${days}-day free trial. No card at signup.`
      : `تجربة مجانية ${days} أيام. بدون بطاقة عند التسجيل.`);
  }
  render();
  if (window.I18N) window.I18N.onChange(render);
  let base = String(window.__API_BASE__ || '');
  if (!base) base = document.querySelector('meta[name="api-base"]')?.content || '';
  fetch(base.replace(/\/+$/, '') + '/api/pricing', { credentials: 'include' })
    .then((response) => {
      if (!response.ok) throw new Error('pricing unavailable');
      return response.json();
    })
    .then((data) => {
      const value = data.pricing || data;
      if (!Number.isFinite(value.pricing_cents) || value.pricing_cents < 0
        || !/^[A-Z]{3}$/.test(value.pricing_currency)
        || !['month', 'year'].includes(value.pricing_period)) throw new Error('invalid pricing');
      // Validate currency formatting before accepting the response.
      new Intl.NumberFormat('en-US', { style: 'currency', currency: value.pricing_currency });
      pricing = value;
      render();
    })
    .catch(() => { pricing = null; failed = true; render(); });
})();

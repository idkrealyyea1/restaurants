'use strict';

(function () {
  const { api, toast } = window.App;
  const I = window.I18N;

  const form = document.getElementById('login-form');
  const errorBox = document.getElementById('error-box');
  const submitBtn = document.getElementById('submit-btn');

  function dashboardPath(role) {
    if (role === 'owner' || role === 'staff') return '/owner.html';
    if (role === 'delivery') return '/delivery.html';
    return '/admin.html';
  }

  // Already signed in? Route to the right dashboard.
  api.get('/api/auth/me').then((data) => {
    if (!data.user) return;
    location.replace(dashboardPath(data.user.role));
  }).catch(() => {});

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');

    const identifier = document.getElementById('identifier').value.trim();
    const password = document.getElementById('password').value;

    if (!identifier || !password) {
      errorBox.textContent = I.t('enterBoth');
      errorBox.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    try {
      const data = await api.post('/api/auth/login', { identifier, password });
      toast('Welcome back', 'success');
      setTimeout(() => {
        location.href = dashboardPath(data.user.role);
      }, 250);
    } catch (err) {
      // ponytail: 7-day trial shows friendly message, not generic 403
      const isTrial = err.code === 'SUBSCRIPTION_EXPIRED' || (err.message && err.message.includes('Trial finished'));
      errorBox.textContent = isTrial ? 'انتهت فترة التجربة 7 أيام — تواصل مع الإدارة للتجديد عبر واتساب +972567439846 ($19.99/شهر)' : err.message;
      errorBox.classList.remove('hidden');
      submitBtn.disabled = false;
    }
  });
})();

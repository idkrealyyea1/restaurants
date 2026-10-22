'use strict';

/* Delivery-company dashboard. The API scopes every request to the delivery
   group linked to this account. */

(function () {
  const { api, esc, fmtMoney, fmtDateTime, toast } = window.App;
  const I = window.I18N;

  const zone = document.getElementById('dlv-zone');
  const errorBox = document.getElementById('dlv-error');
  const statusEl = document.getElementById('dlv-status');
  const refreshBtn = document.getElementById('dlv-refresh');
  const groupEl = document.getElementById('dlv-group');
  const subtitleEl = document.getElementById('dlv-subtitle');

  let groupName = '';
  let loading = false;

  function statusLabel(status) {
    const key = 'status_' + status;
    const label = I.t(key);
    return label === key ? status : label;
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  }

  function clearError() {
    errorBox.classList.add('hidden');
    errorBox.textContent = '';
  }

  function orderCard(o) {
    const wa = String(o.customer_whatsapp || '').replace(/\D/g, '');
    const contact = wa
      ? '<a href="https://wa.me/' + esc(wa) + '" target="_blank" rel="noopener">' + esc(o.customer_whatsapp) + '</a>'
      : esc(o.customer_whatsapp || '—');
    const address = o.customer_address
      ? '<p class="small mt-1"><strong>' + esc(I.t('addrLabel')) + '</strong> ' + esc(o.customer_address) + '</p>'
      : '';
    const notes = o.notes
      ? '<p class="small mt-1"><em>' + esc(I.t('noteW')) + ' ' + esc(o.notes) + '</em></p>'
      : '';
    let action = '';
    if (o.status === 'ready') {
      action = '<button type="button" class="btn btn-secondary btn-sm" data-order="' + esc(o.id) + '" data-next="out_for_delivery">' +
        esc(I.t('dlvMarkOut')) + '</button>';
    } else if (o.status === 'out_for_delivery') {
      action = '<button type="button" class="btn btn-success btn-sm" data-order="' + esc(o.id) + '" data-next="completed">' +
        esc(I.t('dlvMarkDelivered')) + '</button>';
    }
    return '<article class="card order-card" id="order-' + esc(o.id) + '">' +
      '<div class="order-head">' +
        '<span class="order-code">' + esc(o.code) + '</span>' +
        '<span class="badge status-' + esc(o.status) + '">' + esc(statusLabel(o.status)) + '</span>' +
      '</div>' +
      '<div class="order-meta mt-1">' +
        '<strong>' + esc(o.restaurant_name) + '</strong> &middot; ' + esc(o.customer_name || '') +
      '</div>' +
      '<div class="order-meta mt-1">' + contact + ' &middot; ' + esc(fmtDateTime(o.created_at)) + '</div>' +
      address +
      (o.items_summary ? '<p class="small mt-1">' + esc(o.items_summary) + '</p>' : '') +
      notes +
      '<div class="flex-between mt-1"><span class="muted small">' + esc(I.t('totalL')) + '</span><strong>' +
        esc(fmtMoney(o.total_cents, o.currency)) + '</strong></div>' +
      (action ? '<div class="order-actions">' + action + '</div>' : '') +
      '</article>';
  }

  function render(orders) {
    if (!orders.length) {
      zone.innerHTML = '<div class="empty-state">' + esc(I.t('dlvEmpty')) + '</div>';
      return;
    }
    zone.innerHTML = orders.map(orderCard).join('');
    zone.querySelectorAll('[data-order]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const next = btn.getAttribute('data-next');
        btn.disabled = true;
        try {
          await api.patch('/api/delivery/orders/' + encodeURIComponent(btn.getAttribute('data-order')) + '/status', { status: next });
          toast(I.t('dlvUpdated'), 'success');
          await load();
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false;
        }
      });
    });
  }

  async function load() {
    if (loading) return;
    loading = true;
    zone.setAttribute('aria-busy', 'true');
    if (!zone.children.length) zone.innerHTML = '<div class="empty-state">' + esc(I.t('dlvLoading')) + '</div>';
    clearError();
    try {
      const status = statusEl.value;
      const data = await api.get('/api/delivery/orders?limit=50' + (status ? '&status=' + encodeURIComponent(status) : ''));
      render(data.orders || []);
    } catch (err) {
      if (err.status === 401) {
        location.replace('/login.html');
        return;
      }
      if (!zone.querySelector('.order-card')) {
        zone.innerHTML = '';
      }
      showError(err.message || I.t('dlvForbidden'));
    } finally {
      loading = false;
      zone.setAttribute('aria-busy', 'false');
    }
  }

  function refreshLabels() {
    document.title = I.t('dlvTitle') + ' — Restivo';
    if (groupName) subtitleEl.textContent = I.t('dlvSubtitle', { group: groupName });
    if (zone.querySelector('.order-card')) load();
  }

  async function boot() {
    try {
      const me = await api.get('/api/auth/me');
      if (!me || !me.user) {
        location.replace('/login.html');
        return;
      }
      if (me.user.role !== 'delivery') {
        const path = me.user.role === 'owner' || me.user.role === 'staff' ? '/owner.html' : '/admin.html';
        location.replace(path);
        return;
      }
    } catch (_) {
      location.replace('/login.html');
      return;
    }

    try {
      const data = await api.get('/api/delivery/me');
      groupName = (data.group && data.group.name) || '';
      groupEl.textContent = groupName;
      subtitleEl.textContent = I.t('dlvSubtitle', { group: groupName });
      document.title = I.t('dlvTitle') + ' — Restivo';
    } catch (err) {
      showError(err.message || I.t('dlvForbidden'));
    }

    statusEl.addEventListener('change', load);
    refreshBtn.addEventListener('click', load);
    document.getElementById('logout-btn').addEventListener('click', async () => {
      await api.post('/api/auth/logout').catch(() => {});
      location.href = '/login.html';
    });
    if (I.onChange) I.onChange(refreshLabels);

    await load();
    setInterval(load, 30000);
  }

  boot();
})();

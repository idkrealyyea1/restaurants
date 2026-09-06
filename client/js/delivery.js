'use strict';

(function () {
  const { api, esc, fmtMoney, fmtDateTime, toast, STATUS_LABELS } = window.App;
  const I = window.I18N;

  let companyName = null;
  let page = 1;
  let statusFilter = '';
  let orders = [];
  let pollTimer = null;

  /* ------------------------------ boot ------------------------------ */

  async function boot() {
    try {
      const me = await api.get('/api/auth/me');
      if (!me.user || me.user.role !== 'delivery') {
        location.href = '/login.html';
        return;
      }
    } catch (_) {
      location.href = '/login.html';
      return;
    }

    try {
      const d = await api.get('/api/delivery/me');
      companyName = d.delivery && d.delivery.companyName;
      document.getElementById('company-name').textContent = companyName || I.t('deliveryOrdersH');
      document.title = companyName || I.t('deliveryOrdersH');
    } catch (_) { /* header keeps fallback */ }

    document.getElementById('logout-btn').addEventListener('click', async () => {
      await api.post('/api/auth/logout').catch(() => {});
      location.href = '/login.html';
    });
    document.getElementById('refresh-btn').addEventListener('click', loadOrders);
    document.getElementById('status-filter').addEventListener('change', (e) => {
      statusFilter = e.target.value;
      page = 1;
      loadOrders();
    });
    document.getElementById('page-prev').addEventListener('click', () => {
      if (page > 1) { page--; loadOrders(); }
    });
    document.getElementById('page-next').addEventListener('click', () => {
      page++; loadOrders();
    });

    await loadOrders();

    function startPolling() {
      if (pollTimer) clearInterval(pollTimer);
      if (document.hidden) return;
      pollTimer = setInterval(() => {
        if (!document.hidden) loadOrders();
      }, 20000);
    }
    startPolling();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = null;
      } else {
        loadOrders();
        startPolling();
      }
    });
  }

  /* ---------------------------- orders ------------------------------ */

  async function loadOrders() {
    const zone = document.getElementById('delivery-orders-zone');
    zone.innerHTML = '<div class="empty-state">' + esc(I.t('loading')) + '</div>';
    try {
      const q = '?page=' + page + '&limit=20' +
        (statusFilter ? '&status=' + encodeURIComponent(statusFilter) : '');
      const data = await api.get('/api/delivery/orders' + q);
      orders = data.orders;

      zone.innerHTML = orders.length
        ? '<div class="table-wrap"><table class="data"><thead><tr>' +
            '<th>' + esc(I.t('orderCodeTh')) + '</th>' +
            '<th>' + esc(I.t('restaurantTh')) + '</th>' +
            '<th>' + esc(I.t('customerTh')) + '</th>' +
            '<th>' + esc(I.t('totalL')) + '</th>' +
            '<th>' + esc(I.t('statusTh')) + '</th>' +
            '<th>' + esc(I.t('actionsTh')) + '</th>' +
          '</tr></thead><tbody>' +
          orders.map((o) => orderRow(o)).join('') +
          '</tbody></table></div>'
        : '<div class="empty-state">' + esc(I.t('noOrders')) + '</div>';

      document.getElementById('page-info').textContent =
        I.t('pageInfo', { p: page, t: Math.max(1, Math.ceil(data.total / data.limit)), n: data.total });

      wireActions();
    } catch (err) {
      zone.innerHTML = '<div class="notice notice-error">' + esc(err.message) + '</div>';
    }
  }

  function orderRow(o) {
    const currency = o.currency || 'USD';
    const customer = '<strong>' + esc(o.customer_name) + '</strong>' + (o.customer_phone || o.customer_whatsapp
      ? '<div class="muted small">' + esc(o.customer_phone || o.customer_whatsapp) + '</div>' : '');
    const address = o.customer_address ? '<div class="muted small">' + esc(o.customer_address) + '</div>' : '';
    return '<tr data-id="' + esc(o.id) + '">' +
      '<td>' + esc(o.code) + '<div class="muted small">' + esc(fmtDateTime(o.created_at)) + '</div></td>' +
      '<td>' + esc(o.restaurant_name) + '</td>' +
      '<td>' + customer + address + '</td>' +
      '<td>' + esc(String(fmtMoney(o.total_cents, currency))) + '</td>' +
      '<td><span class="badge status-' + esc(o.status) + '">' + esc(I.t('status_' + o.status)) + '</span></td>' +
      '<td>' + actionButtons(o) + '</td>' +
    '</tr>';
  }

  function actionButtons(o) {
    if (o.status === 'ready') {
      return '<button type="button" class="btn btn-outline btn-sm" data-advance="out_for_delivery">' + esc(I.t('actOut')) + '</button>';
    }
    if (o.status === 'out_for_delivery') {
      return '<button type="button" class="btn btn-success btn-sm" data-advance="completed">' + esc(I.t('actComplete')) + '</button>';
    }
    return '';
  }

  function wireActions() {
    document.querySelectorAll('[data-advance]').forEach((b) => {
      b.addEventListener('click', async () => {
        const id = b.closest('tr').dataset.id;
        const next = b.dataset.advance;
        b.disabled = true;
        try {
          const r = await api.patch('/api/delivery/orders/' + id + '/status', { status: next });
          toast(STATUS_LABELS[r.order.status] || r.order.status, 'success');
          loadOrders();
        } catch (err) {
          toast(err.message, 'error');
          b.disabled = false;
        }
      });
    });
  }

  I.onChange(() => {
    if (companyName) {
      document.getElementById('company-name').textContent = companyName;
    }
    if (document.querySelector('#delivery-orders-zone table')) loadOrders();
  });

  boot();
})();

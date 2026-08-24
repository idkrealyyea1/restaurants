'use strict';

(function () {
  const { api, esc, fmtMoney, fmtDateTime, qsParam, STATUS_LABELS } = window.App;

  const lookupBox = document.getElementById('lookup-box');
  const orderBox = document.getElementById('order-box');
  const errorBox = document.getElementById('error-box');
  const form = document.getElementById('track-form');
  const codeInput = document.getElementById('code-input');

  const FLOW_PICKUP = ['pending', 'confirmed', 'preparing', 'ready', 'completed'];
  const FLOW_DELIVERY = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed'];

  let pollTimer = null;
  let currentCode = null;

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
  }

  async function loadOrder(code) {
    try {
      const data = await api.get('/api/orders/track/' + encodeURIComponent(code));
      render(data.order);
    } catch (err) {
      stopPolling();
      showLookup();
      showError(err.message);
    }
  }

  function render(order) {
    errorBox.classList.add('hidden');
    lookupBox.classList.add('hidden');
    orderBox.classList.remove('hidden');

    document.getElementById('order-head').innerHTML =
      '<div class="flex-between">' +
        '<div><h1 class="order-code">' + esc(order.code) + '</h1>' +
        '<p class="muted small mb-0">' + esc(order.restaurant_name) + ' &middot; ' +
        fmtDateTime(order.created_at) + '</p></div>' +
        '<span class="badge status-' + esc(order.status) + '">' + (STATUS_LABELS[order.status] || esc(order.status)) + '</span>' +
      '</div>';

    const flow = order.order_type === 'delivery' ? FLOW_DELIVERY : FLOW_PICKUP;
    if (order.status === 'cancelled') {
      flow.push('cancelled');
    }
    const currentIdx = flow.indexOf(order.status);

    document.getElementById('timeline').innerHTML = flow.map((step, idx) => {
      const cls = step === order.status ? 'current' : idx < currentIdx ? 'done' : '';
      return '<li class="' + cls + '"><div class="tl-label">' + (STATUS_LABELS[step] || step) + '</div></li>';
    }).join('');

    const currency = order.currency;
    const rows = order.items.map((it) =>
      '<div class="total-row"><span>' + esc(it.quantity) + ' &times; ' + esc(it.item_name) + '</span><span>' +
      fmtMoney(it.line_total_cents, currency) + '</span></div>'
    ).join('');

    const feeRow = order.order_type === 'delivery'
      ? '<div class="total-row"><span>Delivery fee</span><span>' + fmtMoney(order.delivery_fee_cents, currency) + '</span></div>'
      : '';

    document.getElementById('order-items').innerHTML =
      '<h2 class="section-title">Order summary</h2>' + rows +
      feeRow +
      '<div class="total-row grand"><span>Total</span><span>' + fmtMoney(order.total_cents, currency) + '</span></div>';
  }

  function startPolling(code) {
    stopPolling();
    currentCode = code;
    pollTimer = setInterval(() => {
      api.get('/api/orders/track/' + encodeURIComponent(code)).then((d) => render(d.order)).catch(() => {});
    }, 15000);
  }

  function stopPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  }

  function showLookup() {
    orderBox.classList.add('hidden');
    lookupBox.classList.remove('hidden');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = codeInput.value.trim().toUpperCase();
    if (!code) return;
    history.replaceState(null, '', '/track?code=' + encodeURIComponent(code));
    loadOrder(code).then(() => startPolling(code));
  });

  document.getElementById('reset-btn').addEventListener('click', () => {
    stopPolling();
    history.replaceState(null, '', '/track');
    showLookup();
  });

  // Deep link support: /track?code=XXXX
  const initial = qsParam('code');
  if (initial && /^[A-Za-z0-9]{6,12}$/.test(initial)) {
    codeInput.value = initial.toUpperCase();
    loadOrder(initial.toUpperCase()).then(() => startPolling(initial.toUpperCase()));
  }
})();

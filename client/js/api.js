'use strict';

/* Shared client helpers: API wrapper, HTML escaping, formatting, UI widgets.
   Loaded as a plain <script> (CSP forbids inline scripts). */

(function () {
  const API = {
    async request(path, options) {
      const opts = Object.assign({ method: 'GET', headers: {} }, options || {});
      if (opts.body !== undefined && typeof opts.body !== 'string' && !(opts.body instanceof FormData)) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(opts.body);
      }
      const res = await fetch(path, Object.assign({ credentials: 'same-origin' }, opts));
      let data = null;
      try {
        data = await res.json();
      } catch (_) {
        /* non-JSON */
      }
      if (!res.ok) {
        const err = new Error((data && data.error && data.error.message) || 'Request failed');
        err.status = res.status;
        err.code = data && data.error && data.error.code;
        err.fields = data && data.error && data.error.details;
        throw err;
      }
      return data;
    },
    get(path) { return this.request(path); },
    post(path, body) { return this.request(path, { method: 'POST', body }); },
    patch(path, body) { return this.request(path, { method: 'PATCH', body }); },
    put(path, body) { return this.request(path, { method: 'PUT', body }); },
    del(path) { return this.request(path, { method: 'DELETE' }); },
  };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtMoney(cents, currency) {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format((cents || 0) / 100);
    } catch (_) {
      return ((cents || 0) / 100).toFixed(2) + ' ' + currency;
    }
  }

  function fmtDateTime(value) {
    try {
      return new Date(value).toLocaleString();
    } catch (_) {
      return String(value);
    }
  }

  function qsParam(name) {
    return new URLSearchParams(location.search).get(name);
  }

  function debounce(fn, ms) {
    let t = null;
    return function () {
      clearTimeout(t);
      const args = arguments;
      t = setTimeout(() => fn.apply(null, args), ms);
    };
  }

  function toast(message, type) {
    let zone = document.querySelector('.toast-zone');
    if (!zone) {
      zone = document.createElement('div');
      zone.className = 'toast-zone';
      document.body.appendChild(zone);
    }
    const el = document.createElement('div');
    el.className = 'toast' + (type === 'error' ? ' error' : type === 'success' ? ' success' : '');
    el.textContent = message;
    zone.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 250);
    }, 3200);
  }

  const STATUS_LABELS = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    ready: 'Ready',
    out_for_delivery: 'Out for delivery',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  window.App = { api: API, esc, fmtMoney, fmtDateTime, qsParam, debounce, toast, STATUS_LABELS };
})();

'use strict';

/**
 * Public storefront: menu browsing, search, cart and checkout.
 * The SERVER computes all totals — the cart here is only for UX.
 */

(function () {
  const { api, esc, fmtMoney, qsParam } = window.App;
  const I = window.I18N;

  /* ------------------------- resolve slug -------------------------- */
  let slug = qsParam('r');
  if (!slug && location.pathname.startsWith('/restaurant/')) {
    slug = decodeURIComponent(location.pathname.split('/')[2] || '');
  }
  slug = (slug || '').toLowerCase();

  if (!slug) {
    document.getElementById('hero').innerHTML =
      '<div class="container mt-3"><div class="notice notice-error">' + esc(I.t('missingRestaurant')) + '</div></div>';
    return;
  }

  /* --------------------------- state ------------------------------- */
  const CART_KEY = 'cart_' + slug;

  let view = null;          // public menu payload
  let cart = loadCart();    // { itemId: qty }
  let orderType = localStorage.getItem('ordertype_' + slug) || 'pickup';

  function loadCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
      const clean = {};
      for (const [k, v] of Object.entries(raw)) {
        if (Number.isInteger(v) && v > 0 && v <= 99) clean[k] = v;
      }
      return clean;
    } catch (_) {
      return {};
    }
  }

  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  /* ------------------------ theme + hero ---------------------------- */

  function applyTheme() {
    const s = view.settings || {};
    const tokens = window.App.theme.buildTokens(s.primaryColor, s.secondaryColor);
    const rootStyle = document.documentElement.style;
    for (const [name, value] of Object.entries(tokens)) rootStyle.setProperty(name, value);
  }

  function renderHero() {
    const s = view.settings || {};
    const statusBadge = '<span class="sf-pill ' + (view.openNow ? '' : 'closed') + '"><span class="dot"></span>' +
      esc(view.openNow ? I.t('openNow') : I.t('closed')) + '</span>';

    const waBtn = s.whatsapp
      ? '<a class="sf-hero-action" target="_blank" rel="noopener" href="https://wa.me/' +
        encodeURIComponent(s.whatsapp.replace(/[^0-9]/g, '')) + '">WhatsApp</a>'
      : '';

    document.getElementById('hero').innerHTML =
      '<section class="sf-hero">' +
        (s.coverPath ? '<img class="sf-hero-cover" src="' + esc(s.coverPath) + '" alt="">' : '') +
        '<div class="sf-hero-body">' +
          '<div class="sf-hero-top">' +
            '<img class="sf-hero-logo" src="' + esc(s.logoPath || '/images/logo-placeholder.svg') + '" alt="Logo">' +
            '<div class="sf-hero-badges">' + statusBadge + '</div>' +
          '</div>' +
          '<div class="sf-hero-brand">' +
            '<div>' +
              '<h1 class="sf-hero-name">' + esc(view.name) + '</h1>' +
              (s.description ? '<p class="sf-hero-desc">' + esc(s.description) + '</p>' : '') +
            '</div>' +
          '</div>' +
          '<div class="sf-hero-meta">' + waBtn +
            '<button id="share-btn" type="button" class="sf-hero-action">' + esc(I.t('share')) + '</button>' +
          '</div>' +
        '</div>' +
      '</section>';
  }

  /* ---------------------- categories & menu ------------------------- */

  let activeCategory = 'all';
  let searchTerm = '';

  function renderChips() {
    const chipsEl = document.getElementById('chips');
    const cats = [{ id: 'all', name: I.t('all') }, { id: 'popular', name: I.t('popular') }].concat(view.categories);

    chipsEl.innerHTML = cats.map((c) =>
      '<button type="button" class="sf-chip' + (c.id === activeCategory ? ' active' : '') +
      '" data-cat="' + esc(c.id) + '">' +
      (c.id === activeCategory ? '<span class="sim"></span>' : '') +
      esc(c.name) + '</button>'
    ).join('');

    chipsEl.querySelectorAll('.sf-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.cat;
        renderChips();
        renderMenu();
      });
    });
  }

  function itemVisible(item) {
    if (searchTerm && !item.name.toLowerCase().includes(searchTerm) &&
        !(item.description || '').toLowerCase().includes(searchTerm)) return false;
    if (activeCategory === 'all') return true;
    if (activeCategory === 'popular') return !!item.is_popular;
    return item.category_id === activeCategory;
  }

  function renderMenu() {
    const zone = document.getElementById('menu-zone');
    const items = view.items.filter(itemVisible);

    if (view.items.length === 0) {
      zone.innerHTML = '<div class="empty-state card">' + esc(I.t('menuEmpty')) + '</div>';
      return;
    }
    if (items.length === 0) {
      zone.innerHTML = '<div class="empty-state card">' + esc(I.t('noMatch')) + '</div>';
      return;
    }

    zone.innerHTML =
      '<div class="sf-search"><span class="sf-search-icon"></span>' +
        '<input id="menu-search" type="text" placeholder="' + esc(I.t('searchMenu')) + '" maxlength="60" value="' + esc(searchTerm) + '">' +
      '</div>' +
      '<div class="sf-section-h"><span class="bar"></span><h2>' + esc(I.t('bestSellers')) + '</h2></div>' +
      '<div id="menu-grid" class="sf-menu-grid mt-1">' + items.map((item) => renderItemCard(item)).join('') + '</div>';

    // Staggered entrance for the cards.
    zone.querySelectorAll('.sf-item').forEach((el, i) => {
      el.style.animation = 'rise .4s ease backwards';
      el.style.animationDelay = Math.min(i * 35, 420) + 'ms';
    });

    const search = document.getElementById('menu-search');
    search.addEventListener('input', () => {
      searchTerm = search.value.trim().toLowerCase();
      // Update only the grid so the search box keeps focus.
      const grid = document.getElementById('menu-grid');
      const visible = view.items.filter(itemVisible);
      grid.innerHTML = visible.length
        ? visible.map(renderItemCard).join('')
        : '<div class="empty-state" role="status">' + esc(I.t('noMatch')) + '</div>';
      bindAddButtons();
    });

    bindAddButtons();
  }

  function renderItemCard(item) {
    const soldOut = !item.is_available;
    const imgTag = item.image_path
      ? '<img class="sf-item-img" loading="lazy" src="' + esc(item.image_path) + '" alt="">'
      : '<div class="sf-item-img"></div>';
    const badges =
      '<div class="sf-badges">' +
        (item.is_popular ? '<span class="sf-tag popular">' + esc(I.t('popular')) + '</span>' : '') +
        (soldOut ? '<span class="sf-tag soldout">' + esc(I.t('soldOut')) + '</span>' : '') +
      '</div>';

    // Price ticket: amount + an in-ticket "+" to tag the dish into the basket.
    const priceTicket = soldOut
      ? '<span class="sf-price"><span class="sf-price-amt">' + fmtMoney(item.price_cents, view.settings.currency) + '</span></span>'
      : '<span class="sf-price"><span class="sf-price-amt">' + fmtMoney(item.price_cents, view.settings.currency) + '</span>' +
        '<button type="button" class="sf-add" data-item="' + esc(item.id) + '" aria-label="+" title="' + esc(I.t('add')) + '">+</button></span>';

    return (
      '<article class="sf-item' + (soldOut ? ' unavailable' : '') + '" data-item="' + esc(item.id) + '">' +
        imgTag +
        '<div class="sf-item-info">' +
          '<div class="sf-item-line">' +
            '<h3 class="sf-item-name">' + esc(item.name) + '</h3>' +
            '<span class="sf-line-dot" aria-hidden="true"></span>' +
            priceTicket +
          '</div>' +
          badges +
          (item.description ? '<p class="sf-item-desc">' + esc(item.description) + '</p>' : '') +
        '</div>' +
      '</article>'
    );
  }

  function bindAddButtons() {
    document.querySelectorAll('.sf-add').forEach((btn) => {
      btn.addEventListener('click', () => addToCart(btn.dataset.item));
    });
  }

  /* ----------------------------- cart -------------------------------- */

  function cartEntries() {
    return Object.entries(cart)
      .map(([id, qty]) => ({ item: view.items.find((i) => i.id === id), qty }))
      .filter((e) => e.item && e.item.is_available);
  }

  function subtotalCents() {
    return cartEntries().reduce((sum, e) => sum + e.item.price_cents * e.qty, 0);
  }

  function deliveryFeeCents() {
    return orderType === 'delivery' ? Number(view.settings.deliveryFeeCents || 0) : 0;
  }

  function totalUnits() {
    return cartEntries().reduce((sum, e) => sum + e.qty, 0);
  }

  function updateCartBar() {
    const bar = document.getElementById('cart-bar');
    const units = totalUnits();
    if (units === 0) {
      bar.classList.add('hidden');
      return;
    }
    bar.classList.remove('hidden');
    document.getElementById('cart-summary').innerHTML =
      esc(I.t('itemsCount', { n: units })) +
      '<span class="sub">' + fmtMoney(subtotalCents(), view.settings.currency) + '</span>';
  }

  function addToCart(itemId) {
    cart[itemId] = Math.min((cart[itemId] || 0) + 1, 99);
    saveCart();
    updateCartBar();
    flyToCart(itemId);
  }

  /* Ghost image flies from the menu card into the cart bar. */
  function flyToCart(itemId) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const card = document.querySelector('.sf-item[data-item="' + itemId + '"]');
    const bar = document.getElementById('cart-bar');
    if (!card || !bar || typeof card.animate !== 'function') return;

    const item = view.items.find((i) => i.id === itemId);
    if (!item) return;

    // Source point: the card's photo, or the card centre as a fallback.
    const img = card.querySelector('.sf-item-img');
    const s = (img || card).getBoundingClientRect();

    // Target point: cart bar centre (it is visible now — updateCartBar ran).
    const b = bar.getBoundingClientRect();
    const targetX = b.left + Math.min(b.width * 0.25, 180);
    const targetY = b.top + b.height / 2;

    const ghost = document.createElement('div');
    ghost.className = 'fly-ghost';
    if (item.image_path && /^\/uploads\//.test(item.image_path)) {
      ghost.style.backgroundImage = 'url("' + encodeURI(item.image_path).replace(/"/g, '%22') + '")';
    } else {
      ghost.textContent = (item.name || '?').trim().charAt(0);
    }
    ghost.style.left = (s.left + s.width / 2 - 27) + 'px';
    ghost.style.top = (s.top + s.height / 2 - 27) + 'px';
    document.body.appendChild(ghost);

    const dx = targetX - (s.left + s.width / 2);
    const dy = targetY - (s.top + s.height / 2);

    const anim = ghost.animate(
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: 'translate(' + dx * 0.55 + 'px,' + (dy - 90) + 'px) scale(.72)', opacity: 1, offset: 0.6 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.3)', opacity: 0.15 },
      ],
      { duration: 620, easing: 'cubic-bezier(.5,-0.1,.6,.9)' }
    );
    anim.onfinish = () => {
      ghost.remove();
      bar.classList.remove('pulse');
      void bar.offsetWidth; /* restart the pulse animation */
      bar.classList.add('pulse');
    };
  }

  function setQty(itemId, qty) {
    if (qty <= 0) delete cart[itemId];
    else cart[itemId] = Math.min(qty, 99);
    saveCart();
    updateCartBar();
    renderCartSheet();
  }

  /* --------------------------- sheet UI ------------------------------ */

  function openSheet() {
    document.getElementById('sheet-backdrop').classList.add('open');
    const sheet = document.getElementById('sheet');
    sheet.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeSheet() {
    document.getElementById('sheet-backdrop').classList.remove('open');
    document.getElementById('sheet').classList.remove('open');
    document.body.style.overflow = '';
  }

  function renderCartSheet() {
    const content = document.getElementById('sheet-content');
    const entries = cartEntries();

    if (entries.length === 0) {
      content.innerHTML = '<h2>' + esc(I.t('cartEmpty')) + '</h2><p class="muted small">' + esc(I.t('cartEmptyHint')) + '</p>' +
        '<button type="button" id="close-sheet-btn" class="btn btn-block btn-outline">' + esc(I.t('close')) + '</button>';
      document.getElementById('close-sheet-btn').addEventListener('click', closeSheet);
      return;
    }

    const fee = deliveryFeeCents();
    const sub = subtotalCents();

    content.innerHTML =
      '<h2 class="sf-sheet-title">' + esc(I.t('yourOrder')) + '</h2>' +
      entries.map((e) =>
        '<div class="sf-cart-line">' +
          '<div class="sf-qty">' +
            '<button type="button" data-dec="' + esc(e.item.id) + '" aria-label="-">&minus;</button>' +
            '<span>' + e.qty + '</span>' +
            '<button type="button" data-inc="' + esc(e.item.id) + '" aria-label="+">+</button>' +
          '</div>' +
          '<span class="sf-cart-name">' + esc(e.item.name) + '</span>' +
          '<strong class="sf-cart-price">' + fmtMoney(e.item.price_cents * e.qty, view.settings.currency) + '</strong>' +
        '</div>'
      ).join('') +
      '<div class="sf-type-toggle">' +
        '<button type="button" data-type="pickup"' + (orderType === 'pickup' ? ' class="active"' : '') + '>' + esc(I.t('pickup')) + '</button>' +
        '<button type="button" data-type="delivery"' + (orderType === 'delivery' ? ' class="active"' : '') + '>' + esc(I.t('delivery')) + '</button>' +
      '</div>' +
      '<div class="sf-total-box">' +
        '<div class="sf-total-row"><span>' + esc(I.t('subtotal')) + '</span><span>' + fmtMoney(sub, view.settings.currency) + '</span></div>' +
        (orderType === 'delivery'
          ? '<div class="sf-total-row"><span>' + esc(I.t('deliveryFee')) + '</span><span>' + fmtMoney(fee, view.settings.currency) + '</span></div>'
          : '') +
        '<div class="sf-total-row grand"><span>' + esc(I.t('total')) + '</span><span>' + fmtMoney(sub + fee, view.settings.currency) + '</span></div>' +
      '</div>' +
      checkoutFormHtml() +
      '<div id="checkout-error" class="notice notice-error hidden mt-1"></div>' +
      '<button type="submit" form="checkout-form" class="sf-checkout-cta mt-1" id="place-order-btn">' + esc(I.t('placeOrder')) + '</button>' +
      '<button type="button" id="close-sheet-btn" class="btn btn-outline btn-block mt-1">' + esc(I.t('keepBrowsing')) + '</button>';

    // Wire quantity controls.
    content.querySelectorAll('[data-inc]').forEach((b) => b.addEventListener('click', () => setQty(b.dataset.inc, (cart[b.dataset.inc] || 0) + 1)));
    content.querySelectorAll('[data-dec]').forEach((b) => b.addEventListener('click', () => setQty(b.dataset.dec, (cart[b.dataset.dec] || 0) - 1)));

    content.querySelectorAll('.sf-type-toggle button').forEach((b) => {
      b.addEventListener('click', () => {
        orderType = b.dataset.type;
        localStorage.setItem('ordertype_' + slug, orderType);
        renderCartSheet();
      });
    });

    document.getElementById('close-sheet-btn').addEventListener('click', closeSheet);
    document.getElementById('checkout-form').addEventListener('submit', submitOrder);
  }

  function checkoutFormHtml() {
    const needsAddress = orderType === 'delivery';
    return (
      '<form id="checkout-form" novalidate class="mt-2">' +
        '<div class="field"><label for="co-name">' + esc(I.t('yourName')) + '</label>' +
          '<input id="co-name" name="customerName" type="text" maxlength="80" required autocomplete="name"></div>' +
        '<div class="field"><label for="co-wa">' + esc(I.t('whatsappNumber')) + '</label>' +
          '<input id="co-wa" name="customerWhatsapp" type="tel" maxlength="20" required placeholder="+15551234567" autocomplete="tel"></div>' +
        '<div class="field"><label for="co-phone">' + esc(I.t('phoneOptional')) + '</label>' +
          '<input id="co-phone" name="customerPhone" type="tel" maxlength="20" autocomplete="tel"></div>' +
        '<div class="field"><label for="co-address">' + esc(needsAddress ? I.t('deliveryAddress') : I.t('addressOptional')) + '</label>' +
          '<textarea id="co-address" name="customerAddress" maxlength="250">' + '</textarea></div>' +
        '<div class="field"><label for="co-notes">' + esc(I.t('notesOptional')) + '</label>' +
          '<input id="co-notes" name="notes" type="text" maxlength="400"></div>' +
      '</form>'
    );
  }

  async function submitOrder(e) {
    e.preventDefault();
    const errBox = document.getElementById('checkout-error');
    errBox.classList.add('hidden');

    const payload = {
      customerName: document.getElementById('co-name').value,
      customerWhatsapp: document.getElementById('co-wa').value,
      customerPhone: document.getElementById('co-phone').value,
      customerAddress: document.getElementById('co-address').value,
      notes: document.getElementById('co-notes').value,
      orderType,
      items: cartEntries().map((e2) => ({ itemId: e2.item.id, quantity: e2.qty })),
    };

    const btn = document.getElementById('place-order-btn');
    btn.disabled = true;
    try {
      const data = await api.post('/api/restaurants/' + encodeURIComponent(slug) + '/orders', payload);
      cart = {};
      saveCart();
      updateCartBar();
      renderSuccess(data.order);
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.remove('hidden');
    } finally {
      btn.disabled = false;
    }
  }

  function renderSuccess(order) {
    const content = document.getElementById('sheet-content');
    content.innerHTML =
      '<h2 class="sf-sheet-title">' + esc(I.t('placedHead')) + '</h2>' +
      '<div class="notice notice-ok">' + esc(I.t('showCode')) + '</div>' +
      '<div class="sf-success-code">' + esc(order.code) + '</div>' +
      '<p class="muted small sf-success-total">' + esc(I.t('totalLabel')) + ' <strong>' + fmtMoney(order.total_cents, view.settings.currency) + '</strong></p>' +
      '<a class="sf-link-cta" href="/track?code=' + encodeURIComponent(order.code) + '">' + esc(I.t('trackMyOrder')) + '</a>' +
      '<button type="button" id="close-sheet-btn" class="btn btn-outline btn-block mt-1">' + esc(I.t('done')) + '</button>';
    document.getElementById('close-sheet-btn').addEventListener('click', closeSheet);
  }

  /* ---------------------------- share -------------------------------- */

  function sharePage() {
    const url = location.href;
    const data = { title: view.name, text: I.t('checkOut', { name: view.name }), url };
    if (navigator.share) {
      navigator.share(data).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => window.App.toast(I.t('linkCopied')));
    }
  }

  /* ----------------------------- boot -------------------------------- */

  async function boot() {
    try {
      view = await api.get('/api/restaurants/' + encodeURIComponent(slug) + '/menu');
    } catch (err) {
      document.getElementById('notice-zone').innerHTML =
        '<div class="notice notice-error mt-3">' + esc(err.message) + '</div>';
      document.getElementById('chips').remove();
      document.getElementById('cart-bar').remove();
      return;
    }

    applyTheme();
    document.title = view.name;
    renderHero();
    renderChips();
    renderMenu();
    updateCartBar();

    // Reorder from a previous order (navigated here with ?reorder=itemId:qty,...)
    const reorderRaw = qsParam('reorder');
    if (reorderRaw) {
      try {
        const entries = reorderRaw.split(',').map((p) => {
          const [id, q] = p.split(':');
          return { id: String(id).trim(), qty: Math.max(1, Math.min(Number(q), 99) || 1) };
        });
        entries.forEach((e) => {
          if (view.items.some((i) => i.id === e.id)) cart[e.id] = e.qty;
        });
        saveCart();
        updateCartBar();
      } catch (_) { /* ignore malformed reorder param */ }
    }

    const notices = [];
    if (!view.openNow) {
      notices.push('<div class="notice notice-warn mt-2">' + esc(I.t('closedNotice')) + '</div>');
    }
    document.getElementById('notice-zone').innerHTML = notices.join('');

    document.getElementById('open-cart-btn').addEventListener('click', () => {
      if (totalUnits() === 0) return;
      renderCartSheet();
      openSheet();
    });

    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) shareBtn.addEventListener('click', sharePage);

    document.getElementById('sheet-backdrop').addEventListener('click', closeSheet);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSheet();
    });

    // Re-render everything when the user switches language.
    I.onChange(() => {
      renderHero();
      renderChips();
      renderMenu();
      updateCartBar();
      const notices2 = [];
      if (!view.openNow) {
        notices2.push('<div class="notice notice-warn mt-2">' + esc(I.t('closedNotice')) + '</div>');
      }
      document.getElementById('notice-zone').innerHTML = notices2.join('');
      const sb = document.getElementById('share-btn');
      if (sb) sb.addEventListener('click', sharePage);
      if (document.getElementById('sheet').classList.contains('open') && totalUnits() > 0) {
        renderCartSheet();
      }
    });
  }

  boot();
})();

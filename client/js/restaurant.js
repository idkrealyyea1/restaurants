'use strict';

/**
 * Public storefront: menu browsing, search, cart and checkout.
 * The SERVER computes all totals — the cart here is only for UX.
 */

(function () {
  const { api, esc, fmtMoney, qsParam } = window.App;

  /* ------------------------- resolve slug -------------------------- */
  let slug = qsParam('r');
  if (!slug && location.pathname.startsWith('/restaurant/')) {
    slug = decodeURIComponent(location.pathname.split('/')[2] || '');
  }
  slug = (slug || '').toLowerCase();

  if (!slug) {
    document.getElementById('hero').innerHTML =
      '<div class="container mt-3"><div class="notice notice-error">No restaurant specified.</div></div>';
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
    const root = document.documentElement;
    if (/^#[0-9a-f]{6}$/i.test(s.primaryColor || '')) root.style.setProperty('--primary', s.primaryColor);
    if (/^#[0-9a-f]{6}$/i.test(s.secondaryColor || '')) root.style.setProperty('--secondary', s.secondaryColor);
  }

  function renderHero() {
    const s = view.settings || {};
    const statusBadge = view.openNow
      ? '<span class="badge badge-open">Open now</span>'
      : '<span class="badge badge-closed">Closed</span>';

    const waBtn = s.whatsapp
      ? '<a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="https://wa.me/' +
        encodeURIComponent(s.whatsapp.replace(/[^0-9]/g, '')) + '">WhatsApp</a>'
      : '';

    document.getElementById('hero').innerHTML =
      '<section class="hero">' +
        (s.coverPath ? '<img class="hero-cover" src="' + esc(s.coverPath) + '" alt="">' : '') +
        '<div class="hero-body">' +
          '<img class="hero-logo" src="' + esc(s.logoPath || '/images/logo-placeholder.svg') + '" alt="Logo">' +
          '<div>' +
            '<h1 class="hero-name">' + esc(view.name) + '</h1>' +
            (s.description ? '<p class="hero-desc">' + esc(s.description) + '</p>' : '') +
            '<div class="hero-meta">' + statusBadge + waBtn +
              '<button id="share-btn" type="button" class="btn btn-outline btn-sm">Share</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>';
  }

  /* ---------------------- categories & menu ------------------------- */

  let activeCategory = 'all';
  let searchTerm = '';

  function renderChips() {
    const chipsEl = document.getElementById('chips');
    const cats = [{ id: 'all', name: 'All' }, { id: 'popular', name: 'Popular' }].concat(view.categories);

    chipsEl.innerHTML = cats.map((c) =>
      '<button type="button" class="chip' + (c.id === activeCategory ? ' active' : '') +
      '" data-cat="' + esc(c.id) + '">' + esc(c.name) + '</button>'
    ).join('');

    chipsEl.querySelectorAll('.chip').forEach((btn) => {
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
      zone.innerHTML = '<div class="empty-state card">The menu is empty right now. Check back soon.</div>';
      return;
    }
    if (items.length === 0) {
      zone.innerHTML = '<div class="empty-state card">No items match your search.</div>';
      return;
    }

    zone.innerHTML =
      '<input id="menu-search" class="search-input" type="text" placeholder="Search the menu&hellip;" maxlength="60" value="' + esc(searchTerm) + '">' +
      '<div id="menu-grid" class="menu-grid mt-2">' + items.map((item) => renderItemCard(item)).join('') + '</div>';

    const search = document.getElementById('menu-search');
    search.addEventListener('input', () => {
      searchTerm = search.value.trim().toLowerCase();
      // Update only the grid so the search box keeps focus.
      const grid = document.getElementById('menu-grid');
      const visible = view.items.filter(itemVisible);
      grid.innerHTML = visible.length
        ? visible.map(renderItemCard).join('')
        : '<div class="empty-state" role="status">No items match your search.</div>';
      bindAddButtons();
    });

    bindAddButtons();
  }

  function renderItemCard(item) {
    const soldOut = !item.is_available;
    const imgTag = item.image_path
      ? '<img class="menu-item-img" loading="lazy" src="' + esc(item.image_path) + '" alt="">'
      : '<div class="menu-item-img"></div>';
    const badges =
      (item.is_popular ? '<span class="badge badge-popular">Popular</span> ' : '') +
      (soldOut ? '<span class="badge badge-soldout">Sold out</span>' : '');

    return (
      '<article class="menu-item-card' + (soldOut ? ' unavailable' : '') + '" data-item="' + esc(item.id) + '">' +
        imgTag +
        '<div class="menu-item-info">' +
          '<h3 class="menu-item-name">' + esc(item.name) + '</h3>' +
          badges +
          (item.description ? '<p class="menu-item-desc">' + esc(item.description) + '</p>' : '') +
          '<div class="flex-between mt-1">' +
            '<span class="menu-item-price">' + fmtMoney(item.price_cents, view.settings.currency) + '</span>' +
            (soldOut
              ? ''
              : '<button type="button" class="btn btn-sm add-btn" data-item="' + esc(item.id) + '">Add</button>') +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function bindAddButtons() {
    document.querySelectorAll('.add-btn').forEach((btn) => {
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
    return Object.values(cart).reduce((a, b) => a + b, 0);
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
      units + ' item' + (units > 1 ? 's' : '') + ' &middot; ' +
      fmtMoney(subtotalCents(), view.settings.currency);
  }

  function addToCart(itemId) {
    cart[itemId] = Math.min((cart[itemId] || 0) + 1, 99);
    saveCart();
    updateCartBar();
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
      content.innerHTML = '<h2>Your cart is empty</h2><p class="muted small">Add items from the menu first.</p>' +
        '<button type="button" id="close-sheet-btn" class="btn btn-block btn-outline">Close</button>';
      document.getElementById('close-sheet-btn').addEventListener('click', closeSheet);
      return;
    }

    const fee = deliveryFeeCents();
    const sub = subtotalCents();

    content.innerHTML =
      '<h2>Your order</h2>' +
      entries.map((e) =>
        '<div class="cart-line">' +
          '<div class="qty-controls">' +
            '<button type="button" class="qty-btn" data-dec="' + esc(e.item.id) + '" aria-label="Decrease">&minus;</button>' +
            '<span>' + e.qty + '</span>' +
            '<button type="button" class="qty-btn" data-inc="' + esc(e.item.id) + '" aria-label="Increase">+</button>' +
          '</div>' +
          '<span class="small">' + esc(e.item.name) + '</span>' +
          '<span class="spacer"></span>' +
          '<strong>' + fmtMoney(e.item.price_cents * e.qty, view.settings.currency) + '</strong>' +
        '</div>'
      ).join('') +
      '<div class="type-toggle mt-2">' +
        '<button type="button" data-type="pickup"' + (orderType === 'pickup' ? ' class="active"' : '') + '>Pickup</button>' +
        '<button type="button" data-type="delivery"' + (orderType === 'delivery' ? ' class="active"' : '') + '>Delivery</button>' +
      '</div>' +
      '<div class="total-row"><span>Subtotal</span><span>' + fmtMoney(sub, view.settings.currency) + '</span></div>' +
      (orderType === 'delivery'
        ? '<div class="total-row"><span>Delivery fee</span><span>' + fmtMoney(fee, view.settings.currency) + '</span></div>'
        : '') +
      '<div class="total-row grand"><span>Total</span><span>' + fmtMoney(sub + fee, view.settings.currency) + '</span></div>' +
      checkoutFormHtml() +
      '<div id="checkout-error" class="notice notice-error hidden mt-1"></div>' +
      '<button type="submit" form="checkout-form" class="btn btn-block mt-2" id="place-order-btn">Place order</button>' +
      '<button type="button" id="close-sheet-btn" class="btn btn-outline btn-block mt-1">Keep browsing</button>';

    // Wire quantity controls.
    content.querySelectorAll('[data-inc]').forEach((b) => b.addEventListener('click', () => setQty(b.dataset.inc, (cart[b.dataset.inc] || 0) + 1)));
    content.querySelectorAll('[data-dec]').forEach((b) => b.addEventListener('click', () => setQty(b.dataset.dec, (cart[b.dataset.dec] || 0) - 1)));

    content.querySelectorAll('.type-toggle button').forEach((b) => {
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
        '<div class="field"><label for="co-name">Your name *</label>' +
          '<input id="co-name" name="customerName" type="text" maxlength="80" required autocomplete="name"></div>' +
        '<div class="field"><label for="co-wa">WhatsApp number *</label>' +
          '<input id="co-wa" name="customerWhatsapp" type="tel" maxlength="20" required placeholder="+15551234567" autocomplete="tel"></div>' +
        '<div class="field"><label for="co-phone">Phone (optional)</label>' +
          '<input id="co-phone" name="customerPhone" type="tel" maxlength="20" autocomplete="tel"></div>' +
        '<div class="field"><label for="co-address">' + (needsAddress ? 'Delivery address *' : 'Address (optional)') + '</label>' +
          '<textarea id="co-address" name="customerAddress" maxlength="250">' + '</textarea></div>' +
        '<div class="field"><label for="co-notes">Notes (optional)</label>' +
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
      '<h2>Order placed!</h2>' +
      '<div class="notice notice-ok">Show this tracking code to follow your order.</div>' +
      '<h1 class="order-code mt-1">' + esc(order.code) + '</h1>' +
      '<p class="muted small">Total: <strong>' + fmtMoney(order.total_cents, view.settings.currency) + '</strong></p>' +
      '<a class="btn btn-secondary btn-block mt-1" href="/track?code=' + encodeURIComponent(order.code) + '">Track my order</a>' +
      '<button type="button" id="close-sheet-btn" class="btn btn-outline btn-block mt-1">Done</button>';
    document.getElementById('close-sheet-btn').addEventListener('click', closeSheet);
  }

  /* ---------------------------- share -------------------------------- */

  function sharePage() {
    const url = location.href;
    const data = { title: view.name, text: 'Check out ' + view.name, url };
    if (navigator.share) {
      navigator.share(data).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => window.App.toast('Link copied'));
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

    const notices = [];
    if (!view.openNow) {
      notices.push('<div class="notice notice-warn mt-2">This restaurant is currently closed — you can browse the menu, but new orders cannot be placed right now.</div>');
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
  }

  boot();
})();

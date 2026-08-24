'use strict';

/**
 * Restaurant admin dashboard: dashboard, live orders (SSE), menu,
 * settings, analytics and sharing. All data flows through the REST API.
 */

(function () {
  const { api, esc, fmtMoney, fmtDateTime, debounce, toast, STATUS_LABELS } = window.App;

  /* ----------------------------- state ------------------------------ */

  let me = null;
  let info = null;          // { restaurant:{...}, settings:{...}, openNow }
  let currency = 'USD';
  let items = [];
  let categories = [];
  const ordersCache = new Map();

  /* --------------------------- bootstrap ---------------------------- */

  async function boot() {
    try {
      const meData = await api.get('/api/auth/me');
      if (!meData.user) {
        location.href = '/login.html';
        return;
      }
      if (meData.user.role === 'owner') {
        location.href = '/owner.html';
        return;
      }
      me = meData.user;

      await reloadInfo();
      bindChrome();
      switchTab('dashboard');
      connectEvents();
    } catch (err) {
      toast(err.message || 'Failed to load', 'error');
    }
  }

  async function reloadInfo() {
    info = await api.get('/api/admin/restaurant');
    currency = info.settings.currency;
    document.getElementById('restaurant-name').textContent = info.restaurant.name;
    document.title = info.restaurant.name + ' — Dashboard';

    const logo = document.getElementById('brand-logo');
    if (info.settings.logoPath) {
      logo.src = info.settings.logoPath;
      logo.classList.remove('hidden');
    }

    renderOpenBadge();
  }

  function renderOpenBadge() {
    const badge = document.getElementById('open-badge');
    badge.innerHTML = info.restaurant.status === 'open'
      ? '<span class="badge badge-open">Open</span>'
      : '<span class="badge badge-closed">' + (info.restaurant.status === 'temporarily_closed' ? 'Temporarily closed' : 'Closed') + '</span>';
  }

  function bindChrome() {
    document.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    document.getElementById('logout-btn').addEventListener('click', async () => {
      await api.post('/api/auth/logout').catch(() => {});
      location.href = '/login.html';
    });

    // Modal close
    const backdrop = document.getElementById('modal-backdrop');
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });
  }

  function switchTab(tab) {
    document.querySelectorAll('.side-link, .tab-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    ['dashboard', 'orders', 'menu', 'settings', 'analytics', 'share'].forEach((t) => {
      document.getElementById('tab-' + t).classList.toggle('hidden', t !== tab);
    });
    if (tab === 'dashboard') loadDashboard();
    if (tab === 'orders') loadOrders();
    if (tab === 'menu') loadMenu();
    if (tab === 'settings') loadSettings();
    if (tab === 'analytics') loadAnalytics();
    if (tab === 'share') loadShare();
  }

  /* ----------------------------- modal ------------------------------- */

  function openModal(html) {
    document.getElementById('modal-box').innerHTML = html;
    document.getElementById('modal-backdrop').classList.add('open');
  }
  function closeModal() {
    document.getElementById('modal-backdrop').classList.remove('open');
  }

  /* --------------------------- dashboard ----------------------------- */

  async function loadDashboard() {
    const zone = document.getElementById('tab-dashboard');
    try {
      const d = await api.get('/api/admin/dashboard');
      const usage = d.maxMenuItems ? d.itemCount + ' / ' + d.maxMenuItems : String(d.itemCount);

      zone.innerHTML =
        '<div class="grid-stats mb-2">' +
          statCard('Orders today', d.counts.ordersToday) +
          statCard('Pending', d.counts.pendingOrders) +
          statCard('Revenue today', fmtMoney(d.counts.revenueTodayCents, currency)) +
          statCard('Menu items', usage) +
        '</div>' +
        '<div class="card"><div class="flex-between"><h2 class="section-title">Restaurant status</h2>' +
        '<button id="goto-settings" type="button" class="btn btn-outline btn-sm">Change</button></div>' +
        '<p>' + statusText(d.openNow) + '</p></div>' +
        '<h2 class="section-title">Pending orders</h2><div id="dash-pending"></div>';

      document.getElementById('goto-settings').addEventListener('click', () => switchTab('settings'));

      const list = document.getElementById('dash-pending');
      const { orders } = await api.get('/api/admin/orders?status=pending&limit=10');
      list.innerHTML = orders.length
        ? orders.map(orderCardHtml).join('')
        : '<div class="empty-state card">No pending orders. You are all caught up.</div>';
      wireOrderActions(list);
    } catch (err) {
      zone.innerHTML = errorHtml(err);
    }
  }

  function statCard(label, value) {
    return '<div class="stat"><div class="stat-label">' + esc(String(label)) + '</div><div class="stat-value">' + esc(String(value)) + '</div></div>';
  }

  function statusText(openNow) {
    if (!info.restaurant.status || info.restaurant.status === 'open') {
      return openNow ? 'Open — accepting orders.' : 'Status is "Open" but outside opening hours — orders are rejected.';
    }
    return 'Closed — customers can browse the menu but cannot order.';
  }

  /* ----------------------------- orders ------------------------------ */

  const NEXT_ACTIONS = {
    pending: [['confirmed', 'Confirm', 'btn-success'], ['cancelled', 'Cancel', 'btn-outline']],
    confirmed: [['preparing', 'Start preparing', 'btn-secondary'], ['cancelled', 'Cancel', 'btn-outline']],
    preparing: [['ready', 'Mark ready', 'btn-secondary'], ['cancelled', 'Cancel', 'btn-outline']],
    ready: null, // depends on order_type
    out_for_delivery: [['completed', 'Complete', 'btn-success']],
    completed: [],
    cancelled: [],
  };

  function actionsFor(order) {
    let defs = NEXT_ACTIONS[order.status];
    if (order.status === 'ready') {
      defs = order.order_type === 'delivery'
        ? [['out_for_delivery', 'Out for delivery', 'btn-secondary'], ['completed', 'Complete', 'btn-success']]
        : [['completed', 'Complete', 'btn-success']];
    }
    return defs || [];
  }

  function orderCardHtml(o) {
    const lines = o.items
      ? o.items.map((it) => '<li>' + esc(it.quantity) + ' &times; ' + esc(it.item_name) + '</li>').join('')
      : '';

    const actions = actionsFor(o).map(([next, label, cls]) =>
      '<button type="button" class="btn btn-sm ' + cls + '" data-order="' + esc(o.id) + '" data-next="' + next + '">' + label + '</button>'
    ).join('');

    return (
      '<article class="card order-card" id="order-' + esc(o.id) + '">' +
        '<div class="order-head">' +
          '<span class="order-code">' + esc(o.code) + '</span>' +
          '<span class="badge status-' + esc(o.status) + '">' + (STATUS_LABELS[o.status] || esc(o.status)) + '</span>' +
        '</div>' +
        '<div class="order-meta mt-1">' +
          esc(o.customer_name) + ' &middot; ' + esc(o.customer_whatsapp) + ' &middot; ' +
          esc(o.order_type) + ' &middot; ' + fmtDateTime(o.created_at) +
        '</div>' +
        (o.items
          ? '<ul class="order-lines small">' + lines + '</ul>' +
            '<strong>Total: ' + fmtMoney(o.total_cents, currency) + '</strong>'
          : '<div class="mt-1"><button type="button" class="btn btn-outline btn-sm" data-expand="' + esc(o.id) + '">Details</button> <strong id="sum-' + esc(o.id) + '">' + fmtMoney(o.total_cents, currency) + '</strong></div>') +
        (o.notes ? '<p class="small mt-1"><em>Note: ' + esc(o.notes) + '</em></p>' : '') +
        (actions ? '<div class="order-actions">' + actions + '</div>' : '') +
      '</article>'
    );
  }

  function wireOrderActions(rootEl) {
    rootEl.querySelectorAll('[data-order]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          const res = await api.patch('/api/admin/orders/' + btn.dataset.order + '/status', { status: btn.dataset.next });
          toast('Order ' + res.order.code + ' → ' + STATUS_LABELS[res.order.status], 'success');
          refreshCurrentOrdersView();
          if (!document.getElementById('tab-dashboard').classList.contains('hidden')) loadDashboard();
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false;
        }
      });
    });

    rootEl.querySelectorAll('[data-expand]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          const res = await api.get('/api/admin/orders/' + btn.dataset.expand);
          const el = document.getElementById('order-' + btn.dataset.expand);
          const head = el.querySelector('.order-head');
          if (!el.querySelector('.order-lines')) {
            head.insertAdjacentHTML('afterend',
              '<ul class="order-lines small">' +
              res.order.items.map((it) => '<li>' + esc(it.quantity) + ' &times; ' + esc(it.item_name) + ' — ' + fmtMoney(it.line_total_cents, currency) + '</li>').join('') +
              '</ul>');
          }
          btn.remove();
        } catch (err) {
          toast(err.message, 'error');
        }
      });
    });
  }

  let ordersFilter = '';
  let ordersPage = 1;

  async function loadOrders() {
    const zone = document.getElementById('tab-orders');

    if (!zone.dataset.built) {
      zone.innerHTML =
        '<div class="flex-between mb-2">' +
          '<h1 class="section-title">Orders</h1>' +
          '<select id="orders-filter">' +
            '<option value="">All statuses</option>' +
            Object.entries(STATUS_LABELS).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') +
          '</select>' +
        '</div>' +
        '<div id="orders-list"></div>' +
        '<div class="flex-between mt-2">' +
          '<button id="orders-prev" type="button" class="btn btn-outline btn-sm">Prev</button>' +
          '<span id="orders-page-info" class="muted small"></span>' +
          '<button id="orders-next" type="button" class="btn btn-outline btn-sm">Next</button>' +
        '</div>';
      zone.dataset.built = '1';
      document.getElementById('orders-filter').addEventListener('change', (e) => {
        ordersFilter = e.target.value;
        ordersPage = 1;
        fetchOrders();
      });
      document.getElementById('orders-prev').addEventListener('click', () => {
        if (ordersPage > 1) { ordersPage--; fetchOrders(); }
      });
      document.getElementById('orders-next').addEventListener('click', () => { ordersPage++; fetchOrders(); });
    }
    fetchOrders();
  }

  async function fetchOrders() {
    const list = document.getElementById('orders-list');
    list.innerHTML = '<div class="empty-state">Loading…</div>';
    try {
      const q = '?page=' + ordersPage + '&limit=20' + (ordersFilter ? '&status=' + ordersFilter : '');
      const data = await api.get('/api/admin/orders' + q);

      // Cache full objects for SSE-driven updates.
      for (const summary of data.orders) ordersCache.set(summary.id, summary);

      const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
      ordersPage = Math.min(ordersPage, totalPages);

      list.innerHTML = data.orders.length
        ? data.orders.map(orderCardHtml).join('')
        : '<div class="empty-state card">No orders found.</div>';
      document.getElementById('orders-page-info').textContent =
        'Page ' + ordersPage + ' of ' + totalPages + ' (' + data.total + ' total)';
      wireOrderActions(list);
    } catch (err) {
      list.innerHTML = errorHtml(err);
    }
  }

  function refreshCurrentOrdersView() {
    if (!document.getElementById('tab-orders').classList.contains('hidden')) fetchOrders();
  }

  /* ------------------------- live updates (SSE) ----------------------- */

  let eventSource = null;

  function connectEvents() {
    if (eventSource) eventSource.close();
    eventSource = new EventSource('/api/admin/events');

    eventSource.addEventListener('order:new', () => {
      toast('New order received!', 'success');
      refreshCurrentOrdersView();
      if (!document.getElementById('tab-dashboard').classList.contains('hidden')) loadDashboard();
    });
    eventSource.addEventListener('order:status', () => refreshCurrentOrdersView());
    eventSource.onerror = () => {
      // EventSource retries automatically.
    };
  }

  window.addEventListener('beforeunload', () => {
    if (eventSource) eventSource.close();
  });

  /* ------------------------------ menu -------------------------------- */

  async function loadMenu() {
    const zone = document.getElementById('tab-menu');
    zone.innerHTML = '<div class="empty-state">Loading menu…</div>';
    try {
      const [catRes, itemRes] = await Promise.all([
        api.get('/api/admin/categories'),
        api.get('/api/admin/items'),
      ]);
      categories = catRes.categories;
      items = itemRes.items;
      renderMenuTab();
    } catch (err) {
      zone.innerHTML = errorHtml(err);
    }
  }

  function renderMenuTab() {
    const zone = document.getElementById('tab-menu');
    const limit = info.restaurant.maxMenuItems;
    const used = items.length;
    const nearLimit = limit - used <= Math.max(3, Math.ceil(limit * 0.1));

    zone.innerHTML =
      '<div class="flex-between mb-2">' +
        '<h1 class="section-title">Menu <span class="badge' + (nearLimit ? ' badge-closed' : '') + '">' + used + ' / ' + limit + ' items</span></h1>' +
        '<div><button id="add-category-btn" type="button" class="btn btn-outline btn-sm">Add category</button> ' +
        '<button id="add-item-btn" type="button" class="btn btn-sm"' + (used >= limit ? ' disabled title="Menu limit reached"' : '') + '>Add item</button></div>' +
      '</div>' +
      '<div id="menu-tree"></div>';

    document.getElementById('add-category-btn').addEventListener('click', categoryModal);
    document.getElementById('add-item-btn').addEventListener('click', () => itemModal(null));

    const tree = document.getElementById('menu-tree');
    tree.innerHTML = categories.map((c) => {
      const catItems = items.filter((i) => i.category_id === c.id);
      return (
        '<section class="card">' +
          '<div class="flex-between mb-1">' +
            '<h2 class="section-title">' + esc(c.name) + ' <span class="muted small">(' + catItems.length + ')</span></h2>' +
            '<div>' +
              '<button type="button" class="btn btn-outline btn-sm" data-edit-cat="' + esc(c.id) + '">Rename</button> ' +
              '<button type="button" class="btn btn-danger btn-sm" data-del-cat="' + esc(c.id) + '">Delete</button>' +
            '</div>' +
          '</div>' +
          (catItems.length
            ? '<div class="table-wrap"><table class="data"><thead><tr><th>Item</th><th>Price</th><th>Flags</th><th></th></tr></thead><tbody>' +
              catItems.map(itemRowHtml).join('') +
              '</tbody></table></div>'
            : '<p class="muted small">No items in this category yet.</p>') +
        '</section>'
      );
    }).join('');

    tree.querySelectorAll('[data-edit-cat]').forEach((b) =>
      b.addEventListener('click', () => categoryModal(categories.find((c) => c.id === b.dataset.editCat))));
    tree.querySelectorAll('[data-del-cat]').forEach((b) =>
      b.addEventListener('click', () => deleteCategory(b.dataset.delCat)));
    tree.querySelectorAll('[data-edit-item]').forEach((b) =>
      b.addEventListener('click', () => itemModal(items.find((i) => i.id === b.dataset.editItem))));
    tree.querySelectorAll('[data-del-item]').forEach((b) =>
      b.addEventListener('click', () => deleteItem(b.dataset.delItem)));
    tree.querySelectorAll('[data-toggle-item]').forEach((b) =>
      b.addEventListener('click', () => toggleAvailability(b.dataset.toggleItem, b.dataset.to === 'true')));
    tree.querySelectorAll('[data-pop-item]').forEach((b) =>
      b.addEventListener('click', () => togglePopular(b.dataset.popItem, b.dataset.pop === 'true')));

    if (categories.length === 0) {
      tree.innerHTML = '<div class="empty-state card">Create your first category to start building the menu.</div>';
    }
  }

  function itemRowHtml(i) {
    return (
      '<tr>' +
        '<td><strong>' + esc(i.name) + '</strong>' +
          (i.description ? '<div class="muted small">' + esc(i.description.slice(0, 60)) + '</div>' : '') + '</td>' +
        '<td>' + fmtMoney(i.price_cents, currency) + '</td>' +
        '<td>' +
          (i.is_available
            ? ''
            : '<span class="badge badge-soldout">Sold out</span> ') +
          (i.is_popular ? '<span class="badge badge-popular">Popular</span>' : '') +
        '</td>' +
        '<td>' +
          '<div class="flex-between">' +
            '<button type="button" class="btn btn-outline btn-sm" data-toggle-item="' + esc(i.id) + '" data-to="' + (!i.is_available) + '">' +
              (i.is_available ? 'Sold out?' : 'Available?') + '</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-pop-item="' + esc(i.id) + '" data-pop="' + (!i.is_popular) + '">' +
              (i.is_popular ? 'Unmark popular' : 'Popular?') + '</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-edit-item="' + esc(i.id) + '">Edit</button>' +
            '<button type="button" class="btn btn-danger btn-sm" data-del-item="' + esc(i.id) + '">Delete</button>' +
          '</div>' +
        '</td>' +
      '</tr>'
    );
  }

  function categoryModal(category) {
    openModal(
      '<div class="modal-head"><h2>' + (category ? 'Rename category' : 'New category') + '</h2>' +
        '<button type="button" class="modal-close" aria-label="Close">&times;</button></div>' +
      '<form id="category-form">' +
        '<div class="field"><label for="cat-name">Name</label>' +
          '<input id="cat-name" maxlength="60" required value="' + esc(category ? category.name : '') + '"></div>' +
        '<button type="submit" class="btn btn-block">Save</button>' +
      '</form>'
    );
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.getElementById('category-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('cat-name').value.trim();
      try {
        if (category) await api.patch('/api/admin/categories/' + category.id, { name });
        else await api.post('/api/admin/categories', { name });
        closeModal();
        toast('Category saved', 'success');
        loadMenu();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }

  async function deleteCategory(id) {
    const cat = categories.find((c) => c.id === id);
    if (!confirm('Delete "' + cat.name + '" and ALL its menu items? This cannot be undone.')) return;
    try {
      await api.del('/api/admin/categories/' + id);
      toast('Category deleted', 'success');
      await reloadInfo();
      loadMenu();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function itemModal(item) {
    if (categories.length === 0) {
      toast('Create a category first', 'error');
      return;
    }
    const isNew = !item;

    openModal(
      '<div class="modal-head"><h2>' + (isNew ? 'New menu item' : 'Edit menu item') + '</h2>' +
        '<button type="button" class="modal-close" aria-label="Close">&times;</button></div>' +
      '<form id="item-form">' +
        '<div class="field"><label for="it-name">Name *</label>' +
          '<input id="it-name" maxlength="100" required value="' + esc(item ? item.name : '') + '"></div>' +
        '<div class="field"><label for="it-desc">Description</label>' +
          '<textarea id="it-desc" maxlength="500">' + esc(item ? item.description : '') + '</textarea></div>' +
        '<div class="form-row form-row-2">' +
          '<div class="field"><label for="it-price">Price *</label>' +
            '<input id="it-price" type="number" min="0" step="0.01" required value="' + (item ? (item.price_cents / 100).toFixed(2) : '') + '"></div>' +
          '<div class="field"><label for="it-cat">Category *</label>' +
            '<select id="it-cat">' +
              categories.map((c) => '<option value="' + esc(c.id) + '"' +
                (item && item.category_id === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') +
            '</select></div>' +
        '</div>' +
        '<div class="checkbox-line mb-1"><input id="it-available" type="checkbox"' + (!item || item.is_available ? ' checked' : '') + '><label for="it-available">Available</label></div>' +
        '<div class="checkbox-line mb-1"><input id="it-popular" type="checkbox"' + (item && item.is_popular ? ' checked' : '') + '><label for="it-popular">Show as popular</label></div>' +
        (isNew ? '' :
          '<div class="field mt-2"><label for="it-image">Image</label>' +
            (item.image_path ? '<img src="' + esc(item.image_path) + '" alt="" class="mb-1" width="120" height="90">' : '') +
            '<input id="it-image" type="file" accept="image/jpeg,image/png,image/webp">' +
            '<div class="hint">JPEG, PNG or WebP image, up to a few MB.</div>' +
          '</div>') +
        '<button type="submit" class="btn btn-block">' + (isNew ? 'Create item' : 'Save changes') + '</button>' +
      '</form>'
    );
    document.querySelector('.modal-close').addEventListener('click', closeModal);

    document.getElementById('item-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const priceMajor = parseFloat(document.getElementById('it-price').value);
      if (!Number.isFinite(priceMajor) || priceMajor < 0) {
        toast('Invalid price', 'error');
        return;
      }
      const body = {
        categoryId: document.getElementById('it-cat').value,
        name: document.getElementById('it-name').value.trim(),
        description: document.getElementById('it-desc').value.trim(),
        priceCents: Math.round(priceMajor * 100),
        isAvailable: document.getElementById('it-available').checked,
        isPopular: document.getElementById('it-popular').checked,
      };
      try {
        let saved;
        if (isNew) {
          saved = await api.post('/api/admin/items', body);
          toast('Item created', 'success');
        } else {
          saved = await api.patch('/api/admin/items/' + item.id, body);
          toast('Item updated', 'success');
        }
        // Upload image after save so it attaches immediately.
        const fileInput = document.getElementById('it-image');
        if (!isNew && fileInput && fileInput.files[0]) {
          const fd = new FormData();
          fd.append('image', fileInput.files[0]);
          await api.request('/api/admin/images?type=items&itemId=' + encodeURIComponent(saved.item.id), { method: 'POST', body: fd });
        }
        closeModal();
        await reloadInfo();
        loadMenu();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }

  async function deleteItem(id) {
    const item = items.find((i) => i.id === id);
    if (!confirm('Delete "' + item.name + '" from the menu?')) return;
    try {
      await api.del('/api/admin/items/' + id);
      toast('Item deleted', 'success');
      await reloadInfo();
      loadMenu();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function toggleAvailability(id, makeAvailable) {
    try {
      await api.patch('/api/admin/items/' + id, { isAvailable: makeAvailable });
      loadMenu();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function togglePopular(id, popular) {
    try {
      await api.patch('/api/admin/items/' + id, { isPopular: popular });
      loadMenu();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  /* ---------------------------- settings ------------------------------ */

  const TIMEZONES = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Mexico_City', 'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
    'Europe/Istanbul', 'Africa/Lagos', 'Africa/Cairo', 'Africa/Johannesburg', 'Asia/Dubai',
    'Asia/Karachi', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Shanghai', 'Asia/Tokyo',
    'Asia/Singapore', 'Australia/Sydney', 'Pacific/Auckland',
  ];
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  async function loadSettings() {
    const zone = document.getElementById('tab-settings');
    zone.innerHTML = '<div class="empty-state">Loading…</div>';
    try {
      const [res, hoursRes] = await Promise.all([api.get('/api/admin/settings'), api.get('/api/admin/hours')]);
      const s = res.settings;

      zone.innerHTML =
        '<h1 class="section-title">Settings</h1>' +

        '<section class="card"><h2>Profile</h2>' +
          '<div class="field"><label for="st-desc">Description</label><textarea id="st-desc" maxlength="500">' + esc(s.description) + '</textarea></div>' +
          '<div class="form-row form-row-2">' +
            '<div class="field"><label for="st-phone">Phone</label><input id="st-phone" type="tel" value="' + esc(s.phone) + '"></div>' +
            '<div class="field"><label for="st-wa">WhatsApp</label><input id="st-wa" type="tel" value="' + esc(s.whatsapp) + '"></div>' +
          '</div>' +
          '<div class="field"><label for="st-address">Address</label><textarea id="st-address" maxlength="300">' + esc(s.address) + '</textarea></div>' +
          '<div class="form-row form-row-2">' +
            '<div class="field"><label for="st-tz">Timezone</label><select id="st-tz">' +
              TIMEZONES.map((tz) => '<option' + (tz === s.timezone ? ' selected' : '') + '>' + tz + '</option>').join('') +
            '</select></div>' +
            '<div class="field"><label for="st-cur">Currency (ISO)</label><input id="st-cur" maxlength="3" value="' + esc(s.currency) + '"></div>' +
          '</div>' +
          '<div class="form-row form-row-2">' +
            '<div class="field"><label for="st-fee">Delivery fee (major units)</label><input id="st-fee" type="number" min="0" step="0.01" value="' + (s.deliveryFeeCents / 100).toFixed(2) + '"></div>' +
            '<div class="field"><label>&nbsp;</label><div class="checkbox-line"><input id="st-ignore-hours" type="checkbox"' + (s.ignoreOpeningHours ? ' checked' : '') + '>' +
              '<label for="st-ignore-hours">Ignore opening hours (always accept)</label></div></div>' +
          '</div>' +
        '</section>' +

        '<section class="card"><h2>Appearance</h2>' +
          '<div class="form-row form-row-2">' +
            '<div class="field"><label for="st-color1">Primary color</label><input id="st-color1" type="color" value="' + esc(s.primaryColor) + '"></div>' +
            '<div class="field"><label for="st-color2">Secondary color</label><input id="st-color2" type="color" value="' + esc(s.secondaryColor) + '"></div>' +
          '</div>' +
          '<div class="form-row form-row-2">' +
            '<div class="field"><label for="st-logo">Logo upload</label><input id="st-logo" type="file" accept="image/jpeg,image/png,image/webp">' +
              (s.logoPath ? '<img src="' + esc(s.logoPath) + '" alt="Logo" width="64" height="64" class="mt-1">' : '') + '</div>' +
            '<div class="field"><label for="st-cover">Cover upload</label><input id="st-cover" type="file" accept="image/jpeg,image/png,image/webp">' +
              (s.coverPath ? '<img src="' + esc(s.coverPath) + '" alt="Cover" width="96" height="54" class="mt-1">' : '') + '</div>' +
          '</div>' +
        '</section>' +

        '<section class="card"><h2>Status</h2>' +
          '<div class="field"><label for="st-status">Restaurant status</label><select id="st-status">' +
            '<option value="open"' + (info.restaurant.status === 'open' ? ' selected' : '') + '>Open — accepting orders</option>' +
            '<option value="closed"' + (info.restaurant.status === 'closed' ? ' selected' : '') + '>Closed</option>' +
            '<option value="temporarily_closed"' + (info.restaurant.status === 'temporarily_closed' ? ' selected' : '') + '>Temporarily closed</option>' +
          '</select></div>' +
        '</section>' +

        '<section class="card"><h2>Opening hours</h2>' +
          '<div class="table-wrap"><table class="data hours-table" id="hours-table"><tbody>' +
          DAY_NAMES.map((day, idx) => {
            const h = hoursRes.hours.find((x) => x.day === idx) || { opensAt: '09:00', closesAt: '22:00' };
            return (
              '<tr data-day="' + idx + '"><td><div class="checkbox-line"><input id="hc-' + idx + '" type="checkbox"' + (!h.closed ? ' checked' : '') + '><label for="hc-' + idx + '">' + day + '</label></div></td>' +
              '<td><input id="ho-' + idx + '" type="time" value="' + esc(h.opensAt) + '"></td>' +
              '<td><input id="hx-' + idx + '" type="time" value="' + esc(h.closesAt) + '"></td></tr>'
            );
          }).join('') +
          '</tbody></table></div>' +
          '<p class="hint muted small">If closing time is earlier than opening time, the range crosses midnight.</p>' +
        '</section>' +

        '<button id="save-settings-btn" type="button" class="btn btn-block mb-3">Save all settings</button>';

      document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
    } catch (err) {
      zone.innerHTML = errorHtml(err);
    }
  }

  async function saveSettings() {
    const feeVal = parseFloat(document.getElementById('st-fee').value);
    const settingsBody = {
      description: document.getElementById('st-desc').value,
      phone: document.getElementById('st-phone').value,
      whatsapp: document.getElementById('st-wa').value,
      address: document.getElementById('st-address').value,
      timezone: document.getElementById('st-tz').value,
      currency: document.getElementById('st-cur').value,
      primaryColor: document.getElementById('st-color1').value,
      secondaryColor: document.getElementById('st-color2').value,
      ignoreOpeningHours: document.getElementById('st-ignore-hours').checked,
      ...(Number.isFinite(feeVal) ? { deliveryFeeCents: Math.max(0, Math.round(feeVal * 100)) } : {}),
    };

    const hoursBody = [];
    for (let d = 0; d < 7; d++) {
      hoursBody.push({
        day: d,
        closed: !document.getElementById('hc-' + d).checked,
        opensAt: document.getElementById('ho-' + d).value || '09:00',
        closesAt: document.getElementById('hx-' + d).value || '22:00',
      });
    }

    const status = document.getElementById('st-status').value;
    const logoFile = document.getElementById('st-logo').files[0];
    const coverFile = document.getElementById('st-cover').files[0];

    try {
      await api.patch('/api/admin/settings', settingsBody);
      await api.put('/api/admin/hours', { hours: hoursBody });

      // Status lives on the restaurant record:
      if (status !== info.restaurant.status) {
        await setStatus(status);
      }
      if (logoFile) await uploadSettingImage(logoFile, 'logos');
      if (coverFile) await uploadSettingImage(coverFile, 'covers');

      toast('Settings saved', 'success');
      await reloadInfo();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function uploadSettingImage(file, type) {
    const fd = new FormData();
    fd.append('image', file);
    await api.request('/api/admin/images?type=' + type, { method: 'POST', body: fd });
  }

  /** Admins set their own restaurant status through the settings PATCH endpoint. */
  async function setStatus(status) {
    // Implemented server-side as part of admin settings: see admin.routes
    // PATCH /api/admin/status
    await api.request('/api/admin/status', { method: 'PATCH', body: { status } });
  }

  /* ---------------------------- analytics ------------------------------ */

  async function loadAnalytics() {
    const zone = document.getElementById('tab-analytics');
    zone.innerHTML = '<div class="empty-state">Loading…</div>';
    try {
      const days = Number(document.getElementById('an-days')?.value || 7);
      const a = await api.get('/api/admin/analytics?days=' + days);
      const maxOrders = Math.max(1, ...a.series.map((s) => s.orders));

      zone.innerHTML =
        '<div class="flex-between mb-2"><h1 class="section-title">Analytics</h1>' +
          '<select id="an-days"><option value="7"' + (days === 7 ? ' selected' : '') + '>Last 7 days</option>' +
          '<option value="30"' + (days === 30 ? ' selected' : '') + '>Last 30 days</option>' +
          '<option value="90"' + (days === 90 ? ' selected' : '') + '>Last 90 days</option></select></div>' +

        '<div class="grid-stats mb-2">' +
          statCard('Total orders', a.totals.orders) +
          statCard('Revenue', fmtMoney(a.totals.revenueCents, currency)) +
          statCard("Today's orders", a.today.ordersToday) +
          statCard('Revenue today', fmtMoney(a.today.revenueTodayCents, currency)) +
        '</div>' +

        '<section class="card"><h2>Daily orders</h2><div class="chart">' +
          a.series.map((s) =>
            '<div class="bar-wrap" title="' + esc(s.day) + ': ' + s.orders + ' orders">' +
              '<div class="bar" data-h="' + Math.round((s.orders / maxOrders) * 100) + '"></div>' +
              '<span class="bar-label">' + esc(s.day.slice(5)) + '</span></div>'
          ).join('') +
        '</div></section>' +

        '<section class="card"><h2>Most ordered items (30 days)</h2>' +
          (a.topItems.length
            ? a.topItems.map((t, i) =>
                '<div class="rank-row"><span>' + (i + 1) + '. ' + esc(t.item_name) + '</span>' +
                '<span><strong>' + t.units + '</strong> sold · ' + fmtMoney(t.revenueCents, currency) + '</span></div>'
              ).join('')
            : '<p class="muted">No sales yet.</p>') +
        '</section>';

      // CSP-safe bar heights via CSSOM.
      zone.querySelectorAll('.chart .bar').forEach((el) => {
        el.style.height = (el.dataset.h || 2) + '%';
        el.parentElement.style.justifyContent = 'flex-end';
      });

      document.getElementById('an-days').addEventListener('change', loadAnalytics);
    } catch (err) {
      zone.innerHTML = errorHtml(err);
    }
  }

  /* ------------------------------ share -------------------------------- */

  async function loadShare() {
    const zone = document.getElementById('tab-share');
    zone.innerHTML = '<div class="empty-state">Loading…</div>';
    try {
      const qr = await api.get('/api/admin/qr');
      const svgDataUri = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(qr.svg)));
      const publicUrl = location.origin + '/restaurant/' + encodeURIComponent(info.restaurant.slug);

      zone.innerHTML =
        '<h1 class="section-title">Share your restaurant</h1>' +
        '<section class="card qr-box">' +
          '<img src="' + svgDataUri + '" alt="QR code to your menu" width="260" height="260">' +
          '<p class="muted small mt-1">' + esc(qr.url) + '</p>' +
          '<div class="flex-between mt-1">' +
            '<a class="btn btn-primary" href="/restaurant/' + encodeURIComponent(info.restaurant.slug) + '" target="_blank" rel="noopener">Open public page</a>' +
            '<button id="copy-link-btn" type="button" class="btn btn-outline">Copy link</button>' +
          '</div>' +
        '</section>';
      document.getElementById('copy-link-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(publicUrl).then(() => toast('Link copied'), () => {});
      });
    } catch (err) {
      zone.innerHTML = errorHtml(err);
    }
  }

  function errorHtml(err) {
    return '<div class="notice notice-error mt-2">' + esc(err.message || 'Something went wrong') + '</div>';
  }

  boot();
})();

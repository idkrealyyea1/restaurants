'use strict';

/**
 * Platform owner dashboard: create/manage restaurants, admin accounts,
 * limits, activation and monitoring.
 */

(function () {
  const { api, esc, fmtMoney, fmtDateTime, debounce, toast, STATUS_LABELS } = window.App;

  let page = 1;
  let search = '';
  let statusFilter = '';

  /* ---------------------------- bootstrap ---------------------------- */

  async function boot() {
    try {
      const me = await api.get('/api/auth/me');
      if (!me.user) {
        location.href = '/login.html';
        return;
      }
      if (me.user.role !== 'owner') {
        location.href = '/admin.html';
        return;
      }
    } catch (_) {
      location.href = '/login.html';
      return;
    }

    document.getElementById('logout-btn').addEventListener('click', async () => {
      await api.post('/api/auth/logout').catch(() => {});
      location.href = '/login.html';
    });

    document.getElementById('new-restaurant-btn').addEventListener('click', createModal);
    document.getElementById('search-input').addEventListener('input', debounce(() => {
      search = document.getElementById('search-input').value.trim();
      page = 1;
      loadRestaurants();
    }, 300));
    document.getElementById('status-filter').addEventListener('change', (e) => {
      statusFilter = e.target.value;
      page = 1;
      loadRestaurants();
    });
    document.getElementById('page-prev').addEventListener('click', () => {
      if (page > 1) { page--; loadRestaurants(); }
    });
    document.getElementById('page-next').addEventListener('click', () => { page++; loadRestaurants(); });

    const backdrop = document.getElementById('modal-backdrop');
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });

    await Promise.all([loadOverview(), loadRestaurants()]);
  }

  function closeModal() {
    document.getElementById('modal-backdrop').classList.remove('open');
  }
  function openModal(html) {
    document.getElementById('modal-box').innerHTML = html;
    document.getElementById('modal-backdrop').classList.add('open');
  }

  /* ----------------------------- overview ----------------------------- */

  async function loadOverview() {
    try {
      const o = await api.get('/api/owner/overview');
      document.getElementById('overview-zone').innerHTML =
        '<div class="grid-stats mb-2">' +
          '<div class="stat"><div class="stat-label">Restaurants</div><div class="stat-value">' + o.restaurantsTotal + '</div></div>' +
          '<div class="stat"><div class="stat-label">Active</div><div class="stat-value">' + o.restaurantsActive + '</div></div>' +
          '<div class="stat"><div class="stat-label">Orders today</div><div class="stat-value">' + o.ordersToday + '</div></div>' +
          '<div class="stat"><div class="stat-label">Revenue today</div><div class="stat-value">' + esc(String(fmtMoney(o.revenueTodayCents, 'USD'))) + '</div></div>' +
        '</div>';
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  /* --------------------------- restaurants list ------------------------ */

  async function loadRestaurants() {
    const zone = document.getElementById('restaurants-zone');
    zone.innerHTML = '<div class="empty-state">Loading…</div>';
    try {
      const q = '?page=' + page + '&limit=20' +
        (search ? '&search=' + encodeURIComponent(search) : '') +
        (statusFilter ? '&status=' + statusFilter : '');
      const data = await api.get('/api/owner/restaurants' + q);

      zone.innerHTML = data.restaurants.length
        ? '<div class="table-wrap"><table class="data"><thead><tr>' +
            '<th>Name</th><th>Slug</th><th>Menu</th><th>Status</th><th>Created</th><th>Actions</th>' +
          '</tr></thead><tbody>' +
          data.restaurants.map((r) =>
            '<tr>' +
              '<td><strong>' + esc(r.name) + '</strong></td>' +
              '<td class="small muted">/' + esc(r.slug) + '</td>' +
              '<td>' + r.itemCount + ' / ' + r.maxMenuItems + '</td>' +
              '<td>' +
                (r.isActive
                  ? '<span class="badge badge-open">Active</span>'
                  : '<span class="badge badge-closed">Deactivated</span>') + ' ' +
                '<span class="badge">' + esc(r.status.replace('_', ' ')) + '</span>' +
              '</td>' +
              '<td class="small muted">' + fmtDateTime(r.createdAt) + '</td>' +
              '<td><div class="flex-between">' +
                '<a class="btn btn-outline btn-sm" href="/restaurant/' + encodeURIComponent(r.slug) + '" target="_blank" rel="noopener">Public</a>' +
                '<button type="button" class="btn btn-outline btn-sm" data-manage="' + esc(r.id) + '">Manage</button>' +
                '<button type="button" class="btn btn-outline btn-sm" data-edit="' + esc(r.id) + '">Edit</button>' +
                (r.isActive
                  ? '<button type="button" class="btn btn-danger btn-sm" data-deactivate="' + esc(r.id) + '" data-name="' + esc(r.name) + '">Disable</button>'
                  : '<button type="button" class="btn btn-success btn-sm" data-activate="' + esc(r.id) + '">Enable</button>') +
                '<button type="button" class="btn btn-danger btn-sm" data-delete="' + esc(r.id) + '" data-name="' + esc(r.name) + '">Delete</button>' +
              '</div></td>' +
            '</tr>'
          ).join('') +
          '</tbody></table></div>'
        : '<div class="empty-state">No restaurants found.</div>';

      document.getElementById('page-info').textContent =
        'Page ' + page + ' of ' + Math.max(1, Math.ceil(data.total / data.limit)) + ' (' + data.total + ')';

      wireRows(data.restaurants);
    } catch (err) {
      zone.innerHTML = '<div class="notice notice-error">' + esc(err.message) + '</div>';
    }
  }

  function findRestaurant(list, id) {
    return list.find((r) => r.id === id);
  }

  function wireRows(restaurants) {
    const zone = document.getElementById('restaurants-zone');

    zone.querySelectorAll('[data-manage]').forEach((b) =>
      b.addEventListener('click', () => manageModal(b.dataset.manage)));

    zone.querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', () => editModal(findRestaurant(restaurants, b.dataset.edit))));

    zone.querySelectorAll('[data-deactivate]').forEach((b) =>
      b.addEventListener('click', async () => {
        if (!confirm('Deactivate "' + b.dataset.name + '"? Admins will be locked out and ordering stops.')) return;
        await act(() => api.patch('/api/owner/restaurants/' + b.dataset.deactivate, { isActive: false }));
      }));

    zone.querySelectorAll('[data-activate]').forEach((b) =>
      b.addEventListener('click', async () => {
        await act(() => api.patch('/api/owner/restaurants/' + b.dataset.activate, { isActive: true }));
      }));

    zone.querySelectorAll('[data-delete]').forEach((b) =>
      b.addEventListener('click', async () => {
        if (!confirm('PERMANENTLY delete "' + b.dataset.name + '" with all menus, orders and accounts?')) return;
        await act(() => api.del('/api/owner/restaurants/' + b.dataset.delete));
      }));
  }

  async function act(fn) {
    try {
      await fn();
      toast('Done', 'success');
      closeModal();
      await Promise.all([loadOverview(), loadRestaurants()]);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  /* ------------------------------ modals -------------------------------- */

  function createModal() {
    openModal(
      '<div class="modal-head"><h2>New restaurant</h2><button type="button" class="modal-close">&times;</button></div>' +
      '<form id="create-form">' +
        '<div class="field"><label for="cr-name">Restaurant name *</label><input id="cr-name" maxlength="80" required></div>' +
        '<div class="field"><label for="cr-slug">URL slug (optional)</label><input id="cr-slug" maxlength="63" placeholder="auto-generated from name">' +
          '<div class="hint">Public page: /restaurant/&lt;slug&gt;</div></div>' +
        '<div class="field"><label for="cr-max">Max menu items *</label><input id="cr-max" type="number" min="1" max="10000" value="30" required></div>' +
        '<h3 class="section-title">First administrator (optional)</h3>' +
        '<div class="field"><label for="cr-user">Admin username</label><input id="cr-user" maxlength="40"></div>' +
        '<div class="field"><label for="cr-email">Admin email (optional)</label><input id="cr-email" type="email" maxlength="120"></div>' +
        '<div class="field"><label for="cr-pass">Admin password</label><input id="cr-pass" type="text" maxlength="200" placeholder="leave empty to auto-generate"></div>' +
        '<button type="submit" class="btn btn-block">Create restaurant</button>' +
      '</form>'
    );
    document.querySelector('.modal-close').addEventListener('click', closeModal);

    document.getElementById('create-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = {
        name: document.getElementById('cr-name').value,
        slug: document.getElementById('cr-slug').value || undefined,
        maxMenuItems: Number(document.getElementById('cr-max').value),
      };
      const username = document.getElementById('cr-user').value.trim();
      if (username) {
        body.adminUsername = username;
        body.adminEmail = document.getElementById('cr-email').value.trim();
        const pw = document.getElementById('cr-pass').value;
        if (pw) body.adminPassword = pw;
      }
      try {
        const res = await api.post('/api/owner/restaurants', body);
        closeModal();
        if (res.admin && res.admin.generatedPassword) {
          openModal(
            '<div class="modal-head"><h2>Restaurant created</h2></div>' +
            '<p>Admin account <strong>' + esc(res.admin.username) + '</strong> created. Temporary password (shown once):</p>' +
            '<p class="order-code">' + esc(res.admin.generatedPassword) + '</p>' +
            '<button type="button" class="btn btn-block" id="pw-done">I saved it</button>'
          );
          document.getElementById('pw-done').addEventListener('click', closeModal);
        } else {
          toast('Restaurant created', 'success');
        }
        await Promise.all([loadOverview(), loadRestaurants()]);
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }

  function editModal(r) {
    openModal(
      '<div class="modal-head"><h2>Edit ' + esc(r.name) + '</h2><button type="button" class="modal-close">&times;</button></div>' +
      '<form id="edit-form">' +
        '<div class="field"><label for="ed-name">Name</label><input id="ed-name" maxlength="80" value="' + esc(r.name) + '" required></div>' +
        '<div class="field"><label for="ed-slug">Slug</label><input id="ed-slug" maxlength="63" value="' + esc(r.slug) + '" required></div>' +
        '<div class="field"><label for="ed-max">Max menu items</label><input id="ed-max" type="number" min="1" max="10000" value="' + r.maxMenuItems + '" required></div>' +
        '<button type="submit" class="btn btn-block">Save</button>' +
      '</form>'
    );
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.getElementById('edit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await act(() => api.patch('/api/owner/restaurants/' + r.id, {
        name: document.getElementById('ed-name').value,
        slug: document.getElementById('ed-slug').value,
        maxMenuItems: Number(document.getElementById('ed-max').value),
      }));
    });
  }

  async function manageModal(id) {
    try {
      const d = await api.get('/api/owner/restaurants/' + id);
      const r = d.restaurant;
      const s = r.settings || {};

      openModal(
        '<div class="modal-head"><h2>' + esc(r.name) + '</h2><button type="button" class="modal-close">&times;</button></div>' +

        '<div class="grid-stats mb-2">' +
          '<div class="stat"><div class="stat-label">Menu items</div><div class="stat-value">' + d.stats.itemCount + '</div></div>' +
          '<div class="stat"><div class="stat-label">Pending orders</div><div class="stat-value">' + d.stats.pendingOrders + '</div></div>' +
          '<div class="stat"><div class="stat-label">Orders 7d</div><div class="stat-value">' + d.stats.ordersLast7d + '</div></div>' +
          '<div class="stat"><div class="stat-label">Revenue 7d</div><div class="stat-value">' + esc(String(fmtMoney(d.stats.revenueLast7dCents, s.currency || 'USD'))) + '</div></div>' +
        '</div>' +

        '<h3 class="section-title">Administrators</h3>' +
        d.admins.map((a) =>
          '<div class="rank-row"><span><strong>' + esc(a.username) + '</strong>' +
            (a.is_active ? '' : ' <span class="badge badge-closed">disabled</span>') + '</span>' +
            '<span>' +
              '<button type="button" class="btn btn-outline btn-sm" data-reset-pw="' + esc(a.id) + '">Reset password</button> ' +
              (a.is_active
                ? '<button type="button" class="btn btn-danger btn-sm" data-disable-admin="' + esc(a.id) + '">Disable</button>'
                : '<button type="button" class="btn btn-success btn-sm" data-enable-admin="' + esc(a.id) + '">Enable</button>') +
            '</span></div>'
        ).join('') +
        '<form id="new-admin-form" class="mt-2">' +
          '<div class="form-row form-row-2">' +
            '<input id="na-user" placeholder="New admin username" maxlength="40" required>' +
            '<input id="na-pass" placeholder="Password (min 10 chars)" maxlength="200" required>' +
          '</div>' +
          '<button type="submit" class="btn btn-outline btn-block mt-1">Add administrator</button>' +
        '</form>' +

        '<h3 class="section-title">Recent orders</h3><div id="owner-orders" class="mb-2"><div class="empty-state small">Loading…</div></div>'
      );
      document.querySelector('.modal-close').addEventListener('click', closeModal);

      // Recent orders inside the modal
      api.get('/api/owner/restaurants/' + id + '/orders?limit=5').then((res) => {
        const zone = document.getElementById('owner-orders');
        zone.innerHTML = res.orders.length
          ? res.orders.map((o) =>
              '<div class="rank-row"><span><strong>' + esc(o.code) + '</strong> · ' + esc(o.customer_name) + '</span>' +
              '<span><span class="badge status-' + esc(o.status) + '">' + (STATUS_LABELS[o.status] || esc(o.status)) + '</span> ' +
              esc(String(fmtMoney(o.total_cents, s.currency || 'USD'))) + '</span></div>'
            ).join('')
          : '<p class="muted small">No orders yet.</p>';
      }).catch(() => {});

      document.getElementById('new-admin-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await api.post('/api/owner/restaurants/' + id + '/admins', {
            username: document.getElementById('na-user').value.trim(),
            password: document.getElementById('na-pass').value,
          });
          toast('Administrator added', 'success');
          manageModal(id);
        } catch (err) {
          toast(err.message, 'error');
        }
      });

      document.querySelectorAll('[data-reset-pw]').forEach((b) =>
        b.addEventListener('click', async () => {
          if (!confirm('Reset this administrator\'s password? A new temporary password will be generated.')) return;
          try {
            const res = await api.post('/api/owner/restaurants/' + id + '/admins/' + b.dataset.resetPw + '/reset-password', {});
            openModal(
              '<div class="modal-head"><h2>Password reset</h2></div>' +
              '<p>New temporary password (shown once):</p>' +
              '<p class="order-code">' + esc(res.password) + '</p>' +
              '<button type="button" class="btn btn-block" id="pw-done2">I saved it</button>'
            );
            document.getElementById('pw-done2').addEventListener('click', () => { closeModal(); manageModal(id); });
          } catch (err) {
            toast(err.message, 'error');
          }
        }));

      document.querySelectorAll('[data-disable-admin]').forEach((b) =>
        b.addEventListener('click', async () => {
          try {
            await api.patch('/api/owner/restaurants/' + id + '/admins/' + b.dataset.disableAdmin, { isActive: false });
            toast('Administrator disabled', 'success');
            manageModal(id);
          } catch (err) { toast(err.message, 'error'); }
        }));

      document.querySelectorAll('[data-enable-admin]').forEach((b) =>
        b.addEventListener('click', async () => {
          try {
            await api.patch('/api/owner/restaurants/' + id + '/admins/' + b.dataset.enableAdmin, { isActive: true });
            toast('Administrator enabled', 'success');
            manageModal(id);
          } catch (err) { toast(err.message, 'error'); }
        }));
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  boot();
})();

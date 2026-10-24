'use strict';

/* Homepage: showcase of every active restaurant on the platform. */

(function () {
  const { api, esc } = window.App;
  const I = window.I18N;

  let restaurants = [];
  let searchTerm = '';
  let loadFailed = false;
  let hasMore = false;
  let loadingMore = false;
  const PAGE_SIZE = 50;

  function restCard(r) {
    const nm = (I.lang === 'en' && r.nameEn) ? r.nameEn : r.name;
    const badge = r.openNow
      ? '<span class="badge badge-open">' + esc(I.t('openNow')) + '</span>'
      : '<span class="badge badge-closed">' + esc(I.t('closed')) + '</span>';

    const cover = r.coverPath
      ? '<img class="rest-cover-img" loading="lazy" src="' + esc(r.coverPath) + '" alt="" data-fallback="' + esc((nm || '?').trim().charAt(0)) + '">'
      : '<div class="rest-cover-img rest-cover-fallback">' +
          '<span>' + esc((nm || '?').trim().charAt(0)) + '</span></div>';

    return (
      '<a class="rest-card" href="/restaurant/' + encodeURIComponent(r.slug) + '">' +
        '<div class="rest-cover">' + cover + badge + '</div>' +
        '<div class="rest-body">' +
          (r.logoPath
            ? '<img class="rest-logo" src="' + esc(r.logoPath) + '" alt="" loading="lazy">'
            : '') +
          '<h3 class="rest-name">' + esc(nm) + '</h3>' +
          (r.description ? '<p class="muted small rest-desc">' + esc(r.description) + '</p>' : '') +
          '<div class="flex-between mt-1">' +
            '<span class="muted small">' + esc(I.t('itemsCount', { n: r.itemCount })) + '</span>' +
            '<span class="btn btn-secondary btn-sm">' + esc(I.t('viewMenu')) + '</span>' +
          '</div>' +
        '</div>' +
      '</a>'
    );
  }

  function visible() {
    if (!searchTerm) return restaurants;
    return restaurants.filter(
      (r) =>
        r.name.toLowerCase().includes(searchTerm) ||
        (r.nameEn || '').toLowerCase().includes(searchTerm) ||
        (r.description || '').toLowerCase().includes(searchTerm)
    );
  }

  function render() {
    const grid = document.getElementById('rest-grid');
    const empty = document.getElementById('rest-empty');
    if (!grid || !empty) return;
    const list = visible();

    grid.innerHTML = list.map(restCard).join('');
    // Paginated directory: a Load more button (only when not searching,
    // since search filters the loaded page only).
    const existingMore = document.getElementById('rest-load-more');
    if (existingMore) existingMore.remove();
    if (hasMore && !searchTerm && !loadFailed) {
      const more = document.createElement('button');
      more.id = 'rest-load-more';
      more.type = 'button';
      more.className = 'btn btn-outline mt-2';
      more.textContent = loadingMore ? '…' : I.t('loadMore');
      more.disabled = loadingMore;
      more.addEventListener('click', loadMore);
      grid.after(more);
    }
    empty.classList.toggle('hidden', !loadFailed && list.length > 0);
    if (loadFailed) {
      empty.innerHTML = '<strong>' + esc(I.t('directoryLoadError')) + '</strong>' +
        '<button class="btn btn-outline btn-sm mt-1" type="button" data-retry-directory>' +
        esc(I.t('retryLoad')) + '</button>';
    } else if (!restaurants.length) {
      empty.textContent = I.t('noRests');
    } else if (!list.length) {
      empty.textContent = I.t('noRestMatch');
    } else {
      empty.textContent = '';
    }

    // Staggered entrance.
    grid.querySelectorAll('.rest-card').forEach((el, i) => {
      el.style.animation = 'rise .4s ease backwards';
      el.style.animationDelay = Math.min(i * 45, 500) + 'ms';
    });

    // Missing files (e.g. pre-migration uploads) degrade gracefully.
    grid.querySelectorAll('img.rest-cover-img[data-fallback]').forEach((im) => {
      im.addEventListener('error', () => {
        const div = document.createElement('div');
        div.className = 'rest-cover-img rest-cover-fallback';
        div.textContent = im.dataset.fallback || '?';
        im.replaceWith(div);
      }, { once: true });
    });
    grid.querySelectorAll('img.rest-logo').forEach((im) => {
      im.addEventListener('error', () => im.remove(), { once: true });
    });
  }

  async function load() {
    try {
      const data = await api.get('/api/restaurants?limit=' + PAGE_SIZE + '&offset=0');
      restaurants = data.restaurants || [];
      hasMore = !!data.hasMore;
      loadFailed = false;
    } catch (err) {
      restaurants = [];
      hasMore = false;
      loadFailed = true;
    }
    render();
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    loadingMore = true;
    render();
    try {
      const data = await api.get('/api/restaurants?limit=' + PAGE_SIZE + '&offset=' + restaurants.length);
      restaurants = restaurants.concat(data.restaurants || []);
      hasMore = !!data.hasMore;
    } catch (err) {
      // Keep the first page; the button stays so the user can retry.
    }
    loadingMore = false;
    render();
  }

  function boot() {
    document.title = I.t('homeRestH') + ' — Ordora';
    load();

    const search = document.getElementById('rest-search');
    if (search) {
      search.addEventListener('input', (e) => {
        searchTerm = e.target.value.trim().toLowerCase();
        render();
      });
    }

    const empty = document.getElementById('rest-empty');
    if (empty) {
      empty.addEventListener('click', (event) => {
        if (event.target.closest('[data-retry-directory]')) load();
      });
    }

    I.onChange(() => {
      document.title = I.t('homeRestH') + ' — Ordora';
      render();
    });
  }

  boot();
})();

'use strict';

/* Homepage: showcase of every active restaurant on the platform. */

(function () {
  const { api, esc } = window.App;
  const I = window.I18N;

  let restaurants = [];
  let searchTerm = '';
  let loadFailed = false;

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
      const data = await api.get('/api/restaurants');
      restaurants = data.restaurants || [];
      loadFailed = false;
    } catch (err) {
      restaurants = [];
      loadFailed = true;
    }
    render();
  }

  function boot() {
    document.title = I.t('homeRestH') + ' — Restivo';
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
      document.title = I.t('homeRestH') + ' — Restivo';
      render();
    });
  }

  boot();
})();

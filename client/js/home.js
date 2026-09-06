'use strict';

/* Homepage: showcase of every active restaurant on the platform. */

(function () {
  const { api, esc } = window.App;
  const I = window.I18N;

  let restaurants = [];
  let searchTerm = '';

  function restCard(r) {
    const badge = r.openNow
      ? '<span class="badge badge-open">' + esc(I.t('openNow')) + '</span>'
      : '<span class="badge badge-closed">' + esc(I.t('closed')) + '</span>';

    const cover = r.coverPath
      ? '<img class="rest-cover-img" loading="lazy" src="' + esc(r.coverPath) + '" alt="" data-fallback="' + esc((r.name || '?').trim().charAt(0)) + '">'
      : '<div class="rest-cover-img rest-cover-fallback">' +
          '<span>' + esc((r.name || '?').trim().charAt(0)) + '</span></div>';

    return (
      '<a class="rest-card" href="/restaurant/' + encodeURIComponent(r.slug) + '">' +
        '<div class="rest-cover">' + cover + badge + '</div>' +
        '<div class="rest-body">' +
          (r.logoPath
            ? '<img class="rest-logo" src="' + esc(r.logoPath) + '" alt="" loading="lazy">'
            : '') +
          '<h3 class="rest-name">' + esc(r.name) + '</h3>' +
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
        (r.description || '').toLowerCase().includes(searchTerm)
    );
  }

  function render() {
    const grid = document.getElementById('rest-grid');
    const empty = document.getElementById('rest-empty');
    const list = visible();

    grid.innerHTML = list.map(restCard).join('');
    empty.classList.toggle('hidden', restaurants.length !== 0);
    empty.textContent = restaurants.length === 0 ? I.t('noRests') : '';

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

  async function boot() {
    try {
      const data = await api.get('/api/restaurants');
      restaurants = data.restaurants || [];
    } catch (err) {
      restaurants = [];
    }
    render();

    document.getElementById('rest-search').addEventListener('input', (e) => {
      searchTerm = e.target.value.trim().toLowerCase();
      render();
    });

    I.onChange(render);
  }

  boot();
})();

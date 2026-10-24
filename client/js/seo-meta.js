'use strict';
// Sets canonical + og:url on marketing pages at runtime as a backup for
// the absolute tags already present in the HTML head.
// NOTE: no hreflang is emitted on purpose. The AR/EN switch on these pages
// is a JS-only toggle on a single URL, not separate AR/EN URLs, so hreflang
// would be misleading (see SEO notes in README). If genuinely separate
// language URLs are ever published, add hreflang then.
(function () {
  var url = location.origin + location.pathname;
  function ensureLink(rel, href) {
    var el = document.head.querySelector('link[rel="' + rel + '"]');
    if (!el) {
      el = document.createElement('link');
      el.rel = rel;
      document.head.appendChild(el);
    }
    el.href = href;
  }
  ensureLink('canonical', url);
  var og = document.head.querySelector('meta[property="og:url"]');
  if (!og) { og = document.createElement('meta'); og.setAttribute('property', 'og:url'); document.head.appendChild(og); }
  og.content = url;
})();

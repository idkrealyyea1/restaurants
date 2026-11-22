'use strict';
(function () {
  // Category copy is scoped here, leaving all other marketing pages unchanged.
  function applyCategoryLanguage() {
    const language = window.I18N && window.I18N.lang === 'en' ? 'en' : 'ar';
    document.querySelectorAll('[data-cat-ar][data-cat-en]').forEach((element) => {
      element.textContent = element.getAttribute('data-cat-' + language);
    });
  }
  applyCategoryLanguage();
  if (window.I18N) window.I18N.onChange(applyCategoryLanguage);
})();

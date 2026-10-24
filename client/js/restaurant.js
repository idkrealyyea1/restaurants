'use strict';

/**
 * Live storefront in the Ordora menu design language (same markup, IDs and
 * CSS as the /demo/ preview, backed by live API data). SERVER computes all
 * totals at checkout; option prices shown here are display estimates.
 */

(function () {
  var App = window.App || {};
  var api = App.api || {
    get: function (path) {
      return fetch(path, { credentials: 'include' }).then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error((data && data.error && data.error.message) || 'Request failed');
          return data;
        });
      });
    },
    post: function (path, body) {
      return fetch(path, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error((data && data.error && data.error.message) || 'Request failed');
          return data;
        });
      });
    },
  };
  var esc = App.esc || function (value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /* ------------------------- resolve slug -------------------------- */
  var slug = '';
  try {
    var m = new URLSearchParams(location.search).get('r');
    if (m) slug = m;
  } catch (_) { /* ignore */ }
  if (!slug && location.pathname.indexOf('/restaurant/') === 0) {
    slug = decodeURIComponent(location.pathname.split('/')[2] || '');
  }
  slug = (slug || '').toLowerCase();

  /* ------------------------------ copy ----------------------------- */
  /* UI chrome is byte-identical to the /demo/ preview; `live*` keys are the
     only additions (checkout needs customer fields the preview never had). */
  var copy = {
    ar: {
      menuLabel: 'القائمة',
      share: 'مشاركة',
      brandNote: 'منيو رقمي',
      order: 'طلبك',
      openNow: 'مفتوح الآن',
      closed: 'مغلق حاليًا',
      restaurantDescription: 'أطباق طازجة وأسعار واضحة وطلب سهل بدون تطبيق.',
      coverLabel: 'صور المطعم',
      previousCover: 'الصورة السابقة',
      nextCover: 'الصورة التالية',
      showCover: 'عرض الصورة',
      menuKicker: 'قائمة الطعام',
      menuTitle: 'اختر أطباقك',
      menuDescription: 'تصفّح الأصناف، أضف ما يعجبك، وأرسل طلبك مباشرة إلى المطعم.',
      searchLabel: 'ابحث في القائمة',
      searchPlaceholder: 'ابحث عن طبق تحبه',
      categoryLabel: 'أقسام القائمة',
      popularRibbon: 'اختيارات أحبّها ضيوفنا',
      footerCopyright: '© 2026 Ordora. جميع الحقوق محفوظة.',
      footerMade: 'صُنع مع Ordora',
      viewOrder: 'عرض الطلب',
      all: 'كل الأصناف',
      bestSeller: 'الأكثر طلبًا',
      new: 'جديد',
      spicy: 'حار',
      chefPick: 'اختيار الشيف',
      vegetarian: 'نباتي',
      calories: '{n} سعرة حرارية',
      prepTime: 'وقت التحضير: {n} دقيقة',
      saveX: 'وفّر {amount}',
      allergenLabel: 'قد يحتوي على مسببات حساسية',
      todayHours: 'اليوم: {hours}',
      closedToday: 'مغلق اليوم',
      mapsLink: 'خرائط Google',
      disclaimerTitle: 'ملاحظة غذائية',
      disclaimerText: 'السعرات وأوقات التحضير المذكورة تقديرية وقد تختلف حسب طريقة التحضير. إذا كان لديك حساسية غذائية، اسأل المطعم قبل الطلب. يحتاج البالغون عادةً إلى نحو 2000 سعرة حرارية يوميًا، ويختلف الاحتياج حسب العمر والنشاط والحالة الصحية.',
      reorderLabel: 'إعادة الطلب',
      noResultsTitle: 'لم نجد هذا الطبق',
      noResultsText: 'جرّب كلمة أخرى أو اختر قسمًا مختلفًا.',
      yourOrder: 'طلبك',
      pickup: 'استلام',
      delivery: 'توصيل',
      emptyTitle: 'طلبك يبدأ من هنا',
      emptyText: 'اختر طبقًا من القائمة وسنضيفه إلى طلبك.',
      subtotal: 'المجموع',
      deliveryFee: 'رسوم التوصيل',
      free: 'مجانًا',
      total: 'الإجمالي',
      continueCheckout: 'متابعة الطلب',
      close: 'إغلاق',
      options: 'اختر الإضافات',
      required: 'مطلوب',
      optional: 'اختياري',
      chooseOption: 'اختر خيارًا للمتابعة',
      addToOrder: 'أضف إلى الطلب',
      increase: 'زيادة الكمية',
      decrease: 'تقليل الكمية',
      remove: 'إزالة',
      cartAdded: 'أُضيف الطبق إلى طلبك',
      cartUpdated: 'تم تحديث طلبك',
      linkCopied: 'تم نسخ رابط القائمة',
      shareError: 'تعذّرت مشاركة الرابط من هذا المتصفح',
      closeOrder: 'إغلاق الطلب',
      tableService: 'الدفع عند الاستلام',
      itemsCount: '{n} صنف',
      soldOut: 'غير متوفر',
      preorderBadge: 'طلب مسبق',
      preorderDefault: 'هذا الصنف متاح للطلب المسبق. تواصل مع المطعم لمعرفة وقت التحضير.',
      preorderCart: 'صنف بطلب مسبق',
      pickHint: 'حتى {n} خيارات',
      noThanks: 'بدون إضافة',
      freeDeliveryProgress: 'أضف {amount} لتحصل على توصيل مجاني',
      freeDeliveryReached: 'توصيل مجاني',
      deliveryUnavailable: 'التوصيل غير متاح لهذا المطعم حاليًا',
      pickupOnly: 'استلام من المطعم فقط',
      loadingMenu: 'جارٍ تحميل القائمة…',
      loadErrorTitle: 'تعذّر تحميل القائمة',
      retry: 'إعادة المحاولة',
      emptyMenuTitle: 'القائمة قيد التجهيز',
      emptyMenuText: 'لم يضف المطعم أطباقًا بعد. حاول مرة أخرى بعد قليل.',
      reorderAdded: 'أضفنا {n} صنفًا من طلبك السابق',
      reorderNeedsOptions: 'اختر خيارات الأصناف الأخرى لإضافتها',
      reorderMissing: 'بعض الأصناف من طلبك السابق لم تعد متاحة',
      currencyLocale: 'ar',
      liveName: 'الاسم',
      liveWhatsapp: 'رقم الواتساب (اختياري)',
      liveAddress: 'عنوان التوصيل',
      liveNotes: 'ملاحظات (اختياري)',
      livePlaceOrder: 'تأكيد الطلب',
      liveSending: 'جارٍ إرسال طلبك…',
      liveOrderSent: 'تم استلام طلبك',
      liveShowCode: 'رمز طلبك:',
      liveTrack: 'تتبع طلبي',
      liveDone: 'تمام',
      liveEnterNameAndWa: 'الرجاء إدخال الاسم',
      liveEnterName: 'الرجاء إدخال الاسم',
      liveWhatsappInvalid: 'رقم الواتساب يجب أن يحتوي على 8 إلى 15 رقمًا، أو اتركه فارغًا',
      liveNoWhatsappNote: 'لم تدخل رقم واتساب، لذلك تابع طلبك من هنا برمز الطلب واحفظه — لن تصلك تحديثات عبر واتساب.',
      liveAddrRequired: 'الرجاء إدخال عنوان التوصيل',
      liveBlocked: 'الطلبات متوقفة مؤقتًا — يمكنك تصفح القائمة.',
      liveLoadError: 'تعذّر تحميل القائمة — تحقق من اتصالك وحاول مجددًا.',
      liveNotFound: 'المطعم غير موجود.',
    },
    en: {
      menuLabel: 'Menu',
      share: 'Share',
      brandNote: 'Digital menu',
      order: 'Your order',
      openNow: 'Open now',
      closed: 'Currently closed',
      restaurantDescription: 'Fresh food, clear prices, and ordering without an app.',
      coverLabel: 'Restaurant cover photos',
      previousCover: 'Previous cover photo',
      nextCover: 'Next cover photo',
      showCover: 'Show cover photo',
      menuKicker: 'The menu',
      menuTitle: 'Choose your dishes',
      menuDescription: 'Browse the dishes, add what you like, and send your order straight to the restaurant.',
      searchLabel: 'Search the menu',
      searchPlaceholder: 'Find something you love',
      categoryLabel: 'Menu categories',
      popularRibbon: 'Guest favorites',
      footerCopyright: '© 2026 Ordora. All rights reserved.',
      footerMade: 'Made with Ordora',
      viewOrder: 'View order',
      all: 'Everything',
      bestSeller: 'Guest favorite',
      new: 'New',
      spicy: 'Spicy',
      chefPick: 'Chef’s pick',
      vegetarian: 'Vegetarian',
      calories: '{n} kcal',
      prepTime: 'Prep time: {n} min',
      saveX: 'Save {amount}',
      allergenLabel: 'May contain allergens',
      todayHours: 'Today: {hours}',
      closedToday: 'Closed today',
      mapsLink: 'Google Maps',
      disclaimerTitle: 'Nutrition note',
      disclaimerText: 'Calories and prep times shown are estimates and may vary by preparation. If you have a food allergy, ask the restaurant before ordering. Adults typically need around 2000 kcal a day; needs vary by age, activity, and health.',
      reorderLabel: 'Reorder',
      noResultsTitle: 'No dishes found',
      noResultsText: 'Try a different search or browse another category.',
      yourOrder: 'Your order',
      pickup: 'Pickup',
      delivery: 'Delivery',
      emptyTitle: 'Your order starts here',
      emptyText: 'Choose a dish from the menu and it will appear here.',
      subtotal: 'Subtotal',
      deliveryFee: 'Delivery',
      free: 'Free',
      total: 'Total',
      continueCheckout: 'Continue to checkout',
      close: 'Close',
      options: 'Make it yours',
      required: 'Required',
      optional: 'Optional',
      chooseOption: 'Choose an option to continue',
      addToOrder: 'Add to order',
      increase: 'Increase quantity',
      decrease: 'Decrease quantity',
      remove: 'Remove',
      cartAdded: 'Added to your order',
      cartUpdated: 'Your order was updated',
      linkCopied: 'Menu link copied',
      shareError: 'This browser could not share the menu link',
      closeOrder: 'Close order',
      tableService: 'Pay on pickup',
      itemsCount: '{n} items',
      soldOut: 'Sold out',
      preorderBadge: 'Pre-order',
      preorderDefault: 'This dish is available by pre-order. Contact the restaurant for preparation time.',
      preorderCart: 'Pre-order item',
      pickHint: 'Choose up to {n}',
      noThanks: 'No thanks',
      freeDeliveryProgress: 'Add {amount} for free delivery',
      freeDeliveryReached: 'Free delivery unlocked',
      deliveryUnavailable: 'Delivery is not available from this restaurant right now',
      pickupOnly: 'Pickup only',
      loadingMenu: 'Loading the menu…',
      loadErrorTitle: 'The menu could not load',
      retry: 'Try again',
      emptyMenuTitle: 'The menu is being prepared',
      emptyMenuText: 'This restaurant has not published any dishes yet. Please check back soon.',
      reorderAdded: 'Added {n} item(s) from your last order',
      reorderNeedsOptions: 'Choose options for the remaining items to add them',
      reorderMissing: 'Some items from your last order are no longer available',
      currencyLocale: 'en',
      liveName: 'Name',
      liveWhatsapp: 'WhatsApp number (optional)',
      liveAddress: 'Delivery address',
      liveNotes: 'Notes (optional)',
      livePlaceOrder: 'Place order',
      liveSending: 'Sending your order…',
      liveOrderSent: 'Order received',
      liveShowCode: 'Show this code at pickup:',
      liveTrack: 'Track my order',
      liveDone: 'Done',
      liveEnterNameAndWa: 'Please enter your name',
      liveEnterName: 'Please enter your name',
      liveWhatsappInvalid: 'WhatsApp number must contain 8 to 15 digits, or leave it empty',
      liveNoWhatsappNote: 'You did not add a WhatsApp number, so follow your order here with your order code and keep it safe — no WhatsApp updates will be sent.',
      liveAddrRequired: 'Please enter the delivery address',
      liveBlocked: 'Ordering is paused for now — feel free to browse the menu.',
      liveLoadError: 'Could not load the menu — check your connection and retry.',
      liveNotFound: 'Restaurant not found.',
    },
  };

  /* ------------------------------ state ---------------------------- */
  var state = {
    language: 'ar',
    category: 'all',
    query: '',
    fulfillment: 'pickup',
    cart: [],
    modalDishId: null,
    modalSelections: {},
    modalQuantity: 1,
    cartOpen: false,
    checkoutOpen: false,
    placing: false,
    placedOrder: null,
    submissionKey: null,
    checkoutDraft: { name: '', whatsapp: '', address: '', notes: '' },
    previousFocus: null,
    toastTimer: null,
    coverIndex: 0,
    coverTimer: null,
    coverPaused: false,
    menuLoading: true,
    menuError: false,
    menuErrorText: '',
    menuRetryable: true,
    languagePinned: false,
  };
  var view = null;
  var dishes = [];
  var categories = [{ id: 'all', label: null, emoji: '🍽️' }];
  var coverSlides = [];
  var FALLBACK_IMG = '/images/dish-placeholder.svg';
  var LANG_STORE_KEY = 'site_lang';

  // Language precedence: explicit ?lang=, then the visitor's saved choice,
  // then the business default (applied in mapView only when nothing is pinned).
  try {
    var queryLanguage = new URLSearchParams(location.search).get('lang');
    if (queryLanguage === 'ar' || queryLanguage === 'en') {
      state.language = queryLanguage;
      state.languagePinned = true;
    }
  } catch (_) { /* ignore malformed URLs */ }
  if (!state.languagePinned) {
    try {
      var savedLanguage = localStorage.getItem(LANG_STORE_KEY);
      if (savedLanguage === 'ar' || savedLanguage === 'en') {
        state.language = savedLanguage;
        state.languagePinned = true;
      }
    } catch (_) { /* storage may be blocked */ }
  }

  function currency() {
    return (view && view.settings && view.settings.currency) || 'ILS';
  }
  function money(cents) {
    if (App.fmtMoney) {
      try {
        return App.fmtMoney(cents, currency(), state.language);
      } catch (_) { /* fall through */ }
    }
    try {
      return new Intl.NumberFormat(state.language === 'ar' ? 'ar' : 'en', {
        style: 'currency', currency: currency(), maximumFractionDigits: 2,
      }).format((cents || 0) / 100);
    } catch (_) {
      return (((cents || 0) / 100).toFixed(2) + ' ' + currency());
    }
  }

  /* ----------------------------- helpers --------------------------- */
  function $(selector, root) { return (root || document).querySelector(selector); }
  function $$(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function getCopy(key) { return copy[state.language][key] || copy.en[key] || key; }
  function localize(value) {
    if (typeof value === 'string') return value;
    if (!value) return '';
    return value[state.language] || value.en || value.ar || '';
  }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }
  function emojiFor(name) {
    var s = String(name || '').toLowerCase();
    if (/burger|برجر|برغر|همبرجر/.test(s)) return '🍔';
    if (/drink|cola|juice|shake|lemon|coffee|tea|عصير|كولا|مشروب|شاي|قهوة|ليمون|ميلك/.test(s)) return '🥤';
    if (/side|fries|ring|chip|بطاطا|جانب|مقبل|حلقات/.test(s)) return '🍟';
    if (/sweet|dessert|cake|cookie|brownie|ice|shake|حلو|كيك|كوكي|براوني|آيس|بوظة/.test(s)) return '🍦';
    return '🍽️';
  }

  /* --------------------------- live mapping ------------------------ */
  function mapView(data) {
    view = data;
    var settings = data.settings || {};
    // The business default applies only when the visitor has not chosen a
    // language (?lang= or the shared site preference).
    if (!state.languagePinned &&
      (settings.storefrontLanguage === 'en' || settings.storefrontLanguage === 'ar')) {
      state.language = settings.storefrontLanguage;
    }
    applyBrandTheme(settings);
    categories = [{ id: 'all', label: null, emoji: '🍽️' }].concat(
      (data.categories || []).map(function (c) {
        return { id: String(c.id), label: c.name, emoji: emojiFor(c.name) };
      })
    );
    dishes = (data.items || []).map(function (it) {
      var imgs = it.images && it.images.length ? it.images : (it.image_path ? [it.image_path] : []);
      return {
        id: String(it.id),
        category: String(it.category_id),
        name: { ar: it.name, en: it.name },
        description: { ar: it.description || '', en: it.description || '' },
        priceCents: Number(it.price_cents) || 0,
        image: imgs[0] || FALLBACK_IMG,
        available: it.is_available !== false,
        preorder: !!it.is_preorder,
        preorderNote: it.preorder_note || '',
        tag: it.badge || (it.is_popular ? 'bestSeller' : null),
        popular: !!it.is_popular,
        calories: it.calories === null || it.calories === undefined ? null : Number(it.calories),
        prepMinutes: it.prep_minutes === null || it.prep_minutes === undefined ? null : Number(it.prep_minutes),
        allergenNote: it.allergen_note || '',
        oldPriceCents: it.old_price_cents === null || it.old_price_cents === undefined ? null : Number(it.old_price_cents),
        options: (it.options || []).map(function (g) {
          // Legacy groups only set is_required. Treat them as a one-pick
          // minimum so the checkout can never submit an empty required group.
          var minPicks = g.is_required ? Math.max(1, Number(g.min_picks) || 0) : (Number(g.min_picks) || 0);
          var maxPicks = Math.max(1, Number(g.max_picks) || 1);
          minPicks = Math.min(minPicks, maxPicks);
          return {
            id: String(g.id),
            required: !!g.is_required || minPicks > 0,
            minPicks: minPicks,
            maxPicks: maxPicks,
            pricing: g.pricing === 'replace' ? 'replace' : 'adjust',
            label: { ar: g.name, en: g.name },
            choices: (g.choices || []).filter(function (c) { return c.is_available !== false; }).map(function (c) {
              return {
                id: String(c.id),
                label: { ar: c.name, en: c.name },
                extraCents: Number(c.price_cents) || 0,
                maxQuantity: Math.max(1, Number(c.max_quantity) || 1),
              };
            }),
          };
        }).filter(function (g) { return g.choices.length > 0; }),
      };
    });
    if (!settings.deliveryEnabled && state.fulfillment === 'delivery') {
      state.fulfillment = 'pickup';
    }
    var heroes = data.heroImages || [];
    if (heroes.length) {
      coverSlides = heroes.map(function (h) {
        return { image: h.imagePath, alt: { ar: data.name, en: data.name } };
      });
    } else if (settings.coverPath) {
      coverSlides = [{ image: settings.coverPath, alt: { ar: data.name, en: data.name } }];
    } else {
      coverSlides = [{ image: null, initial: String(data.name || '?').trim().charAt(0) }];
    }
    var logoLink = $('.restaurant-logo-overlap');
    if (logoLink) {
      if (settings.logoPath) {
        logoLink.classList.remove('logo-fallback');
        logoLink.innerHTML = '<img class="restaurant-logo-image" id="restaurantLogo" src="' +
          escapeHTML(settings.logoPath) + '" alt="' + escapeHTML(data.name) + '" />';
      } else {
        logoLink.classList.add('logo-fallback');
        logoLink.innerHTML = '<span aria-hidden="true">' +
          escapeHTML(String(data.name || '?').trim().charAt(0)) + '</span>';
        logoLink.setAttribute('aria-label', data.name);
      }
    }
    // Drop cart lines for dishes that no longer exist, are sold out, or whose
    // required option choices disappeared; also forget stale choice ids so the
    // payload can never carry references the server no longer knows about.
    sanitizeCart();
  }

  function sanitizeCart() {
    var changed = false;
    state.cart = state.cart.filter(function (line) {
      var dish = getDish(line.dishId);
      if (!dish || dish.available === false) {
        changed = true;
        return false;
      }
      if (!line.selections || typeof line.selections !== 'object') {
        line.selections = {};
        changed = true;
      }
      var valid = true;
      dish.options.forEach(function (group) {
        var raw = line.selections[group.id] || [];
        var picked = raw.filter(function (choiceId) {
          return group.choices.some(function (choice) { return choice.id === choiceId; });
        });
        if (picked.length !== raw.length) changed = true;
        if (picked.length) line.selections[group.id] = picked;
        else delete line.selections[group.id];
        if (picked.length < group.minPicks || picked.length > group.maxPicks) valid = false;
      });
      if (!valid) {
        changed = true;
        return false;
      }
      return true;
    });
    if (changed) saveCart();
  }

  function applyBrandTheme(settings) {
    if (!App.theme || typeof App.theme.buildTokens !== 'function') return;
    // No configured brand colours: keep the neutral Ordora palette instead of
    // replacing it with the platform's fallback accent.
    if (!settings.primaryColor && !settings.secondaryColor) return;
    var tokens = App.theme.buildTokens(settings.primaryColor, settings.secondaryColor);
    if (!tokens) return;
    var root = document.documentElement;
    Object.keys(tokens).forEach(function (name) {
      root.style.setProperty(name, tokens[name]);
    });
    // The storefront stylesheet is built on the coral/teal token pair.
    root.style.setProperty('--coral', tokens['--primary']);
    root.style.setProperty('--teal', tokens['--secondary']);
    root.style.setProperty('--teal-deep', tokens['--secondary-dark']);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', tokens['--secondary'] || '#1f3439');
  }

  /* ------------------------------ cover ---------------------------- */
  function showCover(index) {
    if (!coverSlides.length) return;
    state.coverIndex = ((index % coverSlides.length) + coverSlides.length) % coverSlides.length;
    $$('.cover-slide').forEach(function (slide, slideIndex) {
      var active = slideIndex === state.coverIndex;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
    });
    $$('.cover-dot').forEach(function (dot, dotIndex) {
      var active = dotIndex === state.coverIndex;
      dot.classList.toggle('is-active', active);
      if (active) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  }
  function startCoverAutoplay() {
    window.clearInterval(state.coverTimer);
    if (coverSlides.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    state.coverTimer = window.setInterval(function () {
      if (!state.coverPaused && !document.hidden) showCover(state.coverIndex + 1);
    }, 5200);
  }
  function navigateCover(index) { showCover(index); startCoverAutoplay(); }
  function initializeCoverCarousel() {
    var carousel = $('#coverCarousel');
    if (!carousel) return;
    $('#coverTrack').innerHTML = coverSlides.map(function (slide, index) {
      var media = slide.image
        ? '<img src="' + escapeHTML(slide.image) + '" alt="' + escapeHTML(localize(slide.alt || '')) + '"' +
          (index === 0 ? ' fetchpriority="high"' : ' loading="lazy"') + ' />'
        : '<div class="cover-placeholder" aria-hidden="true"><span>' +
          escapeHTML(slide.initial || '?') + '</span></div>';
      return '<div class="cover-slide' + (index === 0 ? ' is-active' : '') + '" aria-hidden="' + (index !== 0) + '"' +
        ' aria-roledescription="slide" aria-label="' + (index + 1) + ' / ' + coverSlides.length + '">' +
        media + '</div>';
    }).join('');
    var previous = $('#coverPrevious');
    var next = $('#coverNext');
    var pagination = $('#coverPagination');
    if (previous) previous.hidden = coverSlides.length < 2;
    if (next) next.hidden = coverSlides.length < 2;
    if (pagination) pagination.hidden = coverSlides.length < 2;
    $('#coverPagination').innerHTML = coverSlides.map(function (_, index) {
      return '<button class="cover-dot' + (index === 0 ? ' is-active' : '') + '" type="button"' +
        ' data-cover-index="' + index + '" aria-label="' + escapeHTML(getCopy('showCover')) + ' ' + (index + 1) + '"' +
        (index === 0 ? ' aria-current="true"' : '') + '></button>';
    }).join('');
    showCover(0);
    if (carousel.dataset.wired) {
      startCoverAutoplay();
      return;
    }
    carousel.dataset.wired = '1';
    carousel.addEventListener('click', function (event) {
      var control = event.target.closest('[data-cover-step], [data-cover-index]');
      if (!control) return;
      if (control.hasAttribute('data-cover-step')) navigateCover(state.coverIndex + Number(control.dataset.coverStep));
      else navigateCover(Number(control.dataset.coverIndex));
    });
    carousel.addEventListener('pointerenter', function () { state.coverPaused = true; });
    carousel.addEventListener('pointerleave', function () { state.coverPaused = false; });
    carousel.addEventListener('focusin', function () { state.coverPaused = true; });
    carousel.addEventListener('focusout', function (event) {
      if (!carousel.contains(event.relatedTarget)) state.coverPaused = false;
    });
    var touchStartX = null;
    carousel.addEventListener('touchstart', function (event) {
      touchStartX = (event.changedTouches[0] && event.changedTouches[0].clientX) || null;
    }, { passive: true });
    carousel.addEventListener('touchend', function (event) {
      if (touchStartX === null) return;
      var distance = event.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(distance) > 45) navigateCover(state.coverIndex + (distance < 0 ? 1 : -1));
    }, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) window.clearInterval(state.coverTimer);
      else startCoverAutoplay();
    });
    startCoverAutoplay();
  }

  /* --------------------------- menu render ------------------------- */
  function categoryLabel(cat) {
    if (cat.id === 'all') return getCopy('all');
    return cat.label || cat.id;
  }
  function categoryMarkup() {
    return categories.map(function (category) {
      var active = state.category === category.id;
      var count = category.id === 'all'
        ? dishes.length
        : dishes.filter(function (dish) { return dish.category === category.id; }).length;
      return '<button class="category-pill' + (active ? ' active' : '') + '" type="button"' +
        ' data-category="' + escapeHTML(category.id) + '" aria-pressed="' + active + '">' +
        '<span class="category-emoji" aria-hidden="true">' + category.emoji + '</span>' +
        '<span>' + escapeHTML(categoryLabel(category)) + '</span>' +
        '<span class="category-count">' + count + '</span></button>';
    }).join('');
  }
  function initializeCategoryDock() {
    var strip = $('#categoryStrip');
    var sentinel = $('#categoryDockSentinel');
    if (!strip || !sentinel || strip.dataset.wired) return;
    strip.dataset.wired = '1';
    var frameQueued = false;
    var isCompact = false;
    function updateCompactState() {
      frameQueued = false;
      var sentinelTop = sentinel.getBoundingClientRect().top;
      if (!isCompact && sentinelTop < -6) isCompact = true;
      else if (isCompact && sentinelTop > 6) isCompact = false;
      strip.classList.toggle('is-compact', isCompact);
    }
    function queueUpdate() {
      if (frameQueued) return;
      frameQueued = true;
      window.requestAnimationFrame(updateCompactState);
    }
    window.addEventListener('scroll', queueUpdate, { passive: true });
    window.addEventListener('resize', queueUpdate);
    queueUpdate();
  }
  function preorderIcon() {
    return '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7" />' +
      '<path d="M10 6v4l2.4 1.4" /></svg>';
  }
  function dishMarkup(dish) {
    var name = localize(dish.name);
    var hasOptions = dish.options.length > 0;
    var quickLabel = hasOptions ? getCopy('options') : getCopy('addToOrder');
    var available = dish.available !== false;
    var tags = [];
    if (dish.tag) {
      tags.push('<span class="dish-tag"><span aria-hidden="true">' + (dish.tag === 'bestSeller' ? '🔥' : '🌿') + '</span>' +
        escapeHTML(getCopy(dish.tag)) + '</span>');
    }
    if (dish.preorder) {
      tags.push('<span class="dish-tag dish-tag-preorder">' + preorderIcon() +
        escapeHTML(getCopy('preorderBadge')) + '</span>');
    }
    if (!available) {
      tags = ['<span class="dish-tag dish-tag-soldout">' + escapeHTML(getCopy('soldOut')) + '</span>'];
    }
    var tag = tags.length ? '<span class="dish-tags">' + tags.join('') + '</span>' : '';
    var preorder = dish.preorder
      ? '<span class="dish-preorder"><span class="dish-preorder-label">' + preorderIcon() +
        escapeHTML(getCopy('preorderBadge')) + '</span><span class="dish-preorder-text">' +
        escapeHTML(dish.preorderNote || getCopy('preorderDefault')) + '</span></span>'
      : '';
    var note = '<span class="food-markers"><span>' +
      escapeHTML(hasOptions ? getCopy('options') : getCopy('addToOrder')) + '</span></span>';
    return '<article class="dish-card dish-row' + (available ? '' : ' is-soldout') + '">' +
      '<button class="dish-photo" type="button" data-open-dish="' + escapeHTML(dish.id) + '"' +
      (available ? '' : ' disabled') + ' aria-label="' + escapeHTML(name) + '">' +
      '<img src="' + escapeHTML(dish.image) + '" alt="' + escapeHTML(name) + '" loading="lazy" />' + tag + '</button>' +
      (available
        ? '<button class="add-quick" type="button" data-quick-add="' + escapeHTML(dish.id) + '" aria-label="' + escapeHTML(quickLabel) + '">' +
          '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12" /></svg></button>'
        : '') +
      '<button class="dish-content" type="button" data-open-dish="' + escapeHTML(dish.id) + '"' +
      (available ? '' : ' disabled') + '>' +
      '<span class="dish-title-row"><span class="dish-name">' + escapeHTML(name) + '</span>' +
      (dish.oldPriceCents && dish.oldPriceCents > dish.priceCents
        ? '<span class="dish-price"><s class="dish-old-price">' + escapeHTML(money(dish.oldPriceCents)) + '</s> ' +
          escapeHTML(money(dish.priceCents)) + ' <span class="dish-save">' +
          escapeHTML(getCopy('saveX').replace('{amount}', money(dish.oldPriceCents - dish.priceCents))) + '</span></span>'
        : '<span class="dish-price">' + escapeHTML(money(dish.priceCents)) + '</span>') + '</span>' +
      '<span class="dish-description">' + escapeHTML(localize(dish.description)) + '</span>' +
      ((dish.calories !== null && dish.calories !== undefined) || (dish.prepMinutes !== null && dish.prepMinutes !== undefined)
        ? '<span class="dish-richness">' + [
            (dish.calories !== null && dish.calories !== undefined) ? escapeHTML(getCopy('calories').replace('{n}', dish.calories)) : '',
            (dish.prepMinutes !== null && dish.prepMinutes !== undefined) ? escapeHTML(getCopy('prepTime').replace('{n}', dish.prepMinutes)) : '',
          ].filter(Boolean).join(' · ') + '</span>'
        : '') +
      (dish.allergenNote ? '<span class="dish-allergen">⚠ ' + escapeHTML(getCopy('allergenLabel')) + ': ' + escapeHTML(dish.allergenNote) + '</span>' : '') +
      preorder +
      '<span class="dish-foot">' + note + '</span></button></article>';
  }
  function menuSkeletonMarkup() {
    var card = '<div class="dish-card dish-row dish-skeleton" aria-hidden="true">' +
      '<div class="dish-photo skeleton-block"></div>' +
      '<div class="dish-content"><span class="skeleton-line skeleton-line-lg"></span>' +
      '<span class="skeleton-line"></span><span class="skeleton-line skeleton-line-sm"></span></div></div>';
    return '<div class="dish-grid-loading">' + card + card + card + card + card + card + '</div>';
  }
  function normalizeSearch(value) {
    return String(value || '').trim().toLocaleLowerCase().replace(/[ً-ٰٟ]/g, '');
  }
  function renderMenu() {
    var strip = $('#categoryStrip');
    var grid = $('#dishGrid');
    if (!grid) return;
    if (state.menuLoading) {
      if (strip) strip.innerHTML = '';
      grid.setAttribute('aria-busy', 'true');
      grid.innerHTML = menuSkeletonMarkup();
      return;
    }
    if (state.menuError) {
      if (strip) strip.innerHTML = '';
      grid.setAttribute('aria-busy', 'false');
      grid.innerHTML = '<div class="no-results menu-error"><span class="no-results-mark" aria-hidden="true">!</span>' +
        '<h3>' + escapeHTML(state.menuRetryable ? getCopy('loadErrorTitle') : (state.menuErrorText || getCopy('liveNotFound'))) + '</h3>' +
        (state.menuRetryable
          ? '<p>' + escapeHTML(state.menuErrorText || getCopy('liveLoadError')) + '</p>' +
            '<button class="btn btn-outline" type="button" data-retry-menu>' +
            escapeHTML(getCopy('retry')) + '</button>'
          : '') + '</div>';
      return;
    }
    if (strip) strip.innerHTML = categoryMarkup();
    var query = normalizeSearch(state.query);
    var visibleDishes = dishes.filter(function (dish) {
      var categoryMatches = state.category === 'all' || dish.category === state.category;
      if (!categoryMatches) return false;
      if (!query) return true;
      var searchable = normalizeSearch([
        dish.name.ar, dish.name.en, dish.description.ar, dish.description.en,
      ].join(' '));
      return searchable.indexOf(query) !== -1;
    });
    grid.setAttribute('aria-busy', 'false');
    if (!dishes.length) {
      grid.innerHTML = '<div class="no-results"><span class="no-results-mark" aria-hidden="true"></span>' +
        '<h3>' + escapeHTML(getCopy('emptyMenuTitle')) + '</h3>' +
        '<p>' + escapeHTML(getCopy('emptyMenuText')) + '</p></div>';
      return;
    }
    if (!visibleDishes.length) {
      grid.innerHTML = '<div class="no-results"><span class="no-results-mark" aria-hidden="true"></span>' +
        '<h3>' + escapeHTML(getCopy('noResultsTitle')) + '</h3>' +
        '<p>' + escapeHTML(getCopy('noResultsText')) + '</p></div>';
      return;
    }
    var visibleSections = categories
      .filter(function (category) { return category.id !== 'all'; })
      .map(function (category) {
        return {
          id: category.id, emoji: category.emoji, label: categoryLabel(category),
          items: visibleDishes.filter(function (dish) { return dish.category === category.id; }),
        };
      })
      .filter(function (category) { return category.items.length > 0; });
    // Dishes whose category vanished from the backend still render.
    var orphaned = visibleDishes.filter(function (dish) {
      return !visibleSections.some(function (s) { return s.id === dish.category; });
    });
    if (orphaned.length) {
      visibleSections.push({ id: 'all', emoji: '🍽️', label: getCopy('all'), items: orphaned });
    }
    grid.innerHTML = visibleSections.map(function (category) {
      return '<section class="dish-section" aria-labelledby="section-' + escapeHTML(category.id) + '">' +
        '<div class="dish-section-heading"><h3 id="section-' + escapeHTML(category.id) + '">' +
        '<span class="section-emoji" aria-hidden="true">' + category.emoji + '</span>' +
        '<span>' + escapeHTML(category.label) + '</span></h3>' +
        '<span class="section-count">' + category.items.length + '</span></div>' +
        '<div class="dish-list">' + category.items.map(dishMarkup).join('') + '</div></section>';
    }).join('');
  }
  function getDish(dishId) {
    return dishes.filter(function (dish) { return dish.id === String(dishId); })[0] || null;
  }
  function getSelectedChoices(dish, selections) {
    selections = selections || {};
    var out = [];
    dish.options.forEach(function (group) {
      (selections[group.id] || []).forEach(function (choiceId) {
        var choice = null;
        group.choices.forEach(function (item) { if (item.id === choiceId) choice = item; });
        if (choice) out.push({ group: group, choice: choice });
      });
    });
    return out;
  }
  /**
   * Display the same unit price the server will charge. "replace" groups
   * substitute the base price; "adjust" groups add to it. Multiple choices
   * are allowed only when the group's maxPicks is greater than one.
   */
  function selectedTotalCents(dish, selections) {
    selections = selections || {};
    var unit = dish.priceCents;
    dish.options.forEach(function (group) {
      var picked = [];
      (selections[group.id] || []).forEach(function (choiceId) {
        var choice = null;
        group.choices.forEach(function (item) { if (item.id === choiceId) choice = item; });
        if (choice) picked.push(choice);
      });
      if (group.pricing === 'replace') {
        if (picked.length) unit = picked[0].extraCents;
      } else {
        picked.forEach(function (choice) { unit += choice.extraCents; });
      }
    });
    return Math.max(0, unit);
  }
  function getModalValidity(dish) {
    return dish.options.every(function (group) {
      var count = (state.modalSelections[group.id] || []).length;
      return count >= group.minPicks && count <= group.maxPicks;
    });
  }

  /* ------------------------------- modal --------------------------- */
  function openDish(dishId, trigger) {
    var dish = getDish(dishId);
    if (!dish) return;
    state.previousFocus = trigger || document.activeElement;
    state.modalDishId = dish.id;
    state.modalSelections = {};
    state.modalQuantity = 1;
    state.cartOpen = false;
    renderCartDrawer();
    renderModal();
    document.body.classList.add('overlay-open');
    requestAnimationFrame(function () { var c = $('.dish-modal-close'); if (c) c.focus(); });
  }
  function closeDish() {
    if (!state.modalDishId) return;
    state.modalDishId = null;
    $('#modalRoot').innerHTML = '';
    document.body.classList.remove('overlay-open');
    if (state.previousFocus && state.previousFocus.focus) {
      try { state.previousFocus.focus(); } catch (_) { /* ignore */ }
    }
  }
  function modalMarkup(dish) {
    var selected = state.modalSelections;
    var optionsMarkup = dish.options.map(function (group) {
      var single = group.maxPicks === 1;
      var optionalSingle = single && group.minPicks === 0;
      var selectedIds = selected[group.id] || [];
      var choices = group.choices.map(function (choice) {
        var inputType = single ? 'radio' : 'checkbox';
        var checked = selectedIds.indexOf(choice.id) !== -1;
        var amount = group.pricing === 'replace'
          ? money(choice.extraCents)
          : (choice.extraCents ? '+ ' + money(choice.extraCents) : '');
        return '<label class="option-choice"><span><input type="' + inputType + '" name="option-' + escapeHTML(group.id) + '"' +
          ' value="' + escapeHTML(choice.id) + '" data-option-choice data-group="' + escapeHTML(group.id) + '"' +
          ' data-choice="' + escapeHTML(choice.id) + '"' + (checked ? ' checked' : '') + ' />' +
          '<span>' + escapeHTML(localize(choice.label)) + '</span></span>' +
          (amount ? '<span class="choice-price">' + escapeHTML(amount) + '</span>' : '') + '</label>';
      }).join('');
      if (optionalSingle) {
        // An optional single-pick group needs an explicit way back to "none"
        // once a radio has been chosen.
        choices = '<label class="option-choice option-none"><span>' +
          '<input type="radio" name="option-' + escapeHTML(group.id) + '" value="" data-option-choice' +
          ' data-group="' + escapeHTML(group.id) + '" data-choice=""' +
          (selectedIds.length ? '' : ' checked') + ' />' +
          '<span>' + escapeHTML(getCopy('noThanks')) + '</span></span></label>' + choices;
      }
      var hint = group.maxPicks > 1
        ? '<span class="option-hint">' + escapeHTML(getCopy('pickHint').replace('{n}', group.maxPicks)) + '</span>'
        : '';
      var required = group.minPicks > 0 || group.required;
      return '<fieldset class="option-section" data-option-group="' + escapeHTML(group.id) + '">' +
        '<legend class="option-heading"><strong>' + escapeHTML(localize(group.label)) + '</strong>' +
        '<span class="' + (required ? 'required-pill' : 'optional-pill') + '">' +
        escapeHTML(getCopy(required ? 'required' : 'optional')) + '</span>' + hint + '</legend>' + choices + '</fieldset>';
    }).join('');
    var unitPrice = selectedTotalCents(dish, selected);
    var selectedPrice = unitPrice * state.modalQuantity;
    var valid = getModalValidity(dish);
    var title = localize(dish.name);
    var modalTags = [];
    if (dish.tag) modalTags.push('<span class="dish-tag">' + escapeHTML(getCopy(dish.tag)) + '</span>');
    if (dish.preorder) modalTags.push('<span class="dish-tag dish-tag-preorder">' + preorderIcon() + escapeHTML(getCopy('preorderBadge')) + '</span>');
    var modalTag = modalTags.length ? '<span class="dish-tags">' + modalTags.join('') + '</span>' : '';
    return '<div class="modal-backdrop" data-close-modal><section class="dish-modal" role="dialog"' +
      ' aria-modal="true" aria-labelledby="modalTitle" tabindex="-1"><div class="modal-image">' +
      '<img src="' + escapeHTML(dish.image) + '" alt="' + escapeHTML(title) + '" />' + modalTag + '</div>' +
      '<div class="modal-body"><button class="close-modal dish-modal-close" type="button" data-close-modal' +
      ' aria-label="' + escapeHTML(getCopy('close')) + '">' +
      '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg></button>' +
      '<p class="section-kicker">' + escapeHTML(getCopy('options')) + '</p>' +
      '<h2 id="modalTitle">' + escapeHTML(title) + '</h2>' +
      '<p class="modal-description">' + escapeHTML(localize(dish.description)) + '</p>' +
      (dish.preorder
        ? '<div class="modal-preorder" role="note"><span class="modal-preorder-icon" aria-hidden="true">' +
          preorderIcon() + '</span><div><strong>' + escapeHTML(getCopy('preorderBadge')) + '</strong><p>' +
          escapeHTML(dish.preorderNote || getCopy('preorderDefault')) + '</p></div></div>'
        : '') +
      '<div class="modal-base-price" id="modalBasePrice">' + escapeHTML(money(unitPrice)) + '</div>' +
      (optionsMarkup ? '<div class="modal-options">' + optionsMarkup + '</div>' : '') +
      '<div class="modal-actions"><div class="modal-quantity" aria-label="' + escapeHTML(title) + '">' +
      '<button type="button" data-modal-quantity="-1" aria-label="' + escapeHTML(getCopy('decrease')) + '">−</button>' +
      '<span id="modalQuantity">' + state.modalQuantity + '</span>' +
      '<button type="button" data-modal-quantity="1" aria-label="' + escapeHTML(getCopy('increase')) + '">+</button></div>' +
      '<button class="add-to-cart" type="button" data-add-modal' + (valid ? '' : ' disabled') + '>' +
      '<span>' + escapeHTML(valid ? getCopy('addToOrder') : getCopy('chooseOption')) + '</span>' +
      '<strong id="modalTotal">' + escapeHTML(money(selectedPrice)) + '</strong></button></div></div></section></div>';
  }
  function renderModal() {
    var dish = state.modalDishId ? getDish(state.modalDishId) : null;
    if (!dish) { $('#modalRoot').innerHTML = ''; return; }
    $('#modalRoot').innerHTML = modalMarkup(dish);
  }
  function updateModalSummary() {
    var dish = getDish(state.modalDishId);
    if (!dish) return;
    var valid = getModalValidity(dish);
    var addButton = $('[data-add-modal]');
    if (!addButton) return;
    addButton.disabled = !valid;
    addButton.querySelector('span').textContent = valid ? getCopy('addToOrder') : getCopy('chooseOption');
    var unit = selectedTotalCents(dish, state.modalSelections);
    $('#modalTotal').textContent = money(unit * state.modalQuantity);
    var base = $('#modalBasePrice');
    if (base) base.textContent = money(unit);
    // At the pick limit, prevent adding another choice until one is removed.
    dish.options.forEach(function (group) {
      var picked = state.modalSelections[group.id] || [];
      var atMax = picked.length >= group.maxPicks;
      $$('[data-option-choice][data-group="' + group.id + '"]').forEach(function (input) {
        if (input.type !== 'checkbox') return;
        input.disabled = atMax && !input.checked;
      });
    });
  }
  function addDishToCart(dishId, selections, quantity, silent) {
    var dish = getDish(dishId);
    if (!dish || dish.available === false) return false;
    selections = selections || {};
    quantity = quantity || 1;
    var signature = [];
    dish.options.forEach(function (group) {
      (selections[group.id] || []).slice().sort().forEach(function (choiceId) {
        signature.push(group.id + ':' + choiceId);
      });
    });
    signature.sort();
    var key = dish.id + '|' + signature.join(',');
    var existing = null;
    state.cart.forEach(function (line) { if (line.key === key) existing = line; });
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + quantity);
    } else {
      var copySel = {};
      Object.keys(selections).forEach(function (groupId) { copySel[groupId] = selections[groupId].slice(); });
      state.cart.push({ key: key, dishId: dish.id, selections: copySel, quantity: Math.min(99, quantity) });
    }
    state.placedOrder = null;
    state.submissionKey = null;
    state.checkoutOpen = false;
    saveCart();
    renderCart();
    if (!silent) toastMsg(getCopy('cartAdded'));
    return true;
  }
  function cartCount() {
    return state.cart.reduce(function (sum, line) { return sum + line.quantity; }, 0);
  }
  function cartSubtotalCents() {
    return state.cart.reduce(function (sum, line) {
      var dish = getDish(line.dishId);
      return dish ? sum + selectedTotalCents(dish, line.selections) * line.quantity : sum;
    }, 0);
  }
  function freeDeliveryEnabled() {
    return !!(view && view.settings && view.settings.freeDeliveryEnabled);
  }
  function freeDeliveryThresholdCents() {
    return Math.max(0, Number(view && view.settings && view.settings.freeDeliveryThresholdCents) || 0);
  }
  function deliveryFeeCents(subtotal) {
    if (state.fulfillment !== 'delivery') return 0;
    if (!view || !view.settings || view.settings.deliveryEnabled === false) return 0;
    if (cartCount() === 0) return 0;
    var sub = typeof subtotal === 'number' ? subtotal : cartSubtotalCents();
    if (freeDeliveryEnabled() && sub >= freeDeliveryThresholdCents()) return 0;
    return Number(view.settings.deliveryFeeCents) || 0;
  }
  function orderingBlocked() {
    return !!(view && view.orderingBlocked);
  }

  /* -------------------------------- cart --------------------------- */
  function lineOptionText(dish, selections) {
    var parts = [];
    dish.options.forEach(function (group) {
      var names = [];
      (selections[group.id] || []).forEach(function (choiceId) {
        group.choices.forEach(function (choice) {
          if (choice.id === choiceId) names.push(localize(choice.label));
        });
      });
      if (names.length) parts.push(localize(group.label) + ': ' + names.join(', '));
    });
    return parts.join(' · ');
  }
  function cartLinesMarkup() {
    return state.cart.map(function (line) {
      var dish = getDish(line.dishId);
      if (!dish) return '';
      var name = localize(dish.name);
      var options = lineOptionText(dish, line.selections);
      var unitPrice = selectedTotalCents(dish, line.selections);
      return '<div class="cart-line"><div class="cart-line-main"><div class="cart-line-heading">' +
        '<p class="cart-line-name">' + escapeHTML(name) + '</p>' +
        '<strong class="line-price">' + escapeHTML(money(unitPrice * line.quantity)) + '</strong></div>' +
        (options ? '<p class="cart-line-options">' + escapeHTML(options) + '</p>' : '') +
        (dish.preorder
          ? '<p class="cart-line-preorder"><span class="cart-line-preorder-label">' +
            escapeHTML(getCopy('preorderCart')) + '</span> ' +
            escapeHTML(dish.preorderNote || getCopy('preorderDefault')) + '</p>'
          : '') +
        '<div class="quantity-control">' +
        '<button type="button" data-cart-delta="-1" data-line="' + escapeHTML(line.key) + '"' +
        ' aria-label="' + escapeHTML(getCopy('decrease')) + '">−</button>' +
        '<span aria-live="polite">' + line.quantity + '</span>' +
        '<button type="button" data-cart-delta="1" data-line="' + escapeHTML(line.key) + '"' +
        ' aria-label="' + escapeHTML(getCopy('increase')) + '">+</button>' +
        '<button class="remove-line" type="button" data-remove-line="' + escapeHTML(line.key) + '">' +
        escapeHTML(getCopy('remove')) + '</button></div></div></div>';
    }).join('');
  }
  function checkoutFormMarkup() {
    if (!state.checkoutOpen) return '';
    var draft = state.checkoutDraft || {};
    var delivery = state.fulfillment === 'delivery';
    return '<div class="co-form">' +
      '<label class="co-field"><span>' + escapeHTML(getCopy('liveName')) + '</span>' +
      '<input id="coName" name="customerName" autocomplete="name" maxlength="80" value="' +
      escapeHTML(draft.name || '') + '" /></label>' +
      '<label class="co-field"><span>' + escapeHTML(getCopy('liveWhatsapp')) + '</span>' +
      '<input id="coWhatsapp" name="customerWhatsapp" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" dir="ltr" value="' +
      escapeHTML(draft.whatsapp || '') + '" /></label>' +
      (delivery
        ? '<label class="co-field"><span>' + escapeHTML(getCopy('liveAddress')) + '</span>' +
          '<input id="coAddress" name="customerAddress" autocomplete="street-address" maxlength="200" value="' +
          escapeHTML(draft.address || '') + '" /></label>'
        : '') +
      '<label class="co-field"><span>' + escapeHTML(getCopy('liveNotes')) + '</span>' +
      '<input id="coNotes" name="notes" maxlength="400" value="' +
      escapeHTML(draft.notes || '') + '" /></label>' +
      '<p class="co-error" id="coError" hidden></p></div>';
  }
  function cartMarkup() {
    // Order-confirmation state keeps the same panel so the design never shifts.
    if (state.placedOrder) {
      var code = state.placedOrder.code || '';
      return '<div class="cart-head"><div><p class="section-kicker">' + escapeHTML(getCopy('order')) + '</p>' +
        '<h2 class="cart-title">' + escapeHTML(getCopy('liveOrderSent')) + '</h2></div></div>' +
        '<div class="cart-empty"><strong class="co-code">' + escapeHTML(code) + '</strong>' +
        '<p>' + escapeHTML(getCopy('liveShowCode')) + '</p>' +
        (state.placedOrder.noWhatsapp
          ? '<p class="muted small">' + escapeHTML(getCopy('liveNoWhatsappNote')) + '</p>'
          : '') + '</div>' +
        '<div class="totals"><a class="checkout-demo" style="text-decoration:none"' +
        ' href="/track?code=' + encodeURIComponent(code) + '"><span>' + escapeHTML(getCopy('liveTrack')) + '</span>' +
        '<span>' + escapeHTML(code) + '</span></a>' +
        (state.placedOrder.reorderItems
          ? '<a class="checkout-demo co-ghost-btn" style="text-decoration:none"' +
            ' href="/restaurant?r=' + encodeURIComponent(slug) + '&reorder=' + encodeURIComponent(state.placedOrder.reorderItems) +
            '&reorderFrom=' + encodeURIComponent(code) + '"><span>' + escapeHTML(getCopy('reorderLabel')) + '</span><span></span></a>'
          : '') +
        '<button class="checkout-demo co-ghost-btn" type="button" data-new-order>' +
        '<span>' + escapeHTML(getCopy('liveDone')) + '</span><span></span></button></div>';
    }
    var count = cartCount();
    var subtotal = cartSubtotalCents();
    var fee = deliveryFeeCents(subtotal);
    var isEmpty = count === 0;
    var blocked = orderingBlocked();
    var deliveryAllowed = !view || !view.settings || view.settings.deliveryEnabled !== false;
    var fulfillmentMarkup = deliveryAllowed
      ? '<div class="fulfillment" role="group" aria-label="' + escapeHTML(getCopy('yourOrder')) + '">' +
        '<button type="button" data-fulfillment="pickup"' +
        ' class="' + (state.fulfillment === 'pickup' ? 'selected' : '') + '"' +
        ' aria-pressed="' + (state.fulfillment === 'pickup') + '">' + escapeHTML(getCopy('pickup')) + '</button>' +
        '<button type="button" data-fulfillment="delivery"' +
        ' class="' + (state.fulfillment === 'delivery' ? 'selected' : '') + '"' +
        ' aria-pressed="' + (state.fulfillment === 'delivery') + '">' + escapeHTML(getCopy('delivery')) + '</button></div>'
      : '<p class="fulfillment-note"><span aria-hidden="true">🥡</span> ' + escapeHTML(getCopy('pickupOnly')) + '</p>';
    var freeBlock = '';
    if (!isEmpty && deliveryAllowed && state.fulfillment === 'delivery') {
      var threshold = freeDeliveryThresholdCents();
      if (freeDeliveryEnabled() && subtotal >= threshold) {
        freeBlock = '<p class="free-delivery reached">✓ ' + escapeHTML(getCopy('freeDeliveryReached')) + '</p>';
      } else if (freeDeliveryEnabled() && threshold > 0) {
        var remaining = Math.max(0, threshold - subtotal);
        var percent = Math.min(100, Math.round((subtotal / threshold) * 100));
        freeBlock = '<div class="free-delivery"><div class="free-delivery-bar" role="progressbar"' +
          ' aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + percent + '">' +
          '<span style="width:' + percent + '%"></span></div>' +
          '<p>' + escapeHTML(getCopy('freeDeliveryProgress').replace('{amount}', money(remaining))) + '</p></div>';
      }
    }
    var footnote = blocked ? getCopy('liveBlocked') : getCopy('tableService');
    return '<div class="cart-head"><div><p class="section-kicker">' + escapeHTML(getCopy('order')) + '</p>' +
      '<h2 class="cart-title">' + escapeHTML(getCopy('yourOrder')) + '</h2></div>' +
      '<span class="cart-count">' + count + '</span></div>' +
      fulfillmentMarkup +
      (isEmpty
        ? '<div class="cart-empty"><span class="empty-illustration" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1.2 12H6.2L5 8Zm4 0V6a3 3 0 0 1 6 0v2" /></svg></span>' +
          '<strong>' + escapeHTML(getCopy('emptyTitle')) + '</strong><p>' + escapeHTML(getCopy('emptyText')) + '</p></div>'
        : '<div class="cart-lines">' + cartLinesMarkup() + '</div>' +
          freeBlock +
          '<div class="totals"><div class="total-row"><span>' + escapeHTML(getCopy('subtotal')) + '</span>' +
          '<strong>' + escapeHTML(money(subtotal)) + '</strong></div>' +
          (deliveryAllowed && state.fulfillment === 'delivery'
            ? '<div class="total-row"><span>' + escapeHTML(getCopy('deliveryFee')) + '</span>' +
              '<strong class="' + (fee ? '' : 'free-value') + '">' + escapeHTML(fee ? money(fee) : getCopy('free')) + '</strong></div>'
            : '') +
          '<div class="total-row grand"><span>' + escapeHTML(getCopy('total')) + '</span>' +
          '<strong>' + escapeHTML(money(subtotal + fee)) + '</strong></div>' +
          checkoutFormMarkup() +
          '<button class="checkout-demo" type="button" data-live-checkout' +
          (blocked || state.placing ? ' disabled' : '') + '>' +
          '<span>' + escapeHTML(state.placing ? getCopy('liveSending') : (state.checkoutOpen ? getCopy('livePlaceOrder') : getCopy('continueCheckout'))) + '</span>' +
          '<span>' + escapeHTML(money(subtotal + fee)) + '</span></button></div>') +
      '<p class="prototype-footnote">' + escapeHTML(footnote) + '</p>';
  }
  function renderCart() {
    var panel = $('#desktopCart');
    var headerCount = $('#headerCartCount');
    if (headerCount) headerCount.textContent = String(view ? cartCount() : 0);
    var mobileBar = $('#mobileCartBar');
    if (!view && (state.menuLoading || state.menuError)) {
      if (panel) {
        panel.innerHTML = '<div class="cart-head"><div><p class="section-kicker">' +
          escapeHTML(getCopy('order')) + '</p><h2 class="cart-title">' +
          escapeHTML(getCopy('yourOrder')) + '</h2></div></div>' +
          (state.menuLoading
            ? '<div class="cart-panel-loading" aria-hidden="true"><span class="skeleton-block"></span>' +
              '<span class="skeleton-line"></span><span class="skeleton-line skeleton-line-sm"></span></div>'
            : '<div class="cart-panel-error"><p>' +
              escapeHTML(state.menuRetryable ? getCopy('loadErrorTitle') : (state.menuErrorText || getCopy('liveNotFound'))) +
              '</p>' + (state.menuRetryable
                ? '<button class="btn btn-outline btn-sm" type="button" data-retry-menu>' +
                  escapeHTML(getCopy('retry')) + '</button>'
                : '') + '</div>');
      }
      if (mobileBar) mobileBar.hidden = true;
      return;
    }
    if (panel) panel.innerHTML = cartMarkup();
    if (mobileBar) {
      mobileBar.hidden = cartCount() === 0;
      mobileBar.setAttribute('aria-expanded', String(state.cartOpen));
      var mc = $('.mobile-cart-count');
      if (mc) mc.textContent = String(cartCount());
      var mt = $('.mobile-cart-total');
      if (mt) mt.textContent = money(cartSubtotalCents() + deliveryFeeCents());
    }
    renderCartDrawer();
  }
  function renderCartDrawer() {
    var root = $('#cartDrawerRoot');
    if (!root) return;
    if (!state.cartOpen) { root.innerHTML = ''; return; }
    root.innerHTML = '<div class="cart-drawer" data-close-cart><aside class="cart-drawer-inner" role="dialog"' +
      ' aria-modal="true" aria-labelledby="drawerTitle" tabindex="-1"><div class="drawer-heading">' +
      '<h2 id="drawerTitle">' + escapeHTML(getCopy('yourOrder')) + '</h2>' +
      '<button type="button" data-close-cart aria-label="' + escapeHTML(getCopy('closeOrder')) + '">' +
      '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg></button></div>' +
      '<div class="drawer-content">' + cartMarkup() + '</div></aside></div>';
    document.body.classList.add('overlay-open');
  }
  function openCart() {
    closeDish();
    state.previousFocus = document.activeElement;
    state.cartOpen = true;
    renderCartDrawer();
    requestAnimationFrame(function () {
      var btn = $("#cartDrawerRoot [role='dialog'] .drawer-heading button");
      if (btn) btn.focus();
    });
  }
  function closeCart() {
    if (!state.cartOpen) return;
    state.cartOpen = false;
    var root = $('#cartDrawerRoot');
    if (root) root.innerHTML = '';
    if (!state.modalDishId) document.body.classList.remove('overlay-open');
    if (state.previousFocus && state.previousFocus.focus) {
      try { state.previousFocus.focus(); } catch (_) { /* ignore */ }
    }
  }
  function changeCartLine(key, delta) {
    var line = null;
    state.cart.forEach(function (item) { if (item.key === key) line = item; });
    if (!line) return;
    line.quantity += delta;
    if (line.quantity <= 0) {
      state.cart = state.cart.filter(function (item) { return item.key !== key; });
    } else {
      line.quantity = Math.min(99, line.quantity);
    }
    state.placedOrder = null;
    state.submissionKey = null;
    saveCart();
    renderCart();
  }
  function toastMsg(message) {
    if (App.toast) {
      try { App.toast(message); return; } catch (_) { /* fall through */ }
    }
    var zone = $('#toastZone');
    if (!zone) return;
    zone.innerHTML = '';
    var element = document.createElement('div');
    element.className = 'demo-toast';
    element.textContent = message;
    zone.append(element);
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(function () { element.remove(); }, 2600);
  }

  /* ------------------------------ checkout ------------------------- */
  function cartKey() { return 'ordora_cart_' + slug; }
  function saveCart() {
    try { localStorage.setItem(cartKey(), JSON.stringify(state.cart)); } catch (_) { /* ignore */ }
  }
  function loadCart() {
    try {
      var raw = JSON.parse(localStorage.getItem(cartKey()) || '[]');
      if (!Array.isArray(raw)) return;
      state.cart = raw.filter(function (line) {
        return line && typeof line.key === 'string' && Number.isInteger(line.quantity) &&
          line.quantity > 0 && line.quantity <= 99 && typeof line.dishId === 'string';
      });
      if (state.cart.length) saveCart();
    } catch (_) { /* ignore */ }
  }
  function coError(message) {
    $$('#desktopCart #coError, #cartDrawerRoot #coError').forEach(function (box) {
      if (!message) { box.hidden = true; return; }
      box.textContent = message;
      box.hidden = false;
    });
  }
  function submitKey() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return 'key-' + Date.now() + '-' + Math.floor(Math.random() * 1e9);
  }
  function readCheckoutDraft(root) {
    var name = root ? root.querySelector('#coName') : null;
    var wa = root ? root.querySelector('#coWhatsapp') : null;
    var address = root ? root.querySelector('#coAddress') : null;
    var notes = root ? root.querySelector('#coNotes') : null;
    state.checkoutDraft = {
      name: name ? name.value : (state.checkoutDraft.name || ''),
      whatsapp: wa ? wa.value : (state.checkoutDraft.whatsapp || ''),
      address: address ? address.value : (state.checkoutDraft.address || ''),
      notes: notes ? notes.value : (state.checkoutDraft.notes || ''),
    };
    return state.checkoutDraft;
  }
  function handleCheckout() {
    if (orderingBlocked() || state.placing || cartCount() === 0) return;
    if (!state.checkoutOpen) {
      state.checkoutOpen = true;
      renderCart();
      var input = $('#cartDrawerRoot #coName') || $('#desktopCart #coName');
      if (input) input.focus();
      return;
    }
    var root = state.cartOpen ? $('#cartDrawerRoot') : $('#desktopCart');
    var draft = readCheckoutDraft(root);
    draft.name = String(draft.name || '').trim();
    draft.whatsapp = String(draft.whatsapp || '').trim();
    draft.address = String(draft.address || '').trim();
    draft.notes = String(draft.notes || '').trim();
    if (!draft.name) { coError(getCopy('liveEnterName')); return; }
    // WhatsApp is optional: only validate its format when provided.
    if (draft.whatsapp) {
      var waDigits = draft.whatsapp.replace(/[^0-9]/g, '');
      if (waDigits.length < 8 || waDigits.length > 15) { coError(getCopy('liveWhatsappInvalid')); return; }
    }
    if (state.fulfillment === 'delivery' && !draft.address) { coError(getCopy('liveAddrRequired')); return; }
    coError(null);
    state.placing = true;
    if (!state.submissionKey) state.submissionKey = submitKey();
    // Re-render immediately so the button shows the sending state, but the
    // draft values are already saved and come back if the request fails.
    renderCart();
    var payloadItems = state.cart.filter(function (line) { return getDish(line.dishId); }).map(function (line) {
      var dish = getDish(line.dishId);
      var selections = [];
      dish.options.forEach(function (group) {
        var choiceIds = (line.selections[group.id] || []).filter(function (choiceId) {
          return group.choices.some(function (choice) { return choice.id === choiceId; });
        });
        if (choiceIds.length) {
          selections.push({
            groupId: group.id,
            choices: choiceIds.map(function (choiceId) {
              return { choiceId: choiceId, quantity: 1 };
            }),
          });
        }
      });
      return { itemId: dish.id, quantity: line.quantity, selections: selections };
    });
    // Snapshot the cart for the confirmation screen's reorder link: the
    // checkout response carries no items, and the cart is cleared below.
    var reorderItems = payloadItems.map(function (p) { return p.itemId + ':' + p.quantity; }).join(',');
    api.post('/api/restaurants/' + encodeURIComponent(slug) + '/orders', {
      customerName: draft.name,
      customerWhatsapp: draft.whatsapp,
      customerPhone: '',
      customerAddress: draft.address,
      notes: draft.notes,
      orderType: state.fulfillment,
      submissionKey: state.submissionKey,
      items: payloadItems,
    }).then(function (data) {
      state.placing = false;
      state.checkoutOpen = false;
      state.submissionKey = null;
      state.cart = [];
      state.checkoutDraft = { name: '', whatsapp: '', address: '', notes: '' };
      saveCart();
      state.placedOrder = (data && data.order) || { code: '' };
      // Remember whether WhatsApp was omitted so the confirmation screen
      // can stress the tracking code (no WhatsApp updates can be sent).
      state.placedOrder.noWhatsapp = !draft.whatsapp;
      state.placedOrder.reorderItems = reorderItems;
      renderCart();
    }).catch(function (err) {
      state.placing = false;
      renderCart();
      coError(err && err.message ? err.message : getCopy('liveLoadError'));
    });
  }

  /* ------------------------------- share --------------------------- */
  function shareMenu() {
    var name = view ? view.name : document.title;
    // Share the working query form: location.pathname alone is just
    // /restaurant on the Pages site and would lose the slug.
    var shareUrl = slug
      ? location.origin + '/restaurant?r=' + encodeURIComponent(slug)
      : location.origin + location.pathname;
    var shareData = { title: name, text: name, url: shareUrl };
    function done() { toastMsg(getCopy('linkCopied')); }
    if (navigator.share) {
      navigator.share(shareData).catch(function (error) {
        if (error && error.name !== 'AbortError') toastMsg(getCopy('shareError'));
      });
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareData.url).then(done, function () {
        toastMsg(getCopy('shareError'));
      });
      return;
    }
    toastMsg(getCopy('shareError'));
  }

  /* ---------------------------- static copy ------------------------ */
  function setMetaContent(selector, value) {
    var element = document.querySelector(selector);
    if (element && value) element.setAttribute('content', value);
  }
  function absoluteUrl(path) {
    if (!path) return '';
    try { return new URL(path, location.origin).href; } catch (_) { return path; }
  }
  function updateSeo() {
    var settings = (view && view.settings) || {};
    var name = view ? view.name : 'Ordora';
    var description = settings.description || getCopy('restaurantDescription');
    var title = view
      ? (state.language === 'ar' ? name + ' — القائمة' : name + ' — Menu')
      : (state.language === 'ar' ? 'القائمة — Ordora' : 'Menu — Ordora');
    document.title = title;
    setMetaContent('meta[name="description"]', description);
    setMetaContent('meta[property="og:title"]', title);
    setMetaContent('meta[property="og:description"]', description);
    setMetaContent('meta[name="twitter:title"]', title);
    setMetaContent('meta[name="twitter:description"]', description);
    // Canonical uses the query form (?r=slug): Cloudflare Pages strips
    // the slug from /restaurant/<slug> (308 to /restaurant), so the path
    // form is not a working canonical URL on the Pages site.
    var canonical = slug
      ? location.origin + '/restaurant?r=' + encodeURIComponent(slug)
      : location.origin + location.pathname;
    setMetaContent('meta[property="og:url"]', canonical);
    var image = '';
    if (view && view.heroImages && view.heroImages.length) image = view.heroImages[0].imagePath;
    else if (settings.coverPath) image = settings.coverPath;
    if (image) {
      image = absoluteUrl(image);
      setMetaContent('meta[property="og:image"]', image);
      setMetaContent('meta[name="twitter:image"]', image);
      setMetaContent('meta[name="twitter:card"]', 'summary_large_image');
    }
    var canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.append(canonicalLink);
    }
    canonicalLink.href = canonical;
  }
  function updateHeroMeta() {
    var settings = (view && view.settings) || {};
    var items = $('#metaItems');
    if (items) {
      var available = dishes.filter(function (dish) { return dish.available !== false; }).length;
      var itemsText = items.querySelector('span:last-child');
      if (available && itemsText) {
        items.hidden = false;
        itemsText.textContent = getCopy('itemsCount').replace('{n}', available);
      } else {
        items.hidden = true;
      }
    }
    var address = $('#metaAddress');
    if (address) {
      var value = String(settings.address || '').trim();
      var addressText = address.querySelector('span:last-child');
      address.hidden = !value;
      if (value && addressText) addressText.textContent = value;
    }
    var delivery = $('#metaDelivery');
    if (delivery) {
      var deliveryText = delivery.querySelector('span:last-child');
      if (!view || settings.deliveryEnabled === false) {
        delivery.hidden = true;
      } else {
        var fee = Number(settings.deliveryFeeCents) || 0;
        var free = freeDeliveryEnabled() && freeDeliveryThresholdCents() === 0;
        delivery.hidden = false;
        if (deliveryText) {
          deliveryText.textContent = free || fee === 0
            ? getCopy('freeDeliveryReached')
            : getCopy('deliveryFee') + ': ' + money(fee);
        }
      }
    }
    // Today's opening hours (visitor-local weekday; day 0 = Sunday matches
    // the server's day_of_week). Hidden when the restaurant has no hours.
    var hoursEl = $('#metaHours');
    if (hoursEl) {
      var todayRow = (view && view.hours) ? view.hours.find(function (h) { return h.day === new Date().getDay(); }) : null;
      var hoursText = hoursEl.querySelector('span:last-child');
      hoursEl.hidden = !todayRow;
      if (todayRow && hoursText) {
        hoursText.textContent = todayRow.closed
          ? getCopy('closedToday')
          : getCopy('todayHours').replace('{hours}', todayRow.opensAt + '–' + todayRow.closesAt);
      }
    }
    // Google Maps link built only from the restaurant's real name/address.
    var mapsEl = $('#metaMaps');
    if (mapsEl) {
      var query = [view ? view.name : '', settings.address || ''].filter(Boolean).join(' ').trim();
      mapsEl.hidden = !query;
      if (query) {
        mapsEl.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
        var mapsText = mapsEl.querySelector('span:last-child');
        if (mapsText) mapsText.textContent = getCopy('mapsLink');
      }
    }
    // Promo banner: only when the restaurant set promo text.
    var promoEl = $('#promoBanner');
    if (promoEl) {
      var promo = String(settings.promoText || '').trim();
      promoEl.hidden = !promo;
      if (promo) promoEl.textContent = promo;
    }
  }
  function updateStaticCopy() {
    document.documentElement.lang = state.language;
    document.documentElement.dir = state.language === 'ar' ? 'rtl' : 'ltr';
    updateSeo();
    $$('[data-copy]').forEach(function (element) {
      element.textContent = getCopy(element.dataset.copy);
    });
    // Live overrides (after the generic pass so real data wins).
    var nameElement = $('#restaurantName');
    if (nameElement) nameElement.textContent = view ? view.name : '…';
    var description = $('#heroDescription');
    if (description) {
      var settings = (view && view.settings) || {};
      description.textContent = settings.description || getCopy('restaurantDescription');
    }
    var foot = $('.footer-copyright');
    if (foot) {
      foot.textContent = state.language === 'ar'
        ? '© 2026 ' + (view ? view.name : 'Ordora') + '. جميع الحقوق محفوظة.'
        : '© 2026 ' + (view ? view.name : 'Ordora') + '. All rights reserved.';
    }
    updateHeroMeta();
    // When there is no restaurant view (not found), the static shell's
    // "open now" badges must NOT stay visible — they contradict the
    // not-found message. Hide them (and the hero dot) instead.
    var statusText = view
      ? ((view.openNow !== false && !view.orderingBlocked) ? getCopy('openNow') : getCopy('closed'))
      : '';
    ['#topbarStatus', '#heroStatus'].forEach(function (selector) {
      var element = $(selector);
      if (element) {
        element.textContent = statusText;
        element.style.display = statusText ? '' : 'none';
      }
    });
    var openDot = $('.open-dot');
    if (openDot) openDot.style.display = view ? '' : 'none';
    var languageButton = $('#languageButton');
    if (languageButton) {
      languageButton.textContent = state.language === 'ar' ? 'EN' : 'عربي';
      languageButton.setAttribute('aria-label', state.language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
    }
    var shareButton = $('#shareButton');
    if (shareButton) shareButton.setAttribute('aria-label', getCopy('share'));
    var openCartButton = $('#openCartButton');
    if (openCartButton) openCartButton.setAttribute('aria-label', getCopy('order'));
    var desktopCart = $('#desktopCart');
    if (desktopCart) desktopCart.setAttribute('aria-label', getCopy('yourOrder'));
    var categoryStrip = $('#categoryStrip');
    if (categoryStrip) categoryStrip.setAttribute('aria-label', getCopy('categoryLabel'));
    var coverCarousel = $('#coverCarousel');
    if (coverCarousel) coverCarousel.setAttribute('aria-label', getCopy('coverLabel'));
    var coverPrevious = $('#coverPrevious');
    if (coverPrevious) coverPrevious.setAttribute('aria-label', getCopy('previousCover'));
    var coverNext = $('#coverNext');
    if (coverNext) coverNext.setAttribute('aria-label', getCopy('nextCover'));
    $$('.cover-dot').forEach(function (dot) {
      dot.setAttribute('aria-label', getCopy('showCover') + ' ' + (Number(dot.dataset.coverIndex) + 1));
    });
    $$('.cover-slide img').forEach(function (image, index) {
      if (coverSlides[index] && coverSlides[index].alt) image.alt = localize(coverSlides[index].alt);
    });
    var search = $('#menuSearch');
    if (search) {
      search.placeholder = getCopy('searchPlaceholder');
      search.setAttribute('aria-label', getCopy('searchLabel'));
      if (document.activeElement !== search) search.value = state.query;
    }
  }
  function setLanguage(language) {
    if (language === state.language) return;
    state.language = language;
    state.languagePinned = true;
    try { localStorage.setItem(LANG_STORE_KEY, language); } catch (_) { /* ignore */ }
    try {
      var url = new URL(location.href);
      url.searchParams.set('lang', language);
      history.replaceState(null, '', url.toString());
    } catch (_) { /* ignore */ }
    updateStaticCopy();
    renderMenu();
    renderCart();
    if (state.modalDishId) renderModal();
  }

  /* -------------------------------- events ------------------------- */
  document.addEventListener('click', function (event) {
    var button = event.target.closest('button, a');
    if (!button) {
      if (event.target.matches('[data-close-modal]')) closeDish();
      if (event.target.matches('[data-close-cart]')) closeCart();
      return;
    }
    if (button.id === 'languageButton') {
      setLanguage(state.language === 'ar' ? 'en' : 'ar');
      return;
    }
    if (button.id === 'shareButton') { shareMenu(); return; }
    if (button.id === 'openCartButton' || button.id === 'mobileCartBar') { openCart(); return; }
    if (button.dataset.category) {
      state.category = button.dataset.category;
      renderMenu();
      return;
    }
    if (button.dataset.openDish) { openDish(button.dataset.openDish, button); return; }
    if (button.dataset.quickAdd) {
      var dish = getDish(button.dataset.quickAdd);
      if (!dish) return;
      if (dish.options.length) openDish(dish.id, button);
      else addDishToCart(dish.id);
      return;
    }
    if (button.hasAttribute('data-close-modal')) { closeDish(); return; }
    if (button.hasAttribute('data-close-cart')) { closeCart(); return; }
    if (button.dataset.fulfillment) {
      if (button.dataset.fulfillment === 'delivery' &&
        view && view.settings && view.settings.deliveryEnabled === false) {
        return;
      }
      if (state.fulfillment !== button.dataset.fulfillment) state.submissionKey = null;
      state.fulfillment = button.dataset.fulfillment;
      renderCart();
      return;
    }
    if (button.dataset.cartDelta) {
      changeCartLine(button.dataset.line, Number(button.dataset.cartDelta));
      return;
    }
    if (button.dataset.removeLine) {
      state.cart = state.cart.filter(function (line) { return line.key !== button.dataset.removeLine; });
      state.placedOrder = null;
      state.submissionKey = null;
      saveCart();
      renderCart();
      return;
    }
    if (button.hasAttribute('data-retry-menu')) { loadMenu(); return; }
    if (button.dataset.modalQuantity) {
      state.modalQuantity = Math.max(1, state.modalQuantity + Number(button.dataset.modalQuantity));
      var qty = $('#modalQuantity');
      if (qty) qty.textContent = String(state.modalQuantity);
      updateModalSummary();
      return;
    }
    if (button.hasAttribute('data-add-modal')) {
      var modalDish = getDish(state.modalDishId);
      if (!modalDish || !getModalValidity(modalDish)) return;
      addDishToCart(modalDish.id, state.modalSelections, state.modalQuantity);
      closeDish();
      return;
    }
    if (button.hasAttribute('data-live-checkout')) { handleCheckout(); return; }
    if (button.hasAttribute('data-new-order')) {
      state.placedOrder = null;
      renderCart();
      return;
    }
  });
  document.addEventListener('input', function (event) {
    if (event.target.id === 'menuSearch') {
      state.query = event.target.value;
      renderMenu();
      return;
    }
    var draftField = {
      coName: 'name',
      coWhatsapp: 'whatsapp',
      coAddress: 'address',
      coNotes: 'notes',
    }[event.target.id];
    if (draftField) state.checkoutDraft[draftField] = event.target.value;
  });
  document.addEventListener('change', function (event) {
    var input = event.target.closest('[data-option-choice]');
    if (!input || !state.modalDishId) return;
    var groupId = input.dataset.group;
    var choiceId = input.dataset.choice;
    var dish = getDish(state.modalDishId);
    if (!dish) return;
    var groupData = null;
    dish.options.forEach(function (item) { if (item.id === groupId) groupData = item; });
    if (!groupData) return;
    if (input.type === 'radio') {
      state.modalSelections[groupId] = choiceId ? [choiceId] : [];
    } else {
      var current = (state.modalSelections[groupId] || []).slice();
      if (input.checked) {
        if (current.length >= groupData.maxPicks) {
          input.checked = false;
          toastMsg(getCopy('pickHint').replace('{n}', groupData.maxPicks));
          return;
        }
        if (current.indexOf(choiceId) === -1) current.push(choiceId);
      } else {
        current = current.filter(function (item) { return item !== choiceId; });
      }
      if (current.length) state.modalSelections[groupId] = current;
      else delete state.modalSelections[groupId];
    }
    updateModalSummary();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') { closeDish(); closeCart(); return; }
    if (event.key !== 'Tab') return;
    var dialog = $('#modalRoot [role=\'dialog\'], #cartDrawerRoot [role=\'dialog\']');
    if (!dialog) return;
    var focusable = $$('button:not(:disabled), input:not(:disabled)', dialog)
      .filter(function (element) { return element.offsetParent !== null; });
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  document.addEventListener('error', function (event) {
    var image = event.target;
    if (!(image instanceof HTMLImageElement) || image.dataset.fallback === 'true') return;
    if (!image.matches('.dish-photo img, .modal-image img, .cover-slide img')) return;
    image.dataset.fallback = 'true';
    image.src = FALLBACK_IMG;
  }, true);

  /* --------------------------------- boot -------------------------- */
  loadCart();
  var queryParams = null;
  try { queryParams = new URLSearchParams(location.search); } catch (_) { queryParams = null; }

  function applyReorder() {
    if (!queryParams) return;
    var raw = queryParams.get('reorder');
    if (!raw || !dishes.length) return;
    var addedUnits = 0;
    var needsOptions = 0;
    var missing = 0;
    raw.split(',').slice(0, 60).forEach(function (entry) {
      var bits = entry.split(':');
      var dish = getDish(bits[0]);
      var quantity = Math.min(99, Math.max(1, parseInt(bits[1], 10) || 1));
      if (!dish || dish.available === false) { missing += 1; return; }
      var requiresChoices = dish.options.some(function (group) { return group.minPicks > 0; });
      if (requiresChoices) { needsOptions += 1; return; }
      if (addDishToCart(dish.id, {}, quantity, true)) addedUnits += quantity;
    });
    var messages = [];
    if (addedUnits) messages.push(getCopy('reorderAdded').replace('{n}', addedUnits));
    if (needsOptions) messages.push(getCopy('reorderNeedsOptions'));
    if (missing) messages.push(getCopy('reorderMissing'));
    if (messages.length) toastMsg(messages.join(' · '));
    // A refresh must not add the same order again.
    try {
      var url = new URL(location.href);
      url.searchParams.delete('reorder');
      url.searchParams.delete('reorderFrom');
      history.replaceState(null, '', url.toString());
    } catch (_) { /* ignore */ }
  }

  function loadMenu() {
    state.menuLoading = true;
    state.menuError = false;
    state.menuErrorText = '';
    state.menuRetryable = true;
    renderMenu();
    renderCart();
    api.get('/api/restaurants/' + encodeURIComponent(slug) + '/menu').then(function (data) {
      mapView(data);
      state.menuLoading = false;
      updateStaticCopy();
      initializeCoverCarousel();
      renderMenu();
      renderCart();
      initializeCategoryDock();
      applyReorder();
    }).catch(function () {
      state.menuLoading = false;
      state.menuError = true;
      state.menuErrorText = getCopy('liveLoadError');
      state.menuRetryable = true;
      updateStaticCopy();
      renderMenu();
      renderCart();
    });
  }

  if (!slug) {
    state.menuLoading = false;
    state.menuError = true;
    state.menuErrorText = getCopy('liveNotFound');
    state.menuRetryable = false;
    updateStaticCopy();
    renderMenu();
    renderCart();
  } else {
    loadMenu();
  }
  updateStaticCopy();
  renderMenu();
  renderCart();
})();

/* evive Cookie Banner 1.0.1: nothing non-essential before consent.
 * - Choice is kept in the first-party cookie evive_consent (necessary, 180 days).
 * - Analytics: Google Consent Mode v2 starts "denied"; Google Tag Manager is only loaded after consent.
 *   Withdrawing sets consent back to denied and removes the _ga / _gid / _gat cookies.
 * - Media: YouTube/Vimeo iframes arrive with src="about:blank" (see the PHP side) and only get their
 *   real address after consent, or when the visitor clicks "Load video" on one of them.
 * - window.invaiseCheckoutAnalyticsConsent follows the analytics choice (invAIse Checkout plugin).
 * - API: window.eviveConsent.get(category), .open(), .set({analytics, media}); event "evive:consent". */
(function () {
  'use strict';
  var cfg = window.eviveCookieBannerConfig || {};
  var COOKIE = 'evive_consent';
  var PREVIEW_COOKIE = 'evive_cb_preview';

  var TEXTS = {
    en: {
      title: 'Cookies on this website',
      text: 'We use necessary cookies to make this website work. With your permission we also use analytics cookies (Google Analytics) to see which pages and channels bring visitors and sales, and we load videos from external platforms. Nothing is used before you choose.',
      privacy: 'Privacy policy',
      accept: 'Accept all',
      reject: 'Reject all',
      settings: 'Settings',
      save: 'Save choice',
      necessary: 'Necessary',
      necessaryText: 'Needed for the website to work, for example to remember this choice. Always on.',
      analytics: 'Analytics',
      analyticsText: 'Google Analytics, via Google Tag Manager: which pages are visited and which channels bring visitors and purchases. Sets the cookies _ga and _ga_*.',
      media: 'External media',
      mediaText: 'Videos from YouTube or Vimeo. These platforms set their own cookies when a video loads.',
      always: 'Always on',
      dialog: 'Cookie choice',
      videoText: 'This video is hosted on {host}. Loading it sends your IP address to {host}, and it may set cookies.',
      videoButton: 'Load video'
    },
    nl: {
      title: 'Cookies op deze website',
      text: 'We gebruiken noodzakelijke cookies om deze website te laten werken. Met je toestemming gebruiken we ook analytische cookies (Google Analytics) om te zien welke pagina’s en kanalen bezoekers en aankopen opleveren, en laden we video’s van externe platforms. Niets daarvan gebeurt voordat je kiest.',
      privacy: 'Privacyverklaring',
      accept: 'Alles accepteren',
      reject: 'Alles weigeren',
      settings: 'Instellingen',
      save: 'Keuze opslaan',
      necessary: 'Noodzakelijk',
      necessaryText: 'Nodig om de website te laten werken, bijvoorbeeld om deze keuze te onthouden. Altijd aan.',
      analytics: 'Statistieken',
      analyticsText: 'Google Analytics, via Google Tag Manager: welke pagina’s bezocht worden en welke kanalen bezoekers en aankopen opleveren. Plaatst de cookies _ga en _ga_*.',
      media: 'Externe media',
      mediaText: 'Video’s van YouTube of Vimeo. Deze platforms plaatsen hun eigen cookies zodra een video laadt.',
      always: 'Altijd aan',
      dialog: 'Cookiekeuze',
      videoText: 'Deze video staat op {host}. Bij het laden gaat je IP-adres naar {host} en kunnen cookies worden geplaatst.',
      videoButton: 'Video laden'
    }
  };
  var lang = cfg.language === 'auto'
    ? (/^nl\b/i.test(navigator.language || '') ? 'nl' : 'en')
    : (cfg.language === 'nl' ? 'nl' : 'en');
  var T = TEXTS[lang];

  // ── cookies ─────────────────────────────────────────────────────────────────────────────────
  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return m ? m[1] : null;
  }
  function setCookie(name, value, maxAgeSeconds) {
    document.cookie = name + '=' + value + '; Path=/; SameSite=Lax' +
      (maxAgeSeconds !== undefined ? '; Max-Age=' + maxAgeSeconds : '') +
      (location.protocol === 'https:' ? '; Secure' : '');
  }
  // Removes a cookie on this host and on every parent domain (GA sets them on .example.com).
  function deleteCookie(name) {
    var parts = location.hostname.split('.');
    var domains = [''];
    for (var i = 0; i < parts.length - 1; i++) domains.push(parts.slice(i).join('.'));
    domains.forEach(function (d) {
      document.cookie = name + '=; Path=/; Max-Age=0' + (d ? '; Domain=' + d : '');
    });
  }
  function deleteAnalyticsCookies() {
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (/^(_ga|_ga_.+|_gid|_gat.*|_gcl_.+)$/.test(name)) deleteCookie(name);
    });
  }

  function readChoice() {
    var raw = getCookie(COOKIE);
    if (!raw) return null;
    try {
      var o = JSON.parse(decodeURIComponent(raw));
      if (o.v !== 1 || o.r !== (cfg.revision || 1)) return null; // new revision: ask again
      return { analytics: !!o.a, media: !!o.m };
    } catch (e) { return null; }
  }
  function storeChoice(c) {
    setCookie(COOKIE, encodeURIComponent(JSON.stringify({
      v: 1, r: cfg.revision || 1, a: c.analytics ? 1 : 0, m: c.media ? 1 : 0, t: Math.floor(Date.now() / 1000)
    })), (cfg.maxAgeDays || 180) * 86400);
  }

  // ── preview mode: only active for a tester; everyone else keeps today's page ────────────────
  var params = new URLSearchParams(location.search);
  if (params.get('evive_cb_preview') === '1') setCookie(PREVIEW_COOKIE, '1');
  if (params.get('evive_cb_preview') === '0') deleteCookie(PREVIEW_COOKIE);
  var active = cfg.mode === 'live' || (cfg.mode === 'preview' && getCookie(PREVIEW_COOKIE) === '1');

  function heldBackFrames() {
    return Array.prototype.slice.call(document.querySelectorAll('iframe[data-evive-src]'));
  }
  if (!active) {
    // Not active for this visitor: put held-back embeds back as they were and do nothing else.
    var restore = function () {
      heldBackFrames().forEach(function (f) { f.src = f.getAttribute('data-evive-src'); f.removeAttribute('data-evive-src'); });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', restore); else restore();
    return;
  }

  // ── Google Consent Mode v2 + Tag Manager ────────────────────────────────────────────────────
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    analytics_storage: 'denied', functionality_storage: 'granted', security_storage: 'granted'
  });
  var gtmLoaded = false;
  function loadGtm() {
    if (gtmLoaded || !/^GTM-[A-Z0-9]+$/.test(cfg.gtmId || '')) return;
    gtmLoaded = true;
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(cfg.gtmId);
    (document.head || document.documentElement).appendChild(s);
  }

  // ── media ───────────────────────────────────────────────────────────────────────────────────
  function frameUrl(f) {
    // YouTube after consent: the privacy-enhanced domain, which sets no cookies until playback.
    return f.getAttribute('data-evive-src').replace(/^(https?:)?\/\/(www\.)?youtube\.com\/embed\//i, 'https://www.youtube-nocookie.com/embed/');
  }
  function loadFrame(f) {
    if (f.eviveBox && f.eviveBox.parentNode) f.eviveBox.parentNode.removeChild(f.eviveBox);
    f.style.visibility = '';
    f.src = frameUrl(f);
    f.removeAttribute('data-evive-src');
  }
  function placeholders() {
    heldBackFrames().forEach(function (f) {
      if (f.eviveBox) return;
      var host = /vimeo/i.test(f.getAttribute('data-evive-src')) ? 'Vimeo' : 'YouTube';
      var box = document.createElement('div');
      box.className = 'evive-cb-video';
      var p = document.createElement('p');
      p.textContent = T.videoText.replace(/\{host\}/g, host);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'evive-cb-btn';
      b.textContent = T.videoButton;
      b.addEventListener('click', function () { loadFrame(f); });
      box.appendChild(p);
      box.appendChild(b);
      if (getComputedStyle(f.parentNode).position === 'static') f.parentNode.style.position = 'relative';
      f.style.visibility = 'hidden';
      f.eviveBox = box;
      f.parentNode.appendChild(box);
    });
  }

  // ── applying a choice ───────────────────────────────────────────────────────────────────────
  var choice = readChoice();
  function apply(c, changed) {
    window.invaiseCheckoutAnalyticsConsent = !!(c && c.analytics);
    gtag('consent', 'update', { analytics_storage: c && c.analytics ? 'granted' : 'denied' });
    if (c && c.analytics) loadGtm(); else deleteAnalyticsCookies();
    if (c && c.media) heldBackFrames().forEach(loadFrame);
    if (changed) {
      var detail = { analytics: !!(c && c.analytics), media: !!(c && c.media) };
      try { document.dispatchEvent(new CustomEvent('evive:consent', { detail: detail })); } catch (e) { /* very old browsers */ }
      window.dataLayer.push({ event: 'evive_consent_update', evive_consent_analytics: detail.analytics, evive_consent_media: detail.media });
    }
  }
  function decide(c) {
    choice = { analytics: !!c.analytics, media: !!c.media };
    storeChoice(choice);
    apply(choice, true);
    hide();
    // Tag Manager cannot be unloaded: after a withdrawal, reload so it is gone from this page too
    // (otherwise its tags keep sending cookieless pings until the next page).
    if (!choice.analytics && gtmLoaded) location.reload();
  }

  // ── banner ──────────────────────────────────────────────────────────────────────────────────
  var el = null;
  function build() {
    el = document.createElement('div');
    el.id = 'evive-cb';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'false');
    el.setAttribute('aria-label', T.dialog);
    el.setAttribute('lang', lang);
    el.hidden = true;
    var privacy = cfg.privacyUrl ? ' <a href="' + encodeURI(cfg.privacyUrl) + '">' + T.privacy + '</a>' : '';
    var row = function (key, locked) {
      return '<label class="evive-cb-row"><span class="evive-cb-row-text"><strong>' + T[key] + '</strong><span>' + T[key + 'Text'] + '</span></span>' +
        (locked ? '<span class="evive-cb-always">' + T.always + '</span>'
                : '<input type="checkbox" class="evive-cb-toggle" data-cat="' + key + '">') + '</label>';
    };
    el.innerHTML =
      '<div class="evive-cb-inner">' +
        '<p class="evive-cb-title">' + T.title + '</p>' +
        '<p class="evive-cb-text">' + T.text + privacy + '</p>' +
        '<div class="evive-cb-prefs" hidden>' + row('necessary', true) + row('analytics') + (cfg.media ? row('media') : '') + '</div>' +
        '<div class="evive-cb-buttons">' +
          '<button type="button" class="evive-cb-btn" data-act="reject">' + T.reject + '</button>' +
          '<button type="button" class="evive-cb-btn evive-cb-btn-plain" data-act="settings">' + T.settings + '</button>' +
          '<button type="button" class="evive-cb-btn evive-cb-btn-plain" data-act="save" hidden>' + T.save + '</button>' +
          '<button type="button" class="evive-cb-btn" data-act="accept">' + T.accept + '</button>' +
        '</div>' +
      '</div>';
    el.addEventListener('click', function (e) {
      var act = e.target.getAttribute && e.target.getAttribute('data-act');
      if (act === 'accept') decide({ analytics: true, media: true });
      else if (act === 'reject') decide({ analytics: false, media: false });
      else if (act === 'settings') showPrefs();
      else if (act === 'save') {
        var c = {};
        el.querySelectorAll('.evive-cb-toggle').forEach(function (t) { c[t.getAttribute('data-cat')] = t.checked; });
        decide(c);
      }
    });
    document.body.appendChild(el);
  }
  function showPrefs() {
    el.querySelector('.evive-cb-prefs').hidden = false;
    el.querySelector('[data-act="settings"]').hidden = true;
    el.querySelector('[data-act="save"]').hidden = false;
    el.querySelectorAll('.evive-cb-toggle').forEach(function (t) { t.checked = !!(choice && choice[t.getAttribute('data-cat')]); });
  }
  function show(withPrefs) {
    if (!el) build();
    el.querySelector('.evive-cb-prefs').hidden = true;
    el.querySelector('[data-act="settings"]').hidden = false;
    el.querySelector('[data-act="save"]').hidden = true;
    if (withPrefs) showPrefs();
    el.hidden = false;
    var first = el.querySelector('button:not([hidden])');
    if (first && withPrefs) first.focus();
  }
  function hide() { if (el) el.hidden = true; }

  // ── public API ──────────────────────────────────────────────────────────────────────────────
  window.eviveConsent = {
    get: function (cat) { return !!(choice && choice[cat]); },
    choice: function () { return choice ? { analytics: choice.analytics, media: choice.media } : null; },
    set: function (c) { decide(c || {}); },
    open: function () { show(true); }
  };

  apply(choice, false); // before DOM ready: GTM starts as early as possible for returning visitors
  function onReady() {
    if (cfg.media) placeholders();
    if (choice && choice.media) heldBackFrames().forEach(loadFrame);
    if (!choice) show(false);
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href$="#cookie-settings"], [data-evive-cookie-settings]');
      if (!a) return;
      e.preventDefault();
      show(true);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady); else onReady();
})();

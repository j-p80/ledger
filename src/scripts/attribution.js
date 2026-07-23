(function () {
  var CAPTURE_URL = 'https://dmthypxyqdlihrzkipgc.supabase.co/functions/v1/capture_attribution';
  var APP_HOST = 'app.heirly.app';
  var PARAM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];

  function consentGranted() {
    try {
      var raw = localStorage.getItem('heirly_cookie_consent');
      if (!raw) return false;
      var stored = JSON.parse(raw);
      return !!(stored && stored.analytics === true && stored.version === '1.0' && stored.consent_id);
    } catch (e) {
      return false;
    }
  }

  function getCookie(name) {
    var m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return m ? decodeURIComponent(m[2]) : null;
  }

  function readUrlParams() {
    var out = {};
    try {
      var sp = new URLSearchParams(window.location.search);
      PARAM_KEYS.forEach(function (k) {
        var v = sp.get(k);
        if (v) out[k] = v.slice(0, 500);
      });
    } catch (e) {}
    return out;
  }

  function storedAttr() {
    try { return JSON.parse(localStorage.getItem('hy_attr') || 'null'); }
    catch (e) { return null; }
  }

  function capture() {
    try {
      if (!consentGranted()) { decorateAll(); return; }

      var aid = localStorage.getItem('hy_aid');
      if (!aid) {
        aid = (crypto.randomUUID && crypto.randomUUID()) || null;
        if (!aid) { decorateAll(); return; }
        localStorage.setItem('hy_aid', aid);
      }

      // First touch only: if attribution already stored, never overwrite, never re-POST.
      if (storedAttr()) { decorateAll(); return; }

      var p = readUrlParams();
      // No campaign signal in the URL -> nothing to record (GA4 covers organic).
      if (!p.utm_source && !p.fbclid && !p.gclid) { decorateAll(); return; }

      var fbp = getCookie('_fbp');
      var fbc = getCookie('_fbc');
      if (!fbc && p.fbclid) fbc = 'fb.1.' + Date.now() + '.' + p.fbclid;

      var attr = {};
      PARAM_KEYS.forEach(function (k) { if (p[k]) attr[k] = p[k]; });
      if (fbp) attr.fbp = fbp;
      if (fbc) attr.fbc = fbc;
      attr.landing_page = window.location.pathname;
      var ref = (document.referrer || '').slice(0, 500);
      if (ref) attr.referrer = ref;
      attr.captured_at = new Date().toISOString();

      localStorage.setItem('hy_attr', JSON.stringify(attr));

      var body = { anon_id: aid };
      Object.keys(attr).forEach(function (k) {
        if (k !== 'captured_at') body[k] = attr[k];
      });

      fetch(CAPTURE_URL, {
        method: 'POST',
        keepalive: true,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      }).catch(function () {});

      decorateAll();
    } catch (e) { /* attribution must never break the page */ }
  }

  function decorate(link) {
    try {
      var url = new URL(link.href, window.location.origin);
      if (url.hostname !== APP_HOST) return;

      var granted = consentGranted();
      var attr = granted ? storedAttr() : null;
      var live = readUrlParams();

      if (granted) {
        var aid = localStorage.getItem('hy_aid');
        if (aid) url.searchParams.set('hy_aid', aid);
      }

      // Prefer stored first-touch values; fall back to current-URL values.
      var source = attr || live;
      PARAM_KEYS.forEach(function (k) {
        if (source[k]) url.searchParams.set(k, source[k]);
      });
      if (attr && attr.fbc) url.searchParams.set('fbc', attr.fbc);
      if (attr && attr.fbp) url.searchParams.set('fbp', attr.fbp);

      link.href = url.toString();
    } catch (e) {}
  }

  function decorateAll() {
    try {
      document.querySelectorAll('a[href]').forEach(decorate);
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', capture);
  } else {
    capture();
  }

  // Late-injected links: re-decorate the specific link just before navigation.
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (a) decorate(a);
  }, true);

  window.heirlyAttribution = { capture: capture };
})();

/*! SignFlow Demo Analytics — PostHog, prospect demo ONLY
 *
 *  SCOPE: jgarcia98x/signflow-demo. This file must never be added to
 *  jgarcia98x/signflow-mockups (Peter's copy). He is a real pilot user
 *  running his own shop's data, not a tracked prospect.
 *
 *  INERT BY DEFAULT. With no project key configured this file loads,
 *  does nothing, transmits nothing, and adds no network requests. That
 *  is the intended state until Jordan approves the PostHog account and
 *  supplies a key (Gatehouse pmt4j5ifr).
 *
 *  HONEST TOOLING: every event here corresponds to something a real
 *  visitor actually did. No synthetic events, no inferred engagement
 *  scores, no invented "interest" metrics. Dwell time is measured from
 *  real timestamps and is reported as-is, including when it is zero.
 *
 *  PRIVACY POSTURE (deliberate, see the proposal):
 *    - autocapture OFF   — we record navigation, not every DOM click
 *    - maskAllInputs ON  — no keystrokes captured in replay
 *    - no cross-site cookies; PostHog default localStorage only
 *  A prospect is a person who did not ask to be recorded. Keep this
 *  narrow.
 */
(function (global) {
  'use strict';

  // ── Configuration ────────────────────────────────────────────────
  // Set SF_ANALYTICS.key to the PostHog project key to activate.
  // host: 'https://eu.i.posthog.com' for EU cloud, 'https://us.i.posthog.com' for US.
  // Region must match the account's region or events silently 404.
  var CFG = global.SF_ANALYTICS || {};
  var KEY  = (CFG.key  || '').trim();
  var HOST = (CFG.host || 'https://eu.i.posthog.com').replace(/\/+$/, '');

  // ── Inert path ───────────────────────────────────────────────────
  if (!KEY) {
    // Expose a no-op so callers never need to feature-check.
    global.SFAnalytics = {
      enabled: false,
      capture: function () {},
      reason: 'no project key configured',
    };
    return;
  }

  // Never phone home from a local file:// or from Peter's domain, even
  // if this file is somehow copied there. Defense against the exact
  // cross-repo cp mistake that has bitten this project before.
  var HOSTNAME = location.hostname;
  var BLOCKED = /signflow-mockups/i.test(location.pathname) ||
                location.protocol === 'file:';
  if (BLOCKED) {
    global.SFAnalytics = {
      enabled: false,
      capture: function () {},
      reason: 'blocked context (mockups path or file://)',
    };
    return;
  }

  // ── PostHog snippet (official, trimmed) ──────────────────────────
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people set set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  // ── Shared properties ────────────────────────────────────────────
  var params  = new URLSearchParams(location.search);
  var demoFor = (params.get('demo') || '').trim();

  // Page identity from the filename, so events group cleanly.
  var FILE = (location.pathname.split('/').pop() || 'index.html')
             .replace(/\?.*$/, '') || 'index.html';
  var PAGE_NAMES = {
    'index.html':     'Pipeline',
    'schedule.html':  'Schedule',
    'customers.html': 'Customers',
    'jobs.html':      'Jobs & Reports',
    'reports.html':   'Reports',
    'settings.html':  'Settings',
  };
  var PAGE = PAGE_NAMES[FILE] || FILE;

  posthog.init(KEY, {
    api_host: HOST,
    autocapture: false,        // navigation only, not every click
    capture_pageview: false,   // we send our own, with demo properties
    disable_session_recording: CFG.replay === false,
    session_recording: { maskAllInputs: true },
    persistence: 'localStorage',
    // Passthrough hook. PostHog calls this for every outgoing event, so it
    // is the honest place to observe what actually gets sent - both for
    // automated verification and for debugging a live key without
    // guessing at the wire protocol. It never modifies the event.
    before_send: function (event) {
      try {
        (global.__SF_SENT || (global.__SF_SENT = [])).push({
          event: event && event.event,
          props: (event && event.properties) || {},
        });
      } catch (_) {}
      return event;
    },
  });

  // demo= identifies WHICH prospect. Registered as a super property so
  // every subsequent event carries it without re-plumbing each call.
  posthog.register({
    demo_company: demoFor || '(none)',
    is_personalised: !!demoFor,
  });

  function capture(event, props) {
    try {
      posthog.capture(event, Object.assign({ page: PAGE, file: FILE }, props || {}));
    } catch (_) { /* analytics must never break the demo */ }
  }

  // ── 1. Pageview ──────────────────────────────────────────────────
  capture('demo_pageview', {
    referrer: document.referrer || '(direct)',
    viewport_w: window.innerWidth,
    // Coarse pointer is the honest signal for "is this a phone/tablet",
    // width alone misreads a small laptop window.
    coarse_pointer: window.matchMedia('(pointer:coarse)').matches,
  });

  // ── 2. Tab navigation ────────────────────────────────────────────
  // Which tab they clicked TO. Drop-off is derived downstream from the
  // absence of a following pageview — we do not guess it here.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('nav a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.startsWith('#')) return;   // same-page tab, not a navigation
    capture('demo_tab_click', {
      to_href: href.split('?')[0],
      to_label: (a.textContent || '').trim(),
      from_page: PAGE,
    });
  }, true);

  // ── 3. Dwell time ────────────────────────────────────────────────
  // Real elapsed visible time, accumulated across tab-away periods so a
  // backgrounded tab does not inflate attention. Sent once on exit via
  // sendBeacon (PostHog handles this internally on capture).
  var visibleMs = 0;
  var since = document.visibilityState === 'visible' ? Date.now() : null;

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      since = Date.now();
    } else if (since) {
      visibleMs += Date.now() - since;
      since = null;
    }
  });

  var sentExit = false;
  function sendExit() {
    if (sentExit) return;
    sentExit = true;
    if (since) { visibleMs += Date.now() - since; since = null; }
    capture('demo_page_exit', {
      visible_seconds: Math.round(visibleMs / 1000),
      max_scroll_pct: maxScrollPct(),
    });
  }

  // pagehide is the reliable one on iOS Safari; unload does not fire there.
  window.addEventListener('pagehide', sendExit);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') sendExit();
  });

  // ── 4. Scroll depth ──────────────────────────────────────────────
  // This app scrolls in inner panes as well as the window, so measure
  // whichever actually moved. Reported only at exit, as a real maximum.
  var maxPct = 0;
  function maxScrollPct() { return maxPct; }

  function trackScroll(el) {
    var sh = el.scrollHeight, ch = el.clientHeight;
    if (sh <= ch) return;                       // nothing scrollable
    var pct = Math.round(((el.scrollTop + ch) / sh) * 100);
    if (pct > maxPct) maxPct = Math.min(pct, 100);
  }

  window.addEventListener('scroll', function () {
    var de = document.documentElement;
    if (de.scrollHeight > de.clientHeight) trackScroll(de);
  }, { passive: true });

  document.addEventListener('scroll', function (e) {
    var t = e.target;
    if (t && t.nodeType === 1 && t !== document.documentElement) trackScroll(t);
  }, { passive: true, capture: true });

  // ── Public surface ───────────────────────────────────────────────
  global.SFAnalytics = {
    enabled: true,
    capture: capture,
    demoCompany: demoFor || null,
    page: PAGE,
  };
})(window);

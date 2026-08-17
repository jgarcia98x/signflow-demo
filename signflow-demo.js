/*! SignFlow Demo Guard
 *  ?demo=Company+Name → personalised banner + watermark
 *  Mobile: collapsible filters, centered pills, customer cards, zoom on wide content
 */
(function () {
  'use strict';

  var params  = new URLSearchParams(window.location.search);
  var demoFor = (params.get('demo') || '').trim();
  var PATH    = window.location.pathname;
  var isPhone = window.innerWidth < 700;
  var isTouch = window.matchMedia('(pointer:coarse)').matches;

  /* ── 1. Propagate ?demo= across internal links ──────────────────── */
  if (demoFor) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http')) return;
      try {
        var url = new URL(href, window.location.href);
        if (!url.searchParams.get('demo')) {
          url.searchParams.set('demo', demoFor);
          a.setAttribute('href', url.pathname + url.search);
        }
      } catch (_) {}
    });
  }

  /* ── 2. Lock native pinch-zoom so our gesture owns it ───────────── */
  var vp = document.querySelector('meta[name=viewport]');
  if (vp) vp.setAttribute('content',
    'width=device-width, initial-scale=1.0, maximum-scale=1.0, ' +
    'user-scalable=no, viewport-fit=cover');

  /* ── 3. Styles ──────────────────────────────────────────────────── */
  var style = document.createElement('style');
  style.textContent = [
    /* --- Watermark. Rotate the CHILDREN, not the container.
           Rotating #sf-wm itself inflated its bounding box to 656px
           and was a direct cause of horizontal page overflow. --- */
    '#sf-wm{position:fixed;inset:0;width:100vw;height:100vh;',
    'pointer-events:none;z-index:99998;overflow:hidden;opacity:.045}',
    '.sf-wm-r{position:absolute;white-space:nowrap;left:50%;top:0;',
    'transform:translateX(-50%) rotate(-28deg);transform-origin:50% 50%}',
    '.sf-wm-r span{font-family:-apple-system,sans-serif;font-size:18px;',
    'font-weight:700;letter-spacing:.18em;color:#fff;',
    'user-select:none;-webkit-user-select:none}',

    /* --- Kill horizontal overflow at the root.
           body{overflow-x:hidden} alone was insufficient because the
           overflow was reported on documentElement. --- */
    'html{overflow-x:hidden!important;max-width:100%}',
    'body{overflow-x:hidden!important;max-width:100%}',

    /* --- Off-canvas panels were overflowing the page on phones --- */
    '@media(max-width:1024px){',
    '  .ai-panel,#rp-panel,#detail-panel{max-width:100vw!important}',
    '  .ai-panel:not(.open):not(.visible),',
    '  #rp-panel:not(.open):not(.visible){',
    '    transform:translateX(110%)!important;pointer-events:none}',
    '}',

    /* --- Filter pills: proper vertical centering.
           Root cause of "words at the top": display:block + min-height:44px
           with no flex centering. Only index.html had the flex fix. --- */
    '.filter-pill{',
    '  display:inline-flex!important;align-items:center!important;',
    '  justify-content:center!important;line-height:1!important;',
    '  padding-top:0!important;padding-bottom:0!important;',
    '  box-sizing:border-box}',
    '@media(max-width:1024px){',
    '  .filter-pill{min-height:40px!important;padding:0 14px!important}',
    '}',

    /* --- Collapsible filter tray (one clean Filters button) --- */
    '#sf-ftoggle{',
    '  display:none;align-items:center;gap:7px;',
    '  background:rgba(255,255,255,.07);color:#fff;',
    '  border:1px solid rgba(255,255,255,.18);border-radius:9px;',
    '  font-family:-apple-system,sans-serif;font-size:13px;font-weight:600;',
    '  padding:0 14px;height:40px;cursor:pointer;flex-shrink:0;',
    '  -webkit-tap-highlight-color:transparent;touch-action:manipulation}',
    '#sf-ftoggle:active{background:rgba(255,255,255,.13)}',
    '#sf-ftoggle .cnt{',
    '  background:#d32f2f;color:#fff;border-radius:9px;',
    '  font-size:11px;font-weight:700;padding:1px 6px;min-width:17px;text-align:center}',
    '#sf-ftoggle .chev{',
    '  font-size:10px;opacity:.65;transition:transform .18s ease}',
    '#sf-ftoggle.collapsed .chev{transform:rotate(-90deg)}',
    '@media(max-width:1024px){#sf-ftoggle{display:inline-flex}}',
    '.sf-ftray{',
    '  display:flex;flex-wrap:wrap;gap:6px;',
    '  overflow:hidden;transition:max-height .22s ease,opacity .18s ease,margin .22s ease;',
    '  max-height:400px;opacity:1}',
    '.sf-ftray.collapsed{max-height:0!important;opacity:0;margin:0!important}',

    /* --- Customers: a 6-col grid at 390px = ~59px/col. Unreadable at
           any zoom. Stack into cards on phones instead. --- */
    '@media(max-width:700px){',
    '  .cust-table-head{display:none!important}',
    '  .cust-table{border:none!important;background:none!important;',
    '    box-shadow:none!important;overflow:visible!important;',
    '    backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
    '  .cust-row{',
    '    display:block!important;',
    '    background:rgba(255,255,255,.045)!important;',
    '    border:1px solid rgba(255,255,255,.1)!important;',
    '    border-radius:12px!important;',
    '    padding:13px 15px!important;margin-bottom:9px!important;',
    '    position:relative}',
    '  .cust-row.highlighted{',
    '    border-color:rgba(211,47,47,.45)!important;',
    '    background:rgba(211,47,47,.07)!important}',
    '  .cust-identity{margin-bottom:9px!important;padding-right:76px}',
    '  .cust-name{font-size:15px!important;font-weight:700!important;line-height:1.25}',
    '  .cust-company{font-size:12px!important;opacity:.6}',
    /*  Label the values that lost their column headers */
    '  .cust-trade{font-size:12.5px!important;opacity:.85;margin-bottom:7px!important}',
    '  .cust-trade:before{content:"Trade · ";opacity:.45;font-weight:600}',
    '  .cust-row>.cust-date{',
    '    display:inline-block!important;font-size:12px!important;',
    '    opacity:.75;margin:0 14px 7px 0!important}',
    '  .cust-row>.cust-date:nth-of-type(1):before{',
    '    content:"Last · ";opacity:.45;font-weight:600}',
    '  .cust-row>.cust-date:nth-of-type(2):before{',
    '    content:"Next · ";opacity:.45;font-weight:600}',
    '  .cust-row .status-badge{font-size:11px!important}',
    /*  Contact buttons pinned top-right, thumb-sized */
    '  .contact-btns{',
    '    position:absolute!important;top:11px;right:13px;',
    '    display:flex!important;gap:5px!important}',
    '  .contact-btn{',
    '    width:34px!important;height:34px!important;',
    '    display:flex!important;align-items:center;justify-content:center;',
    '    font-size:15px!important;border-radius:9px!important;',
    '    background:rgba(255,255,255,.09)!important}',
    '}',

    /* --- Banner. Was covering the stats bar (measured 390x47px overlap).
           Slimmer, and we pad the page bottom to compensate. --- */
    '#sf-banner{position:fixed;bottom:0;left:0;right:0;z-index:99999;',
    'background:rgba(15,15,20,.94);backdrop-filter:blur(8px);',
    '-webkit-backdrop-filter:blur(8px);',
    'border-top:1px solid rgba(211,47,47,.5);',
    'padding:5px 16px calc(5px + env(safe-area-inset-bottom,0px));',
    'display:flex;align-items:center;gap:8px;',
    'font-family:-apple-system,sans-serif;font-size:11px;pointer-events:none}',
    '#sf-banner .dot{width:6px;height:6px;border-radius:50%;',
    'background:#d32f2f;flex-shrink:0;animation:sfp 2s ease-in-out infinite}',
    '#sf-banner .lbl{color:rgba(255,255,255,.5);text-transform:uppercase;',
    'letter-spacing:.07em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#sf-banner .nm{color:#fff;font-weight:600;white-space:nowrap}',
    '#sf-banner .note{margin-left:auto;color:rgba(255,255,255,.28);',
    'font-size:10px;white-space:nowrap}',
    '@media(max-width:700px){#sf-banner .note{display:none}}',
    '@keyframes sfp{0%,100%{opacity:1}50%{opacity:.35}}',

    /* --- THE Customers bug. .main-content becomes a column flex on mobile;
           .list-pane has flex:1 while .ai-sidebar (CREW & VENDOR) claims
           max-height:45vh. Result: the customer list collapses to a sliver
           and the crew panel appears to "cover" it. Let content define
           height and let the PAGE scroll, not two fighting panes. --- */
    '@media(max-width:700px){',
    '  .main-content{',
    '    flex-direction:column!important;',
    '    overflow:visible!important;height:auto!important;',
    '    display:block!important}',
    '  .list-pane{',
    '    flex:none!important;overflow:visible!important;',
    '    max-height:none!important;height:auto!important;',
    '    display:block!important;padding:14px 14px 8px!important}',
    '  .board-wrap{max-height:none!important}',
    '  .ai-sidebar{',
    '    flex:none!important;width:100%!important;',
    '    max-height:none!important;height:auto!important;',
    '    overflow:visible!important;',
    '    border-left:none!important;',
    '    border-top:1px solid rgba(255,255,255,.12)!important}',
    /*  Collapse the crew/vendor panel by default so the primary content
        (customers / pipeline) owns the first screen. */
    '  .ai-sidebar.sf-collapsed>*:not(.sf-aitoggle){display:none!important}',
    '  .sf-aitoggle{',
    '    display:flex!important;align-items:center;gap:8px;width:100%;',
    '    background:none;border:none;color:#fff;',
    '    font-family:-apple-system,sans-serif;font-size:12px;font-weight:700;',
    '    text-transform:uppercase;letter-spacing:.07em;',
    '    padding:14px 4px;cursor:pointer;',
    '    -webkit-tap-highlight-color:transparent}',
    '  .sf-aitoggle .chev{margin-left:auto;opacity:.6;font-size:11px;',
    '    transition:transform .18s}',
    '  .ai-sidebar:not(.sf-collapsed) .sf-aitoggle .chev{transform:rotate(180deg)}',
    '}',
    '.sf-aitoggle{display:none}',

    /* --- reports.html has NO mobile nav styling of its own (its media
           query only handles tables), so the nav collapsed to 89px and
           collided with the sub-bar. Supply the same treatment the other
           pages get. --- */
    '@media(max-width:1024px){',
    '  header{flex-wrap:wrap!important;height:auto!important;',
    '    padding:10px 14px 0!important;gap:8px!important}',
    '  nav{width:100%!important;overflow-x:auto!important;',
    '    -webkit-overflow-scrolling:touch;display:flex!important;',
    '    border-top:1px solid rgba(255,255,255,.08);',
    '    scrollbar-width:none}',
    '  nav::-webkit-scrollbar{display:none}',
    '  nav a{flex-shrink:0!important;white-space:nowrap}',
    '  .sub-bar{flex-wrap:wrap!important;row-gap:8px}',
    '  .time-tabs{flex-wrap:wrap}',
    '  .date-chip,.header-sep{display:none!important}',
    '}',

    /* --- Zoom pill --- */
    '#sf-zpill{position:fixed;left:50%;transform:translateX(-50%);',
    '  bottom:calc(46px + env(safe-area-inset-bottom,0px));',
    '  z-index:9990;display:none;align-items:center;',
    '  background:rgba(12,10,10,.95);',
    '  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);',
    '  border:1px solid rgba(255,255,255,.18);',
    '  border-radius:28px;overflow:hidden;',
    '  box-shadow:0 4px 24px rgba(0,0,0,.7)}',
    '#sf-zpill.visible{display:flex}',
    /* Docked (phone) variant — inline under the board, never overlapping */
    '@media(max-width:700px){',
    '  #sf-zpill.visible{display:inline-flex;position:static!important;',
    '    transform:none!important}',
    '}',
    '#sf-zpill button{background:none;border:none;color:#fff;',
    '  font-size:23px;line-height:1;width:54px;height:48px;',
    '  display:flex;align-items:center;justify-content:center;',
    '  cursor:pointer;-webkit-tap-highlight-color:transparent;',
    '  touch-action:manipulation;transition:opacity .12s}',
    '#sf-zpill button:active{background:rgba(255,255,255,.1)}',
    '#sf-zlbl{font-family:-apple-system,sans-serif;font-size:12.5px;',
    '  font-weight:700;color:rgba(255,255,255,.8);letter-spacing:.04em;',
    '  min-width:54px;text-align:center;',
    '  border-left:1px solid rgba(255,255,255,.12);',
    '  border-right:1px solid rgba(255,255,255,.12)}',
  ].join('');
  document.head.appendChild(style);

  /* ── 4. Collapsible filter tray ─────────────────────────────────── */
  function initFilters() {
    var tray = document.querySelector('.filter-pills');
    if (!tray) return;
    tray.classList.add('sf-ftray');

    var btn = document.createElement('button');
    btn.id = 'sf-ftoggle';
    btn.setAttribute('aria-expanded', 'true');

    function activeCount() {
      var n = tray.querySelectorAll('.filter-pill.active').length;
      /* "All" selected is not a meaningful filter */
      var allPill = tray.querySelector('.filter-pill.active');
      if (n === 1 && allPill && /^all\b/i.test(allPill.textContent.trim())) return 0;
      return n;
    }
    function paint() {
      var n = activeCount();
      btn.innerHTML = '<span>Filters</span>' +
        (n ? '<span class="cnt">' + n + '</span>' : '') +
        '<span class="chev">▾</span>';
    }
    paint();

    /* Expanded by default (per requirement) */
    btn.addEventListener('click', function () {
      var collapsed = tray.classList.toggle('collapsed');
      btn.classList.toggle('collapsed', collapsed);
      btn.setAttribute('aria-expanded', String(!collapsed));
    });
    tray.addEventListener('click', function (e) {
      if (e.target.closest('.filter-pill')) setTimeout(paint, 30);
    });

    tray.parentNode.insertBefore(btn, tray);
  }

  /* ── 4b. Collapse the crew/vendor sidebar on phones ─────────────── */
  function initAiPanel() {
    if (!isPhone) return;
    var sb = document.querySelector('.ai-sidebar');
    if (!sb) return;

    /* Reuse the panel's own heading text if it has one */
    var head = sb.querySelector('.ai-title,.sidebar-title,.section-label,h2,h3');
    var text = head ? head.textContent.trim() : 'Crew & Vendor Availability';

    var t = document.createElement('button');
    t.className = 'sf-aitoggle';
    t.innerHTML = '<span>' + esc(text) + '</span><span class="chev">▾</span>';
    sb.insertBefore(t, sb.firstChild);
    sb.classList.add('sf-collapsed');
    t.addEventListener('click', function () { sb.classList.toggle('sf-collapsed'); });
  }

  /* ── 5. Zoom (touch, wide content only) ─────────────────────────── */
  /*
   * transform:scale + negative margin. CSS `zoom` does not shrink
   * scrollWidth in mobile Safari, so the container kept scrolling as if
   * unzoomed. The negative margin collapses the leftover layout space so
   * the scroll container reports the true scaled size.
   */
  function initZoom() {
    if (!isTouch) return;

    var el, wrap, pad = 0;

    if (PATH.indexOf('schedule') !== -1) {
      el   = document.querySelector('.schedule-grid');
      wrap = document.querySelector('.schedule-wrap');
    } else if (PATH.indexOf('customers') !== -1) {
      /* Phones use stacked cards — zooming a card list is pointless */
      if (isPhone) return;
      el   = document.querySelector('.cust-table');
      wrap = document.querySelector('.list-pane');
    } else {
      el   = document.querySelector('.board');
      wrap = document.querySelector('.board-wrap');
      if (wrap) wrap.style.scrollSnapType = 'none';
    }
    if (!el || !wrap) return;

    /* Wrap padding must be subtracted or the fit is short by 2x padding
       (measured: pipeline was overflowing by exactly 25px = 2x14px - 3). */
    var wcs = getComputedStyle(wrap);
    pad = (parseFloat(wcs.paddingLeft) || 0) + (parseFloat(wcs.paddingRight) || 0);

    /* MIN was 0.20 but the pipeline needs 0.195 to fit all 7 columns on a
       390px phone — the clamp itself was the last 6px of scroll. */
    var STEP = 0.08, MIN = 0.14, MAX = 1;
    var LS = 'sf_bz6_' + PATH.replace(/\W/g, ''), LSV = LS + '_vpw';
    var vpw = window.innerWidth, nat = { w: 1, h: 1 }, z = 1;

    function measure() {
      el.style.transform = ''; el.style.marginRight = ''; el.style.marginBottom = '';
      nat.w = el.scrollWidth || el.offsetWidth || 1;
      nat.h = el.scrollHeight || el.offsetHeight || 1;
    }
    function calcDefault() {
      /* -2px safety: rounding zoom UP to 2dp can re-introduce a few px of
         scroll (measured 6px left over after the padding fix). */
      var avail = vpw - pad - 2;
      var raw = isPhone ? (avail / nat.w) : ((avail * 0.8) / (nat.w / 7 * 2.5));
      return Math.max(MIN, Math.min(MAX, Math.floor(raw * 100) / 100));
    }

    var pill   = document.createElement('div'); pill.id = 'sf-zpill';
    var btnOut = document.createElement('button');
    btnOut.textContent = '−'; btnOut.setAttribute('aria-label', 'Zoom out');
    var lbl = document.createElement('span'); lbl.id = 'sf-zlbl';
    var btnIn = document.createElement('button');
    btnIn.textContent = '+'; btnIn.setAttribute('aria-label', 'Zoom in');
    pill.append(btnOut, lbl, btnIn);
    document.body.appendChild(pill);

    /* The pill floated ON TOP of the board columns, obscuring cards.
       Don't float it at all on phones — dock it inline directly beneath
       the board so it can never cover content. */
    if (isPhone) {
      pill.style.position = 'static';
      pill.style.transform = 'none';
      pill.style.margin = '10px auto 2px';
      pill.style.bottom = 'auto';
      if (wrap.parentNode) wrap.parentNode.insertBefore(pill, wrap.nextSibling);
    } else {
      requestAnimationFrame(function () {
        var below = 8;
        var bn = document.getElementById('sf-banner');
        if (bn) below += bn.offsetHeight;
        pill.style.bottom = 'calc(' + below + 'px + env(safe-area-inset-bottom,0px))';
      });
    }

    function apply(v) {
      z = Math.round(Math.min(MAX, Math.max(MIN, v)) * 100) / 100;
      el.style.transformOrigin = '0 0';
      el.style.transform    = 'scale(' + z + ')';
      el.style.marginRight  = -(nat.w * (1 - z)) + 'px';
      el.style.marginBottom = -(nat.h * (1 - z)) + 'px';
      localStorage.setItem(LS, z); localStorage.setItem(LSV, vpw);
      btnOut.style.opacity = z <= MIN + .01 ? '.28' : '1';
      btnIn.style.opacity  = z >= MAX - .01 ? '.28' : '1';
      lbl.textContent = z <= MIN + .05 ? 'All' : Math.round(z * 100) + '%';
    }
    btnOut.addEventListener('click', function () { apply(z - STEP); });
    btnIn .addEventListener('click', function () { apply(z + STEP); });

    var p0 = null, pz = null;
    function dist(t) {
      var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
    wrap.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) { p0 = dist(e.touches); pz = z; }
    }, { passive: true });
    wrap.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2 && p0) { e.preventDefault(); apply(pz * (dist(e.touches) / p0)); }
    }, { passive: false });
    wrap.addEventListener('touchend', function (e) {
      if (e.touches.length < 2) { p0 = pz = null; }
    }, { passive: true });

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        measure();
        var s = parseFloat(localStorage.getItem(LS));
        var sv = parseFloat(localStorage.getItem(LSV));
        z = (s && Math.abs(sv - vpw) < 40) ? Math.min(MAX, Math.max(MIN, s)) : calcDefault();
        apply(z);
        pill.classList.add('visible');
      });
    });
    window.addEventListener('orientationchange', function () {
      setTimeout(function () {
        vpw = window.innerWidth; isPhone = vpw < 700;
        measure(); apply(calcDefault());
      }, 400);
    });
  }

  /* ── 6. Schedule skeletons ──────────────────────────────────────── */
  function skeletonize() {
    if (PATH.indexOf('schedule') === -1) return;
    var sk = document.createElement('style');
    sk.textContent =
      '@keyframes sfsh{0%{background-position:-400px 0}100%{background-position:400px 0}}' +
      '.sfskel{border-radius:4px;background:linear-gradient(90deg,' +
      'rgba(255,255,255,.06) 25%,rgba(255,255,255,.14) 50%,rgba(255,255,255,.06) 75%);' +
      'background-size:800px 100%;animation:sfsh 1.6s infinite linear}' +
      '.sfsk-n{height:11px;width:72%;margin-bottom:6px}' +
      '.sfsk-d{height:9px;width:54%;margin-bottom:5px}' +
      '.sfsk-t{height:8px;width:40%}';
    document.head.appendChild(sk);
    document.querySelectorAll('.job-block').forEach(function (b) {
      b.style.opacity = '.65';
      b.innerHTML = '<div class="sfskel sfsk-n"></div>' +
                    '<div class="sfskel sfsk-d"></div>' +
                    '<div class="sfskel sfsk-t"></div>';
    });
    var ai = document.querySelector('.sched-ai,.ai-schedule-note,.schedule-insight');
    if (ai) ai.innerHTML = '<span style="color:rgba(255,255,255,.35);font-size:12px">' +
      '✦ Schedule loads once your jobs are in the system</span>';
  }

  function esc(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }

  /* ── Init ───────────────────────────────────────────────────────── */
  function inject() {
    var wm = document.createElement('div'); wm.id = 'sf-wm';
    var label = demoFor ? 'CONFIDENTIAL · ' + demoFor.toUpperCase() : 'CONFIDENTIAL DEMO';
    var tile = (label + '          ').repeat(6), html = '';
    for (var i = 0; i < 16; i++)
      html += '<div class="sf-wm-r" style="top:' + (i * 78) + 'px"><span>' + tile + '</span></div>';
    wm.innerHTML = html;
    document.body.appendChild(wm);

    initFilters();
    initAiPanel();
    initZoom();
    skeletonize();

    if (demoFor) {
      var banner = document.createElement('div'); banner.id = 'sf-banner';
      banner.innerHTML = '<div class="dot"></div>' +
        '<span class="lbl">Confidential demo · Prepared for</span>' +
        '<span class="nm">' + esc(demoFor) + '</span>' +
        '<span class="note">Not for distribution</span>';
      document.body.appendChild(banner);
      /* Reserve space so the fixed banner stops covering the stats bar */
      requestAnimationFrame(function () {
        var h = banner.offsetHeight || 28;
        document.body.style.paddingBottom = h + 'px';
      });
      document.querySelectorAll('.stats-meta').forEach(function (el) {
        if (el.textContent.indexOf('Apex Build Co') !== -1)
          el.textContent = el.textContent.replace('Apex Build Co', 'Demo for ' + demoFor);
      });
    }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', inject)
    : inject();
})();

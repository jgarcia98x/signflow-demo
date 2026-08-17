/*! SignFlow Demo Guard
 *  ?demo=Company+Name → personalised banner + watermark
 *  Touch: custom pinch-to-zoom on wide content (pipeline, schedule, customers)
 */
(function () {
  'use strict';

  /* ── 1. Parse ?demo= param ─────────────────────────────────────── */
  var params  = new URLSearchParams(window.location.search);
  var demoFor = (params.get('demo') || '').trim();

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

  /* ── 2. Disable native pinch-zoom so our gesture takes over ─────── */
  var vp = document.querySelector('meta[name=viewport]');
  if (vp) vp.setAttribute('content',
    'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');

  /* ── 3. Shared styles ───────────────────────────────────────────── */
  var style = document.createElement('style');
  style.textContent = [
    /* Watermark */
    '#sf-wm{position:fixed;top:0;left:0;width:100vw;height:100vh;',
    'pointer-events:none;z-index:99998;overflow:hidden;',
    'transform:rotate(-28deg);transform-origin:50% 50%;opacity:0.045}',
    '.sf-wm-r{position:absolute;white-space:nowrap;left:-60%;width:220%}',
    '.sf-wm-r span{font-family:-apple-system,sans-serif;font-size:18px;',
    'font-weight:700;letter-spacing:.18em;color:#fff;',
    'user-select:none;-webkit-user-select:none}',
    /* Banner */
    '#sf-banner{position:fixed;bottom:0;left:0;right:0;z-index:99999;',
    'background:rgba(15,15,20,.92);backdrop-filter:blur(8px);',
    '-webkit-backdrop-filter:blur(8px);',
    'border-top:1px solid rgba(211,47,47,.5);padding:8px 20px;',
    'display:flex;align-items:center;gap:10px;',
    'font-family:-apple-system,sans-serif;font-size:12px;pointer-events:none}',
    '#sf-banner .dot{width:7px;height:7px;border-radius:50%;',
    'background:#d32f2f;flex-shrink:0;animation:sfp 2s ease-in-out infinite}',
    '#sf-banner .lbl{color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.08em}',
    '#sf-banner .nm{color:#fff;font-weight:600}',
    '#sf-banner .note{margin-left:auto;color:rgba(255,255,255,.3);font-size:11px}',
    '@keyframes sfp{0%,100%{opacity:1}50%{opacity:.35}}',
    /* Zoom pill — fixed to viewport, safe-area-aware */
    '#sf-zpill{',
    '  position:fixed;',
    '  left:50%;',
    '  transform:translateX(-50%);',
    '  bottom:calc(80px + env(safe-area-inset-bottom, 0px));',
    '  z-index:9990;',
    '  display:none;',    /* hidden until initBoardZoom confirms touch+target found */
    '  align-items:center;',
    '  background:rgba(12,10,10,.94);',
    '  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);',
    '  border:1px solid rgba(255,255,255,.18);',
    '  border-radius:28px;overflow:hidden;',
    '  box-shadow:0 4px 24px rgba(0,0,0,.7);}',
    '#sf-zpill.visible{display:flex}',
    '#sf-zpill button{background:none;border:none;color:#fff;',
    '  font-size:24px;line-height:1;width:56px;height:52px;',
    '  display:flex;align-items:center;justify-content:center;',
    '  cursor:pointer;-webkit-tap-highlight-color:transparent;',
    '  touch-action:manipulation;transition:opacity .12s}',
    '#sf-zpill button:active{background:rgba(255,255,255,.1)}',
    '#sf-zlbl{font-family:-apple-system,sans-serif;font-size:13px;font-weight:700;',
    '  color:rgba(255,255,255,.8);letter-spacing:.04em;',
    '  min-width:56px;text-align:center;',
    '  border-left:1px solid rgba(255,255,255,.12);',
    '  border-right:1px solid rgba(255,255,255,.12)}',
  ].join('');
  document.head.appendChild(style);

  /* ── 4. Zoom implementation ─────────────────────────────────────── */
  /*
   * Why transform+margin and NOT css zoom:
   * CSS zoom does NOT affect scrollWidth on mobile Safari — the scroll
   * container keeps reporting the pre-zoom natural size, so the board
   * still scrolls as if unzoomed. transform:scale has the same problem
   * but we can fix it: negative margin collapses the extra layout space
   * so the scroll container sees exactly the scaled dimensions.
   *
   *   marginRight  = -(naturalW * (1 - z))
   *   marginBottom = -(naturalH * (1 - z))
   *
   * This is the only approach that works reliably across Safari/Chrome/iOS.
   */
  function applyTransform(el, z, nw, nh) {
    el.style.transformOrigin = '0 0';
    el.style.transform       = 'scale(' + z + ')';
    el.style.marginRight     = -(nw * (1 - z)) + 'px';
    el.style.marginBottom    = -(nh * (1 - z)) + 'px';
    /* Don't touch minWidth or flexShrink — those break grid/flex children */
  }

  function resetTransform(el) {
    el.style.transform    = '';
    el.style.marginRight  = '';
    el.style.marginBottom = '';
  }

  function measure(el) {
    /* Reset any existing transform before measuring natural size */
    resetTransform(el);
    return { w: el.scrollWidth || el.offsetWidth || 1,
             h: el.scrollHeight || el.offsetHeight || 1 };
  }

  function initBoardZoom() {
    if (!window.matchMedia('(pointer:coarse)').matches) return;

    /* ── Detect content element + scroll wrapper per page ─────── */
    var el, wrap;
    var path = window.location.pathname;

    if (path.indexOf('schedule') !== -1) {
      el   = document.querySelector('.schedule-grid');
      wrap = document.querySelector('.schedule-wrap');
    } else if (path.indexOf('customers') !== -1) {
      /* Customers table: make list-pane scrollable, zoom the table */
      el   = document.querySelector('.cust-table');
      wrap = document.querySelector('.list-pane') ||
             document.querySelector('.main-content');
      if (wrap) {
        wrap.style.overflowX = 'auto';
        wrap.style.webkitOverflowScrolling = 'touch';
      }
    } else {
      /* Pipeline / default */
      el   = document.querySelector('.board');
      wrap = document.querySelector('.board-wrap');
      if (wrap) wrap.style.scrollSnapType = 'none';
    }

    if (!el || !wrap) return;

    /* ── Zoom state ────────────────────────────────────────────── */
    var STEP  = 0.08, MIN = 0.20, MAX = 1.0;
    var LS    = 'sf_bz5_' + path.replace(/\W/g,'');
    var LSV   = LS + '_vpw';
    var vpw   = window.innerWidth;
    var phone = vpw < 700;
    var nat   = { w: 1, h: 1 };  /* measured after layout */
    var z;

    function calcDefault() {
      /* Phone: fit the whole grid on screen.
         iPad: show ~2.5 columns comfortably. */
      return Math.round(Math.min(MAX, Math.max(MIN,
        phone ? (vpw / nat.w) : ((vpw * 0.80) / (nat.w / 7 * 2.5))
      )) * 100) / 100;
    }

    /* Pill */
    var pill   = document.createElement('div'); pill.id = 'sf-zpill';
    var btnOut = document.createElement('button');
    btnOut.textContent = '−'; btnOut.setAttribute('aria-label','Zoom out');
    var lbl = document.createElement('span'); lbl.id = 'sf-zlbl';
    var btnIn  = document.createElement('button');
    btnIn.textContent = '+'; btnIn.setAttribute('aria-label','Zoom in');
    pill.appendChild(btnOut); pill.appendChild(lbl); pill.appendChild(btnIn);
    document.body.appendChild(pill);

    function applyZoom(val) {
      z = Math.round(Math.min(MAX, Math.max(MIN, val)) * 100) / 100;
      applyTransform(el, z, nat.w, nat.h);
      localStorage.setItem(LS, z); localStorage.setItem(LSV, vpw);
      btnOut.style.opacity = z <= MIN + 0.01 ? '0.28' : '1';
      btnIn.style.opacity  = z >= MAX - 0.01 ? '0.28' : '1';
      lbl.textContent = z <= MIN + 0.05 ? 'All' : Math.round(z * 100) + '%';
    }

    btnOut.addEventListener('click', function () { applyZoom(z - STEP); });
    btnIn.addEventListener('click',  function () { applyZoom(z + STEP); });

    /* Pinch gesture on the scroll wrapper */
    var p0 = null, pz = null;
    function dist(t) {
      var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx*dx + dy*dy);
    }
    wrap.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) { p0 = dist(e.touches); pz = z; }
    }, { passive: true });
    wrap.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2 && p0 !== null) {
        e.preventDefault();
        applyZoom(pz * (dist(e.touches) / p0));
      }
    }, { passive: false });
    wrap.addEventListener('touchend', function (e) {
      if (e.touches.length < 2) { p0 = null; pz = null; }
    }, { passive: true });

    /* Measure + initialise after layout settles (double rAF) */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        nat = measure(el);   /* resets transform, measures real size */

        var saved   = parseFloat(localStorage.getItem(LS));
        var savedVpw= parseFloat(localStorage.getItem(LSV));
        z = (saved && Math.abs(savedVpw - vpw) < 40)
              ? Math.min(MAX, Math.max(MIN, saved))
              : calcDefault();

        applyZoom(z);
        pill.classList.add('visible');   /* show pill only once ready */
      });
    });

    /* Recompute on orientation change */
    window.addEventListener('orientationchange', function () {
      setTimeout(function () {
        vpw = window.innerWidth; phone = vpw < 700;
        nat = measure(el);
        applyZoom(calcDefault());
      }, 400);
    });
  }

  /* ── 5. Schedule skeleton cards ─────────────────────────────────── */
  function skeletonizeSchedule() {
    if (window.location.pathname.indexOf('schedule') === -1) return;
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
      b.style.opacity = '0.65';
      b.innerHTML = '<div class="sfskel sfsk-n"></div><div class="sfskel sfsk-d"></div><div class="sfskel sfsk-t"></div>';
    });
    var ai = document.querySelector('.sched-ai,.ai-schedule-note,.schedule-insight');
    if (ai) ai.innerHTML = '<span style="color:rgba(255,255,255,.35);font-size:12px">✦ Schedule loads once your jobs are in the system</span>';
  }

  /* ── Main inject ─────────────────────────────────────────────────── */
  function inject() {
    /* Watermark */
    var wm = document.createElement('div'); wm.id = 'sf-wm';
    var label = demoFor ? 'CONFIDENTIAL · ' + demoFor.toUpperCase() : 'CONFIDENTIAL DEMO';
    var tile  = (label + '          ').repeat(6);
    var html  = '';
    for (var i = 0; i < 14; i++)
      html += '<div class="sf-wm-r" style="margin-top:' + (i*80) + 'px"><span>' + tile + '</span></div>';
    wm.innerHTML = html;
    document.body.appendChild(wm);

    initBoardZoom();
    skeletonizeSchedule();

    /* Personalised banner */
    if (demoFor) {
      var banner = document.createElement('div'); banner.id = 'sf-banner';
      banner.innerHTML =
        '<div class="dot"></div>' +
        '<span class="lbl">Confidential demo &nbsp;·&nbsp; Prepared for</span>' +
        '<span class="nm">' + esc(demoFor) + '</span>' +
        '<span class="note">Not for distribution</span>';
      document.body.appendChild(banner);
      document.querySelectorAll('.stats-meta').forEach(function (el) {
        if (el.textContent.indexOf('Apex Build Co') !== -1)
          el.textContent = el.textContent.replace('Apex Build Co', 'Demo for ' + demoFor);
      });
    }
  }

  function esc(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', inject)
    : inject();

})();

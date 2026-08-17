/*! SignFlow Demo Guard
 *  ?demo=Company+Name → personalised banner + watermark
 *  Touch devices: custom pinch-to-zoom on pipeline board
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
      } catch (e) {}
    });
  }

  /* ── 2. Disable native pinch-zoom, keep single-finger scroll ───── */
  var vpMeta = document.querySelector('meta[name=viewport]');
  if (vpMeta) {
    vpMeta.setAttribute('content',
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  }

  /* ── 3. Shared styles ──────────────────────────────────────────── */
  var style = document.createElement('style');
  style.textContent = [
    /* Watermark */
    '#sf-wm{position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;',
    'z-index:99998;overflow:hidden;transform:rotate(-28deg);transform-origin:50% 50%;opacity:0.045;}',
    '.sf-wm-r{position:absolute;white-space:nowrap;left:-60%;width:220%;}',
    '.sf-wm-r span{font-family:-apple-system,sans-serif;font-size:18px;font-weight:700;',
    'letter-spacing:.18em;color:#fff;user-select:none;-webkit-user-select:none;}',
    /* Banner */
    '#sf-banner{position:fixed;bottom:0;left:0;right:0;z-index:99999;',
    'background:rgba(15,15,20,.92);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);',
    'border-top:1px solid rgba(211,47,47,.5);padding:8px 20px;',
    'display:flex;align-items:center;gap:10px;',
    'font-family:-apple-system,sans-serif;font-size:12px;pointer-events:none;}',
    '#sf-banner .dot{width:7px;height:7px;border-radius:50%;background:#d32f2f;flex-shrink:0;',
    'animation:sfp 2s ease-in-out infinite;}',
    '#sf-banner .lbl{color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.08em;}',
    '#sf-banner .nm{color:#fff;font-weight:600;}',
    '#sf-banner .note{margin-left:auto;color:rgba(255,255,255,.3);font-size:11px;}',
    '@keyframes sfp{0%,100%{opacity:1}50%{opacity:.35}}',
    /* Zoom pill */
    '#sf-zpill{position:fixed;bottom:64px;left:50%;transform:translateX(-50%);',
    'z-index:9990;display:flex;align-items:center;',
    'background:rgba(12,10,10,.93);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);',
    'border:1px solid rgba(255,255,255,.15);border-radius:26px;overflow:hidden;',
    'box-shadow:0 4px 20px rgba(0,0,0,.65);user-select:none;}',
    '#sf-zpill button{background:none;border:none;color:#fff;font-size:22px;line-height:1;',
    'width:52px;height:48px;display:flex;align-items:center;justify-content:center;',
    'cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;',
    'transition:opacity .12s;}',
    '#sf-zpill button:active{background:rgba(255,255,255,.09);}',
    '#sf-zlbl{font-family:-apple-system,sans-serif;font-size:12px;font-weight:700;',
    'color:rgba(255,255,255,.75);letter-spacing:.05em;min-width:50px;text-align:center;',
    'border-left:1px solid rgba(255,255,255,.1);border-right:1px solid rgba(255,255,255,.1);}',
  ].join('');
  document.head.appendChild(style);

  /* ── 4. Board zoom (touch only) ────────────────────────────────── */
  function initBoardZoom() {
    if (!window.matchMedia('(pointer:coarse)').matches) return;

    /* Detect the zoomable target + its scroll wrapper per page */
    var board, wrap;
    var path = window.location.pathname;

    if (path.indexOf('schedule') !== -1) {
      board = document.querySelector('.schedule-grid');
      wrap  = document.querySelector('.schedule-wrap');
    } else if (path.indexOf('customers') !== -1) {
      board = document.querySelector('.cust-table');
      wrap  = document.querySelector('.list-pane') ||
              document.querySelector('.main-content');
    } else {
      /* Pipeline (index.html) and any other page with a board */
      board = document.querySelector('.board');
      wrap  = document.querySelector('.board-wrap');
    }

    if (!board || !wrap) return;

    /* Remove constraints that fight zoom */
    board.style.minWidth  = '0';
    board.style.flexShrink = '0';
    /* Disable scroll-snap while we handle zoom manually */
    wrap.style.scrollSnapType = 'none';

    var STEP = 0.08, MIN = 0.20, MAX = 1.0;
    var LS   = 'sf_bz4', LSV = 'sf_bz4_vpw';
    var vpw  = window.innerWidth;
    var phone = vpw < 700;

    /* Measure real board width AFTER layout settles */
    function measureBoard() {
      /* Temporarily remove any existing zoom to measure natural size */
      board.style.zoom = 1;
      board.style.transform = '';
      return board.scrollWidth || board.offsetWidth || 1500;
    }

    function calcDefault(w) {
      var bw = measureBoard();
      /* Phone: fit ALL columns. iPad: show ~2.5 cols */
      return Math.round(Math.min(MAX, Math.max(MIN,
        (w < 700) ? (w / bw) : (w * 0.80) / (bw / 7 * 2.5)
      )) * 100) / 100;
    }

    var saved    = parseFloat(localStorage.getItem(LS));
    var savedVpw = parseFloat(localStorage.getItem(LSV));
    var z = (saved && Math.abs(savedVpw - vpw) < 40)
              ? Math.min(MAX, Math.max(MIN, saved))
              : calcDefault(vpw);

    /* Apply zoom using CSS zoom + transform fallback */
    var zStyle = document.createElement('style');
    zStyle.id  = 'sf-zoom-rule';
    document.head.appendChild(zStyle);

    var btnOut, lbl, btnIn;

    function applyZoom(val) {
      z = Math.round(Math.min(MAX, Math.max(MIN, val)) * 100) / 100;
      /* Use zoom if supported; transform:scale as fallback */
      if (CSS && CSS.supports && CSS.supports('zoom', '0.5')) {
        board.style.zoom      = z;
        board.style.transform = '';
      } else {
        board.style.zoom      = '';
        board.style.transform = 'scale(' + z + ')';
        board.style.transformOrigin = '0 0';
        /* Shrink the layout footprint so scroll tracks scaled size */
        var bw = board.scrollWidth / z;
        board.style.width = bw + 'px';
        board.parentElement.style.width = Math.ceil(bw * z) + 'px';
      }
      localStorage.setItem(LS,  z);
      localStorage.setItem(LSV, vpw);
      if (btnOut) {
        btnOut.style.opacity = z <= MIN + 0.01 ? '0.28' : '1';
        btnIn.style.opacity  = z >= MAX - 0.01 ? '0.28' : '1';
        lbl.textContent = (z <= MIN + 0.05) ? 'All' : Math.round(z * 100) + '%';
      }
    }

    /* Pill UI */
    var pill = document.createElement('div');
    pill.id  = 'sf-zpill';
    btnOut = document.createElement('button');
    btnOut.textContent = '−'; btnOut.setAttribute('aria-label', 'Zoom out');
    lbl = document.createElement('span'); lbl.id = 'sf-zlbl';
    btnIn = document.createElement('button');
    btnIn.textContent = '+'; btnIn.setAttribute('aria-label', 'Zoom in');
    pill.appendChild(btnOut); pill.appendChild(lbl); pill.appendChild(btnIn);
    document.body.appendChild(pill);

    btnOut.addEventListener('click', function () { applyZoom(z - STEP); });
    btnIn.addEventListener('click',  function () { applyZoom(z + STEP); });

    /* ── Pinch gesture ──────────────────────────────────────────── */
    var pinchStart = null, pinchZ = null;

    function touchDist(touches) {
      var dx = touches[0].clientX - touches[1].clientX;
      var dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    wrap.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        pinchStart = touchDist(e.touches);
        pinchZ     = z;
      }
    }, { passive: true });

    wrap.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2 && pinchStart !== null) {
        e.preventDefault();
        var ratio = touchDist(e.touches) / pinchStart;
        applyZoom(pinchZ * ratio);
      }
    }, { passive: false });   /* must be non-passive to preventDefault */

    wrap.addEventListener('touchend', function (e) {
      if (e.touches.length < 2) { pinchStart = null; pinchZ = null; }
    }, { passive: true });

    /* Apply after layout — rAF ensures DOM is fully painted */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        applyZoom(z);
      });
    });

    /* Recompute on orientation change */
    window.addEventListener('orientationchange', function () {
      setTimeout(function () {
        vpw   = window.innerWidth;
        phone = vpw < 700;
        applyZoom(calcDefault(vpw));
      }, 400);
    });
  }

  /* ── 5. Schedule skeleton cards ────────────────────────────────── */
  function skeletonizeSchedule() {
    if (window.location.pathname.indexOf('schedule') === -1) return;
    var sk = document.createElement('style');
    sk.textContent = '@keyframes sfsh{0%{background-position:-400px 0}100%{background-position:400px 0}}'
      + '.sfskel{border-radius:4px;background:linear-gradient(90deg,rgba(255,255,255,.06) 25%,rgba(255,255,255,.14) 50%,rgba(255,255,255,.06) 75%);background-size:800px 100%;animation:sfsh 1.6s infinite linear}'
      + '.sfsk-n{height:11px;width:72%;margin-bottom:6px}'
      + '.sfsk-d{height:9px;width:54%;margin-bottom:5px}'
      + '.sfsk-t{height:8px;width:40%}';
    document.head.appendChild(sk);
    document.querySelectorAll('.job-block').forEach(function (b) {
      b.style.opacity = '0.65';
      b.innerHTML = '<div class="sfskel sfsk-n"></div><div class="sfskel sfsk-d"></div><div class="sfskel sfsk-t"></div>';
    });
    var ai = document.querySelector('.sched-ai,.ai-schedule-note,.schedule-insight');
    if (ai) ai.innerHTML = '<span style="color:rgba(255,255,255,.35);font-size:12px">✦ Schedule loads once your jobs are in the system</span>';
  }

  /* ── Main inject ────────────────────────────────────────────────── */
  function inject() {
    /* Watermark */
    var wm    = document.createElement('div'); wm.id = 'sf-wm';
    var label = demoFor ? 'CONFIDENTIAL · ' + demoFor.toUpperCase() : 'CONFIDENTIAL DEMO';
    var tile  = (label + '          ').repeat(6);
    var html  = '';
    for (var i = 0; i < 14; i++)
      html += '<div class="sf-wm-r" style="margin-top:' + (i*80) + 'px"><span>' + tile + '</span></div>';
    wm.innerHTML = html;
    document.body.appendChild(wm);

    initBoardZoom();
    skeletonizeSchedule();

    /* Banner */
    if (demoFor) {
      var banner = document.createElement('div'); banner.id = 'sf-banner';
      banner.innerHTML = '<div class="dot"></div>'
        + '<span class="lbl">Confidential demo &nbsp;·&nbsp; Prepared for</span>'
        + '<span class="nm">' + esc(demoFor) + '</span>'
        + '<span class="note">Not for distribution</span>';
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

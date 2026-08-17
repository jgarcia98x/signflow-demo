/*! SignFlow Demo Guard — personalized links + screenshot watermark
 *  Usage: append ?demo=Company+Name to any page URL
 *  e.g.  https://jgarcia98x.github.io/signflow-demo/?demo=Eclipse+Awning
 */
(function () {
  'use strict';

  /* ── 1. Parse ?demo= param ───────────────────────────────────────── */
  var params = new URLSearchParams(window.location.search);
  var demoFor = (params.get('demo') || '').trim();

  /* Propagate param across internal nav links so it survives tab switches */
  if (demoFor) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http')) return;
      var url = new URL(href, window.location.href);
      if (!url.searchParams.get('demo')) {
        url.searchParams.set('demo', demoFor);
        a.setAttribute('href', url.pathname + url.search);
      }
    });
  }

  /* ── 2. Watermark + banner styles ───────────────────────────────── */
  var style = document.createElement('style');
  style.textContent = [
    '#sf-demo-watermark {',
    '  position: fixed; top: 0; left: 0;',
    '  width: 100vw; height: 100vh;',
    '  pointer-events: none; z-index: 99998; overflow: hidden;',
    '  transform: rotate(-28deg); transform-origin: 50% 50%;',
    '  opacity: 0.045;',
    '}',
    '.sf-wm-row { position: absolute; white-space: nowrap; left: -60%; width: 220%; }',
    '.sf-wm-row span {',
    '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
    '  font-size: 18px; font-weight: 700; letter-spacing: 0.18em; color: #fff;',
    '  user-select: none; -webkit-user-select: none;',
    '}',
    '#sf-demo-banner {',
    '  position: fixed; bottom: 0; left: 0; right: 0; z-index: 99999;',
    '  background: rgba(15,15,20,0.92); backdrop-filter: blur(8px);',
    '  -webkit-backdrop-filter: blur(8px);',
    '  border-top: 1px solid rgba(211,47,47,0.5);',
    '  padding: 8px 20px; display: flex; align-items: center; gap: 10px;',
    '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
    '  font-size: 12px; pointer-events: none;',
    '}',
    '#sf-demo-banner .sf-banner-dot {',
    '  width: 7px; height: 7px; border-radius: 50%; background: #d32f2f;',
    '  flex-shrink: 0; animation: sf-pulse 2s ease-in-out infinite;',
    '}',
    '#sf-demo-banner .sf-banner-label { color: rgba(255,255,255,0.55); text-transform: uppercase; letter-spacing: 0.08em; }',
    '#sf-demo-banner .sf-banner-name  { color: #fff; font-weight: 600; letter-spacing: 0.04em; }',
    '#sf-demo-banner .sf-banner-note  { margin-left: auto; color: rgba(255,255,255,0.3); font-size: 11px; }',
    '@keyframes sf-pulse { 0%,100%{ opacity:1; } 50%{ opacity:0.35; } }',
  ].join('\n');
  document.head.appendChild(style);

  /* ── 3. Board zoom control (touch devices only) ─────────────────── */
  function initBoardZoom() {
    if (!window.matchMedia('(pointer:coarse)').matches) return;
    var board = document.querySelector('.board');
    if (!board) return;

    /* Board geometry */
    var COL_W   = 200;   /* touch layer sets min-width:200px */
    var NUM_COL = Math.max(1, document.querySelectorAll('.col').length || 7);
    var GAP     = 12;
    var PAD     = 28;
    var boardW  = COL_W * NUM_COL + GAP * (NUM_COL - 1) + PAD;

    var vpw     = window.innerWidth;
    var isPhone = vpw < 700;

    /* Phone: fit ALL columns on screen from the start.
       iPad: show ~2.5 columns comfortably. */
    function calcDefault(w) {
      var phone = w < 700;
      return Math.round(Math.min(1, Math.max(0.20,
        phone
          ? w / boardW                              /* all cols visible */
          : (w * 0.82) / (COL_W * 2.5)             /* ~2.5 cols on iPad */
      )) * 100) / 100;
    }

    var ZOOM_MIN = 0.20, ZOOM_MAX = 1.0, ZOOM_STEP = 0.08;
    var LS_KEY   = 'sf_board_zoom_v3';
    var LS_VPW   = 'sf_board_zoom_v3_vpw';

    /* Only restore saved zoom if screen width hasn't changed significantly */
    var saved   = parseFloat(localStorage.getItem(LS_KEY));
    var savedVpw= parseFloat(localStorage.getItem(LS_VPW));
    var z = (saved && Math.abs(savedVpw - vpw) < 40)
              ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, saved))
              : calcDefault(vpw);

    /* Pill CSS — position:fixed so it never moves during scroll */
    var css = document.createElement('style');
    css.textContent = [
      '#sf-zoom-pill {',
      '  position: fixed;',
      '  bottom: 64px;',        /* clears demo banner */
      '  left: 50%;',
      '  transform: translateX(-50%);',
      '  z-index: 9990;',
      '  display: flex; align-items: center;',
      '  background: rgba(12,10,10,0.92);',
      '  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);',
      '  border: 1px solid rgba(255,255,255,0.15);',
      '  border-radius: 26px; overflow: hidden;',
      '  box-shadow: 0 4px 20px rgba(0,0,0,0.65);',
      '  user-select: none;',
      '}',
      '#sf-zoom-pill button {',
      '  background: none; border: none; color: #fff;',
      '  font-size: 22px; line-height: 1;',
      '  width: 52px; height: 48px;',
      '  display: flex; align-items: center; justify-content: center;',
      '  cursor: pointer;',
      '  -webkit-tap-highlight-color: transparent; touch-action: manipulation;',
      '  transition: opacity 0.12s, background 0.1s;',
      '}',
      '#sf-zoom-pill button:active { background: rgba(255,255,255,0.09); }',
      '#sf-zoom-lbl {',
      '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
      '  font-size: 12px; font-weight: 700;',
      '  color: rgba(255,255,255,0.75); letter-spacing: 0.05em;',
      '  min-width: 50px; text-align: center;',
      '  border-left: 1px solid rgba(255,255,255,0.1);',
      '  border-right: 1px solid rgba(255,255,255,0.1);',
      '}',
    ].join('\n');
    document.head.appendChild(css);

    /* Build pill and append to body — fixed to viewport, not a scroll container */
    var pill   = document.createElement('div');
    pill.id    = 'sf-zoom-pill';
    var btnOut = document.createElement('button');
    btnOut.textContent = '−'; btnOut.setAttribute('aria-label', 'Zoom out');
    var lbl    = document.createElement('span');
    lbl.id     = 'sf-zoom-lbl';
    var btnIn  = document.createElement('button');
    btnIn.textContent = '+'; btnIn.setAttribute('aria-label', 'Zoom in');
    pill.appendChild(btnOut); pill.appendChild(lbl); pill.appendChild(btnIn);
    document.body.appendChild(pill);

    function applyZoom(val) {
      z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(val * 100) / 100));
      board.style.zoom = z;
      localStorage.setItem(LS_KEY, z);
      localStorage.setItem(LS_VPW, vpw);
      btnOut.style.opacity = z <= ZOOM_MIN + 0.01 ? '0.28' : '1';
      btnIn.style.opacity  = z >= ZOOM_MAX - 0.01 ? '0.28' : '1';
      lbl.textContent = (z <= ZOOM_MIN + 0.01) ? 'All' : Math.round(z * 100) + '%';
    }

    btnOut.addEventListener('click', function () { applyZoom(z - ZOOM_STEP); });
    btnIn.addEventListener('click',  function () { applyZoom(z + ZOOM_STEP); });
    applyZoom(z);

    /* Recompute on orientation change */
    window.addEventListener('orientationchange', function () {
      setTimeout(function () {
        vpw = window.innerWidth;
        applyZoom(calcDefault(vpw));
      }, 350);
    });
  }

  /* ── 4. Schedule tab skeleton cards ─────────────────────────────── */
  function skeletonizeSchedule() {
    if (window.location.pathname.indexOf('schedule') === -1) return;
    var sk = document.createElement('style');
    sk.textContent = [
      '@keyframes sf-shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}',
      '.sf-skel{border-radius:4px;background:linear-gradient(90deg,rgba(255,255,255,0.06) 25%,rgba(255,255,255,0.14) 50%,rgba(255,255,255,0.06) 75%);background-size:800px 100%;animation:sf-shimmer 1.6s infinite linear}',
      '.sf-skel-name{height:11px;width:72%;margin-bottom:6px}',
      '.sf-skel-dtl{height:9px;width:54%;margin-bottom:5px}',
      '.sf-skel-time{height:8px;width:40%}',
    ].join('\n');
    document.head.appendChild(sk);
    document.querySelectorAll('.job-block').forEach(function (b) {
      b.style.opacity = '0.65';
      b.innerHTML = '<div class="sf-skel sf-skel-name"></div><div class="sf-skel sf-skel-dtl"></div><div class="sf-skel sf-skel-time"></div>';
    });
    var ai = document.querySelector('.sched-ai, .ai-schedule-note, .schedule-insight');
    if (ai) ai.innerHTML = '<span style="color:rgba(255,255,255,0.35);font-size:12px">✦ Schedule loads once your jobs are in the system</span>';
  }

  /* ── Main inject ─────────────────────────────────────────────────── */
  function inject() {
    /* Watermark */
    var wm = document.createElement('div');
    wm.id  = 'sf-demo-watermark';
    var label = demoFor ? 'CONFIDENTIAL · ' + demoFor.toUpperCase() : 'CONFIDENTIAL DEMO';
    var tile  = (label + '          ').repeat(6);
    var rows  = '';
    for (var i = 0; i < 14; i++) {
      rows += '<div class="sf-wm-row" style="margin-top:' + (i * 80) + 'px"><span>' + tile + '</span></div>';
    }
    wm.innerHTML = rows;
    document.body.appendChild(wm);

    /* Zoom */
    initBoardZoom();

    /* Schedule skeletons */
    skeletonizeSchedule();

    /* Personalised banner */
    if (demoFor) {
      var banner = document.createElement('div');
      banner.id  = 'sf-demo-banner';
      banner.innerHTML =
        '<div class="sf-banner-dot"></div>' +
        '<span class="sf-banner-label">Confidential demo &nbsp;·&nbsp; Prepared for</span>' +
        '<span class="sf-banner-name">' + escHtml(demoFor) + '</span>' +
        '<span class="sf-banner-note">Not for distribution</span>';
      document.body.appendChild(banner);
      document.querySelectorAll('.stats-meta').forEach(function (el) {
        if (el.textContent.indexOf('Apex Build Co') !== -1)
          el.textContent = el.textContent.replace('Apex Build Co', 'Demo for ' + demoFor);
      });
    }
  }

  function escHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', inject)
    : inject();

})();

/*! SignFlow Demo Guard — personalized links + screenshot watermark
 *  Usage: append ?demo=Company+Name to any page URL
 *  e.g.  https://jgarcia98x.github.io/signflow-mockups/?demo=Eclipse+Awning
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

  /* ── 2. Watermark overlay (always on — subtle during use, visible in screenshots) */
  var wm = document.createElement('div');
  wm.id = 'sf-demo-watermark';
  var wmLabel = demoFor ? 'CONFIDENTIAL · ' + demoFor.toUpperCase() : 'CONFIDENTIAL DEMO';
  /* Tile the label by repeating it across a wide string */
  var tile = (wmLabel + '          ').repeat(6);
  /* Build ~12 rows to cover any viewport height */
  var rows = '';
  for (var i = 0; i < 14; i++) {
    rows += '<div class="sf-wm-row" style="margin-top:' + (i * 80) + 'px">' +
      '<span>' + tile + '</span>' +
      '</div>';
  }
  wm.innerHTML = rows;

  var style = document.createElement('style');
  style.textContent = [
    '#sf-demo-watermark {',
    '  position: fixed;',
    '  top: 0; left: 0;',
    '  width: 100vw; height: 100vh;',
    '  pointer-events: none;',
    '  z-index: 99998;',
    '  overflow: hidden;',
    '  transform: rotate(-28deg);',
    '  transform-origin: 50% 50%;',
    '  opacity: 0.045;',   /* subtle: visible in screenshots, unobtrusive live */
    '}',
    '.sf-wm-row {',
    '  position: absolute;',
    '  white-space: nowrap;',
    '  left: -60%;',
    '  width: 220%;',
    '}',
    '.sf-wm-row span {',
    '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
    '  font-size: 18px;',
    '  font-weight: 700;',
    '  letter-spacing: 0.18em;',
    '  color: #fff;',
    '  user-select: none;',
    '  -webkit-user-select: none;',
    '}',
    /* Personalised banner */
    '#sf-demo-banner {',
    '  position: fixed;',
    '  bottom: 0; left: 0; right: 0;',
    '  z-index: 99999;',
    '  background: rgba(15,15,20,0.92);',
    '  backdrop-filter: blur(8px);',
    '  -webkit-backdrop-filter: blur(8px);',
    '  border-top: 1px solid rgba(211,47,47,0.5);',
    '  padding: 8px 20px;',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 10px;',
    '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
    '  font-size: 12px;',
    '  pointer-events: none;',
    '}',
    '#sf-demo-banner .sf-banner-dot {',
    '  width: 7px; height: 7px;',
    '  border-radius: 50%;',
    '  background: #d32f2f;',
    '  flex-shrink: 0;',
    '  animation: sf-pulse 2s ease-in-out infinite;',
    '}',
    '#sf-demo-banner .sf-banner-label {',
    '  color: rgba(255,255,255,0.55);',
    '  text-transform: uppercase;',
    '  letter-spacing: 0.08em;',
    '}',
    '#sf-demo-banner .sf-banner-name {',
    '  color: #fff;',
    '  font-weight: 600;',
    '  letter-spacing: 0.04em;',
    '}',
    '#sf-demo-banner .sf-banner-note {',
    '  margin-left: auto;',
    '  color: rgba(255,255,255,0.3);',
    '  font-size: 11px;',
    '}',
    '@keyframes sf-pulse {',
    '  0%,100%{ opacity:1; }',
    '  50%{ opacity:0.35; }',
    '}',
  ].join('\n');

  document.head.appendChild(style);

  function inject() {
    document.body.appendChild(wm);

    /* ── 3. Personalised banner (only when ?demo= set) ─────────────── */
    if (demoFor) {
      var banner = document.createElement('div');
      banner.id = 'sf-demo-banner';
      banner.innerHTML =
        '<div class="sf-banner-dot"></div>' +
        '<span class="sf-banner-label">Confidential demo &nbsp;·&nbsp; Prepared for</span>' +
        '<span class="sf-banner-name">' + escHtml(demoFor) + '</span>' +
        '<span class="sf-banner-note">Not for distribution</span>';
      document.body.appendChild(banner);

      /* Also update any footer company-name elements */
      document.querySelectorAll('.stats-meta').forEach(function (el) {
        if (el.textContent.indexOf('Apex Build Co') !== -1) {
          el.textContent = el.textContent.replace('Apex Build Co', 'Demo for ' + demoFor);
        }
      });
    }
  }

  function escHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  /* ── 4. Schedule tab: replace hardcoded job blocks with skeletons ── */
  function skeletonizeSchedule() {
    var isSchedule = window.location.pathname.indexOf('schedule') !== -1;
    if (!isSchedule) return;

    /* Inject skeleton CSS */
    var sk = document.createElement('style');
    sk.textContent = [
      '@keyframes sf-shimmer {',
      '  0%   { background-position: -400px 0; }',
      '  100% { background-position:  400px 0; }',
      '}',
      '.sf-skel {',
      '  border-radius: 4px;',
      '  background: linear-gradient(90deg,',
      '    rgba(255,255,255,0.06) 25%,',
      '    rgba(255,255,255,0.14) 50%,',
      '    rgba(255,255,255,0.06) 75%);',
      '  background-size: 800px 100%;',
      '  animation: sf-shimmer 1.6s infinite linear;',
      '}',
      '.sf-skel-name  { height:11px; width:72%; margin-bottom:6px; }',
      '.sf-skel-detail{ height:9px;  width:54%; margin-bottom:5px; }',
      '.sf-skel-time  { height:8px;  width:40%; }',
      '.sf-skel-empty {',
      '  display:flex; align-items:center; justify-content:center;',
      '  height:100%; min-height:52px;',
      '  font-size:11px; color:rgba(255,255,255,0.2);',
      '  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
      '}',
    ].join('\n');
    document.head.appendChild(sk);

    /* Replace each job-block's inner content */
    document.querySelectorAll('.job-block').forEach(function (block, i) {
      /* Preserve background colour — it shows which crew the block belongs to */
      block.style.opacity = '0.7';
      block.innerHTML =
        '<div class="sf-skel sf-skel-name"></div>' +
        '<div class="sf-skel sf-skel-detail"></div>' +
        '<div class="sf-skel sf-skel-time"></div>';
    });

    /* Replace empty cells (cells with no job-block) with a subtle placeholder */
    document.querySelectorAll('.sched-cell:not(:has(.job-block))').forEach(function (cell) {
      if (cell.querySelector('.sf-skel-empty')) return;
      var ph = document.createElement('div');
      ph.className = 'sf-skel-empty';
      ph.textContent = '—';
      cell.appendChild(ph);
    });

    /* Update the AI summary strip if present */
    var aiStrip = document.querySelector('.sched-ai, .ai-schedule-note, .schedule-insight');
    if (aiStrip) {
      aiStrip.innerHTML =
        '<span style="color:rgba(255,255,255,0.35);font-size:12px;">' +
        '✦ Schedule optimisation loads once your jobs are in the system' +
        '</span>';
    }
  }

  function inject() {
    document.body.appendChild(wm);
    skeletonizeSchedule();

    /* ── 3. Personalised banner (only when ?demo= set) ─────────────── */
    if (demoFor) {
      var banner = document.createElement('div');
      banner.id = 'sf-demo-banner';
      banner.innerHTML =
        '<div class="sf-banner-dot"></div>' +
        '<span class="sf-banner-label">Confidential demo &nbsp;·&nbsp; Prepared for</span>' +
        '<span class="sf-banner-name">' + escHtml(demoFor) + '</span>' +
        '<span class="sf-banner-note">Not for distribution</span>';
      document.body.appendChild(banner);

      /* Also update any footer company-name elements */
      document.querySelectorAll('.stats-meta').forEach(function (el) {
        if (el.textContent.indexOf('Apex Build Co') !== -1) {
          el.textContent = el.textContent.replace('Apex Build Co', 'Demo for ' + demoFor);
        }
      });
    }
  }

  function escHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();

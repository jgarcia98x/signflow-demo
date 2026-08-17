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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();

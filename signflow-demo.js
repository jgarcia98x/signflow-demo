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

    /* --- THE Customers bug + THE scroll bug.
           The app shell is body{display:flex;height:100vh;overflow:hidden}
           with inner panes doing the scrolling. .list-pane had flex:1 while
           .ai-sidebar claimed 45vh, starving the customer list.
           My earlier fix released the panes to height:auto but left the body
           clipped at 100vh — so Customers ended up with 4418px of content
           inside a 664px hidden box and NOTHING could scroll.
           Correct fix: release the whole shell to natural document flow on
           phones so the PAGE scrolls. --- */
    '@media(max-width:700px){',
    '  html{height:auto!important;overflow-y:visible!important}',
    '  body{',
    '    height:auto!important;min-height:100vh!important;',
    '    overflow-y:visible!important;overflow-x:hidden!important}',
    /*  Keep the header reachable while the page scrolls */
    '  header{position:sticky!important;top:0;z-index:60}',
    '  .main-content{',
    '    flex-direction:column!important;',
    '    overflow:visible!important;height:auto!important;',
    '    display:block!important}',
    '  .list-pane{',
    '    flex:none!important;overflow:visible!important;',
    '    max-height:none!important;height:auto!important;',
    '    display:block!important;padding:14px 14px 8px!important}',
    /*  reports.html scrolls in #page-content (measured 3706px inside 455px).
        Release it too or the page scroll has nothing to do. */
    '  .page-content{',
    '    flex:none!important;overflow-y:visible!important;',
    '    height:auto!important;max-height:none!important}',
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
    '  nav a{flex-shrink:0!important;white-space:nowrap!important;',
    '    overflow:visible!important;text-overflow:clip!important}',
    /*  Last tab looked clipped: each page's own media query sets
        nav{padding:0}, which beat my spacer. The nav does scroll, but a
        half-cut label reads as broken on a cold demo. Force end padding
        and shrink tab padding so all 4 tabs fit a 390px row outright. */
    '  nav{padding:0 16px 0 0!important;justify-content:flex-start!important}',
    '  nav a{padding-left:11px!important;padding-right:11px!important;',
    '    font-size:12.5px!important}',
    '  nav a:last-child{margin-right:14px!important}',

    /*  Bell badge is injected with top:-5px;right:-5px, so it eats 5px of
        the 10px header gap and visually touches the New Job button.
        Measured: badge right=277, button left=283 — 6px. Widen the gap and
        pull the badge inward. */
    '  .header-right{gap:14px!important;padding-right:2px}',
    '  #sf-bell-badge{top:-4px!important;right:-3px!important;',
    '    box-shadow:0 0 0 2px rgba(20,10,12,.95)}',

    /*  Bell docked to the true top-right corner, on the logo band above the
        nav tabs. Absolute inside the header so it cannot crowd anything. */
    /*  The logo band is only 41px tall, so a 38px bell at top:8 spilled 5-11px
        into the nav tabs. Give the band room and size the bell to fit inside
        it, keeping the tap target at 34px. */
    '  header.sf-hdr-anchor{position:relative!important;padding-top:6px!important}',
    '  header.sf-hdr-anchor .logo{padding-right:56px!important;',
    '    min-height:40px!important;display:flex!important;align-items:center!important}',
    '  #sf-bell.sf-bell-corner{position:absolute!important;top:5px!important;',
    '    right:12px!important;width:34px!important;height:34px!important;',
    '    min-height:0!important;max-height:34px!important;padding:0!important;',
    '    margin:0!important;z-index:60!important;font-size:15px!important;',
    '    line-height:1!important;flex:0 0 auto!important}',
    '  header.sf-hdr-anchor .date-chip{display:none!important}',

    /*  New Job sits beside Filters. Ordering them as loose flex siblings put
        New Job on its own row (margin-left:auto forced a wrap), so both are
        wrapped in a real .sf-actionrow element instead — one row, guaranteed,
        with Filters left and New Job filling the remainder. */
    /*  "Focus Now" banner is built as one inline string with &nbsp;·&nbsp;
        separators, so at 390px it collapsed into a 4-line ragged block with
        orphaned dots. On phones: name on its own line, meta as a wrapping
        row, and the trailing "Highest-impact" tag on its own line. */
    '  .ai-banner{display:block!important;line-height:1.45!important;',
    '    padding:10px 12px!important;font-size:12.5px!important}',
    '  .ai-banner .hot-name{display:block!important;font-weight:700!important;',
    '    font-size:13.5px!important;margin:2px 0 1px!important}',
    '  .ai-banner .hot-action{display:block!important;margin-top:3px!important;',
    '    font-size:11.5px!important;opacity:.75!important}',
    '  .ai-banner .sf-bmeta{display:flex!important;flex-wrap:wrap!important;',
    '    align-items:center!important;gap:0 6px!important;margin-top:1px!important}',
    '  .ai-banner .sf-bchip{white-space:nowrap!important}',
    /*  Dots never start or end a line — they stay glued between two chips. */
    '  .ai-banner .sf-bdot{opacity:.45!important;white-space:nowrap!important}',
    '  .ai-banner em{font-style:normal!important}',

    '  .sf-actionrow{order:6!important;display:flex!important;width:100%!important;',
    '    gap:10px!important;align-items:center!important;margin-top:2px!important;',
    '    flex:0 0 100%!important}',
    '  .sf-actionrow #sf-ftoggle{flex:0 0 auto!important;margin:0!important;order:1!important}',
    /*  A page rule was resetting order to 0, which put New Job BEFORE Filters
        and stacked both at x=14. Needs the extra .sf-subwrap specificity. */
    '  .sf-subwrap .sf-actionrow .btn-new,.sf-actionrow .btn-new.sf-newmoved,',
    '  .sf-subwrap .sf-actionrow .btn-assign,.sf-actionrow .btn-assign.sf-newmoved{',
    '    order:2!important;flex:1 1 auto!important;height:40px!important;',
    '    padding:0 16px!important;font-size:13px!important;white-space:nowrap!important;',
    '    margin:0!important;display:inline-flex!important;align-items:center!important;',
    '    justify-content:center!important;max-width:none!important;',
    '    position:static!important;width:auto!important}',

    /*  First-visit hint sheet (see initHint). iOS-style: dimmed backdrop,
        rounded sheet rising from the bottom, grab handle, single action.
        Not inside the phone-only media query — tablets get it too. */
    '#sf-hint{position:fixed;inset:0;z-index:99998;display:flex;',
    '  align-items:flex-end;justify-content:center;',
    '  background:rgba(0,0,0,0);backdrop-filter:blur(0px);',
    '  -webkit-backdrop-filter:blur(0px);',
    '  transition:background .26s ease,backdrop-filter .26s ease;',
    '  pointer-events:none}',
    '#sf-hint.sf-hint-in{background:rgba(0,0,0,0.5);backdrop-filter:blur(3px);',
    '  -webkit-backdrop-filter:blur(3px);pointer-events:auto}',
    '#sf-hint.sf-hint-out{background:rgba(0,0,0,0);backdrop-filter:blur(0px);',
    '  -webkit-backdrop-filter:blur(0px);pointer-events:none}',
    '.sf-hint-sheet{width:100%;max-width:460px;box-sizing:border-box;',
    '  background:rgba(32,22,26,0.92);backdrop-filter:blur(24px) saturate(160%);',
    '  -webkit-backdrop-filter:blur(24px) saturate(160%);',
    '  border:1px solid rgba(255,255,255,0.10);border-bottom:0;',
    '  border-radius:20px 20px 0 0;padding:9px 20px calc(20px + env(safe-area-inset-bottom));',
    '  box-shadow:0 -12px 40px rgba(0,0,0,0.45);',
    '  transform:translateY(102%);transition:transform .3s cubic-bezier(.32,.72,0,1);',
    '  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
    '#sf-hint.sf-hint-in .sf-hint-sheet{transform:translateY(0)}',
    '#sf-hint.sf-hint-out .sf-hint-sheet{transform:translateY(102%)}',
    '.sf-hint-grip{width:36px;height:4px;border-radius:2px;',
    '  background:rgba(255,255,255,0.20);margin:0 auto 14px}',
    '.sf-hint-t{font-size:21px;font-weight:700;color:#fff;',
    '  letter-spacing:-0.35px;margin-bottom:5px;text-align:center}',
    '.sf-hint-lede{font-size:12.5px;line-height:1.5;text-align:center;',
    '  color:rgba(255,255,255,0.52);margin:0 6px 16px}',
    '.sf-hint-row{display:flex;gap:13px;align-items:flex-start;margin-bottom:13px}',
    /*  Divider with an inline caption — the tools are a distinct idea from
        the gestures, so they read better fenced off than as more rows. */
    '.sf-hint-sep{display:flex;align-items:center;gap:9px;margin:3px 0 11px}',
    '.sf-hint-sep:before,.sf-hint-sep:after{content:"";flex:1;height:1px;',
    '  background:rgba(255,255,255,0.11)}',
    '.sf-hint-sep span{font-size:9.5px;text-transform:uppercase;',
    '  letter-spacing:0.8px;font-weight:700;color:rgba(255,255,255,0.34)}',
    '.sf-hint-tools{display:flex;flex-direction:column;gap:7px;margin-bottom:14px}',
    /*  Grid, not flex: an inline wrap left the description's second line
        starting under the bold name, giving a ragged edge. A 3-column grid
        (icon / name / where) keeps every continuation line aligned. */
    '.sf-hint-tool{display:grid;grid-template-columns:auto auto 1fr;',
    '  align-items:baseline;column-gap:7px;',
    '  background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.07);',
    '  border-radius:9px;padding:8px 11px;font-size:11.5px;line-height:1.45}',
    '.sf-hint-tic{font-size:11px}',
    '.sf-hint-tn{font-weight:700;color:rgba(255,255,255,0.93);white-space:nowrap}',
    '.sf-hint-tw{color:rgba(255,255,255,0.50);min-width:0}',
    /*  Narrow phones: stack the description under the name so neither the
        name nor the text is squeezed into a two-word column. */
    '@media(max-width:400px){',
    '  .sf-hint-tool{grid-template-columns:auto 1fr}',
    '  .sf-hint-tw{grid-column:2;margin-top:2px}',
    '}',
    '.sf-hint-ic{flex:0 0 34px;height:34px;border-radius:10px;',
    '  background:rgba(211,47,47,0.16);border:1px solid rgba(211,47,47,0.28);',
    '  display:flex;align-items:center;justify-content:center;font-size:16px}',
    '.sf-hint-rt{font-size:14px;font-weight:600;color:rgba(255,255,255,0.94);',
    '  margin-bottom:2px}',
    '.sf-hint-rd{font-size:12.5px;line-height:1.45;color:rgba(255,255,255,0.55)}',
    '.sf-hint-ok{width:100%;height:46px;margin-top:5px;border:0;',
    '  border-radius:13px;background:#d32f2f;color:#fff;font-size:15px;',
    '  font-weight:650;letter-spacing:0.1px;cursor:pointer;',
    '  font-family:inherit;-webkit-tap-highlight-color:transparent}',
    '.sf-hint-ok:active{background:#b52626}',
    '@media(prefers-reduced-motion:reduce){',
    '  .sf-hint-sheet{transition:none}#sf-hint{transition:none}}',

    /*  Boot veil — covers the unscaled-board flash (see initVeil). */
    '  #sf-veil{position:fixed;inset:0;z-index:99999;display:flex;',
    '    align-items:center;justify-content:center;',
    '    background:radial-gradient(120% 90% at 50% 12%,#241318 0%,#160c10 55%,#100a0d 100%);',
    '    opacity:1;transition:opacity .24s ease}',
    '  #sf-veil.gone{opacity:0;pointer-events:none}',
    '  .sf-veil-in{text-align:center;transform:translateY(-6px)}',
    '  .sf-veil-mark{display:flex;gap:5px;justify-content:center;',
    '    align-items:flex-end;height:38px;margin:0 auto 16px}',
    /*  Four bars rising like pipeline columns filling in. */
    '  .sf-vb{width:9px;border-radius:3px;background:#C2453F;',
    '    animation:sfvb 1.05s cubic-bezier(.4,0,.3,1) infinite;',
    '    animation-delay:calc(var(--i)*.11s);height:12px;opacity:.35}',
    '  .sf-vb:nth-child(3){background:#D9694F}',
    '  .sf-vb:nth-child(4){background:rgba(255,255,255,.28)}',
    '  @keyframes sfvb{0%{height:10px;opacity:.3}',
    '    45%{height:34px;opacity:1}100%{height:10px;opacity:.3}}',
    '  .sf-veil-t{font-size:19px;font-weight:700;letter-spacing:.2px;',
    '    color:#fff;margin-bottom:5px}',
    '  .sf-veil-s{font-size:12px;color:rgba(255,255,255,.5);',
    '    letter-spacing:.3px}',
    '  @media(prefers-reduced-motion:reduce){',
    '    .sf-vb{animation:none;height:24px;opacity:.7}}',
    '  .sub-bar{flex-wrap:wrap!important;row-gap:8px}',
    '  .time-tabs{flex-wrap:wrap}',
    '  .date-chip,.header-sep{display:none!important}',
    '}',

    /* --- Sub-bar crowding on Reports & Customers.
           Both cram title + subtitle + count + tabs + export/search into one
           flex row that has margin-left:auto children fighting for space.
           Give it a clean two-row grid on phones. --- */
    '@media(max-width:700px){',
    /*  MY REGRESSION: display:flex!important beat jobs.html's inline
        display:none, so the whole All Jobs sub-bar (title, count, filter
        pills, search, Filters, New Job) stayed visible on the Reports and
        Smart Conversions sub-tabs. A stylesheet !important outranks a
        non-important inline style, so show() was working and I was undoing
        it. .sf-hidden is mirrored from the inline style by an observer and
        wins over the layout rule below. */
    '  .sub-bar.sf-hidden,.sf-subwrap.sf-hidden{display:none!important}',
    '  .sub-bar,.sf-subwrap{',
    '    display:flex!important;flex-wrap:wrap!important;',
    '    align-items:center!important;',
    '    column-gap:10px!important;row-gap:9px!important;',
    '    padding:10px 14px!important;',
    '    height:auto!important;min-height:0!important;',
    '    overflow:visible!important}',
    '  .sub-bar-title{width:100%;order:1;font-size:15px!important}',
    '  .sub-bar-sub,.cust-count{',
    '    order:2;font-size:11px!important;opacity:.7;',
    '    margin:0!important;white-space:nowrap}',
    /*  Anything that used margin-left:auto must stop pulling on a wrapped row */
    '  .time-tabs{order:3;margin-left:0!important;width:100%;gap:5px!important}',
    '  .time-tab{flex:1;justify-content:center;display:flex;align-items:center;',
    '    min-height:36px;font-size:12px}',
    '  .export-btn{order:4;margin-left:0!important;min-height:36px;',
    '    display:inline-flex;align-items:center}',
    '  .search-box{order:5;width:100%!important;min-height:38px;',
    '    box-sizing:border-box}',
    '  #sf-ftoggle{order:6}',
    '  .filter-pills{order:7;width:100%}',
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
    /* Reports has no .filter-pills, so anything that must apply there
       (sub-bar de-crowding) has to happen before the early return. */
    var sub = document.querySelector('.sub-bar');
    if (sub && isPhone) sub.classList.add('sf-subwrap');

    var tray = document.querySelector('.filter-pills');
    if (!tray) return;
    tray.classList.add('sf-ftray');

    var btn = document.createElement('button');
    btn.id = 'sf-ftoggle';
    btn.setAttribute('aria-expanded', 'true');

    /* On phones the primary action belongs beside the filter control, at
       thumb height, rather than in the header where it crowded the bell.
       Both go inside one .sf-actionrow so they can never wrap apart.
       Moved (not cloned) so there is only ever one New Job button. */
    var actionRow = null;
    if (isPhone && sub) {
      actionRow = document.createElement('div');
      actionRow.className = 'sf-actionrow';
      sub.appendChild(actionRow);
      actionRow.appendChild(btn);
      /* Each page's primary action: New Job on pipeline/jobs/customers,
         Assign Job on schedule. Same treatment — the header is where it
         crowded the bell. */
      var newBtn = document.querySelector('header .btn-new, header .btn-assign');
      if (newBtn) {
        newBtn.classList.add('sf-newmoved');
        actionRow.appendChild(newBtn);
      }
    }

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

    /* Closed by default on phones/tablets; the button carries an active
       count so nothing is hidden silently. */
    if (window.innerWidth <= 1024) {
      tray.classList.add('collapsed');
      btn.classList.add('collapsed');
      btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', function () {
      var collapsed = tray.classList.toggle('collapsed');
      btn.classList.toggle('collapsed', collapsed);
      btn.setAttribute('aria-expanded', String(!collapsed));
    });
    tray.addEventListener('click', function (e) {
      if (e.target.closest('.filter-pill')) setTimeout(paint, 30);
    });

    /* On phones the button already lives in .sf-actionrow beside New Job;
       moving it next to the tray here would undo that pairing. */
    if (!actionRow) tray.parentNode.insertBefore(btn, tray);
  }

  /* ── 3c. Boot veil ───────────────────────────────────────────────────
     Measured justification, not decoration: the board paints at full size
     at 82ms and the zoom transform lands at 231ms, so there is a ~149ms
     window where a phone shows a giant unscaled board that then snaps to
     34%. That jolt is the actual defect. This covers exactly that window
     and removes itself the moment the layout is settled.
     Deliberately NOT a fake progress bar — nothing here is really loading
     (53KB, 8 requests, DOM ready at 302ms). Inventing progress would
     violate the honest-tooling standard. It reads as "arranging", which is
     literally what the zoom pass is doing.                              */
  function initVeil() {
    if (!isPhone) return;
    /* The veil is created by the <head> bootstrap, because this file loads at
       end of body and always lost the race against the board's first paint.
       Adopt that element; only build one if the bootstrap didn't run. */
    var v = document.getElementById('sf-veil');
    if (!v) {
      v = document.createElement('div');
      v.id = 'sf-veil';
      v.innerHTML =
        '<div class="sf-veil-in">' +
          '<div class="sf-veil-mark">' +
            '<span class="sf-vb" style="--i:0"></span>' +
            '<span class="sf-vb" style="--i:1"></span>' +
            '<span class="sf-vb" style="--i:2"></span>' +
            '<span class="sf-vb" style="--i:3"></span>' +
          '</div>' +
          '<div class="sf-veil-t">SignFlow</div>' +
          '<div class="sf-veil-s">Arranging your board</div>' +
        '</div>';
      document.documentElement.appendChild(v);
    }

    var done = false;
    function lift() {
      if (done) return;
      done = true;
      v.classList.add('gone');
      setTimeout(function () { if (v.parentNode) v.parentNode.removeChild(v); }, 260);
    }
    /* Lift once the zoom pass has actually applied, with a hard ceiling so
       a failure can never leave a prospect staring at a veil. */
    window.__sfVeilLift = lift;
    setTimeout(lift, 1400);
  }

  /* ── 3c2. Tidy the Focus Now banner on phones ────────────────────────
     index.html builds it as one inline run with "&nbsp;·&nbsp;" separators.
     At 390px that wrapped into a ragged 4-line block with dots stranded at
     line ends. Wrap the meta parts in a flex row so the dots stay glued to
     their values, and drop the leading dot.                              */
  function initFocusBanner() {
    if (!isPhone) return;
    var b = document.querySelector('.ai-banner');
    if (!b || b.dataset.sfTidied) return;

    var name = b.querySelector('.hot-name');
    var action = b.querySelector('.hot-action');
    if (!name) return;

    /* Collect the text/element run between name and action — that's the meta. */
    var meta = [], n = name.nextSibling;
    while (n && n !== action) { meta.push(n); n = n.nextSibling; }

    var txt = meta.map(function (x) {
      return x.nodeType === 3 ? x.textContent : x.textContent;
    }).join('').replace(/\u00a0/g, ' ');

    /* Split on the middot and rebuild as discrete chips. */
    var parts = txt.split('·').map(function (s) { return s.trim(); })
                   .filter(function (s) { return s.length; });
    if (!parts.length) { b.dataset.sfTidied = '1'; return; }

    meta.forEach(function (x) { if (x.parentNode) x.parentNode.removeChild(x); });

    var row = document.createElement('span');
    row.className = 'sf-bmeta';
    parts.forEach(function (s, i) {
      var chip = document.createElement('span');
      chip.className = 'sf-bchip';
      chip.textContent = s;
      row.appendChild(chip);
      if (i < parts.length - 1) {
        var d = document.createElement('span');
        d.className = 'sf-bdot';
        d.textContent = '·';
        row.appendChild(d);
      }
    });
    name.parentNode.insertBefore(row, action || null);
    b.dataset.sfTidied = '1';
  }

  /* ── 3c3. Respect the page's own sub-bar hiding ───────────────────────
     jobs.html hides #jobs-subbar with an inline display:none when the
     Reports / Smart Conversions sub-tabs are active, because the filter
     pills, search, Filters and New Job belong only to the All Jobs table.
     My injected display:flex!important outranked that inline style, so the
     whole bar leaked onto both other sub-tabs. Mirror the page's intent
     into a class that beats the layout rule.                            */
  function initSubbarVisibility() {
    var sub = document.getElementById('jobs-subbar');
    if (!sub) return;

    function sync() {
      var hidden = sub.style.display === 'none';
      sub.classList.toggle('sf-hidden', hidden);
    }
    sync();

    /* The page sets the inline style directly, so watch the attribute
       rather than trying to hook its click handler. */
    new MutationObserver(sync).observe(sub, {
      attributes: true, attributeFilter: ['style']
    });
  }

  /* ── 3d. Dock the bell in the true top-right corner, above the tabs ── */
  function initBellCorner() {
    if (!isPhone) return true;
    var bell = document.getElementById('sf-bell');
    var hdr = document.querySelector('header');
    if (!bell || !hdr) return false;
    /* The header is the positioning context; the logo row is the top band,
       so anchoring the bell there puts it above the nav tabs. */
    hdr.classList.add('sf-hdr-anchor');
    bell.classList.add('sf-bell-corner');
    hdr.appendChild(bell);
    return true;
  }

  /* ── 4a. Smart Queue must be expanded AND reachable on the pipeline ── */
  function initQueueFirst() {
    if (PATH.indexOf('customers') !== -1 || PATH.indexOf('schedule') !== -1) return;

    /* The app persists a collapsed queue in localStorage['sf_queue'] and
       collapses it via html.queue-collapsed. A prospect must always see the
       headline feature, so force it open. */
    try { localStorage.setItem('sf_queue', 'open'); } catch (_) {}
    document.documentElement.classList.remove('queue-collapsed');

    if (!isPhone) return;

    /* Smart Queue lives inside .ai-sidebar but AFTER the crew/vendor block,
       so on a phone it rendered at y=1018 — expanded but far off-screen.
       Move its header + list to the top of the sidebar. */
    var sb = document.querySelector('.ai-sidebar');
    if (!sb) return;

    var head = Array.prototype.filter.call(
      sb.querySelectorAll('.sidebar-header'),
      function (h) { return /smart queue/i.test(h.textContent || ''); }
    )[0];
    if (!head) return;

    var group = [head];
    var n = head.nextElementSibling;
    /* Collect siblings up to the next section header */
    while (n && !(n.classList && n.classList.contains('sidebar-header'))) {
      group.push(n);
      n = n.nextElementSibling;
    }
    /* Insert before the first child so Smart Queue leads the sidebar */
    group.reverse().forEach(function (el) { sb.insertBefore(el, sb.firstChild); });
  }

  /* ── 4b. Collapse the crew/vendor sidebar on phones ─────────────── */
  function initAiPanel() {
    if (!isPhone) return;
    /* On the pipeline the .ai-sidebar IS the Smart Queue — the primary
       feature of the demo. Collapsing it there was wrong; it must stay
       expanded. Only collapse the secondary crew/vendor panel on the
       other tabs. */
    if (PATH.indexOf('customers') === -1 && PATH.indexOf('schedule') === -1) return;
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
    var LS = 'sf_bz7_' + PATH.replace(/\W/g, ''), LSV = LS + '_vpw';
    /* Purge any zoom saved by earlier builds so a stale pinch can't
       override the intended default on a device that already visited. */
    if (isPhone) {
      try {
        Object.keys(localStorage).forEach(function (k) {
          if (k.indexOf('sf_bz') === 0) localStorage.removeItem(k);
        });
      } catch (_) {}
    }
    var vpw = window.innerWidth, nat = { w: 1, h: 1 }, z = 1;

    function measure() {
      el.style.transform = ''; el.style.marginRight = ''; el.style.marginBottom = '';
      nat.w = el.scrollWidth || el.offsetWidth || 1;
      nat.h = el.scrollHeight || el.offsetHeight || 1;
    }
    function calcDefault() {
      /* -2px safety: rounding zoom UP to 2dp can re-introduce a few px. */
      var avail = vpw - pad - 2;
      var raw;
      if (PATH.indexOf('schedule') !== -1) {
        raw = isPhone ? (avail / nat.w) : ((avail * 0.8) / (nat.w / 7 * 2.5));
      } else {
        /* Pipeline: show N columns. All 7 on a 390px phone meant ~55px per
           column and illegible cards, so default to 4 and let pinch/± reach
           the rest. colCount measured from the DOM, not assumed. */
        var cols = document.querySelectorAll('.board .col').length || 7;
        var target = isPhone ? 4 : 2.5;
        raw = avail / (nat.w / cols * target);
      }
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
      if (!isPhone) { localStorage.setItem(LS, z); localStorage.setItem(LSV, vpw); }
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
        /* Deliberately NOT restoring a saved zoom on phones.
           A prospect opening the demo must always land on the intended
           4-column view; persisting a pinch meant Jordan kept seeing
           whatever he last pinched to rather than the default. Zoom is a
           transient viewing gesture here, not a saved preference. */
        if (isPhone) {
          z = calcDefault();
        } else {
          var s = parseFloat(localStorage.getItem(LS));
          var sv = parseFloat(localStorage.getItem(LSV));
          z = (s && Math.abs(sv - vpw) < 40) ? Math.min(MAX, Math.max(MIN, s)) : calcDefault();
        }
        apply(z);
        /* Layout is settled — lift the boot veil on the next frame so the
           first thing a prospect sees is the finished board. */
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            if (window.__sfVeilLift) window.__sfVeilLift();
          });
        });
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
  /* DISABLED 2026-08-17. Kept for the record rather than deleted, because the
     reasoning matters.

     This blanked every schedule block into a shimmering placeholder and
     captioned it "Schedule loads once your jobs are in the system". Nothing
     ever loads — the shimmer runs forever. That is precisely the invented
     loading state the honest-tooling standard bans; it was a fake-progress
     indicator wearing a different hat, and I wrote it.

     It also made the tab worthless: drag-and-drop, live conflict detection
     and the new detail panel all operate on blocks whose contents had been
     thrown away, so the page advertised three working features and showed
     none of them.

     The real blocks carry the same job names the pipeline seeds (6 of 9
     resolve to an SFStore job), so showing them is both more honest and more
     useful than pretending to load. */
  function skeletonize() {
    return;
    /* eslint-disable no-unreachable */
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
    initQueueFirst();
    initAiPanel();
    initZoom();
    skeletonize();

    initSubbarVisibility();
    initHint();

    /* The bell is injected by signflow-engine.js, which may not have run
       yet. Poll briefly rather than assuming it exists. */
    (function waitForBell(tries) {
      if (initBellCorner() || tries > 40) return;
      setTimeout(function () { waitForBell(tries + 1); }, 50);
    })(0);

    /* The banner is filled by index.html's own script, so wait for its
       .hot-name to exist before restructuring it. */
    (function waitForBanner(tries) {
      var b = document.querySelector('.ai-banner .hot-name');
      if (b) { initFocusBanner(); return; }
      if (tries > 40) return;
      setTimeout(function () { waitForBanner(tries + 1); }, 50);
    })(0);

    if (demoFor) {
      var banner = document.createElement('div'); banner.id = 'sf-banner';
      banner.innerHTML = '<div class="dot"></div>' +
        '<span class="lbl">Confidential demo · Prepared for</span>' +
        '<span class="nm">' + esc(demoFor) + '</span>' +
        '<span class="note">Not for distribution</span>';
      document.body.appendChild(banner);
      /* Reserve space so the fixed banner stops covering the stats bar.
         Body padding alone stopped working once the phone shell became
         naturally-flowing, so pad the last in-flow block too. */
      requestAnimationFrame(function () {
        var h = (banner.offsetHeight || 28) + 6;
        document.body.style.paddingBottom = h + 'px';
        var sb = document.querySelector('.stats-bar');
        if (sb && window.innerWidth < 700) {
          sb.style.paddingBottom = (parseFloat(getComputedStyle(sb).paddingBottom) || 8) + h + 'px';
        }
        /* Body padding isn't enough on the pipeline: the fixed banner still
           covered the Smart Queue header by a measured 13px, because that
           header is the last thing in a naturally-flowing phone layout.
           Pad the sidebar's final block too. */
        if (window.innerWidth < 700) {
          var side = document.querySelector('.ai-sidebar');
          if (side) side.style.paddingBottom = (h + 10) + 'px';
        }
      });
      document.querySelectorAll('.stats-meta').forEach(function (el) {
        if (el.textContent.indexOf('Apex Build Co') !== -1)
          el.textContent = el.textContent.replace('Apex Build Co', 'Demo for ' + demoFor);
      });
    }
  }

  /* ── 3h. First-visit welcome sheet (pipeline only) ────────────────────
     Two invisible things need saying to a cold prospect: the gestures
     (drag / tap) and where the three "smart" tools live, since two of them
     are on other tabs and nobody will hunt for them.

     Pipeline only, by Jordan's call — it is the landing tab, and one sheet on
     one tab is an introduction rather than a nag. Every claim verified:
       - Drag      : SFDnD.init({item:'.card', container:'.col'})
       - Tap       : opens #detail-panel (class 'open' confirmed)
       - Queue     : index.html:1654 .sidebar-title "⚡ Smart Queue"
       - Nudge     : customers.html:920 .sidebar-title "🎯 Smart Nudge"
       - Conversions: jobs.html:456 .vs-tab[data-view="wins"] "⚡ Smart
                      Conversions" — a sub-tab of Jobs & Reports, which is
                      exactly why it needs directions.
     Tone is invitational, not instructional: "Try it" beats "You must". */
  var HINT_ROWS = [
    ['\u270B', 'Drag a job anywhere',
      'Move a card between stages and everything downstream updates \u2014 '
      + 'schedule, capacity, forecast.'],
    ['\u261D', 'Tap a job for the full story',
      'Contact, value, next steps, history, and the actions you\u2019d actually take.']
  ];
  var HINT_TOOLS = [
    ['\u26A1', 'Smart Queue', 'right here on Pipeline \u2014 what to do today, and why'],
    ['\u{1F3AF}', 'Smart Nudge', 'Customers tab \u2014 quotes going cold, worth a call'],
    ['\u26A1', 'Smart Conversions', 'Jobs &amp; Reports \u2192 Smart Conversions \u2014 what wins you work']
  ];

  function initHint() {
    if (!isTouch) return;

    /* Pipeline only. */
    var onPipeline = PATH.indexOf('schedule') === -1
      && (PATH.indexOf('index') !== -1 || /\/$/.test(PATH) || PATH === '');
    if (!onPipeline) return;

    var LS = 'sf_hint_v2';
    try { if (localStorage.getItem(LS)) return; } catch (e) {}

    var demoName = null;
    try { demoName = new URLSearchParams(location.search).get('demo'); } catch (e) {}

    var wrap = document.createElement('div');
    wrap.id = 'sf-hint';
    wrap.innerHTML =
      '<div class="sf-hint-sheet" role="dialog" aria-modal="true" aria-label="Welcome to SignFlow">'
      + '<div class="sf-hint-grip"></div>'
      + '<div class="sf-hint-t">'
      + (demoName ? 'Built for ' + demoName : 'Welcome to SignFlow')
      + '</div>'
      + '<div class="sf-hint-lede">Every job you\u2019re running, on one board. '
      + 'Two things worth trying:</div>'
      + HINT_ROWS.map(function (r) {
          return '<div class="sf-hint-row"><div class="sf-hint-ic">' + r[0] + '</div>'
            + '<div><div class="sf-hint-rt">' + r[1] + '</div>'
            + '<div class="sf-hint-rd">' + r[2] + '</div></div></div>';
        }).join('')
      + '<div class="sf-hint-sep"><span>The three smart tools</span></div>'
      + '<div class="sf-hint-tools">'
      + HINT_TOOLS.map(function (t) {
          return '<div class="sf-hint-tool"><span class="sf-hint-tic">' + t[0] + '</span>'
            + '<span class="sf-hint-tn">' + t[1] + '</span>'
            + '<span class="sf-hint-tw">' + t[2] + '</span></div>';
        }).join('')
      + '</div>'
      + '<button class="sf-hint-ok" type="button">Start exploring</button>'
      + '</div>';
    document.body.appendChild(wrap);

    function close() {
      wrap.classList.add('sf-hint-out');
      try { localStorage.setItem(LS, '1'); } catch (e) {}
      setTimeout(function () { if (wrap.parentNode) wrap.remove(); }, 260);
    }
    wrap.querySelector('.sf-hint-ok').addEventListener('click', close);
    /* Tapping the dimmed backdrop dismisses, as on iOS. */
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) close();
    });

    /* Show only after the veil has lifted and the board has settled —
       otherwise the sheet animates over a still-scaling layout. */
    requestAnimationFrame(function () {
      setTimeout(function () { wrap.classList.add('sf-hint-in'); }, 340);
    });
  }

  /* The veil exists to hide the unscaled-board flash, so it must paint
     BEFORE the board does — it cannot wait for DOMContentLoaded. Styles and
     veil go up immediately; everything else waits for the DOM. */
  initVeil();

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', inject)
    : inject();

  /* Safety net: if zoom never runs (desktop width, missing board, thrown
     error), make sure the veil is never left covering the app. */
  window.addEventListener('load', function () {
    setTimeout(function () { if (window.__sfVeilLift) window.__sfVeilLift(); }, 250);
  });
})();

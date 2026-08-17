/* ═══════════════════════════════════════════════════════════════════════
   signflow-schedule-detail.js — tap a scheduled job block to open its detail

   WHY THIS EXISTS
   The pipeline teaches "tap a job to see everything about it" (#detail-panel
   in index.html). The schedule tab had drag-and-drop but no panel at all, so
   the gesture a prospect just learned did nothing here. That asymmetry is
   worse than a missing feature: it reads as broken.

   WHAT IT CAN HONESTLY SHOW
   A .job-block in schedule.html is hardcoded markup carrying exactly three
   facts: name, a short detail line, and a time range. It has no stage, value,
   client or step list. Measured: 6 of 9 block names match a job in SFStore by
   name prefix; 3 (Joliet Medical Center, Platinum Fitness, Joliet Park
   District) do not exist in the store at all.

   So this panel is built in two tiers:
     - ALWAYS  : facts derived from the schedule itself — crew, day, time,
                 duration, conflict state, vendor/lift need. All computed
                 from the DOM the user can change by dragging.
     - MATCHED : when the block resolves to a real SFStore job, its stage,
                 value, client, due date and priority are added, and a link
                 into the pipeline is offered.
   When there is no match, the panel says so plainly rather than inventing a
   value. An unmatched block is a scheduled visit that was never entered as a
   job — worth surfacing, not worth faking. This is the honest-tooling
   standard: a number shown must come from data the user can edit.

   Load order: after signflow-store.js (needs SFStore) and after the page's
   own script has run its restore pass. Binding is delegated on document, so
   blocks created later still work without rebinding.
   ═══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var PANEL_ID = 'sfsd-panel';
  var OVL_ID = 'sfsd-ovl';

  /* ── helpers ─────────────────────────────────────────────────────── */

  function txt(el, sel) {
    var n = el.querySelector(sel);
    return n ? (n.textContent || '').trim() : '';
  }

  function toMinutes(s) {
    var m = String(s).trim().match(/(\d{1,2})(?::(\d{2}))?\s*([AaPp])?/);
    if (!m) return null;
    var h = parseInt(m[1], 10), min = m[2] ? parseInt(m[2], 10) : 0;
    var ap = m[3] ? m[3].toLowerCase() : null;
    if (ap === 'p' && h < 12) h += 12;
    if (ap === 'a' && h === 12) h = 0;
    return h * 60 + min;
  }

  function fmtDur(mins) {
    if (mins == null || mins <= 0) return '';
    var h = Math.floor(mins / 60), m = mins % 60;
    if (h && m) return h + 'h ' + m + 'm';
    if (h) return h + (h === 1 ? ' hour' : ' hours');
    return m + 'm';
  }

  function money(n) {
    if (typeof n !== 'number' || !isFinite(n)) return null;
    return '$' + n.toLocaleString('en-US');
  }

  /* Crew for a block = the .crew-label that starts this grid row. Walk
     backwards through previous siblings until one is found, which is how
     the page's own conflict pass identifies rows. */
  function crewOf(block) {
    var cell = block.closest('.day-cell');
    if (!cell) return '';
    var n = cell.previousElementSibling;
    while (n && !n.classList.contains('crew-label')) n = n.previousElementSibling;
    return n ? txt(n, '.crew-name') : '';
  }

  /* Day for a block = the header sharing this cell's grid column. Derived by
     counting cells since the row's crew label, then indexing the day headers.
     Never hardcodes a week length — Sat/Sun were added later and a literal 5
     here is exactly the bug that hid weekend conflicts elsewhere. */
  function dayOf(block) {
    var cell = block.closest('.day-cell');
    if (!cell) return { label: '', idx: -1 };
    var idx = 0, n = cell.previousElementSibling;
    while (n && !n.classList.contains('crew-label')) {
      if (n.classList.contains('day-cell')) idx++;
      n = n.previousElementSibling;
    }
    var heads = Array.prototype.slice.call(document.querySelectorAll('.day-header'));
    var h = heads[idx];
    return { label: h ? (txt(h, '.day-name') || (h.textContent || '').trim()) : '', idx: idx };
  }

  /* Resolve a block to a real store job by name prefix. Blocks carry a short
     label ("Kohl's #0394"); store jobs carry the full one ("Kohl's #0394 —
     Pylon Reface"). Returns null rather than a guess. */
  function storeJob(name) {
    if (!name || !global.SFStore || typeof SFStore.all !== 'function') return null;
    var want = name.toLowerCase();
    var all = SFStore.all() || [];
    for (var i = 0; i < all.length; i++) {
      var jn = String(all[i].name || '').toLowerCase();
      if (jn === want || jn.indexOf(want) === 0) return all[i];
    }
    return null;
  }

  function row(label, value, opts) {
    opts = opts || {};
    return '<div class="sfsd-row' + (opts.wide ? ' wide' : '') + '">'
      + '<div class="sfsd-rl">' + label + '</div>'
      + '<div class="sfsd-rv"' + (opts.color ? ' style="color:' + opts.color + '"' : '') + '>'
      + value + '</div></div>';
  }

  /* ── panel construction ──────────────────────────────────────────── */

  function ensurePanel() {
    var p = document.getElementById(PANEL_ID);
    if (p) return p;

    var ovl = document.createElement('div');
    ovl.id = OVL_ID;
    document.body.appendChild(ovl);

    p = document.createElement('div');
    p.id = PANEL_ID;
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-modal', 'true');
    p.setAttribute('aria-label', 'Scheduled job details');
    p.innerHTML =
      '<div class="sfsd-head">'
      + '<div class="sfsd-hl"><div class="sfsd-title"></div>'
      + '<div class="sfsd-sub"></div></div>'
      + '<button class="sfsd-x" type="button" aria-label="Close">\u2715</button>'
      + '</div>'
      + '<div class="sfsd-body"></div>';
    document.body.appendChild(p);

    p.querySelector('.sfsd-x').addEventListener('click', close);
    ovl.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
    return p;
  }

  function close() {
    var p = document.getElementById(PANEL_ID), o = document.getElementById(OVL_ID);
    if (p) p.classList.remove('open');
    if (o) o.classList.remove('open');
    document.querySelectorAll('.job-block.sfsd-active')
      .forEach(function (b) { b.classList.remove('sfsd-active'); });
  }

  function open(block) {
    var p = ensurePanel(), o = document.getElementById(OVL_ID);

    var name = txt(block, '.job-block-name') || 'Scheduled job';
    var detail = txt(block, '.job-block-detail');
    var time = txt(block, '.job-block-time');
    var crew = crewOf(block);
    var day = dayOf(block);
    var conflict = block.classList.contains('conflict');
    var aiTag = txt(block, '.ai-tag');

    var dur = null;
    if (time) {
      var parts = time.split(/[\u2013\u2014-]/);
      if (parts.length >= 2) {
        var s = toMinutes(parts[0]), e = toMinutes(parts[1]);
        if (s != null && e != null && e > s) dur = e - s;
      }
    }

    var job = storeJob(name);

    p.querySelector('.sfsd-title').textContent = name;
    p.querySelector('.sfsd-sub').textContent =
      detail || (job ? String(job.name).replace(name, '').replace(/^\s*[\u2014-]\s*/, '') : '');

    var html = '';

    /* Conflict first — it is the only thing here that needs acting on. */
    if (conflict) {
      html += '<div class="sfsd-alert">'
        + '<strong>\u26A0 Double-booked.</strong> This overlaps another job in the '
        + 'same crew-day. Drag either one to a free day to clear it.'
        + '</div>';
    }

    /* ── Tier 1: the schedule's own facts ── */
    html += '<div class="sfsd-sect">This visit</div><div class="sfsd-grid">';
    html += row('Crew', crew || '<span class="sfsd-dim">Unassigned</span>');
    html += row('Day', day.label || '<span class="sfsd-dim">\u2014</span>');
    if (time) html += row('Window', time);
    if (dur) html += row('On site', fmtDur(dur));
    html += '</div>';

    if (aiTag) {
      html += '<div class="sfsd-note">' + aiTag
        + ' \u2014 this slot was proposed by scheduling, not booked by you. '
        + 'Drag it if it does not suit.</div>';
    }

    /* ── Tier 2: only when a real job backs this block ── */
    if (job) {
      html += '<div class="sfsd-sect">Job record</div><div class="sfsd-grid">';
      if (job.stage) html += row('Stage', job.stage);
      if (job.client) html += row('Client', job.client, { wide: true });
      var v = money(job.value);
      if (v) html += row('Value', v);
      if (job.due) html += row('Due', job.due);
      if (job.priority && job.priority !== 'normal') {
        html += row('Priority', job.priority.charAt(0).toUpperCase() + job.priority.slice(1));
      }
      html += '</div>';

      /* needs/vstatus are the two fields Smart Queue reads for capacity, so
         showing them here keeps the two screens telling the same story. */
      var bits = [];
      if (job.needs === 'lift') bits.push('needs a lift');
      else if (job.needs === 'crew') bits.push('needs the crew on site');
      else if (job.needs === 'office') bits.push('office work \u2014 no crew needed');
      if (job.vstatus === 'out') bits.push('currently at a vendor');
      if (bits.length) {
        html += '<div class="sfsd-note">' + name + ' ' + bits.join(' \u00B7 ')
          + '. This is what Smart Queue uses to work out how many jobs can run '
          + 'at once.</div>';
      }

      html += '<button class="sfsd-btn" type="button" data-go="pipeline">'
        + 'Open in Pipeline \u2192</button>';
    } else {
      /* No invented value. An unmatched block is a real gap worth naming. */
      html += '<div class="sfsd-sect">Job record</div>'
        + '<div class="sfsd-empty">Not linked to a job in the pipeline.<br>'
        + '<span class="sfsd-dim">This visit is on the calendar but was never '
        + 'entered as a job, so there is no value, stage or client to show.</span>'
        + '</div>';
    }

    html += '<div class="sfsd-foot">Drag this block to another crew or day to '
      + 'reschedule it.</div>';

    p.querySelector('.sfsd-body').innerHTML = html;

    var go = p.querySelector('[data-go="pipeline"]');
    if (go) {
      go.addEventListener('click', function () {
        try { sessionStorage.setItem('sf_focus_job', job.name); } catch (e) {}
        /* Preserve ?demo= so the prospect's name survives the hop. */
        location.href = 'index.html' + (location.search || '');
      });
    }

    document.querySelectorAll('.job-block.sfsd-active')
      .forEach(function (b) { b.classList.remove('sfsd-active'); });
    block.classList.add('sfsd-active');

    p.classList.add('open');
    if (o) o.classList.add('open');
    p.querySelector('.sfsd-body').scrollTop = 0;
  }

  /* ── styles ──────────────────────────────────────────────────────── */

  function styles() {
    var css = [
      '#' + OVL_ID + '{position:fixed;inset:0;z-index:5998;background:rgba(0,0,0,0.45);',
      '  backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);display:none}',
      '#' + OVL_ID + '.open{display:block}',
      '#' + PANEL_ID + '{position:fixed;top:0;right:0;height:100%;width:360px;',
      '  max-width:100vw;z-index:5999;background:#12121f;',
      '  border-left:1px solid rgba(255,255,255,0.12);',
      '  box-shadow:-8px 0 40px rgba(0,0,0,0.65);',
      '  transform:translateX(100%);transition:transform .28s cubic-bezier(.4,0,.2,1);',
      '  display:flex;flex-direction:column;',
      '  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '#' + PANEL_ID + '.open{transform:translateX(0)}',
      '.sfsd-head{display:flex;align-items:flex-start;gap:10px;padding:16px 16px 13px;',
      '  border-bottom:1px solid rgba(255,255,255,0.10);flex:0 0 auto}',
      '.sfsd-hl{flex:1;min-width:0}',
      '.sfsd-title{font-size:16px;font-weight:700;color:#fff;line-height:1.3}',
      '.sfsd-sub{font-size:11.5px;color:rgba(255,255,255,0.50);margin-top:3px}',
      '.sfsd-x{flex:0 0 30px;width:30px;height:30px;border-radius:8px;cursor:pointer;',
      '  background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.13);',
      '  color:rgba(255,255,255,0.75);font-size:13px;line-height:1;',
      '  -webkit-tap-highlight-color:transparent}',
      '.sfsd-x:active{background:rgba(255,255,255,0.14)}',
      '.sfsd-body{flex:1;overflow-y:auto;padding:14px 16px 22px;',
      '  -webkit-overflow-scrolling:touch}',
      '.sfsd-sect{font-size:9px;text-transform:uppercase;letter-spacing:0.7px;',
      '  font-weight:700;color:rgba(255,255,255,0.35);margin:16px 0 8px}',
      '.sfsd-sect:first-child{margin-top:0}',
      '.sfsd-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}',
      '.sfsd-row{background:rgba(255,255,255,0.04);',
      '  border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 10px}',
      '.sfsd-row.wide{grid-column:1/-1}',
      '.sfsd-rl{font-size:9px;text-transform:uppercase;letter-spacing:0.5px;',
      '  color:rgba(255,255,255,0.38);font-weight:700;margin-bottom:3px}',
      '.sfsd-rv{font-size:12.5px;font-weight:600;color:rgba(255,255,255,0.92);',
      '  word-break:break-word}',
      '.sfsd-dim{color:rgba(255,255,255,0.38);font-weight:500}',
      '.sfsd-alert{background:rgba(229,83,75,0.12);',
      '  border:1px solid rgba(229,83,75,0.34);border-radius:9px;padding:11px 12px;',
      '  font-size:11.5px;line-height:1.5;color:rgba(255,190,185,0.95);',
      '  margin-bottom:4px}',
      '.sfsd-alert strong{color:#ff9a92}',
      '.sfsd-note{background:rgba(255,255,255,0.035);',
      '  border:1px solid rgba(255,255,255,0.07);border-radius:9px;padding:10px 12px;',
      '  font-size:11px;line-height:1.55;color:rgba(255,255,255,0.60);margin-top:9px}',
      '.sfsd-empty{background:rgba(255,255,255,0.03);',
      '  border:1px dashed rgba(255,255,255,0.14);border-radius:9px;padding:12px;',
      '  font-size:11.5px;line-height:1.55;color:rgba(255,255,255,0.70)}',
      '.sfsd-btn{width:100%;margin-top:13px;height:42px;border:0;border-radius:10px;',
      '  background:rgba(91,143,199,0.15);border:1px solid rgba(91,143,199,0.42);',
      '  color:#9EC4EE;font-size:12.5px;font-weight:700;cursor:pointer;',
      '  font-family:inherit;-webkit-tap-highlight-color:transparent}',
      '.sfsd-btn:active{background:rgba(91,143,199,0.26)}',
      '.sfsd-foot{margin-top:16px;padding-top:13px;',
      '  border-top:1px solid rgba(255,255,255,0.08);font-size:10.5px;',
      '  line-height:1.5;color:rgba(255,255,255,0.38)}',
      /* Selected block keeps a ring so the panel's subject is obvious. */
      '.job-block.sfsd-active{outline:2px solid rgba(255,255,255,0.55);',
      '  outline-offset:1px}',
      /* Phones: full-height sheet from the right is fine, but widen it. */
      '@media(max-width:700px){',
      '  #' + PANEL_ID + '{width:100%}',
      '  .sfsd-body{padding-bottom:calc(28px + env(safe-area-inset-bottom))}',
      '}',
      '@media(prefers-reduced-motion:reduce){#' + PANEL_ID + '{transition:none}}'
    ].join('');
    var s = document.createElement('style');
    s.id = 'sfsd-style';
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ── binding ─────────────────────────────────────────────────────── */

  function init() {
    if (!document.querySelector('.schedule-grid, .job-block')) return;
    if (document.getElementById('sfsd-style')) return;
    styles();

    /* Drag and tap share the same element, so a tap must be distinguished
       from the end of a drag. SFDnD adds .sf-dragging to <html> while a drag
       is live and a click still fires after pointerup, so track movement the
       way index.html does for pipeline cards: any pointermove between down
       and up disqualifies the click. Delegated on document so blocks moved
       or added later keep working without rebinding. */
    var downAt = null, moved = false;

    document.addEventListener('pointerdown', function (e) {
      var b = e.target.closest && e.target.closest('.job-block');
      downAt = b ? { x: e.clientX, y: e.clientY } : null;
      moved = false;
    }, true);

    document.addEventListener('pointermove', function (e) {
      if (!downAt) return;
      /* Small slop so a slightly imprecise finger still counts as a tap. */
      if (Math.abs(e.clientX - downAt.x) > 6 || Math.abs(e.clientY - downAt.y) > 6) {
        moved = true;
      }
    }, true);

    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.job-block');
      if (!b) return;
      if (moved) { moved = false; return; }
      if (document.documentElement.classList.contains('sf-dragging')) return;
      /* Let real controls inside a block work. */
      if (e.target.closest('button,input,select,textarea,a')) return;
      open(b);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  global.SFScheduleDetail = { open: open, close: close };
})(window);

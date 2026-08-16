/* ═══════════════════════════════════════════════════════════════════════
   signflow-queue.js — Smart Queue, computed
   ───────────────────────────────────────────────────────────────────────
   Replaces eight hand-typed queue items and four invented callouts
   ("Est. 2.3 days saved") with arithmetic over things Peter controls.

   Two questions, deliberately kept apart:
     • What should I work on today?  → priority (value x likelihood,
       urgency, and whether it has gone quiet). Comes from SFConversions.
     • What can run at the same time? → capacity. A job only blocks
       another when both need the same constrained resource on the same
       day. Crew availability lives in the crew/vendor grid Peter edits;
       vendor status lives on the job.

   Deliberately NOT modelled: vendor return dates. Peter said he never
   gets a firm date, so any day-count would be invented. "It's with the
   vendor" is the whole signal, and it is enough — that job is moving
   without consuming his crew.
   ═══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var RES_KEY = 'sf_resources_v1';   /* shared with signflow-engine.js */
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  function resState() {
    try { return JSON.parse(localStorage.getItem(RES_KEY) || '{}'); }
    catch (e) { return {}; }
  }

  /* Crew rows only — vendors are not Peter's capacity. */
  var CREW = ['Mike Reyes', 'Dave Kowalski', 'Sarah Mitchell', 'Install Crew A'];

  /* Days where at least one crew member is not busy. This is the honest
     basis for "these can run together": real capacity, edited by Peter. */
  function freeDays() {
    var st = resState();
    return DAYS.filter(function (d) {
      return CREW.some(function (c) {
        return ((st[c] || {})[d] || 'free') !== 'busy';
      });
    });
  }

  /* A job needs Peter's crew unless it is office work or sitting at a
     vendor. That single distinction is what makes parallelism real. */
  function needsCrew(job) {
    if (job.vstatus === 'out') return false;
    if (job.needs === 'office') return false;
    return true;
  }

  function atVendor(job) {
    return job.vstatus === 'out';
  }

  function build() {
    var S = global.SFStore, C = global.SFConversions;
    var live = C.liveScores();

    /* Rank by the same score Smart Conversions uses, so the two tools
       can never disagree about which job matters. */
    var ranked = live.all.slice().sort(function (a, b) {
      return b.expected - a.expected;
    });

    var waiting = ranked.filter(function (r) {
      var j = S.get(r.id) || {};
      return atVendor(j);
    });

    var crewJobs = ranked.filter(function (r) {
      var j = S.get(r.id) || {};
      return !atVendor(j) && needsCrew(j);
    });

    var officeJobs = ranked.filter(function (r) {
      var j = S.get(r.id) || {};
      return !atVendor(j) && !needsCrew(j);
    });

    var free = freeDays();

    /* Parallel capacity: how many crew-needing jobs could actually start
       alongside each other, bounded by real free crew. Never a guess. */
    var st = resState();
    var maxFree = 0;
    free.forEach(function (day) {
      var n = CREW.filter(function (c) {
        return ((st[c] || {})[day] || 'free') !== 'busy';
      }).length;
      if (n > maxFree) maxFree = n;
    });

    var parallelNow = Math.min(maxFree, crewJobs.length);

    return {
      today: crewJobs.slice(0, 3),
      officeJobs: officeJobs,
      waiting: waiting,
      freeDays: free,
      maxFreeCrew: maxFree,
      parallelNow: parallelNow,
      /* Office work and vendor-side jobs genuinely run alongside crew
         work — they compete for nothing. */
      trueParallel: officeJobs.length + waiting.length,
      all: ranked,
      stalling: live.stalling
    };
  }

  global.SFQueue = {
    build: build,
    freeDays: freeDays,
    needsCrew: needsCrew,
    atVendor: atVendor,
    CREW: CREW,
    DAYS: DAYS
  };
})(window);

/* ═══════════════════════════════════════════════════════════════════════
   Renderer — draws the computed queue into #sf-queue-computed.
   Kept in the same file as the maths so the numbers on screen and the
   numbers in the model can never drift apart.
   ═══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }

  function money(n) { return '$' + Number(n || 0).toLocaleString('en-US'); }

  function item(r, opts) {
    opts = opts || {};
    var reasons = (r.reasons || []).slice(0, 2).map(function (x) {
      return (x.good ? '▲ ' : '▼ ') + x.txt;
    }).join(' · ');

    return '<div class="queue-item"' + (opts.style ? ' style="' + opts.style + '"' : '') + '>'
      + '<div class="qi-row">'
      +   '<div class="qi-num"' + (opts.numColor ? ' style="color:' + opts.numColor + ';"' : '')
      +     '>' + (opts.num || '') + '</div>'
      +   '<div class="qi-info"><div class="qi-name">' + esc(r.name) + '</div>'
      +     (opts.tag ? '<div style="font-size:9px;color:' + (opts.tagColor || '#F9A825')
                      + ';font-weight:700;">' + esc(opts.tag) + '</div>' : '')
      +   '</div>'
      +   '<div class="qi-badge-wrap">' + (opts.badge || '<span class="qi-seq">—</span>') + '</div>'
      +   '<button class="qi-why" aria-expanded="false">Why?<em class="chevron">▾</em></button>'
      + '</div>'
      + '<div class="qi-explain"><div class="qi-explain-inner">'
      +   (opts.why || (r.stage + ' · ' + money(r.value) + ' · scored ' + r.score + '%'
                        + (reasons ? ' — ' + reasons : '')))
      + '</div></div>'
      + '</div>';
  }

  function callout(bg, border, color, title, body, foot) {
    return '<div style="background:' + bg + ';border:1px solid ' + border
      + ';border-radius:10px;padding:11px 12px;margin-bottom:8px;">'
      + '<div style="font-size:11px;font-weight:800;color:' + color
      + ';margin-bottom:6px;letter-spacing:0.3px;">' + title + '</div>'
      + '<div style="font-size:11px;color:rgba(255,255,255,0.55);line-height:1.6;">' + body + '</div>'
      + (foot ? '<div style="margin-top:8px;padding-top:7px;border-top:1px solid '
                + border + ';font-size:10px;color:rgba(255,255,255,0.32);">' + foot + '</div>' : '')
      + '</div>';
  }

  function render() {
    var host = document.getElementById('sf-queue-computed');
    if (!host) return;

    /* Fail loudly. An earlier silent `return` here rendered an empty
       sidebar that looked like "no work today" — the worst possible
       lie for this tool. */
    if (!global.SFConversions || !global.SFStore) {
      host.innerHTML = '<div style="font-size:11px;color:#E2A0A0;padding:10px 2px;'
        + 'line-height:1.6;">Smart Queue could not load its scoring engine, so it '
        + 'has nothing trustworthy to show. (signflow-conversions.js missing.)</div>';
      return;
    }

    var q = global.SFQueue.build();
    var html = '';

    /* ── Capacity, from the grid Peter edits ── */
    if (q.parallelNow > 1) {
      html += callout('rgba(249,168,37,0.08)', 'rgba(249,168,37,0.25)', '#F9A825',
        '⚡ ' + q.parallelNow + ' JOBS CAN RUN AT THE SAME TIME',
        q.maxFreeCrew + ' of ' + global.SFQueue.CREW.length + ' crew are free on '
          + (q.freeDays.length ? q.freeDays.join(', ') : 'no days this week')
          + '. That is how many crew jobs can move in parallel.',
        'From your crew availability grid — change it and this updates.');
    } else if (q.freeDays.length === 0) {
      html += callout('rgba(194,69,63,0.07)', 'rgba(194,69,63,0.22)', '#C2453F',
        '⛔ NO CREW CAPACITY THIS WEEK',
        'Every crew member is marked busy all five days. Nothing new can start '
          + 'until something frees up.', null);
    }

    /* ── Vendor-side work: real parallelism, no invented dates ── */
    if (q.waiting.length) {
      html += callout('rgba(206,147,216,0.07)', 'rgba(206,147,216,0.22)', '#CE93D8',
        '🔗 ' + q.waiting.length + ' JOB' + (q.waiting.length > 1 ? 'S' : '') + ' WITH A VENDOR',
        q.waiting.map(function (r) {
          return '<strong>' + esc(r.name) + '</strong> — out for work, no crew needed';
        }).join('<br>'),
        'These progress without using your crew, so crew work runs alongside them.');
    }

    /* ── Office work runs alongside anything ── */
    if (q.officeJobs.length) {
      html += callout('rgba(102,187,106,0.06)', 'rgba(102,187,106,0.18)', '#66BB6A',
        '🗂️ ' + q.officeJobs.length + ' CAN MOVE FROM THE OFFICE',
        q.officeJobs.slice(0, 3).map(function (r) {
          return '<strong>' + esc(r.name) + '</strong> — ' + r.stage;
        }).join('<br>'),
        'Quotes, permits and design need no crew — do these while jobs are out.');
    }

    /* ── Today's calls, ranked ── */
    if (!q.today.length && !q.officeJobs.length) {
      html += '<div style="font-size:11.5px;color:rgba(255,255,255,0.4);padding:10px 2px;">'
            + 'No open jobs need attention right now.</div>';
    }

    q.today.forEach(function (r, i) {
      html += item(r, {
        num: String(i + 1),
        badge: '<span class="qi-seq">' + money(r.expected) + '</span>',
        style: i ? 'margin-top:6px;' : ''
      });
    });

    /* ── Gone quiet: same source as Smart Conversions ── */
    if (q.stalling.length) {
      var s0 = q.stalling[0];
      html += '<div style="margin-top:10px;">' + item(s0, {
        num: '❄️',
        numColor: '#4FC3F7',
        tag: s0.inStage + ' days in ' + s0.stage + ' — usually ' + s0.norm,
        tagColor: '#4FC3F7',
        badge: '<span style="font-size:9px;color:#4FC3F7;font-weight:700;">QUIET</span>',
        why: 'Sitting ' + s0.overdueBy + ' days longer than your usual pace at this '
           + 'stage. ' + money(s0.value) + ' still open.'
      }) + '</div>';
    }

    host.innerHTML = html;

    /* Re-attach the action buttons and Why? toggles the engine owns. */
    if (global.SFQueueRefresh) global.SFQueueRefresh();
  }

  global.SFQueueRender = render;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(render, 60); });
  } else {
    setTimeout(render, 60);
  }
})(window);

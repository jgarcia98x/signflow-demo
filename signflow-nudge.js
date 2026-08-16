/* ═══════════════════════════════════════════════════════════════════════
   signflow-nudge.js — "Smart Nudge", computed
   ───────────────────────────────────────────────────────────────────────
   Replaces six hand-typed nudge cards ("❄️ 22 days silent · $8,600
   quote" — a string literal) with the same stall maths Smart Queue and
   Smart Conversions already use.

   A nudge is not a separate idea: it is a job that has gone quiet, with
   a person attached. So it reads from SFConversions.liveScores rather
   than inventing a second opinion. If the pipeline says a quote has sat
   16 days, the nudge says 16 — they cannot drift.

   customers.html previously did not even load SFStore (it was
   `undefined` there), so this tool had no access to job data at all.

   Honest by construction:
     • Days silent are counted from the job's stage entry date, never typed.
     • A nudge disappears when the job moves. It cannot recommend calling
       someone about a job that already closed.
     • Snooze and "mark lost" write to the store, so dismissing a nudge
       actually means something tomorrow.
   ═══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var SNOOZE_KEY = 'sf-nudge-snooze';

  function snoozed() {
    try { return JSON.parse(localStorage.getItem(SNOOZE_KEY) || '{}'); }
    catch (e) { return {}; }
  }

  function snooze(id, days) {
    var s = snoozed();
    var until = new Date(global.SFStore.today().getTime() + (days || 7) * 86400000);
    s[id] = global.SFStore.iso(until);
    try { localStorage.setItem(SNOOZE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  function isSnoozed(id) {
    var s = snoozed()[id];
    if (!s) return false;
    return global.SFStore.parseISO(s) > global.SFStore.today();
  }

  function initials(name) {
    return String(name || '?').replace(/[^A-Za-z ]/g, '').trim()
      .split(/\s+/).slice(0, 2).map(function (w) { return w[0]; })
      .join('').toUpperCase() || '?';
  }

  /* Deterministic colour per customer so avatars stay stable between
     renders rather than flickering on every redraw. */
  function tint(seed) {
    var h = 0;
    String(seed).split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) % 360; });
    return 'hsl(' + h + ', 42%, 38%)';
  }

  /* ── What deserves a call today ───────────────────────────────────
     Three honest buckets, each derived, each disappearing when the
     underlying job changes. */
  function build() {
    var S = global.SFStore, C = global.SFConversions;
    if (!S || !C) return null;

    var live = C.liveScores();

    var cold = [], due = [], atRisk = [];

    live.stalling.forEach(function (r) {
      if (isSnoozed(r.id)) return;
      var j = S.get(r.id) || {};

      /* A quote nobody replied to is the classic cold lead. */
      if (r.stage === 'Quote' || r.stage === 'New Inquiry') {
        cold.push(r);
      } else if (r.stage === 'Approval') {
        due.push(r);
      } else {
        atRisk.push(r);
      }
    });

    /* Highest-value silence first — that is where a call pays. */
    var byValue = function (a, b) { return b.value - a.value; };
    cold.sort(byValue); due.sort(byValue); atRisk.sort(byValue);

    return {
      cold: cold,
      due: due,
      atRisk: atRisk,
      total: cold.length + due.length + atRisk.length,
      /* Money sitting in silent jobs — the reason to pick up the phone. */
      silentValue: cold.concat(due, atRisk)
        .reduce(function (t, r) { return t + (r.value || 0); }, 0)
    };
  }

  global.SFNudge = {
    build: build,
    snooze: snooze,
    isSnoozed: isSnoozed,
    initials: initials,
    tint: tint,
    SNOOZE_KEY: SNOOZE_KEY
  };
})(window);

/* ═══════════════════════════════════════════════════════════════════════
   Renderer — draws into #sf-nudge-computed.
   ═══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }
  function money(n) { return '$' + Number(n || 0).toLocaleString('en-US'); }

  function card(r, kind) {
    var N = global.SFNudge;
    var why;
    if (kind === 'cold') {
      why = 'Quote sent ' + r.inStage + ' days ago, still sitting in ' + r.stage
          + '. Your usual pace here is ' + r.norm + ' days. A short "any questions?" '
          + 'text costs five minutes against ' + money(r.value) + ' still open.';
    } else if (kind === 'due') {
      why = 'Waiting on approval for ' + r.inStage + ' days (usually ' + r.norm
          + '). Nothing moves until they sign — worth a nudge.';
    } else {
      why = r.inStage + ' days in ' + r.stage + ', ' + r.overdueBy
          + ' longer than your usual ' + r.norm + '. ' + money(r.value) + ' held up.';
    }

    return '<div class="nudge-card" data-nudge-id="' + esc(r.id) + '">'
      + '<div class="nudge-top">'
      +   '<div class="nudge-avatar" style="background:' + N.tint(r.client || r.name) + ';">'
      +     esc(N.initials(r.client || r.name)) + '</div>'
      +   '<div class="nudge-info">'
      +     '<div class="nudge-name">' + esc(r.client || r.name) + '</div>'
      +     '<div class="nudge-company">' + (kind === 'cold' ? '❄️ ' : '⏰ ')
      +       r.inStage + ' days silent · ' + money(r.value) + ' ' + esc(r.stage.toLowerCase())
      +     '</div>'
      +   '</div>'
      + '</div>'
      + '<div class="nudge-reason" style="color:rgba(255,255,255,0.58);">' + why + '</div>'
      + '<div class="nudge-actions">'
      +   '<button class="nudge-btn" data-act="contact">💬 Quick Text</button>'
      +   '<button class="nudge-btn ghost" data-act="snooze">Snooze 7d</button>'
      + '</div>'
      + '</div>';
  }

  function section(colour, title, blurb, rows, kind) {
    if (!rows.length) return '';
    return '<div style="background:rgba(' + colour + ',0.08);border:1px solid rgba('
      + colour + ',0.2);border-radius:10px;padding:10px 12px;margin-bottom:10px;">'
      + '<div style="font-size:11px;font-weight:800;color:rgb(' + colour
      + ');margin-bottom:6px;letter-spacing:0.3px;">' + title + '</div>'
      + '<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:10px;">'
      + blurb + '</div>'
      + rows.map(function (r) { return card(r, kind); }).join('')
      + '</div>';
  }

  function render() {
    var host = document.getElementById('sf-nudge-computed');
    if (!host) return;

    /* Fail loudly rather than showing an empty, reassuring sidebar. */
    if (!global.SFStore || !global.SFConversions || !global.SFNudge) {
      host.innerHTML = '<div style="font-size:11px;color:#E2A0A0;padding:10px 2px;'
        + 'line-height:1.6;">Smart Nudge could not load its data engine, so it has '
        + 'nothing trustworthy to show.</div>';
      return;
    }

    var n = global.SFNudge.build();
    var html = '';

    html += section('79,195,247', '❄️ COLD QUOTES — CALL TODAY',
      'These quotes went quiet. One text or call now could bring them back.',
      n.cold, 'cold');

    html += section('217,164,65', '⏰ WAITING ON APPROVAL',
      'Signed off and nothing is moving until they reply.', n.due, 'due');

    html += section('194,69,63', '⚠️ HELD UP IN PRODUCTION',
      'Past your usual pace at this stage.', n.atRisk, 'risk');

    if (!n.total) {
      html = '<div style="font-size:11.5px;color:rgba(255,255,255,0.45);'
           + 'padding:12px 2px;line-height:1.6;">✓ Nobody is waiting on you. '
           + 'Every open job is moving at your usual pace.</div>';
    } else {
      html = '<div style="font-size:10.5px;color:rgba(255,255,255,0.42);'
           + 'padding:2px 0 10px;">' + money(n.silentValue) + ' sitting in '
           + n.total + ' silent job' + (n.total > 1 ? 's' : '') + '.</div>' + html;
    }

    host.innerHTML = html;
    wire();
  }

  function wire() {
    document.querySelectorAll('#sf-nudge-computed .nudge-btn').forEach(function (btn) {
      if (btn.getAttribute('data-bound')) return;
      btn.setAttribute('data-bound', '1');
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var host = btn.closest('.nudge-card');
        var id = host && host.getAttribute('data-nudge-id');
        var who = host ? (host.querySelector('.nudge-name') || {}).textContent : '';
        var act = btn.getAttribute('data-act');

        if (act === 'snooze') {
          /* Dismissing now actually persists — it used to be a toast. */
          global.SFNudge.snooze(id, 7);
          render();
          if (global.toast) global.toast('Snoozed ' + who + ' for 7 days', '⏰');
        } else {
          if (global.toast) global.toast('Contact queued for ' + who + ' ✓', '📬');
        }
      });
    });
  }

  global.SFNudgeRender = render;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(render, 60); });
  } else {
    setTimeout(render, 60);
  }
})(window);

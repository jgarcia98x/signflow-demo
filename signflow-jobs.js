/*! SignFlow — Copyright (c) 2026 Jordan Garcia. All rights reserved.
 *  Proprietary and confidential. Public visibility of this file is for
 *  demonstration hosting only and grants no rights. See LICENSE.
 */
/* ═══════════════════════════════════════════════════════════════
   SignFlow — Job persistence layer
   ───────────────────────────────────────────────────────────────
   The board ships with twelve hand-authored demo cards in the HTML
   plus any jobs Peter adds at runtime. Both need to be editable and
   both need to survive a reload, so this keeps two stores:

     sf-custom-jobs   jobs created in-app          (full records)
     sf-job-overrides edits applied to any card    (sparse patches)
     sf-job-places    stage + order after a drag   (placement only)

   Seeded cards get a stable id derived from their name so the
   override still matches after a redeploy.
   ═══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var K_OVERRIDE = 'sf-job-overrides';
  var K_PLACE    = 'sf-job-places';

  function load(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function save(key, obj) {
    try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {}
  }

  var overrides = load(K_OVERRIDE);
  var places    = load(K_PLACE);

  /* Stable, readable id from the card's name. */
  function slug(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/&amp;/g, '&')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'job';
  }

  function ensureId(card) {
    var id = card.getAttribute('data-job-id');
    if (id) return id;
    var nameEl = card.querySelector('.card-name, .job-block-name');
    var base = slug(nameEl ? nameEl.textContent : '');
    /* de-duplicate if two cards share a name */
    var n = 0, cand = base;
    while (document.querySelector('[data-job-id="' + cand + '"]')) { n++; cand = base + '-' + n; }
    card.setAttribute('data-job-id', cand);
    return cand;
  }

  var PRIORITIES = ['urgent', 'high', 'normal', 'cold', 'lost', 'done'];

  var ICON = { urgent: '🔴', high: '🟡', normal: '⚪', cold: '❄️', lost: '✕', done: '✓' };
  function cap(s) { return String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1); }

  /* ── read a card's current values ────────────────────────── */
  function readCard(card) {
    var pr = 'normal';
    for (var i = 0; i < PRIORITIES.length; i++) {
      if (card.classList.contains(PRIORITIES[i])) { pr = PRIORITIES[i]; break; }
    }
    var valEl = card.querySelector('.card-value');
    var rawVal = valEl && !valEl.classList.contains('muted')
      ? (valEl.textContent || '').replace(/[^0-9.]/g, '') : '';
    var steps = [];
    card.querySelectorAll('.step-item').forEach(function (s) {
      steps.push((s.textContent || '').trim());
    });
    var dueEl = card.querySelector('.card-due');
    return {
      id:       ensureId(card),
      name:     (card.querySelector('.card-name') || {}).textContent || '',
      client:   (card.querySelector('.card-client') || {}).textContent || '',
      priority: pr,
      value:    rawVal,
      due:      dueEl ? (dueEl.textContent || '').trim() : '',
      type:     card.getAttribute('data-job-type') || '',
      steps:    steps
    };
  }

  /* ── write values back onto a card ───────────────────────── */
  function applyToCard(card, data) {
    if (!data) return;

    if (data.name != null) {
      var n = card.querySelector('.card-name');
      if (n) n.textContent = data.name;
    }
    if (data.client != null) {
      var c = card.querySelector('.card-client');
      if (c) c.textContent = data.client;
    }
    if (data.priority) {
      PRIORITIES.forEach(function (p) { card.classList.remove(p); });
      card.classList.add(data.priority);
      var lbl = card.querySelector('.priority-label');
      if (lbl) {
        PRIORITIES.forEach(function (p) { lbl.classList.remove(p); });
        lbl.classList.add(data.priority);
        /* Seeded cards sometimes use bespoke copy ("📞 Incoming").
           Only normalise the text when it looks like a priority word. */
        var txt = (lbl.textContent || '').trim();
        var looksPriority = new RegExp(PRIORITIES.join('|'), 'i').test(txt);
        if (looksPriority || data._forceLabel) {
          lbl.textContent = ICON[data.priority] + ' ' + cap(data.priority);
        }
      }
    }
    if (data.value != null) {
      var v = card.querySelector('.card-value');
      if (v) {
        if (data.value === '' || data.value == null) {
          v.classList.add('muted'); v.textContent = 'TBD';
        } else {
          v.classList.remove('muted');
          v.textContent = '$' + Number(data.value).toLocaleString();
        }
      }
    }
    if (data.due != null) {
      var d = card.querySelector('.card-due');
      if (d) d.textContent = data.due || 'TBD';
    }
    if (data.type) card.setAttribute('data-job-type', data.type);

    if (data.steps && data.steps.length) {
      var items = card.querySelectorAll('.step-item');
      data.steps.forEach(function (txt, i) {
        if (!items[i]) return;
        var box = items[i].querySelector('input');
        items[i].textContent = ' ' + txt;
        if (box) items[i].insertBefore(box, items[i].firstChild);
      });
    }
  }

  /* ── public API ──────────────────────────────────────────── */
  var API = {
    PRIORITIES: PRIORITIES,
    ensureId: ensureId,
    read: readCard,
    apply: applyToCard,

    /* Persist an edit and reflect it immediately. */
    update: function (card, patch) {
      var id = ensureId(card);
      overrides[id] = Object.assign({}, overrides[id] || {}, patch);
      save(K_OVERRIDE, overrides);
      applyToCard(card, patch);
      return id;
    },

    getOverride: function (id) { return overrides[id] || null; },

    /* Store the real ISO due date for a card. Kept separate from the
       display string so the chip text stays derived (and can re-colour
       as a date approaches) rather than frozen at whatever was typed. */
    setDue: function (card, isoStr) {
      var id = ensureId(card);
      overrides[id] = Object.assign({}, overrides[id] || {}, { dueISO: isoStr || '' });
      save(K_OVERRIDE, overrides);
      if (isoStr) card.setAttribute('data-due-iso', isoStr);
      else card.removeAttribute('data-due-iso');
      return id;
    },

    /* Restore saved edits onto every card currently in the DOM.
       Due dates are re-derived from the stored ISO value rather than
       replayed as text, so a card saved as "Due tomorrow" doesn't still
       claim that a week later. */
    hydrate: function (selector) {
      document.querySelectorAll(selector || '.card').forEach(function (card) {
        var id = ensureId(card);
        var o = overrides[id];
        if (!o) return;
        applyToCard(card, o);

        if (o.dueISO) {
          card.setAttribute('data-due-iso', o.dueISO);
          var chip = card.querySelector('.card-due');
          if (chip && global.SFStore) {
            var d = SFStore.parseISO(o.dueISO);
            if (d) {
              var diff = SFStore.daysBetween(SFStore.today(), d);
              var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul',
                         'Aug','Sep','Oct','Nov','Dec'];
              var lab = MON[d.getMonth()] + ' ' + d.getDate();
              chip.textContent = diff < 0   ? 'Overdue ' + lab
                               : diff === 0 ? 'Due today'
                               : diff === 1 ? 'Due tomorrow'
                               : 'Due ' + lab;
              chip.classList.remove('soon', 'overdue');
              if (diff < 0) chip.classList.add('overdue');
              else if (diff <= 3) chip.classList.add('soon');
            }
          }
        }
      });
    },

    /* Remember where a card was dropped. */
    place: function (card, zoneKey, index) {
      var id = ensureId(card);
      places[id] = { zone: zoneKey, index: index };
      save(K_PLACE, places);
    },
    getPlace: function (id) { return places[id] || null; },
    allPlaces: function () { return places; },

    reset: function () {
      overrides = {}; places = {};
      save(K_OVERRIDE, overrides); save(K_PLACE, places);
    }
  };

  global.SFJobs = API;
})(window);

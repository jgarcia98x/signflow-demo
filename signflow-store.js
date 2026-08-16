/*! SignFlow — Copyright (c) 2026 Jordan Garcia. All rights reserved.
 *  Proprietary and confidential. Public visibility of this file is for
 *  demonstration hosting only and grants no rights. See LICENSE.
 */
/* ═══════════════════════════════════════════════════════════════════════
   signflow-store.js — one shared job record for the whole app
   ───────────────────────────────────────────────────────────────────────
   Before this file, the same fifteen jobs existed three times: as
   hardcoded cards in index.html, as a JOBS array in jobs.html, and as
   assorted hand-typed figures in reports.html. Editing a job in the
   pipeline changed nothing anywhere else, and the Reports numbers were
   invented rather than derived.

   This module is the single source of truth. It owns:
     • real Date objects for due dates (so sorting and overdue/soon
       colouring are computed, never hand-typed)
     • stage history with timestamps, which is what makes any
       conversion or velocity measurement possible at all
     • a localStorage overlay so edits survive a reload

   SEEDED HISTORY — READ THIS
   The stage history below is generated sample data, not real events.
   A brand-new board has no history, so every velocity and conversion
   figure would read zero for weeks. Seeding makes the feature legible
   on day one. Everything seeded is flagged `seeded: true` and the UI
   labels it as sample data — nothing derived from it should ever be
   presented as measured fact.

   Once Peter starts dragging cards for real, `logStage()` appends
   genuine entries and the seeded rows age out of the trailing window
   naturally.
   ═══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var LS_JOBS = 'sf-store-jobs';      /* edits + new jobs        */
  var LS_HIST = 'sf-store-history';   /* real stage transitions  */

  /* Pipeline order. Index matters: progress is measured by position. */
  var STAGES = ['New Inquiry', 'Quote', 'Design', 'Approval',
                'Fabrication', 'Install', 'Complete'];

  /* Jordan's call: Install is the win line. A job that reaches Install
     is won — the truck is loaded and the customer is committed.
     Complete is just the paperwork catching up. */
  var WIN_STAGE = 'Install';
  var WIN_INDEX = STAGES.indexOf(WIN_STAGE);

  /* "Today" for the mockup. The demo data sits in early August 2026, so
     pinning the clock keeps overdue/soon colouring stable rather than
     drifting as real time passes. Swap to `new Date()` when this is
     wired to live data. */
  var TODAY = new Date(2026, 7, 3);   /* Aug 3 2026, month is 0-based */

  function today() { return new Date(TODAY.getTime()); }

  function slug(name) {
    return String(name).toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  }

  function iso(d) {
    if (!d) return null;
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }

  function parseISO(s) {
    if (!s) return null;
    var p = String(s).split('-').map(Number);
    if (p.length !== 3 || !p[0]) return null;
    return new Date(p[0], p[1] - 1, p[2]);
  }

  function daysBetween(a, b) {
    if (!a || !b) return null;
    return Math.round((b - a) / 86400000);
  }

  /* ── Seed data ──────────────────────────────────────────────────────
     Lifted verbatim from the jobs.html table, which was the most
     complete of the three copies. `due` is now a real date; `entered`
     is when the job landed in its current stage; `started` is when it
     first appeared as a New Inquiry. */
  var SEED = [
    { name:"Kohl's #0394 — Pylon Reface",       client:"Kohl's Corporation",        stage:'Install',     type:'outdoor', value:19500, due:'2026-08-04', priority:'urgent', started:'2026-06-18', entered:'2026-08-01' },
    { name:'Heritage Bank — Branch Refresh',     client:'Heritage Community Bank',   stage:'Fabrication', type:'indoor',  value:58000, due:'2026-08-08', priority:'urgent', started:'2026-06-02', entered:'2026-07-28' },
    { name:'Summit Tech Park — Monument Sign',   client:'Summit Tech Park LLC',      stage:'Fabrication', type:'outdoor', value:41000, due:'2026-08-08', priority:'urgent', started:'2026-06-10', entered:'2026-07-25' },
    { name:'La Paloma Restaurant — Exterior',    client:'La Paloma Group',           stage:'Install',     type:'outdoor', value:11200, due:'2026-08-05', priority:'high',   started:'2026-07-08', entered:'2026-08-02' },
    { name:'Prairie Wind Storage — Exterior',    client:'Prairie Wind Self Storage', stage:'Approval',    type:'outdoor', value:22100, due:'2026-08-07', priority:'normal', started:'2026-06-28', entered:'2026-07-30' },
    { name:'Village Tap — Blade Sign',           client:'The Village Tap',           stage:'Approval',    type:'outdoor', value:9200,  due:'2026-08-01', priority:'urgent', started:'2026-06-20', entered:'2026-07-18' },
    { name:'Northside Gym — Vehicle Wrap',       client:'Northside Fitness',         stage:'Fabrication', type:'indoor',  value:6400,  due:'2026-08-06', priority:'high',   started:'2026-07-12', entered:'2026-07-29' },
    { name:'Walgreens #4712 — Façade',           client:'Walgreens (National)',      stage:'Fabrication', type:'outdoor', value:24800, due:'2026-08-12', priority:'normal', started:'2026-06-05', entered:'2026-07-22' },
    { name:'Downtown Diner — Channel Letters',   client:'Main St. Restaurant Group', stage:'Quote',       type:'indoor',  value:7200,  due:'2026-08-10', priority:'high',   started:'2026-07-25', entered:'2026-07-27' },
    { name:'Riverside Auto — Pylon Sign',        client:'Riverside Automotive',      stage:'Quote',       type:'outdoor', value:18400, due:'2026-08-05', priority:'urgent', started:'2026-07-20', entered:'2026-07-24' },
    { name:'Westside Fitness',                   client:'Westside Fitness',          stage:'New Inquiry', type:'indoor',  value:null,  due:null,         priority:'normal', started:'2026-08-03', entered:'2026-08-03' },
    { name:'Joliet Tire & Auto',                 client:'Walk-in',                   stage:'New Inquiry', type:'outdoor', value:null,  due:null,         priority:'normal', started:'2026-08-01', entered:'2026-08-01' },
    { name:'Bricktown Brewery — Outdoor Sign',   client:'Bricktown Craft Brewing',   stage:'Quote',       type:'outdoor', value:8600,  due:'2026-07-12', priority:'cold',   started:'2026-05-30', entered:'2026-06-14' },
    { name:'Valley Fresh Grocery — Storefront',  client:'Valley Fresh Foods',        stage:'Quote',       type:'outdoor', value:14300, due:'2026-06-28', priority:'lost',   started:'2026-05-12', entered:'2026-05-28' },
    { name:'Speedway #1188 — LED Retrofit',      client:'Speedway LLC',              stage:'Complete',    type:'indoor',  value:34100, due:'2026-07-30', priority:'done',   started:'2026-05-20', entered:'2026-07-26' }
  ];

  /* Closed jobs from earlier in the year. The live board only shows
     current work, so without these there is far too little history to
     say anything about which jobs convert — two won jobs is not a
     pattern. These are explicitly seeded/archived. */
  var SEED_CLOSED = [
    { name:'Fairview Dental — Monument',    client:'Fairview Dental Group',  type:'outdoor', value:16800, priority:'normal', started:'2026-05-02', won:'2026-05-27', source:'Referral' },
    { name:'Metro Storage — Wayfinding',    client:'Metro Storage Partners', type:'outdoor', value:12400, priority:'normal', started:'2026-04-18', won:'2026-05-20', source:'Repeat' },
    { name:'Oakbrook Salon — Window',       client:'Oakbrook Salon',         type:'indoor',  value:3200,  priority:'normal', started:'2026-05-14', won:'2026-06-16', source:'Web' },
    { name:'Titan Auto Group — Pylon',      client:'Titan Auto Group',       type:'outdoor', value:47500, priority:'high',   started:'2026-03-28', won:'2026-05-04', source:'Referral' },
    { name:'Lakeshore Cafe — Blade',        client:'Lakeshore Cafe',         type:'outdoor', value:5400,  priority:'normal', started:'2026-05-22', won:'2026-06-09', source:'Walk-in' },
    { name:'Pinnacle Dental — Channel Ltr', client:'Pinnacle Dental',        type:'indoor',  value:21300, priority:'normal', started:'2026-04-06', won:'2026-05-12', source:'Referral' },
    { name:'Grove Market — Facade',         client:'Grove Market',           type:'outdoor', value:28900, priority:'high',   started:'2026-03-15', won:'2026-05-01', source:'Repeat' },
    { name:'Cedar Vet Clinic — Monument',   client:'Cedar Veterinary',       type:'outdoor', value:9800,  priority:'normal', started:'2026-05-08', won:'2026-06-25', source:'Web' },
    { name:'Redline Fitness — Wall Wrap',   client:'Redline Fitness',        type:'indoor',  value:7600,  priority:'normal', started:'2026-06-01', won:'2026-07-14', source:'Web' },
    { name:'Harbor Point — Directory',      client:'Harbor Point Mgmt',      type:'indoor',  value:31200, priority:'high',   started:'2026-03-02', won:'2026-04-21', source:'Repeat' }
  ];

  /* Jobs that died. Without these, conversion rate is meaningless —
     you cannot compute a win rate from winners alone. */
  var SEED_LOST = [
    { name:'Brightway Cleaners — Sign',   client:'Brightway Cleaners',  type:'outdoor', value:6200,  started:'2026-04-10', lost:'2026-05-18', source:'Web' },
    { name:'Copper Kettle — Channel Ltr', client:'Copper Kettle Pub',   type:'indoor',  value:11400, started:'2026-04-22', lost:'2026-06-02', source:'Web' },
    { name:'Sunset Motors — Pylon',       client:'Sunset Motors',       type:'outdoor', value:38000, started:'2026-03-19', lost:'2026-05-30', source:'Cold call' },
    { name:'Ridgeway Apartments — Entry', client:'Ridgeway Property',   type:'outdoor', value:15600, started:'2026-04-28', lost:'2026-06-20', source:'Web' },
    { name:'Basil & Vine — Window',       client:'Basil & Vine Bistro', type:'indoor',  value:2900,  started:'2026-05-16', lost:'2026-06-11', source:'Walk-in' },
    { name:'Northgate Plaza — Monument',  client:'Northgate Plaza LLC', type:'outdoor', value:52000, started:'2026-02-24', lost:'2026-05-08', source:'Cold call' },
    { name:'Quick Lube 5 — Wall Sign',    client:'Quick Lube Express',  type:'outdoor', value:4800,  started:'2026-05-30', lost:'2026-07-02', source:'Cold call' }
  ];

  /* Lead source for open jobs — needed to compare which channels
     actually convert. Keyed by slug. */
  var SOURCES = {
    "kohl-s-0394-pylon-reface":'Repeat', 'heritage-bank-branch-refresh':'Referral',
    'summit-tech-park-monument-sign':'Referral', 'la-paloma-restaurant-exterior':'Web',
    'prairie-wind-storage-exterior':'Web', 'village-tap-blade-sign':'Walk-in',
    'northside-gym-vehicle-wrap':'Web', 'walgreens-4712-fa-ade':'Repeat',
    'downtown-diner-channel-letters':'Referral', 'riverside-auto-pylon-sign':'Web',
    'westside-fitness':'Walk-in', 'joliet-tire-auto':'Walk-in',
    'bricktown-brewery-outdoor-sign':'Cold call', 'valley-fresh-grocery-storefront':'Cold call',
    'speedway-1188-led-retrofit':'Repeat'
  };

  function lsGet(k, fb) {
    try { var r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; }
    catch (e) { return fb; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }

  /* ── Build the working set: seed + saved edits ─────────────────── */
  function all() {
    var edits = lsGet(LS_JOBS, {});
    var out = SEED.map(function (j) {
      var id = slug(j.name);
      var rec = Object.assign({ id: id, seeded: true, source: SOURCES[id] || '' }, j);
      if (edits[id]) Object.assign(rec, edits[id]);
      rec.dueDate = parseISO(rec.due);
      return rec;
    });
    /* Jobs Peter created himself */
    Object.keys(edits).forEach(function (id) {
      if (edits[id] && edits[id].__new && !out.some(function (r) { return r.id === id; })) {
        /* Was hardcoded to 'Web', which quietly invented data: every job
           Peter added counted as a web lead whether it was or not. Now
           unset unless he actually recorded a source. */
        var rec = Object.assign({ id: id, seeded: false, source: '' }, edits[id]);
        rec.dueDate = parseISO(rec.due);
        out.push(rec);
      }
    });
    return out;
  }

  function get(id) {
    return all().filter(function (j) { return j.id === id; })[0] || null;
  }

  /* Persist a patch. Only changed keys are written, so seed updates
     still flow through for untouched fields. */
  function update(id, patch) {
    var edits = lsGet(LS_JOBS, {});
    edits[id] = Object.assign({}, edits[id], patch);
    lsSet(LS_JOBS, edits);
    return edits[id];
  }

  function createJob(rec) {
    /* Honour an explicit id. The board de-duplicates cards that share a
       name ("acme-sign-1"), and if the store re-derives the slug instead
       the two disagree — the record then belongs to no card on screen. */
    var id = rec.id || slug(rec.name || ('job-' + Date.now()));
    update(id, Object.assign({ __new: true }, rec, { id: id }));
    return id;
  }

  /* ── Stage history ─────────────────────────────────────────────── */
  function history() { return lsGet(LS_HIST, []); }

  function logStage(id, from, to) {
    if (from === to) return;
    var h = history();
    h.push({ id: id, from: from, to: to, at: iso(today()), real: true });
    lsSet(LS_HIST, h);
    update(id, { stage: to, entered: iso(today()) });
  }

  /* Days a job has sat in its current stage. */
  function daysInStage(job) {
    var e = parseISO(job.entered);
    return e ? daysBetween(e, today()) : null;
  }

  /* Days from first inquiry to reaching the win line, for jobs that
     got there. Returns null for jobs still in flight. */
  function daysToWin(job) {
    var si = STAGES.indexOf(job.stage);
    if (si < WIN_INDEX) return null;
    var start = parseISO(job.started);
    var won = parseISO(job.wonAt || job.entered);
    return daysBetween(start, won);
  }

  function isWon(job) { return STAGES.indexOf(job.stage) >= WIN_INDEX; }

  /* ── Due date helpers ──────────────────────────────────────────── */
  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function fmtDue(job) {
    var d = job.dueDate || parseISO(job.due);
    if (!d) return '—';
    var diff = daysBetween(today(), d);
    var label = MON[d.getMonth()] + ' ' + d.getDate();
    if (diff < 0)  return 'Overdue ' + label;
    if (diff === 0) return 'Due today';
    if (diff === 1) return 'Due tomorrow';
    return 'Due ' + label;
  }

  /* Colour class is derived, never hand-typed. */
  function dueClass(job) {
    var d = job.dueDate || parseISO(job.due);
    if (!d) return '';
    var diff = daysBetween(today(), d);
    if (diff < 0) return 'overdue';
    if (diff <= 3) return 'soon';
    return '';
  }

  global.SFStore = {
    STAGES: STAGES, WIN_STAGE: WIN_STAGE, WIN_INDEX: WIN_INDEX,
    SEED_CLOSED: SEED_CLOSED, SEED_LOST: SEED_LOST,
    today: today, slug: slug, iso: iso, parseISO: parseISO,
    daysBetween: daysBetween,
    all: all, get: get, update: update, createJob: createJob,
    history: history, logStage: logStage,
    daysInStage: daysInStage, daysToWin: daysToWin, isWon: isWon,
    fmtDue: fmtDue, dueClass: dueClass,
    reset: function () {
      try { localStorage.removeItem(LS_JOBS); localStorage.removeItem(LS_HIST); } catch (e) {}
    }
  };
})(window);

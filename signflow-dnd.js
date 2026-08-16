/*! SignFlow — Copyright (c) 2026 Jordan Garcia. All rights reserved.
 *  Proprietary and confidential. Public visibility of this file is for
 *  demonstration hosting only and grants no rights. See LICENSE.
 */
/* ═══════════════════════════════════════════════════════════════
   SignFlow — Unified Drag & Drop
   Pointer-events based. Works on macOS (mouse/trackpad), iPadOS and
   iOS (touch). Deliberately does NOT use the HTML5 drag-and-drop API,
   which is unsupported in mobile Safari.

   Behaviour:
     • Mouse/pen  → drag begins after 4px of movement.
     • Touch      → drag begins after a 220ms long-press, so normal
                    vertical scrolling of the board still works.
     • A floating clone follows the pointer; the original stays in
       place as a dimmed placeholder until the drop resolves.
     • Edge auto-scroll for horizontal boards and the page itself.

   Usage:
     SFDnD.init({
       item:      '.card',              // draggable elements
       container: '.col',               // valid drop zones
       handleCancel: '.step-item, input, button, a, select, textarea',
       reorder:   true,                 // allow sorting within a zone
       onDrop:    function(el, toZone, fromZone){ ... }
     });
   ═══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var MOVE_THRESHOLD = 4;    // px before a mouse drag engages
  var TOUCH_HOLD_MS  = 220;  // long-press duration for touch
  var TOUCH_SLOP     = 10;   // px of finger travel that cancels the hold
  var EDGE           = 64;   // px from edge that triggers auto-scroll
  var EDGE_SPEED     = 18;   // px per frame at the very edge

  /* ── one-time stylesheet ─────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('sf-dnd-styles')) return;
    var s = document.createElement('style');
    s.id = 'sf-dnd-styles';
    s.textContent = [
      '.sf-drag-ghost{position:fixed;z-index:100000;pointer-events:none;',
      '  margin:0!important;opacity:.95;',
      '  transform-origin:center;will-change:transform;',
      '  box-shadow:0 18px 46px rgba(0,0,0,.62),0 0 0 1px rgba(255,255,255,.14);',
      '  border-radius:10px;overflow:hidden;}',
      '.sf-drag-source{opacity:.28!important;filter:saturate(.4);}',
      '.sf-drop-active{background:rgba(255,255,255,.045)!important;',
      '  outline:2px dashed rgba(120,170,235,.55);outline-offset:-3px;border-radius:10px;}',
      '.sf-drop-line{height:0;border-top:2px solid rgba(120,170,235,.9);',
      '  margin:3px 0;border-radius:2px;pointer-events:none;}',
      '.sf-dragging,.sf-dragging *{cursor:grabbing!important;}',
      '.sf-dragging{-webkit-user-select:none;user-select:none;',
      '  -webkit-touch-callout:none;}',
      /* iOS pops a selection magnifier / callout on long-press. That
         fires during our 220ms hold and steals the gesture, so it has
         to be suppressed BEFORE the drag starts, not once .sf-dragging
         lands — by then the hold has already been hijacked. */
      '.sf-drag-item{-webkit-touch-callout:none!important;',
      '  -webkit-user-select:none!important;user-select:none!important;}',
      /* Only suppress native gestures while a drag is genuinely live, so
         the board scrolls normally the rest of the time. */
      '.sf-dragging *{touch-action:none!important;}'
    ].join('');
    document.head.appendChild(s);
  }

  /* ── helpers ─────────────────────────────────────────────── */
  function closestMatch(node, sel, root) {
    while (node && node !== root && node !== document.body) {
      if (node.nodeType === 1 && node.matches && node.matches(sel)) return node;
      node = node.parentNode;
    }
    return null;
  }

  function scrollableAncestor(el) {
    var n = el && el.parentNode;
    while (n && n.nodeType === 1) {
      var st = getComputedStyle(n);
      var ox = st.overflowX;
      if ((ox === 'auto' || ox === 'scroll') && n.scrollWidth > n.clientWidth + 4) return n;
      n = n.parentNode;
    }
    return null;
  }

  /* ═══════════════════════════════════════════════════════════
     Instance
     ═══════════════════════════════════════════════════════════ */
  function init(cfg) {
    injectStyles();

    var itemSel   = cfg.item;
    var zoneSel   = cfg.container;
    var cancelSel = cfg.handleCancel || 'input,button,select,textarea,a,label';
    var allowSort = cfg.reorder !== false;
    var onDrop    = cfg.onDrop || function () {};
    var onStart   = cfg.onStart || function () {};
    var root      = cfg.root ? document.querySelector(cfg.root) : document;
    if (!root) return;

    var st = null;         // live drag state
    var holdTimer = null;
    var pending = null;    // candidate before drag engages
    var rafId = null;

    /* ── begin an actual drag ──────────────────────────────── */
    function engage(x, y) {
      var el = pending.el;
      var r  = el.getBoundingClientRect();

      var ghost = el.cloneNode(true);
      ghost.className = el.className + ' sf-drag-ghost';
      ghost.style.width  = r.width + 'px';
      ghost.style.height = r.height + 'px';
      ghost.style.left = '0px';
      ghost.style.top  = '0px';
      /* neutralise any layout-dependent positioning from the source */
      ghost.style.position = 'fixed';
      ghost.style.right = 'auto';
      ghost.style.bottom = 'auto';
      document.body.appendChild(ghost);

      st = {
        el: el,
        ghost: ghost,
        fromZone: closestMatch(el, zoneSel, root) || el.parentNode,
        offX: x - r.left,
        offY: y - r.top,
        x: x, y: y,
        zone: null,
        marker: document.createElement('div'),
        scroller: scrollableAncestor(el)
      };
      st.marker.className = 'sf-drop-line';

      el.classList.add('sf-drag-source');
      document.documentElement.classList.add('sf-dragging');
      paint();
      loop();
      onStart(el);
    }

    function paint() {
      if (!st) return;
      var gx = st.x - st.offX;
      var gy = st.y - st.offY;
      st.ghost.style.transform =
        'translate3d(' + gx + 'px,' + gy + 'px,0) scale(1.03) rotate(.6deg)';
    }

    /* ── resolve what's under the pointer ──────────────────── */
    function updateTarget() {
      if (!st) return;
      st.ghost.style.visibility = 'hidden';
      var under = document.elementFromPoint(st.x, st.y);
      st.ghost.style.visibility = '';
      if (!under) return;

      var zone = closestMatch(under, zoneSel, root);

      if (zone !== st.zone) {
        if (st.zone) st.zone.classList.remove('sf-drop-active');
        st.zone = zone;
        if (zone) zone.classList.add('sf-drop-active');
      }
      if (!zone) {
        if (st.marker.parentNode) st.marker.parentNode.removeChild(st.marker);
        return;
      }

      /* Work out insertion point among siblings */
      var sibs = [], all = zone.querySelectorAll(itemSel);
      for (var i = 0; i < all.length; i++) {
        if (all[i] !== st.el && !all[i].classList.contains('sf-drag-ghost')) sibs.push(all[i]);
      }

      if (!allowSort) {
        if (st.marker.parentNode) st.marker.parentNode.removeChild(st.marker);
        return;
      }

      var before = null;
      for (var j = 0; j < sibs.length; j++) {
        var rb = sibs[j].getBoundingClientRect();
        if (st.y < rb.top + rb.height / 2) { before = sibs[j]; break; }
      }
      if (before) zone.insertBefore(st.marker, before);
      else zone.appendChild(st.marker);
    }

    /* ── edge auto-scroll ──────────────────────────────────── */
    function autoScroll() {
      if (!st) return;
      var sc = st.scroller;
      if (sc) {
        var r = sc.getBoundingClientRect();
        if (st.x < r.left + EDGE)  sc.scrollLeft -= EDGE_SPEED * ((r.left + EDGE - st.x) / EDGE);
        if (st.x > r.right - EDGE) sc.scrollLeft += EDGE_SPEED * ((st.x - (r.right - EDGE)) / EDGE);
      }
      var vh = window.innerHeight;
      if (st.y < EDGE)      window.scrollBy(0, -EDGE_SPEED * ((EDGE - st.y) / EDGE));
      if (st.y > vh - EDGE) window.scrollBy(0,  EDGE_SPEED * ((st.y - (vh - EDGE)) / EDGE));
    }

    function loop() {
      if (!st) { rafId = null; return; }
      autoScroll();
      rafId = requestAnimationFrame(loop);
    }

    /* ── finish ────────────────────────────────────────────── */
    function finish(commit) {
      if (!st) return;
      var s = st; st = null;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

      if (s.ghost.parentNode) s.ghost.parentNode.removeChild(s.ghost);
      s.el.classList.remove('sf-drag-source');
      document.documentElement.classList.remove('sf-dragging');
      if (s.zone) s.zone.classList.remove('sf-drop-active');

      var moved = false;
      if (commit && s.zone) {
        if (allowSort && s.marker.parentNode === s.zone) {
          s.zone.insertBefore(s.el, s.marker);
          moved = true;
        } else if (s.zone !== s.fromZone) {
          s.zone.appendChild(s.el);
          moved = true;
        }
      }
      if (s.marker.parentNode) s.marker.parentNode.removeChild(s.marker);

      if (moved) {
        s.el.animate(
          [{ transform: 'scale(1.04)' }, { transform: 'scale(1)' }],
          { duration: 170, easing: 'cubic-bezier(.2,.9,.3,1)' }
        );
        onDrop(s.el, s.zone, s.fromZone);
      }
    }

    /* ── pointer plumbing ──────────────────────────────────── */
    function onDown(e) {
      if (e.button != null && e.button !== 0) return;      // primary only
      var el = closestMatch(e.target, itemSel, root);
      if (!el) return;
      if (cancelSel && closestMatch(e.target, cancelSel, el)) return;  // let controls work

      pending = { el: el, x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch', id: e.pointerId };
      el.classList.add('sf-drag-item');

      if (pending.touch) {
        holdTimer = setTimeout(function () {
          holdTimer = null;
          if (!pending) return;
          if (navigator.vibrate) { try { navigator.vibrate(8); } catch (_) {} }
          engage(pending.x, pending.y);
          updateTarget();
        }, TOUCH_HOLD_MS);
      }
    }

    function onMove(e) {
      if (st) {
        st.x = e.clientX; st.y = e.clientY;
        paint();
        updateTarget();
        e.preventDefault();
        return;
      }
      if (!pending) return;

      var dx = Math.abs(e.clientX - pending.x);
      var dy = Math.abs(e.clientY - pending.y);

      if (pending.touch) {
        /* finger wandered before the hold completed → treat as a scroll */
        if (holdTimer && (dx > TOUCH_SLOP || dy > TOUCH_SLOP)) {
          clearTimeout(holdTimer); holdTimer = null; pending = null;
        }
        return;
      }
      if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
        engage(e.clientX, e.clientY);
        st.x = e.clientX; st.y = e.clientY;
        paint(); updateTarget();
      }
    }

    function onUp() {
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
      var wasDragging = !!st;
      finish(true);
      pending = null;
      /* Swallow the click that follows a real drag so the detail panel
         doesn't pop open the moment a card is dropped. */
      if (wasDragging) {
        window.addEventListener('click', function swallow(ev) {
          ev.stopPropagation(); ev.preventDefault();
          window.removeEventListener('click', swallow, true);
        }, true);
      }
    }

    function onCancel() {
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
      finish(false);
      pending = null;
    }

    /* ── The iOS fix ────────────────────────────────────────────
       Safari ignores preventDefault() on pointermove for the purposes
       of scrolling. If the page is going to stop scrolling mid-drag,
       it must be a non-passive touchmove handler that says so —
       otherwise Safari commits the gesture to a scroll and fires
       pointercancel, which killed every drag on iPad.

       Only prevents while a drag is genuinely engaged, so ordinary
       scrolling of the board is untouched. */
    function onTouchMove(ev) {
      if (st) ev.preventDefault();
    }
    document.addEventListener('touchmove', onTouchMove, { passive: false });

    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    /* Safari fires this when a system gesture steals the pointer */
    window.addEventListener('blur', onCancel);

    return { destroy: function () {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      document.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('blur', onCancel);
    }};
  }

  global.SFDnD = { init: init };
})(window);

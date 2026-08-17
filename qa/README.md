# SignFlow demo — mobile QA harness

Measured verification for the prospect demo. **Run these before claiming any
mobile/layout fix works.** Reasoning about CSS from source is guessing — this
harness exists because three consecutive rounds of mobile fixes were shipped
blind on 2026-08-16 and all three were wrong.

## Setup

```bash
npm i playwright          # or reuse an existing install
npx playwright install webkit
```

## Scripts

| Script | Asserts |
|---|---|
| `mobaudit.js` | Per-tab sweep: horizontal overflow, board/wrap scroll delta, zoom-pill position, filter-pill text offset vs pill height, overlap pairs |
| `scrollchk.js` | `window.scrollY` actually changes; enumerates which element is genuinely scrollable |
| `ovcheck.js` | True overlaps only (skips ancestor/descendant); board scroll; filter tray collapsed state |
| `ovf.js` | Every element whose `right` exceeds the viewport, sorted by DOM depth — finds the *outermost* offender |
| `shot.js` | iPhone screenshots of each tab, for vision review |

```bash
node qa/scrollchk.js      # start here — a broken page scroll hides everything else
node qa/mobaudit.js
node qa/ovcheck.js
```

## Gotchas these encode

- **`CSS zoom` does not shrink `scrollWidth` in mobile Safari.** Use
  `transform:scale` + negative margin, or the container scrolls its unzoomed width.
- Use a **device descriptor** (`devices['iPhone 13']`), not a narrow window —
  touch flags and `pointer:coarse` change behaviour.
- Measure natural size after **double `requestAnimationFrame`**; first-paint
  `scrollWidth` is wrong.
- The app shell is `body{height:100vh;overflow:hidden}` with inner panes
  scrolling. Releasing a child to `height:auto` without releasing that clipped
  ancestor **silently traps content** (once: 3754px unreachable on Customers).
- Skip **ancestor/descendant pairs** in overlap checks, and measure fixed-element
  collisions at the scroll position where they'd actually occur.
- Vision review generates good *candidates* but is not ground truth — confirm
  each with geometry.

Full write-up: vault → `Knowledge/SignFlow — Mobile Layout Debugging & Demo Hardening.md`

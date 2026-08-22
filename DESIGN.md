# Design language — pointer

The authoritative design language for ShopAnvil lives in the app repo:

**`/Users/jg/Developer/signflow/DESIGN.md`**

It is a **gate**: no UI work ships, in this demo or the app, without
conforming to it. Tokens are enforced in the app at `src/index.css` (`@theme`).

## In this repo

`signflow-design.css` implements the cheap (S-cost) rules as an override
layer: type scale, weight collapse, radius collapse, glow removal, glass
reduction, red discipline, motion consolidation.

It must load **last** — after `signflow-calm.css` *and* after the inline
`<style>` blocks in each page body, which otherwise win on source order.
It is linked at the end of `<body>` for exactly that reason.

## Do not copy this to Peter's repo

`jgarcia98x/signflow-mockups` is a pilot customer's frozen copy. Copying
shared files across the two repos has silently reverted fixes before.
Patch each repo separately, and `git diff --stat` right after.

## Verification

```
node qa/design-audit.js before|after   # measured token conformance
node qa/regress.js                     # no JS errors, no trapped scroll
node qa/drag-perf.js                   # drag cost vs harness idle floor
node qa/analytics-verify.js            # 89 assertions, analytics posture
```

Playwright is not resolvable from this repo; run from an install that has it.

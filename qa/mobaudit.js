const { webkit, devices } = require('playwright');
const BASE = 'https://jgarcia98x.github.io/signflow-demo/';
const PAGES = ['index.html','schedule.html','customers.html','jobs.html','reports.html','settings.html'];

(async () => {
  const b = await webkit.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  const allErrs = {};

  for (const page of PAGES) {
    const errs = [];
    p.removeAllListeners('pageerror');
    p.on('pageerror', e => errs.push(e.message));
    try {
      await p.goto(BASE + page + '?demo=Test+Co', { waitUntil: 'networkidle', timeout: 25000 });
    } catch (e) { console.log(`\n### ${page}: NAV FAIL ${e.message}`); continue; }
    await p.waitForTimeout(1800);

    const r = await p.evaluate(() => {
      const vw = window.innerWidth, vh = window.innerHeight;
      const g = s => { const e = document.querySelector(s); if (!e) return null;
        const b = e.getBoundingClientRect(); const cs = getComputedStyle(e);
        return { w:+b.width.toFixed(1), h:+b.height.toFixed(1),
                 t:+b.top.toFixed(1), l:+b.left.toFixed(1), r:+b.right.toFixed(1),
                 sw:e.scrollWidth, ovf:cs.overflowX, disp:cs.display,
                 tf:cs.transform==='none'?'none':'set', mr:cs.marginRight }; };

      // Overlap detection among fixed/sticky top-area elements
      const cands = [...document.querySelectorAll('header,nav,.sub-bar,.stats-bar,.filter-pills,#sf-zpill,#sf-banner,.search-box,.btn-new')];
      const boxes = cands.map(e => { const b = e.getBoundingClientRect();
        return { sel: e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/)[0]:''),
                 t:+b.top.toFixed(1), b:+b.bottom.toFixed(1), l:+b.left.toFixed(1), r:+b.right.toFixed(1),
                 w:+b.width.toFixed(1), h:+b.height.toFixed(1) }; })
        .filter(x => x.w > 0 && x.h > 0);
      const overlaps = [];
      for (let i=0;i<boxes.length;i++) for (let j=i+1;j<boxes.length;j++) {
        const A=boxes[i], B=boxes[j];
        const ox = Math.min(A.r,B.r)-Math.max(A.l,B.l);
        const oy = Math.min(A.b,B.b)-Math.max(A.t,B.t);
        if (ox > 4 && oy > 4) overlaps.push(`${A.sel} ∩ ${B.sel} = ${ox.toFixed(0)}x${oy.toFixed(0)}px`);
      }

      // Filter pill vertical centering check
      const pills = [...document.querySelectorAll('.filter-pill')].slice(0,3).map(e => {
        const cs = getComputedStyle(e); const b = e.getBoundingClientRect();
        // measure text node position inside pill
        const range = document.createRange(); let textTop = null;
        if (e.firstChild && e.firstChild.nodeType === 3) {
          range.selectNodeContents(e.firstChild);
          const tb = range.getBoundingClientRect();
          textTop = +(tb.top - b.top).toFixed(1);
        }
        return { txt:e.textContent.trim().slice(0,12), h:+b.height.toFixed(1),
                 disp:cs.display, ai:cs.alignItems, minH:cs.minHeight,
                 padT:cs.paddingTop, padB:cs.paddingBottom,
                 textOffsetTop:textTop,
                 lineH:cs.lineHeight };
      });

      // Horizontal overflow of body
      const bodyOvf = document.documentElement.scrollWidth - vw;

      return { vw, vh, bodyOverflowPx: bodyOvf,
        board: g('.board'), boardWrap: g('.board-wrap'),
        schedGrid: g('.schedule-grid'), schedWrap: g('.schedule-wrap'),
        custTable: g('.cust-table'), listPane: g('.list-pane'),
        mainContent: g('.main-content'),
        pill: g('#sf-zpill'), pillLbl: (document.querySelector('#sf-zlbl')||{}).textContent,
        subBar: g('.sub-bar'), filterPills: g('.filter-pills'),
        pills, overlaps: overlaps.slice(0,8),
        pillCount: document.querySelectorAll('.filter-pill').length };
    });

    console.log(`\n### ${page}  (vp ${r.vw}x${r.vh})`);
    if (errs.length) console.log('  JS ERRORS:', errs.slice(0,3));
    console.log('  body h-overflow:', r.bodyOverflowPx, 'px', r.bodyOverflowPx>2?'  ❌':'  ✅');
    const key = page.includes('schedule') ? ['schedGrid','schedWrap']
              : page.includes('customers') ? ['custTable','listPane']
              : ['board','boardWrap'];
    const el = r[key[0]], wr = r[key[1]];
    if (el) console.log(`  ${key[0]}: w=${el.w} sw=${el.sw} tf=${el.tf} mr=${el.mr}`);
    if (wr) console.log(`  ${key[1]}: w=${wr.w} sw=${wr.sw} ovf=${wr.ovf}` +
      (wr.sw > wr.w + 2 ? `  ❌ SCROLLS ${wr.sw-wr.w}px` : '  ✅ fits'));
    if (r.pill) console.log(`  pill: t=${r.pill.t} (vh ${r.vh}) label="${r.pillLbl}" disp=${r.pill.disp}` +
      (r.pill.t > r.vh - 10 ? '  ❌ OFFSCREEN' : '  ✅ onscreen'));
    else console.log('  pill: ABSENT');
    console.log(`  filter-pills: ${r.pillCount} pills, container`, r.filterPills ? `h=${r.filterPills.h}` : 'none');
    r.pills.forEach(x => console.log(`    "${x.txt}" h=${x.h} disp=${x.disp} ai=${x.ai} minH=${x.minH} padT=${x.padT} textTop=${x.textOffsetTop} lineH=${x.lineH}`));
    if (r.overlaps.length) { console.log('  OVERLAPS ❌'); r.overlaps.forEach(o=>console.log('   ', o)); }
    else console.log('  overlaps: none ✅');
    allErrs[page] = errs;
  }
  await b.close();
})();

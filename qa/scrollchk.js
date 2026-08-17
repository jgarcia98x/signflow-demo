const { webkit, devices } = require('playwright');
const BASE = 'https://jgarcia98x.github.io/signflow-demo/';
(async () => {
  const b = await webkit.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  for (const f of ['index.html','customers.html','reports.html','schedule.html']) {
    await p.goto(BASE + f + '?demo=Eclipse+Awning', { waitUntil:'networkidle', timeout:25000 });
    await p.waitForTimeout(1600);
    const r = await p.evaluate(() => {
      const de = document.documentElement, bd = document.body;
      const cs = getComputedStyle(bd), hs = getComputedStyle(de);
      // find which element is actually scrollable vertically
      const scrollers = [];
      document.querySelectorAll('*').forEach(e => {
        const s = getComputedStyle(e);
        if (/auto|scroll/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 4)
          scrollers.push({ sel: e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+
            (typeof e.className==='string'&&e.className.trim()?'.'+e.className.trim().split(/\s+/)[0]:''),
            sh: e.scrollHeight, ch: e.clientHeight });
      });
      return {
        docScrollable: de.scrollHeight > de.clientHeight + 4,
        docSH: de.scrollHeight, docCH: de.clientHeight,
        bodySH: bd.scrollHeight, bodyCH: bd.clientHeight,
        bodyOvfY: cs.overflowY, htmlOvfY: hs.overflowY,
        bodyH: cs.height, htmlH: hs.height, bodyPos: cs.position,
        scrollers: scrollers.slice(0,6)
      };
    });
    // try actually scrolling
    const before = await p.evaluate(()=>window.scrollY);
    await p.evaluate(()=>window.scrollBy(0,400));
    await p.waitForTimeout(300);
    const after = await p.evaluate(()=>window.scrollY);
    console.log(`\n### ${f}`);
    console.log(`  doc ${r.docSH}/${r.docCH} scrollable=${r.docScrollable}  body ${r.bodySH}/${r.bodyCH}`);
    console.log(`  bodyH=${r.bodyH} htmlH=${r.htmlH} bodyOvfY=${r.bodyOvfY} htmlOvfY=${r.htmlOvfY}`);
    console.log(`  window.scrollY ${before} -> ${after}  ${after>before?'✅ SCROLLS':'❌ NO SCROLL'}`);
    console.log('  inner scrollers:', r.scrollers.length? r.scrollers : 'NONE ❌');
  }
  await b.close();
})();

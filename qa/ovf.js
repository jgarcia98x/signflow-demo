const { webkit, devices } = require('playwright');
const BASE = 'https://jgarcia98x.github.io/signflow-demo/';
(async () => {
  const b = await webkit.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  for (const page of ['schedule.html','reports.html','index.html']) {
    await p.goto(BASE + page, { waitUntil:'networkidle', timeout:25000 });
    await p.waitForTimeout(1500);
    const r = await p.evaluate(() => {
      const vw = window.innerWidth;
      const bad = [];
      document.querySelectorAll('*').forEach(e => {
        const b = e.getBoundingClientRect();
        if (b.width > 0 && b.right > vw + 2) {
          bad.push({ sel: e.tagName.toLowerCase() + (e.id?'#'+e.id:'') +
                     (typeof e.className==='string'&&e.className.trim()?'.'+e.className.trim().split(/\s+/).join('.'):''),
                     r:+b.right.toFixed(0), w:+b.width.toFixed(0),
                     depth:(()=>{let d=0,n=e;while(n.parentElement){d++;n=n.parentElement}return d})() });
        }
      });
      bad.sort((a,b)=>a.depth-b.depth);
      return { vw, docSW: document.documentElement.scrollWidth, bad: bad.slice(0,12) };
    });
    console.log(`\n### ${page} vw=${r.vw} docSW=${r.docSW} overflow=${r.docSW-r.vw}px`);
    r.bad.forEach(x=>console.log(`  d${x.depth} right=${x.r} w=${x.w}  ${x.sel.slice(0,90)}`));
  }
  await b.close();
})();

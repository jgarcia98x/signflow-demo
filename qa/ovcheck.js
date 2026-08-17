const { webkit, devices } = require('playwright');
const BASE = 'https://jgarcia98x.github.io/signflow-demo/';
(async () => {
  const b = await webkit.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  for (const f of ['index.html','jobs.html','reports.html']) {
    await p.goto(BASE + f + '?demo=Eclipse+Awning', { waitUntil:'networkidle', timeout:25000 });
    await p.waitForTimeout(1600);
    const r = await p.evaluate(() => {
      const sels = ['header','nav','.sub-bar','.stats-bar','.filter-pills','#sf-zpill','#sf-banner','.search-box','.btn-new','#sf-ftoggle'];
      const els = sels.map(s=>[s,document.querySelector(s)]).filter(x=>x[1]);
      const out=[];
      for (let i=0;i<els.length;i++) for (let j=i+1;j<els.length;j++) {
        const [sa,A]=els[i],[sb,B]=els[j];
        // skip ancestor/descendant pairs — those are not real overlaps
        if (A.contains(B)||B.contains(A)) continue;
        const ra=A.getBoundingClientRect(), rb=B.getBoundingClientRect();
        const ox=Math.min(ra.right,rb.right)-Math.max(ra.left,rb.left);
        const oy=Math.min(ra.bottom,rb.bottom)-Math.max(ra.top,rb.top);
        if(ox>4&&oy>4) out.push(`${sa} ∩ ${sb} = ${ox.toFixed(0)}x${oy.toFixed(0)}`);
      }
      const bw=document.querySelector('.board-wrap');
      return { out, scroll: bw? bw.scrollWidth-bw.clientWidth : null,
               ftog: !!document.getElementById('sf-ftoggle'),
               trayCollapsed: (document.querySelector('.filter-pills')||{classList:{contains:()=>null}}).classList.contains('collapsed') };
    });
    console.log(`\n${f}: boardScroll=${r.scroll} filtersBtn=${r.ftog} trayCollapsed=${r.trayCollapsed}`);
    console.log('  TRUE overlaps:', r.out.length? r.out : 'none ✅');
  }
  await b.close();
})();

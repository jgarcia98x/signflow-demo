const { webkit, devices } = require('playwright');
(async()=>{
  const b=await webkit.launch();
  // Throttled-ish: measure real paint milestones on the deployed site
  const ctx=await b.newContext({...devices['iPhone 13']});
  const p=await ctx.newPage();
  await p.goto('https://jgarcia98x.github.io/signflow-demo/index.html?demo=X',{waitUntil:'load'});
  await p.waitForTimeout(2500);
  const t=await p.evaluate(()=>{
    const n=performance.getEntriesByType('navigation')[0]||{};
    const paints={}; performance.getEntriesByType('paint').forEach(e=>paints[e.name]=+e.startTime.toFixed(0));
    // when did the board actually have cards?
    return {
      domContentLoaded:+((n.domContentLoadedEventEnd||0)).toFixed(0),
      loadEvent:+((n.loadEventEnd||0)).toFixed(0),
      firstPaint:paints['first-paint'],
      firstContentfulPaint:paints['first-contentful-paint'],
      cards:document.querySelectorAll('.card,.job-card').length,
      transferKB: Math.round(performance.getEntriesByType('resource').reduce((s,r)=>s+(r.transferSize||0),0)/1024),
      resources: performance.getEntriesByType('resource').length,
      slowest: performance.getEntriesByType('resource').map(r=>({n:r.name.split('/').pop(),d:+r.duration.toFixed(0)})).sort((a,b)=>b.d-a.d).slice(0,5)
    };
  });
  console.log(JSON.stringify(t,null,1));
  await b.close();
})();

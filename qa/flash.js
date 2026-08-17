const { webkit, devices } = require('playwright');
(async()=>{
  const b=await webkit.launch(); const ctx=await b.newContext({...devices['iPhone 13']});
  const p=await ctx.newPage();
  await p.addInitScript(()=>{
    window.__log=[];
    const t0=performance.now();
    const iv=setInterval(()=>{
      const bd=document.querySelector('.board');
      if(bd) window.__log.push({t:+(performance.now()-t0).toFixed(0), tf:getComputedStyle(bd).transform.slice(0,22)});
      if(performance.now()-t0>1800) clearInterval(iv);
    },40);
  });
  await p.goto('https://jgarcia98x.github.io/signflow-demo/index.html?demo=X',{waitUntil:'load'});
  await p.waitForTimeout(2200);
  const log=await p.evaluate(()=>window.__log);
  // report first frame board existed, and when transform became non-none
  const first=log[0];
  const zoomed=log.find(e=>e.tf!=='none'&&e.tf.indexOf('matrix(1,')!==0);
  console.log('board first seen at', first&&first.t+'ms', 'tf='+(first&&first.tf));
  console.log('scaled transform at', zoomed?zoomed.t+'ms':'never', zoomed&&zoomed.tf);
  console.log('=> UNSCALED VISIBLE WINDOW:', zoomed&&first? (zoomed.t-first.t)+'ms':'n/a');
  await b.close();
})();

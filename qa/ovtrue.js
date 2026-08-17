const { webkit, devices } = require('playwright');
(async()=>{
  const b=await webkit.launch(); const ctx=await b.newContext({...devices['iPhone 13']});
  const p=await ctx.newPage();
  for(const f of ['index.html','customers.html','reports.html','schedule.html','jobs.html','settings.html']){
    await p.goto('https://jgarcia98x.github.io/signflow-demo/'+f+'?demo=X',{waitUntil:'load'});
    await p.waitForTimeout(2200);
    const r=await p.evaluate(()=>{
      const vw=innerWidth, vh=innerHeight;
      const ok=e=>{
        const c=getComputedStyle(e);
        if(c.visibility==='hidden'||c.display==='none'||parseFloat(c.opacity)<0.15)return false;
        if(e.closest('#sf-wm')||e.id==='sf-wm')return false;
        // skip anything inside a closed/off-canvas panel or collapsed tray
        if(e.closest('.collapsed,.sf-collapsed'))return false;
        const b=e.getBoundingClientRect();
        // must be genuinely on screen
        if(b.right<=2||b.bottom<=2||b.left>=vw-2||b.top>=vh-2)return false;
        return b.width>4&&b.height>4;
      };
      const els=[...document.querySelectorAll('body *')].filter(ok);
      let hits=[];
      for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){
        const A=els[i],B=els[j];
        if(A.contains(B)||B.contains(A))continue;
        const a=A.getBoundingClientRect(),c=B.getBoundingClientRect();
        const x=Math.min(a.right,c.right)-Math.max(a.left,c.left);
        const y=Math.min(a.bottom,c.bottom)-Math.max(a.top,c.top);
        if(x>4&&y>4){
          // ignore panels that are translated off-canvas
          const at=getComputedStyle(A).transform, bt=getComputedStyle(B).transform;
          if(/matrix.*-?\d{3,}/.test(at)||/matrix.*-?\d{3,}/.test(bt))continue;
          hits.push(((A.id||A.className||A.tagName)+'').slice(0,22)+' ∩ '+((B.id||B.className||B.tagName)+'').slice(0,22)+' '+x.toFixed(0)+'x'+y.toFixed(0));
        }
      }
      return {hits:[...new Set(hits)].slice(0,4)};
    });
    console.log(f.padEnd(15), r.hits.length?('OVERLAP: '+r.hits.join(' | ')):'clean ✅');
  }
  await b.close();
})();

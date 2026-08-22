/* Measure the prospect demo against DESIGN.md. Computed style + geometry,
 * never appearance — screenshots have misreported layout three times. */
const { chromium, webkit, devices } = require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=require('path').resolve(__dirname,'..'),MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const PAGES=['index.html','schedule.html','customers.html','jobs.html','reports.html','settings.html'];
const TAG=process.argv[2]||'before';

const srv=http.createServer((rq,rs)=>{const u=new URL(rq.url,'http://x');let p=path.join(ROOT,decodeURIComponent(u.pathname));
  if(u.pathname==='/')p=path.join(ROOT,'index.html');
  if(!fs.existsSync(p)||!fs.statSync(p).isFile()){rs.writeHead(404);return rs.end('nf');}
  rs.writeHead(200,{'content-type':MIME[path.extname(p)]||''});rs.end(fs.readFileSync(p));});

const probe = () => {
  const els=[...document.querySelectorAll('*')].filter(e=>e.offsetParent!==null||e===document.body);
  const sizes=new Map(), weights=new Map(), radii=new Set(), colors=new Set();
  let glass=0, textShadow=0, boxShadow=new Set(), small=0, tinyTargets=[];
  const RED=/rgba?\(\s*(2[0-4][0-9]|25[0-5]|1[6-9][0-9])\s*,\s*([0-9]|[1-9][0-9])\s*,\s*([0-9]|[1-9][0-9])/;
  for(const e of els){
    const s=getComputedStyle(e);
    const fs_=parseFloat(s.fontSize); if(fs_){sizes.set(fs_,(sizes.get(fs_)||0)+1); if(fs_<13) small++;}
    weights.set(s.fontWeight,(weights.get(s.fontWeight)||0)+1);
    if(s.borderRadius&&s.borderRadius!=='0px') s.borderRadius.split(' ').forEach(r=>radii.add(r));
    if(s.backdropFilter&&s.backdropFilter!=='none') glass++;
    if(s.textShadow&&s.textShadow!=='none') textShadow++;
    if(s.boxShadow&&s.boxShadow!=='none') boxShadow.add(s.boxShadow);
    [s.color,s.backgroundColor,s.borderTopColor].forEach(c=>{ if(c&&!/rgba\(0, 0, 0, 0\)/.test(c)) colors.add(c); });
    // interactive elements must be >=44px
    if(/^(A|BUTTON)$/.test(e.tagName)||e.getAttribute('role')==='button'){
      const r=e.getBoundingClientRect();
      if(r.width>0&&r.height>0&&(r.height<44)) tinyTargets.push({t:(e.textContent||'').trim().slice(0,22),h:Math.round(r.height)});
    }
  }
  // emoji actually rendered in visible text
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let emoji=0; const RE=/\p{Extended_Pictographic}/gu; let n;
  while((n=walker.nextNode())){ if(n.parentElement&&n.parentElement.offsetParent!==null){ const m=(n.textContent||'').match(RE); if(m) emoji+=m.length; } }
  const redUses=[...colors].filter(c=>RED.test(c));
  return { sizes:[...sizes.keys()].sort((a,b)=>a-b), weights:[...weights.keys()].sort(),
           radii:[...radii], colors:colors.size, redColors:redUses, glass, textShadow,
           boxShadows:boxShadow.size, small, emoji, tinyTargets:tinyTargets.slice(0,6), tinyCount:tinyTargets.length };
};

(async()=>{
  await new Promise(r=>srv.listen(8902,'127.0.0.1',r));
  const out={};
  for(const [name,engine,opts] of [['WebKit-iPhone13',webkit,devices['iPhone 13']],['Chromium-desktop',chromium,{viewport:{width:1440,height:900}}]]){
    const b=await engine.launch(); const ctx=await b.newContext(opts);
    await ctx.addInitScript(()=>{try{localStorage.setItem('sf_hint_v3','1')}catch(e){}});
    out[name]={};
    for(const pg_ of PAGES){
      const pg=await ctx.newPage();
      await pg.goto(`http://127.0.0.1:8902/${pg_}`,{waitUntil:'networkidle'});
      await pg.waitForTimeout(700);
      out[name][pg_]=await pg.evaluate(probe);
      await pg.screenshot({path:`/tmp/sfqa/shots/${TAG}-${name}-${pg_}.png`,fullPage:false});
      await pg.close();
    }
    await b.close();
  }
  fs.writeFileSync(`/tmp/sfqa/audit-${TAG}.json`,JSON.stringify(out,null,2));
  // summary
  for(const eng of Object.keys(out)){
    console.log(`\n### ${eng}`);
    console.log('page            sizes wt radii colors red glass tshadow shadows <13px emoji <44px');
    for(const p of PAGES){ const d=out[eng][p];
      console.log(p.replace('.html','').padEnd(15),
        String(d.sizes.length).padStart(5), String(d.weights.length).padStart(2),
        String(d.radii.length).padStart(5), String(d.colors).padStart(6),
        String(d.redColors.length).padStart(3), String(d.glass).padStart(5),
        String(d.textShadow).padStart(7), String(d.boxShadows).padStart(7),
        String(d.small).padStart(5), String(d.emoji).padStart(5), String(d.tinyCount).padStart(5));
    }
  }
  srv.close();
})();

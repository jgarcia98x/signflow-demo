/* Regression guard. Past mistakes this checks for:
 *  - CSS that traps content (released a child's height without releasing a
 *    clipped ancestor -> 3754px of content, nothing scrollable)
 *  - JS errors from the emoji strip
 *  - glued HTML attributes from an over-broad whitespace regex */
const { webkit, chromium, devices } = require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=require('path').resolve(__dirname,'..'),MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const PAGES=['index.html','schedule.html','customers.html','jobs.html','reports.html','settings.html'];
const srv=http.createServer((rq,rs)=>{const u=new URL(rq.url,'http://x');let p=path.join(ROOT,decodeURIComponent(u.pathname));
  if(u.pathname==='/')p=path.join(ROOT,'index.html');
  if(!fs.existsSync(p)||!fs.statSync(p).isFile()){rs.writeHead(404);return rs.end('nf');}
  rs.writeHead(200,{'content-type':MIME[path.extname(p)]||''});rs.end(fs.readFileSync(p));});
let pass=0,fail=0;
const ok=m=>{console.log('  PASS '+m);pass++;}, bad=m=>{console.log('  FAIL '+m);fail++;};
(async()=>{
  await new Promise(r=>srv.listen(8907,'127.0.0.1',r));
  for(const [nm,eng,opt] of [['WebKit-iPhone13',webkit,devices['iPhone 13']],['Chromium',chromium,{viewport:{width:1440,height:900}}]]){
    console.log('\n== '+nm+' ==');
    const b=await eng.launch(); const ctx=await b.newContext(opt);
    await ctx.addInitScript(()=>{try{localStorage.setItem('sf_hint_v3','1')}catch(e){}});
    for(const p of PAGES){
      const pg=await ctx.newPage(); const errs=[];
      pg.on('pageerror',e=>errs.push(e.message));
      await pg.goto('http://127.0.0.1:8907/'+p,{waitUntil:'networkidle'});
      await pg.waitForTimeout(500);
      const r=await pg.evaluate(()=>{
        const de=document.documentElement;
        let scrollable=(de.scrollHeight>de.clientHeight+4);
        if(!scrollable) for(const e of document.querySelectorAll('*')){
          const s=getComputedStyle(e);
          if(/auto|scroll/.test(s.overflowY)&&e.scrollHeight>e.clientHeight+4){scrollable=true;break;}
        }
        return { overflowX: de.scrollWidth>de.clientWidth+2, contentH:de.scrollHeight,
                 viewH:de.clientHeight, scrollable, textLen:(document.body.innerText||'').length };
      });
      const e2=errs.filter(e=>!/favicon/i.test(e));
      e2.length?bad(`${p}: JS error ${e2[0].slice(0,70)}`):ok(`${p}: no JS errors`);
      r.overflowX?bad(`${p}: horizontal overflow (${r.contentH})`):ok(`${p}: no horizontal overflow`);
      // content taller than viewport MUST have something scrollable
      (r.contentH>r.viewH+8 && !r.scrollable)?bad(`${p}: ${r.contentH}px content and NOTHING scrolls`):ok(`${p}: scroll intact`);
      r.textLen>200?ok(`${p}: content rendered (${r.textLen} chars)`):bad(`${p}: only ${r.textLen} chars — page may be broken`);
      await pg.close();
    }
    await b.close();
  }
  srv.close();
  console.log(`\n${pass} passed · ${fail} failed`);
  process.exit(fail?1:0);
})();

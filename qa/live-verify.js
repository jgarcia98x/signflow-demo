/* END-TO-END: real page, real key, real PostHog project.
 *
 * PostHog's UA bot filter drops ALL events from headless browsers
 * (is_bot=true -> capture() is a silent no-op). That is a property of
 * the HARNESS, not of the site: real visitors are not headless.
 * opt_out_useragent_filter is injected ONLY here, in the test, so the
 * shipped config keeps bot filtering ON.
 */
const { chromium } = require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
// Repo root, resolved from this file so the script works from any checkout.
const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const MARK='engineer_e2e_'+Date.now();
(async()=>{
  const srv=http.createServer((rq,rs)=>{const u=new URL(rq.url,'http://x');let p=path.join(ROOT,decodeURIComponent(u.pathname));
    if(u.pathname==='/')p=path.join(ROOT,'index.html');
    if(!fs.existsSync(p)||!fs.statSync(p).isFile()){rs.writeHead(404);return rs.end('nf');}
    rs.writeHead(200,{'content-type':MIME[path.extname(p)]||''});rs.end(fs.readFileSync(p));});
  await new Promise(r=>srv.listen(8901,'127.0.0.1',r));

  const b=await chromium.launch(); const ctx=await b.newContext();
  // Disable ONLY the bot filter, keeping the real committed config file.
  await ctx.addInitScript(()=>{ window.__PH_TEST_UNFILTER = true; });
  await ctx.route('**/signflow-analytics.js*', async (route) => {
    const src = fs.readFileSync(path.join(ROOT,'signflow-analytics.js'),'utf8')
      .replace('autocapture: false,', 'autocapture: false, opt_out_useragent_filter: true,');
    route.fulfill({status:200,contentType:'text/javascript',body:src});
  });
  const pg=await ctx.newPage();
  const posts=[];
  pg.on('response',async r=>{const u=new URL(r.url());
    if(/posthog\.com/.test(u.hostname)&&r.request().method()==='POST') posts.push({p:u.pathname,s:r.status()});});

  await pg.goto(`http://127.0.0.1:8901/index.html?demo=${encodeURIComponent(MARK)}`,{waitUntil:'networkidle'});
  await pg.waitForTimeout(3000);
  await pg.evaluate((m)=>window.SFAnalytics.capture('demo_verification_ping',{marker:m}), MARK);
  await pg.waitForTimeout(4000);

  const sent = await pg.evaluate(()=>window.__SF_SENT||[]);
  console.log('MARKER          :', MARK);
  console.log('events captured :', sent.map(e=>e.event).join(', ')||'(none)');
  const pv = sent.find(e=>e.event==='demo_pageview');
  console.log('demo_company    :', pv && pv.props.demo_company);
  console.log('page property   :', pv && pv.props.page);
  console.log('ingest POSTs    :', JSON.stringify(posts));
  await b.close(); srv.close();
  // Non-zero exit if nothing was accepted, so this can gate a release.
  const okIngest = posts.some(p => p.s === 200);
  if (!okIngest) { console.error('FAIL: no 2xx from the ingest endpoint'); process.exit(1); }
  console.log('\nPASS: events accepted (HTTP 200) by the live project.');
  console.log('NOTE: read-back needs a private key; 200 is the strongest');
  console.log('      evidence available without one.');
})();

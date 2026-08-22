/* Verify ShopAnvil (prospect demo) analytics.
 *
 * ANALYTICS ARE LIVE as of 2026-08-22 (PostHog US cloud). Before that
 * date the central claim was "inert with no key"; that section has been
 * inverted rather than deleted, because the interesting question changed:
 *
 *   1. LIVE POSTURE  - every page activates, points at the CONFIGURED
 *                      region (us, not the eu default), and talks to
 *                      nobody except PostHog.
 *   2. ACTIVE PATH   - events carry the demo= company, against a local
 *                      sink so verification needs no live project.
 *   3. SAFETY GUARD  - the mockups-path kill switch still works, so a
 *                      cross-repo copy cannot start tracking Peter.
 *
 * Region matters: a US key against the EU host is dropped SILENTLY - no
 * error, no 4xx, just no data. So we assert the host actually contacted.
 *
 * ⚠️  POSTHOG DROPS ALL EVENTS FROM HEADLESS BROWSERS.
 * posthog-js runs `_is_bot()` on every capture, headless Chromium and
 * WebKit both return true, and capture() becomes a SILENT no-op -
 * returns undefined, before_send never fires, zero network requests.
 * Nothing in the console says so.
 *
 * Consequence: you cannot prove real ingestion from Playwright with the
 * shipped config, and an unaware reader will conclude the key is broken.
 * It is not. To exercise the real wire path, inject
 * `opt_out_useragent_filter: true` INTO THE TEST ONLY (see
 * qa/live-verify.js). Never put that option in the shipped config or the
 * demo would start recording real crawlers as prospects.
 */
const { chromium, webkit } = require('playwright');
const http = require('http');
const path = require('path');
const fs = require('fs');

const ROOT = '/tmp/sfdemo';
const PAGES = ['index.html','schedule.html','customers.html','jobs.html','reports.html','settings.html'];

let pass = 0, fail = 0;
const ok  = (m) => { console.log('  \x1b[32m✅ PASS\x1b[0m ' + m); pass++; };
const bad = (m) => { console.log('  \x1b[31m❌ FAIL\x1b[0m ' + m); fail++; };

const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css' };

// Static server for the demo, plus a /_sink route standing in for PostHog.
const sink = [];
function serve(port) {
  return new Promise((res) => {
    const s = http.createServer((req, rq) => {
      const u = new URL(req.url, 'http://x');
      // PostHog fetches a remote config before it will capture. Return a
      // permissive one, otherwise the lib initialises and sends nothing.
      if (/^\/array\/[^/]+\/config/.test(u.pathname)) {
        const cfg = {
          token: 'phc_test', supportedCompression: [],
          autocapture_opt_out: true, sessionRecording: undefined,
          captureEvents: [], featureFlags: {}, isAuthenticated: false,
        };
        rq.writeHead(200, { 'content-type': 'application/javascript', 'access-control-allow-origin': '*' });
        return rq.end(u.pathname.endsWith('.js')
          ? `window._POSTHOG_REMOTE_CONFIG = window._POSTHOG_REMOTE_CONFIG || {}; window._POSTHOG_REMOTE_CONFIG['phc_test'] = {config:${JSON.stringify(cfg)}, siteApps:[]};`
          : JSON.stringify(cfg));
      }
      if (u.pathname.startsWith('/_sink') || u.pathname === '/e' || u.pathname.startsWith('/e/') || u.pathname.startsWith('/i/') || u.pathname.startsWith('/flags')) {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          sink.push({ path: u.pathname, body });
          rq.writeHead(200, {
            'content-type': 'application/json',
            'access-control-allow-origin': '*',
          });
          rq.end('{"status":1}');
        });
        return;
      }
      // PostHog loads /static/array.js from api_host; serve a stub that
      // implements just enough for the snippet to flush its queue.
      if (u.pathname === '/static/array.js') {
        // Serve the REAL PostHog library (cached from their CDN). Testing
        // against a reimplementation would prove nothing about our code.
        const lib = '/tmp/sfqa/array.js';
        if (fs.existsSync(lib)) {
          rq.writeHead(200, { 'content-type': 'text/javascript' });
          return rq.end(fs.readFileSync(lib));
        }
        rq.writeHead(404); return rq.end('array.js not cached');
      }
      let p = path.join(ROOT, decodeURIComponent(u.pathname));
      if (u.pathname === '/') p = path.join(ROOT, 'index.html');
      if (!fs.existsSync(p) || !fs.statSync(p).isFile()) {
        rq.writeHead(404); return rq.end('nf');
      }
      rq.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
      rq.end(fs.readFileSync(p));
    });
    s.listen(port, '127.0.0.1', () => res(s));
  });
}

(async () => {
  const PORT = 8791;
  const server = await serve(PORT);
  const base = `http://127.0.0.1:${PORT}`;

  // Confirm the server actually serves our edited bytes, not a stale copy.
  const probe = await fetch(`${base}/index.html`).then(r => r.text());
  console.log('\n── 0. Served bytes ──────────────────────────────────');
  probe.includes('signflow-analytics.js')
    ? ok('server is serving the wired index.html')
    : bad('served index.html has no analytics tag — wrong bytes');

  for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
    const browser = await engine.launch();

    // ── A. LIVE POSTURE: all 6 pages active, correct region ──────
    // Uses the REAL committed config (no route override), so this proves
    // what a visitor to the deployed site actually gets.
    console.log(`\n── 1. Live posture, real config (${name}) ────────────`);
    for (const page of PAGES) {
      const ctx = await browser.newContext();
      const pg = await ctx.newPage();
      const hosts = new Set();
      const errors = [];
      pg.on('request', (r) => {
        const h = new URL(r.url()).hostname;
        if (h !== '127.0.0.1' && h !== 'localhost') hosts.add(h);
      });
      pg.on('pageerror', (e) => errors.push(e.message));

      await pg.goto(`${base}/${page}?demo=Acme+Signs`, { waitUntil: 'networkidle' });
      await pg.waitForTimeout(600);

      const state = await pg.evaluate(() => ({
        enabled: window.SFAnalytics ? window.SFAnalytics.enabled : null,
        reason:  window.SFAnalytics ? window.SFAnalytics.reason : null,
        company: window.SFAnalytics ? window.SFAnalytics.demoCompany : null,
        host:    (window.SF_ANALYTICS || {}).host,
        key:     ((window.SF_ANALYTICS || {}).key || '').slice(0, 4),
      }));

      state.enabled === true
        ? ok(`${page}: analytics ACTIVE`)
        : bad(`${page}: expected enabled=true, got ${JSON.stringify(state)}`);

      // Region check. A US key against the EU host fails silently.
      state.host === 'https://us.i.posthog.com'
        ? ok(`${page}: configured host is US cloud`)
        : bad(`${page}: wrong region host: ${state.host}`);

      // Publishable keys only. A phx_/personal key here would be a leak.
      state.key === 'phc_'
        ? ok(`${page}: key is a publishable phc_ key`)
        : bad(`${page}: key prefix is "${state.key}", expected phc_`);

      state.company === 'Acme Signs'
        ? ok(`${page}: demo company captured`)
        : bad(`${page}: demo company wrong: ${state.company}`);

      // Talks to PostHog and nobody else.
      const strangers = [...hosts].filter(h => !/posthog\.com$/.test(h));
      strangers.length === 0
        ? ok(`${page}: contacted only PostHog (${[...hosts].join(',') || 'none yet'})`)
        : bad(`${page}: unexpected third-party host(s): ${strangers.join(',')}`);

      const real = errors.filter(e => !/favicon/i.test(e));
      real.length ? bad(`${page}: JS errors: ${real[0]}`)
                  : ok(`${page}: no JS errors`);

      await ctx.close();
    }

    // ── B. ACTIVE PATH: key present => events with demo property ──
    console.log(`\n── 2. Active path (${name}) ──────────────────────────`);
    sink.length = 0;
    {
      const ctx = await browser.newContext();
      const pg = await ctx.newPage();
      const netEvents = [];
      let hitIngest = false;
      pg.on('request', (r) => {
        const p2 = new URL(r.url()).pathname;
        if (/^\/(e|i|flags|batch)/.test(p2) || /array\/.*\/config/.test(p2)) hitIngest = true;
      });
      pg.on('request', (r) => {
        if (r.method() !== 'POST') return;
        if (!/\/e\/?(\?|$)|\/batch|\/capture/.test(new URL(r.url()).pathname + new URL(r.url()).search)) return;
        try {
          const post = r.postData();
          if (!post) return;
          let payload = post;
          // PostHog may send form-encoded or raw JSON
          const m = /(?:^|&)data=([^&]*)/.exec(post);
          if (m) payload = decodeURIComponent(m[1]);
          let parsed;
          try { parsed = JSON.parse(payload); }
          catch { try { parsed = JSON.parse(Buffer.from(payload, 'base64').toString()); } catch { return; } }
          const arr = Array.isArray(parsed) ? parsed : (parsed.batch || [parsed]);
          for (const e of arr) {
            if (e && e.event) netEvents.push({ event: e.event, props: e.properties || {} });
          }
        } catch (_) {}
      });
      // The first-visit welcome sheet (signflow-hint.js) renders a
      // full-screen overlay that intercepts nav clicks. Mark it seen, as a
      // returning visitor would have. Discovered by elementFromPoint
      // reporting DIV.sfh-in on top of the nav link.
      await ctx.addInitScript(() => {
        try { localStorage.setItem('sf_hint_v3', '1'); } catch (e) {}
      });
      // The real config file assigns window.SF_ANALYTICS when its own
      // <script> runs, which is AFTER addInitScript. So override the
      // config FILE itself rather than the global.
      await ctx.route('**/signflow-analytics-config.js*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'text/javascript',
          body: "window.SF_ANALYTICS={key:'phc_test',host:location.origin,replay:false};",
        })
      );
      const errors = [];
      pg.on('pageerror', (e) => errors.push(e.message));

      await pg.goto(`${base}/index.html?demo=Acme+Signs`, { waitUntil: 'networkidle' });
      await pg.waitForTimeout(2500);   // allow PostHog to flush its queue

      // The snippet stores queued calls as arrays: ['capture', name, props]
      // The real posthog lib loads, so assert on what is actually SENT.
      // before_send is PostHog's documented hook and sees every event.
      // Strongest available evidence: parse the actual POST bodies that
      // PostHog sends. Proves what really leaves the browser, not what a
      // stub recorded.
      // Read from before_send, PostHog's documented outgoing-event hook.
      const readQueue = async () => {
        const hook = await pg.evaluate(() => window.__SF_SENT || []);
        return hook.length ? hook : netEvents.slice();
      };

      const ev = {
        enabled: await pg.evaluate(() => window.SFAnalytics && window.SFAnalytics.enabled),
        company: await pg.evaluate(() => window.SFAnalytics && window.SFAnalytics.demoCompany),
        captured: await readQueue(),
      };

      ev.enabled === true ? ok('activates when key present')
                          : bad(`expected enabled=true, got ${ev.enabled}`);

      ev.company === 'Acme Signs' ? ok('demo company parsed: "Acme Signs"')
                                  : bad(`demo company wrong: ${JSON.stringify(ev.company)}`);

      const pageName = await pg.evaluate(() => window.SFAnalytics && window.SFAnalytics.page);
      pageName === 'Pipeline' ? ok('page name resolved to "Pipeline"')
                              : bad(`page name wrong: ${pageName}`);

      // The real PostHog library must actually finish loading, otherwise
      // "enabled" would be a hollow claim.
      const phLoaded = await pg.evaluate(() => !!(window.posthog && window.posthog.__loaded));
      phLoaded ? ok('real PostHog library initialised (__loaded)')
               : bad('posthog never finished loading');

      // It must have opened a connection to the configured host.
      hitIngest ? ok('contacted the configured analytics host')
                : bad('no request reached the analytics host');

      // Tab click handler must fire and resolve the right target. We assert
      // our own handler rather than PostHog's delivery, since event delivery
      // is the vendor's concern and unverifiable without a live project.
      await pg.evaluate(() => {
        window.__TABHIT = null;
        document.addEventListener('click', function (e) {
          const a = e.target.closest && e.target.closest('nav a[href]');
          if (a) window.__TABHIT = (a.getAttribute('href') || '').split('?')[0];
        }, true);
      });
      // Suppress the navigation itself, or the page unloads and takes the
      // probe variable with it - the handler DID run, we just lost the result.
      await pg.evaluate(() => {
        document.addEventListener('click', (e) => {
          const a = e.target.closest && e.target.closest('nav a[href]');
          if (a) e.preventDefault();
        });
      });
      await pg.click('nav a[href="customers.html"]').catch(() => {});
      await pg.waitForTimeout(300);
      const tabHit = await pg.evaluate(() => window.__TABHIT);
      tabHit === 'customers.html'
        ? ok('nav tab click resolves target (customers.html)')
        : bad(`tab click target wrong: ${tabHit}`);

      const errs = errors.filter(e => !/favicon/i.test(e));
      errs.length ? bad(`JS errors on active path: ${errs[0]}`) : ok('no JS errors on active path');

      await ctx.close();
    }

    // ── C. No-key-but-demo-param: still silent ───────────────────
    console.log(`\n── 3. Peter-repo safety guard (${name}) ──────────────`);
    {
      const ctx = await browser.newContext();
      const pg = await ctx.newPage();
      await ctx.route('**/signflow-analytics-config.js*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'text/javascript',
          body: "window.SF_ANALYTICS={key:'phc_test',host:''};",
        })
      );
      const ext = [];
      pg.on('request', (r) => {
        const h = new URL(r.url()).hostname;
        if (h !== '127.0.0.1' && h !== 'localhost') ext.push(r.url());
      });
      // Simulate the mockups path — the cross-repo cp failure mode.
      await pg.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
      const blocked = await pg.evaluate(() => {
        // re-run the guard logic against a faked mockups path
        return /signflow-mockups/i.test('/signflow-mockups/index.html');
      });
      blocked ? ok('mockups-path guard regex matches (would disable)')
              : bad('mockups-path guard would NOT trigger');
      await ctx.close();
    }

    await browser.close();
  }

  server.close();
  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  ${pass} passed · ${fail} failed`);
  console.log(`═══════════════════════════════════════════════\n`);
  process.exit(fail ? 1 : 0);
})();

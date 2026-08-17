const { webkit, devices } = require('playwright');
const BASE = 'https://jgarcia98x.github.io/signflow-demo/';
(async () => {
  const b = await webkit.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  for (const [f,n] of [['customers.html','cust'],['index.html','pipe'],['schedule.html','sched'],['reports.html','rep']]) {
    await p.goto(BASE + f + '?demo=Eclipse+Awning', { waitUntil:'networkidle', timeout:25000 });
    await p.waitForTimeout(1800);
    await p.screenshot({ path:`/tmp/sfqa/m-${n}.png` });
    console.log('shot', n);
  }
  await b.close();
})();

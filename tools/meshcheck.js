// Headless mesh checker for trein.html: renders every mesh builder from 4 angles (flicker shown in magenta) and reports
// floating parts, z-fighting and degenerate triangles. Usage: node tools/meshcheck.js trein.html <outdir> [name-regex]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const [,, htmlPath, outDir, filter] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
let html = fs.readFileSync(htmlPath, 'utf8');
// stop the app from booting; expose mesh builders
html = html.replace(/\nboot\(\);\n<\/script>/, '\nwindow.__ready=1;\n</script>');
const VIEW = fs.readFileSync(path.join(__dirname, 'meshcheck_page.js'), 'utf8');
html = html.replace('</body>', '<script>' + VIEW + '</script></body>');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  await p.setContent(html, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready && window.MV);
  const list = await p.evaluate(() => MV.list());
  const report = [];
  for (const name of list) {
    if (filter && !new RegExp(filter).test(name)) continue;
    const r = await p.evaluate(n => MV.show(n), name);
    report.push(r);
    if (r.ok) await p.locator('#mv').screenshot({ path: path.join(outDir, name.replace(/[^a-z0-9_.-]/gi, '_') + '.png') });
  }
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 1));
  for (const r of report) console.log(r.name, r.ok ? `tris ${r.tris} bbox ${r.bbox}` : 'ERR ' + r.err, (r.issues || []).slice(0, 8).join(' | '));
  if (errs.length) console.log('ERRORS:\n' + errs.join('\n'));
  await b.close();
})();

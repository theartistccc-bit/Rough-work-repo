// Emulated budget-phone check: load time on throttled 3G and frame rate with a 6x slower CPU.
//   npm run build && node scripts/perf.mjs
// This is an emulation on a desktop CPU, not a real device; confirm on a real phone.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const { chromium } = createRequire(import.meta.url)('playwright');

const PORT = 4180;
const server = spawn('node', ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((r) => server.stdout.on('data', (d) => String(d).includes('Local') && r()));

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 400 }, deviceScaleFactor: Number(process.env.DPR ?? 2), isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
// "Regular 3G"-ish: 1.6 Mbps down, 750 kbps up, 150 ms latency
await cdp.send('Network.emulateNetworkConditions', {
  offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8,
});
await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.CPU ?? 6) });

const t0 = Date.now();
await page.goto(`http://localhost:${PORT}/`);
await page.waitForFunction(() => window.__ofion?.game.scene.isActive('Title'), null, { timeout: 30000 });
const loadMs = Date.now() - t0;

await page.evaluate(() => window.__ofion.game.scene.getScene('Title').input.keyboard.emit('keydown', { code: 'Enter' }));
await page.waitForFunction(() => window.__ofion.game.scene.isActive('Village'));
await page.evaluate(() => {
  const { store } = window.__ofion;
  store.g.clock.minute = 21 * 60; // night: the heaviest scene (fire glow, overlays, all NPCs)
  store.held.right = true;
});
if (process.env.HIDE) await page.evaluate((hide) => {
  const v = window.__ofion.game.scene.getScene('Village');
  const groups = {
    light: [v.glow],
    sky: [v.sky, v.far, v.stars, v.moon],
    hud: null,
    village: null,
  };
  if (hide === 'hud') window.__ofion.game.scene.getScene('Hud').sys.setVisible(false);
  else if (hide === 'village') v.sys.setVisible(false);
  else groups[hide].forEach((o) => o.setVisible(false).setActive(false));
  v.updateLight = () => {};
}, process.env.HIDE);
await page.waitForTimeout(1500);
const fps = await page.evaluate(() => new Promise((res) => {
  const frames = [];
  let last = performance.now();
  const end = last + 6000;
  const loop = (t) => {
    frames.push(t - last); last = t;
    if (t < end) requestAnimationFrame(loop); else res(frames);
  };
  requestAnimationFrame(loop);
}));
const avg = 1000 / (fps.reduce((a, b) => a + b, 0) / fps.length);
const sorted = [...fps].sort((a, b) => a - b);
const p95 = sorted[Math.floor(sorted.length * 0.95)];
console.log(JSON.stringify({ loadMs, avgFps: +avg.toFixed(1), p95FrameMs: +p95.toFixed(1), frames: fps.length }));
await browser.close();
server.kill();
process.exit(0);

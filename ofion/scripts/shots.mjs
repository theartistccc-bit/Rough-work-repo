// Screenshots of each part of the game. Usage:
//   npm run build && node scripts/shots.mjs <outDir>
// Starts `vite preview`, drives the game through window.__ofion, saves PNGs.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // preinstalled globally or as a dev dep
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'screenshots';
mkdirSync(out, { recursive: true });
const PORT = 4179;
const server = spawn('node', ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((r) => server.stdout.on('data', (d) => String(d).includes('Local') && r()));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const wait = (ms) => page.waitForTimeout(ms);
const shot = async (name) => { await page.screenshot({ path: `${out}/${name}.png` }); console.log('shot', name); };
const set = (fn, arg) => page.evaluate(fn, arg);
const goto = async (x, minute, day) => {
  await set(([x, minute, day]) => {
    const { game, store } = window.__ofion;
    game.scene.getScene('Hud').closeDialog();
    for (const k of ['Fishing', 'Climb', 'Wrestle', 'Plait', 'Contest']) game.scene.stop(k);
    store.minigame = false;
    if (minute != null) store.g.clock.minute = minute;
    if (day != null) store.g.clock.day = day;
    const v = game.scene.getScene('Village');
    v.player.x = x;
    v.cameras.main.centerOnX(x);
  }, [x, minute, day]);
  await wait(400);
};
const key = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await wait(120); } };

await page.goto(`http://localhost:${PORT}/`);
await wait(1500);
await shot('01-title');
await key('Enter');
await wait(800);
await shot('01b-prologue');
await set(() => { const s = window.__ofion.store.g; s.inv = { yam: 3, fish: 4, palmwine: 3, thread: 2, beads: 1, camwood: 1 }; });
await goto(820, 9 * 60);
await shot('02-home-morning');
await goto(1440, 10 * 60);
await key('KeyE');
await shot('03-market-barter');
await key('Digit1');
await shot('04-barter-give');
await key('Escape');
await goto(2560, 13 * 60);
await shot('05-ini-compound-day');
await key('KeyE');
await shot('05b-ini-talk');
await goto(3050, 18 * 60 + 40);
await shot('06-palm-grove-dusk');
await key('KeyE');
await key('KeyA'); await key('KeyD'); await key('KeyA');
await shot('07-climb');
await key('Escape');
await wait(800);
await goto(2080, 21 * 60);
await shot('08-moonlight-square');
await goto(1960, 21 * 60);
await key('KeyE');
await shot('09-tale');
await key('Escape');
await goto(2200, 21 * 60 + 30);
await key('KeyE'); await key('Digit1');
await wait(300);
await shot('10-wrestle');
await key('Escape');
await wait(800);
await goto(300, 6 * 60 + 10);
await key('KeyE');
await wait(500);
await shot('11-fishing-dawn');
await key('Escape');
await wait(800);
await set(() => { window.__ofion.store.g.courtship.affection = 40; });
await goto(2080, 16 * 60 + 30, 4);
await shot('12-festival');
await key('KeyE');
await shot('13-contest-choose');
await key('Digit2');
await wait(400);
await key('ArrowLeft'); await key('ArrowRight'); await key('Space');
await shot('14-plait');
for (let i = 0; i < 9; i++) await key('Space');
await wait(2600);
await wait(3500);
await shot('15-contest-result');
await key('Space');
await wait(500);
await shot('16-ending');

console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no console errors');
await browser.close();
server.kill();
process.exit(errors.length ? 1 : 0);

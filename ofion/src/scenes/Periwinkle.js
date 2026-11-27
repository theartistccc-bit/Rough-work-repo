import { createGather, moveHand, pick, stepGather } from '../logic/activities.js';
import { makeRng } from '../logic/rng.js';
import MiniBase from './MiniBase.js';
import { P } from '../art/palette.js';
import { baked, text } from '../ui.js';
import { strip } from '../art/textures.js';
import { store } from '../store.js';
import { sfx } from '../audio.js';
import { STAGE, burst, ensureFx, skyPanel, stageMask } from './fx.js';

const ROOT_Y = STAGE.y + 150; // where shells cling along the roots
const X0 = STAGE.x + 40;
const XW = STAGE.w - 80;

export default class Periwinkle extends MiniBase {
  constructor() { super('Periwinkle'); }

  create() {
    this.frame('Periwinkles at low tide', 'Move your hand ◀ ▶ under a shell and pick it ● / E');
    ensureFx(this);
    const mask = stageMask(this);
    skyPanel(this, 'climb_sky', false).setMask(mask);
    strip(this, 'bg_far', STAGE.x, STAGE.y + 10, STAGE.w).setMask(mask);
    this.water = strip(this, 'water', STAGE.x, ROOT_Y + 40, STAGE.w).setMask(mask);
    // arching mangrove stilt roots, seen up close from the canoe
    baked(this, 'roots', STAGE.w, 190, (g) => {
      g.lineStyle(9, 0x3a2a1c, 1);
      for (let i = 0; i < 9; i++) {
        const x = 20 + i * 72;
        g.beginPath(); g.arc(x + 36, 190, 60 + (i % 3) * 10, Math.PI, Math.PI * 1.9); g.strokePath();
        g.lineBetween(x + 20, 20, x + 30, 190);
      }
      g.fillStyle(P.mangrove, 1).fillEllipse(STAGE.w / 2, 0, STAGE.w * 1.1, 70);
    }).setPosition(STAGE.x, ROOT_Y - 110).setMask(mask);
    this.shellImgs = new Map(); // one image per live shell, reused across frames
    this.hand = this.add.container(0, ROOT_Y + 34);
    const hg = this.add.graphics();
    hg.fillStyle(P.skin, 1).fillRoundedRect(-14, -6, 28, 34, 10).fillRoundedRect(-16, -18, 7, 18, 3)
      .fillRoundedRect(-7, -22, 7, 20, 3).fillRoundedRect(2, -21, 7, 19, 3).fillRoundedRect(10, -16, 6, 15, 3);
    this.hand.add(hg);
    this.sparkle = burst(this, 'fx_dot', { speed: { min: 30, max: 90 }, lifespan: 500, tint: 0xfff4d6, scale: { start: 0.6, end: 0 } });
    this.count = text(this, STAGE.x + 20, STAGE.y + 12, '', 18);
    this.timeBar = this.add.rectangle(STAGE.x + STAGE.w - 20, STAGE.y + 16, 160, 8, 0xf0c070).setOrigin(1, 0);
    this.s = createGather();
    this.rng = makeRng(this.data_.seed);
  }

  update(time, dt) {
    this.water.tilePositionX += dt * 0.015;
    if (this.finished) return;
    const dir = (store.held.right ? 1 : 0) - (store.held.left ? 1 : 0);
    if (dir) moveHand(this.s, (dir * dt) / 110);
    stepGather(this.s, dt, this.rng);
    this.hand.x = X0 + this.s.hand * XW;
    // draw shells, fading as their time runs out
    const live = new Set(this.s.shells);
    for (const [sh, img] of this.shellImgs) if (!live.has(sh)) { img.destroy(); this.shellImgs.delete(sh); }
    for (const sh of this.s.shells) {
      let img = this.shellImgs.get(sh);
      if (!img) {
        // a pale wet glint behind each dark shell so it stands out on the roots
        img = this.add.container(X0 + sh.x * XW, ROOT_Y, [
          this.add.circle(0, 0, 20, 0xf2ead0, 0.45),
          this.add.image(0, 0, 'icon_periwinkle').setDisplaySize(32, 32),
        ]);
        this.tweens.add({ targets: img, scale: { from: 0.4, to: 1 }, duration: 180, ease: 'Back.easeOut' });
        this.shellImgs.set(sh, img);
      }
      img.setAlpha(Math.min(1, (1 - (this.s.t - sh.born) / this.s.cfg.lifeMs) * 2));
    }
    this.count.setText(`Shells: ${this.s.got}`);
    this.timeBar.width = 160 * Math.max(0, 1 - this.s.t / this.s.cfg.durationMs);
    if (this.s.done) this.finish({ got: this.s.got }, `The tide turns. You gathered ${this.s.got} periwinkles.`);
  }

  press(name) {
    if (name === 'back') return this.finish({ got: this.s.got }, 'You paddle back to the jetty.', 400);
    if (name !== 'act') return;
    const n = pick(this.s);
    sfx(n ? 'good' : 'miss');
    if (n) this.sparkle.explode(8, this.hand.x, ROOT_Y);
    this.tweens.add({ targets: this.hand, y: ROOT_Y + 14, duration: 90, yoyo: true });
  }
}

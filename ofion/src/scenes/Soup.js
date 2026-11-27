import Phaser from 'phaser';
import { ACTIVITIES } from '../logic/config.js';
import { goodHeat, heatAt } from '../logic/activities.js';
import MiniBase from './MiniBase.js';
import { P } from '../art/palette.js';
import { text } from '../ui.js';
import { sfx } from '../audio.js';
import { STAGE, burst, ensureFx } from './fx.js';

const POT = { x: 470, y: STAGE.y + 200 };
const BAR = { x: STAGE.x + 60, y: STAGE.y + STAGE.h - 34, w: 500, h: 18 };
const ORDER = Object.keys(ACTIVITIES.soup.needs); // periwinkle, fish, palm oil

export default class Soup extends MiniBase {
  constructor() { super('Soup'); }

  create() {
    this.frame('Cooking edikang ikong', 'Add each ingredient while the fire is in the bright band: ● / E');
    ensureFx(this);
    this.add.rectangle(STAGE.x, STAGE.y, STAGE.w, STAGE.h, 0x3a2414).setOrigin(0);
    this.add.image(POT.x, POT.y + 70, 'glow').setDisplaySize(300, 220).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.6);
    this.fire = this.add.image(POT.x, POT.y + 80, 'fire').setOrigin(0.5, 1).setDisplaySize(90, 80);
    const pot = this.add.graphics();
    pot.fillStyle(P.terracotta, 1).fillEllipse(POT.x, POT.y, 190, 120)
      .fillStyle(0x6a2a18, 1).fillEllipse(POT.x, POT.y - 46, 150, 30)
      .fillStyle(0x3d6b2a, 1).fillEllipse(POT.x, POT.y - 46, 130, 20); // green leaves in the pot
    this.steam = this.add.particles(POT.x, POT.y - 60, 'fx_dot', {
      speedY: { min: -60, max: -30 }, speedX: { min: -15, max: 15 }, lifespan: 1400, frequency: 220,
      alpha: { start: 0.4, end: 0 }, scale: { start: 0.6, end: 1.6 }, tint: 0xf2ead0,
    });
    this.splash = burst(this, 'fx_drop', { speed: { min: 40, max: 120 }, angle: { min: 220, max: 320 }, gravityY: 300, lifespan: 500, tint: 0xe07030 });
    // ingredients waiting on the side, in order
    this.icons = ORDER.map((k, i) => this.add.image(STAGE.x + STAGE.w - 120 + i * 40, STAGE.y + 40, `icon_${k}`).setDisplaySize(34, 34));
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.55).fillRoundedRect(BAR.x, BAR.y, BAR.w, BAR.h, 8);
    const [a, b] = ACTIVITIES.soup.goodHeat;
    g.fillStyle(0xf0a030, 1).fillRect(BAR.x + a * BAR.w, BAR.y, (b - a) * BAR.w, BAR.h);
    this.marker = this.add.rectangle(BAR.x, BAR.y + BAR.h / 2, 6, BAR.h + 12, 0xf2e6cc);
    text(this, BAR.x - 10, BAR.y + BAR.h / 2, 'heat', 14, '#e0c89a').setOrigin(1, 0.5);
    this.t = 0;
    this.i = 0;
    this.good = 0;
  }

  update(time, dt) {
    if (this.finished) return;
    this.t += dt;
    const heat = heatAt(this.t);
    this.marker.x = BAR.x + heat * BAR.w;
    this.fire.setDisplaySize(90, 80 * (0.6 + heat * 0.6));
  }

  press(name) {
    if (name === 'back') return this.finish({ good: this.good, done: false }, 'You take the pot off the fire.', 400);
    if (name !== 'act') return;
    const ok = goodHeat(heatAt(this.t));
    if (ok) this.good += 1;
    sfx(ok ? 'good' : 'miss');
    // the ingredient flies into the pot
    const icon = this.icons[this.i];
    this.tweens.add({ targets: icon, x: POT.x, y: POT.y - 50, duration: 280, ease: 'Quad.easeIn',
      onComplete: () => { icon.setVisible(false); this.splash.explode(8, POT.x, POT.y - 50); sfx('splash'); } });
    this.i += 1;
    if (this.i >= ORDER.length) {
      this.finish({ good: this.good, done: true }, this.good === ORDER.length ? 'The soup smells wonderful.' : 'The soup is ready.', 1500);
    }
  }
}

import { ACTIVITIES } from '../logic/config.js';
import { isOnBeat } from '../logic/activities.js';
import MiniBase from './MiniBase.js';
import { P } from '../art/palette.js';
import { text } from '../ui.js';
import { sfx } from '../audio.js';
import { STAGE, burst, ensureFx } from './fx.js';

const CFG = ACTIVITIES.pound;
const MORTAR = { x: 480, y: STAGE.y + 230 };

export default class Pound extends MiniBase {
  constructor() { super('Pound'); }

  create() {
    this.frame('Pounding yam', 'Strike when the drum ring closes: ● / E');
    ensureFx(this);
    this.add.rectangle(STAGE.x, STAGE.y, STAGE.w, STAGE.h, 0x5a3a22).setOrigin(0);
    this.add.rectangle(STAGE.x, MORTAR.y, STAGE.w, STAGE.y + STAGE.h - MORTAR.y, 0x8a5a34).setOrigin(0);
    // wooden mortar with the yam inside, and the long pestle
    const m = this.add.graphics();
    m.fillStyle(P.wood, 1).fillRoundedRect(MORTAR.x - 70, MORTAR.y - 90, 140, 100, 18)
      .fillStyle(0x4a2e18, 1).fillEllipse(MORTAR.x, MORTAR.y - 90, 140, 30)
      .fillStyle(0xf2ead0, 1).fillEllipse(MORTAR.x, MORTAR.y - 88, 100, 18);
    this.pestle = this.add.rectangle(MORTAR.x, MORTAR.y - 230, 18, 200, 0x9a6a3a).setOrigin(0.5, 0);
    // the drum beat you keep time with
    this.ring = this.add.circle(MORTAR.x + 200, STAGE.y + 90, 40).setStrokeStyle(4, 0xf0c070);
    this.add.circle(MORTAR.x + 200, STAGE.y + 90, 14, 0xf0c070);
    this.puff = burst(this, 'fx_dot', { speed: { min: 40, max: 120 }, angle: { min: 200, max: 340 }, lifespan: 400, tint: 0xf2ead0, scale: { start: 0.8, end: 0 } });
    this.score = text(this, STAGE.x + 20, STAGE.y + 12, '', 18);
    this.t = -CFG.beatMs; // one beat of count-in
    this.hits = new Set();
    this.lastBeat = -1;
  }

  update(time, dt) {
    if (this.finished) return;
    this.t += dt;
    const phase = ((this.t % CFG.beatMs) + CFG.beatMs) % CFG.beatMs;
    this.ring.setRadius(14 + 46 * (1 - phase / CFG.beatMs));
    const beat = Math.floor(this.t / CFG.beatMs);
    if (beat !== this.lastBeat && beat >= 0 && beat < CFG.beats) { this.lastBeat = beat; sfx('reveal'); }
    this.score.setText(`On the beat: ${this.hits.size} / ${CFG.beats}`);
    if (this.t > CFG.beats * CFG.beatMs + CFG.windowMs) {
      this.finish({ hits: this.hits.size }, this.hits.size >= CFG.beats - 2 ? 'Smooth and stretchy. Perfect.' : 'A little lumpy, but filling.');
    }
  }

  press(name) {
    if (name === 'back') return this.finish({ hits: this.hits.size }, 'You set the pestle down.', 400);
    if (name !== 'act' || this.t < -CFG.windowMs) return;
    const beat = Math.round(this.t / CFG.beatMs);
    const on = isOnBeat(Math.max(0, this.t)) && beat < CFG.beats && !this.hits.has(beat);
    this.tweens.killTweensOf(this.pestle);
    this.pestle.y = MORTAR.y - 230;
    this.tweens.add({ targets: this.pestle, y: MORTAR.y - 190, duration: 70, yoyo: true });
    if (on) { this.hits.add(beat); sfx('thud'); this.puff.explode(8, MORTAR.x, MORTAR.y - 90); } else sfx('miss');
  }
}

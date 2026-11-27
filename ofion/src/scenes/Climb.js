import { climbInput, createClimb } from '../logic/minigames.js';
import MiniBase from './MiniBase.js';
import { P } from '../art/palette.js';
import { baked, text } from '../ui.js';
import { strip } from '../art/textures.js';
import { sfx } from '../audio.js';
import { STAGE, burst, ensureFx, skyPanel, stageMask } from './fx.js';

const LIMIT_MS = 12000;
const TRUNK_X = 480;
const CLIMBER_Y = STAGE.y + 190; // the climber stays put; the world scrolls past

export default class Climb extends MiniBase {
  constructor() { super('Climb'); }

  create() {
    this.frame('Climbing the oil palm', 'Shift the climbing rope: ◀ ▶ ◀ ▶ (alternate). Same hand twice and you slip.');
    ensureFx(this);
    const mask = stageMask(this);
    skyPanel(this, 'climb_sky', false).setMask(mask);
    // the land drops away below as you climb
    this.far = strip(this, 'bg_far', STAGE.x, STAGE.y + 120, STAGE.w).setMask(mask);
    this.ground = this.add.rectangle(STAGE.x, STAGE.y + STAGE.h - 30, STAGE.w, 300, 0xa8784a).setOrigin(0).setMask(mask);
    // an endless trunk: rough bark ringed with old frond bases
    baked(this, 'trunk_tile', 56, 48, (g) => {
      g.fillStyle(P.trunk, 1).fillRect(0, 0, 56, 48);
      g.fillStyle(0x4f3520, 1).fillTriangle(0, 6, 56, 6, 28, 22).fillTriangle(0, 30, 56, 30, 24, 44);
      g.fillStyle(0x8a6a48, 0.5).fillRect(6, 0, 4, 48).fillRect(40, 0, 3, 48);
    }).destroy();
    this.trunk = this.add.tileSprite(TRUNK_X, STAGE.y, 56, STAGE.h, 'trunk_tile').setOrigin(0.5, 0).setMask(mask);
    // the crown and the tapper's gourd come down into view near the top
    this.crown = this.add.image(TRUNK_X, 0, 'palm').setOrigin(0.5, 0).setDisplaySize(260, 700).setMask(mask);
    // the climber: your own character picture, with the climbing rope around the trunk
    this.climber = this.add.image(TRUNK_X - 6, CLIMBER_Y, 'player').setOrigin(0.5, 0.5).setDisplaySize(70, 146);
    this.rope = this.add.ellipse(TRUNK_X, CLIMBER_Y + 10, 92, 26).setStrokeStyle(4, P.thatch, 1);
    this.leaves = burst(this, 'fx_leaf', { speed: { min: 40, max: 120 }, angle: { min: 60, max: 120 }, gravityY: 120, rotate: { min: 0, max: 360 }, lifespan: 1600 });
    this.drops = burst(this, 'fx_dot', { speed: { min: 30, max: 90 }, gravityY: 60, lifespan: 900, tint: 0xfff4d6, scale: { start: 0.6, end: 0 } });
    this.bar = this.add.graphics();
    this.timeText = text(this, STAGE.x + STAGE.w - 20, STAGE.y + 12, '', 18).setOrigin(1, 0);
    this.c = createClimb();
    this.t = 0;
    this.shown = 0; // smoothed progress for the scroll
  }

  update(time, dt) {
    if (this.finished) return;
    this.t += dt;
    this.shown += (this.c.progress - this.shown) * 0.15;
    const p = this.shown;
    this.trunk.tilePositionY = -p * 900;
    this.far.y = STAGE.y + 120 + p * 180;
    this.ground.y = STAGE.y + STAGE.h - 30 + p * 260;
    this.crown.y = STAGE.y - 640 + p * 640; // arrives as you near the top
    this.rope.y = this.climber.y + 10;
    this.bar.clear().fillStyle(0x000000, 0.4).fillRoundedRect(STAGE.x + 16, STAGE.y + 16, 14, STAGE.h - 32, 6)
      .fillStyle(0x8ab84a, 1).fillRoundedRect(STAGE.x + 16, STAGE.y + 16 + (STAGE.h - 32) * (1 - this.c.progress), 14, (STAGE.h - 32) * this.c.progress, 6);
    const left = Math.max(0, (LIMIT_MS - this.t) / 1000);
    this.timeText.setText(`${left.toFixed(1)}s`);
    if (this.c.done) {
      sfx('wine');
      this.drops.explode(16, TRUNK_X - 20, CLIMBER_Y - 70);
      this.finish({ done: true }, 'You reach the crown and take the gourd!');
    } else if (left <= 0) {
      sfx('slip');
      this.finish({ done: false }, 'Your arms tire and you slide down.');
    }
  }

  press(name) {
    if (name === 'back') return this.finish({ done: false }, 'You climb back down.', 400);
    if (name !== 'left' && name !== 'right') return;
    const slip = name === this.c.last;
    sfx(slip ? 'slip' : 'grip');
    climbInput(this.c, name);
    const side = name === 'left' ? -1 : 1;
    this.tweens.killTweensOf(this.climber);
    if (slip) {
      this.leaves.explode(5, TRUNK_X, STAGE.y + 20);
      this.cameras.main.shake(180, 0.006);
      this.tweens.add({ targets: this.climber, y: CLIMBER_Y + 14, angle: side * 8, duration: 120, yoyo: true });
    } else {
      // reach up with one side, then settle as the rope is shifted
      this.tweens.add({ targets: this.climber, y: CLIMBER_Y - 10, angle: side * 5, x: TRUNK_X - 6 + side * 4, duration: 110, yoyo: true, ease: 'Sine.easeOut' });
    }
  }
}

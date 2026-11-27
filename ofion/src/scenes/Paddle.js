import { createPaddle, stepPaddle, stroke } from '../logic/activities.js';
import MiniBase from './MiniBase.js';
import { P } from '../art/palette.js';
import { text } from '../ui.js';
import { strip } from '../art/textures.js';
import { sfx } from '../audio.js';
import { STAGE, burst, ensureFx, skyPanel, stageMask } from './fx.js';

const WATER_Y = STAGE.y + 140;

export default class Paddle extends MiniBase {
  constructor() { super('Paddle'); }

  create() {
    const home = this.data_.direction === 'home';
    this.frame(home ? 'Paddling home' : 'Paddling upriver', 'Stroke ◀ ▶ ◀ ▶ (alternate). Same side twice and the canoe swings to the bank.');
    ensureFx(this);
    const mask = stageMask(this);
    skyPanel(this, 'climb_sky', false).setMask(mask);
    this.far = strip(this, 'bg_far', STAGE.x, STAGE.y + 20, STAGE.w).setMask(mask);
    // mangroves passing on the near bank, water moving under the canoe
    this.bank = this.add.tileSprite(STAGE.x, WATER_Y - 70, STAGE.w, 100, 'mangrove').setOrigin(0).setMask(mask);
    this.bank.setTileScale(0.5, 0.5);
    this.water = strip(this, 'water', STAGE.x, WATER_Y, STAGE.w).setMask(mask);
    this.water.setDisplaySize(STAGE.w, STAGE.h - 140);
    // the canoe with you in it, facing the way you travel
    this.boat = this.add.container(480, WATER_Y + 70);
    const canoe = this.add.image(0, 10, 'canoe').setDisplaySize(220, 46);
    const you = this.add.image(-10, 0, 'player').setOrigin(0.5, 1).setDisplaySize(50, 104);
    this.oar = this.add.rectangle(20, -30, 6, 90, P.wood).setOrigin(0.5, 0).setAngle(30);
    this.boat.add([you, canoe, this.oar]);
    this.wake = burst(this, 'fx_drop', { speed: { min: 30, max: 80 }, angle: { min: 160, max: 200 }, lifespan: 600, gravityY: 100 });
    this.bar = this.add.rectangle(STAGE.x + 20, STAGE.y + 14, 0, 10, 0x8ab84a).setOrigin(0);
    this.add.rectangle(STAGE.x + 20, STAGE.y + 14, STAGE.w - 40, 10).setOrigin(0).setStrokeStyle(2, 0xf2e6cc, 0.6);
    text(this, STAGE.x + STAGE.w - 20, STAGE.y + 30, home ? 'home' : 'upriver market', 14, '#f2e6cc').setOrigin(1, 0);
    this.p = createPaddle();
  }

  update(time, dt) {
    if (this.finished) return;
    stepPaddle(this.p, dt);
    const v = this.p.speed;
    this.water.tilePositionX += dt * (0.02 + v * 0.35);
    this.bank.tilePositionX += dt * (0.05 + v * 0.6);
    this.far.tilePositionX += dt * v * 0.05;
    this.boat.y = WATER_Y + 70 + Math.sin(time / 300) * 3;
    this.bar.width = (STAGE.w - 40) * this.p.dist;
    if (this.p.done) this.finish({ arrived: true }, this.data_.direction === 'home' ? 'Your own jetty comes into view.' : 'The upriver landing is busy with canoes.');
  }

  press(name) {
    if (name === 'back' && this.data_.direction !== 'home') return this.finish({ arrived: false }, 'You turn the canoe back.', 400);
    if (name !== 'left' && name !== 'right') return;
    const same = name === this.p.last;
    stroke(this.p, name);
    sfx(same ? 'slip' : 'splash');
    const side = name === 'left' ? -1 : 1;
    this.oar.setAngle(side * 30);
    this.tweens.add({ targets: this.oar, angle: side * -20, duration: 180, yoyo: true });
    this.wake.explode(5, this.boat.x - 100, this.boat.y + 14);
    if (same) this.tweens.add({ targets: this.boat, angle: side * 6, duration: 160, yoyo: true });
  }
}

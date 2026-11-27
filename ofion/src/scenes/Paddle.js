import { createPaddle, stepPaddle, stroke } from '../logic/activities.js';
import MiniBase from './MiniBase.js';
import { P } from '../art/palette.js';
import { text } from '../ui.js';
import { strip } from '../art/textures.js';
import { sfx } from '../audio.js';
import { STAGE, burst, ensureFx, skyPanel, stageMask } from './fx.js';
import { store } from '../store.js';
import { stripFrames } from '../art/textures.js';
import { armActors, makeArmRig } from '../art/armRig.js';
import { paddleArms } from '../art/arms.js';

const WATER_Y = STAGE.y + 140;

export default class Paddle extends MiniBase {
  constructor() { super('Paddle'); }

  create() {
    if (store.w3d?.active) return this.create3D();
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
    if (this.is3d) return this.update3D(time, dt);
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
    if (this.is3d) return this.press3D(name);
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

  // ---------------------------------------------------------------- the trip, on the 3D creek
  create3D() {
    this.is3d = true;
    const home = this.data_.direction === 'home';
    this.frameLite(home ? 'Paddling home' : 'Paddling upriver', 'Stroke ◀ ▶ ◀ ▶ (alternate sides). Same side twice and the canoe swings to the bank.');
    ensureFx(this);
    const w = store.w3d;
    this.w3d = w;
    // the creek runs left from the jetty; upriver is to the left
    this.x0 = home ? -13 : 3;
    this.x1 = home ? 3 : -13;
    this.z = 2.6; // out on open water, clear of the jetty
    this.frames = stripFrames(this, 'player_paddle', 1); // a paddling strip, frames about square
    const facingLeft = this.x1 < this.x0;
    // a paddling strip if one was supplied; otherwise the player, seated (waist up), with movable arms
    if (!this.frames) this.arms = armActors(makeArmRig(this), { x: this.x0, z: this.z, h: 1.02, cropTop: 0.58, flip: facingLeft });
    this.pieces = w.stage(this.textures, {
      minute: store.g.clock.minute,
      cam: { from: [[0, 0, 0], [0, 0, 0]] },
      actors: this.frames
        ? [{ key: 'player_paddle', x: this.x0, z: this.z, h: 1.25, frames: this.frames, flip: facingLeft }]
        : this.arms.defs,
    });
    this.rower = this.frames ? this.pieces[0] : this.pieces[1];
    w.makeRiverBanks(-16, 5);
    ({ boat: this.boat, paddle: this.paddleMesh } = w.makeCanoe());
    this.events.once('shutdown', () => w.unstage());
    this.bar = this.add.rectangle(180, 140, 0, 10, 0x8ab84a).setOrigin(0, 0.5);
    this.add.rectangle(180, 140, 600, 10).setOrigin(0, 0.5).setStrokeStyle(2, 0xf2e6cc, 0.7);
    text(this, 785, 140, home ? 'home' : 'upriver market', 15, '#f2e6cc', { backgroundColor: '#3a2414d9', padding: { x: 6, y: 3 } }).setOrigin(0, 0.5);
    this.splash = burst(this, 'fx_drop', { speed: { min: 40, max: 110 }, angle: { min: 220, max: 320 }, gravityY: 260, lifespan: 600 });
    this.p = createPaddle();
    this.strokeT = 1;
    this.side = 1;
    this.swing = 0;
  }

  update3D(time, dt) {
    if (!this.finished) stepPaddle(this.p, dt);
    const x = this.x0 + (this.x1 - this.x0) * this.p.dist;
    const bob = Math.sin(time / 420) * 0.025;
    this.swing *= 0.92;
    this.boat.position.set(x, -0.04 + bob, this.z);
    this.boat.rotation.y = this.swing * 0.25; // the canoe swings when you stroke the same side twice
    this.boat.rotation.z = Math.sin(time / 600) * 0.02;
    const by = 0.1 + bob;
    // one paddle stroke: reach forward, dip, pull back past the hip, lift out
    this.strokeT = Math.min(1, this.strokeT + dt / 520);
    const t = this.strokeT;
    const ahead = this.x1 < this.x0 ? -1 : 1; // the way the canoe travels along x
    const pull = t < 1 ? Math.sin(t * Math.PI) : 0; // blade in the water mid-stroke
    const tilt = ahead * (0.55 - t * 1.0);
    this.paddleMesh.rotation.set(this.side * 0.25, 0, tilt);
    if (this.frames) {
      this.rower.position.set(x, by, this.z + 0.02);
      this.w3d.setActorFrame(this.rower, Math.min(this.frames - 1, Math.floor(t * this.frames)));
      this.paddleMesh.position.set(ahead * (0.35 - t * 0.7), 0.75 - pull * 0.25, this.side * 0.34);
    } else {
      // both arms reach forward, pull back past the hip and recover; the top hand rides higher
      const a = paddleArms(t);
      const rad = (Math.PI / 180) * ahead;
      const lean = -ahead * (0.08 - t * 0.14) * (t < 1 ? 1 : 0);
      this.arms.place(this.pieces, x, by, this.z + 0.02, a.top * rad, a.bottom * rad, lean);
      // the paddle follows the lower hand, the shaft running up through it
      const [hx, hy] = this.arms.hand('right', x, by, a.bottom * rad);
      this.paddleMesh.position.set(hx - x - Math.sin(-tilt) * 0.3, hy - (-0.04 + bob) - Math.cos(tilt) * 0.3, this.side * 0.34);
    }
    // the camera rides alongside, a little ahead
    this.w3d.stageCam = { pos: [x + ahead * 1.2, 1.55, this.z + 5.2], look: [x + ahead * 0.6, 0.55, this.z - 0.4] };
    this.bar.width = 600 * this.p.dist;
    if (this.p.done && !this.finished) this.finish({ arrived: true }, this.data_.direction === 'home' ? 'Your own jetty comes into view.' : 'The upriver landing is busy with canoes.');
  }

  press3D(name) {
    if (this.finished) return;
    if (name === 'back' && this.data_.direction !== 'home') return this.finish({ arrived: false }, 'You turn the canoe back.', 400);
    if (name !== 'left' && name !== 'right') return;
    const same = name === this.p.last;
    stroke(this.p, name);
    sfx(same ? 'slip' : 'splash');
    this.side = name === 'left' ? -1 : 1;
    this.strokeT = 0;
    if (same) this.swing = this.side;
    this.splash.explode(6, 480, 400);
  }
}

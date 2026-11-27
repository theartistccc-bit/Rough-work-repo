import Phaser from 'phaser';
import { createFishing, pullFishing, stepFishing } from '../logic/minigames.js';
import { makeRng } from '../logic/rng.js';
import MiniBase from './MiniBase.js';
import { text } from '../ui.js';
import { strip } from '../art/textures.js';
import { sfx } from '../audio.js';
import { STAGE, burst, ensureFx, skyPanel, stageMask } from './fx.js';

const WATER_Y = STAGE.y + 120; // where the creek surface starts on the stage
const FLOAT = { x: 560, y: WATER_Y + 60 };
const ROD_TIP = { x: 300, y: STAGE.y + 40 };

export default class Fishing extends MiniBase {
  constructor() { super('Fishing'); }

  create() {
    this.frame('Fishing from the jetty', 'Wait for the float to dip, then pull: ● / E');
    ensureFx(this);
    const night = this.data_.night;
    const mask = stageMask(this);
    const tint = night ? 0x6a78b0 : 0xffffff;
    // scenery: sky, far mangrove line, moving water, the jetty edge you sit on
    skyPanel(this, night ? 'fish_sky_n' : 'fish_sky', night).setMask(mask);
    this.far = strip(this, 'bg_far', STAGE.x, WATER_Y - 150, STAGE.w).setTint(tint).setMask(mask);
    this.water = strip(this, 'water', STAGE.x, WATER_Y, STAGE.w).setTint(tint).setMask(mask);
    this.water.setDisplaySize(STAGE.w, STAGE.h - 120);
    this.add.image(STAGE.x + 90, STAGE.y + STAGE.h, 'jetty').setOrigin(0.5, 1).setDisplaySize(260, 80).setTint(tint).setMask(mask);
    // rod, line and float
    this.rod = this.add.graphics();
    this.line = this.add.graphics();
    this.ripples = [];
    this.float = this.add.container(FLOAT.x, FLOAT.y);
    this.float.add([this.add.ellipse(0, 4, 18, 8, 0x000000, 0.2), this.add.circle(0, 0, 8, 0xa83a2a).setStrokeStyle(3, 0xf2e6cc)]);
    this.mark = text(this, FLOAT.x, FLOAT.y - 46, '!', 40, '#ffe08a').setOrigin(0.5).setVisible(false);
    this.splash = burst(this, 'fx_drop', { speed: { min: 80, max: 200 }, angle: { min: 230, max: 310 }, gravityY: 500, lifespan: 700, scale: { start: 1.2, end: 0.4 } });
    this.fish = this.add.image(FLOAT.x, FLOAT.y, 'icon_fish').setDisplaySize(64, 64).setVisible(false);

    this.rng = makeRng(this.data_.seed);
    this.f = createFishing(this.rng, { dawnOrDusk: this.data_.dawnOrDusk });
    this.caught = 0;
    this.t = 0;
    this.rippleT = 0;
  }

  update(time, dt) {
    this.water.tilePositionX += dt * 0.02;
    if (this.finished) return;
    this.t += dt;
    const before = this.f.state;
    const st = stepFishing(this.f, dt);
    if (st === 'biting' && before !== 'biting') { sfx('bite'); this.ripple(); }
    const biting = st === 'biting';
    this.rippleT += dt;
    if (biting && this.rippleT > 350) { this.rippleT = 0; this.ripple(); }
    const bob = biting ? 9 + Math.sin(this.t / 40) * 6 : Math.sin(this.t / 450) * 3;
    this.float.y = FLOAT.y + bob;
    this.mark.setVisible(biting);
    // the rod bends when a fish pulls
    const bend = biting ? 18 : 4;
    this.rod.clear().lineStyle(5, 0x6a4a2e, 1).lineBetween(STAGE.x + 70, STAGE.y + STAGE.h - 40, ROD_TIP.x, ROD_TIP.y + bend);
    this.line.clear().lineStyle(1.5, 0xf2e6cc, 0.8).lineBetween(ROD_TIP.x, ROD_TIP.y + bend, this.float.x, this.float.y - 6);
    if (st === 'escaped') { sfx('splash'); this.splash.explode(8, this.float.x, this.float.y); this.result('It slipped away…'); }
  }

  ripple() {
    const r = this.add.ellipse(this.float.x, this.float.y + 4, 20, 7).setStrokeStyle(2, 0xd8f0ea, 0.9);
    this.tweens.add({ targets: r, scaleX: 4, scaleY: 4, alpha: 0, duration: 900, onComplete: () => r.destroy() });
  }

  leap() {
    // the fish arcs out of the water toward your basket
    const f = this.fish.setPosition(this.float.x, this.float.y).setVisible(true).setAngle(-30).setAlpha(1);
    this.splash.explode(14, this.float.x, this.float.y);
    this.tweens.add({ targets: f, x: STAGE.x + 120, duration: 800, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: f, y: STAGE.y + 20, duration: 400, ease: 'Quad.easeOut', yoyo: true, hold: 0,
      onComplete: () => this.tweens.add({ targets: f, alpha: 0, duration: 200 }) });
    this.tweens.add({ targets: f, angle: 200, duration: 800 });
  }

  press(name) {
    if (name === 'back') return this.finish({ caught: this.caught }, 'You wind in your line.', 500);
    if (name !== 'act') return;
    const st = pullFishing(this.f);
    if (st === 'caught') {
      this.caught += 1;
      sfx('catch');
      this.leap();
      this.result('A fish! ● to cast again, ✕ / Q to stop.');
    } else if (st === 'early') {
      sfx('splash');
      this.splash.explode(6, this.float.x, this.float.y);
      this.result('Too early: the fish is scared off.');
    } else if (st === 'escaped' || st === 'caught-done') this.recast();
  }

  result(line) {
    this.hint.setText(line.includes('cast again') ? line : `${line}  ● to cast again, ✕ / Q to stop.`);
    this.f.state = 'caught-done';
    this.mark.setVisible(false);
  }

  recast() {
    if (this.caught >= 3) return this.finish({ caught: this.caught }, 'Enough for today. Your basket is full.');
    this.f = createFishing(this.rng, { dawnOrDusk: this.data_.dawnOrDusk });
    this.float.x = FLOAT.x + (this.rng() - 0.5) * 120; // cast lands somewhere new
    this.mark.x = this.float.x;
    this.hint.setText('Wait for the float to dip, then pull: ● / E');
  }
}

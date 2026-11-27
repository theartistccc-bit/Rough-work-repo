import Phaser from 'phaser';
import { WRESTLE } from '../logic/config.js';
import { markerAt, throwQuality, wrestleMatch, wrestleRound } from '../logic/minigames.js';
import MiniBase from './MiniBase.js';
import { baked, text } from '../ui.js';
import { sfx } from '../audio.js';
import { STAGE, burst, ensureCrowd, ensureFx, skyPanel, stageMask } from './fx.js';

const BAR = { x: 280, y: STAGE.y + STAGE.h - 40, w: 400, h: 20 };
const FLOOR = STAGE.y + 200;
const ME_X = 445;
const THEM_X = 515;

export default class Wrestle extends MiniBase {
  constructor() { super('Wrestle'); }

  create() {
    const o = this.data_.opponent;
    this.frame(`Wrestling ${o.name}`, 'Throw when the marker is in the bright band: ● / E');
    ensureFx(this);
    const mask = stageMask(this);
    skyPanel(this, 'fish_sky_n', true).setMask(mask);
    // the crowd in a ring of firelight
    this.crowd = this.add.image(STAGE.x, FLOOR - 70, ensureCrowd(this, STAGE.w)).setOrigin(0).setMask(mask);
    this.tweens.add({ targets: this.crowd, y: FLOOR - 74, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    for (const x of [STAGE.x + 60, STAGE.x + STAGE.w - 60]) {
      this.add.image(x, FLOOR - 10, 'glow').setDisplaySize(220, 220).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.7).setMask(mask);
      this.add.image(x, FLOOR, 'fire').setOrigin(0.5, 1).setDisplaySize(40, 50).setMask(mask);
    }
    this.add.image(480, FLOOR + 8, 'ring').setDisplaySize(380, 46).setMask(mask);
    // the two wrestlers, from the game's own character pictures
    this.me = this.add.image(ME_X, FLOOR + 4, 'player').setOrigin(0.5, 1).setDisplaySize(64, 134);
    this.them = this.add.image(THEM_X, FLOOR + 4, 'wrestler').setOrigin(0.5, 1).setDisplaySize(64, 134).setFlipX(true);
    if (o.skill > 0.7) this.them.setTint(0xd8c0a0);
    text(this, ME_X, STAGE.y + 14, 'You', 15).setOrigin(0.5, 0);
    text(this, THEM_X, STAGE.y + 14, o.name, 15).setOrigin(0.5, 0);
    this.dust = burst(this, 'fx_dust', { speed: { min: 40, max: 140 }, angle: { min: 180, max: 360 }, lifespan: 600, scale: { start: 1, end: 0.2 }, alpha: { start: 0.8, end: 0 } });

    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.55).fillRoundedRect(BAR.x, BAR.y, BAR.w, BAR.h, 8);
    const [a, b] = WRESTLE.sweetSpot;
    g.fillStyle(0xf0c070, 1).fillRect(BAR.x + a * BAR.w, BAR.y, (b - a) * BAR.w, BAR.h);
    this.marker = this.add.rectangle(BAR.x, BAR.y + BAR.h / 2, 6, BAR.h + 12, 0xf2e6cc);
    this.score = text(this, 480, STAGE.y + 40, '', 22).setOrigin(0.5, 0);
    this.rounds = [];
    this.t = 0;
    this.speed = 0.9 + o.skill;
    this.paused = false;
    // circling: both sway a little while waiting
    this.tweens.add({ targets: [this.me, this.them], scaleY: '*=1.02', duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  update(time, dt) {
    if (this.finished || this.paused) return;
    this.t += dt;
    this.marker.x = BAR.x + markerAt(this.t, this.speed) * BAR.w;
  }

  press(name) {
    if (name === 'back') return this.finish({ won: false }, 'You step out of the ring.', 400);
    if (name !== 'act' || this.paused) return;
    const q = throwQuality(markerAt(this.t, this.speed));
    const won = wrestleRound(q, this.data_.opponent.skill, this.data_.renown, this.data_.fullness);
    this.rounds.push(won);
    this.paused = true;
    this.clash(won);
    this.score.setText(this.rounds.map((r) => (r ? '●' : '○')).join('  '));
    const state = wrestleMatch(this.rounds);
    if (state !== 'ongoing') {
      this.time.delayedCall(500, () => sfx(state === 'won' ? 'cheer' : 'lose'));
      return this.finish({ won: state === 'won' }, state === 'won' ? 'You win the bout!' : 'You lose the bout.', 1800);
    }
    this.hint.setText(won ? 'A clean throw!' : 'He holds firm…');
    this.time.delayedCall(1300, () => { this.paused = false; this.t = 0; this.hint.setText('Next round: ● / E'); });
  }

  clash(won) {
    const loser = won ? this.them : this.me;
    const dir = won ? 1 : -1;
    // both lunge in, grapple, then the loser goes down in the sand
    this.tweens.add({ targets: this.me, x: 470, duration: 160, ease: 'Quad.easeIn' });
    this.tweens.add({ targets: this.them, x: 490, duration: 160, ease: 'Quad.easeIn',
      onComplete: () => {
        sfx('thud');
        this.cameras.main.shake(220, 0.01);
        this.dust.explode(14, loser.x, FLOOR);
        this.tweens.add({ targets: loser, angle: dir * 82, x: loser.x + dir * 40, duration: 260, ease: 'Quad.easeIn' });
        this.time.delayedCall(800, () => {
          this.tweens.add({ targets: loser, angle: 0, duration: 250 });
          this.tweens.add({ targets: this.me, x: ME_X, duration: 300 });
          this.tweens.add({ targets: this.them, x: THEM_X, duration: 300 });
        });
      } });
  }
}

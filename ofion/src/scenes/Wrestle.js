import { WRESTLE } from '../logic/config.js';
import { markerAt, throwQuality, wrestleMatch, wrestleRound } from '../logic/minigames.js';
import MiniBase from './MiniBase.js';
import { P } from '../art/palette.js';
import { text } from '../ui.js';
import { sfx } from '../audio.js';

const BAR = { x: 230, y: 300, w: 500, h: 26 };

export default class Wrestle extends MiniBase {
  constructor() { super('Wrestle'); }

  create() {
    const o = this.data_.opponent;
    this.frame(`Wrestling ${o.name}`, 'Throw when the marker is in the bright band: ● / E');
    this.add.ellipse(480, 230, 420, 70, P.sand, 0.8);
    this.me = this.add.ellipse(440, 200, 46, 80, P.skin);
    this.them = this.add.ellipse(520, 200, 46, 80, 0x4a2c1a);
    text(this, 440, 140, 'You', 15).setOrigin(0.5);
    text(this, 520, 140, o.name, 15).setOrigin(0.5);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.45).fillRoundedRect(BAR.x, BAR.y, BAR.w, BAR.h, 8);
    const [a, b] = WRESTLE.sweetSpot;
    g.fillStyle(0xf0c070, 1).fillRect(BAR.x + a * BAR.w, BAR.y, (b - a) * BAR.w, BAR.h);
    this.marker = this.add.rectangle(BAR.x, BAR.y + BAR.h / 2, 6, BAR.h + 14, 0xf2e6cc);
    this.score = text(this, 480, 360, '', 20).setOrigin(0.5);
    this.rounds = [];
    this.t = 0;
    this.speed = 0.9 + o.skill;
    this.paused = false;
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
    sfx('thud');
    this.tweens.add({ targets: won ? this.them : this.me, angle: won ? 80 : -80, duration: 200, yoyo: true, hold: 300 });
    this.score.setText(this.rounds.map((r) => (r ? '●' : '○')).join('  '));
    const state = wrestleMatch(this.rounds);
    if (state !== 'ongoing') sfx(state === 'won' ? 'cheer' : 'lose');
    if (state !== 'ongoing') return this.finish({ won: state === 'won' }, state === 'won' ? 'You win the bout!' : 'You lose the bout.');
    this.paused = true;
    this.hint.setText(won ? 'A clean throw!' : 'He holds firm…');
    this.time.delayedCall(800, () => { this.paused = false; this.t = 0; this.hint.setText('Next round: ● / E'); });
  }
}

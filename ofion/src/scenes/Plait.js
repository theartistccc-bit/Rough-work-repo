import { createPlait, plaitAccuracy, plaitInput } from '../logic/minigames.js';
import { styleById } from '../logic/contest.js';
import { makeRng } from '../logic/rng.js';
import MiniBase from './MiniBase.js';
import { text } from '../ui.js';

const MOVE_MS = 2600;
const SYMBOL = { left: '◀', right: '▶', tuck: '●' };
const KEY_TO_MOVE = { left: 'left', right: 'right', act: 'tuck' };

export default class Plait extends MiniBase {
  constructor() { super('Plait'); }

  create() {
    const style = styleById(this.data_.styleId);
    this.frame(`Plaiting: ${style.label}`, 'Follow the pattern: ◀ cross left, ▶ cross right, ● tuck (E)');
    this.p = createPlait(makeRng(this.data_.seed), this.data_.styleId);
    this.add.image(330, 260, 'bust_plain').setDisplaySize(180, 220);
    this.styled = this.add.image(330, 260, `bust_${this.data_.styleId}`).setDisplaySize(180, 220).setAlpha(0);
    this.cells = this.p.pattern.map((m, i) => {
      const x = 470 + (i % 6) * 50;
      const y = 180 + Math.floor(i / 6) * 70;
      this.add.rectangle(x, y, 42, 50, 0x000000, 0.35).setStrokeStyle(2, 0xc8873a, 0.6);
      return text(this, x, y, SYMBOL[m], 26).setOrigin(0.5);
    });
    this.timer = this.add.rectangle(470 - 21, 340, 0, 8, 0xf0c070).setOrigin(0, 0.5);
    this.t = 0;
    this.mark();
  }

  mark() {
    this.cells.forEach((c, i) => c.setAlpha(i === this.p.i ? 1 : i < this.p.i ? 0.55 : 0.4).setScale(i === this.p.i ? 1.25 : 1));
  }

  update(time, dt) {
    if (this.finished) return;
    this.t += dt;
    this.timer.width = 292 * Math.max(0, 1 - this.t / MOVE_MS);
    if (this.t >= MOVE_MS) this.move(null); // too slow counts as a miss
  }

  press(name) {
    if (KEY_TO_MOVE[name]) this.move(KEY_TO_MOVE[name]);
  }

  move(m) {
    const i = this.p.i;
    const ok = this.p.pattern[i] === m;
    plaitInput(this.p, m);
    this.cells[i].setColor(ok ? '#a8e070' : '#e06a50');
    this.t = 0;
    this.styled.setAlpha(this.p.i / this.p.pattern.length);
    this.mark();
    if (this.p.done) {
      const acc = plaitAccuracy(this.p);
      this.finish({ accuracy: acc }, `Done: ${Math.round(acc * 100)}% of the plaits are true.`, 1600);
    }
  }
}

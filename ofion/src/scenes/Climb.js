import { climbInput, createClimb } from '../logic/minigames.js';
import MiniBase from './MiniBase.js';
import { P } from '../art/palette.js';
import { text } from '../ui.js';

const LIMIT_MS = 12000;

export default class Climb extends MiniBase {
  constructor() { super('Climb'); }

  create() {
    this.frame('Climbing the oil palm', 'Shift the climbing rope: ◀ ▶ ◀ ▶ (alternate). Same hand twice and you slip.');
    const g = this.add.graphics();
    g.fillStyle(P.trunk, 1);
    g.fillRect(455, 120, 50, 280);
    g.fillStyle(0x4f3520, 1);
    for (let y = 130; y < 400; y += 18) g.fillTriangle(452, y, 508, y, 480, y + 10);
    g.lineStyle(5, P.palm, 1);
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * (0.05 + i * 0.11);
      g.lineBetween(480, 125, 480 + Math.cos(a) * 140, 125 + Math.sin(a) * 50 + 40);
    }
    g.fillStyle(P.ochre, 1);
    g.fillEllipse(455, 150, 22, 28); // the gourd waiting at the top
    this.climber = this.add.container(480, 380);
    const body = this.add.graphics();
    body.fillStyle(P.skin, 1).fillCircle(0, -26, 11).fillEllipse(0, 0, 26, 36);
    body.fillStyle(P.indigo, 1).fillRect(-13, 6, 26, 14);
    this.rope = this.add.graphics();
    this.climber.add([this.rope, body]);
    this.bar = this.add.graphics();
    this.timeText = text(this, 700, 130, '', 18).setOrigin(0.5);
    this.c = createClimb();
    this.t = 0;
  }

  update(time, dt) {
    if (this.finished) return;
    this.t += dt;
    const targetY = 380 - this.c.progress * 225;
    this.climber.y += (targetY - this.climber.y) * 0.25;
    this.rope.clear().lineStyle(3, P.thatch, 1).strokeEllipse(0, 4, 64, 18);
    this.bar.clear().fillStyle(0x000000, 0.4).fillRect(220, 130, 16, 260)
      .fillStyle(0x8ab84a, 1).fillRect(220, 390 - 260 * this.c.progress, 16, 260 * this.c.progress);
    const left = Math.max(0, (LIMIT_MS - this.t) / 1000);
    this.timeText.setText(`${left.toFixed(1)}s`);
    if (this.c.done) this.finish({ done: true }, 'You reach the crown and take the gourd!');
    else if (left <= 0) this.finish({ done: false }, 'Your arms tire and you slide down.');
  }

  press(name) {
    if (name === 'back') return this.finish({ done: false }, 'You climb back down.', 400);
    if (name === 'left' || name === 'right') {
      climbInput(this.c, name);
      this.climber.x = 480 + (name === 'left' ? -6 : 6);
    }
  }
}

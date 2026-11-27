import Phaser from 'phaser';
import { store } from '../store.js';
import { GOODS, HUNGER } from '../logic/config.js';
import { formatClock, phaseAt } from '../logic/dayCycle.js';
import { status } from '../logic/hunger.js';
import { stage } from '../logic/courtship.js';
import { zoneAt } from '../world.js';
import { baked, button, panel, pill, text, CREAM } from '../ui.js';

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  KeyE: 'act', Space: 'act', Enter: 'act', Escape: 'back', Backspace: 'back', KeyQ: 'back',
};

// HUD, dialogs, toasts and controls (keyboard and touch). Always on top.
export default class Hud extends Phaser.Scene {
  constructor() { super('Hud'); }

  create() {
    this.dialog = null;
    this.sig = '';
    this.acc = 0;
    this.touch = this.sys.game.device.input.touch || /[?&]touch/.test(location.search);

    this.buildStats();
    this.prompt = this.add.container(480, 0).setVisible(false);
    this.promptText = text(this, 0, 0, '', 18).setOrigin(0.5);
    this.prompt.add(this.promptText);
    this.toastText = text(this, 490, 12, '', 17, CREAM, {
      backgroundColor: '#3a2414f0', padding: { x: 12, y: 7 }, align: 'center', wordWrap: { width: 380 },
    }).setOrigin(0.5, 0).setAlpha(0).setDepth(50);
    this.invRow = this.add.container(0, 0);

    this.input.keyboard.on('keydown', (e) => this.onKey(e, true));
    this.input.keyboard.on('keyup', (e) => this.onKey(e, false));
    if (this.touch) this.buildTouch();
    this.events.on('shutdown', () => { store.held.left = store.held.right = false; });
  }

  press(name, arg) {
    if (this.dialog) return this.dialogInput(name, arg);
    this.game.events.emit('press', name, arg);
  }

  onKey(e, down) {
    const name = KEYMAP[e.code];
    if (name === 'left' || name === 'right') store.held[name] = down;
    if (!down || e.repeat) return;
    if (/^Digit[1-9]$/.test(e.code)) return this.press('pick', Number(e.code.slice(5)) - 1);
    if (name) this.press(name);
  }

  // ---------- touch ----------
  buildTouch() {
    const mk = (x, y, r, label, name, holdable) => {
      baked(this, `touch_${r}`, r * 2 + 4, r * 2 + 4, (g) => {
        g.fillStyle(0x3a2414, 0.55);
        g.fillCircle(r + 2, r + 2, r);
        g.lineStyle(3, 0xf2e6cc, 0.6);
        g.strokeCircle(r + 2, r + 2, r);
      }).setPosition(x - r - 2, y - r - 2).setDepth(40);
      text(this, x, y, label, r * 0.8).setOrigin(0.5).setDepth(41).setAlpha(0.9);
      const z = this.add.zone(x, y, r * 2.2, r * 2.2).setInteractive().setDepth(42);
      z.on('pointerdown', () => { if (holdable) store.held[name] = true; this.press(name); });
      const up = () => { if (holdable) store.held[name] = false; };
      z.on('pointerup', up);
      z.on('pointerout', up);
    };
    mk(70, 470, 44, '◀', 'left', true);
    mk(180, 470, 44, '▶', 'right', true);
    mk(880, 465, 50, '●', 'act', false);
    mk(905, 370, 30, '✕', 'back', false);
  }

  // ---------- stats ----------
  buildStats() {
    panel(this, 10, 10, 270, 78, 0.85);
    this.clockText = text(this, 26, 20, '', 18);
    this.zoneText = text(this, 26, 42, '', 14, '#e0c89a');
    pill(this, 160, 12, 0x000000, 0.4, 5).setPosition(26, 58);
    this.bar = this.add.rectangle(26, 58, 160, 12, 0x8ab84a).setOrigin(0);
    this.barText = text(this, 270, 64, '', 13, CREAM).setOrigin(1, 0.5);
    panel(this, 700, 10, 250, 78, 0.85);
    this.rightText = text(this, 716, 20, '', 15, CREAM, { lineSpacing: 4 });
  }

  update(time, dt) {
    this.acc += dt;
    if (this.acc < 150) return;
    this.acc = 0;
    const g = store.g;
    if (!g) return;
    const fullness = Math.round(g.fullness);
    const vx = this.scene.get('Village')?.player?.x ?? 0;
    const sig = [Math.floor(g.clock.minute), g.clock.day, fullness, JSON.stringify(g.inv),
      g.wisdom, g.renown, g.courtship.affection, zoneAt(vx)].join('|');
    if (sig === this.sig) return;
    this.sig = sig;
    this.clockText.setText(`${formatClock(g.clock)}  ${phaseAt(g.clock.minute)}`);
    this.zoneText.setText(zoneAt(vx));
    const st = status(g.fullness);
    const col = st === 'fed' ? 0x8ab84a : st === 'hungry' ? 0xe0a030 : 0xd04030;
    this.bar.setFillStyle(col).setSize(Math.max(4, (160 * g.fullness) / HUNGER.max), 12);
    this.barText.setText(st === 'fed' ? 'Belly full' : st === 'hungry' ? 'Hungry' : 'Starving!');
    this.rightText.setText(
      `Wisdom ${g.wisdom}   Renown ${g.renown}\nIni: ${stage(g.courtship.affection)} (${g.courtship.affection})`,
    );
    this.drawInventory();
  }

  drawInventory() {
    this.invRow.removeAll(true);
    const items = Object.entries(store.g.inv).filter(([, n]) => n > 0);
    const w = 62;
    const x0 = 480 - (items.length * w) / 2;
    const y = this.touch ? 500 : 504;
    if (items.length) {
      this.invRow.add(pill(this, items.length * w + 16, 44, 0x3a2414, 0.75, 12).setPosition(x0 - 8, y - 22));
    }
    items.forEach(([good, n], i) => {
      const x = x0 + i * w + 18;
      this.invRow.add(this.add.image(x, y, `icon_${good}`).setDisplaySize(30, 30));
      this.invRow.add(text(this, x + 18, y, `${n}`, 16).setOrigin(0, 0.5));
    });
  }

  // ---------- prompt & toast ----------
  setPrompt(str) {
    if (!str) return this.prompt.setVisible(false);
    if (this.promptText.text !== str) {
      this.promptText.setText(str);
      const w = Math.ceil((this.promptText.width + 32) / 16) * 16; // few distinct sizes to cache
      this.promptBg?.destroy();
      this.promptBg = pill(this, w, 36, 0x2a1a10, 0.85).setPosition(-w / 2, -18);
      this.prompt.addAt(this.promptBg, 0);
    }
    this.prompt.setPosition(480, this.touch ? 440 : 450).setVisible(!this.dialog);
  }

  toast(str, ms = 2600) {
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setText(str).setAlpha(1);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: ms, duration: 500 });
  }

  // ---------- dialog ----------
  /** opts: { title, body, options: [{ label, onPick, disabled }], onBack, image } */
  showDialog(opts) {
    this.closeDialog(true);
    store.dialog = true;
    const opt = opts.options ?? [];
    const cols = opt.length > 5 ? 2 : 1;
    const rows = Math.ceil(opt.length / cols);
    const W = cols === 2 ? 760 : 600;
    const isPortrait = opts.image?.startsWith('portrait_');
    const slot = isPortrait ? { w: 150, h: 180 } : { w: 130, h: 140 };
    const bodyW = opts.image ? W - slot.w - 70 : W - 48;
    const c = this.add.container(0, 0).setDepth(30);
    const tTitle = text(this, 0, 0, opts.title ?? '', 24, '#f0c070');
    const tBody = text(this, 0, 0, opts.body ?? '', 17, CREAM, { wordWrap: { width: bodyW }, lineSpacing: 5 });
    const bodyH = Math.max(tBody.height, opts.image ? slot.h : 0);
    const H = 70 + bodyH + rows * 50 + 16;
    const x = 480 - W / 2;
    const y = Math.max(8, Math.min(532 - H, Math.max(72, 290 - H / 2)));
    const shade = this.add.rectangle(0, 0, 960, 540, 0x000000, 0.35).setOrigin(0).setInteractive();
    c.add([shade, panel(this, x, y, W, H)]);
    tTitle.setPosition(x + 24, y + 20);
    tBody.setPosition(x + 24, y + 58);
    c.add([tTitle, tBody]);
    if (opts.image) {
      const img = this.add.image(x + W - 24 - slot.w / 2, y + 58, opts.image).setOrigin(0.5, 0);
      const src = img.frame;
      // fit inside the slot, keeping the picture's own proportions
      const k = Math.min(slot.w / src.width, slot.h / src.height);
      img.setDisplaySize(src.width * k, src.height * k);
      c.add(img);
    }
    const bw = cols === 2 ? (W - 60) / 2 : W - 48;
    this.dialogButtons = opt.map((o, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const b = button(this, x + 24 + col * (bw + 12), y + 70 + bodyH + row * 50, bw, 42,
        `${i + 1}. ${o.label}`, () => this.pick(i), { size: 17, disabled: o.disabled });
      c.add(b);
      return b;
    });
    this.dialog = { c, opts, sel: opt.findIndex((o) => !o.disabled) };
    this.highlight();
    this.prompt.setVisible(false);
  }

  highlight() {
    this.dialogButtons.forEach((b, i) => !this.dialog.opts.options[i].disabled && b.setHighlight(i === this.dialog.sel));
  }

  dialogInput(name, arg) {
    const d = this.dialog;
    const opts = d.opts.options ?? [];
    const step = (dir) => {
      for (let k = 1; k <= opts.length; k++) {
        const j = (d.sel + dir * k + opts.length * 2) % opts.length;
        if (!opts[j].disabled) { d.sel = j; break; }
      }
      this.highlight();
    };
    if (name === 'pick') return this.pick(arg);
    if (name === 'up' || name === 'left') return step(-1);
    if (name === 'down' || name === 'right') return step(1);
    if (name === 'act') return d.sel >= 0 ? this.pick(d.sel) : this.back();
    if (name === 'back') return this.back();
  }

  back() {
    const onBack = this.dialog?.opts.onBack;
    this.closeDialog();
    onBack?.();
  }

  pick(i) {
    const o = this.dialog?.opts.options?.[i];
    if (!o || o.disabled) return;
    this.closeDialog();
    o.onPick?.();
  }

  closeDialog(keepFlag = false) {
    if (!this.dialog) return;
    this.dialog.c.destroy();
    this.dialog = null;
    if (!keepFlag) store.dialog = false;
  }
}

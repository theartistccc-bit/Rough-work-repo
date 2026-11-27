import Phaser from 'phaser';
import { panel, text } from '../ui.js';
import { place, strip } from '../art/textures.js';
import { sfx } from '../audio.js';
import { ensureCrowd } from './fx.js';
import { store } from '../store.js';
import { SHOTS_3D } from '../world3d/shots.js';

// Full-screen story moments. Each shot is staged from the game's own pictures, or, if
// ./assets/cut_<shot>.png (960x540) exists, that painting is shown instead.
// data: { shots: [{ shot: 'creek' | 'moon' | 'bank' | 'fire' | 'festival' | 'jetty', caption }], onDone }

const H = 540;
const BIG = 2.4; // people are drawn larger than in the village

const NIGHT = 0x5a6aa8;

// enlarge from the village size, whatever size the real picture is
const grow = (o, k) => o.setDisplaySize(o.displayWidth * k, o.displayHeight * k);
const person = (s, key, x, y, flip = false, k = BIG) => grow(place(s, key, x, y), k).setFlipX(flip);

const STAGING = {
  // dawn on the creek: the jetty, the old canoe, you with an empty basket
  creek(s) {
    s.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(960, H);
    strip(s, 'bg_far', 0, 170, 960);
    strip(s, 'water', 0, 330, 960).setDisplaySize(960, 210);
    grow(place(s, 'mangrove', 110, 380), 1.6);
    grow(place(s, 'jetty', 560, 470), 2.2);
    grow(place(s, 'canoe', 300, 430), 1.8);
    person(s, 'player', 640, 400);
    s.add.image(700, 392, 'icon_fish').setDisplaySize(40, 40).setAlpha(0.35); // the basket is nearly empty
  },
  // the full moon over still water: the festival is coming
  moon(s) {
    s.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(960, H).setTint(NIGHT);
    strip(s, 'bg_far', 0, 200, 960).setTint(0x3a4470);
    strip(s, 'water', 0, 360, 960).setDisplaySize(960, 180).setTint(0x4a5a90);
    grow(place(s, 'moon', 480, 160, 0.5), 2.6);
    s.add.ellipse(480, 430, 120, 16, 0xfff4d6, 0.35); // its light on the water
  },
  // Ini on the bank, laughing at your basket
  bank(s) {
    s.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(960, H);
    strip(s, 'bg_far', 0, 170, 960);
    s.add.rectangle(0, 400, 960, 140, 0xa8784a).setOrigin(0);
    strip(s, 'water', 0, 420, 420).setDisplaySize(420, 120);
    grow(place(s, 'hut_ini', 760, 410), 1.5);
    person(s, 'ini', 560, 470, true, 2.8);
    person(s, 'player', 260, 470, false, 2.6);
  },
  // the fire at night, the elder's tale, Ini on the other side
  fire(s) {
    s.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(960, H).setTint(NIGHT);
    s.add.rectangle(0, 400, 960, 140, 0x3a2a1c).setOrigin(0);
    s.add.image(480, 420, 'glow').setScale(2.4).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.85);
    person(s, 'elder', 320, 480, false, 2.4).setTint(0xffc890);
    grow(place(s, 'fire', 480, 470), 2.2);
    person(s, 'ini', 660, 480, true, 2.4).setTint(0xffc890);
    person(s, 'player', 160, 500, false, 2.6).setTint(0xd8a070);
  },
  // the festival opens: crowd, drums, the maidens in their high hair
  festival(s) {
    s.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(960, H);
    strip(s, 'bg_far', 0, 150, 960);
    s.add.rectangle(0, 380, 960, 160, 0xc89a62).setOrigin(0);
    const crowd = s.add.image(0, 300, ensureCrowd(s, 960)).setOrigin(0).setScale(1, 1.2).setTint(0x8a6040);
    s.tweens.add({ targets: crowd, y: 294, duration: 260, yoyo: true, repeat: -1 });
    ['drummer', 'drummer', 'drummer'].forEach((k, i) => person(s, k, 90 + i * 70, 470, false, 1.8));
    ['rival_affiong', 'rival_nkoyo', 'ini', 'rival_ekaette'].forEach((k, i) => {
      const p = person(s, k, 420 + i * 130, 480, i > 1, 2.4);
      s.tweens.add({ targets: p, y: 470, angle: i % 2 ? 3 : -3, duration: 300 + i * 40, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
  },
  // the jetty under the moon, the two of you sitting together
  jetty(s) {
    s.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(960, H).setTint(NIGHT);
    grow(place(s, 'moon', 720, 130, 0.5), 2);
    strip(s, 'bg_far', 0, 200, 960).setTint(0x2a3460);
    strip(s, 'water', 0, 360, 960).setDisplaySize(960, 180).setTint(0x4a5a90);
    s.add.ellipse(720, 420, 90, 12, 0xfff4d6, 0.35);
    grow(place(s, 'jetty', 420, 470), 2.4).setTint(0x8a90c0);
    person(s, 'player', 380, 392, false, 2.2).setTint(0xb0b8e0);
    person(s, 'ini', 450, 392, true, 2.2).setTint(0xb0b8e0);
  },
};

export default class Cutscene extends Phaser.Scene {
  constructor() { super('Cutscene'); }

  init(data) {
    this.data_ = data;
    this.i = -1;
    this.ended = false; // scene objects are reused, so reset per-run flags
    this.busy = false;
  }

  create() {
    this.scene.get('Hud').sys.setVisible(false);
    this.stage = this.add.container(0, 0);
    this.capBg = panel(this, 60, 404, 840, 120, 0.9).setDepth(10);
    this.caption = text(this, 90, 424, '', 18, '#f2e6cc', { wordWrap: { width: 780 }, lineSpacing: 5 }).setDepth(11);
    this.hint = text(this, 880, 510, '● next   ✕ skip', 13, '#c8b090').setOrigin(1, 1).setDepth(11);
    this.onPress = (name) => {
      if (name === 'act') this.next();
      else if (name === 'back') this.end();
    };
    this.game.events.on('press', this.onPress);
    this.input.on('pointerup', () => this.next());
    this.events.once('shutdown', () => this.game.events.off('press', this.onPress));
    this.next();
  }

  next() {
    if (this.busy) return;
    this.i += 1;
    const shot = this.data_.shots[this.i];
    if (!shot) return this.end();
    sfx('open');
    const show = () => {
      this.stage.removeAll(true);
      this.tweens.killTweensOf(this.stage);
      const before = this.children.list.length;
      const w3d = store.w3d?.active ? store.w3d : null;
      if (this.textures.exists(`cut_${shot.shot}`)) {
        w3d?.unstage();
        this.add.image(0, 0, `cut_${shot.shot}`).setOrigin(0).setDisplaySize(960, H);
      } else if (w3d && SHOTS_3D[shot.shot]) {
        ensureCrowd(this, 560);
        w3d.stage(this.textures, SHOTS_3D[shot.shot]); // filmed in the 3D village
        this.fade3d(1);
      } else STAGING[shot.shot](this);
      // gather what the staging added into the stage container, so it can drift slowly
      const added = this.children.list.slice(before);
      added.forEach((o) => this.stage.add(o));
      this.stage.setScale(1).setPosition(0, 0);
      this.tweens.add({ targets: this.stage, scale: 1.05, x: -24, y: -14, duration: 9000, ease: 'Sine.easeInOut' });
      this.caption.setText(shot.caption ?? '');
      this.capBg.setVisible(Boolean(shot.caption));
      this.cameras.main.fadeIn(350);
      this.busy = false;
    };
    this.busy = true;
    if (this.i === 0) show();
    else {
      this.fade3d(0);
      this.cameras.main.fadeOut(250);
      this.cameras.main.once('camerafadeoutcomplete', show);
    }
  }

  /** Fade the 3D view (a separate canvas under this one). */
  fade3d(to) {
    const cv = store.w3d?.active && store.w3d.renderer.domElement;
    if (!cv) return;
    cv.style.transition = 'opacity 0.3s';
    cv.style.opacity = String(to);
  }

  end() {
    if (this.ended) return;
    this.ended = true;
    store.w3d?.unstage();
    this.fade3d(1);
    this.scene.get('Hud').sys.setVisible(true);
    this.data_.onDone({});
  }
}

export const SHOTS = Object.keys(STAGING);

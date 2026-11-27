import Phaser from 'phaser';
import { VIEW } from './world.js';
import { store } from './store.js';
import Boot from './scenes/Boot.js';
import Title from './scenes/Title.js';
import Village from './scenes/Village.js';
import Hud from './scenes/Hud.js';
import Fishing from './scenes/Fishing.js';
import Climb from './scenes/Climb.js';
import Wrestle from './scenes/Wrestle.js';
import Plait from './scenes/Plait.js';
import Contest from './scenes/Contest.js';
import Periwinkle from './scenes/Periwinkle.js';
import Pound from './scenes/Pound.js';
import Soup from './scenes/Soup.js';
import Paddle from './scenes/Paddle.js';
import Upriver from './scenes/Upriver.js';
import Cutscene from './scenes/Cutscene.js';
import * as audio from './audio.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW.w,
  height: VIEW.h,
  backgroundColor: '#2a1a10',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, powerPreference: 'low-power', batchSize: 2048 },
  fps: { target: 60, smoothStep: true },
  input: { activePointers: 3 },
  disableContextMenu: true,
  banner: false,
  scene: [Boot, Title, Village, Hud, Fishing, Climb, Wrestle, Plait, Contest, Periwinkle, Pound, Soup, Paddle, Upriver, Cutscene],
});

window.__ofion = { game, store, audio }; // used by the screenshot, perf and sound scripts
// browsers start sound only after the player touches or presses something
for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, audio.unlock, { passive: true });

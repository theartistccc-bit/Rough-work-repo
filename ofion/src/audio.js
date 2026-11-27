// Sound and music, synthesised with Web Audio: nothing to download, so loading stays fast.
// Any sound can be replaced by a recording: drop ./assets/sfx_<name>.mp3 or
// ./assets/music_<song>.mp3 (.ogg/.wav/.m4a also work) and it plays instead of the synth.
import { soundscape } from './logic/soundscape.js';

const FILES = import.meta.glob('../assets/*.{mp3,ogg,wav,m4a}', { eager: true, query: '?url', import: 'default' });
const fileUrl = {};
for (const [path, url] of Object.entries(FILES)) fileUrl[path.split('/').pop().replace(/\.[^.]+$/, '')] = url;

const MUTE_KEY = 'ofion-muted';
let ctx = null;
let master; let musicBus; let ambBus; let sfxBus;
let noiseBuf;
let creekGain;
let muted = readMuted();
const buffers = {}; // decoded recordings by name
const state = { song: null, nextStep: 0, step: 0, bar: 0, fire: 0, ambience: [], musicSrc: null };

function readMuted() {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}

/** Browsers only allow sound after the player touches or presses something. */
export function unlock() {
  if (!ctx) init();
  if (ctx && ctx.state === 'suspended' && !document.hidden) ctx.resume();
}

function init() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.8;
  master.connect(ctx.destination);
  musicBus = bus(0.32); ambBus = bus(0.45); sfxBus = bus(0.7);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // the creek: an endless soft filtered rush, louder near the water
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf; src.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
  creekGain = ctx.createGain(); creekGain.gain.value = 0;
  src.connect(lp).connect(creekGain).connect(ambBus);
  src.start();
  document.addEventListener('visibilitychange', () => (document.hidden ? ctx.suspend() : ctx.resume()));
  setInterval(schedule, 100);
}

function bus(v) {
  const g = ctx.createGain();
  g.gain.value = v;
  g.connect(master);
  return g;
}

export const isMuted = () => muted;
/** For the test scripts: the context and master output, to measure or record what plays. */
export const debug = () => ({ ctx, master });
export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* storage may be blocked */ }
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.05);
  return muted;
}

// ---------------------------------------------------------------- building blocks
function env(g, t, peak, attack, decay) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(t, freq, dur, { type = 'sine', gain = 0.3, attack = 0.005, to = null, out = sfxBus, q = null } = {}) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  env(g, t, gain, attack, dur);
  let node = o;
  if (q) {
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = q; f.Q.value = 4;
    node = o.connect(f);
  }
  node.connect(g).connect(out);
  o.start(t); o.stop(t + attack + dur + 0.05);
}

function noise(t, dur, { gain = 0.2, type = 'bandpass', freq = 1000, q = 1, attack = 0.003, out = sfxBus, to = null } = {}) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  env(g, t, gain, attack, dur);
  s.connect(f).connect(g).connect(out);
  s.start(t, Math.random() * 1.5); s.stop(t + attack + dur + 0.05);
}

// ---------------------------------------------------------------- instruments
const skin = (t, pitch, gain = 0.5, out = musicBus) => {
  tone(t, pitch * 2.2, 0.32, { gain, to: pitch, out });
  noise(t, 0.05, { gain: gain * 0.35, freq: 1400, q: 1.5, out });
};
const slit = (t, f, gain = 0.35, out = musicBus) => tone(t, f, 0.12, { type: 'triangle', gain, out, q: f * 1.5 });
const bell = (t, f, gain = 0.18, out = musicBus) => {
  tone(t, f, 0.35, { gain, out });
  tone(t, f * 2.76, 0.18, { gain: gain * 0.5, out });
};
const shaker = (t, gain = 0.06, out = musicBus) => noise(t, 0.04, { gain, type: 'highpass', freq: 6000, out });
const pluck = (t, f, gain = 0.22, out = musicBus) => {
  tone(t, f, 0.7, { gain, out });
  tone(t, f * 2, 0.25, { type: 'triangle', gain: gain * 0.3, out });
};

// pentatonic around D, warm and open
const SCALE = [293.7, 329.6, 370, 440, 493.9, 587.3, 659.3];

// ---------------------------------------------------------------- music: 12 steps per bar (12/8)
const SONGS = {
  // the twelve-pulse bell line heard across West African drumming, with skin drums under it
  moonlight: { stepSec: 0.17, play(t, s, bar) {
    if ([0, 2, 4, 5, 7, 9, 11].includes(s)) bell(t, 880);
    if (s === 0 || s === 6) skin(t, 70, 0.55);
    if ([3, 9, 10].includes(s)) skin(t, 150, 0.32);
    if (s === 2 || s === 8) slit(t, bar % 2 ? 392 : 330);
    shaker(t);
  } },
  festival: { stepSec: 0.14, play(t, s, bar) {
    if ([0, 2, 4, 5, 7, 9, 11].includes(s)) bell(t, 932, 0.2);
    if (s % 3 === 0) skin(t, 68, 0.55);
    if ([2, 5, 8, 10, 11].includes(s)) skin(t, 160, 0.3);
    if (bar % 4 === 3 && s >= 6) skin(t, 120 + s * 6, 0.35); // a rolling call every fourth bar
    if (s % 2 === 0) slit(t, [330, 392, 440][(bar + s) % 3], 0.25);
    shaker(t, 0.08);
  } },
  // soft thumb-piano phrases over a slit-drum pulse
  day: { stepSec: 0.26, play(t, s, bar) {
    if (s === 0 || s === 6) slit(t, 220, 0.28);
    const phrase = [[0, 2, 4, 2], [1, 3, 5, 3], [0, 4, 3, 1], [2, 4, 6, 4]][bar % 4];
    if (s % 3 === 0) pluck(t, SCALE[phrase[s / 3]], 0.34);
  } },
  night: { stepSec: 0.3, play(t, s, bar) {
    if (bar % 2 === 0 && (s === 0 || s === 7)) pluck(t, SCALE[(bar / 2) % 3] / 2, 0.3);
  } },
};

function playFileMusic(song) {
  stopFileMusic();
  const buf = buffers[`music_${song}`];
  if (!buf) return loadFile(`music_${song}`);
  const s = ctx.createBufferSource();
  s.buffer = buf; s.loop = true; s.connect(musicBus); s.start();
  state.musicSrc = s;
}
function stopFileMusic() {
  try { state.musicSrc?.stop(); } catch { /* already stopped */ }
  state.musicSrc = null;
}

function schedule() {
  if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  // ambience: a few random events per tick
  const r = Math.random;
  if (state.ambience.includes('birds') && r() < 0.07) {
    const base = 2200 + r() * 1400;
    for (let i = 0; i < 2 + Math.floor(r() * 3); i++) tone(now + i * 0.09, base, 0.07, { gain: 0.05, to: base * 1.3, out: ambBus });
  }
  if (state.ambience.includes('crickets') && r() < 0.35) {
    for (let i = 0; i < 4; i++) tone(now + i * 0.03, 4400, 0.015, { gain: 0.02, out: ambBus });
  }
  if (state.ambience.includes('frogs') && r() < 0.05) {
    tone(now, 160 + r() * 60, 0.18, { type: 'square', gain: 0.03, out: ambBus, q: 400 });
  }
  if (state.fire > 0 && r() < state.fire * 0.7) noise(now + r() * 0.1, 0.02, { gain: 0.08 * state.fire, type: 'highpass', freq: 2500, out: ambBus });

  // music
  const song = SONGS[state.song];
  if (!song || fileUrl[`music_${state.song}`]) return;
  if (state.nextStep < now) state.nextStep = now + 0.05;
  while (state.nextStep < now + 0.25) {
    song.play(state.nextStep, state.step, state.bar);
    state.nextStep += song.stepSec;
    state.step = (state.step + 1) % 12;
    if (state.step === 0) state.bar += 1;
  }
}

/** Call a few times a second with where and when the player is. */
export function update(day, minute, x) {
  if (!ctx) return;
  const s = soundscape(day, minute, x);
  state.ambience = s.ambience;
  state.fire = s.fire;
  creekGain.gain.setTargetAtTime(s.creek * 0.22, ctx.currentTime, 0.4);
  if (s.music !== state.song) {
    state.song = s.music;
    state.step = 0; state.bar = 0;
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setValueAtTime(0.0001, ctx.currentTime);
    musicBus.gain.linearRampToValueAtTime(0.32, ctx.currentTime + 1.5); // fade the new song in
    if (s.music && fileUrl[`music_${s.music}`]) playFileMusic(s.music);
    else stopFileMusic();
  }
}

/** Quiet the village music while a minigame or the contest plays its own sounds. */
export function duck(on) {
  if (ctx) musicBus.gain.setTargetAtTime(on ? 0.08 : 0.32, ctx.currentTime, 0.3);
}

// ---------------------------------------------------------------- sound effects
const SFX = {
  click: (t) => slit(t, 660, 0.12, sfxBus),
  open: (t) => slit(t, 440, 0.1, sfxBus),
  bite: (t) => { tone(t, 700, 0.12, { gain: 0.25, to: 180 }); noise(t, 0.08, { gain: 0.1, freq: 900 }); },
  splash: (t) => noise(t, 0.4, { gain: 0.25, type: 'lowpass', freq: 3000, to: 400, attack: 0.02 }),
  catch: (t) => { SFX.splash(t); pluck(t + 0.15, SCALE[2], 0.25, sfxBus); pluck(t + 0.3, SCALE[4], 0.25, sfxBus); },
  grip: (t) => noise(t, 0.06, { gain: 0.15, freq: 700, q: 2 }),
  slip: (t) => noise(t, 0.3, { gain: 0.15, freq: 1200, to: 300 }),
  wine: (t) => { for (let i = 0; i < 7; i++) tone(t + i * 0.07, 300 + Math.random() * 400, 0.06, { gain: 0.12, to: 700 }); },
  trade: (t) => { slit(t, 330, 0.3, sfxBus); slit(t + 0.12, 392, 0.3, sfxBus); },
  eat: (t) => { for (let i = 0; i < 3; i++) noise(t + i * 0.12, 0.05, { gain: 0.15, freq: 1800, q: 0.8 }); },
  thud: (t) => { tone(t, 90, 0.25, { gain: 0.5, to: 45 }); noise(t, 0.12, { gain: 0.2, type: 'lowpass', freq: 600 }); },
  cheer: (t) => { noise(t, 1.2, { gain: 0.18, freq: 1100, q: 0.7, attack: 0.25 }); for (let i = 0; i < 4; i++) skin(t + i * 0.15, 140, 0.3, sfxBus); },
  good: (t) => pluck(t, SCALE[4], 0.2, sfxBus),
  miss: (t) => tone(t, 140, 0.2, { type: 'triangle', gain: 0.18, to: 110 }),
  chapter: (t) => [0, 2, 4, 5].forEach((n, i) => pluck(t + i * 0.12, SCALE[n], 0.22, sfxBus)),
  win: (t) => { for (let i = 0; i < 8; i++) skin(t + i * 0.09, i % 2 ? 150 : 75, 0.45, sfxBus); bell(t + 0.75, 880, 0.3, sfxBus); bell(t + 0.9, 1175, 0.3, sfxBus); SFX.cheer(t + 0.6); },
  lose: (t) => { pluck(t, SCALE[3], 0.2, sfxBus); pluck(t + 0.25, SCALE[1], 0.2, sfxBus); },
  sleep: (t) => [5, 3, 1, 0].forEach((n, i) => pluck(t + i * 0.3, SCALE[n] / 2, 0.16, sfxBus)),
  reveal: (t) => skin(t, 110, 0.35, sfxBus),
};

async function loadFile(name) {
  if (buffers[name] !== undefined || !fileUrl[name]) return;
  buffers[name] = null; // loading
  try {
    const data = await (await fetch(fileUrl[name])).arrayBuffer();
    buffers[name] = await ctx.decodeAudioData(data);
    if (name === `music_${state.song}`) playFileMusic(state.song);
  } catch { delete buffers[name]; }
}

export function sfx(name) {
  if (!ctx || ctx.state !== 'running' || muted) return;
  const t = ctx.currentTime + 0.01;
  const file = `sfx_${name}`;
  if (fileUrl[file]) {
    if (buffers[file]) {
      const s = ctx.createBufferSource();
      s.buffer = buffers[file]; s.connect(sfxBus); s.start(t);
      return;
    }
    loadFile(file); // first use: load it, synth this once
  }
  SFX[name]?.(t);
}

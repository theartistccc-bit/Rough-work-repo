import Phaser from 'phaser';
import { save, store } from '../store.js';
import { place, strip } from '../art/textures.js';
import { baked } from '../ui.js';
import { GROUND_Y, PLACES, REACH, VIEW, WALK_SPEED, WORLD_W } from '../world.js';
import { BARTER, CONTEST, COURTSHIP, GOODS, HUNGER, TALES, TIME, WRESTLE } from '../logic/config.js';
import {
  isContestTime, isFestivalDay, isMarketOpen, isMoonlightPlay, lightLevel, phaseAt,
} from '../logic/dayCycle.js';
import { canDo, eat, spend, speedFactor, status } from '../logic/hunger.js';
import { quote, trade } from '../logic/barter.js';
import { gift, stage, talk } from '../logic/courtship.js';
import { adornmentsUsed, playerEntry, rank, rivalEntries, styleById } from '../logic/contest.js';
import { remove } from '../logic/inventory.js';
import { passMinutes, sleepGame, tick } from '../logic/state.js';
import { PROLOGUE, checkStory, epilogue } from '../logic/story.js';

const h = (hh, mm = 0) => hh * 60 + mm;
const label = (good) => GOODS[good].label;

export default class Village extends Phaser.Scene {
  constructor() { super('Village'); }

  create() {
    this.hud = this.scene.get('Hud');
    this.scene.launch('Hud');
    this.cameras.main.setBounds(0, 0, WORLD_W, VIEW.h);
    this.buildWorld();
    this.player = place(this, 'player', PLACES.playerStart, GROUND_Y).setDepth(7);
    this.lit.push(this.player);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12, 0, 40);
    this.walkT = 0;
    this.lastDay = store.g.clock.day;
    this.warnedStarving = false;
    this.onPress = (name) => this.handlePress(name);
    this.game.events.on('press', this.onPress);
    this.events.once('shutdown', () => this.game.events.off('press', this.onPress));
    this.storyT = 0;
    this.time.delayedCall(300, () => {
      if (!store.g.story.prologueSeen) this.prologue(0);
      else this.hud.toast('Walk with ◀ ▶ (A/D). Act with ● (E or Space). Q or ✕ opens your satchel.', 4500);
    });
    this.time.delayedCall(5000, () => this.announceDay());
  }

  // ---------------------------------------------------------------- world
  buildWorld() {
    this.sky = this.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(VIEW.w, VIEW.h).setScrollFactor(0).setDepth(0);
    // the ground hides the bottom of the sky, so don't draw it there
    this.sky.setCrop(0, 0, this.sky.frame.width, this.sky.frame.height * ((GROUND_Y - 6) / VIEW.h));
    this.stars = baked(this, 'stars', VIEW.w, 270, (gr) => {
      const rng = new Phaser.Math.RandomDataGenerator(['stars']);
      for (let i = 0; i < 70; i++) {
        gr.fillStyle(0xfff4d6, rng.realInRange(0.3, 0.9));
        gr.fillCircle(rng.between(0, VIEW.w), rng.between(0, 260), rng.realInRange(0.6, 1.6));
      }
    }).setScrollFactor(0).setDepth(1);
    this.moon = place(this, 'moon', 760, 110, 0.5).setScrollFactor(0).setDepth(1);
    this.far = strip(this, 'bg_far', 0, GROUND_Y - 236, VIEW.w).setScrollFactor(0).setDepth(2);
    this.water = strip(this, 'water', 0, GROUND_Y - 14, PLACES.creekEdge + 40).setDepth(3);
    strip(this, 'ground', PLACES.creekEdge, GROUND_Y - 6, WORLD_W - PLACES.creekEdge).setDepth(4);

    const prop = (key, x, y = GROUND_Y + 4, d = 5) => place(this, key, x, y).setDepth(d);
    prop('mangrove', 90, GROUND_Y + 30);
    prop('jetty', 330, GROUND_Y + 50, 4.5);
    prop('canoe', 150, GROUND_Y + 22, 4.6);
    prop('hut', PLACES.home);
    for (const [id, x] of Object.entries(PLACES.traders)) prop(`stall_${id}`, x);
    prop('shade_tree', PLACES.elder - 40);
    prop('ring', PLACES.ring, GROUND_Y + 22, 4.5);
    prop('hut_ini', PLACES.iniHut);
    PLACES.palms.forEach((x) => prop('palm', x));

    // people
    this.npc = {};
    const person = (id, key, x, tint) => {
      const s = place(this, key, x, GROUND_Y).setDepth(6);
      if (tint) s.setData('baseTint', tint);
      this.npc[id] = s;
      return s;
    };
    for (const [id, x] of Object.entries(PLACES.traders)) person(id, `trader_${id}`, x + 10);
    person('elder', 'elder', PLACES.elder);
    person('judge1', 'elder', PLACES.judges - 30, 0xffe0c0);
    person('judge2', 'elder', PLACES.judges + 20, 0xe0d0ff).setFlipX(true);
    WRESTLE.opponents.forEach((o, i) => person(`w${i}`, 'wrestler', PLACES.ring - 60 + i * 55, [0xffffff, 0xffd8b0, 0xd8c0a0][i]));
    CONTEST.rivals.forEach((r, i) => person(`r${i}`, `rival_${r.name.toLowerCase()}`, PLACES.judges + 80 + i * 40));
    this.ini = person('ini', 'ini', PLACES.iniDay).setFlipX(true);

    // night
    this.fire = place(this, 'fire', PLACES.elder + 70, GROUND_Y + 4).setDepth(10);
    this.glow = place(this, 'glow', PLACES.elder + 70, GROUND_Y + 120).setDepth(10)
      .setBlendMode(Phaser.BlendModes.ADD);
    // everything lit by the sun and moon; fire, glow, moon and stars light themselves
    const self = new Set([this.fire, this.glow, this.moon, this.stars]);
    this.lit = this.children.list.filter((o) => o.setTint && !self.has(o));
  }

  // ---------------------------------------------------------------- loop
  update(time, dt) {
    const g = store.g;
    if (!this.hud.prompt) return; // HUD not created yet
    dt = Math.min(dt, 100);
    if (!store.dialog && !store.minigame) {
      const dir = (store.held.right ? 1 : 0) - (store.held.left ? 1 : 0);
      if (dir) {
        const v = WALK_SPEED * speedFactor(g.fullness) * dir;
        this.player.x = Phaser.Math.Clamp(this.player.x + (v * dt) / 1000, 200, WORLD_W - 60);
        this.player.setFlipX(dir < 0);
        this.walkT += dt;
      } else this.walkT = 0;
      this.player.y = GROUND_Y - Math.abs(Math.sin(this.walkT / 110)) * 4;
      if (tick(g, dt, { walking: dir !== 0 })) this.announceDay();
      if (status(g.fullness) === 'starving' && !this.warnedStarving) {
        this.warnedStarving = true;
        this.hud.toast('You are starving. You walk slowly and cannot climb or wrestle. Eat!');
      }
      if (g.fullness > 5) this.warnedStarving = false;
    }
    this.storyT += dt;
    if (this.storyT > 400 && !store.dialog && !store.minigame) {
      this.storyT = 0;
      this.advanceStory();
    }
    this.water.tilePositionX += dt * 0.01;
    this.far.tilePositionX = this.cameras.main.scrollX * 0.3 / this.far.tileScaleX;
    this.updateLight(time);
    this.updatePeople();
    this.current = store.dialog || store.minigame ? null : this.nearest();
    this.hud.setPrompt(this.current ? `● ${this.current.label}` : '');
  }

  updateLight(time) {
    const m = store.g.clock.minute;
    const light = lightLevel(m);
    // Day/night is a tint on each object rather than full-screen overlays:
    // tints are free to draw, overlays cost a full-screen blend every frame.
    const k = Math.round((1 - light) * 100);
    if (k !== this.tintK) {
      this.tintK = k;
      const t = 1 - light;
      const warm = light > 0 && light < 1 ? 1 - Math.abs(light - 0.5) * 2 : 0; // dawn/dusk glow
      const mix = (day, night, dusk) => Math.round((day + (night - day) * t) * (1 - warm * 0.35) + dusk * warm * 0.35);
      const sky = [mix(255, 60, 255), mix(255, 75, 150), mix(255, 150, 110)];
      const land = [mix(255, 85, 255), mix(255, 95, 170), mix(255, 150, 130)];
      for (const o of this.lit) {
        const c = o === this.sky || o === this.far ? sky : land;
        const b = Phaser.Display.Color.IntegerToRGB(o.getData('baseTint') ?? 0xffffff);
        o.setTint(Phaser.Display.Color.GetColor((c[0] * b.r) / 255, (c[1] * b.g) / 255, (c[2] * b.b) / 255));
      }
    }
    const dark = 1 - light;
    this.stars.setAlpha(dark);
    this.moon.setVisible(dark > 0.05).setAlpha(dark);
    const fireOn = phaseAt(m) === 'night' || phaseAt(m) === 'dusk';
    this.fire.setVisible(fireOn);
    this.glow.setVisible(fireOn).setAlpha(0.6 + Math.sin(time / 180) * 0.12);
  }

  updatePeople() {
    const { day, minute: m } = store.g.clock;
    const market = isMarketOpen(m);
    for (const id of Object.keys(BARTER.traders)) this.npc[id].setVisible(market);
    const play = isMoonlightPlay(m);
    this.npc.elder.setVisible(play);
    WRESTLE.opponents.forEach((o, i) => this.npc[`w${i}`].setVisible(play && !store.g.wrestledTonight.includes(o.name)));
    const fest = isFestivalDay(day) && m >= h(12) && m <= TIME.festivalContest[1];
    this.npc.judge1.setVisible(fest);
    this.npc.judge2.setVisible(fest);
    CONTEST.rivals.forEach((r, i) => this.npc[`r${i}`].setVisible(fest));
    const iniX = this.iniPlace();
    this.ini.setVisible(iniX != null);
    if (iniX != null) this.ini.x = iniX;
  }

  iniPlace() {
    const { day, minute: m } = store.g.clock;
    if (isFestivalDay(day) && m >= h(12) && m <= TIME.festivalContest[1]) return PLACES.judges + 200;
    if (m >= h(8) && m <= h(18)) return PLACES.iniDay;
    if (m >= h(20) && m <= h(23)) return PLACES.iniNight;
    return null;
  }

  announceDay() {
    const { day } = store.g.clock;
    if (this.lastDay !== day) this.lastDay = day;
    if (isFestivalDay(day)) this.hud.toast(`Festival day! The hairstyle contest is in the village square from 16:00 to 19:00.`, 4500);
    else if (isFestivalDay(day + 1)) this.hud.toast('The festival is tomorrow. Gather thread, beads, camwood and a comb for Ini\'s hair.', 4500);
  }

  // ---------------------------------------------------------------- interactions
  interactables() {
    const g = store.g;
    const { day, minute: m } = g.clock;
    const list = [];
    const add = (x, lbl, act) => lbl && list.push({ x, label: lbl, act });
    add(PLACES.fishingSpot, 'Fish from the jetty', () => this.goFish());
    add(PLACES.home, 'Your house: eat or sleep', () => this.homeMenu());
    if (isMarketOpen(m)) {
      for (const [id, x] of Object.entries(PLACES.traders)) {
        const t = BARTER.traders[id];
        add(x, `Barter with ${t.name} (${t.trade})`, () => this.barterMenu(id));
      }
    }
    if (isMoonlightPlay(m)) {
      add(PLACES.elder, 'Sit for the elder\'s tale', () => this.taleMenu());
      add(PLACES.ring, 'Wrestle in the moonlight', () => this.wrestleMenu());
    }
    if (isFestivalDay(day) && m >= h(12) && m <= TIME.festivalContest[1]) {
      add(PLACES.judges, 'The festival judges', () => this.contestMenu());
    }
    const iniX = this.iniPlace();
    if (iniX != null) add(iniX, 'Speak with Ini', () => this.iniMenu());
    PLACES.palms.forEach((x, i) => add(x, g.treesTapped.includes(i) ? null : 'Climb the palm for wine', () => this.goClimb(i)));
    return list;
  }

  nearest() {
    const px = this.player.x;
    let best = null;
    for (const it of this.interactables()) {
      const d = Math.abs(it.x - px);
      if (d <= REACH && (!best || d < best.d)) best = { ...it, d };
    }
    return best;
  }

  handlePress(name) {
    if (store.dialog || store.minigame) return;
    if (name === 'act' && this.current) this.current.act();
    else if (name === 'back') this.satchel();
  }

  say(title, body, options = [{ label: 'Go well' }], extra = {}) {
    this.hud.showDialog({ title, body, options, ...extra });
  }

  runMinigame(key, data, done) {
    store.minigame = true;
    this.hud.setPrompt('');
    this.scene.launch(key, {
      ...data,
      onDone: (result) => {
        this.scene.stop(key);
        store.minigame = false;
        done(result);
      },
    });
    this.scene.bringToTop('Hud');
  }

  // ---------------------------------------------------------------- eating & home
  eatOptions(back) {
    const g = store.g;
    const opts = [];
    if (g.inv.yam && g.inv.fish) opts.push({ label: 'Roast yam with fish (a proper meal)', onPick: () => this.doEat('meal', back) });
    for (const food of Object.keys(HUNGER.food)) {
      if (g.inv[food]) opts.push({ label: `Eat ${label(food).toLowerCase()} (${g.inv[food]})`, onPick: () => this.doEat(food, back) });
    }
    return opts;
  }

  doEat(food, back) {
    const g = store.g;
    const r = eat(g.fullness, g.inv, food);
    if (r.ok) {
      g.fullness = r.fullness;
      passMinutes(g, 15);
      this.hud.toast(food === 'meal' ? 'Roast yam and fish. Your belly is warm.' : `You eat the ${label(food).toLowerCase()}.`);
    } else this.hud.toast(r.reason === 'full' ? 'You are too full to eat.' : 'You have none.');
    back?.();
  }

  satchel() {
    const opts = this.eatOptions(null);
    const g = store.g;
    const carried = Object.entries(g.inv).map(([k, n]) => `${label(k)} ×${n}`).join(', ') || 'nothing';
    this.say('Your satchel', `You carry: ${carried}.\n\nBelly: ${Math.round(g.fullness)} / ${HUNGER.max}`, [
      ...opts, { label: 'Close' },
    ]);
  }

  homeMenu() {
    const g = store.g;
    const m = g.clock.minute;
    const canSleep = m >= h(19) || m < h(5);
    this.say('Your house', 'The hearth is warm. Smoke curls up through the thatch.', [
      ...this.eatOptions(() => this.homeMenu()),
      { label: canSleep ? 'Sleep until first light' : 'Sleep (only after 19:00)', disabled: !canSleep, onPick: () => this.doSleep() },
      { label: 'Leave' },
    ]);
  }

  doSleep() {
    const g = store.g;
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      sleepGame(g);
      save();
      this.cameras.main.fadeIn(600, 0, 0, 0);
      this.hud.toast(`You wake at first light on day ${g.clock.day}. (Saved)`);
      this.time.delayedCall(2800, () => this.announceDay());
    });
  }

  // ---------------------------------------------------------------- barter (goods for goods)
  barterMenu(id) {
    const g = store.g;
    const t = BARTER.traders[id];
    const tr = g.market.traders[id];
    const wants = Object.keys(t.wants).map(label).join(', ');
    const opts = Object.keys(t.offers).map((get) => ({
      label: `${label(get)} (${tr.stock[get]} left)`,
      disabled: tr.stock[get] <= 0,
      onPick: () => this.barterGive(id, get),
    }));
    this.say(`${t.name}'s stall`, `"Abadie! What do you need? I take ${wants}." \n\nNo one here buys with money: goods go for goods.`,
      [...opts, { label: 'Leave' }], { image: `portrait_${id}` });
  }

  barterGive(id, get) {
    const g = store.g;
    const t = BARTER.traders[id];
    const opts = Object.keys(t.wants).map((give) => {
      const n = quote(g.market, id, give, get);
      const have = g.inv[give] ?? 0;
      return {
        label: `Give ${n} ${label(give).toLowerCase()} (you have ${have})`,
        disabled: n == null || have < n,
        onPick: () => {
          const r = trade(g.market, id, g.inv, give, get);
          if (r.ok) g.stats.trades += 1;
          passMinutes(g, 5);
          this.hud.toast(r.ok ? `You give ${r.gave} ${label(give).toLowerCase()} for 1 ${label(get).toLowerCase()}. "Sosongo!"` : 'The trade falls through.');
          this.barterGive(id, get);
        },
      };
    });
    this.say(`For 1 ${label(get).toLowerCase()}…`, `${t.name} weighs what you carry. The more of one good a trader takes in today, the less they want it.`,
      [...opts, { label: 'Back', onPick: () => this.barterMenu(id) }], { image: `icon_${get}`, onBack: () => this.barterMenu(id) });
  }

  // ---------------------------------------------------------------- fishing
  goFish() {
    const g = store.g;
    const fullness = spend('cast', g.fullness);
    g.fullness = fullness;
    const ph = phaseAt(g.clock.minute);
    this.runMinigame('Fishing', { seed: g.clock.day * 1440 + Math.floor(g.clock.minute), dawnOrDusk: ph === 'dawn' || ph === 'dusk', night: ph === 'night' }, (r) => {
      passMinutes(g, 20);
      if (r.caught) {
        g.inv.fish = (g.inv.fish ?? 0) + r.caught;
        g.stats.fishCaught += r.caught;
        this.hud.toast(`You land ${r.caught} fish.`);
      }
    });
  }

  // ---------------------------------------------------------------- palm wine
  goClimb(i) {
    const g = store.g;
    const ph = phaseAt(g.clock.minute);
    if (ph === 'night') return this.hud.toast('Too dark to climb. Come back in daylight.');
    if (!canDo('climb', g.fullness)) return this.hud.toast('You are too weak with hunger to climb.');
    g.fullness = spend('climb', g.fullness);
    this.runMinigame('Climb', {}, (r) => {
      passMinutes(g, 30);
      if (r.done) {
        g.treesTapped.push(i);
        g.stats.climbs += 1;
        g.inv.palmwine = (g.inv.palmwine ?? 0) + 1;
        this.hud.toast('The gourd is full of sweet palm wine.');
      } else this.hud.toast('You slide back down. Alternate your grips: ◀ ▶ ◀ ▶');
    });
  }

  // ---------------------------------------------------------------- moonlight play
  taleMenu() {
    const g = store.g;
    if (g.talesTonight > 0) return this.say('The elder', '"One tale a night. The moon must have something left to say tomorrow."');
    const tale = TALES.find((t) => !g.talesHeard.includes(t.id)) ?? TALES[g.clock.day % TALES.length];
    const isNew = !g.talesHeard.includes(tale.id);
    const page = (i) => {
      if (i >= tale.lines.length) {
        g.talesTonight += 1;
        g.stats.tales += 1;
        passMinutes(g, 30);
        if (isNew) {
          g.talesHeard.push(tale.id);
          g.wisdom += 1;
          this.hud.toast(`Wisdom grows (${g.wisdom}). Ini enjoys a storyteller.`);
        } else this.hud.toast('A tale you have heard before, but still good.');
        return;
      }
      this.say(tale.title, tale.lines[i], [{ label: i < tale.lines.length - 1 ? 'Listen on' : 'Clap for the elder', onPick: () => page(i + 1) }],
        { image: 'portrait_elder', onBack: () => page(tale.lines.length) });
    };
    page(0);
  }

  wrestleMenu() {
    const g = store.g;
    const left = WRESTLE.opponents.filter((o) => !g.wrestledTonight.includes(o.name));
    if (!left.length) return this.say('The wrestling ground', 'Every young man has wrestled tonight. The crowd drifts toward the fire.');
    if (!canDo('wrestle', g.fullness)) return this.say('The wrestling ground', 'Your knees shake with hunger. Eat before you wrestle.');
    const opts = left.map((o) => ({
      label: `${o.name} (${o.skill < 0.5 ? 'green' : o.skill < 0.7 ? 'strong' : 'champion'})`,
      onPick: () => {
        g.fullness = spend('wrestle', g.fullness);
        this.runMinigame('Wrestle', { opponent: o, renown: g.renown, fullness: g.fullness }, (r) => {
          g.wrestledTonight.push(o.name);
          passMinutes(g, 30);
          if (r.won) {
            g.renown += WRESTLE.renownPerWin;
            g.stats.wrestleWins += 1;
            this.hud.toast(`You throw ${o.name}! The drums answer. Renown ${g.renown}.`);
          } else this.hud.toast(`${o.name} throws you in the sand. The crowd laughs kindly.`);
        });
      },
    }));
    this.say('The wrestling ground', 'Drums and clapping under the moon. Who will you face? Best of three throws.', [...opts, { label: 'Just watch' }], { image: 'portrait_wrestler' });
  }

  // ---------------------------------------------------------------- Ini
  iniMenu() {
    const g = store.g;
    const c = g.courtship;
    const st = stage(c.affection);
    const lines = {
      stranger: '"You are the one who fishes from the old jetty, aren\'t you?"',
      acquaintance: '"My mother says your yams are honest yams. That is praise, from her."',
      friend: '"When the elder tells tales, I look to see if you are listening."',
      beloved: '"Come to the festival. Whoever dresses my hair, I want it to be you."',
    };
    const giftable = Object.keys(COURTSHIP.gifts).filter((k) => g.inv[k]);
    this.say('Ini', `${lines[st]}\n\nShe thinks of you as: ${st}.`, [
      { label: c.talkedDay === g.clock.day ? 'Talk (you have talked today)' : 'Sit and talk a while', disabled: c.talkedDay === g.clock.day, onPick: () => {
        const r = talk(c, g.clock.day, g.wisdom);
        passMinutes(g, 20);
        this.hud.toast(`You talk of the creek and the moon. Ini smiles (+${r.gain}).`);
      } },
      { label: giftable.length ? 'Offer a gift' : 'Offer a gift (nothing she would like)', disabled: !giftable.length, onPick: () => this.giftMenu() },
      { label: 'Ask about the festival', onPick: () => this.say('Ini', `"Every ${TIME.festivalEvery}th day the village holds the festival. The maidens' hair is judged on craft, adornment and spirit. Affiong, Nkoyo and Ekaette will all be dressed. A stylist needs raffia thread, coral beads, camwood and a good comb."\n\nThe next festival is day ${Math.ceil(g.clock.day / TIME.festivalEvery) * TIME.festivalEvery}.`) },
      { label: 'Go well' },
    ], { image: 'portrait_ini' });
  }

  giftMenu() {
    const g = store.g;
    const opts = Object.keys(COURTSHIP.gifts).filter((k) => g.inv[k]).map((k) => ({
      label: `${label(k)} (${g.inv[k]})`,
      onPick: () => {
        const r = gift(g.courtship, g.clock.day, g.inv, k);
        this.hud.toast(r.gain >= 8 ? `Ini's eyes light up (+${r.gain}).` : `Ini thanks you politely (+${r.gain}).`);
      },
    }));
    this.say('A gift for Ini', 'What will you give?', [...opts, { label: 'Back', onPick: () => this.iniMenu() }], { onBack: () => this.iniMenu() });
  }

  // ---------------------------------------------------------------- festival contest
  contestMenu() {
    const g = store.g;
    const { day, minute: m } = g.clock;
    if (g.festivalsEntered.includes(day)) return this.say('The judges', '"The judging is done. Go and dance!"');
    if (!isContestTime(day, m)) return this.say('The judges', '"The contest begins at 16:00. Come with your maiden and your materials."');
    if (g.courtship.affection < COURTSHIP.contestMinAffection) {
      return this.say('The judges', `"Ini? She came with her aunt to dress her hair. She hardly knows you."\n\n(Ini must count you at least an acquaintance: ${COURTSHIP.contestMinAffection} closeness.)`);
    }
    const used = adornmentsUsed(g.inv);
    const usedTxt = Object.entries(used).map(([k, n]) => `${n} ${label(k).toLowerCase()}`).join(', ') || 'nothing at all';
    const opts = CONTEST.styles.map((s) => ({
      label: `${s.label} (${s.length} moves${s.bonus ? `, +${s.bonus} if done well` : ''})`,
      onPick: () => this.startPlait(s.id),
    }));
    this.say('The festival judges', `"Ini's stylist! Choose the style you will plait. Into it you will work ${usedTxt}."\n\nCraft (your plaiting), adornment (your materials) and spirit (Ini's trust and your renown) are judged.`,
      [...opts, { label: 'Not yet' }], { image: 'bust_plain' });
  }

  startPlait(styleId) {
    const g = store.g;
    g.fullness = spend('plait', g.fullness) ?? g.fullness;
    this.runMinigame('Plait', { styleId, seed: g.seed + g.clock.day }, (r) => {
      const items = adornmentsUsed(g.inv);
      for (const [k, n] of Object.entries(items)) remove(g.inv, k, n);
      const me = playerEntry({ accuracy: r.accuracy, styleId, items, affection: g.courtship.affection, renown: g.renown });
      const rivals = rivalEntries(g.rng);
      const ranked = rank([...rivals, me]);
      g.festivalsEntered.push(g.clock.day);
      passMinutes(g, 60);
      this.runMinigame('Contest', { ranked, styleId }, () => this.contestResult(ranked));
    });
  }

  contestResult(ranked) {
    const g = store.g;
    const place = ranked.findIndex((e) => e.player) + 1;
    const c = g.courtship;
    let title;
    let body;
    if (place === 1 && c.affection >= COURTSHIP.betrothalAffection) {
      g.ending = 'betrothal';
      title = 'Ini is crowned, and more';
      body = 'The judges raise Ini\'s hand. Through the drumming her father finds you: "Bring palm wine to my house. Our families will talk."\n\nYou are to be betrothed to Ini.';
    } else if (place === 1) {
      c.affection = Math.min(100, c.affection + 15);
      title = 'Ini is crowned!';
      body = 'Her hair is the talk of the village. She squeezes your hand. "Keep visiting me," she says. (Win again with her love above ' + COURTSHIP.betrothalAffection + ' for her father\'s blessing.)';
    } else {
      c.affection = Math.min(100, c.affection + (place === 2 ? 6 : 3));
      title = `Ini places ${['', 'first', 'second', 'third', 'fourth'][place]}`;
      body = `${ranked[0].name}'s hair, dressed by ${ranked[0].styler}, wins the day. Ini laughs it off: "Next festival, we practise." Gather finer materials and plait more carefully.`;
    }
    const first = g.festivalsEntered.length === 1;
    const next = () => this.say(first ? 'Epilogue' : 'After the festival', epilogue(place, c.affection),
      [{ label: g.ending ? 'Keep living in the village' : 'Dance into the night' }], { image: 'portrait_ini' });
    this.say(title, body, [{ label: 'Continue', onPick: next }], { image: 'portrait_ini', onBack: next });
  }

  // ---------------------------------------------------------------- story
  prologue(i) {
    const g = store.g;
    const pages = PROLOGUE.pages;
    if (i >= pages.length) {
      g.story.prologueSeen = true;
      this.hud.toast('Walk with ◀ ▶ (A/D). Act with ● (E or Space). Q or ✕ opens your satchel.', 4500);
      return;
    }
    this.say(i === 0 ? PROLOGUE.title : '', pages[i],
      [{ label: i < pages.length - 1 ? 'Go on' : 'Begin', onPick: () => this.prologue(i + 1) }],
      { image: 'portrait_player', onBack: () => this.prologue(pages.length) });
  }

  advanceStory() {
    const r = checkStory(store.g);
    if (!r || !r.chapter.outro) return;
    const rewards = Object.entries(r.chapter.reward ?? {}).map(([k, n]) => `+${n} ${label(k).toLowerCase()}`).join(', ');
    const nextLine = r.next ? `\n\nNext: ${r.next.title}.` : '';
    this.say(`Chapter done: ${r.chapter.title}`, `${r.chapter.outro}${rewards ? ` (${rewards})` : ''}${nextLine}`,
      [{ label: 'Go on' }], { image: r.chapter.id === 'basket' ? 'portrait_player' : 'portrait_ini' });
  }
}

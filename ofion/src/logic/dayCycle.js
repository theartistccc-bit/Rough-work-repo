import { TIME } from './config.js';
import { clamp } from './rng.js';

const DAY = 24 * 60;
const inRange = (m, [a, b]) => m >= a && m <= b;

export function createClock(day = TIME.startDay, minute = TIME.startMinute) {
  return { day, minute };
}

/** Advance by real milliseconds. Returns the number of whole new days crossed. */
export function advance(clock, realMs, cfg = TIME) {
  const total = clock.minute + realMs / cfg.realMsPerGameMinute;
  const days = Math.floor(total / DAY);
  clock.minute = total - days * DAY;
  clock.day += days;
  return days;
}

/** Sleep until the next morning. Returns minutes slept. */
export function sleep(clock, cfg = TIME) {
  const m = clock.minute;
  let slept;
  if (m < cfg.wakeMinute) {
    slept = cfg.wakeMinute - m;
  } else {
    slept = DAY - m + cfg.wakeMinute;
    clock.day += 1;
  }
  clock.minute = cfg.wakeMinute;
  return slept;
}

export function phaseAt(minute, cfg = TIME) {
  if (inRange(minute, cfg.dawn)) return 'dawn';
  if (inRange(minute, cfg.dusk)) return 'dusk';
  if (minute > cfg.dawn[1] && minute < cfg.dusk[0]) return 'day';
  return 'night';
}

/** 0 = darkest night, 1 = full day. Smooth through dawn and dusk. */
export function lightLevel(minute, cfg = TIME) {
  const [d0, d1] = cfg.dawn;
  const [k0, k1] = cfg.dusk;
  if (minute >= d1 && minute <= k0) return 1;
  if (minute > d0 && minute < d1) return clamp((minute - d0) / (d1 - d0), 0, 1);
  if (minute > k0 && minute < k1) return clamp(1 - (minute - k0) / (k1 - k0), 0, 1);
  return 0;
}

export const isNight = (minute, cfg = TIME) => phaseAt(minute, cfg) === 'night';
export const isMoonlightPlay = (minute, cfg = TIME) => inRange(minute, cfg.moonlightPlay);
export const isMarketOpen = (minute, cfg = TIME) => inRange(minute, cfg.market);
export const isFestivalDay = (day, cfg = TIME) => day % cfg.festivalEvery === 0;
export const isContestTime = (day, minute, cfg = TIME) =>
  isFestivalDay(day, cfg) && inRange(minute, cfg.festivalContest);

export function formatClock({ day, minute }) {
  const h = Math.floor(minute / 60);
  const m = Math.floor(minute % 60);
  return `Day ${day} · ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

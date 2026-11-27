// Which ambience and music fit the moment. Pure, so it is tested like the other rules.
import { TIME } from './config.js';
import { isContestTime, isMoonlightPlay, phaseAt } from './dayCycle.js';

const SQUARE = [1800, 2380]; // village square, where the fire and drums are
const CREEK = 640; // the creek is loud left of here

/**
 * @returns {{ ambience: string[], music: string|null, creek: number, fire: number }}
 * creek and fire are loudness 0..1 by how close the player stands.
 */
export function soundscape(day, minute, x) {
  const phase = phaseAt(minute);
  const night = phase === 'night';
  const inSquare = x >= SQUARE[0] && x <= SQUARE[1];
  const ambience = night ? ['crickets', 'frogs'] : ['birds'];
  if (phase === 'dawn' || phase === 'dusk') ambience.push('crickets');

  let music = night ? 'night' : 'day';
  if (isContestTime(day, minute)) music = 'festival';
  else if (isMoonlightPlay(minute) && inSquare) music = 'moonlight';
  else if (phase === 'dawn' || phase === 'dusk') music = null; // a quiet change of light

  const creek = Math.max(0, Math.min(1, (CREEK - x) / 400 + 0.15));
  const fireOn = night || phase === 'dusk';
  const mid = (SQUARE[0] + SQUARE[1]) / 2;
  const fire = fireOn ? Math.max(0, 1 - Math.abs(x - mid) / 500) : 0;
  return { ambience, music, creek, fire };
}

export const FESTIVAL_HOURS = TIME.festivalContest;

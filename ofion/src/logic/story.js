// The story: a prologue, seven chapters that each lead the player into one part of
// village life, and an epilogue that depends on how the festival goes.
// Pure logic: the scenes show the text, this module decides what comes next.
import { CONTEST, COURTSHIP, TIME } from './config.js';

export const PROLOGUE = {
  title: 'Ọfiọñ, the moon',
  pages: [
    'The tide is out on the creek, and the mangroves stand on their roots like old men in the water. You are young, your canoe is old, and your mother says the moon is watching you.',
    `In ${TIME.festivalEvery} days the moon will be full, and the village will hold its festival. The maidens will wear their hair high, and the judges will choose the finest.`,
    'Yesterday at the creek you saw Ini, daughter of the house past the village square. She laughed at your empty basket. You have thought of little else since.',
    'Start with what a fisherman knows. Go down to the jetty and fill your basket.',
  ],
};

// `done(g)` is checked against counters the game keeps in g.stats.
export const CHAPTERS = [
  {
    id: 'basket',
    title: 'A full basket',
    goal: 'Catch 2 fish at the jetty (far left).',
    done: (g) => g.stats.fishCaught >= 2,
    reward: { yam: 1 },
    outro: 'Your mother weighs the fish in her hands. "Good. A man who feeds himself can think of other things." She gives you a yam from the store and nods toward the market. "Fish do not keep. Trade them while they are fresh."',
  },
  {
    id: 'market',
    title: 'Goods for goods',
    goal: 'Make a trade at the market (open 08:00–17:00).',
    done: (g) => g.stats.trades >= 1,
    outro: 'Mma Edet laughs. "You bargain like your father did, badly but with a good heart." Ete Okon, at the next stall, calls out: "If you want my best yams, bring me palm wine. The palms past Ini\'s house are heavy this season."',
  },
  {
    id: 'palm',
    title: "The tapper's rope",
    goal: 'Climb an oil palm and bring down palm wine (far right).',
    done: (g) => g.stats.climbs >= 1,
    reward: { yam: 1 },
    outro: 'The wine is sweet and still foaming. On the way down you see Ini at her door, watching. She looks away first. Ete Okon sends a yam to your house for the first gourd of the season.',
  },
  {
    id: 'tale',
    title: 'Under the moon',
    goal: 'After 20:00, sit by the fire in the village square for the elder\'s tale.',
    done: (g) => g.stats.tales >= 1,
    outro: 'As the elder finishes, you notice Ini on the other side of the fire. "You laughed at the right places," she says. "Most young men only laugh when the others do."',
  },
  {
    id: 'ini',
    title: 'A word with Ini',
    goal: `Talk with Ini and bring her gifts until she counts you an acquaintance (closeness ${COURTSHIP.contestMinAffection}).`,
    done: (g) => g.courtship.affection >= COURTSHIP.contestMinAffection,
    outro: 'Ini turns a bead between her fingers. "My aunt means to dress my hair for the festival. Her hands are stiff now." She looks at you sideways. "They say a fisherman\'s fingers are clever with nets."',
  },
  {
    id: 'basketOfHair',
    title: "The stylist's basket",
    goal: 'Gather raffia thread, coral beads, camwood and a wooden comb from Eka Nse\'s stall.',
    done: (g) => ['thread', 'beads', 'camwood', 'comb'].every((k) => (g.inv[k] ?? 0) > 0),
    outro: 'Your basket holds thread, beads, camwood and a comb. Bassey the wrestler sees it and grins. "Plaiting now? Ekaette\'s mother will laugh you out of the square." Let him laugh. The moon is nearly full.',
  },
  {
    id: 'festival',
    title: 'The festival of the full moon',
    goal: () => 'On a festival day (every 4th day), go to the judges in the village square between 16:00 and 19:00.',
    done: (g) => g.festivalsEntered.length > 0,
    outro: null, // the epilogue takes over
  },
];

export const createStory = () => ({ chapter: 0, prologueSeen: false, finished: false });
export const createStats = () => ({ fishCaught: 0, trades: 0, climbs: 0, tales: 0, wrestleWins: 0 });

export const currentChapter = (g) => (g.story.finished ? null : CHAPTERS[g.story.chapter] ?? null);

export function goalText(g) {
  const ch = currentChapter(g);
  if (!ch) return g.ending === 'betrothal' ? 'Your story is told. Live well in the village.' : 'Win Ini\'s heart and the next festival.';
  const goal = typeof ch.goal === 'function' ? ch.goal(g) : ch.goal;
  return `${ch.title}: ${goal}`;
}

/**
 * Advance the story if the current chapter is complete. Applies its reward.
 * Returns { chapter, next } for the chapter just finished, or null.
 * Chapters complete one at a time, so a player who is ahead sees each beat in turn.
 */
export function checkStory(g) {
  const ch = currentChapter(g);
  if (!ch || !ch.done(g)) return null;
  for (const [good, n] of Object.entries(ch.reward ?? {})) g.inv[good] = (g.inv[good] ?? 0) + n;
  g.story.chapter += 1;
  if (g.story.chapter >= CHAPTERS.length) g.story.finished = true;
  return { chapter: ch, next: currentChapter(g) };
}

/** Closing words after the contest, by placing and Ini's feelings. */
export function epilogue(place, affection) {
  if (place === 1 && affection >= COURTSHIP.betrothalAffection) {
    return 'The moon is high when the drums finally stop. Ini sits beside you on the jetty, her crowned hair catching the light, and neither of you says much. Tomorrow your mother will carry palm wine to her father\'s house. Tonight, the creek and the moon keep each other company, the way the elder said they always have.';
  }
  if (place === 1) {
    return 'Ini wins, and the whole village knows whose fingers plaited her hair. Bassey stops grinning. Her father looks at you a long moment, then goes back to his wine. It is a beginning. Keep visiting her, and the next full moon may bring more than a crown.';
  }
  return `${CONTEST.rivals.length} maidens were dressed finer than you managed this time, or near enough. Ini squeezes your hand anyway. "Next full moon," she says. The festival comes every ${TIME.festivalEvery} days, and you have a basket to refill.`;
}

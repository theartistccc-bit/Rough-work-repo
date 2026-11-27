import { describe, expect, it } from 'vitest';
import { CHAPTERS, checkStory, currentChapter, epilogue, goalText } from '../src/logic/story.js';
import { createGame, deserialize, serialize } from '../src/logic/state.js';

describe('story', () => {
  it('starts at the first chapter with a goal on screen', () => {
    const g = createGame(1);
    expect(currentChapter(g).id).toBe('basket');
    expect(goalText(g)).toMatch(/Catch 2 fish/);
    expect(checkStory(g)).toBeNull();
  });

  it('advances one chapter at a time and pays its reward', () => {
    const g = createGame(1);
    const yams = g.inv.yam;
    g.stats.fishCaught = 2;
    g.stats.trades = 1; // already ahead: still only one beat per check
    const r = checkStory(g);
    expect(r.chapter.id).toBe('basket');
    expect(r.next.id).toBe('market');
    expect(g.inv.yam).toBe(yams + 1);
    expect(checkStory(g).chapter.id).toBe('market');
  });

  it('the stylist chapter needs all four hair goods', () => {
    const g = createGame(1);
    g.story.chapter = CHAPTERS.findIndex((c) => c.id === 'basketOfHair');
    Object.assign(g.inv, { thread: 1, beads: 1, camwood: 1 });
    expect(checkStory(g)).toBeNull();
    g.inv.comb = 1;
    expect(checkStory(g).chapter.id).toBe('basketOfHair');
  });

  it('finishes after the festival', () => {
    const g = createGame(1);
    g.story.chapter = CHAPTERS.length - 1;
    g.festivalsEntered.push(4);
    expect(checkStory(g).next).toBeNull();
    expect(g.story.finished).toBe(true);
    expect(currentChapter(g)).toBeNull();
  });

  it('the epilogue follows the result', () => {
    expect(epilogue(1, 80)).toMatch(/palm wine to her father/);
    expect(epilogue(1, 40)).toMatch(/beginning/);
    expect(epilogue(3, 80)).toMatch(/Next full moon/);
  });

  it('older saves without a story get one', () => {
    const g = createGame(2);
    const raw = JSON.parse(serialize(g));
    delete raw.story;
    delete raw.stats;
    const back = deserialize(JSON.stringify(raw));
    expect(back.story.chapter).toBe(0);
    expect(back.stats.fishCaught).toBe(0);
  });
});

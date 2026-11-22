# Numerology Tracker

Predictions are logged **before kick-off** and graded afterwards. No changes after results.

## Rules (fixed)

**Team numbers**: name number (A=1 … I=9, J=1 … R=9, S=1 … Z=8, reduced to one digit) and league position reduced to one digit (17th → 8, 18th → 9, 10th → 1). Points (e.g. 9 pts) are logged as a secondary "9" only.

**Rule 8 (abundance):** a team whose name or position is 8:
- in scoring form (season ≥ 1.8 goals/game, until last-5 data is available) → **extreme high: over 3.5 goals**
- not in scoring form (< 1.3 goals/game) → **extreme low: under 1.5 goals**
- in between (1.3–1.8 goals/game) → no bet, logged only
- League position does not decide form, only goals scored does.

**Rule 1 vs 9 (updated 22 Nov):** a 1 (name or position) plays a 9 (name, position, or a team that moves into 9th with a win) → **bet the opponent of the 1 at +2 or +3 handicap**, so the 1 can win by up to 1–2 goals and the bet still wins.

**Rule 8 double-8 (added 22 Nov):** both teams are 8 (name or position) and **both are in scoring form before the match** → **over 3.5 goals**. Example: Man United (8) vs Aston Villa (8), 4-4.

---

## Backtest: Fri 20 Nov 2026

| Match | Trigger | Bet | Score | Result |
|---|---|---|---|---|
| Annecy vs Clermont | Clermont 1 (name) vs Annecy, moved into 9th | Annecy −1 | 4-2 | ✅ |
| Bayern vs Köln | Bayern 1st vs Köln on 9 pts (secondary) | Köln +1 | 1-1 | ✅ |
| Annecy vs Clermont | Annecy 8 (name), in form | Over 3.5 | 6 goals | ✅ |
| Athletic vs Espanyol | Espanyol 8 (name), poor scoring | Under 1.5 | 1 goal | ✅ |
| Troyes vs Le Havre | Troyes 8 (17th), Le Havre 8 (name) | form not checked | 4 goals | not graded |
| Den Bosch vs VVV | VVV 8 (name) | form not checked | 1 goal | not graded |

---

## Backtest: last round before the international break (6–9 Nov 2026), 35 matches

### Rule 8: games with an "8" team (name number)

| Match | 8 team | Pre-match goals/game | Rule bet | Score | Goals | Extreme? (≤1 or ≥4) | Bet |
|---|---|---|---|---|---|---|---|
| Hamburger SV vs Gladbach | HSV | 0.9 (low) | Under 1.5 | 3-1 | 4 | ✅ | ❌ |
| Hoffenheim vs Schalke | Hoffenheim | 1.75 (middle) | no bet | 2-1 | 3 | ❌ | – |
| Everton vs Coventry | Coventry | unknown | – | 3-1 | 4 | ✅ | – |
| Leeds vs Tottenham | Tottenham | 1.1 (low) | Under 1.5 | 1-0 | 1 | ✅ | ✅ |
| Ipswich vs Bournemouth | Bournemouth | unknown | – | 1-2 | 3 | ❌ | – |
| Sunderland vs Chelsea | Chelsea | 2.1 (high) | Over 3.5 | 1-0 | 1 | ✅ | ❌ |
| Man United vs Aston Villa | both | unknown | – | 4-4 | 8 | ✅ | – |
| Sevilla vs Alavés | Sevilla | unknown | – | 0-0 | 0 | ✅ | – |
| Espanyol vs Deportivo | Espanyol | unknown (poor) | – | 0-0 | 0 | ✅ | – |
| Málaga vs Racing | Málaga | unknown | – | 1-2 | 3 | ❌ | – |

**Extreme-score check (8 games vs all others), both rounds combined:**

| | Extreme (≤1 or ≥4 goals) | Normal (2–3 goals) | Rate |
|---|---|---|---|
| Games with an 8 (6–9 Nov + 20 Nov) | 11 | 3 | **79%** |
| Games without an 8 | 12 | 20 | **38%** |

One-sided Fisher test p ≈ 0.012. Caveat: the "extreme" definition was chosen after looking at the data, and the sample is small.

**Direction (high vs low from scoring form):** 3 right, 2 wrong across both rounds (Spurs ✅, Annecy ✅, Espanyol ✅, Chelsea ❌, HSV ❌).

### Rule 1 vs 9

No name-number 1 vs 9 matchups this round. Position-based (approximate, pre-match positions estimated):

| Match | The 1 | The 9 | Bet | Score | Result |
|---|---|---|---|---|---|
| Napoli vs Lazio | Napoli (~10th → 1) | Lazio (name 9) | Lazio +1 | 1-1 | ✅ (Lazio is also 1st, conflicting) |
| Mainz vs Bayern | Bayern (1st) | Mainz (name 9) | Mainz +1 | 1-2 | ⚪ push (Bayern won by exactly 1) |

---

## Weekend 21–23 Nov 2026: predictions

### Rule 1 vs 9

| Match | The 1 | The 9 | Bet | Score | Result |
|---|---|---|---|---|---|
| 🇮🇹 Como vs Cagliari (Sat 15:00) | Como (name 1) | Cagliari (**9th**, 16 pts) | **Cagliari +1** | | |
| 🇩🇪 Frankfurt vs Hoffenheim (Sat 15:30) | Frankfurt (**10th** → 1) | Hoffenheim (**9th**) | **Hoffenheim +1** | | |
| 🇮🇹 Lazio vs Lecce (Sat 15:00) | Lecce (name 1) | Lazio (name 9) | **Lazio −1** ⚠️ Lazio is also 1st (a 1) | | |

### Rule 8

| Match | The 8 | Scoring form | Bet | Score | Result |
|---|---|---|---|---|---|
| 🏴 Chelsea vs Leeds (Sat 15:00) | Chelsea (name) | 19 in 10 = 1.9/g ✅ | **Over 3.5** | | |
| 🏴 Tottenham vs Ipswich (Sat 15:00) | Tottenham (name) | 10 in 10 = 1.0/g ❌ | **Under 1.5** | | |
| 🇩🇪 Werder vs Hamburger SV (Sun 17:30) | HSV (name) | 10 in 9 = 1.1/g ❌ | **Under 1.5** | | |
| 🇩🇪 Frankfurt vs Hoffenheim (Sat 15:30) | Hoffenheim (name) | 16 in 9 = 1.8/g ✅ | **Over 3.5** | | |
| 🏴 Liverpool vs Man United (Sun 16:30) | Man Utd (name) | unknown, 18th, manager sacked | check before kick-off | | |
| 🏴 Bournemouth vs Forest | Bournemouth (name) | unknown | check | | |
| 🏴 Aston Villa vs Sunderland | Villa (name) | unknown | check | | |
| 🏴 Coventry vs Crystal Palace | Coventry (name) | unknown | check | | |

### Data gaps (positions not found)
Fulham, Leeds, Newcastle, Brentford (PL). Possible extra 1 vs 9 triggers: Man City (1) vs Fulham, Newcastle vs Arsenal (1st), Brentford vs Everton (9).

---

## Running score

| Rule | Bets | Won | Hit rate |
|---|---|---|---|
| 1 vs 9 handicap (+1, old) | 4 | 3 won, 1 push | 100% of decided bets |
| 1 vs 9 handicap (+2, new) | 4 | 4 won (Annecy, Köln, Lazio, Mainz) | 100% (too few to judge) |
| Double-8 over 3.5 | 1 | 1 (Man Utd–Villa 4-4, form not checked) | – |
| 8 direction (high/low by form) | 5 | 3 | 60% |
| 8 "extreme score" pattern | 14 games | 11 extreme | 79% vs 38% baseline |

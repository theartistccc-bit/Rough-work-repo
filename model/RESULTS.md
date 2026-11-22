# Edge model: results

**Model:** Dixon-Coles style Poisson. Each team has an attack and a defence rating, plus home advantage, with time-decay weighting (xi = 0.003 per day). The goal rates blend 60% goals and 40% shots on target, converted to goals at the league's rate. Ratings are shrunk toward average (k = 3), with a low-score correction (rho = -0.08) and a spread factor of 1.15.

**Data:** datasets/football-datasets (football-data.co.uk results and shots, no odds), covering 5 leagues from 2020/21 to 2025/26.

**Method:** walk-forward. Before every match week, the model is refit on earlier matches only. Parameters were tuned on 2024/25, then tested once on 2025/26 (1,752 matches, out of sample).

| Metric (2025/26, out of sample) | Model | Baseline (last season's frequencies) |
|---|---|---|
| 1X2 log loss | **0.991** | 1.074 |
| 1X2 RPS | **0.2015** | 0.2295 |
| Over 2.5 log loss | 0.683 | 0.686 |

**1X2 calibration:** predicted probabilities match actual frequencies within about 2–5 points across 10–80%.

**Confident picks:**
- 408 picks at a model win probability of 60% or more: 70.8% won (model said 68.8%).
- 133 picks at 70% or more: 80.5% won (model said 78.0%).

**Over 2.5:** only marginally better than the baseline. The model has no meaningful edge in goals markets.

**Not yet proven: profit against bookmakers.** No odds data was reachable from this environment. Published research puts closing-line RPS for top leagues at roughly 0.19–0.20, so this model is in the same range as bookmakers but probably slightly behind sharp closing prices.

Run: `python3 -I model/edge_model.py <data_dir>`

---

## Backtest against real odds (football-data.co.uk), `model/backtest.py`

### Accuracy vs Pinnacle (RPS, lower is better)

| | 2024/25 | 2025/26 |
|---|---|---|
| Pinnacle closing | 0.1933 | 0.1935 |
| Pinnacle opening | 0.1942 | 0.1928 |
| Model blended 20/80 with Pinnacle | 0.1948 | 0.1934 |
| Model alone | 0.1994 | 0.1978 |

The model is clearly less accurate than Pinnacle, and blending it in never beat Pinnacle on its own.

### Betting on the model (strategies tuned on 2024/25, tested on 2025/26)

Every strategy lost money or broke even out of sample: 1X2 ROI between -3.6% and -13.6%, over 2.5 ROI between -24.9% and +0.1%. The best 2024/25 strategies collapsed in 2025/26, which means they were overfitted.

### Value betting: take the best bookmaker price when it beats Pinnacle's no-vig fair odds (no model)

| Rule | 2024/25 | 2025/26 |
|---|---|---|
| 1X2, edge ≥ 2%, odds ≤ 6 | 441 bets, ROI +0.8%, CLV +3.2% | 93 bets, ROI +12.4%, CLV +5.3% |
| 1X2, edge ≥ 4%, odds ≤ 6 | 133 bets, ROI +6.5%, CLV +4.6% | 38 bets, ROI +10.1%, CLV +9.2% |
| Over 2.5, edge ≥ 2% | 65 bets, ROI +20.3%, CLV +6.0% | 25 bets, ROI +1.4%, CLV +8.6% |

CLV (closing line value) was positive in **every** configuration in both seasons. That's the reliable sign of a real edge. ROI is noisy because the samples are small.

Caveats:
- "Max" odds are the best price across many bookmakers when the data was collected, so you won't always be able to get them.
- Soft bookmakers limit accounts that win.
- Only 898 of the 2025/26 matches have Pinnacle closing odds.

---

## Lower leagues (`model/lower_leagues.py`)

These leagues were tested: Championship, League One, League Two, Segunda, Serie B, 2. Bundesliga and Ligue 2. Model parameters came from the top-5 tuning, and the betting rules were fixed in advance, so both seasons are out of sample. Pinnacle odds in the 2025/26 files cover only part of the season.

**Accuracy:** the model was less accurate than Pinnacle opening odds in all 7 leagues in both seasons, by about 0.004–0.011 RPS.

| Strategy (all 7 leagues combined) | 2024/25 | 2025/26 |
|---|---|---|
| Model, average price, edge ≥ 5% | 1,554 bets, ROI −11.0%, CLV −7.2% | 554 bets, ROI −11.3%, CLV −7.5% |
| Model, best price, edge ≥ 5% | 2,406 bets, ROI −4.1%, CLV −2.2% | 825 bets, ROI −7.9%, CLV −2.5% |
| 50/50 model + Pinnacle, best price, edge ≥ 3% | 1,825 bets, ROI −2.4%, CLV −1.9% | 619 bets, ROI −5.7%, CLV −2.0% |
| Price shopping vs Pinnacle, edge ≥ 4% | 209 bets, ROI +13.3%, CLV +2.9% | 72 bets, ROI −4.1%, CLV +3.4% |

**Conclusion:** there was no analytical edge in the lower leagues either. Model-driven bets had negative CLV everywhere. Price shopping again had positive CLV in both seasons.

---

## Checks (`model/checks.py`)

**1. Audit of 10 random 2025/26 matches:** the ratings, expected goals, probabilities and EV figures recompute correctly by hand. For example, Man City vs Everton: draw at 22.5% × 5.25 − 1 = +18.2%. The model flagged 7 of the 10 matches as bets, and all 7 lost. Each one was a match where the model disagreed with Pinnacle, and Pinnacle was closer.

**2. Independent Elo model** (tuned on 2024/25): 2025/26 RPS 0.2035, worse than the Poisson model's 0.1978 and Pinnacle's 0.1928. Bets: ROI −3.3% to −7.2%, CLV −3.2% to −6.6%.

**3. Improvements:**

| Variant | RPS 2024/25 | RPS 2025/26 | Best-price ROI 24/25 · 25/26 | CLV 24/25 · 25/26 |
|---|---|---|---|---|
| Original | 0.1994 | 0.1978 | −3.3% · −4.7% | −0.8% · −2.3% |
| + promoted teams from 2nd division | 0.2001 | 0.1976 | −5.1% · −9.6% | −0.9% · −1.9% |
| + per-team home advantage | **0.1991** | **0.1968** | +0.2% · +1.9% | −0.7% · −2.3% |
| + both | 0.1995 | 0.1967 | −3.3% · −3.0% | −0.8% · −2.3% |
| Pinnacle opening | 0.1942 | 0.1928 | | |

Per-team home advantage is a small real improvement in accuracy, and it's kept. None of the variants closes the gap to Pinnacle, and CLV stays negative in every version.

---

## Cards model (`model/cards_model.py`)

**What it models:**
- Total yellow cards per match: each team's booking tendency, plus how often it gets opponents booked.
- Referee strictness (English leagues only, since only they have referee data).
- Time-decay weighting and a negative binomial spread.
- Match closeness (from the pre-match odds) was tested and added nothing (beta tuned to 0).

**Method:** tuned on 2024/25, tested on 2025/26 (3,408 matches, 8 leagues).

| 2025/26 log loss (lower is better) | Over 3.5 | Over 4.5 |
|---|---|---|
| League average (baseline) | 0.6905 | 0.6359 |
| Teams only | 0.6828 | 0.6295 |
| **Full model** | **0.6804** | **0.6275** |
| England: teams only | 0.6910 | 0.6287 |
| England: teams + referee | **0.6869** | **0.6254** |

**Calibration (over 4.5):** predicted probabilities fall within about 1–2 points of actual frequencies across the 20–60% range.

Referees add a real, measurable improvement on top of team behaviour. No historical cards odds are available, so profit against bookmakers is untested.

Fair odds: `python3 -I model/cards_model.py predict <data_dir> "E0|Liverpool|Man United|A Taylor"`
Referee table: `python3 -I model/cards_model.py referees <data_dir> E0`

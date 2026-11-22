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

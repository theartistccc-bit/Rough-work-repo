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

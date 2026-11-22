"""Backtest the edge model against real bookmaker odds (football-data.co.uk).

Usage: python3 -I backtest.py <results_dir> <odds_dir>
Strategy parameters are tuned on 2024/25 and applied once to 2025/26.
"""
import csv, sys, os, math, itertools, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import edge_model as em

CODES = {"premier-league": "E0", "la-liga": "SP1", "serie-a": "I1", "bundesliga": "D1", "ligue-1": "F1"}
PARAMS = dict(xi=0.003, blend=0.4, rho=-0.08, spread=1.15, k_prior=3.0)


def f(x):
    try:
        v = float(x); return v if v > 1.0 else None
    except (TypeError, ValueError):
        return None


def load_odds(d, season):
    out = {}
    for lg, c in CODES.items():
        for r in csv.DictReader(open(os.path.join(d, f"{c}-{season}.csv"), encoding="utf-8-sig", errors="ignore")):
            dd, mm, yy = r["Date"].split("/"); yy = ("20" + yy) if len(yy) == 2 else yy
            key = (f"{yy}-{mm}-{dd}", r["HomeTeam"], r["AwayTeam"])
            out[key] = dict(
                ps=[f(r.get("PSH")), f(r.get("PSD")), f(r.get("PSA"))],
                psc=[f(r.get("PSCH")), f(r.get("PSCD")), f(r.get("PSCA"))],
                avg=[f(r.get("AvgH")), f(r.get("AvgD")), f(r.get("AvgA"))],
                mx=[f(r.get("MaxH")), f(r.get("MaxD")), f(r.get("MaxA"))],
                o25=[f(r.get("P>2.5")), f(r.get("P<2.5"))], o25c=[f(r.get("PC>2.5")), f(r.get("PC<2.5"))],
                o25avg=[f(r.get("Avg>2.5")), f(r.get("Avg<2.5"))], o25mx=[f(r.get("Max>2.5")), f(r.get("Max<2.5"))])
    return out


def devig(odds):
    if not odds or any(o is None for o in odds):
        return None
    inv = [1 / o for o in odds]; s = sum(inv); return [i / s for i in inv]


def rps(p, res):
    cum = [p[0], p[0] + p[1]]; obs = [1.0 if res == 0 else 0.0, 1.0 if res <= 1 else 0.0]
    return sum((a - b) ** 2 for a, b in zip(cum, obs)) / 2


def joined(data, season, odds):
    preds = em.predict_season(data, season, **PARAMS)
    rows = []
    for x in preds:
        r = x["r"]; k = (r["date"].isoformat(), r["h"], r["a"])
        if k not in odds:
            continue
        o = odds[k]
        res = 0 if r["hg"] > r["ag"] else 1 if r["hg"] == r["ag"] else 2
        rows.append(dict(p=[x["p"]["H"], x["p"]["D"], x["p"]["A"]], po=[x["p"]["O25"], 1 - x["p"]["O25"]],
                         res=res, over=0 if r["hg"] + r["ag"] >= 3 else 1, o=o))
    return rows


def accuracy(rows):
    tot = collections.Counter(); n = 0
    for r in rows:
        mk = devig(r["o"]["ps"]); cl = devig(r["o"]["psc"])
        if not mk or not cl:
            continue
        n += 1
        tot["model"] += rps(r["p"], r["res"]); tot["pinnacle_open"] += rps(mk, r["res"]); tot["pinnacle_close"] += rps(cl, r["res"])
        for w in (0.2, 0.4):
            b = [w * a + (1 - w) * c for a, c in zip(r["p"], mk)]
            tot[f"blend{w}"] += rps(b, r["res"])
    return n, {k: v / n for k, v in tot.items()}


def simulate(rows, w, edge_min, price, max_odds=6.0, market="1x2"):
    """Flat 1-unit bets where blended prob * offered price - 1 >= edge_min. Returns stats incl. CLV."""
    bets = []
    for r in rows:
        o = r["o"]
        if market == "1x2":
            mk = devig(o["ps"]); cl = devig(o["psc"]); offer = o[price]; probs = r["p"]; outcome = r["res"]; k = 3
        else:
            mk = devig(o["o25"]); cl = devig(o["o25c"]); offer = o["o25" + ("mx" if price == "mx" else "avg" if price == "avg" else "")]; probs = r["po"]; outcome = r["over"]; k = 2
        if not mk or not cl or not offer or any(v is None for v in offer):
            continue
        for i in range(k):
            q = w * probs[i] + (1 - w) * mk[i]
            ev = q * offer[i] - 1
            if ev >= edge_min and offer[i] <= max_odds:
                pnl = offer[i] - 1 if outcome == i else -1.0
                clv = offer[i] * cl[i] - 1  # value vs no-vig Pinnacle closing
                bets.append((pnl, clv, offer[i]))
    n = len(bets)
    if not n:
        return dict(n=0, roi=0, clv=0, profit=0, avg_odds=0)
    p = sum(b[0] for b in bets)
    return dict(n=n, profit=p, roi=100 * p / n, clv=100 * sum(b[1] for b in bets) / n, avg_odds=sum(b[2] for b in bets) / n)


def bootstrap_p(rows, w, e, price, market, iters=2000):
    import random
    base = []
    for r in rows:
        base.append(r)
    res = simulate(rows, w, e, price, market=market)
    # per-bet resample of pnl
    pnls = []
    for r in rows:
        s = simulate([r], w, e, price, market=market)
        if s["n"]:
            pnls.append(s["profit"])
    random.seed(1); worse = 0
    for _ in range(iters):
        smp = [random.choice(pnls) for _ in pnls]
        if sum(smp) <= 0:
            worse += 1
    return worse / iters


if __name__ == "__main__":
    data = em.load(sys.argv[1])
    for season in ("2425", "2526"):
        print(f"\n===== {season} =====")
        rows = joined(data, season, load_odds(sys.argv[2], season))
        n, acc = accuracy(rows)
        print(f"matched {len(rows)} matches; accuracy (RPS, lower better) on {n}:")
        for k, v in sorted(acc.items(), key=lambda kv: kv[1]):
            print(f"  {k:15} {v:.4f}")
        globals()[f"rows_{season}"] = rows
    print("\n===== strategy tuning on 2024/25 =====")
    grid = []
    for market, price, w, e in itertools.product(["1x2", "o25"], ["avg", "mx"], [0.2, 0.4, 0.6, 1.0], [0.03, 0.06, 0.10]):
        s = simulate(rows_2425, w, e, price, market=market)
        if s["n"] >= 100:
            grid.append((s["roi"], market, price, w, e, s))
    grid.sort(reverse=True)
    for roi, market, price, w, e, s in grid[:10]:
        print(f"  {market} {price:3} w={w} edge>={e:.2f}: bets {s['n']:4} ROI {s['roi']:+.1f}%  CLV {s['clv']:+.1f}%  avg odds {s['avg_odds']:.2f}")
    print("\n===== out-of-sample 2025/26: top 3 tuned strategies + fixed reference strategies =====")
    chosen = [(m, p, w, e) for _, m, p, w, e, _ in grid[:3]] + [("1x2", "avg", 1.0, 0.06), ("1x2", "mx", 0.4, 0.03), ("o25", "mx", 0.4, 0.03)]
    for m, p, w, e in chosen:
        s = simulate(rows_2526, w, e, p, market=m)
        pv = bootstrap_p(rows_2526, w, e, p, m) if s["n"] else 1
        print(f"  {m} {p:3} w={w} edge>={e:.2f}: bets {s['n']:4} profit {s['profit']:+.1f}u ROI {s['roi']:+.1f}%  CLV {s['clv']:+.1f}%  P(no real profit) {pv:.2f}")

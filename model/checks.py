"""Three checks requested on the edge model.

1. Line-by-line audit of 10 random 2025/26 matches.
2. Independent Elo model (tuned on 2024/25, tested on 2025/26).
3. Improved model: promoted teams rated from second-division history + per-team home advantage.

Usage: python3 -I checks.py <top5_dir> <lower_dir>
"""
import sys, os, math, random, itertools, collections
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import edge_model as em, backtest as bt, lower_leagues as ll

SECOND = {"premier-league": "E1", "la-liga": "SP2", "serie-a": "I2", "bundesliga": "D2", "ligue-1": "F2"}
P = bt.PARAMS


# ---------- improved model ----------
def team_home(hist, model, today, xi, k=10.0):
    ix, att, de, H, mean = model
    num = collections.defaultdict(float); den = collections.defaultdict(float)
    for r in hist:
        if r["h"] in ix and r["a"] in ix:
            w = math.exp(-xi * (today - r["date"]).days)
            exp = H * att[ix[r["h"]]] * de[ix[r["a"]]] * mean
            num[r["h"]] += w * r["hg"]; den[r["h"]] += w * exp
    return {t: (num[t] + k) / (den[t] + k) for t in den}


def predict(data, second, season, improved_promoted=False, home_adv=False, xi=P["xi"], blend=P["blend"], rho=P["rho"],
            spread=P["spread"], k_prior=P["k_prior"], keep_models=False):
    preds = []
    for lg, rows in data.items():
        extra = second.get(SECOND[lg], []) if improved_promoted else []
        test = [r for r in rows if r["season"] == season]
        weeks = collections.OrderedDict()
        for r in test:
            weeks.setdefault(r["date"].isocalendar()[:2], []).append(r)
        for wk, ms in weeks.items():
            d0 = min(r["date"] for r in ms)
            hist = [r for r in rows if r["date"] < d0]
            hist_all = hist + [r for r in extra if r["date"] < d0]
            mg = em.fit(hist_all, d0, xi, "hg", "ag", k_prior)
            msot = em.fit(hist_all, d0, xi, "hst", "ast", k_prior)
            conv = sum(r["hg"] + r["ag"] for r in hist[-1500:]) / max(1, sum(r["hst"] + r["ast"] for r in hist[-1500:]))
            th = team_home(hist, mg, d0, xi) if home_adv else {}
            for r in ms:
                gh, ga = em.rates(mg, r["h"], r["a"]); sh, sa = em.rates(msot, r["h"], r["a"])
                lh = math.exp((1 - blend) * math.log(gh) + blend * math.log(sh * conv))
                la = math.exp((1 - blend) * math.log(ga) + blend * math.log(sa * conv))
                lh *= th.get(r["h"], 1.0)
                gm, lr = math.sqrt(lh * la), math.log(lh / la) * spread
                lh, la = gm * math.exp(lr / 2), gm * math.exp(-lr / 2)
                p = em.markets(em.score_matrix(lh, la, rho))
                x = dict(lg=lg, r=r, p=p, lh=lh, la=la)
                if keep_models:
                    x["model"] = mg
                preds.append(x)
    return preds


def to_rows(preds, odds):
    out = []
    for x in preds:
        r = x["r"]; k = (r["date"].isoformat(), r["h"], r["a"])
        if k in odds:
            res = 0 if r["hg"] > r["ag"] else 1 if r["hg"] == r["ag"] else 2
            out.append(dict(p=[x["p"]["H"], x["p"]["D"], x["p"]["A"]], po=[x["p"]["O25"], 1 - x["p"]["O25"]], res=res,
                            over=0 if r["hg"] + r["ag"] >= 3 else 1, o=odds[k], x=x))
    return out


# ---------- Elo ----------
def elo_preds(data, season, K, HFA, theta, gd_scale=True):
    preds = []
    for lg, rows in data.items():
        R = {}; last_season = None
        for r in rows:
            if r["season"] != last_season:
                if last_season is not None:
                    # newcomers start at the average of the teams that left
                    cur = {x["h"] for x in rows if x["season"] == r["season"]}
                    left = [R[t] for t in R if t not in cur]
                    start = sum(left) / len(left) if left else 1400.0
                    for t in cur:
                        R.setdefault(t, start)
                last_season = r["season"]
            rh, ra = R.setdefault(r["h"], 1500.0), R.setdefault(r["a"], 1500.0)
            d = (rh + HFA - ra) / 400 * math.log(10)
            ph = 1 / (1 + math.exp(-(d - theta))); pa = 1 / (1 + math.exp(-(-d - theta))); pd = max(0.0, 1 - ph - pa)
            if r["season"] == season:
                preds.append(dict(lg=lg, r=r, p=dict(H=ph, D=pd, A=pa, O25=0.5)))
            e = 1 / (1 + 10 ** (-(rh + HFA - ra) / 400))
            s = 1.0 if r["hg"] > r["ag"] else 0.5 if r["hg"] == r["ag"] else 0.0
            g = math.log(abs(r["hg"] - r["ag"]) + 1) + 1 if gd_scale else 1.0
            R[r["h"]] = rh + K * g * (s - e); R[r["a"]] = ra - K * g * (s - e)
    return preds


def summary(label, rows):
    n, acc = bt.accuracy(rows)
    out = [f"{label:44} RPS {acc['model']:.4f} (Pinnacle open {acc['pinnacle_open']:.4f}, close {acc['pinnacle_close']:.4f}, n={n})"]
    for lab, w, e, price in [("model, avg price, edge>=5%", 1.0, 0.05, "avg"), ("model, best price, edge>=5%", 1.0, 0.05, "mx"),
                             ("50/50 model+Pinnacle, best, edge>=3%", 0.5, 0.03, "mx")]:
        s = bt.simulate(rows, w, e, price)
        out.append(f"     {lab:40} bets {s['n']:4} ROI {s['roi']:+6.1f}%  CLV {s['clv']:+5.1f}%")
    return "\n".join(out)


if __name__ == "__main__":
    data = em.load(sys.argv[1])
    second, _ = ll.load(sys.argv[2])
    odds = {s: bt.load_odds(os.path.join(os.path.dirname(sys.argv[2]), "fdo"), s) for s in ("2425", "2526")}

    # ---- 1. audit ----
    print("=" * 30, "1. LINE-BY-LINE AUDIT (10 random 2025/26 matches)", "=" * 30)
    preds = predict(data, second, "2526", keep_models=True)
    rows = [x for x in to_rows(preds, odds["2526"]) if bt.devig(x["o"]["ps"]) and all(x["o"]["mx"])]
    random.seed(7)
    for x in random.sample(rows, 10):
        r = x["x"]["r"]; ix, att, de, H, mean = x["x"]["model"]
        ah = att[ix[r["h"]]] if r["h"] in ix else float("nan"); dh = de[ix[r["h"]]] if r["h"] in ix else float("nan")
        aa = att[ix[r["a"]]] if r["a"] in ix else float("nan"); da = de[ix[r["a"]]] if r["a"] in ix else float("nan")
        pin = bt.devig(x["o"]["ps"]); mx = x["o"]["mx"]
        evs = [x["p"][i] * mx[i] - 1 for i in range(3)]
        best = max(range(3), key=lambda i: evs[i]); lab = "HDA"[best]
        bet = f"BET {lab} @ {mx[best]:.2f} (EV {evs[best]:+.1%})" if evs[best] >= 0.05 and mx[best] <= 6 else "no bet"
        res = "HDA"[x["res"]]
        outcome = "" if bet == "no bet" else (" -> WON" if res == lab else " -> lost")
        print(f"\n{r['date']} {r['h']} vs {r['a']}  (final {r['hg']}-{r['ag']}, result {res})")
        print(f"  ratings: {r['h']} attack {ah:.2f} defence {dh:.2f} | {r['a']} attack {aa:.2f} defence {da:.2f} | home factor {H:.2f}, league goals/team {mean:.2f}")
        print(f"  expected goals: {x['x']['lh']:.2f} - {x['x']['la']:.2f}")
        print(f"  model    H {x['p'][0]:.1%}  D {x['p'][1]:.1%}  A {x['p'][2]:.1%}")
        print(f"  Pinnacle H {pin[0]:.1%}  D {pin[1]:.1%}  A {pin[2]:.1%}  (no-vig)")
        print(f"  best odds H {mx[0]:.2f} D {mx[1]:.2f} A {mx[2]:.2f}  -> {bet}{outcome}")

    # ---- 2. Elo ----
    print("\n" + "=" * 30, "2. INDEPENDENT ELO MODEL", "=" * 30)
    best = None
    for K, HFA, theta in itertools.product([15, 20, 30], [50, 70, 90], [0.25, 0.3, 0.35]):
        e_rows = to_rows(elo_preds(data, "2425", K, HFA, theta), odds["2425"])
        n, acc = bt.accuracy(e_rows)
        if best is None or acc["model"] < best[0]:
            best = (acc["model"], K, HFA, theta)
    _, K, HFA, theta = best
    print(f"tuned on 2024/25: K={K} home advantage={HFA} draw width={theta}")
    print(summary("Elo 2025/26 (out of sample)", to_rows(elo_preds(data, "2526", K, HFA, theta), odds["2526"])))

    # ---- 3. improvements ----
    print("\n" + "=" * 30, "3. IMPROVED MODEL", "=" * 30)
    for season in ("2425", "2526"):
        print(f"\n--- {season} ---")
        for label, ip, ha in [("original", False, False), ("+ promoted teams from 2nd division", True, False),
                              ("+ per-team home advantage", False, True), ("+ both", True, True)]:
            print(summary(label, to_rows(predict(data, second, season, ip, ha), odds[season])))

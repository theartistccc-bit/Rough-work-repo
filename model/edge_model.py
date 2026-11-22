"""Walk-forward football prediction model (Dixon-Coles style Poisson, goals + shots-on-target blend).

Usage: python3 -I edge_model.py <data_dir>
Data: datasets/football-datasets CSVs named <league>-<season>.csv (season like 2425).
Tunes on 2024/25, tests out-of-sample on 2025/26.
"""
import csv, sys, math, os, itertools, collections, datetime as dt
import numpy as np

LEAGUES = ["premier-league", "la-liga", "serie-a", "bundesliga", "ligue-1"]
SEASONS = ["2021", "2122", "2223", "2324", "2425", "2526"]
MAXG = 10


def load(d):
    out = {}
    for lg in LEAGUES:
        rows = []
        for s in SEASONS:
            p = os.path.join(d, f"{lg}-{s}.csv")
            if not os.path.exists(p):
                continue
            for r in csv.DictReader(open(p, encoding="utf-8")):
                try:
                    rows.append(dict(date=dt.date.fromisoformat(r["Date"]), season=s, h=r["HomeTeam"], a=r["AwayTeam"],
                                     hg=int(r["FTHG"]), ag=int(r["FTAG"]), hst=int(r["HST"]), ast=int(r["AST"])))
                except (ValueError, KeyError):
                    pass
        rows.sort(key=lambda r: r["date"])
        out[lg] = rows
    return out


def fit(hist, today, xi, key_h, key_a, k_prior=3.0, iters=40):
    """Weighted multiplicative Poisson fit. Returns attack, defence, home factor."""
    teams = sorted({r["h"] for r in hist} | {r["a"] for r in hist})
    ix = {t: i for i, t in enumerate(teams)}
    n = len(teams)
    hi = np.array([ix[r["h"]] for r in hist]); ai = np.array([ix[r["a"]] for r in hist])
    yh = np.array([r[key_h] for r in hist], float); ya = np.array([r[key_a] for r in hist], float)
    age = np.array([(today - r["date"]).days for r in hist], float)
    w = np.exp(-xi * age)
    mean = (w @ (yh + ya)) / (2 * w.sum())
    att = np.ones(n); de = np.ones(n); H = 1.2
    for _ in range(iters):
        num = np.bincount(hi, w * yh, n) + np.bincount(ai, w * ya, n) + k_prior
        den = np.bincount(hi, w * H * de[ai] * mean, n) + np.bincount(ai, w * de[hi] * mean, n) + k_prior
        att = num / den
        num = np.bincount(ai, w * yh, n) + np.bincount(hi, w * ya, n) + k_prior
        den = np.bincount(ai, w * H * att[hi] * mean, n) + np.bincount(hi, w * att[ai] * mean, n) + k_prior
        de = num / den
        H = (w @ yh) / (w @ (att[hi] * de[ai] * mean))
        g = np.exp(np.mean(np.log(att))); att /= g; de *= g
    return ix, att, de, H, mean


def promoted_default(ix, att, de, recent_teams):
    # teams new to the league: weakest-third average
    a = np.sort(att)[: max(1, len(att) // 3)].mean(); d = np.sort(de)[-max(1, len(de) // 3):].mean()
    return a, d


def rates(model, h, a):
    ix, att, de, H, mean = model
    ah, dh = (att[ix[h]], de[ix[h]]) if h in ix else promoted_default(ix, att, de, None)
    aa, da = (att[ix[a]], de[ix[a]]) if a in ix else promoted_default(ix, att, de, None)
    return H * ah * da * mean, aa * dh * mean


def score_matrix(lh, la, rho):
    g = np.arange(MAXG + 1)
    ph = np.exp(-lh) * lh ** g / np.array([math.factorial(i) for i in g])
    pa = np.exp(-la) * la ** g / np.array([math.factorial(i) for i in g])
    m = np.outer(ph, pa)
    m[0, 0] *= 1 - lh * la * rho; m[0, 1] *= 1 + lh * rho; m[1, 0] *= 1 + la * rho; m[1, 1] *= 1 - rho
    return m / m.sum()


def markets(m):
    hw = np.tril(m, -1).sum(); dr = np.trace(m); aw = np.triu(m, 1).sum()
    tot = np.add.outer(np.arange(MAXG + 1), np.arange(MAXG + 1))
    o25 = m[tot >= 3].sum(); o35 = m[tot >= 4].sum()
    btts = m[1:, 1:].sum()
    return dict(H=hw, D=dr, A=aw, O25=o25, O35=o35, BTTS=btts)


def predict_season(data, season, xi, blend, rho, spread=1.0, k_prior=3.0, min_hist=200):
    preds = []
    for lg, rows in data.items():
        test = [r for r in rows if r["season"] == season]
        weeks = collections.OrderedDict()
        for r in test:
            weeks.setdefault(r["date"].isocalendar()[:2], []).append(r)
        for wk, ms in weeks.items():
            d0 = min(r["date"] for r in ms)
            hist = [r for r in rows if r["date"] < d0]
            if len(hist) < min_hist:
                continue
            mg = fit(hist, d0, xi, "hg", "ag", k_prior)
            ms_ = fit(hist, d0, xi, "hst", "ast", k_prior) if blend > 0 else None
            conv = sum(r["hg"] + r["ag"] for r in hist[-1500:]) / max(1, sum(r["hst"] + r["ast"] for r in hist[-1500:]))
            for r in ms:
                gh, ga = rates(mg, r["h"], r["a"])
                if blend > 0:
                    sh, sa = rates(ms_, r["h"], r["a"])
                    lh = math.exp((1 - blend) * math.log(gh) + blend * math.log(sh * conv))
                    la = math.exp((1 - blend) * math.log(ga) + blend * math.log(sa * conv))
                else:
                    lh, la = gh, ga
                gm, lr = math.sqrt(lh * la), math.log(lh / la) * spread
                lh, la = gm * math.exp(lr / 2), gm * math.exp(-lr / 2)
                p = markets(score_matrix(lh, la, rho))
                preds.append(dict(lg=lg, r=r, p=p, lh=lh, la=la))
    return preds


def evaluate(preds, data, season):
    ll = rps = ll25 = 0.0; n = len(preds)
    # baseline: previous-season frequencies per league
    base = {}
    for lg, rows in data.items():
        prev = [r for r in rows if r["season"] < season][-380:]
        c = collections.Counter("H" if r["hg"] > r["ag"] else "D" if r["hg"] == r["ag"] else "A" for r in prev)
        o = sum(1 for r in prev if r["hg"] + r["ag"] >= 3) / len(prev)
        base[lg] = ({k: c[k] / len(prev) for k in "HDA"}, o)
    bll = brps = bll25 = 0.0
    for x in preds:
        r, p = x["r"], x["p"]
        res = "H" if r["hg"] > r["ag"] else "D" if r["hg"] == r["ag"] else "A"
        over = r["hg"] + r["ag"] >= 3
        for P, acc in ((p, 0), (base[x["lg"]][0], 1)):
            l = -math.log(max(P[res], 1e-9))
            cum = [P["H"], P["H"] + P["D"]]; obs = [1.0 if res == "H" else 0.0, 1.0 if res in "HD" else 0.0]
            rp = sum((c - o) ** 2 for c, o in zip(cum, obs)) / 2
            if acc == 0:
                ll += l; rps += rp
            else:
                bll += l; brps += rp
        q = p["O25"]; bq = base[x["lg"]][1]
        ll25 += -math.log(q if over else 1 - q); bll25 += -math.log(bq if over else 1 - bq)
    return dict(n=n, ll=ll / n, rps=rps / n, ll25=ll25 / n, bll=bll / n, brps=brps / n, bll25=bll25 / n)


def calibration(preds, key, outcome):
    bins = collections.defaultdict(lambda: [0, 0, 0.0])
    for x in preds:
        q = x["p"][key]; b = min(9, int(q * 10))
        bins[b][0] += 1; bins[b][1] += outcome(x["r"]); bins[b][2] += q
    return [(f"{b*10}-{b*10+10}%", n, pr / n, k / n) for b, (n, k, pr) in sorted(bins.items()) if n >= 20]


if __name__ == "__main__":
    data = load(sys.argv[1])
    print("matches per league:", {k: len(v) for k, v in data.items()})
    print("\n--- tuning on 2024/25 (validation) ---")
    best = None
    xi, blend, rho = 0.003, 0.4, -0.08  # chosen in round-1 tuning on 2024/25
    for k, sp in itertools.product([0.5, 1.5, 3.0], [1.0, 1.15, 1.3]):
        e = evaluate(predict_season(data, "2425", xi, blend, rho, sp, k), data, "2425")
        print(f"k_prior={k} spread={sp}: logloss {e['ll']:.4f}  RPS {e['rps']:.4f}  O2.5 ll {e['ll25']:.4f}")
        if best is None or e["rps"] < best[0]["rps"]:
            best = (e, k, sp)
    _, k, sp = best
    print(f"\nchosen: xi={xi} blend={blend} rho={rho} k_prior={k} spread={sp}")
    print("\n--- out-of-sample test on 2025/26 ---")
    preds = predict_season(data, "2526", xi, blend, rho, sp, k)
    e = evaluate(preds, data, "2526")
    print(f"matches {e['n']}")
    print(f"1X2 log loss: model {e['ll']:.4f} vs baseline {e['bll']:.4f}")
    print(f"1X2 RPS:      model {e['rps']:.4f} vs baseline {e['brps']:.4f}")
    print(f"Over 2.5 ll:  model {e['ll25']:.4f} vs baseline {e['bll25']:.4f}")
    print("\ncalibration home win (bucket, n, predicted, actual):")
    for row in calibration(preds, "H", lambda r: r["hg"] > r["ag"]):
        print("  %-8s n=%4d pred %.3f actual %.3f" % row)
    print("calibration over 2.5:")
    for row in calibration(preds, "O25", lambda r: r["hg"] + r["ag"] >= 3):
        print("  %-8s n=%4d pred %.3f actual %.3f" % row)
    # confident-pick accuracy
    for th in (0.6, 0.7):
        s = [x for x in preds if max(x["p"]["H"], x["p"]["A"]) >= th]
        hit = sum(1 for x in s if (x["p"]["H"] >= th and x["r"]["hg"] > x["r"]["ag"]) or (x["p"]["A"] >= th and x["r"]["ag"] > x["r"]["hg"]))
        avgp = sum(max(x["p"]["H"], x["p"]["A"]) for x in s) / max(1, len(s))
        print(f"picks with win prob >= {th:.0%}: {len(s)} matches, won {hit} ({hit/max(1,len(s)):.1%}), model said {avgp:.1%}")

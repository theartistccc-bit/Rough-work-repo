"""Yellow-card model: team booking tendencies + referee strictness + match closeness.

E[home yellows] = mu_h * agg[home] * prov[away] * ref[referee] * exp(beta * (closeness - c0))
E[away yellows] = mu_a * agg[away] * prov[home] * ref[referee] * exp(beta * (closeness - c0))
agg  = how often a team gets booked, prov = how often it gets opponents booked,
ref  = referee strictness (English leagues only; others have no referee data),
closeness = 1 - |P(home) - P(away)| from pre-match average bookmaker odds.
Total yellows ~ negative binomial with fitted dispersion.

Usage:
  python3 -I cards_model.py backtest <data_dir>
  python3 -I cards_model.py predict <data_dir> "League|Home|Away|Referee" ...
     League codes: E0 E1 E2 E3 SP1 I1 D1 F1. Referee may be empty.
"""
import csv, sys, os, math, itertools, collections, datetime as dt
import numpy as np

LEAGUES = {"E0": "Premier League", "E1": "Championship", "E2": "League One", "E3": "League Two",
           "SP1": "La Liga", "I1": "Serie A", "D1": "Bundesliga", "F1": "Ligue 1"}
SEASONS = ["2021", "2122", "2223", "2324", "2425", "2526", "2627"]
LINES = [2.5, 3.5, 4.5, 5.5, 6.5]


def fnum(x):
    try:
        v = float(x); return v if v > 1 else None
    except (TypeError, ValueError):
        return None


def load(d):
    data = {}
    for c in LEAGUES:
        rows = []
        for s in SEASONS:
            p = os.path.join(d, f"{c}-{s}.csv")
            if not os.path.exists(p):
                continue
            for r in csv.DictReader(open(p, encoding="utf-8-sig", errors="ignore")):
                try:
                    dd, mm, yy = r["Date"].split("/"); yy = ("20" + yy) if len(yy) == 2 else yy
                    oh, od, oa = fnum(r.get("AvgH")), fnum(r.get("AvgD")), fnum(r.get("AvgA"))
                    if oh and od and oa:
                        s_ = 1 / oh + 1 / od + 1 / oa; close = 1 - abs(1 / oh / s_ - 1 / oa / s_)
                    else:
                        close = None
                    rows.append(dict(date=dt.date(int(yy), int(mm), int(dd)), season=s, h=r["HomeTeam"], a=r["AwayTeam"],
                                     hy=int(r["HY"]), ay=int(r["AY"]), ref=(r.get("Referee") or "").strip(), close=close))
                except (ValueError, KeyError, TypeError):
                    continue
        rows.sort(key=lambda r: r["date"])
        data[c] = rows
    return data


def fit(hist, today, xi, k, iters=30):
    teams = sorted({r["h"] for r in hist} | {r["a"] for r in hist}); ti = {t: i for i, t in enumerate(teams)}
    refs = sorted({r["ref"] for r in hist if r["ref"]}); ri = {f: i for i, f in enumerate(refs)}
    n, m = len(teams), max(1, len(refs))
    hi = np.array([ti[r["h"]] for r in hist]); ai = np.array([ti[r["a"]] for r in hist])
    fi = np.array([ri.get(r["ref"], -1) for r in hist]); has = fi >= 0; fi2 = np.where(has, fi, 0)
    yh = np.array([r["hy"] for r in hist], float); ya = np.array([r["ay"] for r in hist], float)
    w = np.exp(-xi * np.array([(today - r["date"]).days for r in hist], float))
    mu_h = (w @ yh) / w.sum(); mu_a = (w @ ya) / w.sum()
    agg = np.ones(n); prov = np.ones(n); ref = np.ones(m)
    kp = k * (mu_h + mu_a) / 2
    for _ in range(iters):
        rf = np.where(has, ref[fi2], 1.0)
        eh = mu_h * prov[ai] * rf; ea = mu_a * prov[hi] * rf
        agg = (np.bincount(hi, w * yh, n) + np.bincount(ai, w * ya, n) + kp) / (np.bincount(hi, w * eh, n) + np.bincount(ai, w * ea, n) + kp)
        eh = mu_h * agg[hi] * rf; ea = mu_a * agg[ai] * rf
        prov = (np.bincount(ai, w * yh, n) + np.bincount(hi, w * ya, n) + kp) / (np.bincount(ai, w * eh, n) + np.bincount(hi, w * ea, n) + kp)
        if refs:
            e = mu_h * agg[hi] * prov[ai] + mu_a * agg[ai] * prov[hi]
            ref = (np.bincount(fi2[has], (w * (yh + ya))[has], m) + 2 * kp) / (np.bincount(fi2[has], (w * e)[has], m) + 2 * kp)
            ref /= np.exp(np.average(np.log(ref[fi2[has]]), weights=w[has]))
        g = np.exp(np.mean(np.log(agg))); agg /= g
        g = np.exp(np.mean(np.log(prov))); prov /= g
    return dict(ti=ti, ri=ri, agg=agg, prov=prov, ref=ref, mu_h=mu_h, mu_a=mu_a)


def expected(M, h, a, refname, close, beta, c0, use_ref=True):
    def t(arr, x, default):
        return arr[M["ti"][x]] if x in M["ti"] else default
    # unknown (newly promoted) teams: league-average behaviour
    rf = M["ref"][M["ri"][refname]] if (use_ref and refname in M["ri"]) else 1.0
    cf = math.exp(beta * ((close if close is not None else c0) - c0))
    eh = M["mu_h"] * t(M["agg"], h, 1.0) * t(M["prov"], a, 1.0) * rf * cf
    ea = M["mu_a"] * t(M["agg"], a, 1.0) * t(M["prov"], h, 1.0) * rf * cf
    return eh, ea


def nb_pmf(lam, r, kmax=25):
    # negative binomial with mean lam, size r (r=None -> Poisson)
    out = []
    for k in range(kmax + 1):
        if r is None:
            out.append(math.exp(-lam + k * math.log(lam) - math.lgamma(k + 1)))
        else:
            p = r / (r + lam)
            out.append(math.exp(math.lgamma(k + r) - math.lgamma(r) - math.lgamma(k + 1) + r * math.log(p) + k * math.log(1 - p)))
    s = sum(out); return [x / s for x in out]


def over_probs(lam, r):
    pm = nb_pmf(lam, r); return {L: sum(pm[int(L) + 1:]) for L in LINES}


def walk(data, season, xi, k, min_hist=300):
    """Returns list of (league, row, model) with the model fitted before that match week."""
    out = []
    for c, rows in data.items():
        test = [r for r in rows if r["season"] == season]
        weeks = collections.OrderedDict()
        for r in test:
            weeks.setdefault(r["date"].isocalendar()[:2], []).append(r)
        for wk, ms in weeks.items():
            d0 = min(r["date"] for r in ms)
            hist = [r for r in rows if r["date"] < d0]
            if len(hist) < min_hist:
                continue
            M = fit(hist, d0, xi, k)
            for r in ms:
                out.append((c, r, M))
    return out


def score(items, beta, r_disp, use_ref=True, baseline=False):
    ll = collections.defaultdict(float); n = 0
    for c, r, M in items:
        if baseline:
            lam = M["mu_h"] + M["mu_a"]
        else:
            eh, ea = expected(M, r["h"], r["a"], r["ref"], r["close"], beta, 0.75, use_ref); lam = eh + ea
        po = over_probs(lam, r_disp); tot = r["hy"] + r["ay"]; n += 1
        for L in (3.5, 4.5):
            q = min(max(po[L], 1e-6), 1 - 1e-6)
            ll[L] += -math.log(q if tot > L else 1 - q)
    return {L: v / n for L, v in ll.items()}, n


if __name__ == "__main__":
    mode, d = sys.argv[1], sys.argv[2]
    data = load(d)
    if mode == "backtest":
        print("matches:", {c: len(v) for c, v in data.items()})
        best = None
        cache = {}
        for xi, k in itertools.product([0.002, 0.004], [5, 15]):
            cache[(xi, k)] = walk(data, "2425", xi, k)
            for beta, rd in itertools.product([0.0, 1.0, 2.0], [None, 30, 15, 8]):
                s, n = score(cache[(xi, k)], beta, rd)
                tot = s[3.5] + s[4.5]
                if best is None or tot < best[0]:
                    best = (tot, xi, k, beta, rd)
        _, xi, k, beta, rd = best
        print(f"tuned on 2024/25: xi={xi} k={k} closeness beta={beta} dispersion={rd}")
        test = walk(data, "2526", xi, k)
        for lab, kw in [("league average (baseline)", dict(baseline=True)), ("teams only (no referee)", dict(use_ref=False)), ("full model", {})]:
            s, n = score(test, beta, rd, **kw)
            print(f"2025/26 {lab:28} n={n}  log loss over 3.5: {s[3.5]:.4f}  over 4.5: {s[4.5]:.4f}")
        print("\nfull model, England only (referee data):")
        eng = [x for x in test if x[0] in ("E0", "E1", "E2", "E3")]
        for lab, kw in [("league average", dict(baseline=True)), ("teams only", dict(use_ref=False)), ("teams + referee", {})]:
            s, n = score(eng, beta, rd, **kw)
            print(f"  {lab:16} n={n}  over 3.5: {s[3.5]:.4f}  over 4.5: {s[4.5]:.4f}")
        print("\ncalibration, over 4.5 yellows (full model, 2025/26):")
        bins = collections.defaultdict(lambda: [0, 0, 0.0])
        for c, r, M in test:
            eh, ea = expected(M, r["h"], r["a"], r["ref"], r["close"], beta, 0.75)
            q = over_probs(eh + ea, rd)[4.5]; b = min(9, int(q * 10))
            bins[b][0] += 1; bins[b][1] += (r["hy"] + r["ay"] > 4.5); bins[b][2] += q
        for b, (n, kk, pr) in sorted(bins.items()):
            if n >= 30:
                print(f"  {b*10}-{b*10+10}%  n={n:4}  predicted {pr/n:.3f}  actual {kk/n:.3f}")
        open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "cards_params.txt"), "w").write(f"{xi} {k} {beta} {rd}\n")
    elif mode == "predict":
        xi, k, beta, rd = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "cards_params.txt")).read().split()
        xi, k, beta = float(xi), float(k), float(beta); rd = None if rd == "None" else float(rd)
        today = dt.date.today()
        for spec in sys.argv[3:]:
            c, h, a, ref = (spec.split("|") + [""])[:4]
            M = fit(data[c], today, xi, k)
            eh, ea = expected(M, h, a, ref, None, beta, 0.75)
            po = over_probs(eh + ea, rd)
            known = "known" if ref in M["ri"] else "unknown -> neutral"
            print(f"\n{LEAGUES[c]}: {h} vs {a}, referee {ref or '-'} ({known})")
            if ref in M["ri"]:
                print(f"  referee strictness factor {M['ref'][M['ri'][ref]]:.2f} (1.00 = average)")
            print(f"  expected yellows: {h} {eh:.2f}, {a} {ea:.2f}, total {eh+ea:.2f}")
            for L in LINES:
                p = po[L]
                print(f"  over {L}: {p:5.1%} (fair {1/p:5.2f})   under {L}: {1-p:5.1%} (fair {1/(1-p):5.2f})")
    elif mode == "referees":
        xi, k, beta, rd = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "cards_params.txt")).read().split()
        M = fit(data[sys.argv[3]], dt.date.today(), float(xi), float(k))
        cnt = collections.Counter(r["ref"] for r in data[sys.argv[3]] if r["season"] in ("2526", "2627"))
        lst = sorted(((M["ref"][i], f) for f, i in M["ri"].items() if cnt[f] >= 8), reverse=True)
        for v, f in lst:
            print(f"  {f:22} {v:.2f}  ({cnt[f]} games since 2025/26)")

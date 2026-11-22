"""Test the edge model on lower leagues against real odds.

Usage: python3 -I lower_leagues.py <football_data_dir>
Model parameters were tuned on the top-5 leagues (2024/25), so both 2024/25 and 2025/26
are out of sample here. Betting rules are fixed in advance (no tuning).
"""
import csv, sys, os, datetime as dt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import edge_model as em
import backtest as bt

CODES = {"E1": "Championship", "E2": "League One", "E3": "League Two", "SP2": "Segunda", "I2": "Serie B", "D2": "2. Bundesliga", "F2": "Ligue 2"}
SEASONS = ["2021", "2122", "2223", "2324", "2425", "2526"]
RULES = [("model, avg price, edge>=5%", 1.0, 0.05, "avg"),
         ("model, best price, edge>=5%", 1.0, 0.05, "mx"),
         ("50/50 model+Pinnacle, best price, edge>=3%", 0.5, 0.03, "mx"),
         ("Pinnacle only, best price, edge>=4% (price shopping)", 0.0, 0.04, "mx")]


def parse_date(s):
    d, m, y = s.split("/"); y = ("20" + y) if len(y) == 2 else y
    return dt.date(int(y), int(m), int(d))


def load(d):
    data, odds = {}, {}
    for c in CODES:
        rows = []
        for s in SEASONS:
            p = os.path.join(d, f"{c}-{s}.csv")
            if not os.path.exists(p):
                continue
            for r in csv.DictReader(open(p, encoding="utf-8-sig", errors="ignore")):
                try:
                    date = parse_date(r["Date"])
                    rows.append(dict(date=date, season=s, h=r["HomeTeam"], a=r["AwayTeam"], hg=int(r["FTHG"]), ag=int(r["FTAG"]),
                                     hst=int(r["HST"]), ast=int(r["AST"])))
                except (ValueError, KeyError, TypeError):
                    continue
                f = bt.f
                odds[(date.isoformat(), r["HomeTeam"], r["AwayTeam"])] = dict(
                    ps=[f(r.get("PSH")), f(r.get("PSD")), f(r.get("PSA"))], psc=[f(r.get("PSCH")), f(r.get("PSCD")), f(r.get("PSCA"))],
                    avg=[f(r.get("AvgH")), f(r.get("AvgD")), f(r.get("AvgA"))], mx=[f(r.get("MaxH")), f(r.get("MaxD")), f(r.get("MaxA"))],
                    o25=[None, None], o25c=[None, None], o25avg=[None, None], o25mx=[None, None])
        rows.sort(key=lambda r: r["date"])
        data[c] = rows
    return data, odds


if __name__ == "__main__":
    data, odds = load(sys.argv[1])
    total = {}
    for season in ("2425", "2526"):
        print(f"\n================ {season} ================")
        for c, name in CODES.items():
            rows = bt.joined({c: data[c]}, season, odds)
            n, acc = bt.accuracy(rows)
            line = f"{name:14} n={n:4} RPS model {acc.get('model', 0):.4f} | Pinnacle open {acc.get('pinnacle_open', 0):.4f} close {acc.get('pinnacle_close', 0):.4f}"
            print(line)
            for lab, w, e, price in RULES:
                s = bt.simulate(rows, w, e, price, max_odds=6.0)
                t = total.setdefault((season, lab), [0, 0.0, 0.0])
                t[0] += s["n"]; t[1] += s["profit"]; t[2] += s["clv"] * s["n"] / 100
                if s["n"]:
                    print(f"     {lab:52} bets {s['n']:4} ROI {s['roi']:+6.1f}%  CLV {s['clv']:+5.1f}%")
    print("\n================ all lower leagues combined ================")
    for (season, lab), (n, p, clv) in sorted(total.items(), key=lambda kv: (kv[0][1], kv[0][0])):
        if n:
            print(f"{season} {lab:52} bets {n:5} profit {p:+7.1f}u ROI {100*p/n:+5.1f}%  CLV {100*clv/n:+5.1f}%")

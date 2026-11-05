// GET /api/candles?pair=EURUSD&tf=1h
// Returns {pair, tf, source, candles:[{t,o,h,l,c}]} with t = unix seconds (UTC).
// Uses Twelve Data when TWELVEDATA_API_KEY is set, otherwise Yahoo Finance's public chart endpoint.
const PAIR_RE = /^[A-Z]{6}$/;
const TF = {
  "15m": { yInterval: "15m", yRange: "5d",  td: "15min", tdSize: 400 },
  "1h":  { yInterval: "60m", yRange: "1mo", td: "1h",    tdSize: 500 },
  "4h":  { yInterval: "60m", yRange: "3mo", td: "4h",    tdSize: 400, agg: 4 },
  "1d":  { yInterval: "1d",  yRange: "1y",  td: "1day",  tdSize: 300 },
};

function aggregate(c, n) {
  // Group hourly candles into n-hour buckets aligned to UTC midnight.
  const out = [];
  for (const k of c) {
    const b = Math.floor(k.t / (3600 * n)) * 3600 * n;
    const last = out[out.length - 1];
    if (last && last.t === b) { last.h = Math.max(last.h, k.h); last.l = Math.min(last.l, k.l); last.c = k.c; }
    else out.push({ t: b, o: k.o, h: k.h, l: k.l, c: k.c });
  }
  return out;
}

async function fromYahoo(pair, cfg) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${pair}=X?interval=${cfg.yInterval}&range=${cfg.yRange}`;
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (fx-scoreboard)" } });
  if (!r.ok) throw new Error(`Yahoo ${r.status}`);
  const j = await r.json();
  const res = j?.chart?.result?.[0];
  if (!res) throw new Error("Yahoo: no result");
  const q = res.indicators.quote[0], ts = res.timestamp || [];
  const c = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open[i], h = q.high[i], l = q.low[i], cl = q.close[i];
    if ([o, h, l, cl].some(v => v == null)) continue;
    c.push({ t: ts[i], o, h, l, c: cl });
  }
  return c;
}

async function fromTwelveData(pair, cfg, key) {
  const sym = pair.slice(0, 3) + "/" + pair.slice(3);
  const url = `https://api.twelvedata.com/time_series?symbol=${sym}&interval=${cfg.td}&outputsize=${cfg.tdSize}&timezone=UTC&apikey=${key}`;
  const r = await fetch(url);
  const j = await r.json();
  if (j.status !== "ok") throw new Error("Twelve Data: " + (j.message || "error"));
  return j.values.reverse().map(v => ({
    t: Math.floor(Date.parse(v.datetime.replace(" ", "T") + "Z") / 1000),
    o: +v.open, h: +v.high, l: +v.low, c: +v.close,
  }));
}

module.exports = async (req, res) => {
  const pair = String(req.query.pair || "").toUpperCase();
  const tf = String(req.query.tf || "1h");
  const cfg = TF[tf];
  if (!PAIR_RE.test(pair) || !cfg) { res.status(400).json({ error: "Use ?pair=EURUSD&tf=15m|1h|4h|1d" }); return; }
  const key = process.env.TWELVEDATA_API_KEY;
  try {
    let candles, source;
    if (key) {
      try { candles = await fromTwelveData(pair, cfg, key); source = "twelvedata"; }
      catch { candles = null; }
    }
    if (!candles) {
      candles = await fromYahoo(pair, cfg); source = "yahoo";
      if (cfg.agg) candles = aggregate(candles, cfg.agg);
    }
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    res.status(200).json({ pair, tf, source, candles });
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
};

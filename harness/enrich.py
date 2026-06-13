"""Add leak-proof STRUCTURAL features to the dataset (domain enters via dataset).

Features (computed from question TEXT + sibling STRIKES only — never outcomes,
never external data):
  - direction: 'above' | 'below' | 'none'  (threshold framing)
  - ladder_rung: 'low' | 'mid' | 'high' | 'solo'  (position of this strike among
    sibling markets in the same event — monotonicity decomposition)
  - ladder_pos: float in [0,1]  (normalized strike position within its event's
    ladder; 0 = lowest strike offered, 1 = highest). Solo markets = 0.5.
  - ladder_pos_bin: int 0..4  (ladder_pos discretized into fifths; ORDINAL — for
    'above' questions, higher bin => higher bar => lower P(yes), monotonically).
  - trivial_bound: bool  ("more than 0 / at least 1 / above 0" ≈ near-certain)

These are domain features, so they live in the dataset, keeping the harness
(forecaster/verifier/diagnostician) domain-agnostic.
"""
import json
import re
from collections import defaultdict

ABOVE = re.compile(r"\b(above|at least|more than|exceed|greater)\b", re.I)
BELOW = re.compile(r"\b(below|under|at most|less than|fewer)\b", re.I)
TRIV = re.compile(r"more than 0|at least 1\b|above 0\b", re.I)


def num(s):
    m = re.search(r"-?[\d,]+\.?\d*", (s or "").replace(",", ""))
    return float(m.group()) if m else None


def main():
    data = json.load(open("data/dataset.json"))
    byev = defaultdict(list)
    for x in data:
        byev[x["event_ticker"]].append(x)
    rung, pos = {}, {}
    for ev, ms in byev.items():
        vals = [(num(m["strike"]) if num(m["strike"]) is not None else num(m["question"]), m)
                for m in ms]
        vals = [(v, m) for v, m in vals if v is not None]
        if len(vals) < 2:
            for m in ms:
                rung[m["ticker"]] = "solo"
                pos[m["ticker"]] = 0.5
            continue
        lo = min(v for v, _ in vals)
        hi = max(v for v, _ in vals)
        for v, m in vals:
            rung[m["ticker"]] = "low" if v == lo else ("high" if v == hi else "mid")
            pos[m["ticker"]] = (v - lo) / (hi - lo) if hi > lo else 0.5
        for m in ms:
            rung.setdefault(m["ticker"], "solo")
            pos.setdefault(m["ticker"], 0.5)

    for x in data:
        q = f"{x['question']} {x['strike']}"
        x["direction"] = "above" if ABOVE.search(q) else ("below" if BELOW.search(q) else "none")
        x["ladder_rung"] = rung.get(x["ticker"], "solo")
        p = pos.get(x["ticker"], 0.5)
        x["ladder_pos"] = round(p, 3)
        x["ladder_pos_bin"] = min(4, int(p * 5))
        x["trivial_bound"] = bool(TRIV.search(q))

    json.dump(data, open("data/dataset.json", "w"), indent=2)
    from collections import Counter
    print("direction:", dict(Counter(x["direction"] for x in data)))
    print("ladder_rung:", dict(Counter(x["ladder_rung"] for x in data)))
    print("ladder_pos_bin:", dict(Counter(x["ladder_pos_bin"] for x in data)))
    print("trivial_bound:", sum(x["trivial_bound"] for x in data))


if __name__ == "__main__":
    main()

"""Fetch + curate settled binary markets from Kalshi (v2, public, no auth).

REBALANCED build:
  - Politics traversed FIRST and deeper so the politics/deadline bucket is ~40%.
  - Economics capped so it doesn't dominate.
  - Tightened DROP filter now also removes COMMODITY / ASSET PRICE-INDEX threshold
    questions (Truflation, FAO food price, Manheim used-vehicle, jet fuel/kerosene,
    crude/Brent/WTI, gold/silver/copper, grains, Freddie Mac mortgage rate, etc.).
    Kept: official macro statistics (CPI, PPI, PCE, inflation rate, GDP, jobs,
    unemployment, Fed policy, PMI, trade balance) and political/deadline events.

CURATION RULE (by type, never by outcome) — see data/curation_log.md.
"""
import json
import re
import sys
import time
import urllib.request

BASE = "https://api.elections.kalshi.com/trade-api/v2/markets"
TARGET_TOTAL = 260
TARGET_POLI = 120          # politics + deadline bucket aim ~40%
POLI_PER_SERIES = 7
ECON_PER_SERIES = 5

# --- DROP rules (title + subtitle, case-insensitive) ---
CRYPTO_ASSET = re.compile(
    r"bitcoin|ethereum|\bbtc\b|\beth\b|\bdoge|solana|crypto|"
    r"\$[\d,]+|price target|reach \$|stock|share price|s&p|nasdaq|dow ",
    re.I,
)
# commodity / asset price-INDEX threshold questions (NEW in rebalanced build)
COMMODITY_INDEX = re.compile(
    r"truflation|manheim|used vehicle|used car|fao\b|food price|"
    r"jet fuel|kerosene|crude|brent|\bwti\b|barrel|gasoline|\bgas price\b|"
    r"natural gas|heating oil|propane|diesel|\bgold\b|silver|copper|"
    r"platinum|palladium|wheat|\bcorn\b|soybean|lumber|coffee|cocoa|sugar|"
    r"cotton|cattle|freddie mac|mortgage rate|\bhpi\b|case.?shiller",
    re.I,
)
RANDOM_NOVELTY = re.compile(
    r"temperature|\brain\b|snow|weather|hurricane|degrees|"
    r"rotten tomatoes|box office|grammy|oscar|emmy|movie|album|"
    r"taylor swift|kardashian|celebrity",
    re.I,
)
DEADLINE = re.compile(
    r"\b(by|before)\b.*\b20\d\d\b|"
    r"\b(pass|launch|sign|signed|confirm|arrest|strike|ipo|resign|"
    r"leave office|out as|step down|nominate|impeach|shutdown)\b",
    re.I,
)


def get(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.load(r)


def market_text(m):
    return f"{m.get('title') or ''} | {m.get('yes_sub_title') or ''}"


def keep(m):
    if m.get("market_type") != "binary":
        return False
    if m.get("result") not in ("yes", "no"):
        return False
    txt = market_text(m)
    if CRYPTO_ASSET.search(txt) or COMMODITY_INDEX.search(txt) or RANDOM_NOVELTY.search(txt):
        return False
    if len(txt.strip(" |")) < 8:
        return False
    return True


def record(m, series, cat):
    txt = market_text(m)
    is_deadline = bool(DEADLINE.search(txt))
    return {
        "ticker": m.get("ticker"),
        "event_ticker": m.get("event_ticker"),
        "series_ticker": series,
        "category": cat,
        "is_deadline": is_deadline,
        "question": (m.get("title") or "").strip(),
        "strike": (m.get("yes_sub_title") or "").strip(),
        "result": m.get("result"),
        "outcome": 1 if m.get("result") == "yes" else 0,
        "close_time": m.get("close_time"),
        "expiration_time": m.get("expiration_time"),
    }


def harvest(series_list, cat, per_series, want, kept, seen, stop_calls):
    calls = 0
    for series in series_list:
        if len([k for k in kept if k["category"] == cat]) >= want or calls >= stop_calls:
            break
        try:
            ms = get(f"{BASE}?limit=100&status=settled&series_ticker={series}").get("markets", [])
        except Exception as e:
            sys.stderr.write(f"skip {series}: {e}\n")
            continue
        calls += 1
        n = 0
        for m in ms:
            if n >= per_series:
                break
            if m.get("ticker") in seen:
                continue
            if keep(m):
                seen.add(m.get("ticker"))
                kept.append(record(m, series, cat))
                n += 1
        if calls % 50 == 0:
            sys.stderr.write(f"  {cat}: calls={calls} kept_total={len(kept)}\n")
        time.sleep(0.03)
    return calls


def main():
    smap = json.load(open("data/series_map.json"))
    econ = [t for t, i in smap.items() if i["category"] == "Economics"]
    poli = [t for t, i in smap.items() if i["category"] == "Politics"]
    kept, seen = [], set()

    sys.stderr.write("Phase A: Politics (deep)\n")
    harvest(poli, "Politics", POLI_PER_SERIES, TARGET_POLI, kept, seen, stop_calls=600)
    sys.stderr.write(f"  politics kept={len(kept)}\n")

    sys.stderr.write("Phase B: Economics (capped)\n")
    want_econ = TARGET_TOTAL - len(kept)
    harvest(econ, "Economics", ECON_PER_SERIES, want_econ, kept, seen, stop_calls=600)

    json.dump(kept, open("data/curated.json", "w"), indent=2)
    npol = sum(1 for k in kept if k["category"] == "Politics")
    ndl = sum(1 for k in kept if k["is_deadline"])
    bucket = sum(1 for k in kept if k["category"] == "Politics" or k["is_deadline"])
    sys.stderr.write(
        f"DONE total={len(kept)} politics={npol} deadline={ndl} "
        f"politics_or_deadline={bucket} ({bucket/len(kept):.0%})\n"
    )


if __name__ == "__main__":
    main()

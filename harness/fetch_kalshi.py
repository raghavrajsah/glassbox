"""Fetch settled binary markets from Kalshi's public v2 endpoint.

Market data is public — no auth/RSA keys needed. We page through the
settled-markets feed and keep the raw records; curation happens in a
separate step so the fetch stays domain-agnostic.
"""
import json
import sys
import time
import urllib.request

BASE = "https://api.elections.kalshi.com/trade-api/v2/markets"
TARGET_RAW = 6000  # over-fetch; most settled markets are sports/crypto we'll drop


def fetch(limit_pages=200):
    markets = []
    cursor = None
    for _ in range(limit_pages):
        url = f"{BASE}?limit=1000&status=settled"
        if cursor:
            url += f"&cursor={cursor}"
        with urllib.request.urlopen(url, timeout=30) as r:
            payload = json.load(r)
        batch = payload.get("markets", [])
        markets.extend(batch)
        cursor = payload.get("cursor")
        sys.stderr.write(f"fetched {len(markets)} (last batch {len(batch)})\n")
        if not cursor or not batch or len(markets) >= TARGET_RAW:
            break
        time.sleep(0.2)
    return markets


if __name__ == "__main__":
    ms = fetch()
    # keep only fields we need downstream
    slim = [
        {
            "ticker": m.get("ticker"),
            "event_ticker": m.get("event_ticker"),
            "title": m.get("title"),
            "yes_sub_title": m.get("yes_sub_title"),
            "result": m.get("result"),
            "close_time": m.get("close_time"),
            "expiration_time": m.get("expiration_time"),
            "rules_primary": m.get("rules_primary", "")[:400],
        }
        for m in ms
        if m.get("market_type") == "binary"
    ]
    with open("data/raw_markets.json", "w") as f:
        json.dump(slim, f, indent=2)
    sys.stderr.write(f"wrote {len(slim)} binary markets to data/raw_markets.json\n")

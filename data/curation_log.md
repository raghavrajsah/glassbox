# Curation Log — Kalshi settled binary markets (REBALANCED build)

**Source:** `https://api.elections.kalshi.com/trade-api/v2/markets` (public v2, no auth).
**Date pulled:** 2026-06-13. **Resolutions:** all 2026.

## Why per-series, not the global settled feed
The global `status=settled` feed is ordered by settlement recency and, for the
recent window, is ~100% sports/crypto parlays: **0 of 6000** most-recent settled
markets fell in an Economics or Politics series. So we enumerated all Economics +
Politics **series** (`/series?category=...`, 2576 series) and pulled settled binary
markets per series. Politics is traversed FIRST and deeper so the question mix is
not Economics-dominated.

## Curation rule (by TYPE, never by outcome)
We never look at the result when deciding to keep a market.

**KEEP**
- **Politics / Elections** — votes, bill passage, confirmations, leadership
  change, executive actions, shutdowns, strikes, protests, geopolitics.
- **Economics / macro statistics** — Fed decisions, CPI/PPI/PCE & inflation rate,
  jobs/unemployment, GDP, PMI, trade balance, recession calls (scheduled official
  data & policy outcomes).
- **Deadline / completion** — "will X pass / win / launch / IPO / be confirmed /
  happen **by/before <date>**".

**DROP**
- **Crypto & asset price targets** — "<asset> reach/above/below $X" (Bitcoin, ETH,
  stocks, indices). Keyword + `$` filter; crypto also excluded by category.
- **Commodity / asset price-INDEX threshold questions** *(tightened this build)* —
  Truflation indices, FAO food price, Manheim used-vehicle, jet fuel / kerosene /
  crude / Brent / WTI / gasoline / natural gas, gold / silver / copper, grains,
  Freddie Mac mortgage rate, Case-Shiller HPI. These are asset-price speculation,
  not policy/data outcomes. **Distinction kept explicit:** official macro
  statistics that happen to contain "index" (CPI = Consumer Price Index, PPI) are
  KEPT; tradeable commodity/asset price levels are DROPPED.
- **Sports** — excluded by restricting to Econ/Politics categories.
- **Random / novelty** — weather/temperature, rain, box office, awards, celebrity.

## Result (rebalanced)
- Kept: **260** markets (target ~200; over-collected for headroom).
- By category: **Economics 137, Politics 123**.
- Deadline/completion: **78**. **Politics-or-deadline bucket: 133 (51%)** —
  satisfies the "~40%, less Economics-heavy" goal.
- By outcome: global base rate **0.39 yes** (curated by type, not outcome).

## Honest leak-proof Brier floor (validated before building the loop)
Using only leak-proof structural features (category, deadline, threshold
direction, ladder rung position, trivial-bound) and outcomes only from TRAIN:
- gen-1 naive playbook: holdout **0.2387**, train 0.2429.
- in-sample feature model: train 0.211, holdout 0.221.
- **5-fold CV (honest out-of-sample estimate): ~0.224.**
These are genuine forecasting questions, near coin-flip individually; ~0.224 is
the real no-information ceiling. The loop targets this floor honestly and refuses
to leak to beat it (see RUBRIC.md §2/§3).

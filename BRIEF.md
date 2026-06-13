# BRIEF.md — The Self-Improving Forecaster

## Problem
Forecasting is a skill humans improve slowly, over years of feedback. Resolved
prediction markets are thousands of forecasting questions that already have
verified yes/no answers. Running autonomously, can you use them to improve your
own forecasting *doctrine* in a single afternoon — and prove the improvement
with a number, not a vibe?

## Who it's for
Anyone whose work is forecasting under uncertainty (analysts, researchers,
operators). But the real deliverable is the harness itself: a general engine
that turns any stream of verified outcomes into a written, improving skill.

## What we're building
An autonomous loop. You maintain a forecasting **playbook** — a markdown file of
your own rules and heuristics. Each generation:
1. You forecast a batch of already-resolved questions, using ONLY the question
   text and your own reasoning. **Do not do live web research for the historical
   backtest** — the skill being learned is reasoning discipline (base rates,
   decomposition, calibration, resisting narrative bias), not information
   retrieval. This also makes the run leak-proof by construction.
2. A separate verifier step scores you with Brier score against the real
   outcomes. Lower is better; 0.25 is the coin-flip baseline.
3. A diagnostician step reads your misses and finds ONE or TWO *systematic*
   errors (e.g. "no base rate cited in 70% of misses"), not per-question notes.
4. You rewrite the playbook to fix those errors. Every rule you add must cite
   the generation and the evidence that created it.
5. Next generation runs with the improved playbook on the same TRAIN set;
   improvement is measured on a held-out set the playbook never trained on.

Forecast output must be structured: `{probability, base_rate_used,
key_evidence, what_would_change_my_mind}`. This is what lets the diagnostician
find *systematic* bias instead of vibes.

## Data
Pull ~150 resolved BINARY markets from a public API (Manifold Markets is
easiest — public, no auth; Kalshi settled-markets endpoint is a fine
alternative). Prefer markets that resolved in 2026. Do a 70/30 train/holdout
split immediately and never train on the holdout. Avoid sports questions.

## Generality requirement (do not skip)
Nothing in the orchestration, verifier, or diagnostician may assume prediction
markets specifically. The domain must enter ONLY through the dataset file and
the scoring function. Later today you may be handed a second dataset from an
unrelated domain; the harness must run on it unmodified, with a fresh playbook.
Design for that from generation one.

## What done looks like
Everything in RUBRIC.md, checked by the verifier step before you stop. Holdout
improvement is the only improvement that counts.

## Spirit
I will not steer you. Build the harness, run the loop, catch your own failures,
and don't stop until RUBRIC.md passes. Ask me only if you're blocked on access
or credentials. The playbook you write is the product.

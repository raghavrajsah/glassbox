# Glassbox — The Self-Improving Forecaster

An autonomous loop that turns a stream of **already-resolved** prediction-market
questions into an improving forecasting **doctrine** — and proves the improvement
with a Brier number on a held-out set, not a vibe.

The doctrine (the [`playbook`](playbook/)) is the product. Each generation the
harness forecasts a batch of resolved questions using **only the question text and
its own reasoning** (no web research — leak-proof by construction), scores itself,
diagnoses one or two *systematic* biases from its miss distribution, and rewrites
the playbook to fix them. Improvement is measured on a holdout the playbook never
trains on.

## The loop (three subagents)

Defined as the repeatable `/workflows` command
[`self-improve-forecaster`](.claude/workflows/self-improve-forecaster.js):

1. **Forecaster** — reads the current playbook + a batch of questions (text +
   leak-proof structural fields only) and emits structured forecasts
   `{probability, base_rate_used, key_evidence, what_would_change_my_mind}`.
2. **Verifier** *(isolated context)* — receives only `(type, probability, outcome)`,
   never the playbook or question text. Scores Brier and reports the calibration
   table. Brier is also computed deterministically in the orchestrator (authoritative).
3. **Diagnostician** — reads the train miss distribution and fixes the single
   biggest systematic bias by rewriting the playbook for the next generation. Every
   rule cites the generation and the calibration evidence that created it.

```
forecast ─▶ score (Brier) ─▶ verify (isolated) ─▶ diagnose ─▶ rewrite playbook ─▶ (next gen)
```

## Generality

Nothing in the orchestration, verifier, or diagnostician assumes prediction
markets. The domain enters **only** through the dataset file (`data/dataset.json`,
including precomputed leak-proof structural features) and the Brier scoring
function. The same `/workflows` command runs unmodified on any
`{question, outcome}` dataset with a fresh playbook (rubric stretch #8).

## Data

- Source: Kalshi public v2 endpoint (`api.elections.kalshi.com`, no auth).
- Curated **by type, not outcome**: politics, macro-economics, deadline/completion;
  drops crypto/asset price targets, commodity price-index thresholds, sports, and
  novelty. See [`data/curation_log.md`](data/curation_log.md).
- 260 settled binary markets, all 2026 resolutions, 51% politics/deadline.
- 70/30 stratified train/holdout split; the holdout is never trained on.

## Honesty note on the target

The honest leak-proof out-of-sample Brier floor on this curated set is **~0.224**
(5-fold CV) — these are genuine, near-coin-flip forecasting questions, and you
cannot conjure information that isn't there. The loop approaches that floor
honestly and **refuses to leak** (no live research, no peeking at outcomes) to push
below it. See `RUBRIC.md` §2.

## Run it

```bash
python3 harness/fetch_curated.py   # pull + curate (writes data/curated.json)
python3 harness/enrich.py          # add leak-proof structural features
python3 harness/split.py           # 70/30 stratified split
python3 harness/build_run.py       # embed data into a runnable workflow copy
# then invoke the /workflows command self-improve-forecaster (or harness/run.workflow.js)
python3 harness/write_artifacts.py # write scores, snapshots, leakage proof, site bundle
```

The live site (`site/`) shows the Brier curve, the gen-1→final playbook diff, the
diagnostician moments, and the zero-research-calls proof.

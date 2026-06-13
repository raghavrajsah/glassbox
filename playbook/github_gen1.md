# Forecasting Playbook — Generation 1 (naive seed) — GitHub issue closure

> DOMAIN 2: "Will this GitHub issue be closed within 30 days of being opened?"
> This is a FRESH gen-1 playbook for a domain the engine has never seen. The
> orchestration, verifier, and diagnostician are UNCHANGED from domain 1 — only
> this seed doctrine and the dataset differ. Rules are applied to the question
> TEXT plus the dataset's leak-proof at-open structural fields (`category` = repo,
> `ladder_pos_bin` = body-length bucket, `is_deadline`, `direction`, `ladder_rung`,
> `trivial_bound`). Zero web research; later generations only add calibration
> learned from the TRAIN miss distribution, each rule citing its generation.

## Rules (human-readable)

### R1 — Coin-flip prior per repository
Classify each issue by its `category` (the repo it belongs to) and predict
**p = 0.50** for every repo.
*Origin: gen-1 seed. With no doctrine, the coin flip is the honest baseline
(Brier 0.25). Repos are kept as separate types so the diagnostician can later
learn each repo's distinct 30-day closure base rate from TRAIN.*

### R2 — Default
Anything not matching a known repo: predict **p = 0.50**.
*Origin: gen-1 seed.*

## Machine-readable contract
The forecaster classifies each question into the FIRST matching type in
`classification_order`, then assigns `probability`. If the type has
`probability_by_posbin` (a 5-element array) it uses `probability_by_posbin[ladder_pos_bin]`;
else if it has `probability_by_rung` it uses `probability_by_rung[ladder_rung]`.
Output per question:
`{id, type, probability, base_rate_used, key_evidence, what_would_change_my_mind}`.

```json
{
  "generation": 1,
  "default_probability": 0.50,
  "classification_order": ["kubernetes", "react", "rust", "default"],
  "types": {
    "kubernetes": {
      "definition": "category == 'kubernetes'.",
      "probability": 0.50,
      "origin_gen": 1,
      "evidence": "naive seed prior"
    },
    "react": {
      "definition": "category == 'react'.",
      "probability": 0.50,
      "origin_gen": 1,
      "evidence": "naive seed prior"
    },
    "rust": {
      "definition": "category == 'rust'.",
      "probability": 0.50,
      "origin_gen": 1,
      "evidence": "naive seed prior"
    },
    "default": {
      "definition": "catch-all: category is not a known repo.",
      "probability": 0.50,
      "origin_gen": 1,
      "evidence": "naive seed prior"
    }
  }
}
```

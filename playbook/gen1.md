# Forecasting Playbook — Generation 1 (naive starting doctrine)

> Starting point only. These rules encode no learned base rates and no
> calibration — just naive priors. They are applied to the question TEXT plus the
> dataset's leak-proof structural fields (`direction`, `ladder_rung`,
> `is_deadline`, `trivial_bound`). The backtest does **zero** web research; the
> only thing later generations add is calibration learned from the TRAIN miss
> distribution. Every rule a later generation adds must cite its generation and
> the evidence that created it.

## Rules (human-readable)

### R1 — Default to maximum uncertainty
If no typed rule fires, predict **p = 0.50**.
*Origin: gen-1 seed. With no doctrine, the coin-flip prior is the honest baseline.*

### R2 — Deadline / completion questions lean NO
If `is_deadline` (the question asks whether a discrete event happens **by/before**
a date — pass, launch, sign, confirm, strike, arrest, resign, IPO), predict
**p = 0.30**.
*Origin: gen-1 seed (naive prior, not data): specific things usually don't happen
by a specific near-term deadline.*

### R3 — Threshold questions skew by direction
If `direction == above` ("above / at least / more than X"), predict **p = 0.40**.
If `direction == below` ("below / under / at most X"), predict **p = 0.60**.
*Origin: gen-1 seed (naive prior, not data): high bars usually aren't cleared.*

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
  "classification_order": ["deadline_completion", "threshold_above", "threshold_below", "default"],
  "types": {
    "deadline_completion": {
      "definition": "is_deadline is true: a discrete event resolving by/before a date.",
      "probability": 0.30,
      "origin_gen": 1,
      "evidence": "naive seed prior"
    },
    "threshold_above": {
      "definition": "direction == 'above' and not a deadline.",
      "probability": 0.40,
      "origin_gen": 1,
      "evidence": "naive seed prior"
    },
    "threshold_below": {
      "definition": "direction == 'below' and not a deadline.",
      "probability": 0.60,
      "origin_gen": 1,
      "evidence": "naive seed prior"
    },
    "default": {
      "definition": "catch-all: no other type matched (e.g. direction == 'none', not a deadline).",
      "probability": 0.50,
      "origin_gen": 1,
      "evidence": "naive seed prior"
    }
  }
}
```

# Forecasting Playbook — Generation 2 (calibrated to TRAIN miss distribution)

> Built on the gen-1 seed by calibrating ONLY to the TRAIN miss distribution.
> No web research, no outside knowledge. Rules are applied to the question TEXT
> plus the dataset's leak-proof structural fields (`direction`, `ladder_rung`,
> `is_deadline`, `trivial_bound`). Every change this generation cites its
> generation and the specific calibration evidence that created it.

## Rules (human-readable)

### R1 — Default to base-rate uncertainty (changed in gen 2)
If no typed rule fires, predict **p = 0.43**.
*Origin: gen-1 seed (was p = 0.50). Changed gen 2: the `default` type predicted
mean 0.50 but TRAIN resolved 0.419 over n=31 (calibration_gap +0.081). Moved toward
the empirical base rate with ~10% shrinkage toward 0.50 (0.419 + 0.10*(0.50-0.419)
= 0.427 -> 0.43). Small n and degenerate per-bin empirics (counts of 1) mean no
posbin split is justified; a single shrunk number is the safe move.*

### R2 — Deadline / completion questions (changed in gen 2)
If `is_deadline` (the question asks whether a discrete event happens **by/before**
a date — pass, launch, sign, confirm, strike, arrest, resign, IPO), predict
**p = 0.43**.
*Origin: gen-1 seed (was p = 0.30, a naive "specific things rarely happen by a
deadline" prior). Changed gen 2: this was the single biggest systematic bias —
deadline_completion predicted 0.30 but TRAIN resolved 0.42 over n=50
(calibration_gap -0.12). Raised toward empirical with ~10% shrinkage toward 0.50
(0.42 + 0.10*(0.50-0.42) = 0.428 -> 0.43). Per-posbin empirics are noisy and
non-monotone over tiny bins (n=[15,2,17,3,13]), so no posbin split this generation;
the flat shrunk rate is better supported.*

### R3a — Threshold "above" questions skew by ladder position (changed in gen 2)
If `direction == above` ("above / at least / more than X") and not a deadline,
use **probability_by_posbin[ladder_pos_bin]** =
**[0.679, 0.538, 0.397, 0.256, 0.115]** (lowest strike bin -> highest strike bin).
*Origin: gen-1 seed (was flat p = 0.40). Changed gen 2: the flat 0.40 was close on
the mean (TRAIN resolved 0.366, n=101, gap +0.034) but masked large within-type
dispersion: low strikes resolved ~0.737 (under-predicted) and high strikes ~0.143
(over-predicted). Replaced the flat probability with the isotonic non-increasing
`monotone_candidate` from by_type_posbin, which captures "higher strike in the
ladder -> less likely YES" while smoothing noisy individual bins (n=[19,13,24,17,28])
so it generalises to holdout rather than overfitting raw per-bin empirics.*

### R3b — Threshold "below" questions (unchanged from gen 1)
If `direction == below` ("below / under / at most X") and not a deadline, predict
**p = 0.60**.
*Origin: gen-1 seed. Unchanged gen 2: TRAIN provided no calibration data for this
type (not present in the by_type distribution), so there is no evidence to recalibrate
it. Left at the seed prior.*

## Machine-readable contract
The forecaster classifies each question into the FIRST matching type in
`classification_order`, then assigns `probability`. If the type has
`probability_by_posbin` (a 5-element array) it uses `probability_by_posbin[ladder_pos_bin]`;
else if it has `probability_by_rung` it uses `probability_by_rung[ladder_rung]`.
Output per question:
`{id, type, probability, base_rate_used, key_evidence, what_would_change_my_mind}`.

```json
{
  "generation": 2,
  "default_probability": 0.43,
  "classification_order": ["deadline_completion", "threshold_above", "threshold_below", "default"],
  "types": {
    "deadline_completion": {
      "definition": "is_deadline is true: a discrete event resolving by/before a date.",
      "probability": 0.43,
      "origin_gen": 1,
      "changed_gen": 2,
      "evidence": "gen 2: deadline_completion predicted 0.30 but TRAIN resolves 0.42 over n=50 (gap -0.12, biggest single bias) -> raised to 0.43 (empirical 0.42 shrunk ~10% toward 0.50). Per-posbin empirics noisy/non-monotone over tiny bins, so kept flat."
    },
    "threshold_above": {
      "definition": "direction == 'above' and not a deadline.",
      "probability_by_posbin": [0.679, 0.538, 0.397, 0.256, 0.115],
      "origin_gen": 1,
      "changed_gen": 2,
      "evidence": "gen 2: threshold_above flat 0.40 (TRAIN resolve 0.366, n=101) masked strong strike-position dispersion (low strikes ~0.737, high strikes ~0.143). Replaced flat probability with isotonic monotone_candidate by ladder_pos_bin [0.679,0.538,0.397,0.256,0.115] (n=[19,13,24,17,28]) to capture higher-strike -> lower-YES without overfitting noisy bins."
    },
    "threshold_below": {
      "definition": "direction == 'below' and not a deadline.",
      "probability": 0.60,
      "origin_gen": 1,
      "evidence": "gen-1 seed prior. Unchanged gen 2: no TRAIN calibration data exists for this type, so no evidence to recalibrate."
    },
    "default": {
      "definition": "catch-all: no other type matched (e.g. direction == 'none', not a deadline).",
      "probability": 0.43,
      "origin_gen": 1,
      "changed_gen": 2,
      "evidence": "gen 2: default predicted 0.50 but TRAIN resolves 0.419 over n=31 (gap +0.081) -> lowered to 0.43 (empirical 0.419 shrunk ~10% toward 0.50). Degenerate per-bin empirics (counts of 1) so no posbin split."
    }
  }
}
```
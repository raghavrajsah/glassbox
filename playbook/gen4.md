# Forecasting Playbook — Generation 4 (calibrated to TRAIN miss distribution)

Built on gen-3 by re-checking ONLY the TRAIN miss distribution. No web research, no outside knowledge. Rules apply to question TEXT plus leak-proof structural fields (direction, ladder_rung, ladder_pos_bin, is_deadline, trivial_bound). Every change cites its generation and the calibration evidence that created it.

What gen 4 changed: nothing substantive — gen 4 is a deliberate, evidence-driven NO-OP. By gen 3 all three populated types are well-calibrated on the mean (default gap +0.011 n=31; deadline_completion gap 0.0 n=50; threshold_above gap 0.0 n=101), AND the two types whose within-type dispersion the TRAIN data actually supports (threshold_above, deadline_completion) already carry their generalizable isotonic monotone_candidate posbin arrays (applied in gen 2 and gen 3 respectively). The remaining candidates have no usable evidence: default's posbin monotone_candidate is null (degenerate bins, counts of 1), and threshold_below has zero TRAIN rows. Every allowed move has already been applied or is unsupported, so forcing a further change would overfit noise or invent unevidenced rules — both of which violate calibration discipline and would raise holdout Brier. Gen 4 keeps all probabilities identical and records, per type, why no change is made.

Rules (human-readable):

R1 — Default (unchanged from gen 2). If no typed rule fires, predict p = 0.43. Origin gen-1 seed (was 0.50). Changed gen 2: default predicted 0.50 but TRAIN resolved 0.419 over n=31 (gap +0.081) to 0.43 (0.419 shrunk ~10% toward 0.50). Unchanged gen 3 and gen 4: gen 4 TRAIN mean_predicted 0.43 vs empirical 0.419 (gap +0.011, n=31) is within sampling noise at this n and already reflects the prescribed ~10% shrinkage toward 0.5, so no mean-shift; per-bin empirics remain degenerate ([0,1,0.55,0,0.25] over n=[5,1,20,1,4]) with null monotone_candidate, so still no posbin split.

R2 — Deadline/completion skews by ladder position (changed in gen 3, unchanged gen 4). If is_deadline (discrete event happens by/before a date: pass, launch, sign, confirm, strike, arrest, resign, IPO), use probability_by_posbin[ladder_pos_bin] = [0.515, 0.466, 0.417, 0.368, 0.319] (lowest to highest strike bin). Origin gen-1 seed (was 0.30). Changed gen 2: predicted 0.30 but TRAIN resolved 0.42 over n=50 (gap -0.12) to flat 0.43. Changed gen 3: flat 0.43 well-calibrated on mean (gap +0.01) but masked ladder-position dispersion (by_type_posbin empirical [0.533,0.5,0.412,0,0.385], n=[15,2,17,3,13]); replaced flat probability with isotonic non-increasing monotone_candidate [0.515,0.466,0.417,0.368,0.319]. Unchanged gen 4: TRAIN by_type mean gap 0.0 (n=50); the count-weighted mean of the posbin array reproduces the calibrated type mean 0.42 exactly, and the array IS the isotonic monotone_candidate, so replacing it with the raw empirics (which include a degenerate 0.0 at bin 3, n=3) would overfit — no change.

R3a — Threshold above skews by ladder position (changed in gen 2, unchanged gen 4). If direction == above and not a deadline, use probability_by_posbin[ladder_pos_bin] = [0.679, 0.538, 0.397, 0.256, 0.115] (lowest to highest strike bin). Origin gen-1 seed (was flat 0.40). Changed gen 2: flat 0.40 (TRAIN resolve 0.366, n=101) masked strike dispersion (low ~0.737, high ~0.143) to isotonic monotone_candidate [0.679,0.538,0.397,0.256,0.115] (n=[19,13,24,17,28]). Unchanged gen 3 and gen 4: gen 4 TRAIN mean_predicted 0.366 vs empirical 0.366 (gap 0.0, n=101); the count-weighted posbin mean reproduces 0.366 exactly and the array is already the generalizable monotone_candidate, so replacing it with raw per-bin empirics [0.737,0.385,0.458,0.176,0.143] (non-monotone middle bins) would overfit — no change.

R3b — Threshold below (unchanged from gen 1). If direction == below and not a deadline, predict p = 0.60. Origin gen-1 seed. Unchanged gen 2, gen 3, and gen 4: still no TRAIN calibration data for this type (absent from by_type, n=0), so no evidence to recalibrate without outside knowledge.

Machine-readable contract: Classify each question into the FIRST matching type in classification_order, then assign probability. If the type has probability_by_posbin (5-element array) use probability_by_posbin[ladder_pos_bin]; else if probability_by_rung use probability_by_rung[ladder_rung]; else use scalar probability. Output per question: {id, type, probability, base_rate_used, key_evidence, what_would_change_my_mind}.

JSON contract (generation 4):

```json
{
  "generation": 4,
  "default_probability": 0.43,
  "classification_order": ["deadline_completion", "threshold_above", "threshold_below", "default"],
  "types": {
    "deadline_completion": {
      "definition": "is_deadline is true: a discrete event resolving by/before a date.",
      "probability_by_posbin": [0.515, 0.466, 0.417, 0.368, 0.319],
      "origin_gen": 1,
      "changed_gen": 3,
      "evidence": "gen 2: predicted 0.30 but TRAIN resolves 0.42 over n=50 (gap -0.12) to flat 0.43. gen 3: flat 0.43 calibrated on mean (gap +0.01) but masked ladder-position dispersion (by_type_posbin empirical [0.533,0.5,0.412,0,0.385], n=[15,2,17,3,13]) to isotonic monotone_candidate [0.515,0.466,0.417,0.368,0.319] (count-weighted mean 0.42 preserves calibrated mean; smooths noisy n=2/n=3 bins). gen 4 unchanged: by_type gap 0.0 (n=50); posbin already equals the generalizable monotone_candidate, raw empirics include a degenerate 0.0 at bin 3 (n=3) so replacing would overfit -> no change."
    },
    "threshold_above": {
      "definition": "direction == above and not a deadline.",
      "probability_by_posbin": [0.679, 0.538, 0.397, 0.256, 0.115],
      "origin_gen": 1,
      "changed_gen": 2,
      "evidence": "gen 2: flat 0.40 (TRAIN resolve 0.366, n=101) masked strike dispersion (low ~0.737, high ~0.143) to isotonic monotone_candidate [0.679,0.538,0.397,0.256,0.115] (n=[19,13,24,17,28]). gen 3 unchanged: gap 0.0 (n=101). gen 4 unchanged: gap 0.0 (n=101); count-weighted posbin mean reproduces 0.366, array already equals generalizable monotone_candidate, raw per-bin empirics [0.737,0.385,0.458,0.176,0.143] are non-monotone in the middle so replacing would overfit -> no change."
    },
    "threshold_below": {
      "definition": "direction == below and not a deadline.",
      "probability": 0.60,
      "origin_gen": 1,
      "evidence": "gen-1 seed prior. Unchanged gen 2, gen 3, gen 4: no TRAIN calibration data (absent from by_type, n=0), so no evidence to recalibrate without outside knowledge."
    },
    "default": {
      "definition": "catch-all: no other type matched.",
      "probability": 0.43,
      "origin_gen": 1,
      "changed_gen": 2,
      "evidence": "gen 2: predicted 0.50 but TRAIN resolves 0.419 over n=31 (gap +0.081) to 0.43 (~10% shrink toward 0.5). gen 3 unchanged: gap +0.011 (n=31). gen 4 unchanged: gap +0.011 (n=31) is within sampling noise and already reflects prescribed shrinkage; per-bin empirics degenerate ([0,1,0.55,0,0.25] over n=[5,1,20,1,4]), monotone_candidate null, so no posbin split and no mean-shift -> no change."
    }
  }
}
```
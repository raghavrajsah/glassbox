PLAYBOOK GENERATION 4 - GitHub issue closure

Q: Will this GitHub issue be closed within 30 days? Gen 4 is a disciplined no-op: against the current TRAIN calibration there is NO remaining systematic bias to fix. All three observed types are well-calibrated in aggregate (rust gap 0.014, react gap 0.0, kubernetes gap 0.0) and both valid monotone posbin curves are already in place (react gen-2, kubernetes gen-3). rust's monotone_candidate is null so no posbin move is valid for it. The remaining allowed moves (shrink toward empirical, swap in a monotone_candidate) are all exhausted; shrinking a calibrated type further would push it off its empirical base rate and raise Brier. No web research. Each rule cites the generation it was created or changed in and the TRAIN evidence.

RULES

R1 Coin-flip prior per repository (gen-1 seed, retained mechanism). Classify by category (repo); assign a probability per repo. Gen-1 used 0.50; gens 2-3 calibrated biased repos against TRAIN; gen 4 makes no further per-repo change because every observed repo is already well-calibrated. Origin: gen-1 seed; mechanism unchanged. Gen 4: retained, no TRAIN evidence for a new repo-level move.

R2 react monotone posbin curve (gen-2 retained). category == react uses probability_by_posbin[ladder_pos_bin] = [0.292, 0.251, 0.209, 0.168, 0.127]. Origin: gen 2. react predicted 0.50 but TRAIN resolved 0.231 over n=52 (gap 0.269, biggest at the time); used the isotonic monotone_candidate. Gen 4: mean_predicted 0.231 vs empirical_resolve 0.231 over n=52 (gap 0.0), perfectly calibrated, retained unchanged.

R3 rust shrink flat (gen-2 retained). category == rust predicts 0.376. Origin: gen 2. rust predicted 0.50 but TRAIN resolved 0.362 over n=47 (gap 0.138); applied 0.362 + 0.10*(0.50 - 0.362) = 0.376. Gen 4: mean_predicted 0.376 vs empirical_resolve 0.362 over n=47 (gap 0.014), well-calibrated; monotone_candidate is null (raw bins [0.333, 0.714, 0, 0.625, 0.417] non-monotone) so no posbin move is valid, retained unchanged. Not shrunk further because the 0.014 gap is within shrinkage noise and moving off the empirical base rate would raise Brier.

R4 kubernetes monotone posbin curve (gen-3 retained). category == kubernetes uses probability_by_posbin[ladder_pos_bin] = [0.567, 0.53, 0.492, 0.454, 0.417]. Origin: gen 3. kubernetes flat 0.50 was well-calibrated in aggregate but the flat number masked a monotone intra-ladder slope (TRAIN posbin empirics [0.538, 0.571, 0.4, 0.583, 0.333] over n=[13, 7, 5, 12, 12]); used the isotonic monotone_candidate to cut within-bin Brier without overfitting noisy bins. Gen 4: mean_predicted 0.49 vs empirical_resolve 0.49 over n=49 (gap 0.0); the gen-3 posbin curve is the only valid monotone candidate and is already applied, retained unchanged.

R5 Default (gen-1 retained). Unknown repo predicts 0.50. Origin: gen-1 seed; no TRAIN evidence, coin-flip kept. Gen 4: retained, no trivial_bound or new-category evidence in TRAIN to justify a new type.

CONTRACT
Classify into the FIRST matching type in classification_order; if probability_by_posbin is present use it indexed by ladder_pos_bin, else use the flat probability. Output: id, type, probability, base_rate_used, key_evidence, what_would_change_my_mind.

JSON contract (generation 4):
{
  "generation": 4,
  "default_probability": 0.50,
  "classification_order": ["kubernetes", "react", "rust", "default"],
  "types": {
    "kubernetes": {"definition": "category=='kubernetes'.", "probability_by_posbin": [0.567, 0.53, 0.492, 0.454, 0.417], "origin_gen": 3, "evidence": "gen 3: flat 0.50 well-calibrated in aggregate (resolve 0.49 n=49 gap 0.0) but masked monotone slope; posbin empirics [0.538,0.571,0.4,0.583,0.333] n=[13,7,5,12,12] -> isotonic monotone_candidate to cut within-bin Brier. gen 4: gap 0.0, only valid monotone candidate already applied, retained"},
    "react": {"definition": "category=='react'.", "probability_by_posbin": [0.292, 0.251, 0.209, 0.168, 0.127], "origin_gen": 2, "evidence": "gen 2: 0.50 but resolved 0.231 n=52 gap 0.269 -> isotonic monotone_candidate; gen 4: gap 0.0, retained"},
    "rust": {"definition": "category=='rust'.", "probability": 0.376, "origin_gen": 2, "evidence": "gen 2: 0.50 but resolved 0.362 n=47 gap 0.138 monotone_candidate null -> 0.376; gen 4: gap 0.014 well-calibrated, monotone_candidate still null (raw bins [0.333,0.714,0,0.625,0.417] non-monotone), not over-shrunk, retained"},
    "default": {"definition": "catch-all.", "probability": 0.50, "origin_gen": 1, "evidence": "gen-1 retained: no evidence, coin-flip kept; gen 4: no new-type evidence in TRAIN, retained"}
  }
}
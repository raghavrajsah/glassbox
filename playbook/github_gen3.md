# Forecasting Playbook Generation 3 GitHub issue closure

> Q: "Will this GitHub issue be closed within 30 days?" Gen 3 retains gen-2's well-calibrated type means and fixes the single biggest remaining systematic bias: kubernetes used a flat 0.50 that ignored its monotone intra-ladder slope. No web research. Each changed rule cites generation and TRAIN evidence.

## Rules

### R1 Coin-flip prior per repository (gen-1 seed, retained mechanism)
Classify by category (repo); assign probability per repo. Gen-1 used 0.50; gens 2-3 calibrate biased repos against TRAIN. *Origin: gen-1 seed; mechanism unchanged.*

### R2 react monotone posbin curve (gen-2 retained)
category == 'react' uses probability_by_posbin[ladder_pos_bin] = [0.292,0.251,0.209,0.168,0.127]. *Origin: gen 2. react predicted 0.50 but TRAIN resolved 0.231 over n=52 (gap 0.269, biggest at the time); used isotonic monotone_candidate. Gen 3: now mean_predicted 0.231 vs empirical_resolve 0.231 over n=52 (gap 0.0), perfectly calibrated — retained unchanged.*

### R3 rust shrink flat (gen-2 retained)
category == 'rust' predicts 0.376. *Origin: gen 2. rust predicted 0.50 but TRAIN resolved 0.362 over n=47 (gap 0.138); applied 0.362+0.10*(0.50-0.362)=0.376. Gen 3: now mean_predicted 0.376 vs empirical_resolve 0.362 over n=47 (gap 0.014), well-calibrated; monotone_candidate is null (raw bins [0.333,0.714,0,0.625,0.417] non-monotone) so no posbin move is valid — retained unchanged.*

### R4 kubernetes monotone posbin curve (CHANGED gen 3)
category == 'kubernetes' uses probability_by_posbin[ladder_pos_bin] = [0.567,0.53,0.492,0.454,0.417]. *Origin: gen 3. kubernetes flat 0.50 was well-calibrated in aggregate (predicted 0.50 vs resolve 0.49 over n=49, gap 0.01) but the flat number masked a monotone intra-ladder slope: TRAIN posbin empirics [0.538,0.571,0.4,0.583,0.333] over n=[13,7,5,12,12] show higher strikes resolve YES less often. Raw bins are noisy (bin2 n=5 dips to 0.4, bin4 falls to 0.333), so use the isotonic monotone_candidate [0.567,0.53,0.492,0.454,0.417] which generalises to holdout instead of overfitting. Aggregate of this curve stays ~0.49, preserving the good type-level calibration while reducing within-bin Brier.*

### R5 Default (gen-1 retained)
Unknown repo predicts 0.50. *Origin: gen-1 seed; no TRAIN evidence, coin-flip kept.*

## Contract
Classify into FIRST matching type in classification_order; if probability_by_posbin present use it indexed by ladder_pos_bin, else flat probability. Output: {id, type, probability, base_rate_used, key_evidence, what_would_change_my_mind}.

```json
{
  "generation": 3,
  "default_probability": 0.50,
  "classification_order": ["kubernetes","react","rust","default"],
  "types": {
    "kubernetes": {"definition":"category=='kubernetes'.","probability_by_posbin":[0.567,0.53,0.492,0.454,0.417],"origin_gen":3,"evidence":"gen 3: flat 0.50 well-calibrated in aggregate (resolve 0.49 n=49 gap 0.01) but masked monotone slope; posbin empirics [0.538,0.571,0.4,0.583,0.333] n=[13,7,5,12,12] -> isotonic monotone_candidate to cut within-bin Brier"},
    "react": {"definition":"category=='react'.","probability_by_posbin":[0.292,0.251,0.209,0.168,0.127],"origin_gen":2,"evidence":"gen 2: 0.50 but resolved 0.231 n=52 gap 0.269 -> isotonic monotone_candidate; gen 3: now gap 0.0, retained"},
    "rust": {"definition":"category=='rust'.","probability":0.376,"origin_gen":2,"evidence":"gen 2: 0.50 but resolved 0.362 n=47 gap 0.138 monotone null -> 0.376; gen 3: now gap 0.014 well-calibrated, retained"},
    "default": {"definition":"catch-all.","probability":0.50,"origin_gen":1,"evidence":"gen-1 retained: no evidence, coin-flip kept"}
  }
}
```
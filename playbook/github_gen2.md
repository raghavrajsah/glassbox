# Forecasting Playbook Generation 2 GitHub issue closure

> Q: "Will this GitHub issue be closed within 30 days?" Gen 2 calibrates the gen-1 coin-flip seed against TRAIN only. No web research. Each changed rule cites generation and TRAIN evidence.

## Rules

### R1 Coin-flip prior per repository (gen-1 seed, retained mechanism)
Classify by category (repo); assign probability per repo. Gen-1 used 0.50; gen 2 calibrates biased repos. *Origin: gen-1 seed; mechanism unchanged.*

### R2 react monotone posbin curve (CHANGED gen 2)
category == 'react' uses probability_by_posbin[ladder_pos_bin] = [0.292,0.251,0.209,0.168,0.127]. *Origin: gen 2. react predicted 0.50 but TRAIN resolves 0.231 over n=52 (gap 0.269, biggest). Raw bins noisy (bin4 n=3) so use isotonic monotone_candidate for holdout.*

### R3 rust shrink flat (CHANGED gen 2)
category == 'rust' predicts 0.376. *Origin: gen 2. rust predicted 0.50 but TRAIN resolves 0.362 over n=47 (gap 0.138). monotone null, so 0.362+0.10*(0.50-0.362)=0.376.*

### R4 kubernetes unchanged (gen-1 retained)
category == 'kubernetes' predicts 0.50. *Origin: gen-1 seed. Resolves 0.49 over n=49 (gap 0.01), well-calibrated, unchanged.*

### R5 Default (gen-1 retained)
Unknown repo predicts 0.50. *Origin: gen-1 seed; no TRAIN evidence, coin-flip kept.*

## Contract
Classify into FIRST matching type in classification_order; if probability_by_posbin present use it indexed by ladder_pos_bin, else flat probability. Output: {id, type, probability, base_rate_used, key_evidence, what_would_change_my_mind}.

    {
      "generation": 2,
      "default_probability": 0.50,
      "classification_order": ["kubernetes","react","rust","default"],
      "types": {
        "kubernetes": {"definition":"category=='kubernetes'.","probability":0.50,"origin_gen":1,"evidence":"gen-1 retained: resolves 0.49 n=49 gap 0.01 well-calibrated"},
        "react": {"definition":"category=='react'.","probability_by_posbin":[0.292,0.251,0.209,0.168,0.127],"origin_gen":2,"evidence":"gen 2: 0.50 but resolves 0.231 n=52 gap 0.269 -> isotonic monotone_candidate"},
        "rust": {"definition":"category=='rust'.","probability":0.376,"origin_gen":2,"evidence":"gen 2: 0.50 but resolves 0.362 n=47 gap 0.138 monotone null -> 0.376"},
        "default": {"definition":"catch-all.","probability":0.50,"origin_gen":1,"evidence":"gen-1 retained: no evidence, coin-flip kept"}
      }
    }
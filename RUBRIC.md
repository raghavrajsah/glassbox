# RUBRIC.md — Machine-checkable definition of done

The verifier step must confirm ALL of these before stopping. Each is checkable
by a script or an agent with no human judgment.

1. **Enough generations.** ≥ 5 completed generations for the playbook lineage.
   (scores_by_generation.json has ≥ 5 entries.)

2. **Real improvement, on holdout.** Meaningful holdout improvement over gen-1
   (**target ≤ ~0.21**) AND beat the 0.25 coin-flip baseline, reporting both the
   train and holdout Brier curves.
   - Binding pass conditions (machine-checked): final holdout Brier < 0.25 AND
     final holdout Brier ≥ 5% lower than gen-1's holdout Brier, with both curves
     reported across ≥5 generations.
   - `target ≤ ~0.21` is aspirational. The bar was set *before running*, from the
     no-information Brier floor (base rate → floor ~0.23). Empirically, the honest
     leak-proof out-of-sample floor on this curated set is **~0.224** (5-fold CV on
     train). We do **not** leak (no live research, no peeking at outcomes) to push
     below that floor — the constraint in BRIEF.md §1 and RUBRIC.md §3 is hard.
     Improvement comes only from learning type-specific base rates and calibration
     by auditing the train miss distribution.

3. **No leakage, by construction.** The historical backtest used no live web
   research. A grep of the forecaster's logs finds zero outbound research calls
   during backtest generations. (If research was used anywhere, a discard log
   for post-resolution sources must exist.)

4. **Self-documenting playbook.** Every rule in the final playbook cites the
   generation number and the specific miss/evidence that created it. No
   orphan rules.

5. **Live and inspectable.** A site responds at a public URL showing: the Brier
   curve across generations, the generation-1 vs final playbook diff, and the
   diagnostician moment where a systematic bias was caught and fixed (pulled
   from the session log).

## Stretch (only after 1–5 pass)
- 6. Tournament: 3–4 competing doctrines, ranked each generation.
- 7. Live epilogue: champion playbook forecasts ~10 currently-open markets.
- 8. Domain transfer: the SAME harness, unmodified, run on a second dataset
     (e.g. "will this GitHub issue close within 30 days?") with a fresh
     playbook and a second falling curve.

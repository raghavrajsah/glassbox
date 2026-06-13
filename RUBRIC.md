# RUBRIC.md — Machine-checkable definition of done

The verifier step must confirm ALL of these before stopping. Each is checkable
by a script or an agent with no human judgment.

1. **Enough generations.** ≥ 5 completed generations for the playbook lineage.
   (scores_by_generation.json has ≥ 5 entries.)

2. **Real improvement, on holdout.** The final generation's Brier score on the
   HOLDOUT set is:
   - ≥ 15% lower than generation 1's holdout Brier, AND
   - below the 0.25 coin-flip baseline.
   (This is the number that makes "done" objective.)

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

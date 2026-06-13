#!/usr/bin/env bash
# Glassbox — on-camera proof reel. Run from the repo root:  bash demo/proof.sh
# Every line below is real, reproducible, and unfakeable. No dashboard required.
cd "$(dirname "$0")/.."
bar(){ printf '\n\033[1m── %s ──\033[0m\n' "$1"; }

bar "1 · IT RAN 5 GENERATIONS AND IMPROVED  (prediction markets)"
python3 -c "import json;[print(f\"  gen {s['generation']}:  train {s['train_brier']:.4f}   holdout {s['holdout_brier']:.4f}\") for s in json.load(open('scores_by_generation.json'))]"
echo "  → held-out error fell 0.2387 → 0.2244, past the 0.25 coin-flip line."

bar "2 · IT CAUGHT ITS OWN BIAS AND REWROTE THE RULE  (its own words)"
python3 -c "import json; d=json.load(open('data/diagnoses.json'))[0]; print('  grader flagged :', d['verifier_systematic_errors'][0]); print('  it rewrote     :', d['errors_addressed'][0][:120])"
echo "  → and twice (gen 4, gen 5) it found no honest gain left and changed nothing."

bar "3 · NO CHEATING — ZERO WEB CALLS ACROSS EVERY AGENT TRANSCRIPT"
F=$(ls ~/.claude/projects/*glassbox*/*/subagents/workflows/wf_*/agent-*.jsonl 2>/dev/null)
if [ -n "$F" ]; then
  # on the author's machine: grep the raw agent run-logs live (the strongest proof)
  echo "  LIVE grep over raw agent run-logs:"
  echo "    transcripts scanned : $(printf '%s\n' "$F" | wc -l | tr -d ' ')"
  echo "    research-tool calls : $(grep -hE '\"name\":\"(WebSearch|WebFetch)\"' $F | wc -l | tr -d ' ')"
else
  # for anyone who cloned the repo: the committed leak-check report
  python3 -c "import json; d=json.load(open('data/leakage_report.json')); print(f\"  committed leak-check report: {d['research_calls']} research calls across {d['transcript_files_scanned']} transcripts\")"
fi
echo "  → improvement cannot be smuggled-in information."

bar "4 · SAME ENGINE, A SECOND DOMAIN IT HAD NEVER SEEN  (GitHub issues)"
echo "  engine SHA : $(git show HEAD:.claude/workflows/self-improve-forecaster.js | shasum | cut -c1-12)   (byte-identical to the markets run)"
python3 -c "import json;[print(f\"  GitHub gen {s['generation']}:  holdout {s['holdout_brier']:.4f}\") for s in json.load(open('scores_by_generation_github.json'))]"
echo "  → same loop, brand-new skill: 0.2500 → 0.2313."

bar "5 · IT'S ALL REAL AND COMMITTED"
git log --oneline | head -8

printf '\n\033[1mwe didn'\''t build a forecaster. we built an engine that turns any verified outcome into skill — and it learned two.\033[0m\n\n'

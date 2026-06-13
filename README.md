# Glassbox — a model that finds its own mistakes and rewrites its own rules

**Live demo → https://raghavrajsah.github.io/glassbox/**

*An autonomous loop: the model forecasts, an isolated grader scores it, a diagnostician finds its own systematic errors and rewrites its own rulebook — five generations, no internet access, and it stops when there's no honest improvement left.*

**Why it's interesting:** getting better at a skill normally takes new information. Glassbox gets measurably better with **none** — purely by auditing the pattern in its own past mistakes. We prove the gain is real by running the whole loop leak-proof (zero web calls) and scoring on held-out questions it never trained on. Forecasting resolved prediction markets is just the testbed; the deliverable is the self-improving **engine** — and it transfers to a brand-new domain with no code changes.

---

## The idea

A crowd guessing the number of jellybeans in a jar averages out close to the truth — "the wisdom of the crowd." Prediction markets like **Kalshi** and **Polymarket** turn that into a price: a contract that pays $1 if an event happens trades at the crowd's probability that it will. Once the event resolves, you're left with something rare — a forecasting question with a *verified* answer. Thousands of resolved markets are, in effect, a giant graded exam for forecasters.

And forecasting is really *two* skills: **getting information**, and **reasoning well about the information you already have** — calibration, the art of turning what you know into well-tuned probabilities.

Philip Tetlock's forecasting research — the IARPA tournament won by his [Good Judgment Project](https://en.wikipedia.org/wiki/The_Good_Judgment_Project) — found the best forecasters win mostly on that *second* skill. His trained amateurs outperformed professional intelligence analysts who had access to classified information: not by knowing more, but by reasoning better — thinking in probabilities, anchoring on base rates, updating without bias.

So we asked a narrow, testable question: **can an AI sharpen that second skill on its own — measurably — without being handed any new information?**

## What we built

Glassbox is a loop that runs entirely on already-resolved questions. Each generation:

1. Claude **forecasts** a batch of resolved questions — from the question text alone, never the web.
2. An **isolated grader** scores it with a Brier score. It sees only the predictions and the true outcomes — never the rules or the questions — so it can't be gamed.
3. A **diagnostician** reads the misses and names one *systematic* error — e.g. *"I keep predicting 0.30 for these, but they actually happen ~42% of the time."*
4. It **rewrites its own rules** to fix that error, and the next generation runs on the improved rules.

No step touches the web. The only thing it learns from is the pattern in its **own miss distribution** — so any improvement is genuine calibration, not information smuggled in through the back door.

Over five generations on ~260 resolved Kalshi markets, its error on a **held-out set it never trained on** fell from **0.2387 to 0.2244**, past the 0.25 coin-flip line. It located where it was systematically wrong, corrected it with zero new information, and — tellingly — **knew when to stop**: the last two generations changed nothing, because there was no honest gain left to take.

## How it leverages the models — and why this is newly feasible

The interesting part isn't any single forecast; it's that a model runs this entire loop *on itself*, reliably and unattended:

- **Agentic orchestration.** One repeatable `/workflows` command in Claude Code drives three Claude (Opus) subagents — forecaster, *isolated* grader, diagnostician — across five generations, ~23 agent runs per cycle, with no human in the loop.
- **Structured self-critique, not a clever prompt.** The diagnostician reads a *distribution of its own misses*, isolates the single biggest systematic bias, and rewrites its own rulebook with cited evidence that the next generation actually applies. The corrections compound generation over generation.
- **It holds a hard constraint by construction.** Across 69 agent transcripts: **zero** web calls. So any improvement provably comes from reasoning over its own mistakes — not retrieval.
- **It knows when to stop.** Twice it judged there was no honest gain left and deliberately changed nothing — it didn't manufacture progress to look busy.
- **The engine is domain-agnostic.** The *same workflow, same git SHA* taught itself a second, unrelated skill with zero edits (see below).

A self-correcting agent loop that stays calibrated, stays faithful to its constraints, and stays honest about its own limits over this many steps leans on recent frontier gains in reasoning, reliable structured output, and long-horizon instruction-following — it would have been too brittle to trust a model generation ago.

## The product is the engine, not the app

The deliverable isn't a forecasting app. It's a **reusable harness**: a single repeatable `/workflows` command driving three subagents (forecaster, grader, diagnostician). Nothing in the loop knows it's looking at markets — the domain enters *only* through the data file and the scoring function. Point it at any `{question, outcome}` dataset and you get a self-improving forecaster for that domain, with no code changes. Another team can re-run it on their own resolved questions tomorrow.

## Proof it generalizes

To show the *engine* is the product — not one lucky set of rules — we ran the **byte-identical** workflow (same file, same git commit SHA) on a completely unrelated problem: **"will this GitHub issue be closed within 30 days of opening?"** Same loop, brand-new skill. The curve fell there too.

| Domain | Question | Gen 1 (held-out) | Final (held-out) | |
|---|---|---|---|---|
| Prediction markets (Kalshi) | will this market resolve YES? | 0.2387 | **0.2244** | ↓ 6.0% |
| GitHub issues | will it close within 30 days? | 0.2500 | **0.2313** | ↓ 7.5% |

*Brier score on a never-trained holdout — lower is better, 0.25 is a coin flip. Both runs used zero web lookups.*

It even policed its own honesty: on the GitHub data it **refused to use** signals like labels and assignees, because those are added during triage *after* an issue is filed — using them would be peeking at the future. It kept only what was knowable the moment the issue was opened.

## Why the numbers are honest

These are genuinely hard, near-coin-flip questions. With no new information, there's a hard ceiling on how far calibration alone can go — we measured that floor at **~0.224** (5-fold cross-validation). Both runs land right at it and stop. That's the whole point: Glassbox **refuses to leak** — no web research, no peeking at answers — even though leaking would buy a prettier number. The gains it reports are the real, earned kind, and it stops the moment honest gains run out.

---

## How it works

```
forecast ─▶ grade (Brier, isolated) ─▶ diagnose one systematic error ─▶ rewrite rules ─▶ next generation
```

- **Forecaster** — reads the current rules and a batch of questions (text + leak-proof structural features only) and emits a structured forecast: `{probability, base_rate_used, key_evidence, what_would_change_my_mind}`.
- **Grader** *(isolated context)* — receives only `(type, probability, outcome)`; never the rules or the question text. Computes the Brier score; the orchestrator recomputes it deterministically as the source of truth.
- **Diagnostician** — finds the single biggest systematic bias in the misses and rewrites the rules for the next generation. Every rule it writes cites the generation and the evidence that created it.

The rules live in a small, human-readable [`playbook`](playbook/) (generation 1 → 5 snapshots included), so you can read exactly what it learned and why.

## Run it

```bash
python3 harness/fetch_curated.py    # pull + curate resolved markets (Kalshi public API, no auth)
python3 harness/enrich.py           # add leak-proof structural features
python3 harness/split.py            # 70/30 train/holdout split (holdout is never trained on)
python3 harness/build_run.py        # embed the data into a runnable copy of the workflow
# then run the /workflows command `self-improve-forecaster`
python3 harness/write_artifacts.py  # write scores, playbook snapshots, leak-proof check, site bundle
```

## Read more

- **Live demo:** https://raghavrajsah.github.io/glassbox/ — both Brier curves, the gen-1→final rule diff, the diagnostician's moments, and the zero-research-calls proof.
- The brief and the machine-checkable definition of done: [`BRIEF.md`](BRIEF.md) · [`RUBRIC.md`](RUBRIC.md).
- The engine, one file, unchanged across both domains: [`.claude/workflows/self-improve-forecaster.js`](.claude/workflows/self-improve-forecaster.js).
- What it learned: [`playbook/`](playbook/). How the data was curated (and what was excluded, and why): [`data/curation_log.md`](data/curation_log.md) · [`data/curation_log_github.md`](data/curation_log_github.md).
- Proof the loop actually ran — the three agents, the grader, the diagnostician rewriting rules: [`session-log.md`](session-log.md).

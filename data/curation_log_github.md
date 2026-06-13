# Curation Log — Domain 2: GitHub issue closure

**Question:** "Will this GitHub issue be closed within 30 days of being opened?"
**Source:** public GitHub REST API (`repos/{repo}/issues`, via authenticated `gh`).
**Repos:** kubernetes/kubernetes, facebook/react, rust-lang/rust (70 each = 210).
**Window:** issues opened 2025-01-01 … 2026-05-13 — i.e. opened ≥31 days before
today (2026-06-13), so the 30-day outcome is fully settled. PRs excluded.
**Outcome:** `closed_at` exists AND `closed_at − created_at ≤ 30 days` → 1, else 0.
Overall base rate: **0.357**. By repo: kubernetes 0.457, react 0.243, rust 0.371.

## Leak-proof feature list (known AT THE MOMENT THE ISSUE WAS OPENED)
Same discipline as domain 1 — no web research, no peeking past the open date.

| feature | source | mapped to harness slot |
|---|---|---|
| repo | immutable | `category` (the type key) |
| author_first_time | `author_association` ∈ {FIRST_TIME_CONTRIBUTOR, NONE} | encoded in `question` + `strike` |
| title_words | title at open | `question` |
| body_len | body at open | `ladder_pos_bin` (body-length quintile bucket, the ordinal slot) + `question` |
| body_empty | body at open | `question` |
| created_weekday | created_at | `question` |
| kind (bug/feature/docs/question/other) | title text | `question` + `strike` |

## DELIBERATELY EXCLUDED as post-open / triage-time (would LEAK)
- **labels / number of labels** — added during triage, often after opening.
- **assignees / has-assignee** — assigned during triage.
- **milestone, comment count, reactions** — accumulate after opening.
- any **state/timeline event** after `created_at`.

> Note: the prompt's examples listed `num_labels` and `has-assignee`, but those are
> added during triage *after* the issue is opened, so using them would peek past the
> open date. They are excluded to keep domain 2 under the exact same leak-proof
> discipline as domain 1.

## Mapping into the SHARED schema (so the UNCHANGED workflow runs)
The engine (`.claude/workflows/self-improve-forecaster.js`) is byte-identical to
domain 1 (verified: the run script differs by exactly one embedded-data line).
Domain features enter only through the dataset:
`category`=repo, `ladder_pos_bin`=body-length bucket (the ordinal feature the
diagnostician can split on monotonically), `question`=NL description carrying the
at-open features, `outcome`=closed-within-30-days. `is_deadline`/`direction`/
`ladder_rung`/`trivial_bound` are set neutral. A fresh naive gen-1 playbook
(`playbook/github_gen1.md`) seeds every repo at the 0.50 coin flip.

## Result
70/30 stratified split (train 148 / holdout 62). The diagnostician learned, from
TRAIN misses only: react 0.50→~0.23 (monotone by body length), rust→0.376,
kubernetes monotone-by-body-length. Holdout Brier **0.2500 → 0.2313 (7.5%)**,
beating the 0.25 coin-flip baseline — a falling curve on a domain the engine had
never seen, zero architecture changes, zero research calls.

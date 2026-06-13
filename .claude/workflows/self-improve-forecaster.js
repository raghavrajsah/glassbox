export const meta = {
  name: 'self-improve-forecaster',
  description: 'Self-improving forecaster: forecast -> verify -> diagnose -> rewrite playbook, N generations, measured on a held-out set. Leak-proof (no web research).',
  whenToUse: 'Run the forecasting-doctrine improvement loop over a train/holdout dataset passed via args.',
  phases: [
    { title: 'Gen 1' }, { title: 'Gen 2' }, { title: 'Gen 3' },
    { title: 'Gen 4' }, { title: 'Gen 5' }, { title: 'Gen 6' },
  ],
}

// ----- args: { train, holdout, gen1_playbook_md, generations } -----
// Each train/holdout item: { id, question, strike, category, is_deadline,
// direction, ladder_rung, trivial_bound, outcome }.  Outcome is NEVER shown to
// the forecaster — only the verifier sees it.  Domain enters ONLY via this data
// and the Brier scoring function; the orchestration is domain-agnostic.

// === DATA BINDING (builder replaces this single line for embedded runs) ===
const INPUT = args
// === END DATA BINDING ===
const GENERATIONS = (INPUT && INPUT.generations) || 5
const train = INPUT.train
const holdout = INPUT.holdout
let playbook = INPUT.gen1_playbook_md

// ---------- schemas ----------
const FORECAST_SCHEMA = {
  type: 'object',
  properties: {
    forecasts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          probability: { type: 'number' },
          base_rate_used: { type: 'string' },
          key_evidence: { type: 'string' },
          what_would_change_my_mind: { type: 'string' },
        },
        required: ['id', 'type', 'probability', 'base_rate_used', 'key_evidence', 'what_would_change_my_mind'],
        additionalProperties: false,
      },
    },
  },
  required: ['forecasts'],
  additionalProperties: false,
}

const VERIFIER_SCHEMA = {
  type: 'object',
  properties: {
    train_brier: { type: 'number' },
    calibration: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          n: { type: 'number' },
          mean_predicted: { type: 'number' },
          empirical_resolve: { type: 'number' },
          calibration_gap: { type: 'number' },
        },
        required: ['type', 'n', 'mean_predicted', 'empirical_resolve', 'calibration_gap'],
        additionalProperties: false,
      },
    },
    systematic_errors: { type: 'array', items: { type: 'string' } },
  },
  required: ['train_brier', 'calibration', 'systematic_errors'],
  additionalProperties: false,
}

const DIAG_SCHEMA = {
  type: 'object',
  properties: {
    analysis: { type: 'string' },
    systematic_errors_addressed: { type: 'array', items: { type: 'string' } },
    new_playbook_md: { type: 'string' },
  },
  required: ['analysis', 'systematic_errors_addressed', 'new_playbook_md'],
  additionalProperties: false,
}

// ---------- deterministic scoring (authoritative) ----------
function brierOf(forecasts, items) {
  const out = new Map(items.map(x => [x.id, x.outcome]))
  let se = 0, n = 0
  for (const f of forecasts) {
    if (!out.has(f.id)) continue
    const p = Math.max(0, Math.min(1, f.probability))
    se += (p - out.get(f.id)) ** 2
    n++
  }
  return n ? se / n : null
}

// Weighted linear (least-squares) fit of per-bin means over bin index, generic
// over any ordinal feature. Strong regularisation (2 params) so it generalises to
// holdout instead of overfitting noisy individual bins (cf. isotonic, which keeps
// noisy endpoints). Returns a 5-element clamped lookup. If the fit is NOT
// decreasing (slope > 0), returns null — i.e. only adopt when the expected
// monotone-down relationship actually holds.
function linearFitDecreasing(means, weights) {
  let Sw = 0, Swx = 0, Swxx = 0, Swy = 0, Swxy = 0
  for (let x = 0; x < means.length; x++) {
    const w = weights[x] || 0
    Sw += w; Swx += w * x; Swxx += w * x * x; Swy += w * means[x]; Swxy += w * x * means[x]
  }
  const denom = Sw * Swxx - Swx * Swx
  if (!denom) return null
  const b = (Sw * Swxy - Swx * Swy) / denom
  const a = (Swy - b * Swx) / Sw
  if (b > 0) return null
  return means.map((_, x) => +Math.max(0.03, Math.min(0.97, a + b * x)).toFixed(3))
}

// per-type, per-(type x rung), and per-(type x position-bin) TRAIN calibration,
// plus a MONOTONE-smoothed per-position-bin candidate (decreasing in bin).
function calibration(forecasts, items) {
  const meta = new Map(items.map(x => [x.id, x]))
  const byType = {}, byTypeRung = {}, byTypeBin = {}
  for (const f of forecasts) {
    const it = meta.get(f.id)
    if (!it) continue
    const t = f.type || 'default'
    byType[t] = byType[t] || { n: 0, sump: 0, sumo: 0 }
    byType[t].n++; byType[t].sump += f.probability; byType[t].sumo += it.outcome
    const r = it.ladder_rung || 'solo'
    byTypeRung[t] = byTypeRung[t] || {}
    byTypeRung[t][r] = byTypeRung[t][r] || { n: 0, sumo: 0 }
    byTypeRung[t][r].n++; byTypeRung[t][r].sumo += it.outcome
    const b = (it.ladder_pos_bin == null) ? 2 : it.ladder_pos_bin
    byTypeBin[t] = byTypeBin[t] || {}
    byTypeBin[t][b] = byTypeBin[t][b] || { n: 0, sumo: 0 }
    byTypeBin[t][b].n++; byTypeBin[t][b].sumo += it.outcome
  }
  const by_type = Object.entries(byType).map(([t, v]) => ({
    type: t, n: v.n,
    mean_predicted: +(v.sump / v.n).toFixed(3),
    empirical_resolve: +(v.sumo / v.n).toFixed(3),
    calibration_gap: +((v.sump - v.sumo) / v.n).toFixed(3),
  })).sort((a, b) => Math.abs(b.calibration_gap) * b.n - Math.abs(a.calibration_gap) * a.n)
  const by_type_rung = {}
  for (const [t, rungs] of Object.entries(byTypeRung)) {
    by_type_rung[t] = {}
    for (const [r, v] of Object.entries(rungs)) {
      by_type_rung[t][r] = { n: v.n, empirical_resolve: +(v.sumo / v.n).toFixed(3) }
    }
  }
  // per-position-bin empirical + monotone(decreasing) smoothed candidate per type
  const by_type_posbin = {}
  for (const [t, bins] of Object.entries(byTypeBin)) {
    const typeMean = byType[t].sumo / byType[t].n
    const raw = [], wts = [], ns = []
    for (let b = 0; b <= 4; b++) {
      const v = bins[b]
      raw.push(v ? v.sumo / v.n : typeMean)
      wts.push(v ? v.n : 0)
      ns.push(v ? v.n : 0)
    }
    const mono = linearFitDecreasing(raw, wts)
    by_type_posbin[t] = { empirical: raw.map(x => +x.toFixed(3)), n: ns, monotone_candidate: mono }
  }
  return { by_type, by_type_rung, by_type_posbin }
}

// strip outcomes before anything touches the forecaster
const FC_FIELDS = ['id', 'question', 'strike', 'category', 'is_deadline', 'direction', 'ladder_rung', 'ladder_pos_bin', 'trivial_bound']
const stripOutcome = arr => arr.map(x => {
  const o = {}; for (const k of FC_FIELDS) o[k] = x[k]; return o
})

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ---------- agent prompts ----------
function forecasterPrompt(pb, questions) {
  return `You are a disciplined forecaster running a LEAK-PROOF historical backtest.
HARD RULES:
- Use ONLY the question text, its structural fields, and the PLAYBOOK below.
- Do NOT use any outside knowledge, real-world facts, current values, dates, or
  web research. This is a calibration exercise, not information retrieval.
- Apply the playbook MECHANICALLY: do not invent or nudge probabilities.

PLAYBOOK (generation doctrine):
${pb}

PROCEDURE for each question:
1. Classify into the FIRST matching type in classification_order, using the type
   definitions and the structural fields (is_deadline, direction, ladder_rung,
   ladder_pos_bin, trivial_bound, category). If no type matches, type = "default".
2. probability = the type's "probability"; but if the type has
   "probability_by_posbin" (a 5-element array), use
   probability_by_posbin[ladder_pos_bin]; else if it has "probability_by_rung", use
   probability_by_rung[ladder_rung]; for "default" use default_probability. Clamp to
   [0,1]. Use EXACTLY the playbook number — never interpolate or invent.
3. base_rate_used = the playbook rate you applied + the type. key_evidence = which
   field/phrase triggered the type. what_would_change_my_mind = a structural cue
   that would reclassify it.

Return a forecast for ALL and ONLY these questions; match "id" exactly.
QUESTIONS (JSON):
${JSON.stringify(questions)}`
}

function verifierPrompt(rows) {
  // rows: {id, type, probability, outcome} — NO playbook, NO question text.
  return `You are an INDEPENDENT VERIFIER scoring a forecaster in isolation. You
receive only (type, probability, outcome) per item — no playbook, no question
text, no reasoning. Be purely arithmetic and skeptical.

1. train_brier = mean((probability - outcome)^2) over all rows.
2. For each distinct "type": n, mean_predicted (mean probability),
   empirical_resolve (mean outcome), calibration_gap = mean_predicted - empirical_resolve.
3. systematic_errors: the 1-2 types where the forecaster is most systematically
   wrong (largest |calibration_gap| weighted by n), each phrased like
   "type T: predicts ~A but resolves ~B over n items -> over/under-predicting".

DATA (JSON array of {id, type, probability, outcome}):
${JSON.stringify(rows)}`
}

function diagnosticianPrompt(pb, calib, gen) {
  return `You are the DIAGNOSTICIAN that improves a forecasting playbook. The skill
being learned is calibration discipline. Improvement must come ONLY from
calibrating to the TRAIN miss distribution below — NEVER from outside knowledge,
and you must NEVER look at holdout (you cannot see it).

CURRENT PLAYBOOK (generation ${gen}):
${pb}

AUTHORITATIVE TRAIN CALIBRATION (computed deterministically; sorted by impact):
by_type: ${JSON.stringify(calib.by_type)}
by_type_posbin (per type, indexed by ladder_pos_bin 0..4 = lowest..highest strike
in the ladder; "empirical" = raw resolve per bin, "n" = counts, "monotone_candidate"
= an isotonic (non-increasing) smoothing that does NOT overfit noisy bins):
${JSON.stringify(calib.by_type_posbin)}

Fix the SINGLE biggest systematic bias this generation (at most two). Allowed moves:
- Move a type's "probability" toward its TRAIN empirical_resolve, applying MILD
  shrinkage (~10% toward 0.5) so small-n types don't overfit. Do NOT over-shrink —
  predicting near the empirical base rate minimises Brier.
- For a THRESHOLD type (direction == 'above'), replace the flat "probability" with
  "probability_by_posbin" — the 5-element "monotone_candidate" array from
  by_type_posbin (a heuristic: the higher a strike sits in its ladder, the less
  likely YES). Prefer this monotone candidate over raw per-bin empirics or per-rung
  splits, because it generalises to holdout instead of overfitting individual bins.
- Add a new type ONLY with cited evidence (e.g. trivial_bound items).
Keep the SAME JSON contract and classification mechanism. The forecaster reads
ladder_pos_bin from each question to index probability_by_posbin. Do not change
types that are already well-calibrated.

Produce new_playbook_md = the FULL markdown playbook for generation ${gen + 1}:
prose rules + a \`\`\`json contract block with "generation": ${gen + 1}. EVERY type's
"evidence" field and every prose rule MUST cite the generation it was created/changed
in AND the specific calibration evidence (e.g. "gen ${gen + 1}: deadline_completion
predicted 0.30 but train resolves 0.46 over n=92 -> raised to 0.42"). No orphan rules.`
}

// ---------- forecasting (chunked, parallel) ----------
async function forecastSet(pb, items, gen, label) {
  const chunks = chunk(stripOutcome(items), 95)
  const results = await parallel(chunks.map((c, i) => () =>
    agent(forecasterPrompt(pb, c), {
      schema: FORECAST_SCHEMA, label: `forecast:${label}:g${gen}:c${i}`, phase: `Gen ${gen}`,
    })))
  const merged = []
  for (const r of results) if (r && r.forecasts) merged.push(...r.forecasts)
  // backfill any dropped ids with the neutral default so scoring is complete
  const seen = new Set(merged.map(f => f.id))
  for (const it of items) if (!seen.has(it.id)) {
    merged.push({ id: it.id, type: 'unmatched', probability: 0.5,
      base_rate_used: 'fallback default (forecaster dropped id)', key_evidence: '', what_would_change_my_mind: '' })
  }
  return merged
}

// ---------- the loop ----------
const scores = [], playbooks = [], diagnoses = [], forecastsLog = []

for (let g = 1; g <= GENERATIONS; g++) {
  phase(`Gen ${g}`)
  const trainFc = await forecastSet(playbook, train, g, 'train')
  const holdFc = await forecastSet(playbook, holdout, g, 'holdout')

  const trBrier = brierOf(trainFc, train)
  const hoBrier = brierOf(holdFc, holdout)
  scores.push({ generation: g, train_brier: +trBrier.toFixed(4), holdout_brier: +hoBrier.toFixed(4),
    n_train: train.length, n_holdout: holdout.length })
  playbooks.push({ generation: g, markdown: playbook })
  forecastsLog.push({ generation: g, train: trainFc, holdout: holdFc })
  log(`Gen ${g}: train Brier=${trBrier.toFixed(4)}  holdout Brier=${hoBrier.toFixed(4)}`)

  if (g === GENERATIONS) break

  // VERIFIER — isolated context: forecasts + outcomes only, no playbook
  const trainOut = new Map(train.map(x => [x.id, x.outcome]))
  const vrows = trainFc.map(f => ({ id: f.id, type: f.type, probability: f.probability, outcome: trainOut.get(f.id) }))
  const verdict = await agent(verifierPrompt(vrows), { schema: VERIFIER_SCHEMA, label: `verify:g${g}`, phase: `Gen ${g}` })

  // authoritative calibration (deterministic) feeds the diagnostician
  const calib = calibration(trainFc, train)

  // DIAGNOSTICIAN — rewrite playbook for gen+1
  const diag = await agent(diagnosticianPrompt(playbook, calib, g), { schema: DIAG_SCHEMA, label: `diagnose:g${g}`, phase: `Gen ${g}` })
  diagnoses.push({
    from_generation: g,
    verifier_train_brier: verdict ? verdict.train_brier : null,
    verifier_systematic_errors: verdict ? verdict.systematic_errors : [],
    calibration: calib.by_type,
    diagnostician_analysis: diag.analysis,
    errors_addressed: diag.systematic_errors_addressed,
  })
  playbook = diag.new_playbook_md
}

return { scores, playbooks, diagnoses, forecasts: forecastsLog }

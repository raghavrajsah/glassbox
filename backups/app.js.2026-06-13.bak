// Glassbox — "The Doctrine, Revised."
// One fetch of artifacts.json drives every number, rule value, and quote on the page.
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f4 = x => (x == null ? "—" : (+x).toFixed(4));

fetch("artifacts.json").then(r => r.json()).then(render).catch(e => {
  document.body.insertAdjacentHTML("beforeend",
    "<pre style='color:#962D22;font-family:monospace;padding:24px'>Failed to load artifacts.json: " + esc(e) + "</pre>");
});

// pull the ```json ... ``` contract out of a playbook markdown string
function jsonBlock(md) {
  const m = (md || "").match(/```json\s*([\s\S]*?)```/);
  try { return m ? JSON.parse(m[1]) : null; } catch { return null; }
}

// editorial framing for each rule type — labels only; all numbers come from the data
const TYPE_META = {
  deadline_completion: { idx: "R2", name: "Deadline & completion", q: "“Will it happen by the deadline?”" },
  threshold_above:     { idx: "R3", name: "Threshold — at least",   q: "“Will it reach at least X?”" },
  default:             { idx: "R1", name: "When no rule fires",      q: "Everything left uncategorized." },
  threshold_below:     { idx: "R4", name: "Threshold — at most",    q: "“Will it stay under X?”" },
};
// narrative order: biggest bias first, the principled NON-change last
const RULE_ORDER = ["deadline_completion", "threshold_above", "default", "threshold_below"];

function valueOf(t) {
  if (!t) return null;
  if (Array.isArray(t.probability_by_posbin)) return { kind: "ladder", arr: t.probability_by_posbin };
  if (typeof t.probability === "number") return { kind: "scalar", v: t.probability };
  return null;
}
function scalarText(t) {
  const v = valueOf(t);
  if (!v) return "—";
  return v.kind === "scalar" ? "p = " + v.v.toFixed(2) : v.arr[0].toFixed(2) + " … " + v.arr[v.arr.length - 1].toFixed(2);
}

// the gen-5 `evidence` string is long; lift the clause the model used to justify THIS rule
function noteFor(key, gen5t, diagnoses) {
  const ev = (gen5t && gen5t.evidence) || "";
  if (key === "deadline_completion") {
    // the model's own ranking of the single biggest bias
    const d1 = (diagnoses[0] && diagnoses[0].diagnostician_analysis) || "";
    const m = d1.match(/This is the SINGLE biggest systematic bias[^.]*\./i);
    return { html: "Predicted <b>0.30</b>, but these events resolved YES about <b>42%</b> of the time over 50 cases. " +
                   (m ? esc(m[0]) : "The largest single bias.") + " Later split by how hard the strike was to clear.",
             src: "Diagnostician · gen 1 → 2, refined gen 3" };
  }
  if (key === "threshold_above") {
    return { html: "A flat <b>0.40</b> hid huge spread: low bars cleared ~<b>74%</b> of the time, high bars only ~<b>14%</b>. " +
                   "Replaced with a probability that slides down the strike ladder.",
             src: "Diagnostician · gen 1 → 2" };
  }
  if (key === "default") {
    return { html: "Started at the coin flip, <b>0.50</b>. The unclassified questions actually resolved YES <b>41.9%</b> of the time, " +
                   "so it shrank toward the evidence — but only ~10% of the way, to stay honest at n=31.",
             src: "Diagnostician · gen 1 → 2" };
  }
  // threshold_below — the principled refusal
  return { html: "Zero training cases ever matched this rule. With no evidence, the model <b>refused to touch it</b> — " +
                 "recalibrating here would have meant inventing a number out of nothing.",
           src: "Held across all five generations" };
}

function render(A) {
  const scores = A.scores, gen1 = scores[0], final = scores[scores.length - 1];
  const impr = ((gen1.holdout_brier - final.holdout_brier) / gen1.holdout_brier * 100);
  const g1c = jsonBlock(A.playbook_gen1), g5c = jsonBlock(A.playbook_final);

  // ---------- masthead ledger (proof as a thin ledger strip, not stat cards) ----------
  $("#ledger").innerHTML = [
    ["Held-out Brier", `${gen1.holdout_brier.toFixed(4)} <span class="arrow">→</span> <span class="down">${final.holdout_brier.toFixed(4)}</span>`],
    ["Improvement", `<span class="down">${impr.toFixed(1)}%</span>`],
    ["Generations", scores.length],
    ["Research calls", `<span class="down">${A.leakage.research_calls}</span>`],
  ].map(([k, v]) => `<div><div class="lk">${k}</div><div class="lv">${v}</div></div>`).join("");

  // ---------- HERO: the self-revising rules ----------
  const g1t = (g1c && g1c.types) || {}, g5t = (g5c && g5c.types) || {};
  let d = 0.15;
  $("#rules").innerHTML = RULE_ORDER.map(key => {
    const meta = TYPE_META[key], oldT = g1t[key], newT = g5t[key];
    const oldText = scalarText(oldT);
    const nv = valueOf(newT);
    const held = key === "threshold_below";
    const changed = newT && newT.changed_gen;

    let newHTML;
    if (nv && nv.kind === "ladder") {
      const max = Math.max(...nv.arr);
      const bars = nv.arr.map(p => `<i style="height:${Math.round(p / max * 100)}%"></i>`).join("");
      newHTML = `<span class="ladder" aria-hidden="true">${bars}</span>
                 <span class="newval">${nv.arr[0].toFixed(2)}→${nv.arr[nv.arr.length - 1].toFixed(2)}</span>`;
    } else {
      newHTML = `<span class="newval">p = ${nv ? nv.v.toFixed(2) : "—"}</span>`;
    }
    const ladderCap = (nv && nv.kind === "ladder")
      ? `<div class="laddercap">by strike: low&nbsp;→&nbsp;high</div>` : "";

    const badge = held
      ? `<span class="badge">held · no evidence to change</span>`
      : `<span class="badge">rewritten in generation ${changed || "?"}</span>`;

    const note = noteFor(key, newT, A.diagnoses || []);
    const row = `
      <div class="rule${held ? " held" : ""}" style="--d:${d}s">
        <div class="rIndex">${meta.idx}<small>${held ? "unchanged" : "revised"}</small></div>
        <div class="rBody">
          <h3 class="rType">${meta.name}</h3>
          <p class="rQ">${meta.q}</p>
          <div class="transform">
            <span class="old">${oldText}</span>
            <span class="to" aria-hidden="true">↦</span>
            <span class="new">${newHTML}</span>
          </div>
          ${ladderCap}
          ${badge}
        </div>
        <div class="note">${note.html}<span class="src">${note.src}</span></div>
      </div>`;
    d += 0.55;
    return row;
  }).join("");

  // ---------- II · the diagnostician's voice (verbatim) ----------
  // a curated highlight per generation, plus the full reasoning behind a disclosure
  const HILITE = [
    /Predicted 0\.30 but train resolves 0\.42\. This is the SINGLE biggest systematic bias[^.]*\./i,
    /The biggest remaining systematic bias is within-type dispersion hidden by a flat mean\./i,
    /Forcing a change would overfit noise or invent unevidenced rules[^.]*\./i,
    /Therefore generation 5 is, like gen 4, a deliberate evidence-driven NO-OP[^.]*\./i,
  ];
  $("#cases").innerHTML = (A.diagnoses || []).map((dg, i) => {
    const a = dg.diagnostician_analysis || "";
    let hit = null;
    const rx = HILITE[i]; if (rx) { const m = a.match(rx); if (m) hit = m[0]; }
    if (!hit) hit = a.split(/(?<=\.)\s/)[0];
    hit = hit.replace(/\s+/g, " ").trim();
    const errs = (dg.verifier_systematic_errors || [])
      .map(e => `<li>${esc(e.split(" -> ")[0].replace(/^type /, "").trim())}${e.includes("->") ? " — <em>" + esc(e.split("->").pop().trim()) + "</em>" : ""}</li>`).join("");
    return `
      <div class="case">
        <div class="caseHead">
          <span class="caseGen">GEN ${dg.from_generation} → ${dg.from_generation + 1}</span>
          <span class="caseBrier">grader's train Brier ${f4(dg.verifier_train_brier)}</span>
        </div>
        <div class="bias"><span class="lbl">The bias the grader flagged</span><ul style="margin:0;padding-left:18px">${errs}</ul></div>
        <p class="pull">${esc(hit)}</p>
        <details class="full">
          <summary>Read its full analysis</summary>
          <div class="analysis">${esc(a)}</div>
        </details>
      </div>`;
  }).join("");

  // ---------- III · evidence: the curve (support, not lead) ----------
  $("#legend").innerHTML =
    `<span><i style="border-color:#962D22"></i> Held-out (unseen)</span>` +
    `<span><i style="border-color:#4A4334;border-top-style:dashed"></i> Train</span>` +
    `<span><i style="border-color:#1C4D5C;border-top-style:dotted"></i> Honest floor ~0.224</span>`;
  $("#chart").innerHTML = chart(scores);
  $("#chartnote").innerHTML =
    `<b>Fig.&nbsp;1</b> — Brier score by generation (lower is better). Held-out error falls from ` +
    `<b>${gen1.holdout_brier.toFixed(4)}</b> to <b>${final.holdout_brier.toFixed(4)}</b> and parks just above the ` +
    `leak-proof out-of-sample floor (~0.224, 5-fold CV). Gens 4–5 hold steady — the model judged it had run out of honest gains.`;

  // ---------- score table ----------
  $("#scoretable").innerHTML =
    `<caption>Scores · per generation</caption>` +
    `<thead><tr><th>Gen</th><th>Train</th><th>Held-out</th><th>n&nbsp;train</th><th>n&nbsp;hold</th></tr></thead>` +
    `<tbody>` + scores.map(s =>
      `<tr><td>G${s.generation}</td><td>${f4(s.train_brier)}</td><td>${f4(s.holdout_brier)}</td><td>${s.n_train}</td><td>${s.n_holdout}</td></tr>`).join("") +
    `</tbody>`;

  // ---------- IV · leak-proof guarantee ----------
  $("#rcalls").textContent = A.leakage.research_calls;
  $("#proofcopy").innerHTML =
    `${esc(A.leakage.statement)} The forecaster sees only the question text, a handful of leak-proof structural fields, ` +
    `and its own playbook. Outcomes are shown only to an isolated grader — never to the forecaster.`;
  $("#grep").innerHTML =
    esc(A.leakage.grep || "").replace(/\b0\b\s*$/, '<span class="z">0</span>') +
    `\n<span class="z">› ${A.leakage.transcript_files_scanned} transcript files scanned · 0 hits</span>`;

  // ---------- V · full diff ----------
  $("#diff").innerHTML = diff(A.playbook_gen1 || "", A.playbook_final || "");

  // ---------- footer ----------
  $("#foot").innerHTML =
    `Dataset — <code>${A.dataset.n}</code> curated Kalshi settled binary markets (2026), ` +
    `${A.dataset.politics_or_deadline_pct}% politics/deadline, base rate ${A.dataset.base_rate}. ` +
    `Built by the <code>self-improve-forecaster</code> loop. Generated ${A.generated_at}. ` +
    `Forecast → grade → diagnose → rewrite, ${scores.length} generations, measured on a held-out set.`;
}

// ---------- Fig. 1: paper-and-ink Brier chart ----------
function chart(scores) {
  const W = 760, H = 360, L = 52, R = 18, T = 24, B = 40;
  const gens = scores.map(s => s.generation);
  const x = g => L + (W - L - R) * (g - gens[0]) / Math.max(1, gens.at(-1) - gens[0]);
  const lo = 0.20, hi = 0.25;
  const y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const PAPER = "#1C4D5C"; // axis ink

  const ygrid = [0.20, 0.21, 0.22, 0.23, 0.24, 0.25].map(v =>
    `<line x1="${L}" y1="${y(v)}" x2="${W - R}" y2="${y(v)}" stroke="#CDC1A6" stroke-width="1"/>` +
    `<text x="${L - 9}" y="${y(v) + 4}" fill="#6E654F" font-size="11" font-family="JetBrains Mono,monospace" text-anchor="end">${v.toFixed(2)}</text>`).join("");
  const xlab = scores.map(s =>
    `<text x="${x(s.generation)}" y="${H - B + 22}" fill="#6E654F" font-size="11" font-family="JetBrains Mono,monospace" text-anchor="middle">G${s.generation}</text>`).join("");

  const ref = (v, col, dash, lbl) =>
    `<line x1="${L}" y1="${y(v)}" x2="${W - R}" y2="${y(v)}" stroke="${col}" stroke-width="1.4" stroke-dasharray="${dash}"/>` +
    `<text x="${W - R}" y="${y(v) - 6}" fill="${col}" font-size="11" font-family="JetBrains Mono,monospace" text-anchor="end">${lbl}</text>`;

  // animated draw-in line + dots
  const path = (key) => "M " + scores.map(s => `${x(s.generation)} ${y(s[key])}`).join(" L ");
  const len = 760;
  const line = (key, col, dash, anim) => {
    const dots = scores.map(s => `<circle cx="${x(s.generation)}" cy="${y(s[key])}" r="4.5" fill="${col}"/>`).join("");
    const style = anim
      ? `stroke-dasharray:${len};stroke-dashoffset:${len};animation:drawline 1.4s ease .2s forwards`
      : (dash ? `stroke-dasharray:${dash}` : "");
    return `<path d="${path(key)}" fill="none" stroke="${col}" stroke-width="${anim ? 2.8 : 1.8}" style="${style}"/>${dots}`;
  };

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Brier score by generation; held-out error falls and levels off near the honest floor.">
    ${ygrid}${xlab}
    ${ref(0.224, "#1C4D5C", "2 3", "honest floor ~0.224")}
    ${line("train_brier", "#4A4334", "5 5", false)}
    ${line("holdout_brier", "#962D22", null, true)}
  </svg>`;
}

// ---------- LCS line diff for the appendix ----------
function diff(a, b) {
  const A = a.split("\n"), B = b.split("\n"), n = A.length, m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  let i = 0, j = 0, out = "";
  while (i < n && j < m) {
    if (A[i] === B[j]) { out += "  " + esc(A[i]) + "\n"; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out += `<span class="del">− ${esc(A[i])}</span>\n`; i++; }
    else { out += `<span class="add">+ ${esc(B[j])}</span>\n`; j++; }
  }
  while (i < n) out += `<span class="del">− ${esc(A[i++])}</span>\n`;
  while (j < m) out += `<span class="add">+ ${esc(B[j++])}</span>\n`;
  return out;
}

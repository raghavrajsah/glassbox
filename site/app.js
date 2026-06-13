// Glassbox site — renders the loop's artifacts. Single fetch of artifacts.json.
const $ = s => document.querySelector(s);
const fmt = x => (x == null ? "—" : x.toFixed ? x.toFixed(4) : x);

fetch("artifacts.json").then(r => r.json()).then(render).catch(e => {
  document.body.insertAdjacentHTML("beforeend", "<pre style='color:#f85149'>Failed to load artifacts.json: " + e + "</pre>");
});

function render(A) {
  const scores = A.scores, gen1 = scores[0], final = scores[scores.length - 1];
  const impr = ((gen1.holdout_brier - final.holdout_brier) / gen1.holdout_brier * 100);

  // ---- headline cards ----
  const card = (k, v, cls = "") => `<div class="card"><div class="k">${k}</div><div class="v ${cls}">${v}</div></div>`;
  $("#cards").innerHTML =
    card("Gen-1 holdout Brier", fmt(gen1.holdout_brier)) +
    card("Final holdout Brier", fmt(final.holdout_brier), final.holdout_brier < gen1.holdout_brier ? "good" : "bad") +
    card("Holdout improvement", impr.toFixed(1) + "%", impr > 0 ? "good" : "bad") +
    card("vs 0.25 baseline", (final.holdout_brier < 0.25 ? "−" : "+") + Math.abs(0.25 - final.holdout_brier).toFixed(4), final.holdout_brier < 0.25 ? "good" : "bad") +
    card("Generations", scores.length);

  // ---- chart ----
  $("#chart").innerHTML = chart(scores);
  $("#chartnote").innerHTML = `Train (blue) and holdout (gold). Coin-flip baseline 0.25 and the honest leak-proof out-of-sample floor (~0.224, 5-fold CV) shown dashed. Lower is better.`;

  // ---- score table ----
  $("#scoretable").innerHTML = "<table><tr><th>Gen</th><th>Train Brier</th><th>Holdout Brier</th><th>n train</th><th>n holdout</th></tr>" +
    scores.map(s => `<tr><td>${s.generation}</td><td>${fmt(s.train_brier)}</td><td>${fmt(s.holdout_brier)}</td><td>${s.n_train}</td><td>${s.n_holdout}</td></tr>`).join("") +
    "</table>";

  // ---- diagnostician moments ----
  $("#diags").innerHTML = (A.diagnoses || []).map(d => `
    <div class="gen">
      <h3>Generation ${d.from_generation} → ${d.from_generation + 1}
        <span class="tag">verifier train Brier ${fmt(d.verifier_train_brier)}</span></h3>
      <div class="err">⚠ ${(d.verifier_systematic_errors || []).join("<br>⚠ ")}</div>
      <p style="margin:8px 0 4px"><strong>Fix:</strong> ${(d.errors_addressed || []).join("; ")}</p>
      <p class="muted" style="margin:4px 0 0">${(d.diagnostician_analysis || "").slice(0, 600)}</p>
    </div>`).join("");

  // ---- playbook diff ----
  $("#diff").innerHTML = diff(A.playbook_gen1 || "", A.playbook_final || "");

  // ---- leak proof ----
  $("#leak").innerHTML = `<p class="leak">✓ ${A.leakage.statement}</p>
    <p class="muted">Backtest forecaster outbound research calls detected: <code>${A.leakage.research_calls}</code>.
    The forecaster receives only question text + leak-proof structural fields + the playbook; outcomes are shown only to the isolated verifier.</p>
    <pre>${A.leakage.grep || ""}</pre>`;

  $("#foot").innerHTML = `Dataset: ${A.dataset.n} curated Kalshi settled binary markets (all 2026), ` +
    `${A.dataset.politics_or_deadline_pct}% politics/deadline · base rate ${A.dataset.base_rate}. ` +
    `Built by the <code>self-improve-forecaster</code> /workflows command. Generated ${A.generated_at}.`;
}

function chart(scores) {
  const W = 920, H = 340, P = 46;
  const gens = scores.map(s => s.generation);
  const xs = g => P + (W - 2 * P) * (g - gens[0]) / Math.max(1, gens[gens.length - 1] - gens[0]);
  const lo = 0.18, hi = 0.26;
  const ys = v => H - P - (H - 2 * P) * (v - lo) / (hi - lo);
  const line = (key, col) => "<polyline fill='none' stroke='" + col + "' stroke-width='2.5' points='" +
    scores.map(s => xs(s.generation) + "," + ys(s[key])).join(" ") + "'/>" +
    scores.map(s => "<circle cx='" + xs(s.generation) + "' cy='" + ys(s[key]) + "' r='4' fill='" + col + "'/>").join("");
  const yticks = [0.18, 0.20, 0.22, 0.24, 0.26].map(v =>
    "<line x1='" + P + "' y1='" + ys(v) + "' x2='" + (W - P) + "' y2='" + ys(v) + "' stroke='#30363d' stroke-width='1'/>" +
    "<text x='" + (P - 8) + "' y='" + (ys(v) + 4) + "' fill='#8b949e' font-size='11' text-anchor='end'>" + v.toFixed(2) + "</text>").join("");
  const xticks = scores.map(s => "<text x='" + xs(s.generation) + "' y='" + (H - P + 18) + "' fill='#8b949e' font-size='11' text-anchor='middle'>G" + s.generation + "</text>").join("");
  const ref = (v, col, lbl) => "<line x1='" + P + "' y1='" + ys(v) + "' x2='" + (W - P) + "' y2='" + ys(v) + "' stroke='" + col + "' stroke-width='1.4' stroke-dasharray='6 4'/>" +
    "<text x='" + (W - P) + "' y='" + (ys(v) - 5) + "' fill='" + col + "' font-size='11' text-anchor='end'>" + lbl + "</text>";
  return "<svg viewBox='0 0 " + W + " " + H + "'>" + yticks + xticks +
    ref(0.25, "#8b949e", "0.25 coin-flip") + ref(0.224, "#a371f7", "~0.224 honest floor") +
    line("train_brier", "#58a6ff") + line("holdout_brier", "#d29922") +
    "<text x='" + (W - P) + "' y='" + P + "' fill='#58a6ff' font-size='12' text-anchor='end'>train</text>" +
    "<text x='" + (W - P) + "' y='" + (P + 16) + "' fill='#d29922' font-size='12' text-anchor='end'>holdout</text>" +
    "</svg>";
}

// minimal line-level diff (LCS) for the playbook
function diff(a, b) {
  const A = a.split("\n"), B = b.split("\n"), n = A.length, m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  let i = 0, j = 0, out = "";
  while (i < n && j < m) {
    if (A[i] === B[j]) { out += "  " + esc(A[i]) + "\n"; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out += "<span class='del'>− " + esc(A[i]) + "</span>\n"; i++; }
    else { out += "<span class='add'>+ " + esc(B[j]) + "</span>\n"; j++; }
  }
  while (i < n) { out += "<span class='del'>− " + esc(A[i++]) + "</span>\n"; }
  while (j < m) { out += "<span class='add'>+ " + esc(B[j++]) + "</span>\n"; }
  return out;
}

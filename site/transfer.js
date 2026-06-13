// Glassbox — Domain transfer (§VI). Self-contained (IIFE) so it never collides
// with app.js. One fetch of artifacts_github.json drives the GitHub-domain curve,
// score table, and playbook diff. Same engine as the markets run — only the
// dataset and a fresh gen-1 playbook differ.
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const f4 = x => (x == null ? "—" : (+x).toFixed(4));

  fetch("artifacts_github.json").then(r => r.json()).then(render).catch(() => {
    const s = $("#transfer"); if (s) s.style.display = "none"; // hide section if no data yet
  });

  function render(A) {
    const scores = A.scores, g1 = scores[0], fin = scores[scores.length - 1];
    const impr = ((g1.holdout_brier - fin.holdout_brier) / g1.holdout_brier * 100);

    $("#gh-ledger").innerHTML = [
      ["Held-out Brier", `${g1.holdout_brier.toFixed(4)} <span class="arrow">→</span> <span class="down">${fin.holdout_brier.toFixed(4)}</span>`],
      ["Improvement", `<span class="down">${impr.toFixed(1)}%</span>`],
      ["Generations", scores.length],
      ["Research calls", `<span class="down">${A.leakage.research_calls}</span>`],
    ].map(([k, v]) => `<div><div class="lk">${k}</div><div class="lv">${v}</div></div>`).join("");

    $("#gh-legend").innerHTML =
      `<span><i style="border-color:#962D22"></i> Held-out (unseen)</span>` +
      `<span><i style="border-color:#4A4334;border-top-style:dashed"></i> Train</span>` +
      `<span><i style="border-color:#1C4D5C;border-top-style:dotted"></i> Coin-flip 0.25</span>`;
    $("#gh-chart").innerHTML = chart(scores);
    $("#gh-chartnote").innerHTML =
      `<b>Fig.&nbsp;2</b> — Same loop, GitHub issues. Held-out Brier falls from ` +
      `<b>${g1.holdout_brier.toFixed(4)}</b> (the naive coin-flip seed) to <b>${fin.holdout_brier.toFixed(4)}</b> ` +
      `as the diagnostician learns each repo's true 30-day closure rate from the training misses alone.`;

    $("#gh-scoretable").innerHTML =
      `<caption>GitHub scores · per generation</caption>` +
      `<thead><tr><th>Gen</th><th>Train</th><th>Held-out</th><th>n&nbsp;train</th><th>n&nbsp;hold</th></tr></thead>` +
      `<tbody>` + scores.map(s =>
        `<tr><td>G${s.generation}</td><td>${f4(s.train_brier)}</td><td>${f4(s.holdout_brier)}</td><td>${s.n_train}</td><td>${s.n_holdout}</td></tr>`).join("") +
      `</tbody>`;

    $("#gh-diff").innerHTML = diff(A.playbook_gen1 || "", A.playbook_final || "");

    const d = A.dataset || {};
    const repos = d.repos ? Object.entries(d.repos).map(([k, v]) => `${k} ${v}`).join(" · ") : "";
    $("#gh-note").innerHTML =
      `Dataset — <code>${d.n}</code> public GitHub issues opened 2025–2026 across kubernetes, react, and rust, ` +
      `each old enough that the 30-day outcome is settled. Base rate ${d.base_rate}${repos ? " (close-30d by repo: " + repos + ")" : ""}. ` +
      `Leak-proof at-open features only — no labels, assignees, or comments (those are added during triage). ` +
      `<b>Zero workflow edits:</b> the run script is the canonical engine with one line of embedded data swapped in. ` +
      `${A.leakage.research_calls} research calls across ${A.leakage.transcript_files_scanned} transcripts.`;
  }

  // chart with a y-range derived from the data (GitHub sits higher than markets)
  function chart(scores) {
    const W = 760, H = 360, L = 52, R = 18, T = 24, B = 40;
    const gens = scores.map(s => s.generation);
    const vals = scores.flatMap(s => [s.train_brier, s.holdout_brier]).concat([0.25]);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const pad = (hi - lo) * 0.18 || 0.01; lo -= pad; hi += pad;
    const x = g => L + (W - L - R) * (g - gens[0]) / Math.max(1, gens.at(-1) - gens[0]);
    const y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
    const ticks = []; for (let i = 0; i <= 5; i++) ticks.push(lo + (hi - lo) * i / 5);
    const ygrid = ticks.map(v =>
      `<line x1="${L}" y1="${y(v)}" x2="${W - R}" y2="${y(v)}" stroke="#CDC1A6" stroke-width="1"/>` +
      `<text x="${L - 9}" y="${y(v) + 4}" fill="#6E654F" font-size="11" font-family="JetBrains Mono,monospace" text-anchor="end">${v.toFixed(3)}</text>`).join("");
    const xlab = scores.map(s =>
      `<text x="${x(s.generation)}" y="${H - B + 22}" fill="#6E654F" font-size="11" font-family="JetBrains Mono,monospace" text-anchor="middle">G${s.generation}</text>`).join("");
    const ref = (v, col, dash, lbl) => (v > lo && v < hi)
      ? `<line x1="${L}" y1="${y(v)}" x2="${W - R}" y2="${y(v)}" stroke="${col}" stroke-width="1.4" stroke-dasharray="${dash}"/>` +
        `<text x="${W - R}" y="${y(v) - 6}" fill="${col}" font-size="11" font-family="JetBrains Mono,monospace" text-anchor="end">${lbl}</text>` : "";
    const path = key => "M " + scores.map(s => `${x(s.generation)} ${y(s[key])}`).join(" L ");
    const line = (key, col, dash, anim) => {
      const dots = scores.map(s => `<circle cx="${x(s.generation)}" cy="${y(s[key])}" r="4.5" fill="${col}"/>`).join("");
      const style = anim ? `stroke-dasharray:760;stroke-dashoffset:760;animation:drawline 1.4s ease .2s forwards` : (dash ? `stroke-dasharray:${dash}` : "");
      return `<path d="${path(key)}" fill="none" stroke="${col}" stroke-width="${anim ? 2.8 : 1.8}" style="${style}"/>${dots}`;
    };
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="GitHub-domain Brier by generation; held-out error falls.">
      ${ygrid}${xlab}
      ${ref(0.25, "#1C4D5C", "2 3", "coin-flip 0.25")}
      ${line("train_brier", "#4A4334", "5 5", false)}
      ${line("holdout_brier", "#962D22", null, true)}
    </svg>`;
  }

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
})();

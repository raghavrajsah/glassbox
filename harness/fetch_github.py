"""DOMAIN 2 — "Will this GitHub issue be closed within 30 days of opening?"

Pulls issues from large public repos via the authenticated `gh api` issues LIST
endpoint (5000 req/hr, no search-API quirks). Keeps only issues opened in a window
that is FULLY ELAPSED (>=31 days before today) so the 30-day outcome is known.

LEAK-PROOF FEATURE DISCIPLINE (logged to data/curation_log_github.md):
Uses ONLY features knowable AT THE MOMENT THE ISSUE WAS OPENED:
  - repo                         (immutable)
  - author_first_time            (author_association == FIRST_TIME_CONTRIBUTOR / NONE;
                                  an at-open property of the author's relationship)
  - title_words                 (title set at open)
  - body_len                    (body set at open)
  - body_empty
  - created_weekday
  - kind                        (bug / feature / docs / question / other, from title text)
DELIBERATELY EXCLUDED as post-open / triage-time (would LEAK):
  - labels, assignees, milestone, comment count, reactions, state-after-open.
(The user listed num_labels/has-assignee as examples, but those are added during
triage AFTER opening, so using them would peek past the open date. Excluded.)

Mapped onto the SAME schema as domain 1 (data/dataset.json) so the UNCHANGED
self-improve-forecaster workflow runs on it: category=repo, ladder_pos_bin=body
length bucket (the ordinal feature the harness can split on monotonically),
question=NL description, outcome=closed within 30 days.
"""
import datetime
import json
import re
import subprocess
import sys

REPOS = ["kubernetes/kubernetes", "facebook/react", "rust-lang/rust"]
SHORT = {"kubernetes/kubernetes": "kubernetes", "facebook/react": "react", "rust-lang/rust": "rust"}
TODAY = datetime.date(2026, 6, 13)
ELAPSED_BEFORE = TODAY - datetime.timedelta(days=31)   # opened on/before this -> 30d window done
WINDOW_START = datetime.date(2025, 1, 1)
PER_REPO = 70
MAX_PAGES = 25

BUG = re.compile(r"\b(bug|crash|error|fail|broken|regression|panic|segfault)\b", re.I)
FEAT = re.compile(r"\b(feature|request|support|add|proposal|rfc|enhancement)\b", re.I)
DOCS = re.compile(r"\b(doc|docs|documentation|typo|readme)\b", re.I)
Q = re.compile(r"\b(question|how to|how do|why does|\?)\b", re.I)


def gh_issues(repo, page):
    out = subprocess.run(
        ["gh", "api", "-X", "GET", f"repos/{repo}/issues",
         "-f", "state=all", "-f", "sort=created", "-f", "direction=desc",
         "-f", "per_page=100", "-f", f"page={page}"],
        capture_output=True, text=True)
    if out.returncode != 0:
        sys.stderr.write(f"  gh error {repo} p{page}: {out.stderr[:120]}\n")
        return []
    return json.loads(out.stdout)


def parse_dt(s):
    return datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))


def kind(title):
    if BUG.search(title): return "bug"
    if DOCS.search(title): return "docs"
    if FEAT.search(title): return "feature"
    if Q.search(title): return "question"
    return "other"


def harvest(repo):
    kept = []
    for page in range(1, MAX_PAGES + 1):
        items = gh_issues(repo, page)
        if not items:
            break
        reached_old = False
        for it in items:
            if "pull_request" in it:
                continue
            created = parse_dt(it["created_at"])
            cdate = created.date()
            if cdate < WINDOW_START:
                reached_old = True
                continue
            if cdate > ELAPSED_BEFORE:
                continue  # too recent, 30d window not elapsed
            closed = it.get("closed_at")
            within30 = 0
            if closed:
                if (parse_dt(closed) - created).total_seconds() <= 30 * 86400:
                    within30 = 1
            assoc = it.get("author_association", "")
            first_time = assoc in ("FIRST_TIME_CONTRIBUTOR", "FIRST_TIMER", "NONE")
            title = it.get("title") or ""
            body = it.get("body") or ""
            kept.append({
                "repo": SHORT[repo],
                "number": it["number"],
                "author_first_time": first_time,
                "title_words": len(title.split()),
                "body_len": len(body),
                "body_empty": len(body.strip()) == 0,
                "created_weekday": created.weekday(),
                "kind": kind(title),
                "title": title[:120],
                "outcome": within30,
            })
            if len(kept) >= PER_REPO:
                return kept
        sys.stderr.write(f"  {repo} page {page}: kept_total={len(kept)}\n")
        if reached_old:
            break
    return kept


def main():
    all_rows = []
    for repo in REPOS:
        sys.stderr.write(f"Fetching {repo}\n")
        all_rows.extend(harvest(repo))
    json.dump(all_rows, open("data/github_raw.json", "w"), indent=2)
    from collections import Counter
    sys.stderr.write(f"TOTAL {len(all_rows)} | by repo {dict(Counter(r['repo'] for r in all_rows))} "
                     f"| closed-30d rate {sum(r['outcome'] for r in all_rows)/len(all_rows):.3f}\n")


if __name__ == "__main__":
    main()

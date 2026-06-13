"""Gen-1 forecaster: applies the naive 3-rule playbook deterministically.

Leak-proof by construction: forecasts use ONLY the question text and the
playbook's text-pattern rules. No network, no post-resolution data, no outcome
field is read while forecasting. Emits the structured contract from BRIEF.md:
{probability, base_rate_used, key_evidence, what_would_change_my_mind}.

NOTE: gen-1 rules are hard-coded here to mirror playbook/gen1.md. In later
generations the forecaster reads the playbook and reasons; for the smoke test we
keep it deterministic so the gen-1 numbers are exactly reproducible.
"""
import json
import re
import sys

DEADLINE = re.compile(r"\b(by|before)\b.*\b20\d\d\b|\b(pass|launch|sign|confirm|"
                      r"arrest|strike|ipo|resign|leave|out as)\b", re.I)
ABOVE = re.compile(r"\b(above|at least|more than|exceed|greater than)\b", re.I)
BELOW = re.compile(r"\b(below|under|at most|less than|fewer than)\b", re.I)


def forecast(item):
    q = f"{item['question']} {item.get('strike','')}"
    # R2 before R3: deadline framing dominates threshold framing
    if DEADLINE.search(q):
        return {
            "probability": 0.30,
            "base_rate_used": "naive deadline prior (R2): discrete events rarely "
                              "resolve yes by a specific near-term deadline",
            "key_evidence": "question is a deadline/completion ('by/before <date>'"
                            " or pass/launch/confirm/etc.)",
            "what_would_change_my_mind": "evidence the event is already underway or "
                                         "scheduled before the deadline",
            "rule": "R2",
        }
    if ABOVE.search(q):
        return {
            "probability": 0.40,
            "base_rate_used": "naive threshold prior (R3-above): high bars usually "
                              "aren't cleared",
            "key_evidence": "threshold question framed 'above/at least/more than'",
            "what_would_change_my_mind": "threshold set well below consensus",
            "rule": "R3-above",
        }
    if BELOW.search(q):
        return {
            "probability": 0.60,
            "base_rate_used": "naive threshold prior (R3-below)",
            "key_evidence": "threshold question framed 'below/under/at most'",
            "what_would_change_my_mind": "threshold set well above consensus",
            "rule": "R3-below",
        }
    return {
        "probability": 0.50,
        "base_rate_used": "coin-flip prior (R1 default)",
        "key_evidence": "no rule fired",
        "what_would_change_my_mind": "any signal that resolves the direction",
        "rule": "R1",
    }


def run(in_path, out_path):
    data = json.load(open(in_path))
    out = []
    for item in data:
        f = forecast(item)
        out.append({**item, "forecast": f})
    json.dump(out, open(out_path, "w"), indent=2)
    sys.stderr.write(f"forecast {len(out)} -> {out_path}\n")


if __name__ == "__main__":
    run(sys.argv[1], sys.argv[2])

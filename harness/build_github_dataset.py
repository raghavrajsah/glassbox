"""Format domain-2 GitHub issues into the SAME schema as data/dataset.json so the
UNCHANGED self-improve-forecaster workflow can run on it.

Field mapping (domain features -> the harness's generic slots):
  category      <- repo (kubernetes / react / rust)        [the categorical type key]
  ladder_pos_bin<- body_len quintile bucket 0..4 (ordinal)  [the monotone-split slot]
  question      <- natural-language description (carries all at-open features)
  outcome       <- closed within 30 days of opening (1/0)
  is_deadline=false, direction='none', ladder_rung='solo', trivial_bound=false
  strike        <- short at-open feature tag (author type + kind)
All features are leak-proof (known at open); see data/curation_log_github.md.
"""
import json

WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def main():
    rows = json.load(open("data/github_raw.json"))
    bl = sorted(r["body_len"] for r in rows)
    cuts = [bl[int(len(bl) * p)] for p in (0.2, 0.4, 0.6, 0.8)]

    def binof(x):
        return sum(1 for c in cuts if x >= c)

    out = []
    for r in rows:
        author = "a first-time contributor" if r["author_first_time"] else "a returning contributor"
        body_desc = ("an empty body" if r["body_empty"]
                     else f"a {r['body_len']}-char body")
        q = (f"Will issue #{r['number']} in {r['repo']} "
             f"(\"{r['title']}\"), a {r['kind']} opened by {author} on a "
             f"{WD[r['created_weekday']]} with a {r['title_words']}-word title and "
             f"{body_desc}, be closed within 30 days of being opened?")
        out.append({
            "ticker": f"{r['repo']}#{r['number']}",
            "category": r["repo"],
            "question": q,
            "strike": f"{r['kind']}; {author}",
            "outcome": r["outcome"],
            "result": "yes" if r["outcome"] else "no",
            "is_deadline": False,
            "direction": "none",
            "ladder_rung": "solo",
            "ladder_pos_bin": binof(r["body_len"]),
            "trivial_bound": False,
            # raw features retained for the log / analysis (not shown to forecaster)
            "_repo": r["repo"], "_author_first_time": r["author_first_time"],
            "_title_words": r["title_words"], "_body_len": r["body_len"],
            "_kind": r["kind"],
        })
    json.dump(out, open("data/dataset_github.json", "w"), indent=2)
    from collections import Counter
    print("n", len(out), "| by category", dict(Counter(x["category"] for x in out)),
          "| base rate", round(sum(x["outcome"] for x in out) / len(out), 3))
    print("body_len bin cuts:", cuts,
          "| bins", dict(Counter(x["ladder_pos_bin"] for x in out)))


if __name__ == "__main__":
    main()

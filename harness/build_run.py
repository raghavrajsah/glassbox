"""Build a data-embedded, runnable copy of the canonical workflow.

The canonical command (.claude/workflows/self-improve-forecaster.js) reads its
dataset from `args` so it stays a reusable, domain-agnostic command. The Workflow
sandbox has no filesystem, and the dataset is too large to hand-author as inline
args, so for an actual run we embed the data by replacing the single DATA BINDING
line. This is purely a delivery mechanism — the harness logic is unchanged.
"""
import json

CANON = ".claude/workflows/self-improve-forecaster.js"
OUT = "harness/run.workflow.js"
FC_FIELDS = ["question", "strike", "category", "is_deadline", "direction",
             "ladder_rung", "ladder_pos_bin", "trivial_bound"]


def slim(items):
    out = []
    for x in items:
        o = {"id": x["ticker"], "outcome": x["outcome"]}
        for k in FC_FIELDS:
            o[k] = x.get(k)
        out.append(o)
    return out


def main():
    train = slim(json.load(open("data/train.json")))
    holdout = slim(json.load(open("data/holdout.json")))
    pb = open("playbook/gen1.md").read()
    embedded = {"train": train, "holdout": holdout,
                "gen1_playbook_md": pb, "generations": 5}
    canon = open(CANON).read()
    needle = "const INPUT = args"
    assert needle in canon, "DATA BINDING line not found"
    canon = canon.replace(needle, "const INPUT = " + json.dumps(embedded))
    open(OUT, "w").write(canon)
    print(f"wrote {OUT}  train={len(train)} holdout={len(holdout)} "
          f"size={len(canon)//1024}KB")


if __name__ == "__main__":
    main()

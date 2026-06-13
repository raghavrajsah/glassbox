"""Domain-agnostic 70/30 train/holdout split. Seeded & deterministic.

The split is stratified by outcome so train and holdout share a similar base
rate (avoids a lucky/unlucky holdout dominating early Brier comparisons).
"""
import json
import random

SEED = 42
HOLDOUT_FRAC = 0.30


def main():
    data = json.load(open("data/dataset.json"))
    rng = random.Random(SEED)
    yes = [d for d in data if d["outcome"] == 1]
    no = [d for d in data if d["outcome"] == 0]
    rng.shuffle(yes)
    rng.shuffle(no)

    def cut(xs):
        k = round(len(xs) * HOLDOUT_FRAC)
        return xs[k:], xs[:k]  # train, holdout

    y_tr, y_ho = cut(yes)
    n_tr, n_ho = cut(no)
    train = y_tr + n_tr
    holdout = y_ho + n_ho
    rng.shuffle(train)
    rng.shuffle(holdout)

    json.dump(train, open("data/train.json", "w"), indent=2)
    json.dump(holdout, open("data/holdout.json", "w"), indent=2)
    br = lambda s: sum(d["outcome"] for d in s) / len(s)
    print(f"train n={len(train)} base_rate={br(train):.3f}")
    print(f"holdout n={len(holdout)} base_rate={br(holdout):.3f}")


if __name__ == "__main__":
    main()

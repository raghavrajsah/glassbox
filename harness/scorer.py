"""Domain-agnostic verifier: Brier score over a forecasts file.

Brier = mean((p - outcome)^2). Lower is better; 0.25 is the coin-flip baseline.
The domain enters ONLY via the dataset (outcome field) and this scoring function.
"""
import json
import sys


def brier(forecasts):
    n = len(forecasts)
    se = sum((f["forecast"]["probability"] - f["outcome"]) ** 2 for f in forecasts)
    return se / n


if __name__ == "__main__":
    fs = json.load(open(sys.argv[1]))
    label = sys.argv[2] if len(sys.argv) > 2 else sys.argv[1]
    print(f"{label}: n={len(fs)} brier={brier(fs):.4f}")

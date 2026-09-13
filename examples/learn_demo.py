"""Stage 3 demo: the model discovers the physics it was missing.

Run:  python examples/learn_demo.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from wm.learn import MODEL, TRUE, learn


def main() -> None:
    print("\nReality has dynamics the model was never told about:")
    print(f"  hidden load   {TRUE['hidden_gain']:.0f} W        (model assumes {MODEL['hidden_gain']:.0f})")
    print(f"  envelope UA   {TRUE['UA']:.0f} W/K       (model assumes {MODEL['UA']:.0f})")
    print(f"  solar aperture {TRUE['solar_aperture']:.1f} m²       (model assumes {MODEL['solar_aperture']:.1f})")

    fit, before, after = learn(hours=48, dt=60)

    print("\nAfter watching 48 h of reality and fitting a learned residual:")
    print("  " + str(fit))
    print(f"    (truth: hidden {TRUE['hidden_gain']:.0f} W, "
          f"ΔUA {TRUE['UA'] - MODEL['UA']:.0f} W/K, "
          f"Δaperture {TRUE['solar_aperture'] - MODEL['solar_aperture']:.1f} m²)")

    print("\nForward-simulation error against reality (48 h trajectory RMSE):")
    print(f"  physics only          {before:6.3f} °C")
    print(f"  physics + learned     {after:6.3f} °C")
    print(f"  error reduced by      {(1 - after / before) * 100:5.1f}%\n")


if __name__ == "__main__":
    main()

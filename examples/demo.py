"""Counterfactual sweep: how does the room respond to different controls?

Run:  python examples/demo.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from wm import one_room, summarise
from wm.plot import ascii_plot


def main() -> None:
    print("\n=== Baseline: thermostat holding 22 C ===")
    trace = one_room(ahu_mode="thermostat", room_setpoint=22.0).run(24 * 3600, dt=60)
    print(ascii_plot(trace.hours, trace["room.T"], label="  room.T", y_unit="C"))
    print("  " + str(summarise(trace)))

    print("\n=== Counterfactual: fixed supply air, swept ===")
    print(f"  {'supply':>8}  {'end T':>7}  {'comfort':>8}  {'energy':>10}")
    for supply in (20.0, 18.0, 16.0, 14.0):
        s = summarise(one_room(ahu_mode="fixed", supply_setpoint=supply).run(24 * 3600))
        print(
            f"  {supply:>6.0f}C  {s.t_final:>6.1f}C  "
            f"{s.comfort_fraction * 100:>6.0f}%  {s.hvac_energy_kwh:>7.2f} kWh"
        )

    print("\n=== Counterfactual: air-handler size (setpoint 22 C) ===")
    print(f"  {'flow':>8}  {'comfort':>8}  {'peak':>8}")
    for mdot in (0.03, 0.06, 0.10, 0.20):
        s = summarise(one_room(m_dot=mdot, room_setpoint=22.0).run(24 * 3600))
        print(f"  {mdot:>6.2f}kg/s  {s.comfort_fraction * 100:>6.0f}%  {s.peak_hvac_kw:>5.2f} kW")
    print()


if __name__ == "__main__":
    main()

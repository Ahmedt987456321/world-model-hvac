"""Command line: press play, watch the next N hours of the room unfold.

    python -m wm.cli                       # 24 h, thermostat control
    python -m wm.cli --hours 6 --mode fixed --supply 14
    python -m wm.cli --setpoint 21 --mdot 0.15
"""

from __future__ import annotations

import argparse

from .plot import ascii_plot
from .scenarios import one_room, summarise


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Simulate a room + AHU + weather.")
    ap.add_argument("--hours", type=float, default=24.0, help="simulation length")
    ap.add_argument("--dt", type=float, default=60.0, help="timestep in seconds")
    ap.add_argument(
        "--mode",
        choices=["thermostat", "fixed"],
        default="thermostat",
        help="AHU control mode",
    )
    ap.add_argument("--setpoint", type=float, default=22.0, help="room setpoint [C]")
    ap.add_argument(
        "--supply", type=float, default=16.0, help="fixed supply air temp [C]"
    )
    ap.add_argument("--mdot", type=float, default=0.10, help="supply air flow [kg/s]")
    ap.add_argument("--t0", type=float, default=21.0, help="initial room temp [C]")
    ap.add_argument(
        "--signal",
        default="room.T",
        help="which traced signal to plot (e.g. room.T, weather.T_out, ahu.T_supply)",
    )
    args = ap.parse_args(argv)

    sys = one_room(
        ahu_mode=args.mode,
        room_setpoint=args.setpoint,
        supply_setpoint=args.supply,
        m_dot=args.mdot,
        T0=args.t0,
    )
    trace = sys.run(duration=args.hours * 3600.0, dt=args.dt)

    print()
    print(
        ascii_plot(
            trace.hours,
            trace[args.signal],
            label=f"  {args.signal} over {args.hours:.0f} h "
            f"(AHU: {args.mode}, setpoint {args.setpoint:.0f}°C)",
            y_unit="°C" if args.signal.endswith((".T", ".T_out", ".T_supply")) else "",
        )
    )
    print()
    print("  " + str(summarise(trace)))
    print()
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())

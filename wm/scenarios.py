"""Ready-made worlds and tools for summarising a run.

`one_room()` builds the v0.1 milestone system:

        weather ──T_out──▶ room ◀──Q_hvac── ahu
           │                ▲                 ▲
           └──irradiance────┘                 │
        occupancy ──Q_int──▶ room     room.T ─┘ (thermostat feedback)
"""

from __future__ import annotations

from dataclasses import dataclass

from .core import System, Trace
from .thermal import CP_AIR, AHU, Occupancy, Room, Weather


def one_room(
    *,
    ahu_mode: str = "thermostat",
    room_setpoint: float = 22.0,
    supply_setpoint: float = 16.0,
    m_dot: float = 0.10,
    T0: float = 21.0,
) -> System:
    """The canonical one-room + one-AHU + weather world."""
    sys = System()

    weather = Weather()
    occ = Occupancy()
    ahu = AHU(
        mode=ahu_mode,
        room_setpoint=room_setpoint,
        supply_setpoint=supply_setpoint,
        m_dot=m_dot,
    )
    room = Room(T0=T0)

    # add order fixes output evaluation order: sources -> ahu -> room
    sys.add(weather)
    sys.add(occ)
    sys.add(ahu)
    sys.add(room)

    # wire the signals
    sys.connect("weather.T_out", "room.T_out")
    sys.connect("weather.irradiance", "room.solar")
    sys.connect("occupancy.Q_int", "room.Q_int")
    sys.connect("ahu.Q_hvac", "room.Q_hvac")
    sys.connect("room.T", "ahu.T_room")  # thermostat feedback

    return sys


@dataclass
class Summary:
    """Human-readable digest of a run."""

    hours: float
    t_min: float
    t_max: float
    t_final: float
    comfort_fraction: float   # fraction of time within the comfort band
    hvac_energy_kwh: float    # thermal energy moved by the AHU
    peak_hvac_kw: float       # peak absolute HVAC thermal power

    def __str__(self) -> str:
        return (
            f"over {self.hours:.0f} h  |  "
            f"room T {self.t_min:.1f}–{self.t_max:.1f} °C (end {self.t_final:.1f})  |  "
            f"comfort {self.comfort_fraction * 100:.0f}%  |  "
            f"HVAC {self.hvac_energy_kwh:.2f} kWh, peak {self.peak_hvac_kw:.2f} kW"
        )


def summarise(
    trace: Trace,
    *,
    comfort_band: tuple[float, float] = (20.0, 24.0),
    room_signal: str = "room.T",
    hvac_signal: str = "ahu.Q_hvac",
) -> Summary:
    T = trace[room_signal]
    n = len(T)
    lo, hi = comfort_band
    in_band = sum(1 for x in T if lo <= x <= hi)

    # trapezoidal integral of |Q_hvac| over time -> thermal energy [J] -> kWh
    q = [abs(x) for x in trace[hvac_signal]]
    ts = trace.t
    energy_j = 0.0
    for i in range(1, len(ts)):
        energy_j += 0.5 * (q[i] + q[i - 1]) * (ts[i] - ts[i - 1])

    return Summary(
        hours=(ts[-1] - ts[0]) / 3600.0,
        t_min=min(T),
        t_max=max(T),
        t_final=T[-1],
        comfort_fraction=in_band / n if n else 0.0,
        hvac_energy_kwh=energy_j / 3.6e6,
        peak_hvac_kw=max(q) / 1000.0 if q else 0.0,
    )


__all__ = ["one_room", "summarise", "Summary", "CP_AIR"]

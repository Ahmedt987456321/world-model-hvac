"""Thermal building components: weather, occupancy, room, air handler.

The physics is deliberately the simplest thing that is still *correct* and
*interpretable*: a single-zone lumped-capacitance (RC) room driven by an
envelope conductance, internal gains, solar gains, and conditioned supply air.

Room energy balance:

    C dT/dt = Q_env + Q_hvac + Q_int + Q_solar

    Q_env   = UA (T_out - T)                      envelope conduction  [W]
    Q_hvac  = m_dot * cp_air * (T_supply - T)     conditioned supply air [W]
    Q_int   = n_people * gain_per_person          internal (people) gains [W]
    Q_solar = solar aperture * irradiance         solar gains [W]

All units SI: temperatures in degrees Celsius, power in watts, time in seconds,
energy in joules.
"""

from __future__ import annotations

import math

from .core import Bus, Component

CP_AIR = 1005.0  # specific heat of air, J/(kg*K)

SECONDS_PER_HOUR = 3600.0
SECONDS_PER_DAY = 86400.0


def _hour_of_day(t: float) -> float:
    """Local clock hour in [0, 24) for absolute simulation time `t` (seconds)."""
    return (t % SECONDS_PER_DAY) / SECONDS_PER_HOUR


class Weather(Component):
    """Outdoor conditions as a smooth diurnal cycle.

    Outdoor air temperature follows a sinusoid with its minimum before dawn and
    its maximum in mid-afternoon. Solar irradiance on the room's aperture is a
    clipped sine over the daylight window.
    """

    def __init__(
        self,
        name: str = "weather",
        t_mean: float = 12.0,       # mean outdoor temperature [C]
        t_swing: float = 7.0,       # peak-to-mean amplitude [C]
        t_peak_hour: float = 15.0,  # hour of warmest outdoor temperature
        solar_peak: float = 600.0,  # peak solar irradiance on aperture [W/m^2]
        sunrise: float = 6.0,
        sunset: float = 19.0,
    ):
        super().__init__(
            name,
            t_mean=t_mean,
            t_swing=t_swing,
            t_peak_hour=t_peak_hour,
            solar_peak=solar_peak,
            sunrise=sunrise,
            sunset=sunset,
        )

    def outputs(self, t: float, bus: Bus) -> dict[str, float]:
        h = _hour_of_day(t)
        # temperature: cosine peaking at t_peak_hour
        phase = 2 * math.pi * (h - self.p("t_peak_hour")) / 24.0
        t_out = self.p("t_mean") + self.p("t_swing") * math.cos(phase)

        # solar: half-sine across the daylight window, zero at night
        sunrise, sunset = self.p("sunrise"), self.p("sunset")
        if sunrise < h < sunset:
            frac = (h - sunrise) / (sunset - sunrise)
            irradiance = self.p("solar_peak") * math.sin(math.pi * frac)
        else:
            irradiance = 0.0
        return {"T_out": t_out, "irradiance": irradiance}


class Occupancy(Component):
    """People present on a daily schedule; each emits sensible heat."""

    def __init__(
        self,
        name: str = "occupancy",
        n_people: float = 4.0,
        gain_per_person: float = 100.0,  # sensible heat per person [W]
        arrive: float = 9.0,
        leave: float = 17.0,
    ):
        super().__init__(
            name,
            n_people=n_people,
            gain_per_person=gain_per_person,
            arrive=arrive,
            leave=leave,
        )

    def outputs(self, t: float, bus: Bus) -> dict[str, float]:
        h = _hour_of_day(t)
        present = self.p("arrive") <= h < self.p("leave")
        n = self.p("n_people") if present else 0.0
        return {"n": n, "Q_int": n * self.p("gain_per_person")}


class AHU(Component):
    """Air-handling unit: delivers supply air to the room.

    Two control modes:

    - "fixed": supply air is held at `supply_setpoint` whenever the unit runs.
    - "thermostat": proportional control. The unit heats or cools the supply
      air to drive the room toward `room_setpoint`, clamped to the coil's
      reachable supply-temperature band [supply_min, supply_max].

    Reads the room temperature off the bus signal named by `room_temp_signal`
    (wired in by the System), so the AHU never needs to know about the Room
    class directly.
    """

    def __init__(
        self,
        name: str = "ahu",
        mode: str = "thermostat",
        m_dot: float = 0.10,          # supply air mass flow [kg/s]
        supply_setpoint: float = 16.0,
        room_setpoint: float = 22.0,
        kp: float = 2.0,              # proportional gain [C supply per C error]
        supply_min: float = 12.0,
        supply_max: float = 40.0,
        room_temp_signal: str = "ahu.T_room",
    ):
        super().__init__(
            name,
            m_dot=m_dot,
            supply_setpoint=supply_setpoint,
            room_setpoint=room_setpoint,
            kp=kp,
            supply_min=supply_min,
            supply_max=supply_max,
        )
        self.mode = mode
        self.room_temp_signal = room_temp_signal

    def outputs(self, t: float, bus: Bus) -> dict[str, float]:
        t_room = bus.get(self.room_temp_signal, self.p("room_setpoint"))

        if self.mode == "fixed":
            t_supply = self.p("supply_setpoint")
        else:  # thermostat: proportional around the room setpoint
            error = self.p("room_setpoint") - t_room
            t_supply = self.p("room_setpoint") + self.p("kp") * error
            t_supply = max(self.p("supply_min"), min(self.p("supply_max"), t_supply))

        # thermal power delivered to the room by the supply air stream
        q_hvac = self.p("m_dot") * CP_AIR * (t_supply - t_room)
        return {"T_supply": t_supply, "Q_hvac": q_hvac}


class Room(Component):
    """A single thermal zone (lumped capacitance).

    State: `T`, the zone air/mass temperature [C].
    Inputs (read off the bus, wired by the System):
        `<room>.T_out`   outdoor temperature       [C]
        `<room>.Q_hvac`  power from supply air      [W]
        `<room>.Q_int`   internal gains             [W]
        `<room>.solar`   solar irradiance           [W/m^2]
    """

    state_vars = ("T",)

    def __init__(
        self,
        name: str = "room",
        C: float = 3.0e5,             # effective thermal capacitance [J/K]
        UA: float = 30.0,             # envelope conductance [W/K]
        solar_aperture: float = 0.5,  # effective solar-collecting area [m^2]
        hidden_gain: float = 0.0,     # unmodelled constant load [W] (see learn.py)
        T0: float = 21.0,             # initial temperature [C]
    ):
        super().__init__(
            name, C=C, UA=UA, solar_aperture=solar_aperture, hidden_gain=hidden_gain
        )
        self.state["T"] = T0
        # Optional learned residual: a callable(ctx) -> extra power [W], where
        # ctx = {T, T_out, irr, Q_int, Q_hvac}. This is the f_learned slot; the
        # pure-physics model leaves it None. See wm/learn.py.
        self.residual = None

    def outputs(self, t: float, bus: Bus) -> dict[str, float]:
        # publish the individual heat flows so they can be traced / inspected
        T = self.state["T"]
        t_out = bus.get(f"{self.name}.T_out", T)
        q_env = self.p("UA") * (t_out - T)
        q_hvac = bus.get(f"{self.name}.Q_hvac", 0.0)
        q_int = bus.get(f"{self.name}.Q_int", 0.0)
        irr = bus.get(f"{self.name}.solar", 0.0)
        q_solar = self.p("solar_aperture") * irr
        q_hidden = self.p("hidden_gain")  # 0 for the model; nonzero in "reality"
        q_res = 0.0
        if self.residual is not None:
            q_res = self.residual(
                {"T": T, "T_out": t_out, "irr": irr, "Q_int": q_int, "Q_hvac": q_hvac}
            )
        q_total = q_env + q_hvac + q_int + q_solar + q_hidden + q_res
        return {
            "Q_env": q_env,
            "Q_solar": q_solar,
            "Q_learned": q_res,
            "Q_total": q_total,
        }

    def deriv(self, t: float, bus: Bus) -> dict[str, float]:
        # reuse the flows published in outputs (already on the bus this step)
        q_total = bus.get(f"{self.name}.Q_total")
        if q_total is None:
            # outputs not yet on the bus (shouldn't happen given eval order),
            # recompute defensively
            q_total = self.outputs(t, bus)["Q_total"]
        return {"T": q_total / self.p("C")}

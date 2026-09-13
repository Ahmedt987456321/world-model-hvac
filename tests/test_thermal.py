"""Physics regression tests.

The important test is `test_envelope_matches_analytic`: with only the envelope
active, the room is a first-order linear system whose exact solution we know, so
we can check the integrator against real mathematics rather than a golden file.
"""

import math

from wm import Room, System, Weather, one_room, summarise


def _envelope_only_system(T0: float, T_out: float, UA: float, C: float) -> System:
    """Room relaxing toward a constant outdoor temperature, nothing else."""
    sys = System()
    # constant weather: zero swing, no sun
    sys.add(Weather(t_mean=T_out, t_swing=0.0, solar_peak=0.0))
    sys.add(Room(C=C, UA=UA, solar_aperture=0.0, T0=T0))
    sys.connect("weather.T_out", "room.T_out")
    return sys


def test_envelope_matches_analytic():
    T0, T_out, UA, C = 25.0, 10.0, 30.0, 3.0e5
    sys = _envelope_only_system(T0, T_out, UA, C)
    trace = sys.run(duration=6 * 3600, dt=30.0)

    tau = C / UA  # time constant [s]
    for t, T in zip(trace.t, trace["room.T"]):
        analytic = T_out + (T0 - T_out) * math.exp(-t / tau)
        assert abs(T - analytic) < 1e-3, f"t={t}: {T} vs {analytic}"


def test_relaxes_toward_outdoor():
    # with no HVAC/gains the room must approach outdoor temperature, monotonically
    sys = _envelope_only_system(T0=25.0, T_out=10.0, UA=30.0, C=3.0e5)
    T = sys.run(duration=24 * 3600, dt=60.0)["room.T"]
    assert T[0] > T[-1] > 10.0
    assert all(a >= b - 1e-9 for a, b in zip(T, T[1:]))  # non-increasing
    assert abs(T[-1] - 10.0) < 1.0  # close to outdoor after a day


def test_thermostat_holds_comfort_band():
    trace = one_room(ahu_mode="thermostat", room_setpoint=22.0).run(24 * 3600, dt=60.0)
    s = summarise(trace, comfort_band=(20.0, 24.0))
    assert s.comfort_fraction > 0.9  # spends nearly all day comfortable
    assert 19.0 < s.t_min and s.t_max < 25.0


def test_colder_supply_gives_colder_room():
    warm = summarise(one_room(ahu_mode="fixed", supply_setpoint=18.0).run(24 * 3600))
    cold = summarise(one_room(ahu_mode="fixed", supply_setpoint=14.0).run(24 * 3600))
    assert cold.t_final < warm.t_final
    assert cold.t_max <= warm.t_max


def test_deterministic():
    a = one_room().run(12 * 3600, dt=60.0)["room.T"]
    b = one_room().run(12 * 3600, dt=60.0)["room.T"]
    assert a == b


def test_more_airflow_tracks_setpoint_better():
    # a bigger air handler should hold the room closer to setpoint
    weak = summarise(one_room(m_dot=0.03, room_setpoint=22.0).run(24 * 3600))
    strong = summarise(one_room(m_dot=0.20, room_setpoint=22.0).run(24 * 3600))
    assert strong.comfort_fraction >= weak.comfort_fraction

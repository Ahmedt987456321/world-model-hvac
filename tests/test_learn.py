"""Tests for the Stage-3 learned residual.

These pin the central claim: fitting a residual against reality (a) recovers the
hidden physical parameters, and (b) makes the forward model track reality far
better than physics alone.
"""

from wm.learn import MODEL, TRUE, learn, make_model_system, make_true_system
from wm.thermal import Room


def test_residual_recovers_hidden_parameters():
    fit, _, _ = learn(hours=48, dt=60)
    # the fitted coefficients should read out the true minus model gaps
    assert abs(fit.b0 - TRUE["hidden_gain"]) < 15                       # ~150 W
    assert abs(fit.b1 - (TRUE["UA"] - MODEL["UA"])) < 1.5              # ~15 W/K
    assert abs(fit.b2 - (TRUE["solar_aperture"] - MODEL["solar_aperture"])) < 0.15  # ~0.7 m^2


def test_hybrid_beats_physics_only():
    _, before, after = learn(hours=48, dt=60)
    assert before > 0.5          # pure physics is meaningfully wrong
    assert after < 0.1           # hybrid is close to reality
    assert after < before * 0.2  # at least a 5x improvement


def test_pure_model_diverges_from_reality():
    # without the residual, the two worlds must actually differ over the day
    # (the endpoint alone can converge once the thermostat settles both)
    true = make_true_system().run(24 * 3600, 60)["room.T"]
    model = make_model_system().run(24 * 3600, 60)["room.T"]
    max_gap = max(abs(a - b) for a, b in zip(true, model))
    assert max_gap > 0.5


def test_residual_defaults_off():
    # a plain room carries no learned term and no hidden gain
    r = Room()
    assert r.residual is None
    assert r.p("hidden_gain") == 0.0

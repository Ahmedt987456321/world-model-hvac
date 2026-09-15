"""Stage 3: learn where the physics is wrong.

The premise of a *learnable* world model: our equations are a prior, not the
truth. We point the model at a real building, watch it, and let it discover the
dynamics the equations missed.

Here "reality" is a second copy of the same engine with dynamics the model does
not know about:

    hidden constant load   +150 W   (servers, appliances — unmetered)
    leakier envelope       UA 45 vs the model's 30 W/K
    larger solar aperture  1.2 vs the model's 0.5 m^2

The model, run on its own, mispredicts. We measure the one-step prediction error
against reality and fit a **learned residual** — a small linear correction in
physically-meaningful features — that recovers the missing physics:

    residual_power = b0 + b1 (T_out - T) + b2 * irradiance
                     └ hidden ┘ └ ΔUA ┘      └ Δaperture ┘

Slot that residual back into the model (Room.residual) and the hybrid model
    x_{t+1} = f_physics(x_t, u_t) + f_learned(x_t, u_t)
tracks reality far better than the physics alone — and the fitted coefficients
read out the hidden parameters directly.

No dependencies: the least-squares fit is solved by hand (3x3 normal equations).
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from .core import System
from .scenarios import one_room

# the "reality" the model is not told about
TRUE = {"UA": 45.0, "solar_aperture": 1.2, "hidden_gain": 150.0}
MODEL = {"UA": 30.0, "solar_aperture": 0.5, "hidden_gain": 0.0}


def _room(sys: System):
    for c in sys.components:
        if c.name == "room":
            return c
    raise LookupError("no room in system")


def make_true_system() -> System:
    """A one-room world with hidden dynamics the model does not know."""
    sys = one_room()
    r = _room(sys)
    r.params.update(TRUE)
    return sys


def make_model_system() -> System:
    """The model's belief: the default physics, wrong about the hidden dynamics."""
    sys = one_room()
    r = _room(sys)
    r.params.update(MODEL)
    return sys


@dataclass
class Fit:
    b0: float  # hidden constant load [W]
    b1: float  # missing envelope conductance [W/K]
    b2: float  # missing solar aperture [m^2]

    def as_residual(self):
        b0, b1, b2 = self.b0, self.b1, self.b2
        return lambda ctx: b0 + b1 * (ctx["T_out"] - ctx["T"]) + b2 * ctx["irr"]

    def __str__(self) -> str:
        return (
            f"discovered:  hidden load {self.b0:+.0f} W   "
            f"extra UA {self.b1:+.1f} W/K   extra aperture {self.b2:+.2f} m²"
        )


def collect_residuals(hours: float = 48, dt: float = 60.0):
    """Teacher-forced one-step errors of the model against reality.

    For each observed step we compare the true rate of change (finite difference
    of the observed temperature) with the rate the *model's* physics predicts
    from the same observed state and inputs. The gap, expressed as power, is the
    residual we want to learn. Returns (features, targets) with
    features = [1, (T_out - T), irradiance].
    """
    true = make_true_system()
    trace = true.run(hours * 3600, dt)  # this is "reality"

    C = _room(make_model_system()).p("C")
    ua_m, ap_m = MODEL["UA"], MODEL["solar_aperture"]

    T = trace["room.T"]
    feats, targets = [], []
    for i in range(len(trace.t) - 1):
        Ti = T[i]
        Tout = trace["weather.T_out"][i]
        irr = trace["weather.irradiance"][i]
        q_hvac = trace["ahu.Q_hvac"][i]
        q_int = trace["occupancy.Q_int"][i]

        true_rate = (T[i + 1] - T[i]) / dt              # observed dT/dt
        model_power = ua_m * (Tout - Ti) + q_hvac + q_int + ap_m * irr
        model_rate = model_power / C
        residual_power = C * (true_rate - model_rate)   # what the model missed

        feats.append((1.0, Tout - Ti, irr))
        targets.append(residual_power)
    return feats, targets


def _solve3(A, b):
    """Solve a 3x3 linear system by Gaussian elimination with partial pivoting."""
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    n = 3
    for col in range(n):
        piv = max(range(col, n), key=lambda r: abs(M[r][col]))
        M[col], M[piv] = M[piv], M[col]
        pv = M[col][col]
        for r in range(n):
            if r == col:
                continue
            f = M[r][col] / pv
            M[r] = [M[r][k] - f * M[col][k] for k in range(n + 1)]
    return [M[i][n] / M[i][i] for i in range(n)]


def fit_residual(feats, targets) -> Fit:
    """Ordinary least squares via the normal equations (X^T X) b = X^T y."""
    p = 3
    XtX = [[0.0] * p for _ in range(p)]
    Xty = [0.0] * p
    for x, y in zip(feats, targets):
        for a in range(p):
            Xty[a] += x[a] * y
            for c in range(p):
                XtX[a][c] += x[a] * x[c]
    b0, b1, b2 = _solve3(XtX, Xty)
    return Fit(b0=b0, b1=b1, b2=b2)


def trajectory_rmse(hours: float = 48, dt: float = 60.0, fit: Fit | None = None):
    """RMSE of a forward-simulated model against reality (not teacher-forced).

    Runs reality and the model from the same initial state. If `fit` is given,
    the model carries the learned residual (the hybrid model).
    """
    true = make_true_system()
    model = make_model_system()
    if fit is not None:
        _room(model).residual = fit.as_residual()
    tr_true = true.run(hours * 3600, dt)
    tr_model = model.run(hours * 3600, dt)
    a, b = tr_true["room.T"], tr_model["room.T"]
    n = min(len(a), len(b))
    se = sum((a[i] - b[i]) ** 2 for i in range(n))
    return math.sqrt(se / n)


def learn(hours: float = 48, dt: float = 60.0):
    """Full Stage-3 loop: observe, fit the residual, measure the improvement."""
    feats, targets = collect_residuals(hours, dt)
    fit = fit_residual(feats, targets)
    before = trajectory_rmse(hours, dt, fit=None)
    after = trajectory_rmse(hours, dt, fit=fit)
    return fit, before, after


__all__ = [
    "make_true_system", "make_model_system", "collect_residuals",
    "fit_residual", "trajectory_rmse", "learn", "Fit", "TRUE", "MODEL",
]

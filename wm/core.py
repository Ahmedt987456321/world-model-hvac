"""Core world-model engine.

A tiny, honest simulation engine. You describe a physical system as a set of
`Component`s wired together, and the `System` compiles that into one coupled
system of ordinary differential equations and integrates it forward in time.

The design goal is *composition*: a room does not know what an air handler is,
and neither knows what the weather is. They only read named signals off a shared
bus. That is what lets the canvas (later) act as a compiler for physical worlds —
draw a box, wire a line, and the equations assemble themselves.

Nothing here is HVAC-specific. The thermal components live in `thermal.py`.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

# A "bus" is the flat namespace of signals available at an instant in time:
#   every component's current state variables, plus every output computed so far.
# Signals are addressed as "component.port", e.g. "room.T" or "weather.T_out".
Bus = dict[str, float]


class Component:
    """A physical (or logical) part of the world.

    Subclasses define behaviour by overriding `outputs` and/or `deriv`.
    A component with continuous state (a room's temperature) overrides `deriv`.
    A component that is a pure function of time and its inputs (the weather,
    a controller) overrides only `outputs`.
    """

    #: default names of this component's continuous state variables
    state_vars: tuple[str, ...] = ()

    def __init__(self, name: str, **params: float):
        self.name = name
        self.params = params
        # continuous state, keyed by the *bare* variable name (e.g. "T")
        self.state: dict[str, float] = {}

    # -- behaviour -----------------------------------------------------------

    def outputs(self, t: float, bus: Bus) -> dict[str, float]:
        """Algebraic outputs at time `t`, given signals already on the bus.

        Return a mapping of bare port name -> value. These are published to the
        bus as "self.name.port".
        """
        return {}

    def deriv(self, t: float, bus: Bus) -> dict[str, float]:
        """Time derivatives of this component's state variables at time `t`.

        Return a mapping of bare state-var name -> d/dt. Only meaningful for
        components that declare `state_vars`.
        """
        return {}

    # -- convenience ---------------------------------------------------------

    def p(self, key: str) -> float:
        """Read a parameter."""
        return self.params[key]

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"{type(self).__name__}({self.name!r})"


@dataclass
class Connection:
    """Wire a source signal into a destination component's input port.

    `dst` is written to the bus as "dst_component.dst_port" before each
    evaluation, taking the current value of `src` ("src_component.src_port").
    """

    src: str  # "component.port"
    dst: str  # "component.port"


@dataclass
class Trace:
    """The recorded history of a simulation run."""

    t: list[float] = field(default_factory=list)  # seconds
    signals: dict[str, list[float]] = field(default_factory=dict)

    def record(self, t: float, bus: Bus) -> None:
        self.t.append(t)
        for k, v in bus.items():
            self.signals.setdefault(k, []).append(v)

    @property
    def hours(self) -> list[float]:
        return [x / 3600.0 for x in self.t]

    def __getitem__(self, key: str) -> list[float]:
        return self.signals[key]

    def keys(self):
        return self.signals.keys()


class System:
    """A compiled world: components + connections, integrated over time.

    Components are evaluated in the order they were added. A component's
    `outputs` may read any signal already published this step — the states of
    all components (available from the start of the step) and the outputs of
    components added before it. This means feedback through a *state* (a
    controller reading the room temperature) is fine, while a pure algebraic
    loop would require ordering the two components correctly. For the building
    example there are no algebraic loops.
    """

    def __init__(self) -> None:
        self.components: list[Component] = []
        self.connections: list[Connection] = []

    # -- construction --------------------------------------------------------

    def add(self, component: Component) -> Component:
        self.components.append(component)
        return component

    def connect(self, src: str, dst: str) -> None:
        self.connections.append(Connection(src=src, dst=dst))

    # -- state <-> vector marshalling ---------------------------------------

    def _state_index(self) -> list[tuple[Component, str]]:
        idx: list[tuple[Component, str]] = []
        for c in self.components:
            for v in c.state_vars:
                idx.append((c, v))
        return idx

    def _get_state_vector(self) -> list[float]:
        return [c.state[v] for c, v in self._state_index()]

    def _set_state_vector(self, x: list[float]) -> None:
        for (c, v), value in zip(self._state_index(), x):
            c.state[v] = value

    # -- evaluation ----------------------------------------------------------

    def _build_bus(self, t: float) -> Bus:
        """Publish every component's current state, then evaluate outputs in
        order, applying connections just before each component sees the bus."""
        bus: Bus = {}
        for c in self.components:
            for v in c.state_vars:
                bus[f"{c.name}.{v}"] = c.state[v]

        for c in self.components:
            # apply any connections whose destination is this component
            for conn in self.connections:
                comp_name = conn.dst.split(".", 1)[0]
                if comp_name == c.name and conn.src in bus:
                    bus[conn.dst] = bus[conn.src]
            out = c.outputs(t, bus)
            for port, value in out.items():
                bus[f"{c.name}.{port}"] = value
        return bus

    def _deriv_vector(self, t: float, x: list[float]) -> list[float]:
        self._set_state_vector(x)
        bus = self._build_bus(t)
        dstate: list[float] = []
        for c in self.components:
            d = c.deriv(t, bus) if c.state_vars else {}
            for v in c.state_vars:
                dstate.append(d.get(v, 0.0))
        return dstate

    # -- integration ---------------------------------------------------------

    def step_rk4(self, t: float, dt: float) -> None:
        """Advance the whole system by one classical Runge-Kutta 4 step."""
        x0 = self._get_state_vector()

        def add(a, b, s):
            return [ai + s * bi for ai, bi in zip(a, b)]

        k1 = self._deriv_vector(t, x0)
        k2 = self._deriv_vector(t + dt / 2, add(x0, k1, dt / 2))
        k3 = self._deriv_vector(t + dt / 2, add(x0, k2, dt / 2))
        k4 = self._deriv_vector(t + dt, add(x0, k3, dt))
        x1 = [
            xi + (dt / 6.0) * (a + 2 * b + 2 * c + d)
            for xi, a, b, c, d in zip(x0, k1, k2, k3, k4)
        ]
        self._set_state_vector(x1)

    def run(
        self,
        duration: float,
        dt: float = 60.0,
        t0: float = 0.0,
        on_step: Callable[[float, Bus], None] | None = None,
    ) -> Trace:
        """Roll the world forward `duration` seconds from `t0`.

        Returns a `Trace` sampled once per step (including the initial state).
        """
        trace = Trace()
        t = t0
        # record the initial condition
        bus = self._build_bus(t)
        trace.record(t, bus)
        if on_step:
            on_step(t, bus)

        n = int(round(duration / dt))
        for _ in range(n):
            self.step_rk4(t, dt)
            t += dt
            bus = self._build_bus(t)
            trace.record(t, bus)
            if on_step:
                on_step(t, bus)
        return trace

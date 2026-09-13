# world-model-hvac

A learnable world-model builder for physical systems. **Domain #1: buildings + HVAC.**

Draw a room, an air handler, and the weather. Press play. Watch the next 24 hours
of the room's physical state unfold.

```
                         PHYSICAL WORLD
     Weather         Building          HVAC           Occupants
        └────────────────┴───────────────┴────────────────┘
                                 │
                                 ▼
                    ┌───────────────────────┐
                    │   BUILDING WORLD      │
                    │        MODEL          │
                    │  geometry · physics   │
                    │  equipment · sensors  │
                    │  actions  · dynamics  │
                    └───────────┬───────────┘
                                ▼
                         IMAGINE FUTURES
                   "What happens if I do X?"
                     predict · plan · control
```

This is the embryo of a larger idea: a visual canvas that acts as a **compiler
for physical worlds**. You compose components; the software assembles the
corresponding dynamical system; you simulate it, compare its predictions to
reality, and eventually let it *learn where its own physics is wrong* and use
that model to plan and control.

HVAC is merely the first domain. The engine (`wm/core.py`) knows nothing about
buildings.

## The milestone this repo delivers

> Build one room + one AHU + the weather → press play → correctly predict the
> room's temperature over the next 24 hours.

That works today, with zero dependencies:

```bash
python -m wm.cli --hours 24
```

```
  room.T over 24 h (AHU: thermostat, setpoint 22°C)
  23.8 │                                 ••••••••
       │                             ••••        ••••
       │                          •                   •
  22.1 │                                               •
       │                    ••                          ••••
       │•                 ••                                ••••
  20.5 │   ••••••••••••
       └────────────────────────────────────────────────────────────
        0h                                                      24h

  over 24 h | room T 20.5–23.8 °C (end 20.7) | comfort 100% | HVAC 8.62 kWh
```

Overnight the room drifts down; internal gains and the afternoon sun push it up
through the occupied hours; it peaks mid-afternoon and settles. Every number is a
consequence of the physics, not a script.

## The visual canvas (Stage 2)

`canvas/index.html` is a single, dependency-free page that **is** the simulator,
not a picture of one. Drag Room / Air handler / Weather / Occupancy boxes, wire
their ports together, edit each component's physics in the inspector, and press
**Play** to watch 24 hours unfold — the room temperature animating on every node
and on the chart, with live comfort, energy and peak-power readouts.

```bash
# open it locally
python -m http.server -d canvas 8000   # then visit http://localhost:8000
# ...or just double-click canvas/index.html
```

It runs a **JavaScript port of the exact `wm/` engine** — same RK4 integrator,
same equations, same constants. The port is verified to reproduce the Python
results to the digit (thermostat: 100% comfort, 8.62 kWh; fixed 16°C: 28%, 6.41
kWh; fixed 14°C: 13%, 6.50 kWh). The canvas and the library are one physics, two
front ends.

## The physics

A single-zone lumped-capacitance (RC) room:

```
C dT/dt = UA(T_out − T) + ṁ·cp·(T_supply − T) + Q_internal + Q_solar
          └── envelope ─┘  └──── conditioned air ────┘  └── gains ──┘
```

- **Weather** — diurnal outdoor temperature + a solar profile
- **Occupancy** — people on a schedule, each emitting sensible heat
- **AHU** — supplies air at a controlled temperature (fixed, or a proportional
  thermostat) at a chosen mass flow
- **Room** — the one stateful component; its temperature is integrated with RK4

Correctness is pinned by tests: with only the envelope active the room is a
first-order linear system, and the integrator matches its exact analytic
solution to < 0.001 °C (`tests/test_thermal.py`).

## Ask counterfactuals

```python
from wm import one_room, summarise

for supply in (16.0, 14.0):
    trace = one_room(ahu_mode="fixed", supply_setpoint=supply).run(24 * 3600, dt=60)
    print(f"supply={supply}°C  ->  {summarise(trace)}")
```

Lower the supply temperature and the room gets colder, comfort drops, and peak
power rises — the model reasons about a future that never happened.

## How the engine works

You describe a world as **components wired together**:

```python
from wm import System, Weather, Occupancy, AHU, Room

sys = System()
sys.add(Weather()); sys.add(Occupancy()); sys.add(AHU()); sys.add(Room())
sys.connect("weather.T_out", "room.T_out")
sys.connect("ahu.Q_hvac",    "room.Q_hvac")
sys.connect("room.T",        "ahu.T_room")   # thermostat feedback
trace = sys.run(duration=24 * 3600, dt=60)
```

Each component publishes named signals onto a shared bus; connections route one
component's output into another's input. The `System` marshals every
component's state into one vector and integrates the coupled ODEs. A room does
not import an AHU — that decoupling is what makes a future drag-and-drop canvas
possible.

## Roadmap

| Stage | What | Status |
|---|---|---|
| 1 | Room + HVAC + weather simulator | ✅ this repo |
| 2 | Visual drag-and-drop world builder over the same engine | ✅ `canvas/` |
| 3 | Learn model error from real sensor data (hybrid physics + learned residual) | research |
| 4 | Plan / control a real building safely | long horizon |

Stage 3 is the interesting one:

```
x_{t+1} = f_physics(x_t, u_t) + f_learned(x_t, u_t)
                                 └── the part the equations got wrong ──┘
```

The engine is structured so a learned residual slots in as just another term in
`Room.deriv`.

## Quickstart

```bash
python -m wm.cli --hours 24                       # thermostat, 24 h
python -m wm.cli --hours 6 --mode fixed --supply 14
python -m wm.cli --signal weather.T_out           # plot any traced signal
python examples/demo.py                            # counterfactual sweep
```

Pure standard-library Python (3.10+). No dependencies required to run.

## Licence

MIT.

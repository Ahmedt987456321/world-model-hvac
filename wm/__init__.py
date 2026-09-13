"""world-model-hvac: a learnable world-model builder for physical systems.

Domain #1 is buildings + HVAC. The public surface is intentionally small:

    from wm import one_room, summarise
    sys = one_room()
    trace = sys.run(duration=24 * 3600, dt=60)
    print(summarise(trace))
"""

from .core import Component, Connection, System, Trace
from .scenarios import Summary, one_room, summarise
from .thermal import AHU, Occupancy, Room, Weather

__version__ = "0.1.0"

__all__ = [
    "Component",
    "Connection",
    "System",
    "Trace",
    "Weather",
    "Occupancy",
    "AHU",
    "Room",
    "one_room",
    "summarise",
    "Summary",
]

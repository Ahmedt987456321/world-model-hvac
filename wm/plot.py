"""Zero-dependency ASCII line plotting, so `Run` works in any terminal.

This is not meant to be pretty analytics; it is meant to make the milestone
tangible without pulling in matplotlib. A single series is drawn as a sparkline
grid with labelled y-axis and an x-axis in hours.
"""

from __future__ import annotations


def ascii_plot(
    xs: list[float],
    ys: list[float],
    *,
    height: int = 14,
    width: int = 64,
    label: str = "",
    y_unit: str = "",
) -> str:
    if not ys:
        return "(no data)"

    y_min, y_max = min(ys), max(ys)
    if y_max - y_min < 1e-9:
        y_max = y_min + 1.0  # avoid a flat, zero-height axis

    # resample the series onto `width` columns by nearest index
    n = len(ys)
    cols: list[float] = []
    for c in range(width):
        i = round(c * (n - 1) / (width - 1)) if width > 1 else 0
        cols.append(ys[i])

    def row_for(value: float) -> int:
        frac = (value - y_min) / (y_max - y_min)
        return int(round((height - 1) * (1 - frac)))

    grid = [[" "] * width for _ in range(height)]
    for c, v in enumerate(cols):
        grid[row_for(v)][c] = "•"

    lines: list[str] = []
    if label:
        lines.append(label)
    for r in range(height):
        # y label on the rows that mark the top, middle, and bottom
        if r == 0:
            tag = f"{y_max:6.1f}"
        elif r == height - 1:
            tag = f"{y_min:6.1f}"
        elif r == height // 2:
            tag = f"{(y_min + y_max) / 2:6.1f}"
        else:
            tag = " " * 6
        lines.append(f"{tag} │{''.join(grid[r])}")

    x_min, x_max = xs[0], xs[-1]
    axis = " " * 6 + " └" + "─" * width
    ticks = " " * 8 + f"{x_min:.0f}h" + " " * (width - 8) + f"{x_max:.0f}h"
    lines.append(axis)
    lines.append(ticks)
    if y_unit:
        lines.append(" " * 8 + f"(y: {y_unit})")
    return "\n".join(lines)

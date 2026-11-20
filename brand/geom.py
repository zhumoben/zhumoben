"""Shared vector primitives: one geometry definition -> SVG path data + PNG raster.

Kept dependency-light (Pillow only) so the preview sheet and the shipped SVGs
can never drift apart.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

from PIL import Image, ImageDraw

SS = 8  # supersampling factor for raster previews


# ---------------------------------------------------------------- primitives
@dataclass
class Stroke:
    pts: list[tuple[float, float]]
    w: float = 2.0
    closed: bool = False
    cap_round: bool = True


@dataclass
class Fill:
    pts: list[tuple[float, float]]


@dataclass
class Dot:
    cx: float
    cy: float
    r: float


@dataclass
class FillHoles:
    """Solid shape with knocked-out holes (even-odd)."""

    outer: list[tuple[float, float]]
    holes: list[list[tuple[float, float]]] = field(default_factory=list)


@dataclass
class Group:
    """A drawing is a list of primitives sharing one ink colour."""

    items: list = field(default_factory=list)


def bez(p0, p1, p2, p3, n=24):
    out = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        out.append(
            (
                u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1],
            )
        )
    return out


def rounded_rect(x, y, w, h, r, n=10):
    """Closed polyline for a rounded rectangle."""
    pts = []
    corners = [
        (x + r, y + r, 180, 270),
        (x + w - r, y + r, 270, 360),
        (x + w - r, y + h - r, 0, 90),
        (x + r, y + h - r, 90, 180),
    ]
    for cx, cy, a0, a1 in corners:
        for i in range(n + 1):
            a = math.radians(a0 + (a1 - a0) * i / n)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


# ---------------------------------------------------------------- svg emit
def _num(v: float) -> str:
    return f"{v:.2f}".rstrip("0").rstrip(".")


def to_svg(group: Group, ctx: list[tuple[float, float]] | None = None) -> str:
    out = []
    for it in group.items:
        if isinstance(it, Stroke):
            pts = list(it.pts) + ([it.pts[0]] if it.closed else [])
            d = "M" + " ".join(f"{_num(x)} {_num(y)}" for x, y in pts[:1])
            d += " " + " ".join(f"L{_num(x)} {_num(y)}" for x, y in pts[1:])
            out.append(
                f'<path d="{d}" fill="none" stroke="currentColor" stroke-width="{_num(it.w)}" '
                f'stroke-linecap="round" stroke-linejoin="round"/>'
            )
        elif isinstance(it, Fill):
            d = "M" + " ".join(f"{_num(x)} {_num(y)}" for x, y in it.pts) + " Z"
            out.append(f'<path d="{d}" fill="currentColor"/>')
        elif isinstance(it, FillHoles):
            d = "M" + " ".join(f"{_num(x)} {_num(y)}" for x, y in it.outer) + " Z"
            for hole in it.holes:
                d += " M" + " ".join(f"{_num(x)} {_num(y)}" for x, y in hole) + " Z"
            out.append(f'<path d="{d}" fill="currentColor" fill-rule="evenodd"/>')
        elif isinstance(it, Dot):
            out.append(f'<circle cx="{_num(it.cx)}" cy="{_num(it.cy)}" r="{_num(it.r)}" fill="currentColor"/>')
    return "\n  ".join(out)


def wrap_svg(group: Group, size: int = 32, pad: float = 0.0) -> str:
    body = to_svg(group)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" '
        f'width="{size}" height="{size}" fill="none" role="img">\n  {body}\n</svg>\n'
    )


# ---------------------------------------------------------------- raster
def _capsule(draw: ImageDraw.ImageDraw, p, q, w, colour):
    """Round-capped thick segment, width w in the drawing's pixel space."""
    r = w / 2
    draw.line((p[0], p[1], q[0], q[1]), fill=colour, width=max(1, int(round(w))))
    for x, y in (p, q):
        draw.ellipse((x - r, y - r, x + r, y + r), fill=colour)


def raster(group: Group, px: int, colour=(21, 24, 28, 255), ss: int = SS) -> Image.Image:
    big = px * ss
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    k = big / 32.0
    for it in group.items:
        if isinstance(it, Stroke):
            pts = [(x * k, y * k) for x, y in it.pts]
            if it.closed:
                pts = pts + [pts[0]]
            for a, b in zip(pts, pts[1:]):
                _capsule(draw, a, b, it.w * k, colour)
        elif isinstance(it, Fill):
            draw.polygon([(x * k, y * k) for x, y in it.pts], fill=colour)
        elif isinstance(it, FillHoles):
            mask = Image.new("L", (big, big), 0)
            md = ImageDraw.Draw(mask)
            md.polygon([(x * k, y * k) for x, y in it.outer], fill=255)
            for hole in it.holes:
                md.polygon([(x * k, y * k) for x, y in hole], fill=0)
            img.paste(Image.new("RGBA", (big, big), colour), (0, 0), mask)
        elif isinstance(it, Dot):
            cx, cy, r = it.cx * k, it.cy * k, it.r * k
            draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=colour)
    return img.resize((px, px), Image.LANCZOS)

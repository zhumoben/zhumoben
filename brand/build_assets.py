"""Build the 朱墨本 brand mark: one geometry -> SVG (vector) + PNG (preview).

Mark: a solid page with a bookmark ribbon knocked out of its top edge.
One path, even-odd fill, one colour. Legible from 16px to 1024px.

Usage:
    python brand/build_assets.py
"""
from __future__ import annotations

import os

from PIL import Image, ImageDraw, ImageFont

from geom import Fill, FillHoles, Group, Stroke, raster, rounded_rect

OUT = os.path.dirname(os.path.abspath(__file__))

INK = (21, 24, 28, 255)
INK2 = (79, 88, 98, 255)
INK3 = (139, 147, 157, 255)
PAPER = (242, 243, 245, 255)
PAPER_SOFT = (234, 236, 240, 255)
WHITE = (255, 255, 255, 255)
LINE = (227, 230, 234, 255)
ZHU = (176, 64, 58, 255)
DARK = (32, 36, 42, 255)

SERIF = "C:/Windows/Fonts/STSONG.TTF"
UI = "C:/Windows/Fonts/msyh.ttc"
UI_B = "C:/Windows/Fonts/msyhbd.ttc"
MONO = "C:/Windows/Fonts/consola.ttf"

# ------------------------------------------------------------------ geometry
# 32 x 32 grid. Page 13.2 x 19 at (9.4, 6.4), radius 1.5.
# The ribbon notch is cut INTO the top edge of one single contour — never a
# separate hole subpath. A hole that started above the page edge would leave a
# sliver of "counted once" area under even-odd fill: a stray bar above the notch.
PX0, PY0, PX1, PY1, PR = 9.4, 6.4, 22.6, 25.4, 1.5
SLOT_BOTTOM, SLOT_TIP = 13.3, 15.8


def arc(cx: float, cy: float, r: float, a0: float, a1: float, n: int = 10):
    import math

    return [
        (cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / n)))
        for i in range(n + 1)
    ]


def page_outline(width: float = 4.8) -> list[tuple[float, float]]:
    """Page silhouette with the bookmark notch traced as one closed contour."""
    ls, rs = 16 - width / 2, 16 + width / 2
    top_left = arc(PX0 + PR, PY0 + PR, PR, 180, 270)  # (9.4, 7.9) -> (10.9, 6.4)
    top_right = arc(PX1 - PR, PY0 + PR, PR, 270, 360)  # (21.1, 6.4) -> (22.6, 7.9)
    bottom_right = arc(PX1 - PR, PY1 - PR, PR, 0, 90)
    bottom_left = arc(PX0 + PR, PY1 - PR, PR, 90, 180)
    notch = [(ls, PY0), (ls, SLOT_BOTTOM), (16, SLOT_TIP), (rs, SLOT_BOTTOM), (rs, PY0)]
    return top_left + notch + top_right + bottom_right + bottom_left


PAGE = rounded_rect(9.4, 6.4, 13.2, 19.0, 1.5)

MARK = Group([Fill(page_outline(4.8))])
MARK_SMALL = Group([Fill(page_outline(5.2))])


def scaled(group: Group, k: float, c: tuple[float, float] = (16, 16)) -> Group:
    def t(pts):
        return [(c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k) for x, y in pts]

    out = []
    for it in group.items:
        if isinstance(it, FillHoles):
            out.append(FillHoles(t(it.outer), [t(h) for h in it.holes]))
        elif isinstance(it, Fill):
            out.append(Fill(t(it.pts)))
        elif isinstance(it, Stroke):
            out.append(Stroke(t(it.pts), w=it.w * k, closed=it.closed))
    return Group(out)


# favicon plate: same mark, scaled up so it holds its weight in a 16px tab
FAVICON = scaled(MARK, 1.24)

# alternates
ALT_SPINE = Group([FillHoles(PAGE, [[(12.0, 8.0), (13.4, 8.0), (13.4, 23.8), (12.0, 23.8)]])])
ALT_BOOK = Group(
    [
        Fill([(7.8, 6.4), (11.9, 6.4), (11.9, 25.4), (7.8, 25.4)]),
        Stroke([(11.9, 6.4), (22.6, 6.4), (22.6, 25.4), (11.9, 25.4)], closed=True, w=1.9),
    ]
)

MARK_D = (
    "M10.9 6.4H13.6v6.9L16 15.8l2.4-2.5V6.4h2.7A1.5 1.5 0 0 1 22.6 7.9v16"
    "a1.5 1.5 0 0 1-1.5 1.5H10.9a1.5 1.5 0 0 1-1.5-1.5v-16a1.5 1.5 0 0 1 1.5-1.5Z"
)
MARK_SMALL_D = (
    "M10.9 6.4H13.4v6.9L16 15.8l2.6-2.5V6.4h2.5A1.5 1.5 0 0 1 22.6 7.9v16"
    "a1.5 1.5 0 0 1-1.5 1.5H10.9a1.5 1.5 0 0 1-1.5-1.5v-16a1.5 1.5 0 0 1 1.5-1.5Z"
)

SVG_TMPL = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="5 4.6 22 22" width="{w}" height="{w}" role="img" aria-labelledby="zhumoben-mark-title">
  <title id="zhumoben-mark-title">朱墨本</title>
  <path d="{d}" fill="currentColor"/>
</svg>
"""

FAVICON_TMPL = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="{w}" height="{w}" role="img" aria-labelledby="zhumoben-favicon-title">
  <title id="zhumoben-favicon-title">朱墨本</title>
  <style>
    .plate {{ fill: #15181c; }}
    .page {{ fill: #f2f3f5; }}
    @media (prefers-color-scheme: dark) {{
      .plate {{ fill: #f2f3f5; }}
      .page {{ fill: #15181c; }}
    }}
  </style>
  <rect class="plate" width="32" height="32" rx="7"/>
  <g transform="translate(16 16) scale(1.24) translate(-16 -16)">
    <path class="page" d="{d}"/>
  </g>
</svg>
"""


def write_svgs() -> None:
    files = {
        "zhumoben-mark.svg": SVG_TMPL.format(w=32, d=MARK_D),
        "zhumoben-mark-small.svg": SVG_TMPL.format(w=32, d=MARK_SMALL_D),
        "zhumoben-favicon.svg": FAVICON_TMPL.format(w=32, d=MARK_D),
    }
    for name, content in files.items():
        with open(os.path.join(OUT, name), "w", encoding="utf-8", newline="\n") as fh:
            fh.write(content)


def write_pngs() -> None:
    for px in (512, 1024):
        raster(MARK, px, INK, ss=4).save(os.path.join(OUT, f"zhumoben-mark-{px}.png"))
        raster(MARK, px, PAPER, ss=4).save(os.path.join(OUT, f"zhumoben-mark-{px}-inverse.png"))

    plate = raster(Group([Fill(rounded_rect(0, 0, 32, 32, 7))]), 512, INK, ss=4)
    plate.alpha_composite(raster(FAVICON, 512, PAPER, ss=4))
    plate.save(os.path.join(OUT, "zhumoben-favicon-512.png"))


# ------------------------------------------------------------------ preview
def build_preview(path: str) -> None:
    W, H, S = 1240, 1180, 2
    img = Image.new("RGBA", (W * S, H * S), PAPER)
    d = ImageDraw.Draw(img)

    f_title = ImageFont.truetype(SERIF, 44)
    f_kicker = ImageFont.truetype(MONO, 14)
    f_label = ImageFont.truetype(UI_B, 18)
    f_body = ImageFont.truetype(UI, 16)
    f_num = ImageFont.truetype(MONO, 13)
    f_word = ImageFont.truetype(SERIF, 40)
    f_inline = ImageFont.truetype(UI, 13)

    pad = 40
    K = 32 / 22  # artwork-to-crop ratio: a box of N px draws an N * K px raster

    def mk(group: Group, box: float, colour=INK, ss: int = 3) -> Image.Image:
        return raster(group, max(1, int(round(box * K * S))), colour, ss=ss)

    def rule(y: float, label: str) -> None:
        d.text((pad * S, y * S), label, font=f_label, fill=INK)
        d.line(((pad + 52) * S, (y + 11) * S, (W - pad) * S, (y + 11) * S), fill=LINE, width=1 * S)

    # ---- header
    d.text((pad * S, 30 * S), "朱墨本 · 标识", font=f_title, fill=INK)
    d.text((pad * S, 90 * S), "MONOCHROME MARK · ONE CONTOUR · NO HOLES", font=f_kicker, fill=INK3)

    # ---- hero
    hero = mk(MARK, 150, INK)
    img.alpha_composite(hero, (int((W - hero.width / S) / 2 * S), 120 * S))
    d.text(((W - 96) / 2 * S, 344 * S), "32 GRID", font=f_num, fill=INK3)
    d.text((((W - 96) / 2 + 62) * S, 344 * S), "1,024 PX", font=f_num, fill=INK3)

    # ---- plates
    plate_y, plate_h, gap = 384, 156, 14
    cw = (W - 2 * pad - gap * 3) / 4
    cells = [
        ("墨 · INK", WHITE, INK, "背景 纸白 / 图形 墨"),
        ("反白 · REVERSED", DARK, PAPER, "暗底用纸色，不用灰"),
        ("朱 · ZHU", WHITE, ZHU, "唯一可替换的品牌色"),
        ("小尺寸 · SMALL", WHITE, INK, "≤24px 用加宽槽"),
    ]
    for i, (label, bg, fg, sub) in enumerate(cells):
        x = pad + i * (cw + gap)
        d.rounded_rectangle((x * S, plate_y * S, (x + cw) * S, (plate_y + plate_h) * S), radius=10 * S, fill=bg)
        group = MARK_SMALL if "小尺寸" in label else MARK
        m = mk(group, 56, fg)
        img.alpha_composite(m, (int((x + (cw - 56) / 2) * S), int((plate_y + 20) * S)))
        d.text(((x + 18) * S, (plate_y + plate_h - 42) * S), label, font=f_num, fill=fg if bg == WHITE else PAPER)
        d.text(((x + 18) * S, (plate_y + plate_h - 24) * S), sub, font=f_inline, fill=INK3 if bg == WHITE else (170, 176, 184, 255))

    # ---- size ladder (numbers are the SVG box size)
    rule(580, "尺寸")
    base = 716
    x = pad + 4
    for size in (96, 64, 48, 32, 24, 16):
        m = mk(MARK_SMALL if size <= 24 else MARK, size, INK, ss=4)
        px = m.width / S
        img.alpha_composite(m, (int(x * S), int((base - px) * S)))
        d.text(((x + px / 2 - 7) * S, (base + 10) * S), str(size), font=f_num, fill=INK3)
        x += px + 30

    # ---- in the top bar
    ty = 760
    d.rounded_rectangle((pad * S, ty * S, (W - pad) * S, (ty + 96) * S), radius=10 * S, fill=WHITE)
    m = mk(MARK, 26, INK, ss=5)
    img.alpha_composite(m, ((pad + 22) * S, (ty + 34) * S))
    d.text(((pad + 60) * S, (ty + 24) * S), "朱墨本", font=f_word, fill=INK)
    d.rectangle(((pad + 190) * S, (ty + 30) * S, (pad + 244) * S, (ty + 52) * S), outline=(210, 215, 221, 255), width=1 * S)
    d.text(((pad + 199) * S, (ty + 35) * S), "v0.1", font=f_inline, fill=INK3)
    nx = pad + 290
    for label in ("首页", "题库", "评分记录"):
        d.text((nx * S, (ty + 32) * S), label, font=f_body, fill=INK2)
        nx += d.textlength(label, font=f_body) / S + 44
    d.text(((W - pad - 150) * S, (ty + 34) * S), "本地 · 自动保存", font=f_inline, fill=INK3)

    # ---- anatomy
    rule(900, "构成")
    notes = [
        ("页", "13.2 × 19 实心页，圆角 1.5", "一页纸：题库里的一道题"),
        ("签", "顶部镂空书签槽，宽 4.8，V 尖 15.8", "被折起 / 夹住的那一页：标记"),
        ("单色", "一条 path，currentColor", "没有渐变、投影、描边"),
    ]
    colw = (W - 2 * pad) / 3
    for i, (k, v, note) in enumerate(notes):
        x = pad + i * colw
        d.text((x * S, (938) * S), k, font=ImageFont.truetype(SERIF, 30), fill=INK)
        d.text((x * S, (988) * S), v, font=f_body, fill=INK2)
        d.text((x * S, (1012) * S), note, font=f_inline, fill=INK3)

    # ---- alternates
    rule(1060, "备选")
    alts = [("书脊版", ALT_SPINE), ("合书版", ALT_BOOK)]
    for i, (label, group) in enumerate(alts):
        x = pad + 10 + i * 300
        m = mk(group, 34, INK, ss=4)
        img.alpha_composite(m, (int(x * S), int(1090 * S)))
        d.text(((x + 60) * S, (1098 * S)), label, font=f_body, fill=INK2)
        d.text(((x + 60) * S, (1120 * S)), "同一定义下的另一种取舍", font=f_inline, fill=INK3)
    d.text(((W - pad - 470) * S, (1100 * S)), "主标 = 页 + 书签；备选保留「本」的另一种读法。", font=f_inline, fill=INK3)

    img.resize((W, H), Image.LANCZOS).convert("RGB").save(path, quality=95)


if __name__ == "__main__":
    write_svgs()
    write_pngs()
    build_preview(os.path.join(OUT, "preview.png"))
    print("built")

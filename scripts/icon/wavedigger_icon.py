# /// script
# requires-python = ">=3.10"
# dependencies = ["shapely>=2.0"]
# ///
"""WaveDigger app icon: the single geometry source for every icon file.

A yellow excavator on an ink tile, its bucket over a Sky beacon (the Network Survey broadcast
mark) in a pit dug into the ground. Chosen 21 October 2026 after four rounds of an icon lab.

Canvas is 100 units. One drawing system for every part: corners round at Spec.rnd, and where one
part sits over another the part below is cut back by Spec.gap, so overlaps read as separate
pieces in flat colour. Two drawings: REGULAR for 32 px and up, SMALL for 16 to 24 px (wider
gaps, plain tracks, a thicker arm and a bigger beacon).

Run from the repo root, then rasterise with scripts/generate-icons.sh:

    uv run scripts/icon/wavedigger_icon.py

Writes public/wavedigger-icon.svg (the header logo and the source for the rounded rasters) and
the other SVG sources in scripts/icon/svg/. Never hand-edit those files; change this script and
regenerate.
"""
import math
import pathlib
from dataclasses import dataclass, replace

from shapely.affinity import rotate, scale, translate
from shapely.geometry import LineString, MultiPolygon, Point, Polygon, box
from shapely.ops import unary_union

COLOURS = {
    'bg': '#17181C',      # ink tile (Caskfive ink)
    'body': '#F5B83D',    # excavator yellow
    'shade': '#C98A12',   # yellow in shadow: counterweight and bucket
    'track': '#3F424A',
    'roll': '#7C808A',
    'ground': '#2A2C33',
    'beacon': '#22C3E6',  # Sky, as on the Network Survey beacon
}

TILE_RADIUS = 22          # rounded tile, matching the rounded-xl header tile
MASKABLE_SAFE_R = 39      # maskable icons keep the machine inside the 40% safe-zone circle
ZOOM_AT = (50, 54)


@dataclass(frozen=True)
class Spec:
    rnd: float = 2.4                    # corner radius of every part
    gap: float = 1.6                    # cut between overlapping parts
    ground_y: float = 83                # top of the ground, before zoom
    track: tuple = (20, 52, 71, 13)     # left wheel x, right wheel x, centre y, height
    rollers: int = 2                    # rollers between the end wheels
    beacon_k: float = 1.0
    beacon_at: tuple = (75, 86)
    hole_r: float = 15                  # the pit the beacon sits in
    boom: tuple = ((49, 54), (67, 21), 12, 8.5)   # root, elbow, width at root, width at elbow
    boom_bend: float = 4.2              # how far the boom's knee bows up and back
    stick: tuple = ((67, 21), (81, 47), 8, 6.5)
    bucket: tuple = (21, -10)           # size, rotation
    zoom: float = 0.9                   # the machine is scaled about ZOOM_AT; the ground stays full-bleed
    offset: tuple = (-2.5, 0)


REGULAR = Spec()
SMALL = replace(REGULAR, gap=2.6, rollers=0, beacon_k=1.35, beacon_at=(74, 87),
                track=(21, 51, 71, 15), boom=((49, 54), (67, 21), 14, 10.5),
                stick=((67, 21), (81, 47), 10, 8.5), bucket=(23, -10))


# ---------------------------------------------------------------------------------------------
# Geometry helpers

def arc_pts(cx, cy, r, a0, a1, n=96):
    """Points on a circle, angles in degrees, SVG orientation (y down)."""
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
             cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def arc_band(cx, cy, r, w, a0, a1):
    return LineString(arc_pts(cx, cy, r, a0, a1)).buffer(w / 2, cap_style='round', quad_segs=24)


def dot(x, y, r):
    return Point(x, y).buffer(r, quad_segs=32)


def soft(g, r):
    """Round every corner of g by r."""
    return g.buffer(-r, join_style='round').buffer(r, join_style='round', quad_segs=16)


def cubic(p0, p1, p2, p3, n=48):
    out = []
    for i in range(n + 1):
        t = i / n
        a, b, c, d = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t ** 2, t ** 3
        out.append((a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]))
    return out


def taper(p, q, w0, w1):
    """A straight limb from p to q, narrowing from w0 to w1, with round ends."""
    dx, dy = q[0] - p[0], q[1] - p[1]
    L = math.hypot(dx, dy)
    nx, ny = -dy / L, dx / L
    quad = Polygon([(p[0] + nx * w0 / 2, p[1] + ny * w0 / 2), (q[0] + nx * w1 / 2, q[1] + ny * w1 / 2),
                    (q[0] - nx * w1 / 2, q[1] - ny * w1 / 2), (p[0] - nx * w0 / 2, p[1] - ny * w0 / 2)])
    return unary_union([quad, dot(*p, w0 / 2), dot(*q, w1 / 2)])


def sweep(p, c, q, w0, w1, n=40):
    """A limb along a quadratic curve from p to q (control c), narrowing from w0 to w1."""
    pts = []
    for i in range(n + 1):
        t = i / n
        x = (1 - t) ** 2 * p[0] + 2 * (1 - t) * t * c[0] + t ** 2 * q[0]
        y = (1 - t) ** 2 * p[1] + 2 * (1 - t) * t * c[1] + t ** 2 * q[1]
        pts.append(Point(x, y).buffer((w0 + (w1 - w0) * t) / 2, quad_segs=24))
    return unary_union(pts).simplify(0.02)


# ---------------------------------------------------------------------------------------------
# The parts

def beacon(x, y, k):
    """The Network Survey broadcast mark, ((.))."""
    parts = [dot(x, y, 3.2 * k)]
    for r in (6.6 * k, 11.2 * k):
        parts.append(arc_band(x, y, r, 2.8 * k, -26, 26))
        parts.append(arc_band(x, y, r, 2.8 * k, 154, 206))
    return unary_union(parts)


def bucket(pivot, size, angle, rnd):
    """A digger bucket in profile, drawn in its working orientation at size 1 with the pivot at
    the origin: a round back, a gently concave mouth facing the cab, and the lip drawn out to a
    point."""
    top_front = (-0.3, 0.0)
    back = cubic((0.1, -0.02), (0.64, 0.04), (0.72, 0.9), (0.06, 1.0), 48)
    tip = (-0.8, 0.88)
    under = cubic((0.06, 1.0), (-0.26, 1.0), (-0.52, 0.97), tip, 32)
    mouth = cubic(tip, (-0.5, 0.7), (-0.36, 0.32), top_front, 40)
    g = Polygon([top_front] + back + under[1:] + mouth[1:-1])
    g = scale(g, size, size, origin=(0, 0))
    g = rotate(g, angle, origin=(0, 0))
    g = translate(g, *pivot)
    return soft(g, rnd * 0.3)


def excavator(s=REGULAR):
    """Every layer of the icon as (colour key, geometry), in paint order."""
    gap, rnd = s.gap, s.rnd

    x0, x1, ty, th = s.track
    track = taper((x0, ty), (x1, ty), th, th)
    wheels = [dot(x0, ty, th * 0.3), dot(x1, ty, th * 0.3)]
    if s.rollers:
        step = (x1 - x0) / (s.rollers + 1)
        wheels += [dot(x0 + step * (i + 1), ty, th * 0.19) for i in range(s.rollers)]
    wheels = unary_union(wheels)

    # The upper body: cab and house as one silhouette, the counterweight in the darker tone.
    top = ty - th / 2 - gap - 0.4
    house = Polygon([(11, top), (11, top - 10), (15, top - 14), (52, top - 14), (57, top - 7), (57, top)])
    cab = Polygon([(27, top - 13), (29.5, top - 33), (42, top - 33), (47.5, top - 13)])
    upper = soft(unary_union([house, cab]), rnd)
    weight = soft(box(5, top - 16, 22, top + 2), rnd).intersection(upper).buffer(0)
    window = soft(Polygon([(32, top - 29), (40.4, top - 29), (44, top - 17.5), (32, top - 17.5)]), rnd * 0.6)

    # The boom bows up and back from a straight line between its root and the elbow.
    bp, bq, bw0, bw1 = s.boom
    L = math.hypot(bq[0] - bp[0], bq[1] - bp[1])
    nx, ny = (bq[1] - bp[1]) / L, -(bq[0] - bp[0]) / L
    knee = ((bp[0] + bq[0]) / 2 + nx * s.boom_bend * 2, (bp[1] + bq[1]) / 2 + ny * s.boom_bend * 2)
    boom = sweep(bp, knee, bq, bw0, bw1)
    stick = taper(*s.stick)
    bk = bucket(s.stick[1], s.bucket[0], s.bucket[1], rnd)

    bx, by = s.beacon_at
    machine = [
        ('track', track.difference(wheels.buffer(gap * 0.6)) if s.rollers else track),
        ('roll', wheels if s.rollers else Polygon()),
        ('shade', weight),
        ('body', upper.difference(weight.buffer(gap)).difference(window)),
        ('body', boom.difference(upper.buffer(gap))),
        ('body', stick.difference(boom.buffer(gap))),
        ('shade', bk.difference(stick.buffer(gap))),
        ('beacon', beacon(bx, by, s.beacon_k)),
    ]
    dx, dy = s.offset
    machine = [(k, translate(scale(g, s.zoom, s.zoom, origin=ZOOM_AT), dx, dy)) for k, g in machine]

    # The ground stays full-bleed; only its line and the pit follow the zoom.
    gy = ZOOM_AT[1] + (s.ground_y - ZOOM_AT[1]) * s.zoom + dy
    hx = ZOOM_AT[0] + (bx - ZOOM_AT[0]) * s.zoom + dx
    pit = Point(hx, gy).buffer(s.hole_r * s.zoom, quad_segs=48)
    return [('ground', box(-5, gy, 105, 120).difference(pit))] + machine


def fit_safe_zone(spec):
    """The same drawing zoomed so the machine and beacon sit inside the maskable safe zone."""
    zoom = spec.zoom
    while zoom > 0.4:
        s = replace(spec, zoom=zoom)
        art = unary_union([g for k, g in excavator(s) if k != 'ground' and not g.is_empty])
        reach = max(math.hypot(x - 50, y - 50) for p in getattr(art, 'geoms', [art]) for x, y in p.exterior.coords)
        if reach <= MASKABLE_SAFE_R:
            return s
        zoom -= 0.01
    raise ValueError('drawing does not fit the safe zone')


# ---------------------------------------------------------------------------------------------
# SVG output

def path_d(geom):
    def ring(coords):
        pts = list(coords)[:-1]
        return 'M' + 'L'.join(f'{x:.2f} {y:.2f}' for x, y in pts) + 'Z'
    out = []
    for p in getattr(geom, 'geoms', [geom]):
        if p.is_empty:
            continue
        out.append(ring(p.exterior.coords))
        out.extend(ring(i.coords) for i in p.interiors)
    return ''.join(out)


def svg(layers, radius, title):
    if radius:
        t = box(0, 0, 100, 100).buffer(-radius, join_style='round').buffer(radius, join_style='round', quad_segs=24)
        bg = f'<rect width="100" height="100" rx="{radius}" fill="{COLOURS["bg"]}"/>'
    else:
        t = box(0, 0, 100, 100)
        bg = f'<rect width="100" height="100" fill="{COLOURS["bg"]}"/>'
    parts = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">', f'<title>{title}</title>', bg]
    for key, g in layers:
        if g.is_empty:
            continue
        g = g.intersection(t).simplify(0.02, preserve_topology=True)
        polys = [p for p in getattr(g, 'geoms', [g]) if p.geom_type == 'Polygon' and not p.is_empty]
        if polys:
            parts.append(f'<path fill="{COLOURS[key]}" d="{path_d(MultiPolygon(polys))}"/>')
    parts.append('</svg>\n')
    return ''.join(parts)


def main():
    root = pathlib.Path(__file__).resolve().parents[2]
    out = root / 'scripts/icon/svg'
    out.mkdir(parents=True, exist_ok=True)
    files = {
        root / 'public/wavedigger-icon.svg': svg(excavator(REGULAR), TILE_RADIUS, 'WaveDigger'),
        out / 'wavedigger-icon-small.svg': svg(excavator(SMALL), TILE_RADIUS, 'WaveDigger'),
        out / 'wavedigger-icon-square.svg': svg(excavator(REGULAR), 0, 'WaveDigger'),
        out / 'wavedigger-icon-maskable.svg': svg(excavator(fit_safe_zone(REGULAR)), 0, 'WaveDigger'),
    }
    for path, text in files.items():
        path.write_text(text)
        print(f'wrote {path.relative_to(root)} ({len(text) // 1024} KB)')


if __name__ == '__main__':
    main()

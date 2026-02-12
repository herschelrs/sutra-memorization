#!/usr/bin/env python3
"""Convert KanjiVG SVG stroke data to KanjiCanvas ref-patterns.js format.

Usage:
    python3 scripts/generate-ref-patterns.py \
        --kanjivg data/kanjivg/kanji/ \
        --custom data/custom-strokes/ \
        --output public/vendor/kanjicanvas/ref-patterns.js \
        [--chars 菩薩涅槃]
"""

import argparse
import math
import os
import re
import sys
import xml.etree.ElementTree as ET

# ---------------------------------------------------------------------------
# Stage 1: Collect SVG files
# ---------------------------------------------------------------------------

def collect_svg_files(kanjivg_dir, custom_dir):
    """Scan directories for SVG files, map codepoint -> filepath.
    Custom dir overrides KanjiVG for the same codepoint.
    Skip variant files (filename stem contains '-').
    """
    files = {}

    for directory in [kanjivg_dir, custom_dir]:
        if not directory or not os.path.isdir(directory):
            continue
        for fname in os.listdir(directory):
            if not fname.endswith(".svg"):
                continue
            stem = fname[:-4]
            if "-" in stem:
                continue
            try:
                codepoint = int(stem, 16)
                char = chr(codepoint)
                files[char] = os.path.join(directory, fname)
            except (ValueError, OverflowError):
                continue

    return files

# ---------------------------------------------------------------------------
# Stage 2: Parse SVG path data
# ---------------------------------------------------------------------------

# Tokenizer for SVG path d attribute
_NUM_RE = re.compile(r"[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?")
_CMD_RE = re.compile(r"[MmCcSsLlZzHhVvQqTtAa]")

def tokenize_path(d):
    """Yield (command_char, [numbers...]) tuples from an SVG path d string."""
    tokens = []
    i = 0
    while i < len(d):
        c = d[i]
        if c in " ,\t\n\r":
            i += 1
            continue
        cmd_m = _CMD_RE.match(d, i)
        if cmd_m:
            tokens.append(cmd_m.group())
            i = cmd_m.end()
            continue
        num_m = _NUM_RE.match(d, i)
        if num_m:
            tokens.append(float(num_m.group()))
            i = num_m.end()
            continue
        i += 1  # skip unknown chars

    # Group into (command, [args...])
    result = []
    current_cmd = None
    current_args = []
    for t in tokens:
        if isinstance(t, str):
            if current_cmd is not None:
                result.append((current_cmd, current_args))
            current_cmd = t
            current_args = []
        else:
            current_args.append(t)
    if current_cmd is not None:
        result.append((current_cmd, current_args))
    return result


def parse_path_to_beziers(d):
    """Parse SVG path d attribute into list of cubic Bézier segments.
    Each segment is ((x0,y0), (x1,y1), (x2,y2), (x3,y3)).
    Line segments are promoted to degenerate cubics.
    Returns list of segments for a single stroke.
    """
    commands = tokenize_path(d)
    segments = []
    cx, cy = 0.0, 0.0  # current point
    prev_cp2 = None  # previous second control point (for S/s)

    for cmd, args in commands:
        if cmd == "M":
            # Absolute moveto; extra pairs are implicit lineto
            cx, cy = args[0], args[1]
            prev_cp2 = None
            idx = 2
            while idx + 1 < len(args):
                nx, ny = args[idx], args[idx + 1]
                segments.append(((cx, cy), (cx, cy), (nx, ny), (nx, ny)))
                cx, cy = nx, ny
                prev_cp2 = None
                idx += 2

        elif cmd == "m":
            # Relative moveto
            cx += args[0]
            cy += args[1]
            prev_cp2 = None
            idx = 2
            while idx + 1 < len(args):
                nx = cx + args[idx]
                ny = cy + args[idx + 1]
                segments.append(((cx, cy), (cx, cy), (nx, ny), (nx, ny)))
                cx, cy = nx, ny
                prev_cp2 = None
                idx += 2

        elif cmd == "C":
            # Absolute cubic Bézier
            idx = 0
            while idx + 5 < len(args):
                x1, y1, x2, y2, x3, y3 = args[idx:idx + 6]
                segments.append(((cx, cy), (x1, y1), (x2, y2), (x3, y3)))
                cx, cy = x3, y3
                prev_cp2 = (x2, y2)
                idx += 6

        elif cmd == "c":
            # Relative cubic Bézier
            idx = 0
            while idx + 5 < len(args):
                dx1, dy1, dx2, dy2, dx3, dy3 = args[idx:idx + 6]
                x1, y1 = cx + dx1, cy + dy1
                x2, y2 = cx + dx2, cy + dy2
                x3, y3 = cx + dx3, cy + dy3
                segments.append(((cx, cy), (x1, y1), (x2, y2), (x3, y3)))
                cx, cy = x3, y3
                prev_cp2 = (x2, y2)
                idx += 6

        elif cmd == "S":
            # Absolute smooth cubic
            idx = 0
            while idx + 3 < len(args):
                x2, y2, x3, y3 = args[idx:idx + 4]
                if prev_cp2:
                    x1 = 2 * cx - prev_cp2[0]
                    y1 = 2 * cy - prev_cp2[1]
                else:
                    x1, y1 = cx, cy
                segments.append(((cx, cy), (x1, y1), (x2, y2), (x3, y3)))
                cx, cy = x3, y3
                prev_cp2 = (x2, y2)
                idx += 4

        elif cmd == "s":
            # Relative smooth cubic
            idx = 0
            while idx + 3 < len(args):
                dx2, dy2, dx3, dy3 = args[idx:idx + 4]
                x2, y2 = cx + dx2, cy + dy2
                x3, y3 = cx + dx3, cy + dy3
                if prev_cp2:
                    x1 = 2 * cx - prev_cp2[0]
                    y1 = 2 * cy - prev_cp2[1]
                else:
                    x1, y1 = cx, cy
                segments.append(((cx, cy), (x1, y1), (x2, y2), (x3, y3)))
                cx, cy = x3, y3
                prev_cp2 = (x2, y2)
                idx += 4

        elif cmd == "L":
            idx = 0
            while idx + 1 < len(args):
                nx, ny = args[idx], args[idx + 1]
                segments.append(((cx, cy), (cx, cy), (nx, ny), (nx, ny)))
                cx, cy = nx, ny
                prev_cp2 = None
                idx += 2

        elif cmd == "l":
            idx = 0
            while idx + 1 < len(args):
                nx = cx + args[idx]
                ny = cy + args[idx + 1]
                segments.append(((cx, cy), (cx, cy), (nx, ny), (nx, ny)))
                cx, cy = nx, ny
                prev_cp2 = None
                idx += 2

        elif cmd in ("Z", "z"):
            prev_cp2 = None

        else:
            # Skip unsupported commands (Q, T, A, H, V, etc.)
            prev_cp2 = None

    return segments


def parse_svg_strokes(filepath):
    """Parse an SVG file and return list of strokes, each stroke = list of Bézier segments."""
    tree = ET.parse(filepath)
    root = tree.getroot()
    ns = {"svg": "http://www.w3.org/2000/svg"}

    # Find all <path> elements anywhere under the StrokePaths group
    # KanjiVG uses id="kvg:StrokePaths_XXXXX" on the top-level group
    strokes = []
    for path in root.iter("{http://www.w3.org/2000/svg}path"):
        d = path.get("d")
        if not d:
            continue
        segments = parse_path_to_beziers(d)
        if segments:
            strokes.append(segments)

    return strokes

# ---------------------------------------------------------------------------
# Stage 3: Sample points along Bézier curves
# ---------------------------------------------------------------------------

def cubic_bezier(p0, p1, p2, p3, t):
    """Evaluate cubic Bézier at parameter t."""
    u = 1.0 - t
    return (
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    )


def sample_stroke(segments, samples_per_segment=50):
    """Sample dense polyline from a list of Bézier segments."""
    points = []
    for seg in segments:
        p0, p1, p2, p3 = seg
        # Check if this is a degenerate cubic (line segment)
        is_line = (p0 == p1 and p2 == p3)
        if is_line:
            if not points:
                points.append(p0)
            points.append(p3)
        else:
            for i in range(samples_per_segment + 1):
                t = i / samples_per_segment
                pt = cubic_bezier(p0, p1, p2, p3, t)
                if i == 0 and points:
                    continue  # skip duplicate start point
                points.append(pt)
    return points

# ---------------------------------------------------------------------------
# Stage 4: Scale 109 → 256
# ---------------------------------------------------------------------------

SCALE = 256.0 / 109.0

def scale_points(strokes_points):
    """Scale all points from 109x109 coordinate space to 256x256."""
    return [
        [(x * SCALE, y * SCALE) for x, y in stroke]
        for stroke in strokes_points
    ]

# ---------------------------------------------------------------------------
# Stage 5: Moment normalization (matching KanjiCanvas.momentNormalize)
# ---------------------------------------------------------------------------

def moment_normalize(strokes):
    """Apply moment normalization identical to KanjiCanvas."""
    # Find bounding box
    x_min = float("inf")
    x_max = float("-inf")
    y_min = float("inf")
    y_max = float("-inf")
    for stroke in strokes:
        for x, y in stroke:
            if x < x_min: x_min = x
            if x > x_max: x_max = x
            if y < y_min: y_min = y
            if y > y_max: y_max = y

    old_width = abs(x_max - x_min)
    old_height = abs(y_max - y_min)

    # Aspect ratio factor
    if old_width == 0 and old_height == 0:
        aran = 1.0
    elif old_height > old_width:
        ratio = old_width / old_height if old_height != 0 else 0
        aran = math.sqrt(math.sin(math.pi / 2 * ratio))
    else:
        ratio = old_height / old_width if old_width != 0 else 0
        aran = math.sqrt(math.sin(math.pi / 2 * ratio))

    new_w = 256.0
    new_h = 256.0
    if old_height > old_width:
        new_w = aran * 256.0
    else:
        new_h = aran * 256.0

    offset_x = (256.0 - new_w) / 2.0
    offset_y = (256.0 - new_h) / 2.0

    # Compute moments
    m00 = sum(len(stroke) for stroke in strokes)
    if m00 == 0:
        return strokes

    sum_x = sum(x for stroke in strokes for x, y in stroke)
    sum_y = sum(y for stroke in strokes for x, y in stroke)
    xc = sum_x / m00
    yc = sum_y / m00

    mu20 = sum((x - xc) ** 2 for stroke in strokes for x, y in stroke)
    mu02 = sum((y - yc) ** 2 for stroke in strokes for x, y in stroke)

    # Alpha and beta (matching KanjiCanvas: s/(4*sqrt(d/j)) with || 0 fallback)
    sqrt_mu20 = math.sqrt(mu20 / m00) if mu20 > 0 else 0
    sqrt_mu02 = math.sqrt(mu02 / m00) if mu02 > 0 else 0
    alpha = new_w / (4.0 * sqrt_mu20) if sqrt_mu20 > 0 else 0
    beta = new_h / (4.0 * sqrt_mu02) if sqrt_mu02 > 0 else 0

    half_w = new_w / 2.0
    half_h = new_h / 2.0

    result = []
    for stroke in strokes:
        new_stroke = []
        for x, y in stroke:
            nx = alpha * (x - xc) + half_w + offset_x
            ny = beta * (y - yc) + half_h + offset_y
            new_stroke.append((nx, ny))
        result.append(new_stroke)
    return result

# ---------------------------------------------------------------------------
# Stage 6: Feature extraction (matching KanjiCanvas.extractFeatures)
# ---------------------------------------------------------------------------

def euclidean(a, b):
    dx = a[0] - b[0]
    dy = a[1] - b[1]
    return math.sqrt(dx * dx + dy * dy)


def extract_features(strokes, interval=20.0):
    """Resample each stroke at fixed distance intervals, matching KanjiCanvas."""
    result = []
    for stroke in strokes:
        features = []
        accum = 0.0
        n = len(stroke)
        for i in range(n):
            if i == 0:
                features.append(stroke[0])
            if i > 0:
                accum += euclidean(stroke[i - 1], stroke[i])
            if accum >= interval and i > 1:
                accum -= interval
                features.append(stroke[i])
        # End-of-stroke handling
        if len(features) == 1:
            features.append(stroke[-1])
        elif accum > 0.75 * interval:
            features.append(stroke[-1])
        result.append(features)
    return result

# ---------------------------------------------------------------------------
# Pipeline: SVG → ref-pattern entry
# ---------------------------------------------------------------------------

def process_character(filepath):
    """Process a single SVG file through the full pipeline.
    Returns (stroke_count, feature_strokes) or None on error.
    """
    strokes_beziers = parse_svg_strokes(filepath)
    if not strokes_beziers:
        return None

    # Stage 3: Sample dense polylines
    strokes_points = [sample_stroke(segs) for segs in strokes_beziers]

    # Stage 4: Scale 109 → 256
    strokes_scaled = scale_points(strokes_points)

    # Stage 5: Moment normalization
    strokes_norm = moment_normalize(strokes_scaled)

    # Stage 6: Feature extraction
    features = extract_features(strokes_norm, 20.0)

    stroke_count = len(features)
    return stroke_count, features

# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

def format_point(pt):
    return f"[{pt[0]}, {pt[1]}]"


def format_stroke(stroke):
    return "[" + ", ".join(format_point(p) for p in stroke) + "]"


def format_entry(char, stroke_count, strokes):
    strokes_str = "[" + ", ".join(format_stroke(s) for s in strokes) + "]"
    # Escape backslash and quote for JS string
    escaped = char.replace("\\", "\\\\").replace('"', '\\"')
    return f'["{escaped}",{stroke_count},{strokes_str}]'


def write_output(entries, output_path):
    """Write the ref-patterns.js file."""
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("// Generated from KanjiVG (CC BY-SA 3.0, Ulrich Apel) + custom stroke data\n")
        f.write("// https://github.com/KanjiVG/kanjivg\n")
        f.write("// Do not edit — regenerate with: scripts/generate-ref-patterns.py\n")
        f.write("KanjiCanvas.refPatterns = [\n")
        for i, entry in enumerate(entries):
            comma = "," if i < len(entries) - 1 else ""
            f.write(entry + comma + "\n")
        f.write("];\n")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Convert KanjiVG SVG stroke data to KanjiCanvas ref-patterns.js"
    )
    parser.add_argument("--kanjivg", required=True, help="Path to KanjiVG kanji/ directory")
    parser.add_argument("--custom", default=None, help="Path to custom stroke SVG directory")
    parser.add_argument("--output", required=True, help="Output ref-patterns.js path")
    parser.add_argument("--chars", default=None, help="Only process these characters")
    args = parser.parse_args()

    # Stage 1: Collect SVG files
    svg_files = collect_svg_files(args.kanjivg, args.custom)
    print(f"Found {len(svg_files)} SVG files", file=sys.stderr)

    # Filter to requested characters if specified
    if args.chars:
        requested = set(args.chars)
        filtered = {c: p for c, p in svg_files.items() if c in requested}
        found = set(filtered.keys())
        missing = requested - found
        if missing:
            print(f"Missing characters: {''.join(sorted(missing))}", file=sys.stderr)
        if found:
            print(f"Found characters: {''.join(sorted(found))}", file=sys.stderr)
        svg_files = filtered

    # Process all characters
    entries = []
    errors = 0
    chars_sorted = sorted(svg_files.keys(), key=lambda c: ord(c))

    for char in chars_sorted:
        filepath = svg_files[char]
        try:
            result = process_character(filepath)
            if result is None:
                print(f"  Skipped {char} (U+{ord(char):04X}): no strokes found", file=sys.stderr)
                errors += 1
                continue
            stroke_count, features = result
            entries.append(format_entry(char, stroke_count, features))
        except Exception as e:
            print(f"  Error processing {char} (U+{ord(char):04X}): {e}", file=sys.stderr)
            errors += 1

    # Write output
    write_output(entries, args.output)

    print(f"Wrote {len(entries)} characters to {args.output}", file=sys.stderr)
    if errors:
        print(f"Errors/skipped: {errors}", file=sys.stderr)


if __name__ == "__main__":
    main()

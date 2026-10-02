"""Check the derived PlumePilot Math font and its first-party coverage table."""
from pathlib import Path
import hashlib, json, re, sys
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parent.parent
font = root / 'assets/fonts/plumepilot-math.otf'
assert hashlib.sha256(font.read_bytes()).hexdigest() == '00efd7176a78925659afb5a424e8db4ec564acaa7f10451967ed022bf5c87303'
points = sorted(TTFont(font).getBestCmap())
ranges = []
for point in points:
    if ranges and point == ranges[-1][1] + 1:
        ranges[-1][1] = point
    else:
        ranges.append([point, point])
coverage = root / 'epub-math-coverage.mjs'
assert json.loads(re.search(r'= ([\s\S]+);', coverage.read_text()).group(1)) == ranges
assert all(ord(character) in points for character in '𝑎𝑏𝑐ℝℕℚ≤≥∈∅∑∫∗')
assert 'SIL OPEN FONT LICENSE' in (root / 'assets/fonts/STIX-OFL.txt').read_text()
assert any(name.toUnicode() == 'PlumePilot Math' for name in TTFont(font)['name'].names if name.nameID == 1)
print(f'PASS: PlumePilot Math; {len(points)} Unicode points; coverage data, font name and license match')

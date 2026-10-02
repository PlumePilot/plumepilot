// Experimental first-party geometry. Coordinates are displayed raster pixels.
// Only completely blank bands wider than two body-line heights can separate
// regions. This deliberately keeps adjacent fractions/scripts/labels together.
export function inkBands(height, blankHeight, inkAtRow) {
  const cuts = [0];
  let blankStart = null;
  for (let y = 0; y < height; y++) {
    if (inkAtRow(y) === 0) blankStart ??= y;
    else {
      if (blankStart !== null && y - blankStart >= blankHeight) {
        cuts.push(Math.floor((blankStart + y) / 2));
      }
      blankStart = null;
    }
  }
  cuts.push(height);
  return cuts.slice(1).map((end, i) => ({ start: cuts[i], end }));
}

export function intersectsBand(box, band) {
  return box.bottom > band.start && box.top < band.end;
}

// Add smaller whitespace cuts only next to a complete ordinary prose line.
// A cut between two formula/label lines must retain the old conservative gap.
export function refineInkBands(height, blankHeight, inkAtRow, boxes, rows, coarse) {
  const cuts = new Set(coarse.slice(0, -1).map((band) => band.end));
  for (const band of inkBands(height, blankHeight, inkAtRow).slice(0, -1)) {
    const cut = band.end;
    if (boxes.some((box) => box.top < cut && box.bottom > cut)) continue;
    const above = rows.filter((row) => row.bottom <= cut).at(-1);
    const below = rows.find((row) => row.top >= cut);
    if (above?.prose || below?.prose) cuts.add(cut);
  }
  const edges = [0, ...[...cuts].sort((a, b) => a - b), height];
  return edges.slice(1).map((end, index) => ({ start: edges[index], end }));
}

// A proposed text region must account for every dark raster pixel. Unknown
// ink (rules, labels, diagrams, extraction failures) forces image preservation.
export function inkIsCovered(data, width, start, boxes) {
  for (let offset = 0; offset < data.length; offset += 4) {
    if (
      data[offset] >= 242 &&
      data[offset + 1] >= 242 &&
      data[offset + 2] >= 242
    )
      continue;
    const pixel = offset / 4;
    const x = pixel % width;
    const y = start + Math.floor(pixel / width);
    if (
      !boxes.some(
        (box) =>
          x >= box.left && x < box.right && y >= box.top && y < box.bottom,
      )
    )
      return false;
  }
  return true;
}

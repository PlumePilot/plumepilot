import * as pdfjsLib from "./vendor/pdf.min.mjs";

const STUDYWING_DEBUG = false;
const debugLog = (...values) => {
  if (STUDYWING_DEBUG) console.info(...values);
};

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "./vendor/pdf.worker.min.mjs",
  import.meta.url,
).href;

const PDF_DOWNLOAD_TIMEOUT_MS = 30000;
const PDF_DOWNLOAD_RETRY_DELAYS_MS = [1000, 2500];
const VISUAL_RENDER_WIDTH = 1200;
const VISUAL_TARGET_HEIGHT = 1150;
const VISUAL_MIN_BLOCK_HEIGHT = 350;
const VISUAL_CUT_SEARCH_RADIUS = 100;
const VISUAL_CUT_SCAN_STEP = 4;
const VISUAL_CUT_OVERLAP = 18;
const EPUB_CONVERSION_PERCENT = 92;
const STUDYWING_SIGNATURE =
  "Generato con PlumePilot – Assistente per Pegaso.";

const IMAGE_OPERATION_NAMES = [
  "paintImageMaskXObject",
  "paintImageMaskXObjectGroup",
  "paintImageXObject",
  "paintInlineImageXObject",
  "paintInlineImageXObjectGroup",
  "paintImageXObjectRepeat",
  "paintImageMaskXObjectRepeat",
  "paintSolidColorImageMask",
];
const GROUPED_IMAGE_OPERATION_NAMES = [
  "paintImageMaskXObjectGroup",
  "paintInlineImageXObjectGroup",
  "paintImageXObjectRepeat",
  "paintImageMaskXObjectRepeat",
];
const VECTOR_PAINT_OPERATION_NAMES = [
  "stroke",
  "closeStroke",
  "fill",
  "eoFill",
  "fillStroke",
  "eoFillStroke",
  "closeFillStroke",
  "closeEOFillStroke",
];

function operationSet(names) {
  return new Set(
    names
      .map((name) => pdfjsLib.OPS[name])
      .filter((operation) => Number.isFinite(operation)),
  );
}

const IMAGE_OPERATIONS = operationSet(IMAGE_OPERATION_NAMES);
const GROUPED_IMAGE_OPERATIONS = operationSet(GROUPED_IMAGE_OPERATION_NAMES);
const VECTOR_PAINT_OPERATIONS = operationSet(VECTOR_PAINT_OPERATION_NAMES);

const escapeXml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character],
  );

const FOOTNOTE_TOKEN_PATTERN = /\{\{STUDYWING_FOOTNOTE:(\d{1,3})\}\}/gu;

const footnoteToken = (number) => `{{STUDYWING_FOOTNOTE:${number}}}`;

const inlineTextToPlainText = (value) =>
  String(value ?? "").replace(FOOTNOTE_TOKEN_PATTERN, "$1");

const inlineTextToHtml = (value) =>
  escapeXml(value).replace(
    FOOTNOTE_TOKEN_PATTERN,
    '<sup class="footnote-ref">$1</sup>',
  );

const slug = (value) =>
  String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

const filenameFor = (title) =>
  `${slug(title) || "unipegaso-course"}-dispense.epub`;

function abortError(message = "Creazione EPUB annullata.") {
  return new DOMException(message, "AbortError");
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw abortError();
}

function waitWithSignal(milliseconds, signal) {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(done, milliseconds);

    function done() {
      signal?.removeEventListener("abort", cancelled);
      resolve();
    }

    function cancelled() {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", cancelled);
      reject(abortError());
    }

    signal?.addEventListener("abort", cancelled, { once: true });
  });
}

const browserYieldChannel = new MessageChannel();
const browserYieldQueue = [];
browserYieldChannel.port1.onmessage = () => browserYieldQueue.shift()?.();

function yieldToBrowser(signal) {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    let settled = false;

    function cleanup() {
      signal?.removeEventListener("abort", cancelled);
    }

    function resume() {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    }

    function cancelled() {
      if (settled) return;
      settled = true;
      cleanup();
      reject(abortError());
    }

    signal?.addEventListener("abort", cancelled, { once: true });
    browserYieldQueue.push(resume);
    browserYieldChannel.port2.postMessage(null);
  });
}

function cleanExtractedText(value) {
  return String(value || "").replace(/[\uFFFD\uE000-\uF8FF]/gu, "");
}

function textItem(item) {
  const size =
    Math.hypot(item.transform?.[0] || 0, item.transform?.[1] || 0) ||
    item.height ||
    10;
  const width = Number.isFinite(item.width)
    ? Math.max(0, item.width)
    : String(item.str || "").length * size * 0.45;

  return {
    text: cleanExtractedText(item.str),
    x: item.transform?.[4] || 0,
    y: item.transform?.[5] || 0,
    size,
    width,
  };
}

function isBoilerplateTextItem(item, viewport, pageItems = null) {
  const text = String(item?.str || "").replace(/\s+/g, " ").trim();
  if (!text) return true;

  const pageWidth = Math.max(1, viewport?.width || 0);
  const pageHeight = Math.max(1, viewport?.height || 0);
  const size =
    Math.hypot(item.transform?.[0] || 0, item.transform?.[1] || 0) ||
    item.height ||
    10;
  const width = Number.isFinite(item.width)
    ? Math.max(0, item.width)
    : text.length * size * 0.45;
  const x = item.transform?.[4] || 0;
  const y = item.transform?.[5] || 0;
  const horizontalCenter = x + width / 2;
  const centered =
    horizontalCenter >= pageWidth * 0.25 &&
    horizontalCenter <= pageWidth * 0.75;
  const nearBottom = y <= pageHeight * 0.16;
  const nearTop = y >= pageHeight * 0.9;
  const extremeMargin =
    y <= pageHeight * 0.065 || y >= pageHeight * 0.97;
  const pageLabel = text.match(/^(?:pag(?:ina)?|page)\.?\s*/iu)?.[0] || "";
  const counterBody = text
    .slice(pageLabel.length)
    .replace(/^[-\u2013\u2014]\s*/u, "")
    .replace(/\s*[-\u2013\u2014]$/u, "")
    .trim();
  const counterParts = counterBody.split(/\s*(?:di|of|\/)\s*/iu);
  const isCounterPart = (part) =>
    /^\d{1,4}$/u.test(part) ||
    /^[IVXLCDM]{1,8}$/u.test(part) ||
    (pageLabel && /^[ivxlcdm]{1,8}$/iu.test(part));
  const looksLikePageCounter =
    counterParts.length >= 1 &&
    counterParts.length <= 2 &&
    counterParts.every(isCounterPart);
  const hasPageLabelOrTotal =
    Boolean(pageLabel) || counterParts.length === 2;
  const isolatedOnLine =
    !Array.isArray(pageItems) ||
    !pageItems.some((other) => {
      if (other === item || !String(other?.str || "").trim()) return false;
      const otherY = other.transform?.[5] || 0;
      const otherSize =
        Math.hypot(
          other.transform?.[0] || 0,
          other.transform?.[1] || 0,
        ) ||
        other.height ||
        10;
      return (
        Math.abs(otherY - y) <=
        Math.max(1.25, Math.min(size, otherSize) * 0.3)
      );
    });

  if (
    looksLikePageCounter &&
    isolatedOnLine &&
    (extremeMargin ||
      (centered && (nearBottom || nearTop)) ||
      (hasPageLabelOrTotal &&
        (y <= pageHeight * 0.18 || y >= pageHeight * 0.88)))
  ) {
    return true;
  }

  if (y >= pageHeight * 0.13) return false;

  return (
    /^\d+\s+(?:di|of)\s+\d+$/iu.test(text) ||
    /(?:materiale didattico|uso personale dello studente|copyright|riproduzione|riutilizzo|diritto d.autore|22\.04\.1941|legge sul diritto)/iu.test(
      text,
    )
  );
}

function meaningfulTextItems(content, viewport) {
  return content.items.filter(
    (item) =>
      item.str?.trim() &&
      !isBoilerplateTextItem(item, viewport, content.items),
  );
}

function estimateBodySize(items, viewport) {
  const pageHeight = Math.max(1, viewport?.height || 0);
  const centralItems = items.filter(
    (item) => item.y >= pageHeight * 0.2 && item.y <= pageHeight * 0.88,
  );
  const centralCharacters = centralItems.reduce(
    (total, item) =>
      total + (item.text.match(/[\p{L}\p{N}]/gu)?.length || 0),
    0,
  );
  const candidates = centralCharacters >= 40 ? centralItems : items;
  const sizeBuckets = new Map();

  for (const item of candidates) {
    const characterWeight =
      item.text.match(/[\p{L}\p{N}]/gu)?.length || 0;
    if (!characterWeight || !Number.isFinite(item.size) || item.size <= 0) {
      continue;
    }

    const bucket = Math.round(item.size * 4) / 4;
    const current = sizeBuckets.get(bucket) || {
      weight: 0,
      weightedSize: 0,
    };
    current.weight += characterWeight;
    current.weightedSize += item.size * characterWeight;
    sizeBuckets.set(bucket, current);
  }

  const dominant = [...sizeBuckets.values()].sort(
    (first, second) => second.weight - first.weight,
  )[0];
  if (dominant?.weight) return dominant.weightedSize / dominant.weight;

  const sizes = items.map((item) => item.size).sort((a, b) => a - b);
  return sizes[Math.floor(sizes.length / 2)] || 10;
}

function attachFootnoteReferences(items, bodySize) {
  const prepared = items.map((item) => ({ ...item, footnoteMarkers: [] }));
  const consumed = new Set();

  for (const candidate of prepared) {
    const marker = candidate.text.trim();
    if (
      !/^[1-9]\d{0,2}$/u.test(marker) ||
      candidate.size > bodySize * 0.82 ||
      candidate.size < bodySize * 0.35
    ) {
      continue;
    }

    let bestTarget = null;
    let bestScore = Infinity;

    for (const target of prepared) {
      if (target === candidate || consumed.has(target)) continue;

      const targetText = target.text.trim();
      if (
        target.size < bodySize * 0.82 ||
        candidate.size > target.size * 0.82 ||
        !/[\p{L}]{3,}$/u.test(targetText)
      ) {
        continue;
      }

      const rise = candidate.y - target.y;
      const horizontalGap = candidate.x - (target.x + target.width);
      if (
        rise < target.size * 0.14 ||
        rise > target.size * 0.72 ||
        horizontalGap < -target.size * 0.15 ||
        horizontalGap > target.size * 0.9
      ) {
        continue;
      }

      const proseCharacters = prepared
        .filter(
          (other) =>
            other !== candidate &&
            Math.abs(other.y - target.y) <=
              Math.max(2.5, target.size * 0.28),
        )
        .map((other) => other.text)
        .join("")
        .match(/\p{L}/gu)?.length;
      if ((proseCharacters || 0) < 18) continue;

      const score =
        Math.abs(horizontalGap) +
        Math.abs(rise - target.size * 0.35) * 0.35;
      if (score < bestScore) {
        bestTarget = target;
        bestScore = score;
      }
    }

    if (!bestTarget) continue;
    bestTarget.footnoteMarkers.push({ marker, x: candidate.x });
    consumed.add(candidate);
  }

  for (const item of prepared) {
    item.footnoteMarkers.sort((first, second) => first.x - second.x);
  }

  return prepared.filter((item) => !consumed.has(item));
}

function joinLine(items) {
  const sorted = [...items].sort((first, second) => first.x - second.x);
  let result = "";
  let previous = null;

  for (const item of sorted) {
    const text = item.text.trim();
    if (!text) continue;
    const decoratedText =
      text +
      (item.footnoteMarkers || [])
        .map(({ marker }) => footnoteToken(marker))
        .join("");

    if (!previous) {
      result = decoratedText;
      previous = item;
      continue;
    }

    const gap = item.x - (previous.x + previous.width);
    const spacingThreshold = Math.max(
      0.8,
      Math.min(previous.size, item.size) * 0.12,
    );
    const punctuation = /^[,.;:!?%)}\]]/.test(text);
    const afterOpeningMark = /[(\[{/]$/.test(result);
    const explicitSpace =
      /^\s/.test(item.text) || /\s$/.test(previous.text);
    const separator =
      punctuation || afterOpeningMark
        ? ""
        : explicitSpace || gap > spacingThreshold
          ? " "
          : "";

    result += `${separator}${decoratedText}`;
    previous = item;
  }

  return result
    .replace(/\s+([,.;:!?%])/g, "$1")
    .replace(/([([{])\s+/g, "$1");
}

function joinParagraphLines(lines) {
  let paragraph = "";

  for (const line of lines) {
    if (!paragraph) {
      paragraph = line;
      continue;
    }

    if (/-$/.test(paragraph) && /^[a-zà-ÿ]/iu.test(line)) {
      paragraph = `${paragraph.slice(0, -1)}${line}`;
    } else {
      paragraph += ` ${line}`;
    }
  }

  return paragraph.replace(/\s+/g, " ").trim();
}

function textPageToHtml(content, viewport) {
  const meaningful = meaningfulTextItems(content, viewport);
  const sourceCharacters = meaningful.reduce(
    (total, item) => total + cleanExtractedText(item.str).trim().length,
    0,
  );
  const usable = meaningful
    .filter((item) => {
      const y = item.transform?.[5] || 0;
      return y > viewport.height * 0.02 && y < viewport.height * 0.98;
    })
    .map(textItem)
    .filter((item) => item.text.trim());

  if (!usable.length) {
    return {
      html: "",
      sourceCharacters,
      includedCharacters: 0,
      outputCharacters: 0,
    };
  }

  const bodySize = estimateBodySize(usable, viewport);
  const includedCharacters = usable.reduce(
    (total, item) => total + item.text.trim().length,
    0,
  );
  const reflowItems = attachFootnoteReferences(usable, bodySize);
  const lines = [];
  for (const item of [...reflowItems].sort(
    (first, second) => second.y - first.y || first.x - second.x,
  )) {
    let line = lines.find(
      (candidate) =>
        Math.abs(candidate.y - item.y) <= Math.max(2.5, item.size * 0.28),
    );

    if (!line) {
      line = { y: item.y, size: item.size, items: [] };
      lines.push(line);
    }

    line.items.push(item);
    line.size = Math.max(line.size, item.size);
  }

  lines.sort((first, second) => second.y - first.y);
  const blocks = [];
  const capturedText = [];
  let paragraph = [];
  let listItems = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = joinParagraphLines(paragraph);
    if (text) {
      blocks.push(`<p>${inlineTextToHtml(text)}</p>`);
      capturedText.push(inlineTextToPlainText(text));
    }
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(
      `<ul>${listItems
        .map((item) => `<li>${inlineTextToHtml(item)}</li>`)
        .join("")}</ul>`,
    );
    capturedText.push(...listItems.map(inlineTextToPlainText));
    listItems = [];
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const text = joinLine(line.items);
    if (!text) continue;

    const next = lines[index + 1];
    const gap = next ? line.y - next.y : bodySize * 2;
    const headingByNumber = /^\d+(?:\.\d+)*\s+\S/.test(text);
    const listMatch = text.match(/^[•·▪◦*–-]\s+(.+)/);

    if (line.size >= bodySize * 1.35 || headingByNumber) {
      flushParagraph();
      flushList();
      const level = line.size >= bodySize * 1.7 ? "h2" : "h3";
      blocks.push(`<${level}>${inlineTextToHtml(text)}</${level}>`);
      capturedText.push(inlineTextToPlainText(text));
      continue;
    }

    if (listMatch) {
      flushParagraph();
      listItems.push(listMatch[1]);
      continue;
    }

    flushList();
    paragraph.push(text);
    if (/[.!?:;)]$/.test(text) || gap > bodySize * 1.65) {
      flushParagraph();
    }
  }

  flushParagraph();
  flushList();

  return {
    html: blocks.join("\n"),
    sourceCharacters,
    includedCharacters,
    outputCharacters: capturedText.join(" ").length,
  };
}

function hasParallelColumns(content, viewport) {
  const items = meaningfulTextItems(content, viewport).map(textItem);
  if (items.length < 12) return false;

  const rows = [];
  for (const item of [...items].sort(
    (first, second) => second.y - first.y || first.x - second.x,
  )) {
    let row = rows.find(
      (candidate) =>
        Math.abs(candidate.y - item.y) <= Math.max(3, item.size * 0.32),
    );
    if (!row) {
      row = { y: item.y, items: [] };
      rows.push(row);
    }
    row.items.push(item);
  }

  const gutterCenters = [];
  const minimumGap = viewport.width * 0.075;

  for (const row of rows) {
    const sorted = [...row.items].sort(
      (first, second) => first.x - second.x,
    );
    let widest = null;

    for (let index = 0; index < sorted.length - 1; index++) {
      const left = sorted[index];
      const right = sorted[index + 1];
      const leftEnd = left.x + left.width;
      const gap = right.x - leftEnd;
      const center = leftEnd + gap / 2;
      const fontGap = Math.max(left.size, right.size) * 3.5;

      if (
        gap >= Math.max(minimumGap, fontGap) &&
        center >= viewport.width * 0.32 &&
        center <= viewport.width * 0.68 &&
        (!widest || gap > widest.gap)
      ) {
        widest = { center, gap };
      }
    }

    if (widest) gutterCenters.push(widest.center);
  }

  const alignmentTolerance = viewport.width * 0.055;
  const alignedRows = gutterCenters.reduce(
    (maximum, center) =>
      Math.max(
        maximum,
        gutterCenters.filter(
          (candidate) => Math.abs(candidate - center) <= alignmentTolerance,
        ).length,
      ),
    0,
  );

  return alignedRows >= 4 && alignedRows / rows.length >= 0.16;
}

function hasSuspiciousText(content) {
  const meaningful = content.items.filter((item) => item.str?.trim());
  const combined = meaningful.map((item) => item.str).join("");
  const invalidCharacters =
    combined.match(/[\uFFFD\uE000-\uF8FF]/gu) || [];
  if (
    invalidCharacters.length >= 3 ||
    (invalidCharacters.length >= 2 &&
      invalidCharacters.length / Math.max(1, combined.length) >= 0.01)
  ) {
    return true;
  }

  const mathCharacters = combined.match(/[∑∏∫√∞≈≠≤≥⊂⊃∈∉∂∆∇]/gu) || [];
  const mathFontItems = meaningful.filter((item) => {
    const family = content.styles?.[item.fontName]?.fontFamily || "";
    return /(?:math|symbol|cmmi|cmsy|msam|msbm|stix|euler)/i.test(family);
  }).length;

  return mathFontItems >= 3 || mathCharacters.length >= 3;
}

function hasSignificantRotatedText(content, viewport) {
  const meaningful = meaningfulTextItems(content, viewport);
  const rotated = meaningful.filter(
    (item) =>
      Math.abs(item.transform?.[1] || 0) > 0.1 ||
      Math.abs(item.transform?.[2] || 0) > 0.1,
  );
  const rotatedCharacters = rotated.reduce(
    (total, item) => total + cleanExtractedText(item.str).trim().length,
    0,
  );
  const totalCharacters = meaningful.reduce(
    (total, item) => total + cleanExtractedText(item.str).trim().length,
    0,
  );

  return (
    rotated.length >= 3 ||
    rotatedCharacters >= 12 ||
    (rotatedCharacters >= 2 &&
      rotatedCharacters / Math.max(1, totalCharacters) >= 0.02)
  );
}

function multiplyTransform(first, second) {
  return [
    first[0] * second[0] + first[2] * second[1],
    first[1] * second[0] + first[3] * second[1],
    first[0] * second[2] + first[2] * second[3],
    first[1] * second[2] + first[3] * second[3],
    first[0] * second[4] + first[2] * second[5] + first[4],
    first[1] * second[4] + first[3] * second[5] + first[5],
  ];
}

function imageOperationStats(operations, viewport) {
  const stack = [];
  let transform = [1, 0, 0, 1, 0, 0];
  let count = 0;
  let unknown = 0;
  let grouped = false;
  let maxAreaRatio = 0;
  let totalAreaRatio = 0;

  for (let index = 0; index < operations.fnArray.length; index++) {
    const operation = operations.fnArray[index];
    const args = operations.argsArray?.[index] || [];

    if (operation === pdfjsLib.OPS.save) {
      stack.push([...transform]);
      continue;
    }
    if (operation === pdfjsLib.OPS.restore) {
      transform = stack.pop() || [1, 0, 0, 1, 0, 0];
      continue;
    }
    if (operation === pdfjsLib.OPS.transform && args.length >= 6) {
      transform = multiplyTransform(transform, args.slice(0, 6));
      continue;
    }
    if (!IMAGE_OPERATIONS.has(operation)) continue;

    count += 1;
    grouped ||= GROUPED_IMAGE_OPERATIONS.has(operation);
    const width = Math.hypot(transform[0], transform[1]);
    const height = Math.hypot(transform[2], transform[3]);
    const areaRatio =
      viewport.width > 0 && viewport.height > 0
        ? (width * height) / (viewport.width * viewport.height)
        : 0;

    if (Number.isFinite(areaRatio) && areaRatio >= 0.00001) {
      maxAreaRatio = Math.max(maxAreaRatio, areaRatio);
      totalAreaRatio += Math.min(areaRatio, 1);
    } else {
      unknown += 1;
    }
  }

  return {
    count,
    unknown,
    grouped,
    maxAreaRatio,
    totalAreaRatio,
    significant:
      grouped ||
      maxAreaRatio >= 0.025 ||
      totalAreaRatio >= 0.04 ||
      (count === 1 && unknown === 1) ||
      (count > 1 && totalAreaRatio >= 0.012) ||
      (count > 1 && unknown > 0),
  };
}

function vectorOperationStats(operations) {
  let pathSegments = 0;
  let complexPathSegments = 0;
  let paintOperations = 0;
  let shadingOperations = 0;

  for (let index = 0; index < operations.fnArray.length; index++) {
    const operation = operations.fnArray[index];
    if (operation === pdfjsLib.OPS.constructPath) {
      const pathOperations = operations.argsArray?.[index]?.[0];
      if (Array.isArray(pathOperations) || ArrayBuffer.isView(pathOperations)) {
        const segments = pathOperations.length || 1;
        pathSegments += segments;
        complexPathSegments += segments;
      } else {
        pathSegments += 1;
        if (VECTOR_PAINT_OPERATIONS.has(pathOperations)) {
          paintOperations += 1;
        }
      }
    }
    if (VECTOR_PAINT_OPERATIONS.has(operation)) paintOperations += 1;
    if (operation === pdfjsLib.OPS.shadingFill) shadingOperations += 1;
  }

  return {
    pathSegments,
    complexPathSegments,
    paintOperations,
    shadingOperations,
  };
}

async function pageNeedsVisual(page, content) {
  const viewport = page.getViewport({ scale: 1 });
  if (viewport.width > viewport.height) {
    return {
      visual: true,
      reason: "pagina orizzontale",
      preserveWhole: true,
    };
  }

  const meaningful = meaningfulTextItems(content, viewport);
  if (meaningful.length < 5) {
    return {
      visual: true,
      reason: "testo insufficiente",
      preserveWhole: true,
    };
  }
  if (hasSignificantRotatedText(content, viewport)) {
    return { visual: true, reason: "testo ruotato" };
  }
  if (hasParallelColumns(content, viewport)) {
    return { visual: true, reason: "layout a colonne o tabella" };
  }
  if (hasSuspiciousText(content)) {
    return { visual: true, reason: "notazione matematica complessa" };
  }

  const operations = await page.getOperatorList();
  const images = imageOperationStats(operations, viewport);
  if (images.significant) {
    return {
      visual: true,
      reason: "immagini significative",
      preserveWhole:
        images.maxAreaRatio >= 0.18 ||
        images.totalAreaRatio >= 0.35 ||
        (images.unknown > 0 && meaningful.length < 12),
    };
  }

  const vectors = vectorOperationStats(operations);
  if (
    vectors.shadingOperations > 0 ||
    vectors.complexPathSegments >= 18 ||
    vectors.paintOperations >= 8
  ) {
    return { visual: true, reason: "grafica vettoriale complessa" };
  }

  return { visual: false, reason: "testo lineare" };
}

function textConversionLooksIncomplete(converted) {
  if (!converted.html || converted.sourceCharacters === 0) return true;
  const marginCoverage =
    converted.includedCharacters / Math.max(1, converted.sourceCharacters);
  const outputCoverage =
    converted.outputCharacters / Math.max(1, converted.includedCharacters);
  return marginCoverage < 0.78 || outputCoverage < 0.72;
}

function rowInk(context, y, left, width) {
  const data = context.getImageData(left, y, width, 1).data;
  let dark = 0;
  for (let index = 0; index < data.length; index += 4) {
    if (
      data[index] < 242 ||
      data[index + 1] < 242 ||
      data[index + 2] < 242
    ) {
      dark += 1;
    }
  }
  return dark;
}

function visualBlockRanges(
  top,
  bottom,
  width,
  inkAtRow,
  { preserveWhole = false } = {},
) {
  if (bottom <= top) return [];
  if (preserveWhole) return [{ start: top, end: bottom }];

  const targetHeight = Math.min(
    VISUAL_TARGET_HEIGHT,
    Math.floor(width * 1.15),
  );
  const ranges = [];
  let start = top;

  while (start < bottom) {
    let end = Math.min(bottom, start + targetHeight);
    let leastInk = 0;

    if (end < bottom) {
      let best = end;
      leastInk = Infinity;
      for (
        let y = Math.max(
          start + VISUAL_MIN_BLOCK_HEIGHT,
          end - VISUAL_CUT_SEARCH_RADIUS,
        );
        y <= Math.min(bottom, end + VISUAL_CUT_SEARCH_RADIUS);
        y += VISUAL_CUT_SCAN_STEP
      ) {
        const ink = inkAtRow(y);
        if (ink < leastInk) {
          leastInk = ink;
          best = y;
        }
      }
      if (!Number.isFinite(leastInk)) leastInk = 0;
      end = best;
    }

    ranges.push({ start, end });
    const needsOverlap =
      end < bottom && leastInk > Math.max(4, width * 0.012);
    const nextStart = needsOverlap ? end - VISUAL_CUT_OVERLAP : end;
    start = Math.max(start + 1, nextStart);
  }

  return ranges;
}

function looksPhotographicPixels(data) {
  let colored = 0;
  const colors = new Set();

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    if (Math.max(red, green, blue) - Math.min(red, green, blue) > 22) {
      colored += 1;
    }
    colors.add(`${red >> 4}:${green >> 4}:${blue >> 4}`);
  }

  const pixels = Math.max(1, data.length / 4);
  return colored / pixels >= 0.22 && colors.size >= 320;
}

function chooseCanvasFormat(canvas) {
  const sample = document.createElement("canvas");
  sample.width = 64;
  sample.height = 64;
  const context = sample.getContext("2d", { willReadFrequently: true });
  context.drawImage(canvas, 0, 0, sample.width, sample.height);
  const photographic = looksPhotographicPixels(
    context.getImageData(0, 0, sample.width, sample.height).data,
  );
  sample.width = 1;
  sample.height = 1;

  return photographic
    ? { extension: "jpg", mediaType: "image/jpeg", quality: 0.9 }
    : { extension: "png", mediaType: "image/png", quality: undefined };
}

function canvasBytes(canvas, mediaType, quality) {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      async (blob) =>
        blob
          ? resolve(new Uint8Array(await blob.arrayBuffer()))
          : reject(new Error("Impossibile convertire l’immagine di una pagina.")),
      mediaType,
      quality,
    ),
  );
}

async function encodeCanvas(canvas) {
  const format = chooseCanvasFormat(canvas);
  return {
    ...format,
    bytes: await canvasBytes(canvas, format.mediaType, format.quality),
  };
}

async function renderPage(page, canvas, viewport, signal) {
  throwIfAborted(signal);
  const context = canvas.getContext("2d", { alpha: false });
  context.save();
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.restore();

  const task = page.render({ canvasContext: context, viewport, intent: "print" });
  const cancel = () => task.cancel();
  signal?.addEventListener("abort", cancel, { once: true });

  try {
    await task.promise;
    throwIfAborted(signal);
  } catch (error) {
    if (signal?.aborted || error?.name === "RenderingCancelledException") {
      throw abortError();
    }
    throw error;
  } finally {
    signal?.removeEventListener("abort", cancel);
  }

  return context;
}

async function renderVisualBlocks(
  page,
  chapterIndex,
  pageNumber,
  signal,
  { preserveWhole = false } = {},
) {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.max(0.25, Math.min(3, VISUAL_RENDER_WIDTH / base.width));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = await renderPage(page, canvas, viewport, signal);
  const left = Math.floor(canvas.width * 0.015);
  const top = Math.floor(canvas.height * 0.015);
  const width = Math.max(1, canvas.width - left * 2);
  const bottom = Math.floor(canvas.height * 0.985);
  const ranges = visualBlockRanges(
    top,
    bottom,
    width,
    (y) => rowInk(context, y, left, width),
    { preserveWhole },
  );
  const blocks = [];
  let blockIndex = 0;

  try {
    for (const { start, end } of ranges) {
      throwIfAborted(signal);

      const output = document.createElement("canvas");
      output.width = width;
      output.height = Math.max(1, end - start);
      const outputContext = output.getContext("2d", { alpha: false });
      outputContext.fillStyle = "#ffffff";
      outputContext.fillRect(0, 0, output.width, output.height);
      outputContext.drawImage(
        canvas,
        left,
        start,
        width,
        end - start,
        0,
        0,
        width,
        end - start,
      );

      const encoded = await encodeCanvas(output);
      const name =
        `images/chapter-${String(chapterIndex).padStart(3, "0")}` +
        `-page-${String(pageNumber).padStart(3, "0")}` +
        `-${++blockIndex}.${encoded.extension}`;
      blocks.push({
        name,
        bytes: encoded.bytes,
        mediaType: encoded.mediaType,
      });
      output.width = 1;
      output.height = 1;
      await yieldToBrowser(signal);
    }
  } finally {
    canvas.width = 1;
    canvas.height = 1;
  }

  return blocks;
}

async function fetchPdfWithRetry(
  url,
  fetchImpl = globalThis.fetch,
  {
    signal,
    timeoutMs = PDF_DOWNLOAD_TIMEOUT_MS,
    retryDelays = PDF_DOWNLOAD_RETRY_DELAYS_MS,
    onRetry = () => {},
  } = {},
) {
  let lastError = null;

  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    throwIfAborted(signal);
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener("abort", cancel, { once: true });
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(url, { signal: controller.signal });
      if (!response.ok) {
        const error = new Error(`Download non riuscito (HTTP ${response.status})`);
        error.status = response.status;
        throw error;
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.length) throw new Error("Il PDF scaricato è vuoto");
      return bytes;
    } catch (error) {
      if (signal?.aborted) throw abortError();
      lastError = controller.signal.aborted
        ? new Error(`Download scaduto dopo ${Math.round(timeoutMs / 1000)} secondi`)
        : error;

      const clientError =
        Number.isFinite(error?.status) &&
        error.status >= 400 &&
        error.status < 500 &&
        ![408, 429].includes(error.status);
      if (clientError || attempt === retryDelays.length) break;

      onRetry(attempt + 1, retryDelays.length, lastError);
      await waitWithSignal(retryDelays[attempt], signal);
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", cancel);
    }
  }

  throw lastError || new Error("Download del PDF non riuscito");
}

async function convertMaterial(
  material,
  chapterIndex,
  materialCount,
  onProgress,
  { signal } = {},
) {
  const bytes = await fetchPdfWithRetry(material.url, globalThis.fetch, {
    signal,
    onRetry: (attempt, total) =>
      onProgress({
        completed: chapterIndex - 1,
        total: materialCount,
        percent: ((chapterIndex - 1) / materialCount) * EPUB_CONVERSION_PERCENT,
        message:
          `Nuovo tentativo di download ${attempt}/${total}: ` +
          material.chapter,
        details: `Dispensa ${chapterIndex} di ${materialCount}`,
      }),
  });
  let loadingTask = null;
  let pdf = null;
  let destroyPromise = null;

  function destroyActivePdf() {
    if (destroyPromise) return;
    const target = pdf || loadingTask;
    if (!target) return;
    destroyPromise = Promise.resolve(target.destroy()).catch(() => {});
  }

  try {
    throwIfAborted(signal);
    loadingTask = pdfjsLib.getDocument({
      data: bytes,
      standardFontDataUrl: new URL(
        "./vendor/standard_fonts/",
        import.meta.url,
      ).href,
    });
    signal?.addEventListener("abort", destroyActivePdf, { once: true });
    pdf = await loadingTask.promise;
    if (!pdf.numPages) throw new Error("Il PDF non contiene pagine");

    const images = [];
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      throwIfAborted(signal);
      const fraction = (pageNumber - 1) / pdf.numPages;
      onProgress({
        completed: chapterIndex - 1 + fraction,
        total: materialCount,
        percent:
          ((chapterIndex - 1 + fraction) / materialCount) *
          EPUB_CONVERSION_PERCENT,
        message:
          `Conversione dispensa ${chapterIndex} di ${materialCount}: ` +
          `${material.chapter} — pagina ${pageNumber} di ${pdf.numPages}`,
        details:
          `Dispensa ${chapterIndex} di ${materialCount} · ` +
          `pagina ${pageNumber} di ${pdf.numPages}`,
      });

      const page = await pdf.getPage(pageNumber);
      try {
        const content = await page.getTextContent();
        const classification = await pageNeedsVisual(page, content);
        let visual = classification.visual;
        let converted = null;

        if (!visual) {
          converted = textPageToHtml(
            content,
            page.getViewport({ scale: 1 }),
          );
          visual = textConversionLooksIncomplete(converted);
          if (visual) {
            debugLog(
              "[PlumePilot] EPUB text fallback switched to visual rendering:",
              material.chapter,
              `page ${pageNumber}`,
            );
          }
        }

        if (visual) {
          const preserveWhole = Boolean(classification.preserveWhole);
          const blocks = await renderVisualBlocks(
            page,
            chapterIndex,
            pageNumber,
            signal,
            { preserveWhole },
          );
          images.push(...blocks);
          pages.push(
            `<section class="visual-page${preserveWhole ? " visual-page-whole" : ""}" ` +
              `aria-label="Pagina ${pageNumber}">` +
              blocks
                .map(
                  (block, index) =>
                    `<img src="../${escapeXml(block.name)}" ` +
                    `alt="${escapeXml(material.chapter)}, pagina ${pageNumber}` +
                    `${blocks.length > 1 ? `, parte ${index + 1}` : ""}"/>`,
                )
                .join("\n") +
              `</section>`,
          );
        } else {
          pages.push(`<section class="text-page">${converted.html}</section>`);
        }
      } finally {
        page.cleanup();
      }

      await yieldToBrowser(signal);
    }

    if (!pages.length) {
      throw new Error("Il PDF non ha prodotto contenuti EPUB utilizzabili");
    }

    return { html: pages.join("\n"), images };
  } catch (error) {
    if (signal?.aborted) throw abortError();
    throw error;
  } finally {
    signal?.removeEventListener("abort", destroyActivePdf);
    if (destroyPromise) {
      await destroyPromise;
    } else if (pdf) {
      await pdf.destroy().catch(() => {});
    } else if (loadingTask) {
      await loadingTask.destroy().catch(() => {});
    }
  }
}

function sectionLabelFor(item) {
  const explicit = String(item?.section || "").trim();
  if (explicit) return explicit;

  const chapter = String(item?.chapter || "").trim();
  const separatorIndex = chapter.indexOf(" — ");
  return separatorIndex > 0 ? chapter.slice(0, separatorIndex).trim() : "Dispense";
}

function chapterLabelFor(item) {
  const explicit = String(item?.chapterTitle || "").trim();
  if (explicit) return explicit;

  const chapter = String(item?.chapter || "").trim();
  const section = sectionLabelFor(item);
  const prefix = `${section} — `;
  return chapter.startsWith(prefix) ? chapter.slice(prefix.length).trim() : chapter;
}

function groupBySection(items) {
  const groups = [];
  const byLabel = new Map();

  for (const item of items) {
    const label = sectionLabelFor(item);
    let group = byLabel.get(label);

    if (!group) {
      group = { label, items: [] };
      byLabel.set(label, group);
      groups.push(group);
    }

    group.items.push(item);
  }

  return groups;
}

const xhtml = (title, body, styleHref = "../styles/book.css") =>
  `<?xml version="1.0" encoding="utf-8"?>\n` +
  `<!DOCTYPE html>\n` +
  `<html xmlns="http://www.w3.org/1999/xhtml" lang="it" xml:lang="it">` +
  `<head><meta charset="utf-8"/><title>${escapeXml(title)}</title>` +
  `<link rel="stylesheet" type="text/css" href="${styleHref}"/></head>` +
  `<body>${body}</body></html>`;

export async function buildCourseEpub(
  courseTitle,
  materials,
  onProgress = () => {},
  { generatorVersion = "versione sconosciuta", signal } = {},
) {
  throwIfAborted(signal);
  const zip = new globalThis.JSZip();
  const included = [];
  const failures = [];
  const generator = `PlumePilot ${generatorVersion}`;

  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0"?>` +
      `<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">` +
      `<rootfiles><rootfile full-path="OEBPS/package.opf" ` +
      `media-type="application/oebps-package+xml"/></rootfiles></container>`,
  );
  zip.file(
    "OEBPS/styles/book.css",
    `body{font-family:serif;line-height:1.55;margin:4%;color:#202124}` +
      `h1,h2,h3{font-family:sans-serif;line-height:1.25;color:#421f7c;page-break-after:avoid;break-after:avoid}` +
      `h1{font-size:1.8em}h2{font-size:1.4em}.subtitle{color:#666}` +
      `.signature{margin:0 0 2.2em;padding:0 0 .65em;border-bottom:1px solid #e5dff0;color:#666;font:normal .82em/1.4 sans-serif}` +
      `.text-page{margin:0 0 1.8em}.text-page p{margin:.55em 0;text-align:left}` +
      `.footnote-ref{font-size:.65em;line-height:0;vertical-align:super;color:inherit;margin-left:.04em}` +
      `.text-page ul{margin:.6em 0 .8em 1.4em;padding:0}.text-page li{margin:.28em 0}` +
      `.text-page li::marker{color:#d99a24}.visual-page{margin:.5em 0 1.2em}` +
      `.visual-page img{display:block;width:auto;max-width:100%;height:auto;margin:.2em auto;page-break-inside:avoid;break-inside:avoid}` +
      `.visual-page-whole{margin:0;page-break-inside:avoid;break-inside:avoid;text-align:center}` +
      `.visual-page-whole img{max-height:90vh;object-fit:contain}` +
      `.chapter-note{font-size:.85em;color:#666}`,
  );

  const titleName = "text/title.xhtml";
  zip.file(
    `OEBPS/${titleName}`,
    xhtml(
      courseTitle,
      `<main><p class="signature">${escapeXml(STUDYWING_SIGNATURE)}</p>` +
        `<h1>${escapeXml(courseTitle)}</h1>` +
        `<p class="subtitle">Dispense complete del corso</p></main>`,
    ),
  );

  for (let index = 0; index < materials.length; index++) {
    throwIfAborted(signal);
    const material = materials[index];
    onProgress({
      completed: index,
      total: materials.length,
      percent: (index / materials.length) * EPUB_CONVERSION_PERCENT,
      message: `Download dispensa ${index + 1} di ${materials.length}: ${material.chapter}`,
      details: `Dispensa ${index + 1} di ${materials.length}`,
    });

    try {
      const converted = await convertMaterial(
        material,
        index + 1,
        materials.length,
        onProgress,
        { signal },
      );
      const file = `text/chapter-${String(index + 1).padStart(3, "0")}.xhtml`;
      zip.file(
        `OEBPS/${file}`,
        xhtml(
          material.chapter,
          `<main><h1>${escapeXml(
            material.chapterTitle || material.chapter,
          )}</h1>` +
            `<p class="chapter-note">${escapeXml(material.section || "")}</p>` +
            `${converted.html}</main>`,
        ),
      );
      for (const image of converted.images) {
        zip.file(`OEBPS/${image.name}`, image.bytes, { compression: "STORE" });
      }
      included.push({ ...material, file, images: converted.images });
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      console.error(
        "[PlumePilot] EPUB chapter conversion failed:",
        material.chapter,
        error,
      );
      failures.push({
        chapter: material.chapter,
        reason: error?.message || "Conversione non riuscita",
        cacheKey: material.cacheKey || null,
      });
    }
  }

  if (!included.length) {
    throw new Error(
      `Non è stato possibile convertire nessuna dispensa. ${failures
        .map((failure) => `${failure.chapter}: ${failure.reason}`)
        .join("; ")}`,
    );
  }

  const sectionGroups = groupBySection(included);
  const navItems = sectionGroups
    .map((group) =>
      `<li><a href="${escapeXml(group.items[0].file)}">${escapeXml(group.label)}</a>` +
        `<ol>${group.items
          .map(
            (item) =>
              `<li><a href="${escapeXml(item.file)}">${escapeXml(chapterLabelFor(item))}</a></li>`,
          )
          .join("")}</ol></li>`,
    )
    .join("");
  zip.file(
    "OEBPS/nav.xhtml",
    xhtml(
      "Indice",
      `<nav xmlns:epub="http://www.idpf.org/2007/ops" epub:type="toc" id="toc">` +
        `<h1>Indice</h1><ol><li><a href="${titleName}">Copertina</a></li>` +
        `${navItems}</ol></nav>`,
      "styles/book.css",
    ),
  );

  const uuid = crypto.randomUUID();
  const modified = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const chapterManifest = included
    .map(
      (item, index) =>
        `<item id="chapter-${index + 1}" href="${escapeXml(item.file)}" ` +
        `media-type="application/xhtml+xml"/>`,
    )
    .join("");
  const imageManifest = included
    .flatMap((item) => item.images)
    .map(
      (image, index) =>
        `<item id="image-${index + 1}" href="${escapeXml(image.name)}" ` +
        `media-type="${escapeXml(image.mediaType)}"/>`,
    )
    .join("");
  const spine = included
    .map((item, index) => `<itemref idref="chapter-${index + 1}"/>`)
    .join("");
  let ncxPlayOrder = 2;
  const ncxPoints = sectionGroups
    .map((group, sectionIndex) => {
      const sectionPlayOrder = ncxPlayOrder++;
      const childPoints = group.items
        .map((item, chapterIndex) => {
          const chapterPlayOrder = ncxPlayOrder++;
          return (
            `<navPoint id="nav-chapter-${sectionIndex + 1}-${chapterIndex + 1}" ` +
            `playOrder="${chapterPlayOrder}">` +
            `<navLabel><text>${escapeXml(chapterLabelFor(item))}</text></navLabel>` +
            `<content src="${escapeXml(item.file)}"/></navPoint>`
          );
        })
        .join("");

      return (
        `<navPoint id="nav-section-${sectionIndex + 1}" playOrder="${sectionPlayOrder}">` +
        `<navLabel><text>${escapeXml(group.label)}</text></navLabel>` +
        `<content src="${escapeXml(group.items[0].file)}"/>${childPoints}</navPoint>`
      );
    })
    .join("");

  zip.file(
    "OEBPS/toc.ncx",
    `<?xml version="1.0" encoding="utf-8"?>` +
      `<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">` +
      `<head><meta name="dtb:uid" content="urn:uuid:${uuid}"/></head>` +
      `<docTitle><text>${escapeXml(courseTitle)}</text></docTitle><navMap>` +
      `<navPoint id="nav-1" playOrder="1"><navLabel><text>Copertina</text></navLabel>` +
      `<content src="${titleName}"/></navPoint>${ncxPoints}</navMap></ncx>`,
  );
  zip.file(
    "OEBPS/package.opf",
    `<?xml version="1.0" encoding="utf-8"?>` +
      `<package xmlns="http://www.idpf.org/2007/opf" version="3.0" ` +
      `unique-identifier="book-id" xml:lang="it">` +
      `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">` +
      `<dc:identifier id="book-id">urn:uuid:${uuid}</dc:identifier>` +
      `<dc:title>${escapeXml(courseTitle)}</dc:title><dc:language>it</dc:language>` +
      `<dc:creator>PlumePilot</dc:creator>` +
      `<dc:description>Generato con ${escapeXml(generator)}</dc:description>` +
      `<meta property="dcterms:modified">${modified}</meta></metadata>` +
      `<manifest><item id="title" href="${titleName}" media-type="application/xhtml+xml"/>` +
      `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>` +
      `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>` +
      `${chapterManifest}${imageManifest}</manifest><spine toc="ncx">` +
      `<itemref idref="title"/>${spine}</spine></package>`,
  );

  throwIfAborted(signal);
  onProgress({
    completed: materials.length,
    total: materials.length,
    percent: EPUB_CONVERSION_PERCENT,
    message: "Creazione del pacchetto EPUB…",
    details: `${included.length} dispense convertite · compressione 0%`,
    cancellable: false,
  });
  const bytes = await zip.generateAsync(
    {
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    },
    (metadata) =>
      onProgress({
        completed: materials.length,
        total: materials.length,
        percent:
          EPUB_CONVERSION_PERCENT +
          (metadata.percent / 100) * (100 - EPUB_CONVERSION_PERCENT),
        message: "Creazione del pacchetto EPUB…",
        details:
          `${included.length} dispense convertite · ` +
          `compressione ${Math.round(metadata.percent)}%`,
        cancellable: false,
      }),
  );

  return { bytes, filename: filenameFor(courseTitle), included, failures };
}

export const __testing = {
  cleanExtractedText,
  chapterLabelFor,
  estimateBodySize,
  fetchPdfWithRetry,
  filenameFor,
  groupBySection,
  hasParallelColumns,
  hasSignificantRotatedText,
  hasSuspiciousText,
  imageOperationStats,
  joinLine,
  isBoilerplateTextItem,
  looksPhotographicPixels,
  pageNeedsVisual,
  renderPage,
  sectionLabelFor,
  textConversionLooksIncomplete,
  textPageToHtml,
  vectorOperationStats,
  visualBlockRanges,
};

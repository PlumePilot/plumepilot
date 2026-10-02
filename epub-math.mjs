import { mathFontRanges } from "./epub-math-coverage.mjs";

// Preserve mathematical alphabets (e.g. R vs double-struck R) byte-for-byte.
const mathCharacter = /[\p{Sm}\u0370-\u03ff\u1f00-\u1fff\u2070-\u209f\u2100-\u214f\u2190-\u22ff\u2308-\u230b\u27c0-\u27ef\u2900-\u2aff\u{1d400}-\u{1d7ff}]/u;
const mathRuns = /[\p{Sm}\u0370-\u03ff\u1f00-\u1fff\u2070-\u209f\u2100-\u214f\u2190-\u22ff\u2308-\u230b\u27c0-\u27ef\u2900-\u2aff\u{1d400}-\u{1d7ff}]+/gu;
const unresolvedCharacter = /[\p{Co}\uFFFD\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;

export function hasUnsupportedMathText(value) {
  if (unresolvedCharacter.test(value)) return true;
  return [...value].some((character) => {
    const point = character.codePointAt(0);
    return mathCharacter.test(character) &&
      !mathFontRanges.some(([first, last]) => point >= first && point <= last);
  });
}

// Input has already been XML-escaped, so generated spans cannot inject markup.
export function wrapMathText(escapedText) {
  return escapedText.replace(mathRuns, '<span class="math-symbol">$&</span>');
}

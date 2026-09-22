import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pdfCore = readFileSync(new URL("../pdf-core.js", import.meta.url), "utf8");
const epubCore = readFileSync(new URL("../epub-core.mjs", import.meta.url), "utf8");
const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
const releaseNotes = readFileSync(new URL("../docs/releases/2.33.2.md", import.meta.url), "utf8");

const signatureText = "Assistente per Pegaso, disponibile su Chrome, Edge e Firefox.";

assert.match(pdfCore, new RegExp(signatureText.replace(".", "\\.")));
assert.match(epubCore, new RegExp(signatureText.replace(".", "\\.")));
assert.match(changelog, /^## Fixed in 2\.33\.2:/m);
assert.doesNotMatch(changelog, /^## Unreleased:/m);
assert.match(releaseNotes, /no feature or permission changes/i);

console.log("PASS: historical 2.33.2 release documentation and PDF/EPUB branding are preserved");

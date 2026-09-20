import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
const pdfCore = readFileSync(new URL("../pdf-core.js", import.meta.url), "utf8");
const epubCore = readFileSync(new URL("../epub-core.mjs", import.meta.url), "utf8");
const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
const sourceReadme = readFileSync(new URL("../AMO_SOURCE_README.md", import.meta.url), "utf8");
const releaseNotes = readFileSync(new URL("../docs/releases/2.33.1.md", import.meta.url), "utf8");

const signatureText = "Assistente per Pegaso, disponibile su Chrome, Edge e Firefox.";

assert.equal(manifest.version, "2.33.1");
assert.match(pdfCore, new RegExp(signatureText.replace(".", "\\.")));
assert.match(epubCore, new RegExp(signatureText.replace(".", "\\.")));
assert.match(changelog, /^## Fixed in 2\.33\.1:/m);
assert.doesNotMatch(changelog, /^## Unreleased:/m);
assert.match(sourceReadme, /^# PlumePilot 2\.33\.1/m);
assert.match(sourceReadme, /plumepilot-v2\.33\.1-firefox\.zip/);
assert.match(releaseNotes, /no feature or permission changes/i);

console.log("PASS: 2.33.1 version, release documentation and PDF/EPUB branding are aligned");

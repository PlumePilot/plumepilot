import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
const releaseNotes = readFileSync(new URL("../docs/releases/2.34.0.md", import.meta.url), "utf8");
const sourceReadme = readFileSync(new URL("../AMO_SOURCE_README.md", import.meta.url), "utf8");
const popupHtml = readFileSync(new URL("../popup.html", import.meta.url), "utf8");
const floatingMenu = readFileSync(new URL("../floating-menu.js", import.meta.url), "utf8");

assert.match(manifest.version, /^2\.3[45]\.0$/);
assert.match(changelog, /^## Added in 2\.34\.0:/m);
assert.match(releaseNotes, /Mercatorum and San Raffaele\/UTSR/);
assert.match(sourceReadme, new RegExp(`^# PlumePilot ${manifest.version.replaceAll(".", "\\.")}`, "m"));
assert.ok(sourceReadme.includes(`plumepilot-v${manifest.version}-firefox.zip`));
assert.match(popupHtml, new RegExp(`Novità in PlumePilot ${manifest.version.replaceAll(".", "\\.")}`));
assert.doesNotMatch(popupHtml, /quando Pegaso carica l’esito ufficiale/);
assert.doesNotMatch(floatingMenu, /esiti caricati da Pegaso/);

console.log("PASS: version, release notes, Novità and platform-neutral commission copy are aligned");

import { createRequire } from "node:module";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const JSZip = require(path.join(root, "vendor", "jszip.min.js"));
const releaseDirectory = path.resolve(root, process.argv[2] || "release");
const expectedBrowsers = ["chrome", "firefox", "edge"];

function referencedManifestFiles(manifest) {
  const references = new Set();
  for (const value of Object.values(manifest.icons || {})) references.add(value);
  for (const value of Object.values(manifest.action?.default_icon || {})) references.add(value);
  if (manifest.action?.default_popup) references.add(manifest.action.default_popup);
  if (manifest.background?.service_worker) references.add(manifest.background.service_worker);
  for (const value of manifest.background?.scripts || []) references.add(value);
  for (const script of manifest.content_scripts || []) {
    for (const value of script.js || []) references.add(value);
    for (const value of script.css || []) references.add(value);
  }
  for (const resourceGroup of manifest.web_accessible_resources || []) {
    for (const value of resourceGroup.resources || []) if (!value.includes("*")) references.add(value);
  }
  return references;
}

function validateBrowserManifest(manifest, browser) {
  if (manifest.version !== "2.32.5") throw new Error(`${browser}: versione inattesa ${manifest.version}.`);
  if ([...manifest.description].length > 132) throw new Error(`${browser}: description troppo lunga.`);
  if (browser === "firefox") {
    const gecko = manifest.browser_specific_settings?.gecko;
    if (gecko?.id !== "plumepilot@fabiofloris") throw new Error("Firefox: ID errato.");
    if (gecko?.strict_min_version !== "140.0") throw new Error("Firefox: versione minima errata.");
    const permissions = gecko?.data_collection_permissions?.required || [];
    const expected = ["authenticationInfo", "websiteContent", "websiteActivity"];
    if (JSON.stringify(permissions) !== JSON.stringify(expected)) throw new Error("Firefox: dichiarazione dati errata.");
    if (!manifest.background?.scripts || manifest.background?.service_worker) throw new Error("Firefox: background errato.");
  } else {
    if (!manifest.background?.service_worker || manifest.background?.scripts) throw new Error(`${browser}: background errato.`);
    if (manifest.browser_specific_settings) throw new Error(`${browser}: configurazione Gecko presente.`);
  }
}

for (const browser of expectedBrowsers) {
  const filename = `plumepilot-v2.32.5-${browser}.zip`;
  const bytes = await readFile(path.join(releaseDirectory, filename));
  const zip = await JSZip.loadAsync(bytes);
  const names = Object.keys(zip.files).filter((name) => !zip.files[name].dir);
  if (!zip.file("manifest.json")) throw new Error(`${browser}: manifest.json non è alla radice.`);
  if (names.some((name) => name.startsWith("plumepilot-v") || name.startsWith("studywing-v") || name.startsWith("docs/") || name.startsWith("scripts/") || name.startsWith("release/"))) {
    throw new Error(`${browser}: struttura o file di sviluppo inattesi.`);
  }
  for (const forbidden of ["README.md", "CHANGELOG.md", "PRIVACY.md", "icons/icon-512.png", "vendor/fontkit-README.md"]) {
    if (zip.file(forbidden)) throw new Error(`${browser}: file ridondante incluso: ${forbidden}.`);
  }
  const manifest = JSON.parse(await zip.file("manifest.json").async("string"));
  validateBrowserManifest(manifest, browser);
  for (const reference of referencedManifestFiles(manifest)) {
    if (!zip.file(reference)) throw new Error(`${browser}: file manifest mancante: ${reference}.`);
  }
  for (const name of names.filter((entry) => /\.(?:js|mjs|html)$/i.test(entry) && !entry.startsWith("vendor/"))) {
    const source = await zip.file(name).async("string");
    if (/\beval\s*\(|\bnew\s+Function\s*\(/.test(source)) throw new Error(`${browser}: codice dinamico in ${name}.`);
    if (/<script[^>]+src=["']https?:\/\//i.test(source)) throw new Error(`${browser}: script remoto in ${name}.`);
  }
  if (!zip.file("LICENSE") || !zip.file("THIRD_PARTY_NOTICES.md")) {
    throw new Error(`${browser}: documentazione licenze mancante.`);
  }
  console.log(`${filename}: OK (${names.length} file, manifest alla radice)`);
}

const unexpectedArchives = (await readdir(releaseDirectory)).filter((name) => name.endsWith(".zip") && !expectedBrowsers.some((browser) => name === `plumepilot-v2.32.5-${browser}.zip`));
if (unexpectedArchives.length) throw new Error(`Archivi inattesi: ${unexpectedArchives.join(", ")}`);

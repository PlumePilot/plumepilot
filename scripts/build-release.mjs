import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const JSZip = require(path.join(root, "vendor", "jszip.min.js"));
const outputArgument = process.argv.find((argument) => argument.startsWith("--output-dir="));
const outputDirectory = path.resolve(root, outputArgument?.slice("--output-dir=".length) || "release");
const fixedZipDate = new Date("2026-01-01T00:00:00.000Z");

const excludedFiles = new Set([
  "manifest.json",
  "README.md",
  "CHANGELOG.md",
  "PRIVACY.md",
  "SUPPORT.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "TRADEMARKS.md",
  "vendor/fontkit-README.md",
  "icons/icon-512.png",
]);
const excludedDirectories = new Set([".git", "release", "scripts", "test", "tests"]);

async function collectFiles(directory = root, relativeDirectory = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || (entry.isDirectory() && excludedDirectories.has(entry.name))) continue;
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(absolutePath, relativePath));
    else if (!excludedFiles.has(relativePath)) files.push(relativePath);
  }
  return files.sort();
}

function manifestFor(baseManifest, browser) {
  const manifest = structuredClone(baseManifest);
  if (browser === "firefox") {
    manifest.background = { scripts: ["achievements.js", "background.js"] };
    manifest.browser_specific_settings = {
      gecko: {
        id: "plumepilot@fabiofloris",
        strict_min_version: "140.0",
        data_collection_permissions: {
          required: ["authenticationInfo", "websiteContent", "websiteActivity"],
        },
      },
    };
  } else {
    manifest.background = { service_worker: "background.js" };
    delete manifest.browser_specific_settings;
  }
  return manifest;
}

function validateManifest(manifest, browser) {
  if (manifest.manifest_version !== 3) throw new Error(`${browser}: Manifest V3 richiesto.`);
  if (!/^\d+(?:\.\d+){0,3}$/.test(manifest.version)) throw new Error(`${browser}: versione non valida.`);
  if ([...manifest.description].length > 132) throw new Error(`${browser}: description oltre 132 caratteri.`);
  if (manifest.permissions?.some((permission) => permission !== "storage")) {
    throw new Error(`${browser}: rilevato un permesso API inatteso.`);
  }
  if (browser === "firefox") {
    if (manifest.background?.service_worker) throw new Error("Firefox: service_worker inatteso.");
    if (manifest.browser_specific_settings?.gecko?.id !== "plumepilot@fabiofloris") {
      throw new Error("Firefox: ID definitivo assente.");
    }
  } else {
    if (manifest.background?.scripts) throw new Error(`${browser}: background.scripts inatteso.`);
    if (manifest.browser_specific_settings) throw new Error(`${browser}: configurazione Gecko inattesa.`);
  }
}

const baseManifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
const sourceFiles = await collectFiles();
await mkdir(outputDirectory, { recursive: true });

for (const browser of ["chrome", "firefox", "edge"]) {
  const manifest = manifestFor(baseManifest, browser);
  validateManifest(manifest, browser);
  const zip = new JSZip();
  zip.file("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`, {
    date: fixedZipDate,
    createFolders: false,
  });
  for (const relativePath of sourceFiles) {
    zip.file(relativePath, await readFile(path.join(root, relativePath)), {
      binary: true,
      date: fixedZipDate,
      createFolders: false,
    });
  }
  const bytes = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
    platform: "UNIX",
  });
  const filename = `plumepilot-v${manifest.version}-${browser}.zip`;
  const destination = path.join(outputDirectory, filename);
  await writeFile(destination, bytes);
  const checksum = createHash("sha256").update(bytes).digest("hex");
  console.log(`${filename}\t${bytes.length} byte\tsha256 ${checksum}`);
}

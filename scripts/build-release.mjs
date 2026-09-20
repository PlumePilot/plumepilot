import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const JSZip = require(path.join(root, "vendor", "jszip.js"));
const outputArgument = process.argv.find((argument) => argument.startsWith("--output-dir="));
const outputDirectory = path.resolve(root, outputArgument?.slice("--output-dir=".length) || "release");
const fixedZipDate = new Date("2026-01-01T00:00:00.000Z");
const browsers = ["chrome", "firefox", "edge"];
const edgeLocales = ["en", "it"];

function replaceExactly(source, search, replacement, label) {
  const first = source.indexOf(search);
  if (first < 0 || source.indexOf(search, first + search.length) >= 0) {
    throw new Error(`Firefox review-safe: pattern inatteso (${label}).`);
  }
  return source.slice(0, first) + replacement + source.slice(first + search.length);
}

function firefoxReviewSafeSource(relativePath, bytes) {
  if (!["background.js", "vendor/jszip.js", "vendor/fontkit.umd.js", "vendor/pdf-lib.js", "vendor/pdf.mjs", "vendor/pdf.worker.mjs"].includes(relativePath)) {
    return bytes;
  }

  let source = bytes.toString("utf8");
  if (relativePath === "background.js") {
    source = replaceExactly(
      source,
      `  async function ensureOffscreenAudioDocument() {
    if (!chrome.offscreen?.createDocument) return false;
    if (await chrome.offscreen.hasDocument()) return true;
    if (!offscreenCreation) {
      offscreenCreation = chrome.offscreen.createDocument({
        url: "offscreen-audio.html",
        reasons: ["AUDIO_PLAYBACK"],
        justification: "Riproduce gli avvisi sonori locali richiesti dall’utente.",
      }).finally(() => { offscreenCreation = null; });
    }
    await offscreenCreation;
    return true;
  }`,
      `  async function ensureOffscreenAudioDocument() {
    return false;
  }`,
      "background offscreen fallback",
    );
  } else if (relativePath === "vendor/jszip.js") {
    source = replaceExactly(
      source,
      `      // Callback can either be a function or a string
      if (typeof callback !== "function") {
        callback = new Function("" + callback);
      }`,
      `      // String callbacks require eval-like execution and are not supported.
      if (typeof callback !== "function") {
        throw new TypeError("setImmediate callback must be a function");
      }`,
      "JSZip string callback",
    );
  } else if (relativePath === "vendor/fontkit.umd.js") {
    source = replaceExactly(
      source,
      `\t  bound = Function('binder', 'return function (' + boundArgs.join(',') + '){ return binder.apply(this,arguments); }')(binder);`,
      `\t  bound = function bound() { return binder.apply(this, arguments); };`,
      "fontkit bind fallback",
    );
    source = replaceExactly(
      source,
      `\t  '%eval%': eval,
\t  // eslint-disable-line no-eval`,
      `\t  '%eval%': undefined$1,`,
      "fontkit eval intrinsic",
    );
  } else if (relativePath === "vendor/pdf-lib.js") {
    source = replaceExactly(
      source,
      "\n//# sourceMappingURL=pdf-lib.js.map",
      "",
      "pdf-lib absent source map marker",
    );
  } else {
    source = replaceExactly(
      source,
      `function isEvalSupported() {
  try {
    new Function("");
    return true;
  } catch {
    return false;
  }
}`,
      `function isEvalSupported() {
  return false;
}`,
      `${relativePath} eval feature test`,
    );
    if (relativePath === "vendor/pdf.mjs") {
      source = replaceExactly(
        source,
        `      const worker = await import(
      /*webpackIgnore: true*/
      /*@vite-ignore*/
      this.workerSrc);
      return worker.WorkerMessageHandler;`,
        `      throw new Error("PDF.js fake-worker loading is disabled in the Firefox package.");`,
        "PDF.js dynamic fake-worker import",
      );
    } else {
      source = replaceExactly(
        source,
        `    const path = \`${'${this.#wasmUrl}'}openjpeg_nowasm_fallback.js\`;
    let instance = null;
    try {
      const mod = await import(
      /*webpackIgnore: true*/
      /*@vite-ignore*/
      path);
      instance = mod.default();
    } catch (e) {
      warn(\`JpxImage#getJsModule: ${'${e}'}\`);
    }
    fallbackCallback(instance);`,
        `    warn("JpxImage#getJsModule: JavaScript fallback is not bundled.");
    fallbackCallback(null);`,
        "PDF.js OpenJPEG dynamic fallback import",
      );
      source = replaceExactly(
        source,
        `    if (factory.isEvalSupported && FeatureTest.isEvalSupported) {
      const compiled = new PostScriptCompiler().compile(code, domain, range);
      if (compiled) {
        return new Function("src", "srcOffset", "dest", "destOffset", compiled);
      }
    }
    info("Unable to compile PS function");`,
        `    info("PostScript functions use the interpreter in the Firefox package");`,
        "PDF.js PostScript compiler",
      );
    }
  }
  return Buffer.from(source, "utf8");
}

const excludedFiles = new Set([
  "manifest.json",
  "AMO_SOURCE_README.md",
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
const excludedDirectories = new Set([".git", "docs", "release", "scripts", "test", "tests"]);

async function collectFiles(directory = root, relativeDirectory = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || (entry.isDirectory() && excludedDirectories.has(entry.name))) continue;
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (absolutePath === outputDirectory) continue;
      files.push(...await collectFiles(absolutePath, relativePath));
    }
    else if (!excludedFiles.has(relativePath)) files.push(relativePath);
  }
  return files.sort();
}

function manifestFor(baseManifest, browser) {
  const manifest = structuredClone(baseManifest);
  if (browser === "firefox") {
    manifest.background = { scripts: ["achievements.js", "sound-settings.js", "whats-new.js", "background.js"] };
    manifest.permissions = (manifest.permissions || []).filter((permission) => permission !== "offscreen");
    manifest.browser_specific_settings = {
      gecko_android: {
        strict_min_version: "142.0",
      },
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
    manifest.permissions = [...new Set([...(manifest.permissions || []), "offscreen"])];
    delete manifest.browser_specific_settings;
    if (browser === "edge") {
      manifest.name = "__MSG_extensionName__";
      manifest.description = "__MSG_extensionDescription__";
      manifest.default_locale = "it";
      manifest.action.default_title = "__MSG_extensionName__";
    }
  }
  return manifest;
}

async function collectSourceSubmissionFiles(directory = root, relativeDirectory = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === ".git" ||
        entry.name === ".github" ||
        entry.name === "docs" ||
        entry.name === "release" ||
        absolutePath === outputDirectory
      ) continue;
      files.push(...await collectSourceSubmissionFiles(absolutePath, relativePath));
    } else {
      files.push(relativePath);
    }
  }
  return files.sort();
}

function validateManifest(manifest, browser) {
  if (manifest.manifest_version !== 3) throw new Error(`${browser}: Manifest V3 richiesto.`);
  if (!/^\d+(?:\.\d+){0,3}$/.test(manifest.version)) throw new Error(`${browser}: versione non valida.`);
  if ([...manifest.description].length > 132) throw new Error(`${browser}: description oltre 132 caratteri.`);
  const expectedPermissions = browser === "firefox" ? ["storage"] : ["storage", "offscreen"];
  if (JSON.stringify(manifest.permissions || []) !== JSON.stringify(expectedPermissions)) {
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
    if (browser === "edge") {
      if (manifest.name !== "__MSG_extensionName__") throw new Error("Edge: nome localizzato assente.");
      if (manifest.description !== "__MSG_extensionDescription__") throw new Error("Edge: descrizione localizzata assente.");
      if (manifest.action?.default_title !== "__MSG_extensionName__") throw new Error("Edge: titolo azione localizzato assente.");
      if (manifest.default_locale !== "it") throw new Error("Edge: lingua predefinita errata.");
    }
  }
}

const baseManifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
const sourceFiles = await collectFiles();
const sourceSubmissionFiles = await collectSourceSubmissionFiles();
await mkdir(outputDirectory, { recursive: true });
const existingReleaseArtifacts = (await readdir(outputDirectory))
  .filter((name) => name.endsWith(".zip") || name === "SHA256SUMS.txt");
if (existingReleaseArtifacts.length) {
  throw new Error(
    `La directory di output contiene già artefatti di release: ${existingReleaseArtifacts.join(", ")}. ` +
    "Usare una directory vuota per evitare di confondere o sovrascrivere build precedenti.",
  );
}

const checksumLines = [];
for (const browser of browsers) {
  const manifest = manifestFor(baseManifest, browser);
  validateManifest(manifest, browser);
  const zip = new JSZip();
  zip.file("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`, {
    date: fixedZipDate,
    createFolders: false,
  });
  for (const relativePath of sourceFiles) {
    const sourceBytes = await readFile(path.join(root, relativePath));
    zip.file(relativePath, browser === "firefox"
      ? firefoxReviewSafeSource(relativePath, sourceBytes)
      : sourceBytes, {
      binary: true,
      date: fixedZipDate,
      createFolders: false,
    });
  }
  if (browser === "edge") {
    for (const locale of edgeLocales) {
      const localePath = path.join("scripts", "edge-locales", locale, "messages.json");
      zip.file(
        `_locales/${locale}/messages.json`,
        await readFile(path.join(root, localePath)),
        { binary: true, date: fixedZipDate, createFolders: false },
      );
    }
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
  checksumLines.push(`${checksum}  ${filename}`);
  console.log(`${filename}\t${bytes.length} byte\tsha256 ${checksum}`);
}

const sourceZip = new JSZip();
for (const relativePath of sourceSubmissionFiles) {
  sourceZip.file(relativePath, await readFile(path.join(root, relativePath)), {
    binary: true,
    date: fixedZipDate,
    createFolders: false,
  });
}
const sourceBytes = await sourceZip.generateAsync({
  type: "nodebuffer",
  compression: "DEFLATE",
  compressionOptions: { level: 9 },
  platform: "UNIX",
});
const sourceFilename = `plumepilot-v${baseManifest.version}-source.zip`;
await writeFile(path.join(outputDirectory, sourceFilename), sourceBytes);
checksumLines.push(`${createHash("sha256").update(sourceBytes).digest("hex")}  ${sourceFilename}`);
console.log(
  `${sourceFilename}\t${sourceBytes.length} byte\tsha256 ${createHash("sha256").update(sourceBytes).digest("hex")}`,
);

await writeFile(
  path.join(outputDirectory, "SHA256SUMS.txt"),
  `${checksumLines.join("\n")}\n`,
  "utf8",
);
console.log("SHA256SUMS.txt\tcreato");

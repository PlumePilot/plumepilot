# PlumePilot 2.34.0 — AMO source submission

This archive is provided privately to Mozilla Add-ons reviewers. PlumePilot's first-party JavaScript is shipped as readable source: it is not transpiled, bundled, minified, or obfuscated. The release process selects runtime files, creates the browser-specific manifest, applies the documented Firefox-only review-safety transformations below, and writes deterministic ZIP archives.

## Build environment

- Recommended operating system: Ubuntu 24.04 LTS.
- Node.js: 24.x.
- npm: not required.
- Network access: not required.
- CPU architecture: architecture-independent JavaScript build.

All code and tools required by the build are included in this archive. The build script imports the bundled readable JSZip 3.10.1 distribution from `vendor/jszip.js`.

## Reproduce the Firefox package

From the root of the extracted source archive, run:

```bash
node scripts/build-release.mjs
```

The Firefox package is generated at:

```text
release/plumepilot-v2.34.0-firefox.zip
```

The output directory must not already contain ZIP files or `SHA256SUMS.txt`. To use another empty directory:

```bash
node scripts/build-release.mjs --output-dir=dist
```

## Validate the release

For the default output directory, run:

```bash
node scripts/validate-release.mjs
```

For a custom output directory, pass the path explicitly:

```bash
node scripts/validate-release.mjs dist
```

The validator checks browser-specific manifests, referenced runtime files, absence of remote scripts and dynamic first-party code, licenses, the AMO source archive structure, and all entries in `SHA256SUMS.txt`.

The ZIP writer uses a fixed timestamp, stable file ordering, DEFLATE level 9, and the UNIX platform flag. A compatible Node.js runtime therefore produces the same Firefox archive byte for byte. Compare the generated SHA-256 with the value supplied in the AMO version notes.

## Firefox-only review-safety transformations

`scripts/build-release.mjs` performs exact-match, fail-closed transformations while writing the Firefox ZIP. Chrome and Edge keep the official distributions unchanged. The Firefox package:

- replaces the unsupported Chromium offscreen-audio path with the existing tab-based fallback;
- rejects JSZip's legacy string form of `setImmediate` callbacks (PlumePilot only passes functions);
- replaces two unused legacy fontkit fallbacks that construct or expose executable code;
- removes pdf-lib's dangling source-map marker because the map is not part of the runtime distribution used by PlumePilot;
- forces PDF.js to use its interpreter instead of its optional PostScript compiler;
- disables PDF.js fallback loaders for resources that PlumePilot does not bundle, while retaining the normal module-worker and WebAssembly paths.

Every replacement requires exactly one known upstream code fragment. The build fails if an upstream file changes, preventing an incomplete or accidental patch. `scripts/validate-release.mjs` then scans the entire Firefox archive for the rejected constructs and mirrors AMO's unknown/minified-code heuristic for JavaScript files.

## Third-party libraries

The readable distribution files in the source archive and in the Chrome/Edge packages are unmodified copies from official releases. The Firefox runtime copies contain only the deterministic review-safety transformations documented above. `THIRD_PARTY_NOTICES.md` provides, for every component:

- name and exact version;
- exact file path inside the official npm archive;
- official npm archive and readable tagged source links, or readable versioned source included in the exact npm archive;
- license and local license file;
- SHA-256 of the bundled file.

Before this submission, every source vendor file was compared byte for byte with the corresponding official release. No dependency or executable code is downloaded at extension runtime.

Before submission, the generated 2.34.0 Firefox package must be checked with `web-ext lint 10.6.0` and produce **0 errors, 0 notices, 0 warnings, and an empty `unknownMinifiedFiles` list**.

## Runtime/source separation

Development documentation, tests, build scripts, repository metadata, the 512×512 source icon, and non-runtime vendor documentation are excluded from browser packages. The source archive retains the code, tests, build scripts, source icon, licenses, vendor metadata, and this README required for review; public website and internal store-workflow documents under `docs/` are omitted. The exact exclusions are defined in `scripts/build-release.mjs`.

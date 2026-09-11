# PlumePilot 2.32.9 — AMO source submission

This archive is provided privately to Mozilla Add-ons reviewers. PlumePilot's first-party JavaScript is shipped as readable source: it is not transpiled, bundled, minified, or obfuscated. The release process only selects runtime files, creates the browser-specific manifest, and writes deterministic ZIP archives.

## Build environment

- Recommended operating system: Ubuntu 24.04 LTS.
- Node.js: 24.x.
- npm: not required.
- Network access: not required.
- CPU architecture: architecture-independent JavaScript build.

All code and tools required by the build are included in this archive. The build script imports the bundled official JSZip 3.10.1 release from `vendor/jszip.min.js`.

## Reproduce the Firefox package

From the root of the extracted source archive, run:

```bash
node scripts/build-release.mjs
```

The Firefox package is generated at:

```text
release/plumepilot-v2.32.9-firefox.zip
```

Expected SHA-256:

```text
22b0cd7e281bec6395e742b6cef570e8d48a03da6b6d85c8a3f38f35eed2e97f
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

## Third-party libraries

The minified files in `vendor/` are unmodified copies from official npm releases; PlumePilot does not rebuild or modify them. `THIRD_PARTY_NOTICES.md` provides, for every component:

- name and exact version;
- exact file path inside the official npm archive;
- official npm archive and readable tagged source links;
- license and local license file;
- SHA-256 of the bundled file.

Before this submission, every bundled vendor file was compared byte for byte with the corresponding file extracted using `npm pack`; all comparisons matched. No dependency or executable code is downloaded at extension runtime.

## Runtime/source separation

Development documentation, tests, build scripts, repository metadata, the 512×512 source icon, and non-runtime vendor documentation are excluded from browser packages. The source archive retains the code, tests, build scripts, source icon, licenses, vendor metadata, and this README required for review; public website and internal store-workflow documents under `docs/` are omitted. The exact exclusions are defined in `scripts/build-release.mjs`.

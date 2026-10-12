# 13 — Chrome, Edge, and Firefox

## One codebase, different runtimes

> **Reference snapshot for this chapter**  
> This chapter uses the **2.35.2 release candidate**, branch `feat/ui-ux-2.35.2`, commit `f6fcb4c29c83ba9150df0be31da04fc91dffb634`. Unlike Chapters 11–12, this snapshot also includes manifest preparation, release notes, and AMO-related material because cross-browser packaging is part of the topic.

DOM, Fetch, Maps, and Promises behave similarly across modern browsers, but a WebExtension is more than ordinary browser JavaScript. It depends on a manifest, privileged extension APIs, background lifecycles, declared permissions, packaged resources, and the distribution policies of multiple stores.

PlumePilot's cross-browser challenge is therefore not simply “make the same JavaScript run everywhere.” It is **keep the core functionality coherent while supplying independently valid Chrome, Edge, and Firefox artifacts that can be installed, reviewed, and updated**.

---

# Part I — Compatibility has multiple dimensions

## 1. Supporting Firefox does not mean one thing

The language feature `new Map()` is broadly supported; `chrome.offscreen.createDocument()` belongs to a particular extension runtime. The `background.service_worker` manifest declaration raises another issue: the platform's chosen background execution model. A vendor bundle containing `new Function(...)` introduces yet another concern—static analysis and store review—even if the relevant branch is not executed by PlumePilot. These are distinct compatibility dimensions, not one Boolean property called "Firefox support".

**Examples from the historical code:**

```js
const value = new Map();
```

```js
chrome.offscreen.createDocument(...);
```

```json
{
  "background": {
    "service_worker": "background.js"
  }
}
```

```js
new Function(...)
```

---

## 2. A more useful compatibility matrix

A realistic matrix asks separate questions about JavaScript syntax, DOM/Web Platform APIs, WebExtension APIs, manifest validity, background lifecycles, ZIP structure, distribution policies, reviewer reproducibility, and UI behavior. A feature can be compatible with one layer but incompatible with another.

| Layer | Question |
|---|---|
| Language | Does the JavaScript engine understand this syntax? |
| Web Platform | Is the DOM/browser API available? |
| WebExtension | Does the extension runtime expose this API? |
| Manifest | Is the declaration accepted for this browser? |
| Lifecycle | How does the background start, stop, or restart? |
| Packaging | Does the ZIP have the expected layout? |
| Policy | Will the store accept the contents? |
| Review | Can the reviewer understand and rebuild it? |
| UX | Does the feature behave coherently across browsers? |

---

# Part II — One source tree, several artifacts

## 3. The repository is not the store package

A repository contains sources, documentation, tests, build scripts, release metadata, and developer artifacts. An installed extension should receive only what its runtime needs. PlumePilot transforms a common source tree into browser-specific deliverables. This separation belongs to software architecture: the checked-out source and the shipped artifact are not automatically identical.

---

## 4. Build-time specialization

`scripts/build-release.mjs` knows three targets: `chrome`, `firefox`, and `edge`. Instead of scattering browser-name conditionals through all application functions, the release build adjusts known platform differences before packaging. This is **build-time specialization**: resolve distribution and runtime structural differences at build time, keeping most application behavior common.

**Examples from the historical code:**

```js
const browsers = ["chrome", "firefox", "edge"];
```

---

## 5. Why not three repositories?

Maintaining independent Chrome, Edge, and Firefox forks could seem simple initially. It would also duplicate every bug fix, feature, test, security update, and documentation change, and invite behavioral divergence. PlumePilot keeps a shared **domain implementation** and specializes the platform **adapters and artifacts** at their boundaries. The broader principle is: **share the domain, specialize the platform adapter**.

---

# Part III — Manifest V3 across different runtimes

## 6. The source manifest

The v2.35.2 source manifest carries declarations related to both background models. It is not necessarily delivered unchanged in every store ZIP. The builder adjusts those declarations for each supported target and the validator checks the resulting manifest. The manifest in the repository is therefore a build input, not the final contract for all platforms.

**Examples from the historical code:**

```json
"background": {
  "scripts": [
    "achievements.js",
    "commission-state.js",
    "sound-settings.js",
    "whats-new.js",
    "background.js"
  ],
  "service_worker": "background.js"
}
```

---

## 7. Chrome and Edge: service worker

For Chromium targets the builder sets `manifest.background = { service_worker: "background.js" }` and includes the `offscreen` permission. A service worker is ephemeral, does not have a normal `window` or document DOM, and must register event listeners when started. Persistent operation coordination belongs in browser storage rather than a worker global variable. Chapter 06 described the consequences of that lifecycle; this chapter explains its browser-specific cause.

**Examples from the historical code:**

```js
manifest.background = {
  service_worker: "background.js"
};
```

```js
"offscreen"
```

---

## 8. Firefox: background scripts

For the Firefox target, the build emits a `background.scripts` array instead of `background.service_worker` and excludes Chromium's `offscreen` permission. The validator rejects a Firefox artifact containing the unexpected service-worker declaration. The difference is not merely a string in a manifest: the actual **background execution environment** is different, even though much of the business logic remains shared.

**Examples from the historical code:**

```js
manifest.background = {
  scripts: [
    "achievements.js",
    "sound-settings.js",
    "whats-new.js",
    "background.js"
  ]
};
```

```js
if (manifest.background?.service_worker)
  throw new Error("Firefox: service_worker inatteso.");
```

---

## 9. Why build different manifests?

WebExtensions references discuss manifests containing both `background.scripts` and `background.service_worker` so each browser can choose a supported form. PlumePilot instead already creates browser-specific release packages; emitting a specialized manifest makes its exact permissions, execution model, and reviewer-facing metadata straightforward to validate. A universal manifest is not intrinsically wrong, but it does not simplify all distribution requirements for this project.

**Examples from the historical code:**

```json
"background": {
  "scripts": ["background.js"],
  "service_worker": "background.js"
}
```

---

## 10. Detect capabilities, not browser brands

At runtime, checking `chrome.offscreen?.createDocument` is usually stronger than checking whether the user agent says "Chrome". The first asks if the **capability** exists; the second assumes a brand implies the capability. This is feature detection. But capability detection cannot rescue an invalid manifest after an extension fails to load. **Runtime feature detection and build-time specialization complement one another.**

**Examples from the historical code:**

```js
if (chrome.offscreen?.createDocument) {
  ...
}
```

```js
if (browserName === "chrome") {
  ...
}
```

---

# Part IV — The offscreen audio case

## 11. The offscreen audio problem

Chromium service workers have no DOM, yet audio playback typically requires document APIs. The Offscreen API permits the extension to create an invisible document for that task. `ensureOffscreenAudioDocument()` first checks whether the API exists and whether a document is already present. The implementation also retains an `offscreenCreation` Promise to prevent simultaneous creation attempts. This is the same in-flight deduplication concept discussed for downloads.

**Examples from the historical code:**

```js
async function ensureOffscreenAudioDocument() {
  if (!chrome.offscreen?.createDocument) return false;

  if (await chrome.offscreen.hasDocument()) return true;

  if (!offscreenCreation) {
    offscreenCreation = chrome.offscreen.createDocument({
      url: "offscreen-audio.html",
      reasons: ["AUDIO_PLAYBACK"],
      justification:
        "Riproduce gli avvisi sonori locali richiesti dall’utente.",
    }).finally(() => {
      offscreenCreation = null;
    });
  }

  await offscreenCreation;
  return true;
}
```

---

## 12. A fallback instead of a second feature

The caller attempts offscreen audio when available, but can fall back to sending a command to an existing tab. The domain goal—play an appropriate notification sound—remains unchanged. Only the adapter is different. This is **graceful degradation** of a platform-specific API, not a second independently designed sound feature.

**Examples from the historical code:**

```js
if (await ensureOffscreenAudioDocument()) {
  return sendRuntimeMessage(...);
}

const tabs = await chrome.tabs.query(...);
...
return sendTabMessage(target.id, ...);
```

---

## 13. Why the Firefox build removes exactly that path

The release script replaces the offscreen helper with an implementation that returns `false`. The caller therefore naturally uses its preexisting tab-based fallback. Nothing else in the sound workflow needs to fork. This minimizes divergence: the same higher-level feature always chooses the supported mechanism rather than maintaining two separate notification systems.

**Examples from the historical code:**

```js
async function ensureOffscreenAudioDocument() {
  ...
}
```

```js
async function ensureOffscreenAudioDocument() {
  return false;
}
```

---

# Part V — Manifest, permissions, and data declarations

## 14. Least privilege can be browser-specific

Chromium asks for `["storage", "offscreen"]`; Firefox needs only `["storage"]` in the historical build. Declaring `offscreen` on Firefox "for consistency" would violate the intent of least privilege. The artifact validator checks the **expected permission set**, including the absence of unneeded capabilities, instead of merely checking that some required permission happens to be present.

**Examples from the historical code:**

```json
["storage", "offscreen"]
```

```json
["storage"]
```

```js
const expectedPermissions =
  browser === "firefox"
    ? ["storage"]
    : ["storage", "offscreen"];
```

---

## 15. The Firefox ID

The Firefox manifest includes `browser_specific_settings.gecko.id`. This is part of the installed add-on's identity, not decoration. Accidentally changing it can make what was intended as an update appear to be a different extension. The project's release history treats this identity as a stable compatibility requirement.

**Examples from the historical code:**

```json
"browser_specific_settings": {
  "gecko": {
    "id": "plumepilot@fabiofloris"
  }
}
```

---

## 16. Data collection declarations

The Firefox target declares `data_collection_permissions` with categories `authenticationInfo`, `websiteContent`, and `websiteActivity`. These terms are defined by Mozilla's declaration model; they should not be conflated with a generic claim that PlumePilot transmits all such information to its own servers. The engineering lesson is that **distribution metadata describes behavior under store-specific schemas**. The same runtime logic may require different manifest metadata for different stores.

**Examples from the historical code:**

```json
"data_collection_permissions": {
  "required": [
    "authenticationInfo",
    "websiteContent",
    "websiteActivity"
  ]
}
```

---

## 17. Minimum versions

The snapshot sets a Firefox desktop minimum version of `140.0` and an Android minimum of `142.0`. Minimum versions establish which runtime capability assumptions the project is willing to support. Explicitly raising the compatibility floor can sometimes be healthier than accumulating complex fallback branches for very old runtimes that are no longer part of the intended target.

**Examples from the historical code:**

```json
"strict_min_version": "140.0"
```

```json
"strict_min_version": "142.0"
```

---

# Part VI — Chrome and Edge: same engine, different distribution

## 18. “Edge is Chromium” is true but incomplete

Chrome and Edge share much of their modern extension runtime, yet the Edge package still receives additional store-oriented metadata and localized manifest display fields. Store behavior, market availability, release processing, and metadata requirements are not determined solely by the JavaScript engine. Browser-engine compatibility and distribution compatibility must remain separate concepts.

**Examples from the historical code:**

```js
manifest.name = "__MSG_extensionName__";
manifest.description = "__MSG_extensionDescription__";
manifest.default_locale = "it";
manifest.action.default_title = "__MSG_extensionName__";
```

---

## 19. Runtime compatibility versus distribution compatibility

**Runtime compatibility** asks whether the installed extension can execute its features successfully. **Distribution compatibility** asks whether its artifact, metadata, permissions, and policies satisfy the channel through which it is delivered. An extension can pass all local functional tests and still fail an upload, automated validator, or store review.

---

# Part VII — Reviewability is a technical property

## 20. Vendor bundles and review

PlumePilot uses substantial third-party libraries such as PDF.js, pdf-lib, JSZip, and fontkit. Bundled JavaScript is normal in web development, but extension reviewers need to understand what code is included, where it came from, and whether it uses restricted dynamic-execution capabilities. Thus third-party code is not only a runtime dependency; its **reviewability** becomes part of the release architecture.

---

## 21. Chrome: readability is not simply beautification

Chrome Web Store policy prohibits code obfuscation that conceals functionality, while ordinary minification can be acceptable. The project nevertheless encountered automated review concerns related to code shape and readability, documented around v2.32.10. It would be wrong to claim all minification is forbidden. The practical lesson is that the form and provenance of bundled code affect both human auditing and automated review systems.

---

## 22. Firefox: source submission is part of the product

Mozilla's review process may require a source submission with reproducible build instructions for artifacts generated from other files. PlumePilot therefore prepares a Firefox **source-review archive** in addition to the three installable runtime ZIPs. A complete release is not simply three ZIPs; it includes the metadata and evidence needed for the review process.

---

# Part VIII — The review-safe Firefox build

## 23. Transform vendor code only through a known list

The Firefox build applies review-specific transforms only to an explicit set of files: `background.js`, `vendor/jszip.js`, `vendor/fontkit.umd.js`, `vendor/pdf-lib.js`, `vendor/pdf.mjs`, and `vendor/pdf.worker.mjs`. Other files are left unchanged. This is not an open-ended rewrite of every file matching a suspicious pattern; it is a controlled, auditable set of platform adaptations.

**Examples from the historical code:**

```js
[
  "background.js",
  "vendor/jszip.js",
  "vendor/fontkit.umd.js",
  "vendor/pdf-lib.js",
  "vendor/pdf.mjs",
  "vendor/pdf.worker.mjs"
]
```

```js
return bytes;
```

---

## 24. `replaceExactly()`

The build helper searches for one expected substring, verifies that it appears **exactly once**, and only then performs the replacement. If it does not appear—or appears multiple times—the build fails with a labeled error. This turns fragile assumptions about dependency contents into explicit executable preconditions.

**Examples from the historical code:**

```js
function replaceExactly(source, search, replacement, label) {
  const first = source.indexOf(search);

  if (
    first < 0 ||
    source.indexOf(search, first + search.length) >= 0
  ) {
    throw new Error(
      `Firefox review-safe: pattern inatteso (${label}).`
    );
  }

  return (
    source.slice(0, first) +
    replacement +
    source.slice(first + search.length)
  );
}
```

---

## 25. Fail-closed transformation

When rewriting vendor code, the safe response to an unexpected upstream shape is not "replace whatever the regex can find and continue". It is **fail closed**: stop and require a developer to inspect why the known pattern changed. A release process should not silently produce partly modified executable code that nobody has reviewed.

**Examples from the historical code:**

```js
source.replace(regex, replacement);
```

---

## 26. Why exact matching matters

After upgrading PDF.js, the expression a patch expects may disappear, be rewritten, or occur twice. A blind substitution could create a package whose fallback behavior differs from what the author intended. `replaceExactly()` makes the dependency on a particular upstream representation visible and testable, much like a schema assertion in a data migration.

**Examples from the historical code:**

```js
new Function(...)
```

---

# Part IX — The JSZip case

## 27. Unused code can still matter

A readable JSZip distribution contains a legacy compatibility path that accepts a string callback and constructs a function dynamically. PlumePilot itself supplies actual functions and does not need that path. Nevertheless, a static scanner can flag `new Function(...)` even if the branch is unreachable for the project's usage. Runtime reachability and static-review acceptability are different dimensions.

**Examples from the historical code:**

```js
new Function(...)
```

---

## 28. Remove an unused capability, do not conceal it

For Firefox, the build replaces that JSZip fallback with a strict function-type requirement and a clear `TypeError`. It does not attempt to obfuscate or rename `new Function` to evade inspection. It **removes a capability that PlumePilot does not use**. This distinction is central to auditable platform specialization.

**Examples from the historical code:**

```js
if (typeof callback !== "function") {
  throw new TypeError(
    "setImmediate callback must be a function"
  );
}
```

---

# Part X — The fontkit case

## 29. fontkit and legacy fallbacks

fontkit includes older compatibility branches that may construct or expose executable code. The Firefox packaging step replaces known cases with safe alternatives that preserve the subset of fontkit functionality PlumePilot requires. Fewer unused dynamic-execution capabilities mean fewer review and security surfaces. The transformation is scoped and documented rather than changing vendor source indiscriminately.

---

# Part XI — The PDF.js case

## 30. A dependency tree is also a compatibility tree

PDF.js supports alternative implementation paths for older environments or restricted execution contexts. It may probe whether dynamic function compilation is available. For the Firefox artifact, PlumePilot forces the relevant probe to return `false`, selecting the interpreter-based path. Firefox is fully capable of running JavaScript; the constraint comes from the **deployment target and review requirements**, not a lack of JavaScript language support.

**Examples from the historical code:**

```js
function isEvalSupported() {
  try {
    new Function("");
    return true;
  } catch {
    return false;
  }
}
```

```js
function isEvalSupported() {
  return false;
}
```

---

## 31. Interpreter versus compiler

Some PDF.js fallback behavior can be understood as choosing between a dynamic-compiler path and an interpreter path. The Firefox build selects the interpreter path to avoid a dynamic code-generation capability. This is **capability reduction by build**, not a claim that an interpreter is always faster or universally superior.

---

## 32. Dynamic-import fallback

Other PDF.js fallbacks may attempt a computed dynamic import. If the required resource is absent from the packaged extension and the path is unnecessary for PlumePilot, keeping it broadens review and runtime uncertainty. The Firefox build disables that precise unsupported fallback. We must distinguish ordinary static ES module imports from computed dynamic imports, and both from truly remote executable code: their policies and semantics differ.

---

# Part XII — Why not modify vendor sources directly?

## 33. Chrome and Edge retain upstream

The repository retains readable vendor distributions corresponding to their documented upstream sources. Chrome and Edge can ship those sources unchanged where appropriate. Firefox receives a **build-generated derivative** containing a small reviewed set of adaptations. Keeping pristine inputs separate from derived outputs makes third-party provenance traceable and dependency upgrades easier to reason about.

---

## 34. Supply-chain provenance

For each third-party asset we should be able to answer which version was imported, where it came from, which checksum identifies the pristine bytes, what changes are applied, and which target receives them. `THIRD_PARTY_NOTICES.md` and validator checks express this provenance as inspectable data rather than vague recollection.

---

# Part XIII — Checksums as invariants

## 35. A filename proves very little

A file named `jszip.js` does not prove it contains a particular JSZip version or an unmodified release. A SHA-256 digest is a much stronger identifier of exact bytes. PlumePilot maintains expected checksum values and verifies vendored artifacts during packaging. The name is a convenience; the content hash is an integrity assertion.

---

## 36. Pinned dependencies

Checksum pinning says not merely "we use this library" but "we expect these precise source bytes". An accidental manual edit or unexpected dependency update causes validation to fail rather than slipping unnoticed into the next store archive. This is a useful release invariant even for a relatively small extension.

---

## 37. What checksums cannot prove

An identical checksum proves a file matches the reference bytes we expected. It does **not** establish that the library contains no vulnerabilities, that its license is suitable, or that all behavior is correct. Integrity and provenance are valuable but different from security auditing and functional correctness.

---

# Part XIV — The validator as an executable specification

## 38. Validate the output ZIP, not only the source

After building, `scripts/validate-release.mjs` reopens the generated artifacts and examines their actual contents. That is stronger than checking the repository inputs alone: an incorrect copy path, missed file, wrong manifest transformation, or accidental extra resource can occur during packaging. The release archive is a separate artifact with its own test obligations.

---

## 39. Examples of release invariants

The validator can assert target-specific background shape, permission sets, expected assets, vendor checksums, forbidden runtime patterns, and other packaging requirements. These checks serve as **executable specifications** for what a valid Firefox, Chrome, or Edge release looks like. Unlike an informal checklist, they fail automatically when the package stops satisfying its declared contract.

---

## 40. Packaging deserves tests

A feature may work perfectly when loaded from a development checkout and fail in a ZIP because the release script omitted a file, changed the manifest, removed a resource, or included an invalid path. Unit tests of application logic cannot detect all packaging mistakes. **The release artifact itself must be tested.**

---

# Part XV — Static analysis as a constructive adversary

## 41. Review-safe scans

For Firefox, the validator reads packaged JavaScript and checks for restricted or suspicious patterns associated with dynamic execution. This is heuristic **static analysis**, not a semantic proof of all possible control flows. Its role is to guard against known review failure categories before sending a package to AMO.

---

## 42. Static analysis can have false positives

A detector may find a suspicious expression inside an unreachable legacy fallback. The code might be harmless for the actual usage, but reviewers cannot execute every possible control flow in every dependency. Making packages understandable and unnecessary capability paths absent can be more reliable than depending on complex reachability arguments for every submission.

---

## 43. Readability is a security and governance property

Readable code improves not only developer debugging but also human auditing, reproducibility, dependency review, and trust in the artifact. In extension distribution, **reviewability is an operational property of the software**, not just an aesthetic preference.

---

# Part XVI — Heuristics for minified or unknown code

## 44. Approximate the reviewer locally

The validator includes a small `couldBeMinifiedCode(source)` heuristic. It is not Mozilla's actual AMO review algorithm. It is a local early-warning signal based on suspicious code shape such as very long lines and unusually dense/minified formatting. The correct use is to catch known risks, not to assume passing that heuristic guarantees store acceptance.

**Examples from the historical code:**

```js
function couldBeMinifiedCode(source) {
  ...
}
```

---

## 45. Turn postmortems into tests

An earlier review rejection or warning is most valuable when it becomes a repeatable safeguard. Once a problem is understood—dynamic evaluation, source provenance, missing reviewer instructions, or a malformed artifact—the build and validator should detect recurrence automatically. This turns human troubleshooting history into a testable release contract.

---

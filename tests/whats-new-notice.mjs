import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
const manifest = JSON.parse(read("manifest.json"));
const writes = [];
let onInstalled;
const context = vm.createContext({
  chrome: {
    runtime: {
      getManifest: () => manifest,
      onInstalled: { addListener: (callback) => { onInstalled = callback; } },
      onMessage: { addListener() {} },
    },
    tabs: { onRemoved: { addListener() {} }, onActivated: { addListener() {} } },
    storage: {
      local: {
        set: (values) => writes.push({ ...values }),
        get: (_key, callback) => callback({}),
      },
    },
  },
});
for (const script of ["whats-new.js", "language.js", "language-ui.js", "background.js"]) {
  vm.runInContext(read(script), context);
}
const api = context.PlumePilotWhatsNew;
const release = api.RELEASE;
assert.equal(manifest.version, release.version);

const language = context.PlumePilotLanguage;
assert.match(release.title, /inglese/);
assert.equal(release.items.length, 7);
assert.ok(release.items.some(({ text }) => /PDF ed EPUB/.test(text)));
assert.ok(release.items.some(({ text }) => /offline/.test(text)));
assert.ok(release.items.some(({ title }) => /Pausa\?/.test(title)));

const popup = read("popup.js");
const renderSource = popup.slice(
  popup.indexOf("  function renderWhatsNewContent()"),
  popup.indexOf("  function markWhatsNewSeen()"),
);
const element = () => ({ textContent: "", append() {} });
const fields = {
  whatsNewBannerTitle: element(), whatsNewBannerSummary: element(),
  whatsNewDialogTitle: element(), whatsNewDialogVersion: element(), whatsNewDialogSummary: element(),
  whatsNewItems: { replaceChildren(...items) { this.items = items; } },
};
Object.assign(context, fields, {
  document: { createElement: element },
  t: language.translate,
  localized: language.text,
  whatsNewApi: api,
});
vm.runInContext(renderSource, context);
for (const locale of ["it", "en"]) {
  language.set(locale);
  vm.runInContext("renderWhatsNewContent()", context);
  assert.equal(fields.whatsNewBannerTitle.textContent, locale === "en"
    ? `What’s new in PlumePilot ${release.version}`
    : `Novità in PlumePilot ${release.version}`);
  assert.equal(fields.whatsNewDialogVersion.textContent, `v${release.version}`);
  assert.equal(fields.whatsNewBannerSummary.textContent, fields.whatsNewDialogSummary.textContent);
  assert.equal(fields.whatsNewDialogTitle.textContent, language.text(release.title));
  assert.equal(fields.whatsNewItems.items.length, release.items.length);
}
assert.notEqual(language.text(release.summary), release.summary);
for (const { title, text } of release.items) {
  assert.notEqual(language.text(title), title);
  assert.notEqual(language.text(text), text);
}

onInstalled({ reason: "install" });
assert.deepEqual(writes, []);
onInstalled({ reason: "update", previousVersion: "2.35.5" });
assert.deepEqual(writes, [{ [api.PENDING_KEY]: release.version }]);

const html = read("popup.html");
assert.match(html, /id="whatsNewBanner"[^>]+hidden/);
assert.match(html, /id="whatsNewBannerTitle"><\/strong>/);
assert.match(html, /id="whatsNewBannerSummary"><\/span>/);
assert.match(html, /id="openWhatsNewFromAbout"[^>]*>Novità</);
assert.match(popup, /result\[whatsNewApi\.PENDING_KEY\] === releaseVersion/);
assert.match(popup, /result\[whatsNewApi\.LAST_SEEN_KEY\] !== releaseVersion/);
assert.match(popup, /chrome\.storage\.local\.remove\(whatsNewApi\.PENDING_KEY\)/);
assert.match(read("popup.css"), /\.whats-new-banner\[hidden\]/);
assert.ok(manifest.background.scripts.includes("whats-new.js"));

console.log("PASS: update-only banner and Preferences use the same release and summary in both languages");

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const linksSource = readFileSync(new URL("../store-links.js", import.meta.url), "utf8");
const context = vm.createContext({});
vm.runInContext(linksSource, context);
const links = context.PlumePilotStoreLinks;

assert.equal(
  links.reviewUrl({}),
  "https://chromewebstore.google.com/detail/plumepilot-%E2%80%93-assistente-p/cbkkkjekidcdjojlmnbihmjfohkdfcaa?hl=it&utm_source=ext_sidebar",
);
assert.equal(
  links.reviewUrl({ default_locale: "it", name: "PlumePilot – Assistente per Pegaso" }),
  "https://microsoftedge.microsoft.com/addons/detail/plumepilot-%E2%80%93-assistant-fo/lboffgbgbnaecfcikjfmgcpnahnmhfjp",
);
assert.equal(
  links.reviewUrl({ browser_specific_settings: { gecko: { id: "plumepilot@fabiofloris" } } }),
  "https://addons.mozilla.org/it/firefox/addon/plumepilot/",
);

const popup = readFileSync(new URL("../popup.html", import.meta.url), "utf8");
const popupJs = readFileSync(new URL("../popup.js", import.meta.url), "utf8");
const privacy = readFileSync(new URL("../PRIVACY.md", import.meta.url), "utf8");
const publicPrivacy = readFileSync(new URL("../docs/privacy/index.md", import.meta.url), "utf8");
const publicPrivacyEn = readFileSync(new URL("../docs/privacy/en/index.md", import.meta.url), "utf8");
const faq = readFileSync(new URL("../docs/faq/index.md", import.meta.url), "utf8");
const about = popup.slice(popup.indexOf('<section class="about-section">'), popup.indexOf("</section>", popup.indexOf('<section class="about-section">')));

assert.match(about, />Informazioni</);
assert.match(about, />FAQ</);
assert.match(about, />Vota</);
assert.match(about, />Dona</);
assert.doesNotMatch(about, /Fabio Floris|Sostieni su Ko-fi/);
assert.match(popupJs, /storeLinksApi\.reviewUrl\(chrome\.runtime\.getManifest\(\)\)/);
assert.doesNotMatch(`${privacy}\n${publicPrivacy}\n${publicPrivacyEn}`, /Fabio Floris/);
assert.match(faq, /Le domande ricevute non corrispondono al test richiesto/);
assert.match(faq, /Nessuna dispensa trovata/);
assert.match(faq, /Un’altra operazione di PlumePilot è già in corso/);

console.log("PASS: FAQ, public identity and browser-specific review links are consistent");

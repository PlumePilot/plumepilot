(() => {
  "use strict";

  const STORE_URLS = Object.freeze({
    chrome: "https://chromewebstore.google.com/detail/plumepilot-%E2%80%93-assistente-p/cbkkkjekidcdjojlmnbihmjfohkdfcaa?hl=it&utm_source=ext_sidebar",
    edge: "https://microsoftedge.microsoft.com/addons/detail/plumepilot-%E2%80%93-assistant-fo/lboffgbgbnaecfcikjfmgcpnahnmhfjp",
    firefox: "https://addons.mozilla.org/it/firefox/addon/plumepilot/",
  });

  function browserFromManifest(manifest = {}) {
    if (manifest.browser_specific_settings?.gecko) return "firefox";
    if (manifest.default_locale === "it") return "edge";
    return "chrome";
  }

  function reviewUrl(manifest) {
    return STORE_URLS[browserFromManifest(manifest)];
  }

  globalThis.PlumePilotStoreLinks = Object.freeze({
    STORE_URLS,
    FAQ_URL: "https://plumepilot.github.io/plumepilot/faq/",
    DONATE_URL: "https://ko-fi.com/flo_",
    browserFromManifest,
    reviewUrl,
  });
})();

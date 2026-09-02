(() => {
  "use strict";

  const THEME_KEY = "themePreference";
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  let preference = "system";

  function normalizeTheme(value) {
    return value === "light" || value === "dark" ? value : "system";
  }

  function resolvedTheme() {
    if (preference === "system") return systemTheme.matches ? "dark" : "light";
    return preference;
  }

  function applyTheme() {
    const resolved = resolvedTheme();
    document.documentElement.dataset.studywingTheme = resolved;
    document.documentElement.style.colorScheme = resolved;
  }

  applyTheme();

  chrome.storage.local.get({ [THEME_KEY]: "system" }, (result) => {
    preference = normalizeTheme(result[THEME_KEY]);
    applyTheme();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[THEME_KEY]) return;
    preference = normalizeTheme(changes[THEME_KEY].newValue);
    applyTheme();
  });

  systemTheme.addEventListener("change", () => {
    if (preference === "system") applyTheme();
  });
})();

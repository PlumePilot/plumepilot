(() => {
  "use strict";

  const THEME_KEY = "themePreference";
  const VISUAL_STYLE_KEY = "visualStyle";
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  let preference = "system";
  let visualStyle = "standard";

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

  function applyVisualStyle() {
    document.documentElement.dataset.visualStyle = visualStyle;
  }

  applyTheme();
  applyVisualStyle();

  chrome.storage.local.get({ [THEME_KEY]: "system", [VISUAL_STYLE_KEY]: "standard" }, (result) => {
    preference = normalizeTheme(result[THEME_KEY]);
    visualStyle = result[VISUAL_STYLE_KEY] === "gaming" ? "gaming" : "standard";
    applyTheme();
    applyVisualStyle();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes[THEME_KEY]) {
      preference = normalizeTheme(changes[THEME_KEY].newValue);
      applyTheme();
    }
    if (changes[VISUAL_STYLE_KEY]) {
      visualStyle = changes[VISUAL_STYLE_KEY].newValue === "gaming" ? "gaming" : "standard";
      applyVisualStyle();
    }
  });

  systemTheme.addEventListener("change", () => {
    if (preference === "system") applyTheme();
  });
})();

(() => {
  "use strict";

  const KEY = "plumePilotLanguage";
  const messages = new Map();
  let language = "it";

  function set(value) {
    language = value === "en" ? "en" : "it";
    return language;
  }

  function read() {
    if (!globalThis.chrome?.storage?.local) return Promise.resolve(null);
    return new Promise((resolve) => {
      chrome.storage.local.get({ [KEY]: "it" }, (result) => {
        resolve(chrome.runtime.lastError ? null : result?.[KEY] === "en" ? "en" : "it");
      });
    });
  }

  async function load() {
    return set(await read() ?? language);
  }

  function watch(onChange) {
    let revision = 0;
    async function refresh() {
      const request = ++revision;
      const value = await read();
      if (request === revision && value !== null) onChange(value);
    }
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes[KEY]) return;
      revision++;
      onChange(changes[KEY].newValue === "en" ? "en" : "it");
    });
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) void refresh();
    });
    return refresh;
  }

  async function initializePage() {
    document.documentElement.lang = await load();
    document.title = text(document.title);
    localizeMarkup(document.body);
  }

  function addMessages(entries) {
    for (const [source, translation] of Object.entries(entries)) {
      messages.set(source, translation);
    }
  }

  function text(source) {
    return (language === "en" && messages.get(source)) || source;
  }

  function translate(parts, ...values) {
    const source = parts.reduce((key, part, index) => key + (index ? `$${index}` : "") + part, "");
    const translation = language === "en" && messages.get(source);
    if (!translation) return String.raw({ raw: parts }, ...values);
    return translation.replace(/\$(\d+)/g, (match, index) =>
      Number(index) <= values.length ? String(values[index - 1]) : match);
  }

  function localizeMarkup(root) {
    const document = root.ownerDocument;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.parentElement?.closest("script, style")) continue;
      const source = node.data.trim();
      const translated = text(source);
      if (translated !== source) node.data = node.data.replace(source, () => translated);
    }
    for (const element of root.querySelectorAll("[aria-label], [title], [placeholder], [alt]")) {
      for (const attribute of ["aria-label", "title", "placeholder", "alt"]) {
        if (element.hasAttribute(attribute)) {
          element.setAttribute(attribute, text(element.getAttribute(attribute)));
        }
      }
    }
  }

  function bindPicker(picker, onError, refresh) {
    if (!picker) return;
    picker.value = language;
    picker.addEventListener("change", () => {
      chrome.storage.local.set({ [KEY]: picker.value }, () => {
        if (!chrome.runtime.lastError) {
          void refresh?.();
          return;
        }
        picker.value = language;
        onError(text("Impossibile salvare la lingua."));
      });
    });
  }

  globalThis.PlumePilotLanguage = {
    KEY, set, load, watch, initializePage, addMessages, text, translate, localizeMarkup, bindPicker,
    get current() { return language; },
  };
})();

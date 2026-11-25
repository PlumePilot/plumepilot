(() => {
  "use strict";

  const KEY = "plumePilotLanguage";
  const messages = new Map();
  let language = "it";

  function set(value) {
    language = value === "en" ? "en" : "it";
    return language;
  }

  function load() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ [KEY]: "it" }, (result) => {
        resolve(set(chrome.runtime.lastError ? "it" : result?.[KEY]));
      });
    });
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

  function bindPicker(picker, onError) {
    if (!picker) return;
    picker.value = language;
    picker.addEventListener("change", () => {
      chrome.storage.local.set({ [KEY]: picker.value }, () => {
        if (!chrome.runtime.lastError) return;
        picker.value = language;
        onError(text("Impossibile salvare la lingua."));
      });
    });
  }

  globalThis.PlumePilotLanguage = {
    KEY, set, load, addMessages, text, translate, localizeMarkup, bindPicker,
    get current() { return language; },
  };
})();

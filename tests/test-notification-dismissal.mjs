import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(
  new URL("../notification-manager.js", import.meta.url),
  "utf8",
);
const storageValues = new Map();
const sessionStorage = {
  getItem: (key) => storageValues.get(key) ?? null,
  setItem: (key, value) => storageValues.set(key, String(value)),
  removeItem: (key) => storageValues.delete(key),
};

function createPage() {
  const elements = new Map();

  class Element {
    constructor() {
      this.children = [];
      this.dataset = {};
      this.style = {};
      this.hidden = false;
      this.isConnected = false;
      this.scrollHeight = 10;
      this.clientHeight = 10;
      this.listeners = new Map();
      this._id = "";
    }
    set id(value) {
      this._id = value;
      if (value) elements.set(value, this);
    }
    get id() { return this._id; }
    setAttribute() {}
    addEventListener(type, listener) { this.listeners.set(type, listener); }
    append(...children) {
      this.children.push(...children);
      for (const child of children) child.isConnected = true;
    }
    appendChild(child) {
      this.append(child);
      return child;
    }
    querySelector(selector) {
      const role = selector.match(/data-role="([^"]+)"/)?.[1];
      return this.children.find((child) => child.dataset.role === role) || null;
    }
    remove() {
      this.isConnected = false;
      if (this.id) elements.delete(this.id);
    }
  }

  const document = {
    body: new Element(),
    createElement: () => new Element(),
    getElementById: (id) => elements.get(id) || null,
  };
  const listeners = new Map();
  const window = {
    addEventListener: (type, listener) => listeners.set(type, listener),
    postMessage() {},
  };
  window.top = window;

  const context = vm.createContext({
    clearTimeout() {},
    console,
    Date,
    document,
    JSON,
    Object,
    requestAnimationFrame: (callback) => callback(),
    sessionStorage,
    setTimeout: () => 1,
    window,
  });
  vm.runInContext(source, context);
  return { document, notifications: window.StudyWingNotifications };
}

const firstOperation = "export:123e4567-e89b-42d3-a456-426614174000";
const secondOperation = "export:123e4567-e89b-42d3-a456-426614174001";

let page = createPage();
page.notifications.show({
  message: "Recupero dispense…",
  key: firstOperation,
  progress: true,
});
assert.ok(page.document.getElementById("studywing-notification-toast"));
page.notifications.dismiss(true);
assert.match(
  sessionStorage.getItem("studywingHiddenProgressOperations"),
  /123e4567-e89b-42d3-a456-426614174000/,
);

page.notifications.show({
  message: "Nuovo tentativo…",
  key: firstOperation,
  progress: true,
});
assert.equal(page.document.getElementById("studywing-notification-toast"), null);

page = createPage();
page.notifications.show({
  message: "Ripresa dopo reload…",
  key: firstOperation,
  progress: true,
});
assert.equal(
  page.document.getElementById("studywing-notification-toast"),
  null,
  "dismissal must survive a same-tab reload",
);

page.notifications.show({
  message: "Esportazione completata",
  key: firstOperation,
  terminal: true,
  type: "success",
});
assert.ok(page.document.getElementById("studywing-notification-toast"));
assert.equal(sessionStorage.getItem("studywingHiddenProgressOperations"), null);

page.notifications.dismiss(false);
page.notifications.show({
  message: "Nuova esportazione…",
  key: secondOperation,
  progress: true,
});
assert.ok(
  page.document.getElementById("studywing-notification-toast"),
  "a new operation must show notifications normally",
);

page.notifications.dismiss(true);
page.notifications.show({
  message: "Stato generico",
  key: "export:current",
  progress: true,
});
page.notifications.dismiss(true);
assert.doesNotMatch(
  sessionStorage.getItem("studywingHiddenProgressOperations") || "",
  /export:current/,
  "fallback keys must never persist across operations",
);

console.log("PASS: progress dismissal is operation-scoped and reload-safe");

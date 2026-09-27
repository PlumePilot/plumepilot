import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

// A small canvas/DOM smoke test catches runtime mistakes without relying on a
// browser installation. Manual playtesting still decides whether flight feels good.
const elements = new Map();
const element = (id) => {
  if (!elements.has(id)) elements.set(id, {
    textContent: "", hidden: false, children: [], listeners: {},
    setAttribute() {}, replaceChildren(...children) { this.children = children; },
    append(...children) { this.children.push(...children); },
    addEventListener(type, fn) { this.listeners[type] = fn; },
  });
  return elements.get(id);
};
let draws = 0, nextFrame = null;
const pencilPositions = [];
const canvasContext = new Proxy({}, {
  get(_target, property) {
    if (property === "drawImage") return (...args) => {
      draws += 1;
      if (args[0].url?.endsWith("enemy-pencil.png")) pencilPositions.push(args[5]);
    };
    return () => {};
  },
  set() { return true; },
});
element("game").width = 960;
element("game").height = 400;
element("game").getContext = () => canvasContext;
const sandbox = {
  console,
  Image: class { complete = true; naturalWidth = 64; set src(value) { this.url = value; } },
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  localStorage: { getItem: () => null, setItem() {} },
  document: { documentElement: { dataset: {} }, getElementById: element,
    createElement: () => ({ textContent: "", children: [], listeners: {},
      addEventListener(type, fn) { this.listeners[type] = fn; },
      append(...children) { this.children.push(...children); },
    }), addEventListener() {} },
  window: { addEventListener() {}, close() {} },
  requestAnimationFrame: (fn) => { nextFrame = fn; },
};
sandbox.globalThis = sandbox;
runInNewContext(readFileSync(new URL("../pausa/level.js", import.meta.url), "utf8"), sandbox);
runInNewContext(readFileSync(new URL("../pausa/game.js", import.meta.url), "utf8"), sandbox);
const start = element("card").children[2].children.find((button) => button.textContent === "Inizia");
assert.ok(start);
start.listeners.click();
for (let now = 0; now < 91_000; now += 50) {
  const frame = nextFrame; assert.equal(typeof frame, "function"); frame(now);
}
assert.equal(element("card").children[0].textContent, "Ecco come è andata");
assert.ok(pencilPositions.length > 10);
assert.ok(pencilPositions[5] < pencilPositions[0] - 50, "Pencil must travel left while rotating");
assert.ok(draws > 100, "Sprite render branch was not exercised");
console.log("Pausa? runtime smoke: rendered sprites and reached the final summary.");

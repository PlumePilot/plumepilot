import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../background.js", import.meta.url), "utf8");
const functions = source.slice(source.indexOf("  async function ensureOffscreenAudioDocument()"),
  source.indexOf("  async function openPausa()"));
const sounds = readFileSync(new URL("../sound-settings.js", import.meta.url), "utf8");
const context = vm.createContext({ console: { warn() {} }, Date });
vm.runInContext(sounds, context);

async function scenario({ creationError = false, messageError = false, offscreenResponse, tabResponse, offscreen = true }) {
  const calls = [];
  const preferences = { soundNotificationsEnabled: true, notificationVolume: 70 };
  const chrome = {
    runtime: {
      lastError: null,
      sendMessage(message, callback) {
        calls.push(message.type);
        this.lastError = messageError ? { message: "Receiving end does not exist" } : null;
        callback(offscreenResponse);
        this.lastError = null;
      },
    },
    storage: { local: { get(defaults, callback) { callback({ ...defaults, ...preferences }); } } },
    tabs: { query(_options, callback) { callback([{ id: 7, active: true }]); } },
  };
  if (offscreen) chrome.offscreen = {
    hasDocument: async () => false,
    createDocument: async () => {
      calls.push("create");
      if (creationError) throw new Error("document creation failed");
    },
  };
  Object.assign(context, {
    chrome, offscreenCreation: null, soundApi: context.PlumePilotSounds,
    SOUND_EVENT_MEMORY_KEY: "played", SOUND_EVENT_TTL_MS: 30 * 24 * 60 * 60 * 1000,
    storageSet: async values => Object.assign(preferences, values),
    sendTabMessage: async (id, message) => {
      assert.equal(id, 7);
      assert.equal(message.type, "STUDYWING_SOUND_PLAY");
      calls.push("tab");
      return tabResponse;
    },
    claimAchievement: async () => ({ accepted: true }),
  });
  vm.runInContext(functions, context);
  const play = () => vm.runInContext('playSoundEvent({eventId: "commission:pegaso:123:exam-accepted"}, 7)', context);
  const first = await play();
  if (first.played) {
    const count = calls.length;
    const second = await play();
    assert.equal(second.reason, "duplicate");
    assert.equal(calls.length, count, "duplicates must not start playback");
  } else {
    assert.equal(preferences.played, undefined);
    context.sendTabMessage = async () => ({ played: true });
    chrome.offscreen = undefined;
    assert.equal((await play()).played, true, "a failed playback must remain retryable");
  }
  return { first, calls };
}

const success = { accepted: true, played: true };
const failed = { accepted: false, played: false, reason: "playback-failed" };
const normal = await scenario({ offscreenResponse: success });
assert.equal(normal.first.played, true);
assert.ok(!normal.calls.includes("tab"));
for (const options of [
  { creationError: true },
  { messageError: true },
  { offscreenResponse: failed },
  { offscreen: false },
]) {
  const { first, calls } = await scenario({ ...options, tabResponse: success });
  assert.equal(first.played, true);
  assert.ok(calls.includes("tab"));
}
const bothFailed = await scenario({ offscreenResponse: failed, tabResponse: failed });
assert.equal(bothFailed.first.accepted, false);
console.log("PASS: audio document success, creation/transport/playback fallback, duplicate suppression and retry after failure");

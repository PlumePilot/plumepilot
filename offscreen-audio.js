(() => {
  "use strict";
  const soundApi = globalThis.PlumePilotSounds;
  let audio = null;

  async function play(message) {
    try {
      if (!audio) audio = new Audio();
      audio.pause();
      audio.currentTime = 0;
      const sound = soundApi.normalizeSound(message.sound);
      audio.src = chrome.runtime.getURL(soundApi.SOUNDS[sound].path);
      audio.volume = soundApi.normalizeVolume(message.volume) / 100;
      await audio.play();
      return { accepted: true, played: true };
    } catch (error) {
      console.warn("[PlumePilot] Riproduzione offscreen non riuscita:", error?.message || error);
      return { accepted: false, played: false, reason: "playback-failed" };
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "PLUMEPILOT_OFFSCREEN_PLAY") return undefined;
    play(message).then(sendResponse);
    return true;
  });
})();

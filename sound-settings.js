(() => {
  "use strict";

  const SOUNDS = Object.freeze({
    chirp: { label: "Cinguettio", path: "assets/audio/chirp.mp3" },
    trumpets: { label: "Trombe", path: "assets/audio/trumpets.mp3" },
    guitar: { label: "Chitarra", path: "assets/audio/guitar.mp3" },
    violin: { label: "Violino", path: "assets/audio/violin.mp3" },
  });
  const DEFAULTS = Object.freeze({ soundNotificationsEnabled: false, notificationSound: "chirp", notificationVolume: 70 });

  function normalizeSound(value) { return Object.hasOwn(SOUNDS, value) ? value : DEFAULTS.notificationSound; }
  function normalizeVolume(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.min(100, Math.round(numeric))) : DEFAULTS.notificationVolume;
  }
  function normalizeSettings(value = {}) {
    return { soundNotificationsEnabled: value.soundNotificationsEnabled === true, notificationSound: normalizeSound(value.notificationSound), notificationVolume: normalizeVolume(value.notificationVolume) };
  }

  globalThis.PlumePilotSounds = Object.freeze({ SOUNDS, DEFAULTS, normalizeSound, normalizeVolume, normalizeSettings });
})();

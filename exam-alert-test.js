// Temporary release-candidate shortcut. Remove this file and its manifest entry after testing.
(() => {
  "use strict";
  if (window !== window.top) return;

  let running = false;
  let lastAttempt = 0;

  function show(message, type = "info") {
    window.postMessage({
      type: "STUDYWING_SHOW_NOTIFICATION",
      notification: { message, type, key: "exam-alert-test", durationMs: 8000 },
    }, "*");
  }

  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.repeat || event.isComposing ||
        event.ctrlKey || event.altKey || event.metaKey || event.shiftKey ||
        event.key.toLowerCase() !== "n" || running || Date.now() - lastAttempt < 1500) return;
    const editing = event.composedPath().some((element) =>
      element instanceof Element && (element.isContentEditable ||
        element.matches("input, textarea, select, [role=textbox]")));
    if (editing) return;

    event.preventDefault();
    running = true;
    lastAttempt = Date.now();
    chrome.storage.local.get({
      ...globalThis.PlumePilotSounds.DEFAULTS,
      plumePilotLanguage: "it",
    }, (stored) => {
      const english = stored?.plumePilotLanguage === "en";
      const text = (italian, translated) => english ? translated : italian;
      if (chrome.runtime.lastError) {
        running = false;
        show(text("TEST — Impossibile leggere le preferenze audio.", "TEST — Could not read sound preferences."), "error");
        return;
      }
      const settings = globalThis.PlumePilotSounds.normalizeSettings(stored);
      if (!settings.soundNotificationsEnabled || settings.notificationVolume === 0) {
        running = false;
        show(text(
          "TEST — Attiva Notifiche sonore nelle Preferenze e scegli un volume maggiore di zero.",
          "TEST — Enable Sound notifications in Preferences and choose a volume above zero.",
        ), "warning");
        return;
      }
      show(text("TEST — Avviso sonoro esame.", "TEST — Exam sound alert."));
      // Preview and real exam alerts both use background.playNotificationSound.
      chrome.runtime.sendMessage({
        type: "STUDYWING_SOUND_PREVIEW",
        sound: settings.notificationSound,
        volume: settings.notificationVolume,
      }, (response) => {
        running = false;
        const error = chrome.runtime.lastError;
        if (error || response?.played !== true) {
          console.warn("[PlumePilot TEST] Exam sound alert failed:", error?.message || response?.reason);
          show(text(
            "TEST — Riproduzione non riuscita. Controlla la console dell’estensione.",
            "TEST — Playback failed. Check the extension console.",
          ), "error");
          return;
        }
        show(text("TEST — Avviso sonoro esame avviato.", "TEST — Exam sound alert started."), "success");
      });
    });
  });
})();

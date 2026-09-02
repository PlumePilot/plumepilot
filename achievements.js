(() => {
  "use strict";

  const STATE_KEY = "studywingAchievements";
  const MAX_EXP = 500;
  const REWARD_SETS = Object.freeze([
    { id: "arcane", name: "Arcane Wing", barThreshold: 0, launcherThreshold: 0 },
    { id: "parchment", name: "Pergamena del Sapiente", barThreshold: 50, launcherThreshold: 100 },
    { id: "tomo", name: "Tomo Dorato", barThreshold: 150, launcherThreshold: 200 },
    { id: "nature", name: "Essenza Naturale", barThreshold: 250, launcherThreshold: 300 },
    { id: "sci-fi", name: "Nucleo Neon", barThreshold: 350, launcherThreshold: 400 },
    { id: "demon", name: "Sigillo Demoniaco", barThreshold: 450, launcherThreshold: 500 },
  ]);
  const CATALOGUE = Object.freeze([
    { id: "discover-autoplay", title: "Pronti, si vola!", description: "Prova l’avanzamento automatico.", exp: 30, group: "primary" },
    { id: "complete-objectives", title: "Obiettivo centrato!", description: "Concludi il completamento automatico degli Obiettivi.", exp: 40, group: "primary" },
    { id: "complete-tests", title: "Maestro dei quiz", description: "Concludi una sessione di test automatici.", exp: 35, group: "primary" },
    { id: "create-test-collection", title: "Archivista dei quiz", description: "Genera una raccolta test utilizzabile.", exp: 25, group: "primary" },
    { id: "export-materials", title: "Sapienza da viaggio", description: "Genera almeno un PDF o EPUB.", exp: 30, group: "primary" },
    { id: "find-first-incomplete", title: "Nessuna missione incompiuta", description: "Apri una destinazione valida trovata da PlumePilot.", exp: 20, group: "primary" },
    { id: "complete-lesson", title: "Sapere è potere!", description: "Completa al 100% tutti i capitoli di una lezione.", exp: 100, group: "primary" },
    { id: "enable-commission-check", title: "Sentinella degli esami", description: "Scopri gli aggiornamenti degli esami online.", exp: 15, group: "secondary" },
    { id: "enable-progress-overlay", title: "HUD attivato!", description: "Attiva la barra del corso nella pagina.", exp: 10, group: "secondary" },
    { id: "enable-70-advice", title: "Soglia nel mirino", description: "Fatti avvisare alla soglia del corso.", exp: 10, group: "secondary" },
    { id: "configure-autoplay-limit", title: "1.. 2.. 3.. Stella!", description: "Imposta un limite valido per la sessione.", exp: 15, group: "secondary" },
    { id: "open-floating-menu", title: "Menu da taschino", description: "Attiva il menu fluttuante nella pagina.", exp: 10, group: "secondary" },
  ]);

  function normalizeState(value) {
    const claimed = Array.isArray(value?.claimedAchievementIds)
      ? [...new Set(value.claimedAchievementIds.filter((id) => CATALOGUE.some((item) => item.id === id)))]
      : [];
    const totalExp = Math.max(0, Math.min(MAX_EXP, Math.floor(Number(value?.totalExp) || 0)));
    const unlockedCosmeticIds = REWARD_SETS.flatMap((set) => [
      ...(totalExp >= set.barThreshold ? [`bar:${set.id}`] : []),
      ...(totalExp >= set.launcherThreshold ? [`launcher:${set.id}`] : []),
    ]);
    return { version: 2, totalExp, claimedAchievementIds: claimed, videoChapterProgress: value?.videoChapterProgress && typeof value.videoChapterProgress === "object" ? value.videoChapterProgress : {}, unlockedCosmeticIds, deliveredUnlockIds: Array.isArray(value?.deliveredUnlockIds) ? value.deliveredUnlockIds : [] };
  }

  function normalizeCosmetics(value, stateValue) {
    const state = normalizeState(stateValue);
    const unlocked = new Set(state.unlockedCosmeticIds);
    const barStyle = unlocked.has(`bar:${value?.barStyle}`) ? value.barStyle : "arcane";
    const launcherStyle = unlocked.has(`launcher:${value?.launcherStyle}`) ? value.launcherStyle : "arcane";
    return { barStyle, launcherStyle };
  }

  function view(stateValue) {
    const state = normalizeState(stateValue);
    const capped = state.totalExp >= MAX_EXP;
    const level = capped ? 6 : Math.floor(state.totalExp / 100) + 1;
    return { state, level, expWithinLevel: capped ? 100 : state.totalExp % 100, capped, maxExp: MAX_EXP };
  }

  globalThis.StudyWingAchievements = Object.freeze({ STATE_KEY, MAX_EXP, CATALOGUE, REWARD_SETS, normalizeState, normalizeCosmetics, view });
})();

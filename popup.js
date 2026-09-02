const checkbox = document.getElementById("enabled");
const autoplayOptions = document.getElementById("autoplayOptions");
const autoplayOptionsSummary = document.getElementById("autoplayOptionsSummary");
const findFirstIncompleteButton = document.getElementById("findFirstIncomplete");
const firstIncompleteStatus = document.getElementById("firstIncompleteStatus");
const testBehaviorRadios = [...document.querySelectorAll('input[name="testBehavior"]')];
const chapterLimitEnabledCheckbox = document.getElementById("chapterLimitEnabled");
const chapterLimitMinus = document.getElementById("chapterLimitMinus");
const chapterLimitPlus = document.getElementById("chapterLimitPlus");
const chapterLimitValue = document.getElementById("chapterLimitValue");
const chapterLimitProgress = document.getElementById("chapterLimitProgress");
const chapterLimitResume = document.getElementById("chapterLimitResume");
const chapterLimitOptionsSummary = document.getElementById("chapterLimitOptionsSummary");
const courseProgressValue = document.getElementById("courseProgressValue");
const courseProgressBar = document.getElementById("courseProgressBar");
const courseProgressFill = document.getElementById("courseProgressFill");
const courseProgressMessage = document.getElementById("courseProgressMessage");
const courseProgressThresholdMarker = document.getElementById("courseProgressThresholdMarker");
const courseProgressOverlayEnabledCheckbox = document.getElementById("courseProgressOverlayEnabled");
const courseProgressPositionFieldset = document.getElementById("courseProgressPositionFieldset");
const courseProgressPositionRadios = [...document.querySelectorAll('input[name="courseProgressOverlayPosition"]')];
const courseProgressThresholdEnabledCheckbox = document.getElementById("courseProgressThresholdEnabled");
const courseProgressOptionsSummary = document.getElementById("courseProgressOptionsSummary");
let chapterLimitStatus = null;
let courseProgressStatus = null;
let activeCourseTabId = null;
let chapterLimitMaps = { limits: {}, sessions: {} };
let chapterLimitStatuses = {};
const playbackErrorRecoveryRadios = [...document.querySelectorAll('input[name="playbackErrorRecovery"]')];
const visualStyleRadios = [...document.querySelectorAll('input[name="visualStyle"]')];
const themePreferenceRadios = [...document.querySelectorAll('input[name="themePreference"]')];
const menuSizeRadios = [...document.querySelectorAll('input[name="menuSize"]')];
const floatingMenuEnabledCheckbox = document.getElementById("floatingMenuEnabled");
const commissionCheckEnabledCheckbox = document.getElementById("commissionCheckEnabled");
const autoplayControlSprite = document.getElementById("autoplayControlSprite");
const floatingMenuControlSprite = document.getElementById("floatingMenuControlSprite");
const commissionControlSprite = document.getElementById("commissionControlSprite");
const playbackRecoveryControlSprite = document.getElementById("playbackRecoveryControlSprite");
const commissionTabBadge = document.getElementById("commissionTabBadge");
const commissionUpdates = document.getElementById("commissionUpdates");
const commissionUpdatesTitle = document.getElementById("commissionUpdatesTitle");
const commissionLastCheck = document.getElementById("commissionLastCheck");
const commissionExamList = document.getElementById("commissionExamList");
const commissionExamEmpty = document.getElementById("commissionExamEmpty");
const confirmedExamsToggle = document.getElementById("confirmedExamsToggle");
const confirmedExamsLabel = document.getElementById("confirmedExamsLabel");
const confirmedExamsPanel = document.getElementById("confirmedExamsPanel");
const loadedPassedGroup = document.getElementById("loadedPassedGroup");
const loadedPassedCount = document.getElementById("loadedPassedCount");
const loadedPassedExamList = document.getElementById("loadedPassedExamList");
const loadedFailedGroup = document.getElementById("loadedFailedGroup");
const loadedFailedCount = document.getElementById("loadedFailedCount");
const loadedFailedExamList = document.getElementById("loadedFailedExamList");
const loadedOtherGroup = document.getElementById("loadedOtherGroup");
const loadedOtherCount = document.getElementById("loadedOtherCount");
const loadedOtherExamList = document.getElementById("loadedOtherExamList");
const markCommissionSeenButton = document.getElementById("markCommissionSeen");
const clearCommissionDataButton = document.getElementById("clearCommissionData");
const clearCommissionDataStatus = document.getElementById("clearCommissionDataStatus");
const extensionVersion = document.getElementById("extensionVersion");
const status = document.getElementById("status");
const turboTestsButton = document.getElementById("turboTests");
const turboTestsButtonLabel = document.getElementById("turboTestsButtonLabel");
const turboTestsSprite = document.getElementById("turboTestsSprite");
const turboTestsStatus = document.getElementById("turboTestsStatus");
const objectivesButton = document.getElementById("completeObjectives");
const objectivesButtonLabel = document.getElementById("objectivesButtonLabel");
const objectivesSprite = document.getElementById("objectivesSprite");
const objectivesStatus = document.getElementById("objectivesStatus");
const createTestCollectionButton = document.getElementById("createTestCollection");
const testCollectionButtonLabel = document.getElementById("testCollectionButtonLabel");
const testCollectionSprite = document.getElementById("testCollectionSprite");
const testCollectionStatus = document.getElementById("testCollectionStatus");
const exportCourseMaterialsButton = document.getElementById("exportCourseMaterials");
const materialsButtonLabel = document.getElementById("materialsButtonLabel");
const materialsSprite = document.getElementById("materialsSprite");
const materialsStatus = document.getElementById("materialsStatus");
const tabButtons = [...document.querySelectorAll('[role="tab"]')];
const tabPanels = [...document.querySelectorAll('[role="tabpanel"]')];
const activeOperationBanner = document.getElementById("activeOperationBanner");
const achievementLevel = document.getElementById("achievementLevel");
const achievementTotal = document.getElementById("achievementTotal");
const achievementProgressText = document.getElementById("achievementProgressText");
const achievementProgress = document.getElementById("achievementProgress");
const achievementProgressFill = document.getElementById("achievementProgressFill");
const achievementMidMarker = achievementProgress.querySelector(".achievement-mid-marker");
const achievementEndMarker = achievementProgress.querySelector(".achievement-end-marker");
const achievementFeedback = document.getElementById("achievementFeedback");
const achievementToast = document.getElementById("achievementToast");
const primaryAchievements = document.getElementById("primaryAchievements");
const secondaryAchievements = document.getElementById("secondaryAchievements");
const rewardsSummary = document.getElementById("rewardsSummary");
const barRewards = document.getElementById("barRewards");
const launcherRewards = document.getElementById("launcherRewards");
const resetAchievementsButton = document.getElementById("resetAchievements");
let activeOperation = null;
const commissionStates = globalThis.StudyWingCommissionState;
const achievements = globalThis.StudyWingAchievements;
let achievementToastTimer = null;
let achievementState = achievements.normalizeState(null);
let gamingCosmetics = achievements.normalizeCosmetics(null, achievementState);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const COMMISSION_STORAGE_KEYS = [
  "commissionExams",
  "commissionExamsCapturedAt",
  "commissionExamSnapshots",
  "commissionExamTrackingInitialized",
  "commissionUnseenExamIds",
];

extensionVersion.textContent = `v${chrome.runtime.getManifest().version}`;

function selectPopupTab(tabId, focus = false) {
  const selectedButton = tabButtons.find((button) => button.id === tabId);
  if (!selectedButton) return;

  for (const button of tabButtons) {
    const selected = button === selectedButton;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  }

  for (const panel of tabPanels) {
    panel.hidden = panel.id !== selectedButton.getAttribute("aria-controls");
  }

  if (focus) selectedButton.focus();
}

function renderAchievements(stateValue) {
  const model = achievements.view(stateValue);
  achievementState = model.state;
  const claimed = new Set(model.state.claimedAchievementIds);
  achievementLevel.textContent = `Livello ${model.level}`;
  achievementTotal.textContent = `${model.state.totalExp} EXP totali`;
  achievementProgressText.textContent = model.capped ? "500 / 500 EXP · Completato" : `${model.expWithinLevel} / 100 EXP`;
  achievementProgress.setAttribute("aria-valuenow", String(model.expWithinLevel));
  achievementProgress.setAttribute("aria-valuetext", achievementProgressText.textContent);
  achievementProgressFill.style.width = `calc((100% - 40px) * ${model.expWithinLevel / 100})`;
  const rewardSet = achievements.REWARD_SETS[Math.min(model.level, achievements.REWARD_SETS.length - 1)];
  const midRewardUnlocked = model.capped || model.expWithinLevel >= 50;
  achievementProgress.dataset.rewardStyle = rewardSet.id;
  achievementProgress.dataset.midUnlocked = String(midRewardUnlocked);
  achievementMidMarker.title = midRewardUnlocked
    ? "Premio barra già sbloccato"
    : `${rewardSet.name}: stile barra a 50 EXP`;
  achievementEndMarker.title = model.capped
    ? "Tutti i premi sbloccati"
    : `${rewardSet.name}: stile launcher a 100 EXP`;
  for (const [group, target] of [["primary", primaryAchievements], ["secondary", secondaryAchievements]]) {
    const rows = achievements.CATALOGUE.filter((item) => item.group === group).map((item) => {
      const complete = claimed.has(item.id);
      const row = document.createElement("article"); row.className = "achievement-row"; row.dataset.complete = String(complete);
      const title = document.createElement("strong"); title.textContent = item.title;
      const description = document.createElement("small"); description.textContent = complete ? "Completato" : item.description;
      const exp = document.createElement("span"); exp.className = "achievement-exp"; exp.textContent = `+${item.exp} EXP`;
      row.append(title, description, exp); return row;
    });
    target.replaceChildren(...rows);
  }
  renderRewards();
}

function applyCosmetics() {
  gamingCosmetics = achievements.normalizeCosmetics(gamingCosmetics, achievementState);
  document.documentElement.dataset.barStyle = gamingCosmetics.barStyle;
  document.documentElement.dataset.launcherStyle = gamingCosmetics.launcherStyle;
}

function renderRewards() {
  gamingCosmetics = achievements.normalizeCosmetics(gamingCosmetics, achievementState);
  const unlocked = new Set(achievementState.unlockedCosmeticIds);
  rewardsSummary.textContent = `${unlocked.size} di ${achievements.REWARD_SETS.length * 2} sbloccate`;
  const renderKind = (kind, target) => {
    target.replaceChildren(...achievements.REWARD_SETS.map((set) => {
      const threshold = kind === "bar" ? set.barThreshold : set.launcherThreshold;
      const available = unlocked.has(`${kind}:${set.id}`);
      const active = gamingCosmetics[`${kind}Style`] === set.id;
      const card = document.createElement("article"); card.className = "reward-card"; card.dataset.locked = String(!available); card.dataset.style = set.id;
      const preview = document.createElement("span"); preview.className = `reward-preview reward-preview-${kind}`; preview.dataset.style = set.id; preview.setAttribute("aria-hidden", "true");
      const copy = document.createElement("span"); copy.className = "reward-copy";
      const name = document.createElement("strong"); name.textContent = set.name;
      const state = document.createElement("small"); state.textContent = available ? (active ? "In uso" : "Sbloccato") : `${threshold} EXP richieste`;
      copy.append(name, state); card.append(preview, copy);
      if (available) {
        const button = document.createElement("button"); button.type = "button"; button.className = "reward-apply"; button.dataset.rewardKind = kind; button.dataset.rewardStyle = set.id; button.textContent = active ? "In uso" : "Applica"; button.disabled = active; card.append(button);
      }
      return card;
    }));
  };
  renderKind("bar", barRewards); renderKind("launcher", launcherRewards); applyCosmetics();
}

function applyReward(kind, style) {
  if (!achievementState.unlockedCosmeticIds.includes(`${kind}:${style}`)) return;
  gamingCosmetics = { ...gamingCosmetics, [`${kind}Style`]: style };
  chrome.storage.local.set({ gamingCosmetics });
  renderRewards();
}

async function claimAchievement(id) {
  if (document.documentElement.dataset.visualStyle !== "gaming") return { accepted: false };
  const result = await runtimeMessage({ type: "STUDYWING_ACHIEVEMENT_CLAIM", achievementId: id });
  if (result?.accepted) {
    const rewards = Array.isArray(result.newUnlockIds) ? result.newUnlockIds.length : 0;
    const suffix = `${rewards ? ` · ${rewards === 1 ? "Nuova ricompensa disponibile" : `${rewards} nuove ricompense disponibili`}` : ""}${result.levelUp ? ` · Livello ${result.level} raggiunto!` : ""}`;
    achievementFeedback.textContent = `${result.achievement.title}: +${result.awardedExp} EXP${suffix}`;
    clearTimeout(achievementToastTimer);
    achievementToast.textContent = `Traguardo completato: ${result.achievement.title} · +${result.awardedExp} EXP${suffix}`;
    achievementToast.hidden = false;
    achievementToastTimer = setTimeout(() => { achievementToast.hidden = true; }, 4200);
    renderAchievements(result.state);
  }
  return result;
}

function claimEnabledGamingAchievements() {
  if (document.documentElement.dataset.visualStyle !== "gaming") return;
  if (checkbox.checked) claimAchievement("discover-autoplay");
  if (floatingMenuEnabledCheckbox.checked) claimAchievement("open-floating-menu");
}

function operationTabId(operation) {
  return ["turbo", "objectives", "tests"].includes(operation?.kind)
    ? "activitiesTab"
    : "courseTab";
}

for (const button of tabButtons) {
  button.addEventListener("click", () => selectPopupTab(button.id));
  button.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();

    const visibleTabs = tabButtons.filter((candidate) => !candidate.classList.contains("achievements-only") || document.documentElement.dataset.visualStyle === "gaming");
    const currentIndex = visibleTabs.indexOf(button);
    let nextIndex = currentIndex;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + visibleTabs.length) % visibleTabs.length;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % visibleTabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = visibleTabs.length - 1;
    selectPopupTab(visibleTabs[nextIndex].id, true);
  });
}

activeOperationBanner.addEventListener("click", () => {
  if (activeOperation) selectPopupTab(operationTabId(activeOperation), true);
});

function updateStatus(enabled) {
  status.textContent = enabled ? "Attivo" : "In pausa";
  status.setAttribute("aria-pressed", String(enabled));
  status.setAttribute("aria-label", enabled ? "Metti PlumePilot in pausa" : "Riattiva PlumePilot");
  status.title = enabled ? "Metti PlumePilot in pausa" : "Riattiva PlumePilot";
  document.body.dataset.state = enabled ? "running" : "paused";
}
function selectedTestBehavior() {
  return testBehaviorRadios.find((radio) => radio.checked)?.value || "ignore";
}
function renderTestBehavior(stopAtTests, autoCompleteTests) {
  const value = autoCompleteTests ? "complete" : stopAtTests ? "stop" : "ignore";
  for (const radio of testBehaviorRadios) radio.checked = radio.value === value;
  renderAutoplayOptionsSummary();
}
function renderAutoplayOptionsSummary() {
  const behavior = selectedTestBehavior();
  const behaviorLabel = behavior === "complete"
    ? "Test automatici"
    : behavior === "stop"
      ? "Stop ai test"
      : "Test ignorati";
  const limitReady = Boolean(chapterLimitStatus?.courseCode);
  const limitEnabled = chapterLimitStatus?.enabled === true;
  const limit = Math.max(1, Number(chapterLimitStatus?.limit) || 1);
  const completed = Math.max(0, Number(chapterLimitStatus?.completed) || 0);
  autoplayOptionsSummary.textContent = limitEnabled
    ? `${behaviorLabel} · limite ${limit}`
    : behaviorLabel;
  chapterLimitOptionsSummary.textContent = !limitReady
    ? "Non disponibile"
    : !limitEnabled
      ? "Disattivato"
      : chapterLimitStatus.reached
        ? `Raggiunto · ${completed}/${limit}`
        : `${completed}/${limit} capitoli`;
}
function renderChapterLimit() {
  const statusValue = chapterLimitStatus;
  const ready = Boolean(statusValue?.courseCode);
  const limit = Math.max(1, Number(statusValue?.limit) || 1);
  const maximum = Math.max(1, Number(statusValue?.maximum) || 1);
  chapterLimitValue.textContent = String(limit);
  chapterLimitEnabledCheckbox.checked = statusValue?.enabled === true;
  chapterLimitEnabledCheckbox.disabled = !ready;
  chapterLimitMinus.disabled = !ready || limit <= 1;
  chapterLimitPlus.disabled = !ready || limit >= maximum;
  chapterLimitProgress.textContent = !ready
    ? "Apri un corso per calcolare il limite."
    : statusValue.reached
      ? `Limite raggiunto: ${statusValue.completed} di ${limit} capitoli.`
      : `Sessione: ${statusValue.completed || 0} di ${limit} capitoli · massimo ${maximum}.`;
  chapterLimitResume.hidden = !statusValue?.reached;
  chapterLimitResume.textContent = `Riprendi per altri ${limit} capitoli`;
  for (const radio of testBehaviorRadios) {
    if (radio.value === "stop") radio.disabled = !checkbox.checked || statusValue?.enabled === true;
  }
  renderAutoplayOptionsSummary();
}
function renderCourseProgress(nextStatus = courseProgressStatus) {
  courseProgressStatus = nextStatus || null;
  const ready = courseProgressStatus?.available === true &&
    Number.isFinite(Number(courseProgressStatus.percent));
  const percent = ready
    ? Math.max(0, Math.min(100, Math.floor(Number(courseProgressStatus.percent))))
    : 0;
  courseProgressValue.textContent = ready ? `${percent}%` : "—";
  courseProgressFill.style.width = `${percent}%`;
  courseProgressBar.setAttribute("aria-valuenow", ready ? String(percent) : "0");
  courseProgressBar.setAttribute(
    "aria-valuetext",
    ready ? `${percent}%` : "Progresso non disponibile",
  );
  courseProgressMessage.textContent = ready
    ? courseProgressStatus.message || "Sincronizzato con Pegaso."
    : "Apri un corso per visualizzare il progresso.";
}
function normalizedCourseProgressPosition(value) {
  return ["top", "bottom", "left", "right"].includes(value) ? value : "bottom";
}
function renderCourseProgressPreferences(overlayEnabled, position, thresholdEnabled) {
  courseProgressOverlayEnabledCheckbox.checked = overlayEnabled === true;
  courseProgressPositionFieldset.disabled = overlayEnabled !== true;
  const normalizedPosition = normalizedCourseProgressPosition(position);
  for (const radio of courseProgressPositionRadios) {
    radio.checked = radio.value === normalizedPosition;
  }
  courseProgressThresholdEnabledCheckbox.checked = thresholdEnabled === true;
  courseProgressThresholdMarker.hidden = thresholdEnabled !== true;
  const positionLabels = { top: "sopra", bottom: "sotto", left: "a sinistra", right: "a destra" };
  const summary = [];
  if (overlayEnabled === true) summary.push(`Barra ${positionLabels[normalizedPosition]}`);
  if (thresholdEnabled === true) summary.push("avviso 70%");
  courseProgressOptionsSummary.textContent = summary.length ? summary.join(" · ") : "Disattivate";
}
function updateChapterLimitValue(nextValue) {
  if (!chapterLimitStatus?.courseCode) return;
  const value = Math.max(1, Math.min(chapterLimitStatus.maximum, nextValue));
  chapterLimitMaps.limits[chapterLimitStatus.courseCode] = value;
  chrome.storage.local.set({ autoplayChapterLimits: chapterLimitMaps.limits });
}
function selectedPlaybackErrorRecovery() {
  return playbackErrorRecoveryRadios.find((radio) => radio.checked)?.value || "automatic";
}
function renderPlaybackErrorRecovery(value) {
  const normalized = value === "manual" ? "manual" : "automatic";
  for (const radio of playbackErrorRecoveryRadios) radio.checked = radio.value === normalized;
}
function selectedThemePreference() {
  return themePreferenceRadios.find((radio) => radio.checked)?.value || "system";
}

function normalizeVisualStyle(value) {
  return value === "gaming" ? "gaming" : "standard";
}

function selectedVisualStyle() {
  return normalizeVisualStyle(visualStyleRadios.find((radio) => radio.checked)?.value);
}

function renderVisualStyle(value) {
  const normalized = normalizeVisualStyle(value);
  document.documentElement.dataset.visualStyle = normalized;
  if (normalized !== "gaming" && document.getElementById("achievementsTab")?.getAttribute("aria-selected") === "true") selectPopupTab("courseTab");
  if (normalized !== "gaming") {
    for (const sprite of [turboTestsSprite, objectivesSprite, testCollectionSprite, materialsSprite, autoplayControlSprite, floatingMenuControlSprite, commissionControlSprite, playbackRecoveryControlSprite]) {
      sprite.classList.remove("is-playing");
    }
  }
  for (const radio of visualStyleRadios) radio.checked = radio.value === normalized;
}

function playActionAnimation(sprite) {
  if (document.documentElement.dataset.visualStyle !== "gaming" || reducedMotion.matches) return;
  sprite.classList.remove("is-playing");
  void sprite.offsetWidth;
  sprite.classList.add("is-playing");
}

function normalizeMenuSize(value) {
  return ["small", "medium", "large"].includes(value) ? value : "medium";
}

function selectedMenuSize() {
  return normalizeMenuSize(menuSizeRadios.find((radio) => radio.checked)?.value);
}

function renderMenuSize(value) {
  const normalized = normalizeMenuSize(value);
  document.documentElement.dataset.menuSize = normalized;
  for (const radio of menuSizeRadios) radio.checked = radio.value === normalized;
}
function renderThemePreference(value) {
  const normalized = value === "light" || value === "dark" ? value : "system";
  for (const radio of themePreferenceRadios) radio.checked = radio.value === normalized;
}
function updateAutoplayControls() {
  const disabled = !checkbox.checked;
  autoplayOptions.classList.toggle("disabled", disabled);
  autoplayOptions.setAttribute("aria-disabled", String(disabled));
  findFirstIncompleteButton.disabled = disabled || Boolean(activeOperation);
  for (const radio of testBehaviorRadios) radio.disabled = disabled;
  renderChapterLimit();
}
function operationLabel(operation) {
  if (!operation) return "";
  if (operation.kind === "turbo") return "I test automatici sono in esecuzione.";
  if (operation.kind === "objectives") return "Il completamento degli Obiettivi è in esecuzione.";
  if (operation.kind === "tests") return "È in corso la raccolta dei test del corso.";
  if (operation.kind === "materials") return "È in corso la raccolta delle dispense del corso.";
  return `È in corso la creazione del ${operation.kind.toUpperCase()} del corso.`;
}
function renderOperation(operation) {
  activeOperation = operation || null;
  const busy = Boolean(operation);
  const turbo = operation?.kind === "turbo";
  const objectives = operation?.kind === "objectives";
  const collectingTests = operation?.kind === "tests" && ["collecting", "stopping"].includes(operation.phase);
  const stopping = operation?.phase === "stopping";
  const collectingMaterials = operation?.kind === "materials" && ["collecting", "stopping"].includes(operation.phase);
  materialsButtonLabel.textContent = collectingMaterials
    ? (stopping ? "Interruzione dispense…" : "Interrompi raccolta dispense")
    : "Esporta dispense del corso";
  exportCourseMaterialsButton.disabled = (busy && !collectingMaterials) || (collectingMaterials && stopping);
  turboTestsButton.dataset.running = String(turbo);
  turboTestsButtonLabel.textContent = turbo ? (stopping ? "Interruzione dei test…" : "Interrompi i test automatici") : "Completa tutti i test";
  turboTestsButton.disabled = busy && !turbo || stopping;
  turboTestsStatus.textContent = turbo ? operation.message || "Test automatici in esecuzione…" : busy ? operationLabel(operation) : "";
  objectivesButton.dataset.running = String(objectives);
  objectivesButtonLabel.textContent = objectives
    ? (stopping ? "Interruzione Obiettivi…" : "Interrompi Obiettivi")
    : "Completa tutti gli Obiettivi";
  objectivesButton.disabled = (busy && !objectives) || stopping;
  objectivesStatus.textContent = objectives
    ? operation.message || "Completamento degli Obiettivi in esecuzione…"
    : busy ? operationLabel(operation) : "";
  testCollectionButtonLabel.textContent = collectingTests
    ? (stopping ? "Interruzione raccolta test…" : "Interrompi raccolta test")
    : "Crea raccolta test del corso";
  createTestCollectionButton.disabled = (busy && !collectingTests) || (collectingTests && stopping);
  testCollectionStatus.textContent = operation?.kind === "tests"
    ? operation.message || "Raccolta dei test in corso…"
    : busy ? operationLabel(operation) : "";
  materialsStatus.textContent = operation?.kind === "materials"
    ? operation.message || "Raccolta delle dispense in corso…"
    : busy ? operationLabel(operation) : "";
  activeOperationBanner.hidden = !busy;
  activeOperationBanner.textContent = busy ? operation.message || operationLabel(operation) : "";
  updateAutoplayControls();
}

function formatCommissionDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatCommissionCapture(value) {
  const date = new Date(Number(value));
  if (!Number.isFinite(Number(value)) || Number.isNaN(date.getTime())) {
    return "Apri una pagina Pegaso per creare la situazione iniziale.";
  }
  return `Ultimo aggiornamento: ${new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)}`;
}

function commissionResultLabel(result) {
  const normalized = String(result || "").toLowerCase();
  const pendingVerbalization = /^daverbalizzare(?:-|$)/.test(normalized);
  if (pendingVerbalization && normalized.includes("promosso")) return "Da verbalizzare · Superato";
  if (pendingVerbalization && normalized.includes("bocciato")) return "Da verbalizzare · Non superato";
  if (normalized.includes("promosso")) return "Superato";
  if (normalized.includes("bocciato")) return "Non superato";
  return result ? String(result).replaceAll("-", " · ") : "Esito non disponibile";
}

function sortCommissionExams(exams, unseenSet) {
  exams.sort((first, second) => {
    const unseenDifference = Number(unseenSet.has(Number(second?.exam_id)))
      - Number(unseenSet.has(Number(first?.exam_id)));
    if (unseenDifference) return unseenDifference;
    const firstDate = new Date(first?.date_exam || 0).getTime() || 0;
    const secondDate = new Date(second?.date_exam || 0).getTime() || 0;
    return secondDate - firstDate;
  });
}

function createCommissionExamCard(exam, unseenSet) {
  if (!exam || !Number.isFinite(Number(exam.exam_id))) return null;
  const item = document.createElement("article");
  item.className = "commission-exam-card";
  if (unseenSet.has(Number(exam.exam_id))) item.dataset.new = "true";

  const heading = document.createElement("div");
  heading.className = "commission-exam-title";
  heading.textContent = exam.title_exam || exam.course_code || "Esame online";

  const meta = document.createElement("div");
  meta.className = "commission-exam-meta";
  const parts = [];
  const date = formatCommissionDate(exam.date_exam);
  if (date) parts.push(date);
  if (Number.isFinite(Number(exam.vote))) parts.push(`Voto ${Number(exam.vote)}/30`);
  parts.push(commissionResultLabel(exam.result));
  meta.textContent = parts.join(" · ");

  const presentation = commissionStates.statePresentation(exam);
  const verdict = document.createElement("div");
  verdict.className = "commission-exam-verdict";
  verdict.dataset.tone = presentation.tone;
  verdict.textContent = `Commissione: ${presentation.label}`;

  item.append(heading, meta, verdict);
  const rejectionMotivation = commissionStates.rejectMotivationText(exam);
  if (rejectionMotivation) {
    const motivation = document.createElement("div");
    motivation.className = "commission-exam-motivation";
    motivation.textContent = rejectionMotivation;
    motivation.dataset.expanded = "false";
    motivation.tabIndex = 0;
    motivation.setAttribute("role", "button");
    motivation.setAttribute("aria-label", "Mostra o nascondi la motivazione completa");
    const toggleMotivation = () => {
      motivation.dataset.expanded = String(motivation.dataset.expanded !== "true");
    };
    motivation.addEventListener("click", toggleMotivation);
    motivation.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggleMotivation();
    });
    item.append(motivation);
  }
  return item;
}

function renderCommissionUpdates(stored = {}) {
  const enabled = stored.commissionCheckEnabled === true;
  const exams = Array.isArray(stored.commissionExams) ? stored.commissionExams : [];
  const unseenIds = enabled && Array.isArray(stored.commissionUnseenExamIds)
    ? stored.commissionUnseenExamIds.map(Number).filter(Number.isFinite)
    : [];
  const unseenSet = new Set(unseenIds);
  const openExams = exams.filter((exam) => !commissionStates.isLoadedExam(exam));
  const loadedExams = exams.filter(commissionStates.isLoadedExam);
  const passedExams = loadedExams.filter((exam) => commissionStates.loadedOutcome(exam) === "passed");
  const failedExams = loadedExams.filter((exam) => commissionStates.loadedOutcome(exam) === "failed");
  const otherExams = loadedExams.filter((exam) => commissionStates.loadedOutcome(exam) === "other");
  sortCommissionExams(openExams, unseenSet);
  for (const group of [passedExams, failedExams, otherExams]) sortCommissionExams(group, unseenSet);

  commissionTabBadge.hidden = unseenIds.length === 0;
  commissionTabBadge.textContent = unseenIds.length > 9 ? "9+" : String(unseenIds.length || "!");
  commissionUpdates.hidden = !enabled;
  if (!enabled) return;

  commissionUpdatesTitle.textContent = unseenIds.length
    ? `${unseenIds.length} ${unseenIds.length === 1 ? "aggiornamento" : "aggiornamenti"} da leggere`
    : "Stato della commissione";
  commissionLastCheck.textContent = formatCommissionCapture(stored.commissionExamsCapturedAt);
  markCommissionSeenButton.hidden = unseenIds.length === 0;
  commissionExamList.replaceChildren();
  loadedPassedExamList.replaceChildren();
  loadedFailedExamList.replaceChildren();
  loadedOtherExamList.replaceChildren();

  for (const exam of openExams) {
    const card = createCommissionExamCard(exam, unseenSet);
    if (card) commissionExamList.append(card);
  }
  for (const [group, list] of [
    [passedExams, loadedPassedExamList],
    [failedExams, loadedFailedExamList],
    [otherExams, loadedOtherExamList],
  ]) {
    for (const exam of group) {
      const card = createCommissionExamCard(exam, unseenSet);
      if (card) list.append(card);
    }
  }

  commissionExamEmpty.hidden = openExams.length > 0;
  commissionExamEmpty.textContent = stored.commissionExamsCapturedAt
    ? "Nessun esame in attesa o ancora da confermare."
    : "Non è stata ancora creata una situazione iniziale.";
  const loadedUnseen = loadedExams.filter((exam) => unseenSet.has(Number(exam?.exam_id))).length;
  confirmedExamsToggle.hidden = loadedExams.length === 0;
  confirmedExamsLabel.textContent = `Esiti caricati (${loadedExams.length})${loadedUnseen ? ` · ${loadedUnseen} da leggere` : ""}`;
  for (const [group, section, count] of [
    [passedExams, loadedPassedGroup, loadedPassedCount],
    [failedExams, loadedFailedGroup, loadedFailedCount],
    [otherExams, loadedOtherGroup, loadedOtherCount],
  ]) {
    section.hidden = group.length === 0;
    count.textContent = `(${group.length})`;
  }
  if (!loadedExams.length) {
    confirmedExamsToggle.setAttribute("aria-expanded", "false");
    confirmedExamsPanel.hidden = true;
  }
}

function readCommissionUpdates() {
  chrome.storage.local.get({
    commissionCheckEnabled: false,
    commissionExams: [],
    commissionExamsCapturedAt: null,
    commissionUnseenExamIds: [],
  }, renderCommissionUpdates);
}
function withActiveCourseTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => callback(tabs[0]?.id || null));
}
function runtimeMessage(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, (response) => resolve(chrome.runtime.lastError ? { accepted: false, reason: chrome.runtime.lastError.message } : response)));
}

chrome.storage.local.get({ enabled: true, stopAtTests: false, autoCompleteTests: false, autoplayChapterLimitEnabled: false, autoplayChapterLimits: {}, autoplayChapterLimitSessions: {}, autoplayChapterLimitStatuses: {}, courseProgressOverlayEnabled: false, courseProgressOverlayPosition: "bottom", courseProgressThresholdEnabled: false, playbackErrorRecovery: "automatic", visualStyle: "standard", themePreference: "system", menuSize: "medium", floatingMenuEnabled: true, commissionCheckEnabled: false, commissionExams: [], commissionExamsCapturedAt: null, commissionUnseenExamIds: [], pegasoActiveOperation: null, studywingAchievements: null, gamingCosmetics: { barStyle: "arcane", launcherStyle: "arcane" } }, (result) => {
  checkbox.checked = result.enabled;
  renderTestBehavior(result.stopAtTests, result.autoCompleteTests);
  chapterLimitMaps = { limits: result.autoplayChapterLimits || {}, sessions: result.autoplayChapterLimitSessions || {} };
  chapterLimitStatuses = result.autoplayChapterLimitStatuses || {};
  renderCourseProgressPreferences(result.courseProgressOverlayEnabled, result.courseProgressOverlayPosition, result.courseProgressThresholdEnabled);
  renderPlaybackErrorRecovery(result.playbackErrorRecovery);
  renderVisualStyle(result.visualStyle);
  renderThemePreference(result.themePreference);
  renderMenuSize(result.menuSize);
  floatingMenuEnabledCheckbox.checked = result.floatingMenuEnabled;
  commissionCheckEnabledCheckbox.checked = result.commissionCheckEnabled;
  gamingCosmetics = achievements.normalizeCosmetics(result.gamingCosmetics, result.studywingAchievements); updateAutoplayControls(); updateStatus(result.enabled); renderOperation(result.pegasoActiveOperation); renderCommissionUpdates(result); renderCourseProgress(); renderAchievements(result.studywingAchievements);
  claimEnabledGamingAchievements();
});
runtimeMessage({ type: "PEGASO_GET_OPERATION" }).then((response) => {
  if (response?.accepted) renderOperation(response.operation);
});
withActiveCourseTab((tabId) => {
  if (!tabId) return;
  activeCourseTabId = tabId;
  chrome.tabs.sendMessage(tabId, { type: "PEGASO_CHAPTER_LIMIT_STATUS_REQUEST" }, { frameId: 0 }, (response) => {
    if (chrome.runtime.lastError || !response?.status) return;
    chapterLimitStatus = response.status;
    renderChapterLimit();
  });
  chrome.tabs.sendMessage(tabId, { type: "PEGASO_COURSE_PROGRESS_STATUS_REQUEST" }, { frameId: 0 }, (response) => {
    if (chrome.runtime.lastError || !response?.status) return;
    renderCourseProgress(response.status);
  });
});
chrome.runtime.onMessage.addListener((message, sender) => {
  if (
    message?.type === "PEGASO_COURSE_PROGRESS_STATUS" &&
    sender?.tab?.id === activeCourseTabId
  ) {
    renderCourseProgress(message.status || null);
  }
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.pegasoActiveOperation) renderOperation(changes.pegasoActiveOperation.newValue || null);
  if (changes.enabled) {
    checkbox.checked = changes.enabled.newValue !== false;
    updateStatus(checkbox.checked);
    updateAutoplayControls();
  }
  if (changes.stopAtTests || changes.autoCompleteTests) {
    chrome.storage.local.get({ stopAtTests: false, autoCompleteTests: false }, (result) =>
      renderTestBehavior(result.stopAtTests, result.autoCompleteTests));
  }
  if (changes.autoplayChapterLimitStatuses || changes.autoplayChapterLimitEnabled || changes.autoplayChapterLimits || changes.autoplayChapterLimitSessions) {
    chrome.storage.local.get({ autoplayChapterLimitEnabled: false, autoplayChapterLimits: {}, autoplayChapterLimitSessions: {}, autoplayChapterLimitStatuses: {} }, (result) => {
      chapterLimitMaps = { limits: result.autoplayChapterLimits || {}, sessions: result.autoplayChapterLimitSessions || {} };
      chapterLimitStatuses = result.autoplayChapterLimitStatuses || {};
      if (chapterLimitStatus?.courseCode) {
        chapterLimitStatus = chapterLimitStatuses[chapterLimitStatus.courseCode] || chapterLimitStatus;
      }
      if (chapterLimitStatus) chapterLimitStatus.enabled = result.autoplayChapterLimitEnabled === true;
      renderChapterLimit();
    });
  }
  if (changes.courseProgressOverlayEnabled || changes.courseProgressOverlayPosition || changes.courseProgressThresholdEnabled) {
    chrome.storage.local.get({ courseProgressOverlayEnabled: false, courseProgressOverlayPosition: "bottom", courseProgressThresholdEnabled: false }, (result) =>
      renderCourseProgressPreferences(result.courseProgressOverlayEnabled, result.courseProgressOverlayPosition, result.courseProgressThresholdEnabled));
  }
  if (changes.playbackErrorRecovery) renderPlaybackErrorRecovery(changes.playbackErrorRecovery.newValue);
  if (changes.visualStyle) renderVisualStyle(changes.visualStyle.newValue);
  if (changes.studywingAchievements) renderAchievements(changes.studywingAchievements.newValue);
  if (changes.gamingCosmetics) { gamingCosmetics = achievements.normalizeCosmetics(changes.gamingCosmetics.newValue, achievementState); renderRewards(); }
  if (changes.themePreference) renderThemePreference(changes.themePreference.newValue);
  if (changes.menuSize) renderMenuSize(changes.menuSize.newValue);
  if (changes.floatingMenuEnabled) floatingMenuEnabledCheckbox.checked = changes.floatingMenuEnabled.newValue === true;
  if (changes.commissionCheckEnabled) commissionCheckEnabledCheckbox.checked = changes.commissionCheckEnabled.newValue === true;
  if (changes.commissionCheckEnabled || changes.commissionExams || changes.commissionExamsCapturedAt || changes.commissionUnseenExamIds) {
    readCommissionUpdates();
  }
});
checkbox.addEventListener("change", () => {
  updateStatus(checkbox.checked);
  updateAutoplayControls();
  chrome.storage.local.set({ enabled: checkbox.checked });
  if (checkbox.checked) playActionAnimation(autoplayControlSprite);
  if (checkbox.checked) claimAchievement("discover-autoplay");
});
status.addEventListener("click", () => checkbox.click());
findFirstIncompleteButton.addEventListener("click", () => {
  findFirstIncompleteButton.disabled = true;
  firstIncompleteStatus.textContent = "Avvio della ricerca dall’inizio del corso…";
  withActiveCourseTab((tabId) => {
    if (!tabId) {
      firstIncompleteStatus.textContent = "Apri prima la pagina delle lezioni di un corso.";
      updateAutoplayControls();
      return;
    }
    chrome.tabs.sendMessage(
      tabId,
      { type: "PEGASO_FIND_FIRST_INCOMPLETE_COMMAND" },
      { frameId: 0 },
      (response) => {
        if (chrome.runtime.lastError || !response?.accepted) {
          firstIncompleteStatus.textContent =
            response?.reason || "Impossibile avviare la ricerca. Ricarica la pagina del corso e riprova.";
          updateAutoplayControls();
          return;
        }
        firstIncompleteStatus.textContent = response.alreadyRunning
          ? "La ricerca è già in corso nella pagina del corso."
          : "Ricerca avviata nella pagina del corso.";
        setTimeout(updateAutoplayControls, 1500);
      },
    );
  });
});
for (const radio of testBehaviorRadios) radio.addEventListener("change", () => {
  if (!radio.checked) return;
  const behavior = selectedTestBehavior();
  chrome.storage.local.set({
    stopAtTests: behavior === "stop",
    autoCompleteTests: behavior === "complete",
  });
});
chapterLimitEnabledCheckbox.addEventListener("change", () => {
  chrome.storage.local.set({ autoplayChapterLimitEnabled: chapterLimitEnabledCheckbox.checked });
  if (chapterLimitEnabledCheckbox.checked && chapterLimitStatus?.courseCode) claimAchievement("configure-autoplay-limit");
});
chapterLimitMinus.addEventListener("click", () => updateChapterLimitValue((Number(chapterLimitStatus?.limit) || 1) - 1));
chapterLimitPlus.addEventListener("click", () => updateChapterLimitValue((Number(chapterLimitStatus?.limit) || 1) + 1));
chapterLimitResume.addEventListener("click", () => {
  if (!chapterLimitStatus?.courseCode) return;
  chapterLimitMaps.sessions[chapterLimitStatus.courseCode] = {
    courseCode: chapterLimitStatus.courseCode,
    completed: 0,
    reached: false,
    lastChapterKey: "",
  };
  chrome.storage.local.set({ autoplayChapterLimitSessions: chapterLimitMaps.sessions });
});
courseProgressOverlayEnabledCheckbox.addEventListener("change", () => {
  chrome.storage.local.set({ courseProgressOverlayEnabled: courseProgressOverlayEnabledCheckbox.checked });
  if (courseProgressOverlayEnabledCheckbox.checked) claimAchievement("enable-progress-overlay");
});
for (const radio of courseProgressPositionRadios) radio.addEventListener("change", () => {
  if (!radio.checked) return;
  chrome.storage.local.set({ courseProgressOverlayPosition: normalizedCourseProgressPosition(radio.value) });
});
courseProgressThresholdEnabledCheckbox.addEventListener("change", () => {
  chrome.storage.local.set({ courseProgressThresholdEnabled: courseProgressThresholdEnabledCheckbox.checked });
  if (courseProgressThresholdEnabledCheckbox.checked) claimAchievement("enable-70-advice");
});
for (const radio of playbackErrorRecoveryRadios) radio.addEventListener("change", () => {
  if (!radio.checked) return;
  chrome.storage.local.set({ playbackErrorRecovery: selectedPlaybackErrorRecovery() });
  playActionAnimation(playbackRecoveryControlSprite);
});
for (const radio of visualStyleRadios) radio.addEventListener("change", () => {
  if (!radio.checked) return;
  const visualStyle = selectedVisualStyle();
  renderVisualStyle(visualStyle);
  chrome.storage.local.set({ visualStyle });
  claimEnabledGamingAchievements();
});
for (const radio of themePreferenceRadios) radio.addEventListener("change", () => {
  if (!radio.checked) return;
  chrome.storage.local.set({ themePreference: selectedThemePreference() });
});
for (const radio of menuSizeRadios) radio.addEventListener("change", () => {
  if (!radio.checked) return;
  const menuSize = selectedMenuSize();
  renderMenuSize(menuSize);
  chrome.storage.local.set({ menuSize });
});
floatingMenuEnabledCheckbox.addEventListener("change", () => {
  chrome.storage.local.set({ floatingMenuEnabled: floatingMenuEnabledCheckbox.checked });
  if (floatingMenuEnabledCheckbox.checked) playActionAnimation(floatingMenuControlSprite);
  if (floatingMenuEnabledCheckbox.checked) claimAchievement("open-floating-menu");
});
commissionCheckEnabledCheckbox.addEventListener("change", () => {
  chrome.storage.local.set({ commissionCheckEnabled: commissionCheckEnabledCheckbox.checked });
  if (commissionCheckEnabledCheckbox.checked) playActionAnimation(commissionControlSprite);
  if (commissionCheckEnabledCheckbox.checked) claimAchievement("enable-commission-check");
});

resetAchievementsButton.addEventListener("click", () => {
  if (!window.confirm("Vuoi cancellare definitivamente Traguardi, EXP e ricompense cosmetiche? Le altre preferenze di PlumePilot non verranno modificate.")) return;
  chrome.storage.local.remove(
    [
      achievements.STATE_KEY,
      "studywingPendingLessonCompletions",
      "gamingCosmetics",
    ],
    () => {
    if (chrome.runtime.lastError) achievementFeedback.textContent = "Non è stato possibile reimpostare i Traguardi. Riprova.";
    else { renderAchievements(null); achievementFeedback.textContent = "Traguardi ed EXP reimpostati."; }
    },
  );
});

for (const list of [barRewards, launcherRewards]) list.addEventListener("click", (event) => {
  const button = event.target.closest("[data-reward-kind][data-reward-style]");
  if (button) applyReward(button.dataset.rewardKind, button.dataset.rewardStyle);
});
markCommissionSeenButton.addEventListener("click", () => {
  chrome.storage.local.set({ commissionUnseenExamIds: [] });
});
confirmedExamsToggle.addEventListener("click", () => {
  const expanded = confirmedExamsToggle.getAttribute("aria-expanded") !== "true";
  confirmedExamsToggle.setAttribute("aria-expanded", String(expanded));
  confirmedExamsPanel.hidden = !expanded;
});

clearCommissionDataButton.addEventListener("click", () => {
  const confirmed = window.confirm(
    "Vuoi cancellare dal browser i dati degli esami e lo storico delle notifiche della commissione? I dati presenti su Pegaso non verranno modificati.",
  );
  if (!confirmed) return;

  clearCommissionDataButton.disabled = true;
  clearCommissionDataStatus.textContent = "Cancellazione in corso…";
  runtimeMessage({ type: "PEGASO_CLEAR_COMMISSION_MEMORY_ALL_TABS" }).then(() => {
    chrome.storage.local.remove(COMMISSION_STORAGE_KEYS, () => {
      if (chrome.runtime.lastError) {
        clearCommissionDataStatus.textContent = "Non è stato possibile cancellare i dati. Riprova.";
      } else {
        clearCommissionDataStatus.textContent = "Dati e cache temporanea degli esami cancellati.";
      }
      clearCommissionDataButton.disabled = false;
    });
  });
});

const panelAnimations = new WeakMap();
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function stopPanelAnimation(panel) {
  const animation = panelAnimations.get(panel);
  if (animation) animation.cancel();
  panelAnimations.delete(panel);
  panel.classList.remove("is-expanding", "is-collapsing");
}

function closeInfoPanel(panel) {
  if (!panel || panel.hidden) return Promise.resolve();

  stopPanelAnimation(panel);
  const startHeight = panel.getBoundingClientRect().height;
  panel.classList.add("is-collapsing");
  const animation = panel.animate(
    [
      { height: `${startHeight}px`, opacity: 1 },
      { height: "0px", opacity: 0 },
    ],
    { duration: reduceMotion.matches ? 0 : 200, easing: "ease", fill: "forwards" },
  );
  panelAnimations.set(panel, animation);

  return animation.finished.catch(() => {}).then(() => {
    if (panelAnimations.get(panel) !== animation) return;
    panel.hidden = true;
    panel.style.height = "";
    panel.style.opacity = "";
    stopPanelAnimation(panel);
  });
}

function openInfoPanel(panel) {
  if (!panel) return;

  stopPanelAnimation(panel);
  panel.hidden = false;
  panel.classList.add("is-expanding");
  const targetHeight = panel.scrollHeight;
  const animation = panel.animate(
    [
      { height: "0px", opacity: 0 },
      { height: `${targetHeight}px`, opacity: 1 },
    ],
    { duration: reduceMotion.matches ? 0 : 220, easing: "ease", fill: "forwards" },
  );
  panelAnimations.set(panel, animation);

  animation.finished.catch(() => {}).then(() => {
    if (panelAnimations.get(panel) !== animation) return;
    panel.style.height = "";
    panel.style.opacity = "";
    stopPanelAnimation(panel);
    panel.scrollIntoView({
      behavior: reduceMotion.matches ? "auto" : "smooth",
      block: "nearest",
    });
  });
}

const infoToggleButtons = document.querySelectorAll(".expand-button, .about-link");
infoToggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const panel = document.getElementById(button.getAttribute("aria-controls"));
    const willOpen = button.getAttribute("aria-expanded") !== "true";

    infoToggleButtons.forEach((otherButton) => {
      const otherPanel = document.getElementById(
        otherButton.getAttribute("aria-controls"),
      );
      otherButton.setAttribute("aria-expanded", "false");
      if (otherPanel && otherPanel !== panel) closeInfoPanel(otherPanel);
    });

    button.setAttribute("aria-expanded", String(willOpen));
    if (willOpen) openInfoPanel(panel);
    else closeInfoPanel(panel);
  });
});

turboTestsButton.addEventListener("click", () => {
  const stopping = activeOperation?.kind === "turbo";
  turboTestsButton.disabled = true;
  turboTestsStatus.textContent = stopping ? "Interruzione dopo l’operazione corrente…" : "Avvio dei test automatici…";
  withActiveCourseTab(async (tabId) => {
    if (!tabId) { turboTestsStatus.textContent = "Apri prima la pagina di un corso UniPegaso."; turboTestsButton.disabled = false; return; }
    let operationId = activeOperation?.id;
    if (!stopping) {
      const acquired = await runtimeMessage({ type: "PEGASO_ACQUIRE_OPERATION", kind: "turbo", sourceTabId: tabId });
      if (!acquired?.accepted) { renderOperation(acquired?.operation); return; }
      operationId = acquired.operation.id;
    }
    chrome.tabs.sendMessage(tabId, { type: "PEGASO_TURBO_TESTS_COMMAND", action: stopping ? "stop" : "start", operationId }, { frameId: 0 }, async (response) => {
      if (chrome.runtime.lastError || !response?.accepted) {
        if (!stopping) await runtimeMessage({ type: "PEGASO_RELEASE_OPERATION", operationId });
        turboTestsStatus.textContent = "Impossibile avviare l’operazione. Ricarica la pagina del corso e riprova.";
        turboTestsButton.disabled = false;
      } else if (!stopping) {
        playActionAnimation(turboTestsSprite);
      }
    });
  });
});

objectivesButton.addEventListener("click", () => {
  const stopping = activeOperation?.kind === "objectives";
  objectivesButton.disabled = true;
  objectivesStatus.textContent = stopping
    ? "Interruzione dopo l’operazione corrente…"
    : "Avvio del completamento degli Obiettivi…";
  withActiveCourseTab(async (tabId) => {
    if (!tabId) {
      objectivesStatus.textContent = "Apri prima la pagina di un corso UniPegaso.";
      objectivesButton.disabled = false;
      return;
    }
    let operationId = activeOperation?.id;
    if (!stopping) {
      const acquired = await runtimeMessage({
        type: "PEGASO_ACQUIRE_OPERATION",
        kind: "objectives",
        sourceTabId: tabId,
      });
      if (!acquired?.accepted) {
        renderOperation(acquired?.operation);
        return;
      }
      operationId = acquired.operation.id;
    }
    chrome.tabs.sendMessage(
      tabId,
      {
        type: "PEGASO_OBJECTIVES_COMMAND",
        action: stopping ? "stop" : "start",
        operationId,
      },
      { frameId: 0 },
      async (response) => {
        if (chrome.runtime.lastError || !response?.accepted) {
          if (!stopping) await runtimeMessage({ type: "PEGASO_RELEASE_OPERATION", operationId });
          objectivesStatus.textContent = "Impossibile avviare l’operazione. Ricarica la pagina del corso e riprova.";
          objectivesButton.disabled = false;
        } else if (!stopping) {
          playActionAnimation(objectivesSprite);
        }
      },
    );
  });
});

for (const sprite of [turboTestsSprite, objectivesSprite, testCollectionSprite, materialsSprite, autoplayControlSprite, floatingMenuControlSprite, commissionControlSprite, playbackRecoveryControlSprite]) {
  sprite.addEventListener("animationend", () => sprite.classList.remove("is-playing"));
}
reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) {
    for (const sprite of [turboTestsSprite, objectivesSprite, testCollectionSprite, materialsSprite, autoplayControlSprite, floatingMenuControlSprite, commissionControlSprite, playbackRecoveryControlSprite]) {
      sprite.classList.remove("is-playing");
    }
  }
});

function startMaterialsExport() {
  materialsStatus.textContent = "Avvio della raccolta delle dispense…";
  withActiveCourseTab(async (tabId) => {
    if (!tabId) { materialsStatus.textContent = "Apri prima la pagina di un corso UniPegaso."; return; }
    const response = await runtimeMessage({
      type: "PEGASO_START_EXPORT",
      format: "materials",
      sourceTabId: tabId,
      requestSource: "toolbar-popup",
    });
    if (!response?.accepted) {
      materialsStatus.textContent = response?.operation
        ? operationLabel(response.operation)
        : "Impossibile avviare l’operazione. Ricarica la pagina del corso e riprova.";
    } else {
      playActionAnimation(materialsSprite);
    }
  });
}
async function toggleMaterialsExport() {
  const collecting = activeOperation?.kind === "materials" && activeOperation?.phase === "collecting";
  if (!collecting) {
    startMaterialsExport();
    return;
  }
  materialsStatus.textContent = "Interruzione della raccolta delle dispense…";
  const response = await runtimeMessage({
    type: "PEGASO_CANCEL_EXPORT",
    operationId: activeOperation.id,
  });
  if (!response?.accepted) {
    if (response?.operation) renderOperation(response.operation);
    else materialsStatus.textContent = response?.reason || "Impossibile interrompere la raccolta.";
  }
}
exportCourseMaterialsButton.addEventListener("click", toggleMaterialsExport);

createTestCollectionButton.addEventListener("click", () => {
  const collecting = activeOperation?.kind === "tests" && activeOperation?.phase === "collecting";
  if (collecting) {
    testCollectionStatus.textContent = "Interruzione della raccolta dei test…";
    runtimeMessage({ type: "PEGASO_CANCEL_EXPORT", operationId: activeOperation.id });
    return;
  }
  testCollectionStatus.textContent = "Avvio della raccolta dei test…";
  withActiveCourseTab(async (tabId) => {
    if (!tabId) {
      testCollectionStatus.textContent = "Apri prima la pagina di un corso UniPegaso.";
      return;
    }
    const response = await runtimeMessage({
      type: "PEGASO_START_TEST_EXPORT",
      sourceTabId: tabId,
      requestSource: "toolbar-popup",
    });
    if (!response?.accepted) {
      testCollectionStatus.textContent = response?.operation
        ? operationLabel(response.operation)
        : response?.reason || "Impossibile avviare la raccolta.";
    } else {
      playActionAnimation(testCollectionSprite);
    }
  });
});

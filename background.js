if (!globalThis.StudyWingAchievements && typeof importScripts === "function") importScripts("achievements.js");
(() => {
  "use strict";
  const STUDYWING_DEBUG = false;
  const debugLog = (...values) => {
    if (STUDYWING_DEBUG) console.info(...values);
  };
  const OPERATION_KEY = "pegasoActiveOperation";
  const COMMISSION_LEASE_KEY = "commissionCheckLease";
  const COMMISSION_CAPTURE_KEY = "commissionExamsCapturedAt";
  const COURSE_THRESHOLD_NOTIFIED_KEY = "courseProgressThresholdNotified";
  const LESSON_COMPLETION_PENDING_KEY = "studywingPendingLessonCompletions";
  const COMMISSION_CHECK_INTERVAL_MS = 10 * 60 * 1000;
  const COMMISSION_LEASE_MS = 45 * 1000;
  const MAX_OPERATION_AGE_MS = 2 * 60 * 60 * 1000;
  let operationQueue = Promise.resolve();
  let builderQueue = Promise.resolve();
  let commissionQueue = Promise.resolve();
  let courseThresholdQueue = Promise.resolve();
  let achievementQueue = Promise.resolve();
  const storageGet = (key) => new Promise((resolve, reject) => chrome.storage.local.get(key, (result) => chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve(result[key] || null)));
  const storageSet = (values) => new Promise((resolve, reject) => chrome.storage.local.set(values, () => chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve()));
  const storageRemove = (key) => new Promise((resolve) => chrome.storage.local.remove(key, resolve));
  function serialized(task) { const next = operationQueue.then(task, task); operationQueue = next.catch(() => {}); return next; }
  function serializedBuilder(task) { const next = builderQueue.then(task, task); builderQueue = next.catch(() => {}); return next; }
  function serializedCommission(task) { const next = commissionQueue.then(task, task); commissionQueue = next.catch(() => {}); return next; }
  function serializedCourseThreshold(task) { const next = courseThresholdQueue.then(task, task); courseThresholdQueue = next.catch(() => {}); return next; }
  function serializedAchievement(task) { const next = achievementQueue.then(task, task); achievementQueue = next.catch(() => {}); return next; }
  function newlyUnlockedRewards(api, previousState, nextState) {
    const before = new Set(api.normalizeState(previousState).unlockedCosmeticIds);
    return api.normalizeState(nextState).unlockedCosmeticIds.filter((id) => !before.has(id));
  }

  async function claimAchievementUnlocked(achievementId) {
      const api = globalThis.StudyWingAchievements;
      const definition = api.CATALOGUE.find((item) => item.id === achievementId);
      if (!definition) return { accepted: false, reason: "unknown-achievement" };
      if (achievementId === "complete-lesson" && await storageGet("visualStyle") !== "gaming") {
        return { accepted: false, reason: "gaming-inactive" };
      }
      const stored = await storageGet(api.STATE_KEY);
      const previous = api.view(stored);
      if (previous.state.claimedAchievementIds.includes(achievementId)) return { accepted: false, reason: "already-claimed", state: previous.state };
      const totalExp = Math.min(api.MAX_EXP, previous.state.totalExp + definition.exp);
      const state = api.normalizeState({ ...previous.state, totalExp, claimedAchievementIds: [...previous.state.claimedAchievementIds, achievementId] });
      await storageSet({ [api.STATE_KEY]: state });
      const next = api.view(state);
      return { accepted: true, achievement: definition, awardedExp: totalExp - previous.state.totalExp, state, newUnlockIds: newlyUnlockedRewards(api, previous.state, state), previousLevel: previous.level, level: next.level, crossedHalf: previous.expWithinLevel < 50 && next.expWithinLevel >= 50, levelUp: next.level > previous.level, capped: next.capped };
  }

  function claimAchievement(achievementId) {
    return serializedAchievement(() => claimAchievementUnlocked(achievementId));
  }

  function normalizedLessonCompletionSnapshot(message) {
    const lessonKey = typeof message?.lessonKey === "string" && /^[A-Za-z0-9_-]{3,80}:lesson:\d{1,4}$/.test(message.lessonKey)
      ? message.lessonKey
      : null;
    const courseCode = lessonKey?.match(/^([A-Za-z0-9_-]{3,80}):lesson:/)?.[1] || null;
    const chapters = Array.isArray(message?.chapters)
      ? message.chapters.map((chapter) => ({
        key: typeof chapter?.key === "string" ? chapter.key : "",
        percentage: Math.max(0, Math.min(100, Number(chapter?.percentage))),
      }))
      : [];
    if (
      !lessonKey ||
      !courseCode ||
      chapters.length < 1 ||
      chapters.length > 100 ||
      chapters.some((chapter) =>
        !new RegExp(`^${courseCode}:(?:route:\\d+:\\d+|lp:\\d+|order:\\d+)$`).test(chapter.key) ||
        !Number.isFinite(chapter.percentage)
      ) ||
      new Set(chapters.map((chapter) => chapter.key)).size !== chapters.length
    ) {
      return null;
    }
    chapters.sort((first, second) => first.key.localeCompare(second.key));
    return {
      lessonKey,
      courseCode,
      chapters,
      signature: chapters.map((chapter) => chapter.key).join("\u001f"),
      allComplete: chapters.every((chapter) => chapter.percentage >= 100),
    };
  }

  function claimLessonCompletion(message) {
    return serializedAchievement(async () => {
      const snapshot = normalizedLessonCompletionSnapshot(message);
      if (!snapshot) return { accepted: false, reason: "invalid-lesson-snapshot" };
      const gamingActive = await storageGet("visualStyle") === "gaming";
      if (!gamingActive) return { accepted: false, reason: "gaming-inactive" };
      const achievementState = globalThis.StudyWingAchievements.normalizeState(
        await storageGet(globalThis.StudyWingAchievements.STATE_KEY),
      );
      if (achievementState.claimedAchievementIds.includes("complete-lesson")) {
        return { accepted: false, reason: "already-claimed", state: achievementState };
      }

      const pending = await storageGet(LESSON_COMPLETION_PENDING_KEY) || {};
      const previous = pending[snapshot.lessonKey];
      const isCandidate = message?.candidate === true;
      if (!isCandidate && (!previous || previous.signature !== snapshot.signature)) {
        return { accepted: false, reason: "lesson-not-pending" };
      }

      if (!snapshot.allComplete) {
        if (!isCandidate) return { accepted: false, reason: "lesson-still-incomplete" };
        pending[snapshot.lessonKey] = {
          courseCode: snapshot.courseCode,
          signature: snapshot.signature,
          chapterKeys: snapshot.chapters.map((chapter) => chapter.key),
          updatedAt: Date.now(),
        };
        const keys = Object.keys(pending);
        if (keys.length > 200) {
          keys.sort((first, second) => Number(pending[second]?.updatedAt || 0) - Number(pending[first]?.updatedAt || 0));
          for (const key of keys.slice(150)) delete pending[key];
        }
        await storageSet({ [LESSON_COMPLETION_PENDING_KEY]: pending });
        return { accepted: false, reason: "lesson-pending-platform-confirmation" };
      }

      if (previous) {
        delete pending[snapshot.lessonKey];
        await storageSet({ [LESSON_COMPLETION_PENDING_KEY]: pending });
      }
      return claimAchievementUnlocked("complete-lesson");
    });
  }

  async function pendingLessonCompletions(courseCode) {
    const normalizedCourseCode = typeof courseCode === "string" && /^[A-Za-z0-9_-]{3,80}$/.test(courseCode)
      ? courseCode
      : null;
    if (!normalizedCourseCode) return { accepted: false, reason: "invalid-course", candidates: [] };
    const pending = await storageGet(LESSON_COMPLETION_PENDING_KEY) || {};
    const achievementState = globalThis.StudyWingAchievements.normalizeState(
      await storageGet(globalThis.StudyWingAchievements.STATE_KEY),
    );
    if (achievementState.claimedAchievementIds.includes("complete-lesson")) {
      if (Object.keys(pending).length) await storageRemove(LESSON_COMPLETION_PENDING_KEY);
      return { accepted: true, candidates: [] };
    }
    const candidates = Object.entries(pending)
      .filter(([, entry]) => entry?.courseCode === normalizedCourseCode && Array.isArray(entry.chapterKeys))
      .slice(0, 50)
      .map(([lessonKey, entry]) => ({ lessonKey, chapterKeys: entry.chapterKeys.slice(0, 100) }));
    return { accepted: true, candidates };
  }

  function claimChapterVideoCompletion(message) {
    return serializedAchievement(async () => {
      const api = globalThis.StudyWingAchievements;
      const chapterKey = typeof message.chapterKey === "string" && /^[A-Za-z0-9_-]{3,80}:(?:route:\d+:\d+|lp:\d+|order:\d+)$/.test(message.chapterKey)
        ? message.chapterKey
        : null;
      const videos = Array.isArray(message.videos)
        ? message.videos.map((video) => ({
          id: Number(video?.id),
          percentage: Math.max(0, Math.min(100, Number(video?.percentage))),
        }))
        : [];
      const videoIds = videos.map((video) => video.id);
      if (
        !chapterKey ||
        videos.length < 1 ||
        videos.length > 100 ||
        videos.some((video) => !Number.isInteger(video.id) || video.id <= 0 || !Number.isFinite(video.percentage)) ||
        new Set(videoIds).size !== videoIds.length
      ) {
        return { accepted: false, reason: "invalid-chapter-video-snapshot" };
      }
      videos.sort((first, second) => first.id - second.id);
      const signature = videos.map((video) => video.id).join(",");
      const allComplete = videos.every((video) => video.percentage >= 100);
      const stored = await storageGet(api.STATE_KEY);
      const previousView = api.view(stored);
      const state = previousView.state;
      const progress = { ...(state.videoChapterProgress || {}) };
      const previous = progress[chapterKey];
      const now = Date.now();
      const storeObservedState = async (entry, reason) => {
        progress[chapterKey] = entry;
        const keys = Object.keys(progress);
        if (keys.length > 1200) {
          keys.sort((first, second) => Number(progress[second]?.updatedAt || 0) - Number(progress[first]?.updatedAt || 0));
          for (const key of keys.slice(900)) delete progress[key];
        }
        const observedState = api.normalizeState({ ...state, videoChapterProgress: progress });
        await storageSet({ [api.STATE_KEY]: observedState });
        return { accepted: false, reason, state: observedState };
      };

      if (previous?.resolved === true) {
        return storeObservedState({ ...previous, updatedAt: now }, "chapter-already-resolved");
      }

      if (!previous || previous.signature !== signature) {
        return storeObservedState({
          signature,
          videoCount: videos.length,
          eligible: !allComplete,
          resolved: allComplete,
          updatedAt: now,
        }, previous ? "video-set-rebased" : "baseline-established");
      }

      if (!allComplete) {
        return storeObservedState({ ...previous, updatedAt: now }, "chapter-incomplete");
      }

      const completedEntry = { ...previous, resolved: true, updatedAt: now };
      progress[chapterKey] = completedEntry;
      const keys = Object.keys(progress);
      if (keys.length > 1200) {
        keys.sort((first, second) => Number(progress[second]?.updatedAt || 0) - Number(progress[first]?.updatedAt || 0));
        for (const key of keys.slice(900)) delete progress[key];
      }
      const gamingActive = await storageGet("visualStyle") === "gaming";
      if (previous.eligible !== true || !gamingActive || state.totalExp >= api.MAX_EXP) {
        const observedState = api.normalizeState({ ...state, videoChapterProgress: progress });
        await storageSet({ [api.STATE_KEY]: observedState });
        return { accepted: false, reason: previous.eligible !== true ? "chapter-ineligible" : !gamingActive ? "gaming-inactive" : "exp-capped", state: observedState };
      }
      const videoCount = Math.max(1, Math.floor(Number(previous.videoCount) || videos.length));
      const totalExp = Math.min(api.MAX_EXP, state.totalExp + videoCount);
      const nextState = api.normalizeState({ ...state, totalExp, videoChapterProgress: progress });
      await storageSet({ [api.STATE_KEY]: nextState });
      const nextView = api.view(nextState);
      return { accepted: true, achievement: { id: "chapter-video-completion", title: "Video del capitolo completati" }, videoCount, awardedExp: totalExp - state.totalExp, state: nextState, newUnlockIds: newlyUnlockedRewards(api, state, nextState), previousLevel: previousView.level, level: nextView.level, crossedHalf: previousView.level === nextView.level && previousView.expWithinLevel < 50 && nextView.expWithinLevel >= 50, levelUp: nextView.level > previousView.level, capped: nextView.capped };
    });
  }

  function claimCourseProgressThreshold(courseCode) {
    return serializedCourseThreshold(async () => {
      const normalizedCourseCode = typeof courseCode === "string" && /^[A-Za-z0-9_-]{3,80}$/.test(courseCode)
        ? courseCode
        : null;
      if (!normalizedCourseCode) return { accepted: false, reason: "invalid-course" };
      const notified = await storageGet(COURSE_THRESHOLD_NOTIFIED_KEY) || {};
      if (notified[normalizedCourseCode] === true) {
        return { accepted: false, reason: "already-notified" };
      }
      await storageSet({
        [COURSE_THRESHOLD_NOTIFIED_KEY]: {
          ...notified,
          [normalizedCourseCode]: true,
        },
      });
      return { accepted: true };
    });
  }

  async function currentCommissionLease() {
    const lease = await storageGet(COMMISSION_LEASE_KEY);
    if (!lease || typeof lease !== "object") return null;
    if (
      !Number.isFinite(Number(lease.expiresAt)) ||
      Number(lease.expiresAt) <= Date.now() ||
      Number(lease.expiresAt) - Date.now() > COMMISSION_LEASE_MS * 2
    ) {
      await storageRemove(COMMISSION_LEASE_KEY);
      return null;
    }
    return lease;
  }

  function claimCommissionCheck(sourceTabId) {
    return serializedCommission(async () => {
      const now = Date.now();
      const capturedAt = Number(await storageGet(COMMISSION_CAPTURE_KEY));
      const captureAge = now - capturedAt;
      if (Number.isFinite(capturedAt) && capturedAt > 0 && captureAge >= 0 && captureAge < COMMISSION_CHECK_INTERVAL_MS) {
        return {
          accepted: false,
          reason: "fresh",
          nextCheckAt: capturedAt + COMMISSION_CHECK_INTERVAL_MS,
        };
      }

      const existing = await currentCommissionLease();
      if (existing) {
        return {
          accepted: false,
          reason: "busy",
          nextCheckAt: Number(existing.expiresAt),
        };
      }

      const lease = {
        id: crypto.randomUUID(),
        sourceTabId,
        startedAt: now,
        expiresAt: now + COMMISSION_LEASE_MS,
      };
      await storageSet({ [COMMISSION_LEASE_KEY]: lease });
      return { accepted: true, leaseId: lease.id, expiresAt: lease.expiresAt };
    });
  }

  function releaseCommissionCheck(leaseId) {
    return serializedCommission(async () => {
      const lease = await currentCommissionLease();
      if (!lease || lease.id !== leaseId) return { accepted: false };
      await storageRemove(COMMISSION_LEASE_KEY);
      return { accepted: true };
    });
  }

  function releaseCommissionCheckForTab(tabId) {
    return serializedCommission(async () => {
      const lease = await currentCommissionLease();
      if (!lease || lease.sourceTabId !== tabId) return { accepted: false };
      await storageRemove(COMMISSION_LEASE_KEY);
      return { accepted: true };
    });
  }
  async function currentOperation() {
    const operation = await storageGet(OPERATION_KEY);
    if (operation && Date.now() - operation.startedAt > MAX_OPERATION_AGE_MS) { await storageRemove(OPERATION_KEY); return null; }
    return operation;
  }
  function operationOwnerTabId(operation) {
    if (!operation) return null;
    if (operation.phase === "building" && Number.isInteger(operation.builderTabId)) {
      return operation.builderTabId;
    }
    return Number.isInteger(operation.sourceTabId) ? operation.sourceTabId : null;
  }
  function tabExists(tabId) {
    if (!Number.isInteger(tabId)) return Promise.resolve(false);
    return new Promise((resolve) => chrome.tabs.get(tabId, () => {
      const exists = !chrome.runtime.lastError;
      resolve(exists);
    }));
  }
  async function removeOperation(operation) {
    await storageRemove(OPERATION_KEY);
    if (operation?.jobKey) await storageRemove(operation.jobKey);
  }
  function releaseForTab(tabId) {
    return serialized(async () => {
      const operation = await currentOperation();
      if (!operation || operationOwnerTabId(operation) !== tabId) {
        return { accepted: true, released: false };
      }
      await removeOperation(operation);
      return { accepted: true, released: true, kind: operation.kind };
    });
  }
  function reconcileOperationOwner() {
    return serialized(async () => {
      const operation = await currentOperation();
      if (!operation) return { accepted: true, released: false, operation: null };
      const ownerTabId = operationOwnerTabId(operation);
      if (await tabExists(ownerTabId)) {
        return { accepted: true, released: false, operation };
      }
      await removeOperation(operation);
      debugLog("[PlumePilot] Operazione orfana rimossa perché la scheda proprietaria non esiste più.", {
        kind: operation.kind,
        phase: operation.phase,
      });
      return { accepted: true, released: true, operation: null, kind: operation.kind };
    });
  }
  async function acquire(kind, sourceTabId) {
    return serialized(async () => {
      let existing = await currentOperation();
      if (existing && !(await tabExists(operationOwnerTabId(existing)))) {
        await removeOperation(existing);
        existing = null;
      }
      if (existing) return { accepted: false, operation: existing };
      const batch = kind === "turbo" || kind === "objectives";
      const message = kind === "turbo"
        ? "Avvio dei test automatici…"
        : kind === "objectives"
          ? "Avvio del completamento degli Obiettivi…"
          : kind === "tests"
            ? "Avvio della raccolta dei test di autovalutazione…"
            : kind === "materials"
              ? "Avvio della raccolta delle dispense del corso…"
            : `Avvio della raccolta delle dispense per il ${kind.toUpperCase()}…`;
      const operation = { id: crypto.randomUUID(), kind, phase: batch ? "running" : "collecting", message, startedAt: Date.now(), sourceTabId };
      await storageSet({ [OPERATION_KEY]: operation });
      return { accepted: true, operation };
    });
  }
  async function update(operationId, patch) {
    return serialized(async () => {
      const operation = await currentOperation();
      if (!operation || operation.id !== operationId) return { accepted: false };
      const updated = { ...operation, ...patch, id: operation.id };
      await storageSet({ [OPERATION_KEY]: updated });
      return { accepted: true, operation: updated };
    });
  }
  async function release(operationId) {
    return serialized(async () => {
      const operation = await currentOperation();
      if (!operation || (operationId && operation.id !== operationId)) return { accepted: false };
      await storageRemove(OPERATION_KEY);
      if (operation.jobKey) await storageRemove(operation.jobKey);
      return { accepted: true };
    });
  }
  async function sourcePageReady(tabId, pageLoadedAt) {
    return serialized(async () => {
      const operation = await currentOperation();
      if (!operation || operation.sourceTabId !== tabId) return { accepted: true, released: false };
      if (!Number.isFinite(pageLoadedAt) || pageLoadedAt <= operation.startedAt) return { accepted: true, released: false };
      const interruptedOnReload = operation.phase === "collecting" || ["turbo", "objectives"].includes(operation.kind);
      if (!interruptedOnReload) return { accepted: true, released: false };
      await storageRemove(OPERATION_KEY);
      if (operation.jobKey) await storageRemove(operation.jobKey);
      debugLog("[PlumePilot] Operazione interrotta rimossa dopo il ricaricamento della pagina.", {
        kind: operation.kind,
        phase: operation.phase,
      });
      return { accepted: true, released: true, kind: operation.kind };
    });
  }
  function sendTabMessage(tabId, message) {
    return new Promise((resolve, reject) => chrome.tabs.sendMessage(tabId, message, { frameId: 0 }, (response) => chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve(response)));
  }
  function queryTabs() {
    return new Promise((resolve, reject) => chrome.tabs.query({}, (tabs) =>
      chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve(tabs || [])));
  }
  async function clearCommissionMemoryInTabs() {
    const tabs = await queryTabs();
    const results = await Promise.allSettled(
      tabs
        .filter((tab) => Number.isInteger(tab?.id))
        .map((tab) => sendTabMessage(tab.id, { type: "PEGASO_CLEAR_COMMISSION_MEMORY" })),
    );
    await serializedCommission(async () => storageRemove(COMMISSION_LEASE_KEY));
    return {
      accepted: true,
      clearedTabs: results.filter((result) => result.status === "fulfilled" && result.value?.accepted).length,
    };
  }
  async function startExport(message) {
    const format = ["materials", "epub"].includes(message.format) ? message.format : "pdf";
    if (!Number.isInteger(message.sourceTabId)) return { accepted: false, reason: "Scheda del corso non disponibile." };
    const result = await acquire(format, message.sourceTabId);
    if (!result.accepted) return result;
    debugLog("[PlumePilot] Export request accepted.", {
      operationId: result.operation.id,
      format,
      requestSource: typeof message.requestSource === "string" ? message.requestSource : "unknown",
      sourceTabId: message.sourceTabId,
    });
    try {
      const response = await sendTabMessage(message.sourceTabId, { type: "PEGASO_COLLECT_COURSE_MATERIALS", format, operationId: result.operation.id });
      if (!response?.accepted) throw new Error(response?.reason || "The course collector did not accept the request.");
      return result;
    } catch (error) {
      await release(result.operation.id);
      return { accepted: false, reason: error.message };
    }
  }
  async function startTestExport(message) {
    if (!Number.isInteger(message.sourceTabId)) return { accepted: false, reason: "Scheda del corso non disponibile." };
    const result = await acquire("tests", message.sourceTabId);
    if (!result.accepted) return result;
    try {
      const response = await sendTabMessage(message.sourceTabId, {
        type: "PEGASO_COLLECT_COURSE_TESTS",
        operationId: result.operation.id,
      });
      if (!response?.accepted) throw new Error(response?.reason || "La pagina non ha accettato la raccolta dei test.");
      return result;
    } catch (error) {
      await release(result.operation.id);
      return { accepted: false, reason: error.message };
    }
  }
  async function cancelExport(message) {
    const operation = await currentOperation();
    if (!operation || operation.id !== message.operationId) return { accepted: false, reason: "Operazione non trovata." };
    if (!(["materials", "pdf", "epub", "tests"].includes(operation.kind)) || !["collecting", "stopping"].includes(operation.phase)) {
      return { accepted: false, reason: "La raccolta non può più essere interrotta da questo pulsante.", operation };
    }
    if (operation.phase === "stopping") return { accepted: true, operation };
    const updated = await update(operation.id, {
      phase: "stopping",
      message: operation.kind === "tests"
        ? "Interruzione della raccolta dei test…"
        : operation.kind === "materials"
          ? "Interruzione della raccolta delle dispense…"
          : `Interruzione della raccolta ${operation.kind.toUpperCase()}…`,
    });
    try {
      const response = await sendTabMessage(operation.sourceTabId, {
        type: "PEGASO_CANCEL_EXPORT_COLLECTION",
        operationId: operation.id,
      });
      if (!response?.accepted) throw new Error(response?.reason || "La pagina del corso non ha accettato l’annullamento.");
      return { accepted: true, operation: updated.operation };
    } catch (error) {
      await release(operation.id);
      return { accepted: false, reason: error.message };
    }
  }
  async function invalidateMaterialCache(message) {
    const operation = await currentOperation();
    if (!operation || operation.id !== message.operationId) {
      return { accepted: false, reason: "Operazione non trovata." };
    }
    const cacheKeys = Array.isArray(message.cacheKeys)
      ? [...new Set(message.cacheKeys.filter((key) => typeof key === "string"))]
      : [];
    if (!cacheKeys.length) return { accepted: true, invalidated: 0 };
    const targetTabId = Number.isInteger(message.sourceTabId)
      ? message.sourceTabId
      : operation.sourceTabId;
    const response = await sendTabMessage(targetTabId, {
      type: "PEGASO_INVALIDATE_MATERIAL_CACHE",
      cacheKeys,
    });
    return {
      accepted: response?.accepted === true,
      invalidated: cacheKeys.length,
    };
  }
  async function openBuilderOnce(message) {
    const operation = await currentOperation();
    if (!operation || operation.id !== message.operationId || !message.payload) return { accepted: false };
    const format = message.format === "tests"
      ? "tests"
      : message.format === "materials"
        ? "materials"
        : message.format === "epub"
          ? "epub"
          : "pdf";
    if (operation.kind !== format) return { accepted: false };
    if (operation.phase === "stopping") return { accepted: false };

    if (operation.phase === "building" || operation.jobKey || Number.isInteger(operation.builderTabId)) {
      debugLog("[PlumePilot] Duplicate export builder request ignored.", {
        operationId: operation.id,
        format,
        builderTabId: operation.builderTabId || null,
      });
      return { accepted: true, duplicate: true, operation };
    }

    const jobId = crypto.randomUUID();
    const storageKey = `pegasoExportJob:${jobId}`;
    await storageSet({
      [storageKey]: {
        ...message.payload,
        format,
        operationId: operation.id,
        courseTabId: operation.sourceTabId,
      },
    });
    const builderMessage = format === "tests"
      ? "Apertura della raccolta dei test…"
      : format === "materials"
        ? "Apertura dello strumento di esportazione delle dispense…"
        : `Apertura dello strumento di creazione ${format.toUpperCase()}…`;
    const reserved = await update(operation.id, { phase: "building", jobKey: storageKey, message: builderMessage });
    if (!reserved.accepted) {
      await storageRemove(storageKey);
      return { accepted: false };
    }
    const builderPage = format === "tests"
      ? "test-builder.html"
      : format === "materials"
        ? "materials-builder.html"
        : `${format}-builder.html`;
    const tab = await new Promise((resolve, reject) => chrome.tabs.create({ url: chrome.runtime.getURL(`${builderPage}?job=${jobId}`) }, (createdTab) => chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve(createdTab)));
    const finalized = await update(operation.id, {
      phase: "building",
      builderTabId: tab?.id,
      message: format === "tests"
        ? "Preparazione dei formati PDF e HTML…"
        : format === "materials"
          ? "Dispense pronte: scegli PDF oppure EPUB."
          : `Creazione del ${format.toUpperCase()} del corso…`,
    });
    if (!finalized.accepted) {
      await storageRemove(storageKey);
      return { accepted: false };
    }
    debugLog("[PlumePilot] Export builder opened.", {
      operationId: operation.id,
      format,
      builderTabId: tab?.id || null,
    });
    return { accepted: true, duplicate: false, operation: finalized.operation };
  }
  function openBuilder(message) { return serializedBuilder(() => openBuilderOnce(message)); }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    let action = null;
    const sourceTabId = Number.isInteger(message?.sourceTabId) ? message.sourceTabId : sender.tab?.id;
    if (message?.type === "PEGASO_GET_OPERATION") action = reconcileOperationOwner();
    else if (message?.type === "PEGASO_SOURCE_PAGE_READY") action = Number.isInteger(sourceTabId) ? sourcePageReady(sourceTabId, Number(message.pageLoadedAt)) : Promise.resolve({ accepted: false });
    else if (message?.type === "PEGASO_ACQUIRE_OPERATION") action = Number.isInteger(sourceTabId) ? acquire(message.kind, sourceTabId) : Promise.resolve({ accepted: false, reason: "Scheda del corso non disponibile." });
    else if (message?.type === "PEGASO_START_EXPORT") action = startExport({ ...message, sourceTabId });
    else if (message?.type === "PEGASO_START_TEST_EXPORT") action = startTestExport({ ...message, sourceTabId });
    else if (message?.type === "PEGASO_CANCEL_EXPORT") action = cancelExport(message);
    else if (message?.type === "PEGASO_INVALIDATE_MATERIAL_CACHE") action = invalidateMaterialCache(message);
    else if (message?.type === "PEGASO_UPDATE_OPERATION") action = update(message.operationId, message.patch || {});
    else if (message?.type === "PEGASO_RELEASE_OPERATION") action = release(message.operationId);
    else if (message?.type === "PEGASO_OPEN_EXPORT_BUILDER") action = openBuilder(message).catch(async (error) => { await release(message.operationId); return { accepted: false, reason: error.message }; });
    else if (message?.type === "PEGASO_COMMISSION_CHECK_CLAIM") action = Number.isInteger(sourceTabId) ? claimCommissionCheck(sourceTabId) : Promise.resolve({ accepted: false, reason: "missing-tab" });
    else if (message?.type === "PEGASO_COMMISSION_CHECK_RELEASE") action = releaseCommissionCheck(message.leaseId);
    else if (message?.type === "PEGASO_CLEAR_COMMISSION_MEMORY_ALL_TABS") action = clearCommissionMemoryInTabs();
    else if (message?.type === "PEGASO_COURSE_THRESHOLD_CLAIM") action = claimCourseProgressThreshold(message.courseCode);
    else if (message?.type === "STUDYWING_ACHIEVEMENT_CLAIM") action = claimAchievement(message.achievementId);
    else if (message?.type === "STUDYWING_CHAPTER_VIDEOS_CLAIM") action = claimChapterVideoCompletion(message);
    else if (message?.type === "STUDYWING_LESSON_COMPLETION_CLAIM") action = claimLessonCompletion(message);
    else if (message?.type === "STUDYWING_PENDING_LESSONS_GET") action = pendingLessonCompletions(message.courseCode);
    if (!action) return undefined;
    action.then(sendResponse).catch((error) => { console.error("[PlumePilot] Background operation failed:", error); sendResponse({ accepted: false, reason: error.message }); });
    return true;
  });
  chrome.tabs.onRemoved.addListener((tabId) => {
    releaseForTab(tabId).catch((error) => console.error("[PlumePilot] Impossibile rilasciare l’operazione della scheda chiusa:", error));
    releaseCommissionCheckForTab(tabId).catch(() => {});
  });
  chrome.tabs.onActivated.addListener(() => {
    reconcileOperationOwner().catch((error) => console.error("[PlumePilot] Impossibile verificare l’operazione attiva:", error));
  });
  reconcileOperationOwner().catch((error) => console.error(error));
})();

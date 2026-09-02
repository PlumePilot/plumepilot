(() => {
  "use strict";
  const STUDYWING_DEBUG = false;
  const debugLog = (...values) => {
    if (STUDYWING_DEBUG) console.info(...values);
  };
  const BRIDGE_INSTANCE_KEY = Symbol.for("studywing.bridge.instance");

  if (globalThis[BRIDGE_INSTANCE_KEY]) {
    debugLog("[PlumePilot] Duplicate bridge instance ignored.");
    return;
  }

  Object.defineProperty(globalThis, BRIDGE_INSTANCE_KEY, {
    value: { loadedAt: Date.now() },
    configurable: false,
  });

  const MAX_TRACKED_EXPORT_OPERATIONS = 20;
  let turboTestsStatus = { running: false, stopping: false, message: "" };
  let turboOperationId = null;
  let objectivesStatus = { running: false, stopping: false, message: "" };
  let objectivesOperationId = null;
  let commissionCheckEnabled = false;
  let chapterLimitStatus = null;
  let courseProgressStatus = null;
  let commissionProcessing = false;
  let queuedCommissionPayload = null;
  let commissionCheckTimer = null;
  let currentCommissionLeaseId = null;

  const COMMISSION_RESPONSE = "STUDYWING_COMMISSION_EXAMS_RESPONSE";
  const COMMISSION_REQUEST = "STUDYWING_COMMISSION_EXAMS_REQUEST";
  const COMMISSION_CANCEL = "STUDYWING_COMMISSION_EXAMS_CANCEL";
  const COMMISSION_CLEAR_MEMORY = "STUDYWING_COMMISSION_EXAMS_CLEAR_MEMORY";
  const COMMISSION_CHECK_INTERVAL_MS = 10 * 60 * 1000;
  const COMMISSION_RETRY_MS = 60 * 1000;
  const commissionStates = globalThis.StudyWingCommissionState;
  const pageLoadedAt = Date.now();
  const extensionVersion = chrome.runtime.getManifest().version;
  const requestedExportOperationIds = new Set();
  const terminalExportOperationIds = new Set();

  function exportOperationId(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function rememberExportOperation(target, operationId) {
    target.add(operationId);

    if (target.size > MAX_TRACKED_EXPORT_OPERATIONS) {
      target.delete(target.values().next().value);
    }
  }

  function pageIsVisible() {
    return document.visibilityState !== "hidden";
  }

  function scheduleCommissionCheck(delayMs = 0) {
    clearTimeout(commissionCheckTimer);
    commissionCheckTimer = null;
    if (!commissionCheckEnabled || !pageIsVisible()) return;
    commissionCheckTimer = setTimeout(runCommissionCheck, Math.max(0, Number(delayMs) || 0));
  }

  function scheduleCommissionCheckFromCapture(capturedAt) {
    const captured = Number(capturedAt);
    const remaining = Number.isFinite(captured) && captured > 0
      ? captured + COMMISSION_CHECK_INTERVAL_MS - Date.now()
      : 0;
    scheduleCommissionCheck(Math.max(0, remaining) + 250);
  }

  function releaseCommissionLease(success = false, capturedAt = null) {
    const leaseId = currentCommissionLeaseId;
    currentCommissionLeaseId = null;
    if (leaseId) {
      chrome.runtime.sendMessage({
        type: "PEGASO_COMMISSION_CHECK_RELEASE",
        leaseId,
      }, () => void chrome.runtime.lastError);
    }
    if (!commissionCheckEnabled) return;
    if (success) scheduleCommissionCheckFromCapture(capturedAt || Date.now());
    else scheduleCommissionCheck(COMMISSION_RETRY_MS);
  }

  function cancelCommissionCheck() {
    clearTimeout(commissionCheckTimer);
    commissionCheckTimer = null;
    window.postMessage({ type: COMMISSION_CANCEL }, "*");
    releaseCommissionLease(false);
    clearTimeout(commissionCheckTimer);
    commissionCheckTimer = null;
  }

  function requestLatestCommissionResponse(leaseId, expiresAt) {
    window.postMessage({ type: COMMISSION_REQUEST, requestId: leaseId, expiresAt }, "*");
  }

  function runCommissionCheck() {
    commissionCheckTimer = null;
    if (!commissionCheckEnabled || !pageIsVisible()) return;
    chrome.runtime.sendMessage({ type: "PEGASO_COMMISSION_CHECK_CLAIM" }, (response) => {
      if (chrome.runtime.lastError || !commissionCheckEnabled) {
        scheduleCommissionCheck(COMMISSION_RETRY_MS);
        return;
      }
      if (response?.accepted && typeof response.leaseId === "string") {
        currentCommissionLeaseId = response.leaseId;
        requestLatestCommissionResponse(response.leaseId, Number(response.expiresAt));
        const leaseDelay = Math.max(1000, Number(response.expiresAt) - Date.now() + 500);
        scheduleCommissionCheck(leaseDelay);
        return;
      }
      const nextCheckAt = Number(response?.nextCheckAt);
      const retryDelay = Number.isFinite(nextCheckAt)
        ? Math.max(1000, nextCheckAt - Date.now() + 250)
        : COMMISSION_RETRY_MS;
      scheduleCommissionCheck(retryDelay);
    });
  }

  function safeText(value, maxLength = 800) {
    return typeof value === "string" ? value.slice(0, maxLength) : null;
  }

  function safeNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    return Number.isFinite(Number(value)) ? Number(value) : null;
  }

  function safeRejectMotivation(value) {
    const motivation = value && typeof value === "object"
      ? value.motivation
      : value;
    return safeText(motivation);
  }

  function normalizeCommissionExam(exam) {
    if (!exam || typeof exam !== "object") return null;
    const examId = safeNumber(exam.exam_id);
    if (examId === null) return null;
    return {
      exam_id: examId,
      course_code: safeText(exam.course_code, 80),
      title_exam: safeText(exam.title_exam, 300),
      title_module: safeText(exam.title_module, 300),
      date_exam: safeText(exam.date_exam, 80),
      vote: safeNumber(exam.vote),
      status: safeNumber(exam.status),
      commission: safeText(exam.commission, 300),
      reject_motivation: safeRejectMotivation(exam.reject_motivation),
      result: safeText(exam.result, 120),
    };
  }

  function processCommissionPayload(payload) {
    if (!commissionCheckEnabled || !Array.isArray(payload?.exams)) return;
    if (commissionProcessing) {
      queuedCommissionPayload = payload;
      return;
    }

    commissionProcessing = true;
    const exams = payload.exams.slice(0, 200).map(normalizeCommissionExam).filter(Boolean);
    chrome.storage.local.get({
      commissionExamTrackingInitialized: false,
      commissionExamSnapshots: {},
      commissionUnseenExamIds: [],
      commissionExams: [],
    }, (stored) => {
      const previous = stored.commissionExamSnapshots && typeof stored.commissionExamSnapshots === "object"
        ? stored.commissionExamSnapshots
        : {};
      const initialized = stored.commissionExamTrackingInitialized === true;
      const nextSnapshots = {};
      const newlyChangedIds = [];
      const previousExams = new Map(
        (Array.isArray(stored.commissionExams) ? stored.commissionExams : [])
          .map((exam) => [String(exam?.exam_id), exam]),
      );

      for (const exam of exams) {
        const id = String(exam.exam_id);
        const snapshot = commissionStates.createSnapshot(exam);
        nextSnapshots[id] = snapshot;
        if (!initialized) continue;

        const previousSnapshot = commissionStates.normalizeStoredSnapshot(
          previous[id],
          previousExams.get(id),
        );
        if (commissionStates.shouldNotifyChange(previousSnapshot, snapshot)) {
          newlyChangedIds.push(exam.exam_id);
        }
      }

      const stillPresent = new Set(exams.map((exam) => exam.exam_id));
      const storedUnseen = Array.isArray(stored.commissionUnseenExamIds) ? stored.commissionUnseenExamIds : [];
      const unseen = [...new Set([
        ...storedUnseen.filter((id) => stillPresent.has(Number(id))).map(Number),
        ...newlyChangedIds,
      ])];

      chrome.storage.local.set({
        commissionExams: exams,
        commissionExamsCapturedAt: Number(payload.capturedAt) || Date.now(),
        commissionExamSnapshots: nextSnapshots,
        commissionExamTrackingInitialized: true,
        commissionUnseenExamIds: unseen,
      }, () => {
        const storageFailed = Boolean(chrome.runtime.lastError);
        if (storageFailed) {
          console.warn("[PlumePilot Commissione] Salvataggio non riuscito:", chrome.runtime.lastError.message);
        } else {
          debugLog("[PlumePilot Commissione] Esami aggiornati.", {
            exams: exams.length,
            newVerdicts: newlyChangedIds.length,
            baselineCreated: !initialized,
          });
        }
        releaseCommissionLease(!storageFailed, Number(payload.capturedAt) || Date.now());
        commissionProcessing = false;
        if (queuedCommissionPayload) {
          const queued = queuedCommissionPayload;
          queuedCommissionPayload = null;
          processCommissionPayload(queued);
        }
      });
    });
  }
  function sendState(
    enabled,
    stopAtTests,
    autoCompleteTests,
    playbackErrorRecovery,
    autoplayChapterLimitEnabled,
    autoplayChapterLimits,
    autoplayChapterLimitSessions,
    courseProgressOverlayEnabled,
    visualStyle,
    initialSync = false,
  ) {
    window.postMessage({
      type: "PEGASO_AUTONEXT_STATE",
      enabled,
      stopAtTests,
      autoCompleteTests,
      playbackErrorRecovery,
      autoplayChapterLimitEnabled,
      autoplayChapterLimits,
      autoplayChapterLimitSessions,
      courseProgressOverlayEnabled,
      visualStyle,
      initialSync,
      extensionVersion,
    }, "*");
  }
  function readAndSendState(initialSync = false) {
    chrome.storage.local.get(
      {
        enabled: true,
        stopAtTests: false,
        autoCompleteTests: false,
        playbackErrorRecovery: "automatic",
        commissionCheckEnabled: false,
        autoplayChapterLimitEnabled: false,
        autoplayChapterLimits: {},
        autoplayChapterLimitSessions: {},
        courseProgressOverlayEnabled: false,
        visualStyle: "standard",
      },
      (result) => {
        const autoEnabled = result.autoCompleteTests === true;
        const playbackErrorRecovery =
          result.playbackErrorRecovery === "manual" ? "manual" : "automatic";
        // Keep the user's stop-at-tests preference in storage, but make it
        // inactive at runtime while automatic test completion is enabled.
        const stopEnabled = result.stopAtTests !== false && !autoEnabled;
        sendState(
          result.enabled,
          stopEnabled,
          autoEnabled,
          playbackErrorRecovery,
          result.autoplayChapterLimitEnabled === true,
          result.autoplayChapterLimits || {},
          result.autoplayChapterLimitSessions || {},
          result.courseProgressOverlayEnabled === true,
          result.visualStyle === "gaming" ? "gaming" : "standard",
          initialSync,
        );
        commissionCheckEnabled = result.commissionCheckEnabled === true;
        if (commissionCheckEnabled) scheduleCommissionCheck(0);
        else cancelCommissionCheck();
      },
    );
  }
  chrome.storage.local.remove("startFromFirstIncomplete");
  readAndSendState(true);
  chrome.runtime.sendMessage({ type: "PEGASO_SOURCE_PAGE_READY", pageLoadedAt }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response?.released) {
      debugLog(`[PlumePilot] Operazione ${String(response.kind || "").toUpperCase()} interrotta dal ricaricamento. Puoi avviarla nuovamente.`);
    }
  });
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (window !== window.top) return;
    if (message?.type === "PEGASO_CLEAR_COMMISSION_MEMORY") {
      cancelCommissionCheck();
      window.postMessage({ type: COMMISSION_CLEAR_MEMORY }, "*");
      sendResponse({ accepted: true });
      return;
    }
    if (message?.type === "PEGASO_CHAPTER_LIMIT_STATUS_REQUEST") {
      window.postMessage({ type: "PEGASO_CHAPTER_LIMIT_STATUS_REQUEST" }, "*");
      sendResponse({ accepted: true, status: chapterLimitStatus });
      return;
    }
    if (message?.type === "PEGASO_COURSE_PROGRESS_STATUS_REQUEST") {
      window.postMessage({ type: "PEGASO_COURSE_PROGRESS_STATUS_REQUEST" }, "*");
      sendResponse({ accepted: true, status: courseProgressStatus });
      return;
    }
    if (message?.type === "PEGASO_COLLECT_COURSE_MATERIALS") {
      const operationId = exportOperationId(message.operationId);

      if (!operationId) {
        sendResponse({ accepted: false, reason: "Identificativo operazione mancante." });
        return;
      }

      if (requestedExportOperationIds.has(operationId)) {
        debugLog("[PlumePilot] Duplicate export request ignored by bridge:", operationId);
        sendResponse({ accepted: true, duplicate: true });
        return;
      }

      rememberExportOperation(requestedExportOperationIds, operationId);
      window.postMessage({ type: "PEGASO_COLLECT_COURSE_MATERIALS_REQUEST", format: message.format, operationId }, "*");
      sendResponse({ accepted: true, duplicate: false });
      return;
    }
    if (message?.type === "PEGASO_COLLECT_COURSE_TESTS") {
      const operationId = exportOperationId(message.operationId);
      if (!operationId) {
        sendResponse({ accepted: false, reason: "Identificativo operazione mancante." });
        return;
      }
      if (requestedExportOperationIds.has(operationId)) {
        sendResponse({ accepted: true, duplicate: true });
        return;
      }
      rememberExportOperation(requestedExportOperationIds, operationId);
      window.postMessage({ type: "PEGASO_COLLECT_COURSE_TESTS_REQUEST", operationId }, "*");
      sendResponse({ accepted: true, duplicate: false });
      return;
    }
    if (message?.type === "PEGASO_CANCEL_EXPORT_COLLECTION") {
      const operationId = exportOperationId(message.operationId);
      if (!operationId || terminalExportOperationIds.has(operationId)) {
        sendResponse({ accepted: false, reason: "Operazione di raccolta non disponibile." });
        return;
      }
      window.postMessage({ type: "PEGASO_CANCEL_EXPORT_COLLECTION", operationId }, "*");
      sendResponse({ accepted: true });
      return;
    }
    if (message?.type === "PEGASO_INVALIDATE_MATERIAL_CACHE") {
      window.postMessage(
        {
          type: "PEGASO_INVALIDATE_MATERIAL_CACHE",
          cacheKeys: Array.isArray(message.cacheKeys) ? message.cacheKeys : [],
        },
        "*",
      );
      sendResponse({ accepted: true });
      return;
    }
    if (message?.type === "PEGASO_FIND_FIRST_INCOMPLETE_COMMAND") {
      if (!/\/videolezioni\/[^/?#]+/i.test(window.location.pathname)) {
        sendResponse({
          accepted: false,
          reason: "Apri prima la pagina delle lezioni di un corso.",
        });
        return;
      }
      window.postMessage(
        { type: "PEGASO_FIND_FIRST_INCOMPLETE_REQUEST", source: "toolbar-popup" },
        "*",
      );
      sendResponse({ accepted: true });
      return;
    }
    if (message?.type === "PEGASO_TURBO_TESTS_STATUS_REQUEST") { sendResponse({ accepted: true, status: turboTestsStatus }); return; }
    if (message?.type === "PEGASO_TURBO_TESTS_COMMAND") {
      turboOperationId = message.operationId || turboOperationId;
      window.postMessage({ type: "PEGASO_TURBO_TESTS_COMMAND", action: message.action === "stop" ? "stop" : "start", operationId: turboOperationId }, "*");
      sendResponse({ accepted: true });
      return;
    }
    if (message?.type === "PEGASO_OBJECTIVES_STATUS_REQUEST") {
      sendResponse({ accepted: true, status: objectivesStatus });
      return;
    }
    if (message?.type === "PEGASO_OBJECTIVES_COMMAND") {
      objectivesOperationId = message.operationId || objectivesOperationId;
      window.postMessage({
        type: "PEGASO_OBJECTIVES_COMMAND",
        action: message.action === "stop" ? "stop" : "start",
        operationId: objectivesOperationId,
      }, "*");
      sendResponse({ accepted: true });
    }
  });
  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data) return;
    if (event.data.type === "STUDYWING_NOTIFICATION_UPDATED") {
      const source = event.data.notification || null;
      const message = safeText(source?.message, 1200) || "";
      if (!message) return;
      chrome.storage.local.set({
        studywingLastNotification: {
          message,
          level: ["success", "warning", "error"].includes(source?.level)
            ? source.level
            : "info",
          createdAt: Number(source?.createdAt) || Date.now(),
        },
      });
      return;
    }
    if (event.data.type === "PEGASO_AUTONEXT_STATE_REQUEST") {
      readAndSendState(true);
      return;
    }
    if (event.data.type === "PEGASO_CHAPTER_LIMIT_STATUS") {
      chapterLimitStatus = event.data.status || null;
      const courseCode = String(chapterLimitStatus?.courseCode || "");
      if (!courseCode) return;
      chrome.storage.local.get({ autoplayChapterLimitStatuses: {} }, (result) => {
        chrome.storage.local.set({
          autoplayChapterLimitStatuses: {
            ...(result.autoplayChapterLimitStatuses || {}),
            [courseCode]: chapterLimitStatus,
          },
        });
      });
      return;
    }
    if (event.data.type === "PEGASO_COURSE_PROGRESS_STATUS") {
      const source = event.data.status || null;
      const courseCode = typeof source?.courseCode === "string"
        ? source.courseCode.slice(0, 80)
        : "";
      const percent = Number(source?.percent);
      courseProgressStatus = courseCode ? {
        courseCode,
        available: source.available === true && Number.isFinite(percent),
        percent: Number.isFinite(percent) ? Math.max(0, Math.min(100, Math.floor(percent))) : null,
        chapterCount: Math.max(0, Math.floor(Number(source.chapterCount) || 0)),
        knownChapters: Math.max(0, Math.floor(Number(source.knownChapters) || 0)),
        exact: source.exact === true,
        updatedByStudyWing: source.updatedByStudyWing === true,
        message: safeText(source.message, 160) || "",
      } : null;
      chrome.runtime.sendMessage({
        type: "PEGASO_COURSE_PROGRESS_STATUS",
        status: courseProgressStatus,
      }, () => void chrome.runtime.lastError);
      return;
    }
    if (event.data.type === "PEGASO_CHAPTER_LIMIT_SESSION_UPDATE") {
      const courseCode = String(event.data.courseCode || "");
      if (!courseCode) return;
      chrome.storage.local.get({ autoplayChapterLimitSessions: {} }, (result) => {
        chrome.storage.local.set({
          autoplayChapterLimitSessions: {
            ...(result.autoplayChapterLimitSessions || {}),
            [courseCode]: event.data.session || null,
          },
        });
      });
      return;
    }
    if (event.data.type === "PEGASO_COURSE_MATERIALS_COLLECTED") {
      const operationId = exportOperationId(event.data.operationId);

      if (!operationId || !event.data.payload) return;

      if (terminalExportOperationIds.has(operationId)) {
        debugLog("[PlumePilot] Duplicate collected export ignored by bridge:", operationId);
        return;
      }

      rememberExportOperation(terminalExportOperationIds, operationId);
      chrome.runtime.sendMessage({ type: "PEGASO_OPEN_EXPORT_BUILDER", format: event.data.format, operationId, payload: event.data.payload }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn("[PlumePilot] Export builder request failed:", chrome.runtime.lastError.message);
          return;
        }
        if (!response?.accepted) {
          console.warn("[PlumePilot] Export builder request was not accepted:", operationId);
        }
      });
      return;
    }
    if (event.data.type === "PEGASO_COURSE_TESTS_COLLECTED") {
      const operationId = exportOperationId(event.data.operationId);
      if (!operationId || !event.data.payload || terminalExportOperationIds.has(operationId)) return;
      rememberExportOperation(terminalExportOperationIds, operationId);
      chrome.runtime.sendMessage({
        type: "PEGASO_OPEN_EXPORT_BUILDER",
        format: "tests",
        operationId,
        payload: event.data.payload,
      });
      return;
    }
    if (event.data.type === "PEGASO_EXPORT_COLLECTION_STATUS") {
      const operationId = exportOperationId(event.data.operationId);
      if (!operationId || terminalExportOperationIds.has(operationId)) return;
      chrome.runtime.sendMessage({ type: "PEGASO_UPDATE_OPERATION", operationId, patch: { message: event.data.message } });
      return;
    }
    if (event.data.type === "STUDYWING_ACHIEVEMENT_CLAIM_REQUEST") {
      chrome.runtime.sendMessage({ type: "STUDYWING_ACHIEVEMENT_CLAIM", achievementId: event.data.achievementId }, (result) => {
        if (!chrome.runtime.lastError && result?.accepted) window.postMessage({ type: "STUDYWING_ACHIEVEMENT_AWARDED", result }, "*");
      });
      return;
    }
    if (event.data.type === "STUDYWING_CHAPTER_VIDEOS_CLAIM_REQUEST") {
      chrome.runtime.sendMessage({
        type: "STUDYWING_CHAPTER_VIDEOS_CLAIM",
        chapterKey: event.data.chapterKey,
        videos: event.data.videos,
      }, (result) => {
        if (!chrome.runtime.lastError && result?.accepted) window.postMessage({ type: "STUDYWING_ACHIEVEMENT_AWARDED", result }, "*");
      });
      return;
    }
    if (event.data.type === "STUDYWING_LESSON_COMPLETION_CANDIDATE_REQUEST") {
      chrome.runtime.sendMessage({
        type: "STUDYWING_LESSON_COMPLETION_CLAIM",
        lessonKey: event.data.lessonKey,
        chapters: event.data.chapters,
        candidate: event.data.candidate === true,
      }, (result) => {
        if (!chrome.runtime.lastError && result?.accepted) {
          window.postMessage({ type: "STUDYWING_ACHIEVEMENT_AWARDED", result }, "*");
        }
      });
      return;
    }
    if (event.data.type === "STUDYWING_PENDING_LESSONS_REQUEST") {
      chrome.runtime.sendMessage({
        type: "STUDYWING_PENDING_LESSONS_GET",
        courseCode: event.data.courseCode,
      }, (result) => {
        if (chrome.runtime.lastError || result?.accepted !== true) return;
        window.postMessage({
          type: "STUDYWING_PENDING_LESSONS_STATUS",
          courseCode: event.data.courseCode,
          candidates: result.candidates || [],
        }, "*");
      });
      return;
    }
    if (event.data.type === "PEGASO_EXPORT_COLLECTION_FAILED") {
      const operationId = exportOperationId(event.data.operationId);

      if (!operationId || terminalExportOperationIds.has(operationId)) {
        if (operationId) debugLog("[PlumePilot] Duplicate export failure ignored by bridge:", operationId);
        return;
      }

      rememberExportOperation(terminalExportOperationIds, operationId);
      chrome.runtime.sendMessage({ type: "PEGASO_RELEASE_OPERATION", operationId });
      return;
    }
    if (event.data.type === "PEGASO_TURBO_TESTS_STATUS") {
      turboTestsStatus = { running: event.data.status?.running === true, stopping: event.data.status?.stopping === true, outcome: event.data.status?.outcome || null, message: event.data.status?.message || "" };
      turboOperationId = event.data.operationId || turboOperationId;
      chrome.runtime.sendMessage({
        type: turboTestsStatus.running ? "PEGASO_UPDATE_OPERATION" : "PEGASO_RELEASE_OPERATION",
        operationId: turboOperationId,
        patch: { phase: turboTestsStatus.stopping ? "stopping" : "running", message: turboTestsStatus.message },
      });
      if (!turboTestsStatus.running && turboTestsStatus.outcome === "success") {
        chrome.runtime.sendMessage({ type: "STUDYWING_ACHIEVEMENT_CLAIM", achievementId: "complete-tests" }, (result) => {
          if (!chrome.runtime.lastError && result?.accepted) window.postMessage({ type: "STUDYWING_ACHIEVEMENT_AWARDED", result }, "*");
        });
      }
      if (!turboTestsStatus.running) turboOperationId = null;
      return;
    }
    if (event.data.type === "PEGASO_OBJECTIVES_STATUS") {
      objectivesStatus = {
        running: event.data.status?.running === true,
        stopping: event.data.status?.stopping === true,
        outcome: event.data.status?.outcome || null,
        message: event.data.status?.message || "",
      };
      objectivesOperationId = event.data.operationId || objectivesOperationId;
      chrome.runtime.sendMessage({
        type: objectivesStatus.running ? "PEGASO_UPDATE_OPERATION" : "PEGASO_RELEASE_OPERATION",
        operationId: objectivesOperationId,
        patch: {
          phase: objectivesStatus.stopping ? "stopping" : "running",
          message: objectivesStatus.message,
        },
      });
      if (!objectivesStatus.running && objectivesStatus.outcome === "success") {
        chrome.runtime.sendMessage({ type: "STUDYWING_ACHIEVEMENT_CLAIM", achievementId: "complete-objectives" }, (result) => {
          if (!chrome.runtime.lastError && result?.accepted) window.postMessage({ type: "STUDYWING_ACHIEVEMENT_AWARDED", result }, "*");
        });
      }
      if (!objectivesStatus.running) objectivesOperationId = null;
      return;
    }
    if (event.data.type === COMMISSION_RESPONSE) {
      if (event.data.payload?.error) {
        console.warn("[PlumePilot Commissione] Controllo non riuscito:", event.data.payload.error);
        const requestId = event.data.payload.requestId;
        if (!requestId || requestId === currentCommissionLeaseId) releaseCommissionLease(false);
      } else {
        processCommissionPayload(event.data.payload);
      }
    }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (
      changes.enabled ||
      changes.stopAtTests ||
      changes.autoCompleteTests ||
      changes.autoplayChapterLimitEnabled ||
      changes.autoplayChapterLimits ||
      changes.autoplayChapterLimitSessions ||
      changes.playbackErrorRecovery ||
      changes.courseProgressOverlayEnabled ||
      changes.visualStyle
    ) {
      readAndSendState(false);
    }
    if (changes.commissionCheckEnabled) {
      commissionCheckEnabled = changes.commissionCheckEnabled.newValue === true;
      if (commissionCheckEnabled) scheduleCommissionCheck(0);
      else cancelCommissionCheck();
    }
    if (changes.commissionExamsCapturedAt && commissionCheckEnabled) {
      scheduleCommissionCheckFromCapture(changes.commissionExamsCapturedAt.newValue);
    }
    if (
      changes.commissionCheckLease &&
      !changes.commissionCheckLease.newValue &&
      commissionCheckEnabled &&
      pageIsVisible()
    ) {
      scheduleCommissionCheck(250);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (pageIsVisible()) scheduleCommissionCheck(0);
    else cancelCommissionCheck();
  });
  window.addEventListener("focus", () => {
    if (commissionCheckEnabled && pageIsVisible()) scheduleCommissionCheck(0);
  });
})();

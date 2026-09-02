(() => {
  "use strict";

  const STUDYWING_DEBUG = false;
  const debugLog = (...values) => {
    if (STUDYWING_DEBUG) console.info("[PlumePilot]", ...values);
  };
  const CONTENT_INSTANCE_KEY = Symbol.for("studywing.main-content.instance");

  if (window[CONTENT_INSTANCE_KEY]) {
    debugLog("Duplicate main-world content instance ignored.");
    return;
  }

  Object.defineProperty(window, CONTENT_INSTANCE_KEY, {
    value: { loadedAt: Date.now() },
    configurable: false,
  });

  const CHAPTER_SETTLE_DELAY_MS = 4000;
  const DELAY_MS = 1200;
  const RESUME_DELAY_MS = 2500;
  const LESSON_CLOSE_DELAY_MS = 1500;
  const OBJECTIVES_SETTLE_DELAY_MS = 5000;
  const CHAPTER_RECOVERY_KEY = "pegasoAutoNextChapterRecovery";
  const MAX_CHAPTER_RELOADS = 1;
  const SESSION_CONFLICT_RECOVERY_KEY =
    "pegasoAutoNextSessionConflictRecovery";
  const SESSION_CONFLICT_TITLE = "Riproduzione del video non consentita";
  const SESSION_CONFLICT_MESSAGE = "una sola lezione alla volta";
  const SESSION_CONFLICT_RECOVERY_MAX_AGE_MS = 120000;
  const SESSION_CONFLICT_HEALTH_DELAY_MS = 12000;
  const SESSION_CONFLICT_CLICK_DELAY_MS = 750;
  const WATCH_VALIDATION_RECOVERY_KEY =
    "pegasoAutoNextWatchValidationRecovery";
  const WATCH_VALIDATION_MESSAGE_PARTS = [
    "visualizzare l'intero video",
    "velocità normale (x1)",
    "senza saltare alcuna parte",
  ];
  const WATCH_VALIDATION_RECOVERY_MAX_AGE_MS = 6 * 60 * 60 * 1000;
  const WATCH_VALIDATION_CLICK_DELAY_MS = 750;
  const RECOVERY_READY_DELAY_MS = 3000;
  const RECOVERY_STABLE_MS = 1500;
  const CHROMIUM_RECOVERY_PREOPEN_DELAY_MS = 4000;
  const CHROMIUM_RECOVERY_REOPEN_DELAY_MS = 2500;
  const WAIT_MS = 10000;
  const SMART_RESUME_READY_TIMEOUT_MS = 30000;
  const TEST_GROUPS_STABLE_MS = 600;
  const TEST_COMPLETION_SETTLE_MS = 750;
  const ANSWER_SELECTION_TIMEOUT_MS = 2000;
  const ANSWER_SELECTION_ATTEMPTS = 3;
  const EPUB_SECTION_ATTEMPTS = 3;
  const EPUB_CHAPTER_ATTEMPTS = 3;
  const EPUB_LINK_TIMEOUT_MS = 15000;
  const EPUB_RETRY_DELAY_MS = 2000;
  const EPUB_CHAPTER_PACING_MS = 1000;
  const API_MATERIAL_PACING_MS = 150;
  const TURBO_API_PACING_MS = 350;
  const COURSE_INDEX_RETRY_DELAYS_MS = [350, 750];
  const API_LESSON_RETRY_DELAYS_MS = [750, 1500];
  const API_LESSON_CACHE_FRESH_MS = 5 * 60 * 1000;
  const TURBO_API_RESPONSE_TIMEOUT_MS = 17000;
  const TURBO_API_REQUEST = "STUDYWING_TURBO_API_REQUEST";
  const TURBO_API_RESPONSE = "STUDYWING_TURBO_API_RESPONSE";
  const TURBO_API_CANCEL = "STUDYWING_TURBO_API_CANCEL";
  const PAGE_LESSON_SNAPSHOT = "STUDYWING_PAGE_LESSON_SNAPSHOT";
  const PAGE_LESSON_SNAPSHOT_REQUEST = "STUDYWING_PAGE_LESSON_SNAPSHOT_REQUEST";
  const VIDEO_END_TOLERANCE_SECONDS = 0.75;
  const MAX_HANDLED_EXPORT_OPERATIONS = 20;
  const IS_CHROMIUM = /(?:Chrome|Chromium|Edg)\//.test(
    navigator.userAgent,
  );
  let timer = null;
  let lastVideo = null;
  let busy = false;
  let enabled = true;
  let stopAtTests = false;
  let autoCompleteTests = false;
  let chapterLimitEnabled = false;
  let chapterLimit = 1;
  let chapterLimitMaximum = 1;
  let chapterLimitSession = null;
  let chapterLimitRefreshAttempts = 0;
  let chapterLimitRefreshTimer = null;
  let courseProgressState = null;
  let courseProgressInitTimer = null;
  let courseProgressOverlayEnabled = false;
  let visualStyle = "standard";
  let autoRecoverPlaybackErrors = true;
  let settingsInitialized = false;
  let collectingCourseMaterials = false;
  let exportCancelRequested = false;
  let activeExportOperationId = null;
  let turboTestsRunning = false;
  let turboTestsCancelRequested = false;
  let turboOperationId = null;
  let objectivesRunning = false;
  let objectivesCancelRequested = false;
  let objectivesOperationId = null;
  let turboApiRequestSequence = 0;
  let playbackCourseOutline = null;
  let playbackOutlineCourseCode = null;
  let playbackCourseIndex = null;
  let playbackCourseIndexCode = null;
  let lastExportNotification = null;
  let smartResumeGeneration = 0;
  let smartResumeRunning = false;
  let stoppedAtTestContext = null;
  let startupLogged = false;
  let sessionConflictScanTimer = null;
  let sessionConflictRecoveryPending = false;
  let sessionConflictBlockedLogged = false;
  let sessionConflictManualLogged = false;
  let watchValidationRecoveryPending = false;
  let watchValidationBlockedLogged = false;
  let watchValidationManualLogged = false;
  let achievementNotificationTimer = null;
  const pendingAchievementNotifications = [];
  const pendingTurboApiRequests = new Map();
  const lessonApiCache = new Map();
  const courseProgressChapters = new Map();
  const pendingLessonVerificationAttempts = new Map();
  const materialLinkCache = new Map();
  const materialOutlineCache = new Map();
  const testSourceCache = new Map();
  const handledExportOperationIds = new Set();

  const log = debugLog;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function achievementUnlockSuffix(results) {
    const rewardIds = new Set(results.flatMap((result) =>
      Array.isArray(result.newUnlockIds) ? result.newUnlockIds : [],
    ));
    const latest = results[results.length - 1] || {};
    return `${rewardIds.size ? ` ${rewardIds.size === 1 ? "Nuova ricompensa disponibile!" : `${rewardIds.size} nuove ricompense disponibili!`}` : ""}${latest.levelUp ? ` Livello ${latest.level} raggiunto!` : ""}`;
  }

  function showAchievementNotifications(results) {
    if (!results.length) return;
    const unlock = achievementUnlockSuffix(results);
    const message = results.length === 1
      ? (results[0].achievement.id === "chapter-video-completion"
          ? `Video del capitolo completati: +${results[0].awardedExp} EXP.${unlock}`
          : `Traguardo completato: ${results[0].achievement.title} · +${results[0].awardedExp} EXP.${unlock}`)
      : `Ricompense ottenute: ${results.map((result) =>
          result.achievement.id === "chapter-video-completion"
            ? `video del capitolo +${result.awardedExp} EXP`
            : `${result.achievement.title} +${result.awardedExp} EXP`,
        ).join(" · ")}.${unlock}`;
    window.StudyWingNotifications?.show({
      message,
      type: "success",
      key: `achievement:${results.map((result) => result.achievement.id).join("+")}`,
      terminal: true,
    });
  }

  function queueAchievementNotification(result) {
    const progress = courseProgressVisiblePercent();
    const shouldWaitForExpAnimation =
      visualStyle === "gaming" &&
      courseProgressOverlayEnabled &&
      progress !== null &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!shouldWaitForExpAnimation) {
      showAchievementNotifications([result]);
      return;
    }
    pendingAchievementNotifications.push(result);
    if (achievementNotificationTimer) return;
    achievementNotificationTimer = setTimeout(() => {
      achievementNotificationTimer = null;
      showAchievementNotifications(pendingAchievementNotifications.splice(0));
    }, 1450);
  }

  function courseBatchRunning() {
    return turboTestsRunning || objectivesRunning;
  }

  function rememberHandledExportOperation(operationId) {
    handledExportOperationIds.add(operationId);

    if (handledExportOperationIds.size > MAX_HANDLED_EXPORT_OPERATIONS) {
      handledExportOperationIds.delete(
        handledExportOperationIds.values().next().value,
      );
    }
  }

  function logStartup(extensionVersion) {
    if (startupLogged || typeof extensionVersion !== "string" || !extensionVersion) return;
    startupLogged = true;
    log(
      `PlumePilot ${extensionVersion} started. Sections:`,
      sections().length,
      "Rendered chapters:",
      chapters().length,
      "Lessons:",
      lessons().length,
    );
  }

  // Receives the enabled/paused state from bridge.js, which runs in the
  // extension's isolated world and therefore has access to chrome.storage.
  window.addEventListener("message", (event) => {
    if (event.source !== window) {
      return;
    }

    if (!event.data) {
      return;
    }

    if (event.data.type === TURBO_API_RESPONSE) {
      const pending = pendingTurboApiRequests.get(event.data.requestId);
      if (!pending) return;
      pendingTurboApiRequests.delete(event.data.requestId);
      clearTimeout(pending.timeout);
      pending.resolve({
        ok: event.data.ok === true,
        data: event.data.data || null,
        error: event.data.error || null,
      });
      return;
    }

    if (event.data.type === PAGE_LESSON_SNAPSHOT) {
      const courseCode = courseCodeFromUrl();
      if (!courseCode || event.data.courseCode !== courseCode) return;
      const displayOrder = Number(event.data.displayOrder);
      if (!Number.isInteger(displayOrder) || displayOrder < 1 || !event.data.data) return;
      rememberLessonResponse(courseCode, displayOrder, {
        ok: true,
        data: event.data.data,
      }, {
        lpId: event.data.lpId,
        paragraphId: event.data.paragraphId,
      }, true);
      return;
    }

    if (event.data.type === "PEGASO_COLLECT_COURSE_MATERIALS_REQUEST") {
      const operationId =
        typeof event.data.operationId === "string"
          ? event.data.operationId.trim()
          : "";
      const format = ["materials", "epub"].includes(event.data.format)
        ? event.data.format
        : "pdf";

      if (!operationId) {
        log("Ignored export collection request without an operation ID.");
        return;
      }

      if (handledExportOperationIds.has(operationId)) {
        log("Ignored duplicate export collection request:", operationId);
        return;
      }

      rememberHandledExportOperation(operationId);
      log("Export collection request accepted.", { operationId, format });
      void collectCourseMaterials(format, operationId).finally(() => {
        log("Export collection request finished.", { operationId, format });
      });
      return;
    }

    if (event.data.type === "PEGASO_COLLECT_COURSE_TESTS_REQUEST") {
      const operationId =
        typeof event.data.operationId === "string"
          ? event.data.operationId.trim()
          : "";
      if (!operationId || handledExportOperationIds.has(operationId)) return;
      rememberHandledExportOperation(operationId);
      void collectCourseTests(operationId);
      return;
    }

    if (event.data.type === "PEGASO_CANCEL_EXPORT_COLLECTION") {
      const operationId =
        typeof event.data.operationId === "string"
          ? event.data.operationId.trim()
          : "";
      if (
        collectingCourseMaterials &&
        operationId &&
        operationId === activeExportOperationId
      ) {
        exportCancelRequested = true;
        window.postMessage({ type: TURBO_API_CANCEL }, "*");
        setExportCollectionStatus(
          "Interruzione della raccolta in corso…",
          false,
          operationId,
        );
      }
      return;
    }

    if (event.data.type === "PEGASO_INVALIDATE_MATERIAL_CACHE") {
      const courseCode = courseCodeFromUrl();
      const prefix = courseCode ? `${courseCode}:` : null;
      const cacheKeys = Array.isArray(event.data.cacheKeys)
        ? event.data.cacheKeys
        : [];
      let invalidated = 0;

      for (const cacheKey of cacheKeys) {
        if (
          prefix &&
          typeof cacheKey === "string" &&
          cacheKey.startsWith(prefix) &&
          materialLinkCache.delete(cacheKey)
        ) {
          invalidated++;
        }
      }

      if (invalidated) {
        log(
          `Invalidated ${invalidated} material cache entr${invalidated === 1 ? "y" : "ies"} after a builder download failure.`,
        );
      }
      return;
    }

    if (event.data.type === "PEGASO_TURBO_TESTS_COMMAND") {
      if (event.data.action === "stop") {
        if (turboTestsRunning) {
          turboTestsCancelRequested = true;
          window.postMessage({ type: TURBO_API_CANCEL }, "*");
          setTurboTestStatus({
            running: true,
            stopping: true,
            message: "Interruzione dopo l’operazione corrente…",
          });
        }
      } else if (event.data.action === "start") {
        turboOperationId = event.data.operationId || null;
        runTurboTests();
      }
      return;
    }

    if (event.data.type === "PEGASO_OBJECTIVES_COMMAND") {
      if (event.data.action === "stop") {
        if (objectivesRunning) {
          objectivesCancelRequested = true;
          window.postMessage({ type: TURBO_API_CANCEL }, "*");
          setObjectivesStatus({
            running: true,
            stopping: true,
            message: "Interruzione dopo l’operazione corrente…",
          });
        }
      } else if (event.data.action === "start") {
        objectivesOperationId = event.data.operationId || null;
        runObjectivesBatch();
      }
      return;
    }

    if (event.data.type === "PEGASO_FIND_FIRST_INCOMPLETE_REQUEST") {
      void startFirstIncompleteDiscovery(
        event.data.source === "floating-menu"
          ? "floating menu button"
          : "toolbar popup button",
      );
      return;
    }

    if (event.data.type === "PEGASO_CHAPTER_LIMIT_STATUS_REQUEST") {
      void refreshChapterLimitStatus();
      return;
    }

    if (event.data.type === "PEGASO_COURSE_PROGRESS_STATUS_REQUEST") {
      scheduleCourseProgressInitialization(0);
      publishCourseProgressStatus();
      return;
    }

    if (event.data.type === "STUDYWING_PENDING_LESSONS_STATUS") {
      if (String(event.data.courseCode || "") !== courseCodeFromUrl()) return;
      void verifyPendingLessonCompletions(event.data.candidates || []);
      return;
    }

    if (event.data.type === "STUDYWING_ACHIEVEMENT_AWARDED") {
      const result = event.data.result;
      if (!result?.accepted || !result.achievement) return;
      queueAchievementNotification(result);
      return;
    }

    if (event.data.type !== "PEGASO_AUTONEXT_STATE") {
      return;
    }

    logStartup(event.data.extensionVersion);

    const wasEnabled = enabled;
    const wasStoppingAtTests = stopAtTests;
    const wasAutoCompletingTests = autoCompleteTests;
    const wasAutoRecoveringPlaybackErrors = autoRecoverPlaybackErrors;
    const initialSync = event.data.initialSync === true;

    enabled = event.data.enabled !== false;
    autoCompleteTests = event.data.autoCompleteTests === true;
    chapterLimitEnabled = event.data.autoplayChapterLimitEnabled === true;
    courseProgressOverlayEnabled = event.data.courseProgressOverlayEnabled === true;
    visualStyle = event.data.visualStyle === "gaming" ? "gaming" : "standard";
    const limitCourseCode = courseCodeFromUrl();
    const storedLimits = event.data.autoplayChapterLimits || {};
    const storedSessions = event.data.autoplayChapterLimitSessions || {};
    chapterLimit = Math.max(1, Math.floor(Number(storedLimits[limitCourseCode]) || 1));
    chapterLimitSession = storedSessions[limitCourseCode] || null;
    stopAtTests = event.data.stopAtTests !== false && !autoCompleteTests && !chapterLimitEnabled;
    autoRecoverPlaybackErrors = event.data.playbackErrorRecovery !== "manual";

    log(
      enabled ? "Extension enabled." : "Extension paused.",
      "Stop at tests:",
      stopAtTests,
      "Auto-complete pending tests:",
      autoCompleteTests,
      "Automatic playback-error recovery:",
      autoRecoverPlaybackErrors,
    );
    void refreshChapterLimitStatus();

    if (wasAutoRecoveringPlaybackErrors !== autoRecoverPlaybackErrors) {
      log(
        autoRecoverPlaybackErrors
          ? "Automatic playback-error recovery enabled."
          : "Recognized playback-error dialogs will be left open for the user.",
      );
      scheduleSessionConflictScan();
    }

    if (!settingsInitialized) {
      settingsInitialized = true;

      if (!enabled) {
        clearTimeout(timer);
        timer = null;
      }

    }

    if (!enabled) {
      smartResumeGeneration++;
    }

    if (initialSync) {
      scheduleCourseProgressInitialization(250);
      return;
    }

    if (!enabled) {
      clearTimeout(timer);
      timer = null;
      return;
    }

    /*
     * Extension has just been resumed.
     */
    if (!wasEnabled && enabled) {
      resumeIfVideoAlreadyEnded();
      return;
    }

    if (smartResumeRunning) {
      log("Autoplay options updated during first-incomplete discovery.");
      return;
    }

    /*
     * If the user disables "Stop at end-of-lesson tests" after automation
     * stopped at a test, resume automatically when the current video is done.
     */
    if (wasStoppingAtTests && !stopAtTests) {
      log("Stop at tests disabled. Resuming automatic progression.");

      const context = stoppedAtTestContext;
      stoppedAtTestContext = null;

      if (context) {
        resumeAfterTestBoundary(context);
      } else {
        resumeIfVideoAlreadyEnded();
      }

      return;
    }

    if (!wasAutoCompletingTests && autoCompleteTests) {
      log(
        "Automatic test completion enabled. Checking whether progression can resume.",
      );

      resumeIfVideoAlreadyEnded();
    }
  });

  // bridge.js may have sent its startup state before this document-idle
  // listener existed. Request an explicit synchronization after subscribing.
  window.postMessage({ type: "PEGASO_AUTONEXT_STATE_REQUEST" }, "*");

  function chapterLimitMax(total) {
    const half = Math.floor(Number(total) / 2);
    return Math.max(1, half < 5 ? half : Math.floor(half / 5) * 5);
  }

  function publishChapterLimitStatus() {
    const courseCode = courseCodeFromUrl();
    if (!courseCode) return;
    const completed = Math.max(0, Number(chapterLimitSession?.completed) || 0);
    window.postMessage({
      type: "PEGASO_CHAPTER_LIMIT_STATUS",
      status: {
        courseCode,
        enabled: chapterLimitEnabled,
        limit: Math.min(chapterLimit, chapterLimitMaximum),
        maximum: chapterLimitMaximum,
        completed,
        reached: chapterLimitSession?.reached === true,
      },
    }, "*");
  }

  async function refreshChapterLimitStatus() {
    const courseCode = courseCodeFromUrl();
    if (!courseCode) return;
    try {
      const index = await getPlaybackCourseIndex(courseCode);
      if (index?.length) {
        chapterLimitMaximum = chapterLimitMax(index.length);
        chapterLimitRefreshAttempts = 0;
        clearTimeout(chapterLimitRefreshTimer);
        chapterLimitRefreshTimer = null;
        requestPendingLessonVerification(courseCode);
      } else if (chapterLimitRefreshAttempts < 10) {
        chapterLimitRefreshAttempts++;
        clearTimeout(chapterLimitRefreshTimer);
        chapterLimitRefreshTimer = setTimeout(refreshChapterLimitStatus, 3000);
      }
    } catch (_) {}
    chapterLimit = Math.min(chapterLimit, chapterLimitMaximum);
    publishChapterLimitStatus();
    scheduleCourseProgressInitialization(0);
  }

  function persistChapterLimitSession() {
    const courseCode = courseCodeFromUrl();
    if (!courseCode) return;
    window.postMessage({
      type: "PEGASO_CHAPTER_LIMIT_SESSION_UPDATE",
      courseCode,
      session: chapterLimitSession,
    }, "*");
    publishChapterLimitStatus();
  }

  function chapterLimitReached(identity) {
    if (!chapterLimitEnabled) return false;
    const courseCode = courseCodeFromUrl();
    // The visible chapter label is not a stable identifier: Pegaso may rebuild
    // it while lesson percentages change. The URL lesson number is the same
    // display-order identity used by the course APIs and remains stable while
    // PlumePilot moves between videos of the same chapter.
    const lessonNumber = lessonNumberFromUrl();
    const titleNumber = Number(String(identity?.chapterText || "").match(/^\s*(\d+)\s*-/)?.[1]);
    const stableLessonNumber = lessonNumber || (Number.isInteger(titleNumber) ? titleNumber : null);
    const key = stableLessonNumber
      ? `${courseCode}:${stableLessonNumber}`
      : `${courseCode}:${identity?.sectionText || ""}\u001f${identity?.chapterText || ""}`;
    const activeLimit = Math.min(chapterLimit, chapterLimitMaximum);
    const previous = chapterLimitSession?.courseCode === courseCode
      ? chapterLimitSession
      : { courseCode, completed: 0, reached: false, lastChapterKey: "" };
    if (previous.lastChapterKey === key) return previous.reached === true;
    const completed = Math.max(0, Number(previous.completed) || 0) + 1;
    chapterLimitSession = {
      courseCode,
      completed,
      reached: completed >= activeLimit,
      lastChapterKey: key,
      lastLessonNumber: stableLessonNumber,
    };
    persistChapterLimitSession();
    return chapterLimitSession.reached;
  }

  function lessons() {
    return [...document.querySelectorAll("div.border-t")].filter((x) =>
      x.querySelector(":scope > div.cursor-pointer"),
    );
  }

  function currentLesson() {
    return (
      lessons().find((x) =>
        x.querySelector(
          ":scope > div.cursor-pointer > div:first-child > div.visible.bg-platform-primary",
        ),
      ) || null
    );
  }

  function lessonName(row) {
    return (
      row?.querySelector(".text-base")?.innerText.trim().replace(/\s+/g, " ") ||
      ""
    );
  }

  function nextLesson(row) {
    const chapter = currentChapter(row);

    if (!chapter) {
      log("Could not determine current chapter.");
      return null;
    }

    const rows = chapterRows(chapter);
    const index = rows.indexOf(row);

    if (index < 0) {
      log("Current lesson was not found inside its chapter.");
      return null;
    }

    // Only search inside the current chapter.
    // "Obiettivi" and videos already registered at 100% are deliberately
    // ignored, so resuming autoplay cannot reopen completed activities.
    for (let i = index + 1; i < rows.length; i++) {
      const candidate = rows[i];

      if (lessonName(candidate).toLowerCase() === "obiettivi") continue;

      if (getProgress(candidate) < 100) return candidate;

      log("Skipping already completed video:", lessonName(candidate));
    }

    // No more videos in this chapter.
    return null;
  }

  function video() {
    const a = [...document.querySelectorAll("video")];
    return a.find((v) => v.getBoundingClientRect().width > 0) || a[0] || null;
  }

  function normalizedText(value) {
    return String(value || "")
      .trim()
      .replace(/\\'/g, "'")
      .replace(/[’‘]/g, "'")
      .replace(/\s+/g, " ");
  }

  function isVisibleElement(element) {
    if (!element?.isConnected) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function findPlaybackBlockedModal(messageMatches) {
    if (window !== window.top) return null;

    const title = [
      ...document.querySelectorAll("h1, h2, h3, h4, h5, h6, p, span, div"),
    ].find(
      (element) =>
        normalizedText(element.textContent) === SESSION_CONFLICT_TITLE &&
        isVisibleElement(element),
    );

    if (!title) return null;

    let container = title;

    for (let depth = 0; container && depth < 10; depth++) {
      const text = normalizedText(container.textContent).toLowerCase();

      if (messageMatches(text)) {
        const okButton = [...container.querySelectorAll("button")].find(
          (button) =>
            normalizedText(button.textContent).toLowerCase() === "ok" &&
            isVisibleElement(button),
        );

        if (okButton) {
          return { container, okButton };
        }
      }

      container = container.parentElement;
    }

    return null;
  }

  function findSessionConflictModal() {
    return findPlaybackBlockedModal((text) =>
      text.includes(SESSION_CONFLICT_MESSAGE),
    );
  }

  function findWatchValidationModal() {
    return findPlaybackBlockedModal((text) =>
      WATCH_VALIDATION_MESSAGE_PARTS.every((part) => text.includes(part)),
    );
  }

  function readSessionConflictRecovery() {
    try {
      const raw = sessionStorage.getItem(SESSION_CONFLICT_RECOVERY_KEY);
      if (!raw) return null;

      const state = JSON.parse(raw);
      const age = Date.now() - Number(state?.createdAt || 0);

      if (
        state?.attempts !== 1 ||
        !Number.isFinite(age) ||
        age < 0 ||
        age > SESSION_CONFLICT_RECOVERY_MAX_AGE_MS
      ) {
        sessionStorage.removeItem(SESSION_CONFLICT_RECOVERY_KEY);
        return null;
      }

      return state;
    } catch {
      sessionStorage.removeItem(SESSION_CONFLICT_RECOVERY_KEY);
      return null;
    }
  }

  function writeSessionConflictRecovery() {
    const row = currentLesson();
    const chapter = currentChapter(row);

    sessionStorage.setItem(
      SESSION_CONFLICT_RECOVERY_KEY,
      JSON.stringify({
        attempts: 1,
        createdAt: Date.now(),
        lesson: lessonName(row),
        chapter: chapterIdentity(chapter),
        path: location.pathname,
      }),
    );
  }

  function handleSessionConflictModal() {
    const modal = findSessionConflictModal();

    if (!modal) {
      sessionConflictManualLogged = false;
      return;
    }

    if (sessionConflictRecoveryPending) return;

    if (!autoRecoverPlaybackErrors) {
      clearTimeout(timer);
      timer = null;

      if (!sessionConflictManualLogged) {
        sessionConflictManualLogged = true;
        log(
          "UniPegaso session-conflict dialog detected. Leaving it open according to the user's preference.",
        );
        setResumeDiscoveryStatus(
          "Conflitto tra lezioni rilevato.\nPlumePilot ha lasciato aperto l’avviso e attende una tua scelta.",
          "fallback",
        );
      }

      return;
    }

    sessionConflictManualLogged = false;

    if (readSessionConflictRecovery()) {
      if (!sessionConflictBlockedLogged) {
        sessionConflictBlockedLogged = true;
        log(
          "The UniPegaso session-conflict dialog returned after automatic recovery. Leaving it open to prevent a reload loop.",
        );
        setResumeDiscoveryStatus(
          "Conflitto di sessione ancora presente.\nRipristino automatico interrotto per evitare ricaricamenti continui.",
          "fallback",
        );
      }

      return;
    }

    sessionConflictRecoveryPending = true;
    clearTimeout(timer);
    timer = null;
    writeSessionConflictRecovery();

    log(
      "UniPegaso session-conflict dialog detected. Confirming its one-time recovery reload.",
    );
    setResumeDiscoveryStatus(
      "Conflitto tra lezioni rilevato.\nPlumePilot ricaricherà la lezione una sola volta.",
      "fallback",
    );

    setTimeout(() => {
      const freshModal = findSessionConflictModal();

      if (!autoRecoverPlaybackErrors) {
        sessionConflictRecoveryPending = false;
        sessionStorage.removeItem(SESSION_CONFLICT_RECOVERY_KEY);
        handleSessionConflictModal();
        return;
      }

      if (!freshModal) {
        sessionConflictRecoveryPending = false;
        return;
      }

      freshModal.okButton.click();
    }, SESSION_CONFLICT_CLICK_DELAY_MS);
  }

  function scheduleSessionConflictScan() {
    if (window !== window.top || sessionConflictScanTimer !== null) return;

    sessionConflictScanTimer = setTimeout(() => {
      sessionConflictScanTimer = null;
      maintainWatchValidationRecovery();
      handleSessionConflictModal();
      handleWatchValidationModal();
    }, 100);
  }

  async function verifySessionConflictRecoveryAfterReload() {
    const recovery = readSessionConflictRecovery();

    if (!recovery) return;

    log(
      "Session-conflict recovery reload detected. Waiting for stable playback:",
      recovery,
    );

    const recoveredVideo = await waitFor(() => video(), 30000);

    if (!recoveredVideo) {
      log("Session-conflict recovery could not find the restored video.");
      return;
    }

    await sleep(SESSION_CONFLICT_HEALTH_DELAY_MS);

    if (findSessionConflictModal()) {
      handleSessionConflictModal();
      return;
    }

    if (video() === recoveredVideo) {
      sessionStorage.removeItem(SESSION_CONFLICT_RECOVERY_KEY);
      sessionConflictBlockedLogged = false;
      log("Session-conflict recovery completed. Video state is stable.");
    }
  }

  function readWatchValidationRecovery() {
    try {
      const raw = sessionStorage.getItem(WATCH_VALIDATION_RECOVERY_KEY);
      if (!raw) return null;

      const state = JSON.parse(raw);
      const age = Date.now() - Number(state?.createdAt || 0);

      if (
        state?.attempts !== 1 ||
        !Number.isFinite(age) ||
        age < 0 ||
        age > WATCH_VALIDATION_RECOVERY_MAX_AGE_MS
      ) {
        sessionStorage.removeItem(WATCH_VALIDATION_RECOVERY_KEY);
        return null;
      }

      return state;
    } catch {
      sessionStorage.removeItem(WATCH_VALIDATION_RECOVERY_KEY);
      return null;
    }
  }

  function clearWatchValidationRecovery(reason) {
    if (!sessionStorage.getItem(WATCH_VALIDATION_RECOVERY_KEY)) return;

    sessionStorage.removeItem(WATCH_VALIDATION_RECOVERY_KEY);
    watchValidationRecoveryPending = false;
    watchValidationBlockedLogged = false;
    log("Viewing-validation recovery guard cleared:", reason);
  }

  function writeWatchValidationRecovery() {
    const row = currentLesson();
    const chapter = row ? currentChapter(row) : null;

    sessionStorage.setItem(
      WATCH_VALIDATION_RECOVERY_KEY,
      JSON.stringify({
        attempts: 1,
        createdAt: Date.now(),
        lesson: lessonName(row),
        chapter: chapterIdentity(chapter),
        path: location.pathname,
      }),
    );
  }

  function maintainWatchValidationRecovery() {
    const recovery = readWatchValidationRecovery();

    if (!recovery) return;

    if (recovery.path && recovery.path !== location.pathname) {
      clearWatchValidationRecovery("the course path changed");
      return;
    }

    const row = currentLesson();
    if (!row) return;

    if (getProgress(row) >= 100) {
      clearWatchValidationRecovery("UniPegaso registered the lesson at 100%");

      if (enabled && !busy) {
        resumeIfVideoAlreadyEnded();
      }

      return;
    }

    const currentLessonName = lessonName(row);
    const currentChapterIdentity = chapterIdentity(currentChapter(row));
    const stablePlaybackExists = Boolean(video());

    if (
      stablePlaybackExists &&
      recovery.lesson &&
      currentLessonName &&
      recovery.lesson !== currentLessonName
    ) {
      clearWatchValidationRecovery("the user selected another lesson");
      return;
    }

    if (
      stablePlaybackExists &&
      recovery.chapter &&
      currentChapterIdentity &&
      !sameChapterIdentity(recovery.chapter, currentChapterIdentity)
    ) {
      clearWatchValidationRecovery("the user selected another chapter");
    }
  }

  function handleWatchValidationModal() {
    const modal = findWatchValidationModal();

    if (!modal) {
      watchValidationManualLogged = false;
      return;
    }

    if (watchValidationRecoveryPending) return;

    clearTimeout(timer);
    timer = null;

    if (!autoRecoverPlaybackErrors) {
      if (!watchValidationManualLogged) {
        watchValidationManualLogged = true;
        log(
          "UniPegaso viewing-validation dialog detected. Leaving it open according to the user's preference.",
        );
        setResumeDiscoveryStatus(
          "Errore di convalida della visione rilevato.\nPlumePilot ha lasciato aperto l’avviso e attende una tua scelta.",
          "fallback",
        );
      }

      return;
    }

    watchValidationManualLogged = false;

    if (readWatchValidationRecovery()) {
      if (!watchValidationBlockedLogged) {
        watchValidationBlockedLogged = true;
        log(
          "The UniPegaso viewing-validation dialog returned after automatic recovery. Leaving it open to prevent a reload loop.",
        );
        setResumeDiscoveryStatus(
          "UniPegaso continua a rifiutare la visione della lezione.\nRipristino automatico interrotto per evitare ricaricamenti continui.",
          "fallback",
        );
      }

      return;
    }

    watchValidationRecoveryPending = true;
    writeWatchValidationRecovery();

    log(
      "UniPegaso viewing-validation dialog detected. Confirming its one-time recovery reload.",
    );
    setResumeDiscoveryStatus(
      "UniPegaso non ha convalidato la visione del video.\nLa lezione verrà ricaricata una sola volta dall’inizio.",
      "fallback",
    );

    setTimeout(() => {
      const freshModal = findWatchValidationModal();

      if (!autoRecoverPlaybackErrors) {
        watchValidationRecoveryPending = false;
        clearWatchValidationRecovery(
          "automatic recovery was disabled before confirmation",
        );
        handleWatchValidationModal();
        return;
      }

      if (!freshModal) {
        watchValidationRecoveryPending = false;
        clearWatchValidationRecovery(
          "the dialog disappeared before confirmation",
        );
        return;
      }

      freshModal.okButton.click();
    }, WATCH_VALIDATION_CLICK_DELAY_MS);
  }

  async function verifyWatchValidationRecoveryAfterReload() {
    const recovery = readWatchValidationRecovery();

    if (!recovery) return;

    log(
      "Viewing-validation recovery reload detected. The guard will remain active until UniPegaso registers 100% or the lesson changes:",
      recovery,
    );

    await waitFor(() => (currentLesson() && video() ? true : null), 30000);
    maintainWatchValidationRecovery();
  }

  function sections() {
    return [
      ...document.querySelectorAll("div.flex-wrap.bg-platform-light-gray"),
    ]
      .map((outer) => {
        const header = outer.querySelector(
          ":scope > div.relative.capitalize > div.cursor-pointer",
        );
        const span = header?.querySelector("span");

        return span
          ? { outer, header, span, text: span.textContent.trim() }
          : null;
      })
      .filter(Boolean);
  }

  function chapters() {
    return sections().flatMap((section) =>
      [...section.outer.querySelectorAll("span")]
        .filter((span) => /^\s*\d+\s*-\s+/.test(span.textContent || ""))
        .filter(
          (span) =>
            span.closest("div.flex-wrap.bg-platform-light-gray") ===
            section.outer,
        )
        .map((span) => ({
          span,
          clickable: span,
          text: span.textContent.trim(),
          sectionText: section.text,
        })),
    );
  }

  function chapterIdentity(chapter) {
    return chapter
      ? { sectionText: chapter.sectionText, chapterText: chapter.text }
      : null;
  }

  function findChapter(identity) {
    return (
      chapters().find(
        (chapter) =>
          chapter.sectionText === identity?.sectionText &&
          chapter.text === identity?.chapterText,
      ) || null
    );
  }

  function currentChapter(row) {
    if (!row) return null;

    let result = null;
    for (const h of chapters()) {
      if (
        h.clickable.compareDocumentPosition(row) &
        Node.DOCUMENT_POSITION_FOLLOWING
      )
        result = h;
    }
    return result;
  }

  function chapterRows(ch) {
    const hs = chapters(),
      i = hs.findIndex((x) => x.clickable === ch?.clickable);
    if (i < 0) return [];
    const next = hs[i + 1];
    return lessons().filter((row) => {
      const after =
        ch.clickable.compareDocumentPosition(row) &
        Node.DOCUMENT_POSITION_FOLLOWING;
      const before =
        !next ||
        next.clickable.compareDocumentPosition(row) &
          Node.DOCUMENT_POSITION_PRECEDING;
      return after && before;
    });
  }

  function getProgress(row) {
    const progressElements = [...row.querySelectorAll(".text-xs")];

    const progress = progressElements
      .map((el) => el.textContent.trim())
      .find((text) => /^\d+%$/.test(text));

    return progress ? parseInt(progress, 10) : 0;
  }

  async function waitForLessonCompletion(row, videoElement) {
    if (!row) {
      return false;
    }

    log(
      "Waiting for UniPegaso to register lesson completion:",
      lessonName(row),
    );

    const completed = await waitFor(() => {
      const progress = getProgress(row);

      if (progress >= 100) {
        return true;
      }

      return null;
    });

    if (!completed) {
      if (findWatchValidationModal()) {
        handleWatchValidationModal();
        log(
          "Lesson completion was rejected by UniPegaso. Automatic progression stopped.",
        );
        return false;
      }

      maintainWatchValidationRecovery();
      const watchValidationRecovery = readWatchValidationRecovery();

      const duration = videoElement?.duration;
      const currentTime = videoElement?.currentTime;

      const validDuration = Number.isFinite(duration) && duration > 0;

      const genuinelyReachedEnd =
        videoElement?.ended ||
        (validDuration &&
          Number.isFinite(currentTime) &&
          currentTime >= duration - VIDEO_END_TOLERANCE_SECONDS);

      if (genuinelyReachedEnd) {
        recordKnownVideoProgress(row, getProgress(row));
        if (watchValidationRecovery) {
          clearWatchValidationRecovery(
            "the recovered video genuinely reached its real end",
          );
          log(
            "Recovered video genuinely reached its real end without another validation dialog. Continuing despite UniPegaso not reporting 100%:",
            lessonName(row),
            `${Math.round(currentTime)}s / ${Math.round(duration)}s`,
          );
        } else {
          log(
            "Video reached its real end, but UniPegaso did not register 100%. Continuing:",
            lessonName(row),
            `${Math.round(currentTime)}s / ${Math.round(duration)}s`,
          );
        }

        await sleep(LESSON_CLOSE_DELAY_MS);

        return true;
      }

      if (watchValidationRecovery) {
        log(
          "Viewing-validation recovery is active, but the video has not genuinely reached its real end. Stopping safely.",
        );
        return false;
      }

      log(
        "Lesson did not reach 100% and the video has not genuinely ended:",
        lessonName(row),
      );

      return false;
    }

    recordKnownVideoProgress(row, getProgress(row));
    clearWatchValidationRecovery("UniPegaso registered the lesson at 100%");
    log("Lesson registered as 100%. Waiting for session cleanup.");

    // The sidebar can reach 100% slightly before UniPegaso fully releases
    // the current player/session.
    await sleep(LESSON_CLOSE_DELAY_MS);

    return true;
  }

  function firstUnfinishedVideo(identity) {
    const chapter = findChapter(identity);

    if (!chapter) {
      log("Could not reacquire chapter:", identity);
      return null;
    }

    return (
      chapterRows(chapter).find((row) => {
        const name = lessonName(row).toLowerCase();

        if (!name || name === "obiettivi") {
          return false;
        }

        const progress = getProgress(row);

        log("Checking:", lessonName(row), "Progress:", progress + "%");

        return progress < 100;
      }) || null
    );
  }

  function clickRow(row) {
    const el = row?.querySelector(":scope > div.cursor-pointer");
    if (!el) return false;
    log("Click:", lessonName(row));
    el.scrollIntoView({ block: "center", behavior: "instant" });
    el.click();
    return true;
  }

  function resumeFromObjectives(objectiveRow) {
    const identity = chapterIdentity(currentChapter(objectiveRow));

    if (!identity) {
      log("Could not determine the chapter opened from Obiettivi.");
      return;
    }

    clearTimeout(timer);

    log(
      "Obiettivi selected. Waiting before opening the first unfinished video:",
      identity,
    );

    timer = setTimeout(async () => {
      timer = null;

      if (!enabled || collectingCourseMaterials || courseBatchRunning()) {
        log("Obiettivi handoff cancelled because PlumePilot is not available.");
        return;
      }

      const activeRow = currentLesson();

      // Do not override a lesson that the user selected during the delay.
      if (
        activeRow &&
        activeRow !== objectiveRow &&
        lessonName(activeRow).toLowerCase() !== "obiettivi"
      ) {
        log("Obiettivi handoff cancelled because another lesson is active.");
        return;
      }

      const progressCourseCode = courseCodeFromUrl();
      const progressLessonNumber = lessonNumberFromUrl();
      const objectivePercentage = getProgress(objectiveRow);
      const progressEntry = progressCourseCode && progressLessonNumber
        ? lessonApiCache.get(lessonApiCacheKey(progressCourseCode, progressLessonNumber))
        : null;
      if (objectivePercentage > 0 && progressEntry?.objective?.lpItemId) {
        if (objectivePercentage >= 100 && progressEntry.objective.lpId) {
          markCachedObjectiveCompleted(
            progressCourseCode,
            progressLessonNumber,
            progressEntry.objective.lpId,
            progressEntry.objective.lpItemId,
          );
        } else {
          markKnownCourseProgressActivity(
            progressCourseCode,
            progressLessonNumber,
            "intro",
            progressEntry.objective.lpItemId,
            objectivePercentage,
          );
        }
      }

      const unfinished = firstUnfinishedVideo(identity);

      if (!unfinished) {
        log("No unfinished video was found after Obiettivi:", identity);
        return;
      }

      log("Opening the first unfinished video after Obiettivi.");
      clickRow(unfinished);

      const nextVideo = await waitFor(() => video());

      if (nextVideo) {
        attach(nextVideo);
      } else {
        log("Could not find the video after leaving Obiettivi.");
      }
    }, OBJECTIVES_SETTLE_DELAY_MS);
  }

  document.addEventListener(
    "click",
    (event) => {
      if (
        !event.isTrusted ||
        !enabled ||
        collectingCourseMaterials ||
        courseBatchRunning()
      ) {
        return;
      }

      const row = event.target.closest?.("div.border-t");

      if (!row || lessonName(row).toLowerCase() !== "obiettivi") {
        return;
      }

      resumeFromObjectives(row);
    },
    true,
  );

  async function waitFor(fn, timeout = WAIT_MS) {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const x = fn();

      if (x) {
        return x;
      }

      await sleep(100);
    }

    return null;
  }

  function exportAbortError() {
    const error = new Error("Operazione annullata dall’utente");
    error.name = "AbortError";
    return error;
  }

  function ensureExportNotCancelled(operationId) {
    if (
      exportCancelRequested &&
      operationId &&
      operationId === activeExportOperationId
    ) {
      throw exportAbortError();
    }
  }

  async function exportSleep(ms, operationId) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      ensureExportNotCancelled(operationId);
      await sleep(Math.min(100, end - Date.now()));
    }
    ensureExportNotCancelled(operationId);
  }

  async function waitForExport(fn, timeout, operationId) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      ensureExportNotCancelled(operationId);
      const result = fn();
      if (result) return result;
      await exportSleep(100, operationId);
    }
    ensureExportNotCancelled(operationId);
    return null;
  }

  async function openSection(sectionText, exportOperationId = null) {
    const getSection = () =>
      sections().find((section) => section.text === sectionText);
    const isOpen = () => {
      const section = getSection();
      return !!section?.header.querySelector('[id*="chevron-up"]');
    };
    let section = getSection();

    if (!section) {
      log("Course section not found:", sectionText);
      return false;
    }

    if (isOpen()) {
      return true;
    }

    log("Opening course section:", sectionText);
    section.span.scrollIntoView({ block: "center", behavior: "instant" });
    section.span.click();

    const opened = exportOperationId ? await waitForExport(() => {
      section = getSection();
      return isOpen() && section ? section : null;
    }, WAIT_MS, exportOperationId) : await waitFor(() => {
      section = getSection();
      return isOpen() && section ? section : null;
    });

    if (!opened) {
      log("Course section did not open:", sectionText);
      return false;
    }

    const rendered = exportOperationId
      ? await waitForExport(
          () => chapters().some((chapter) => chapter.sectionText === sectionText),
          WAIT_MS,
          exportOperationId,
        )
      : await waitFor(() =>
          chapters().some((chapter) => chapter.sectionText === sectionText),
        );

    if (!rendered) {
      log(
        "Course section opened but its chapters were not rendered:",
        sectionText,
      );
      return false;
    }

    return true;
  }

  function readChapterRecovery() {
    try {
      const raw = sessionStorage.getItem(CHAPTER_RECOVERY_KEY);

      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function clearChapterRecovery() {
    sessionStorage.removeItem(CHAPTER_RECOVERY_KEY);
  }

  function reloadForChapterRecovery(currentIdentity) {
    const recovery = readChapterRecovery();
    const recoveryKey = JSON.stringify(currentIdentity);

    const attempts =
      recovery?.recoveryKey === recoveryKey ? recovery.attempts || 0 : 0;

    if (attempts >= MAX_CHAPTER_RELOADS) {
      log(
        "Chapter recovery reload already attempted. Stopping to avoid a reload loop.",
      );

      clearChapterRecovery();
      return false;
    }

    sessionStorage.setItem(
      CHAPTER_RECOVERY_KEY,
      JSON.stringify({
        currentIdentity,
        recoveryKey,
        attempts: attempts + 1,
      }),
    );

    log(
      "Chapter contents are stuck. Reloading page for recovery:",
      currentIdentity,
    );

    location.reload();
    return true;
  }

  async function waitForCourseReadyAfterReload(currentIdentity) {
    log("Waiting for UniPegaso course state to initialize.");

    /*
     * The course HTML may appear before UniPegaso's internal Vue/API state
     * is ready. Give the application a minimum initialization window first.
     */
    await sleep(RECOVERY_READY_DELAY_MS);

    let stableSince = null;

    const ready = await waitFor(() => {
      const sectionList = sections();
      const currentExists = sectionList.some(
        (section) => section.text === currentIdentity.sectionText,
      );

      /*
       * Recovery needs a stable chapter structure, not just the first partial
       * DOM render. Require the expected chapter and at least one following
       * chapter to remain present for RECOVERY_STABLE_MS.
       */
      if (!currentExists || sectionList.length < 1) {
        stableSince = null;
        return null;
      }

      if (stableSince === null) {
        stableSince = Date.now();
        return null;
      }

      if (Date.now() - stableSince < RECOVERY_STABLE_MS) {
        return null;
      }

      return true;
    });

    if (!ready) {
      log("UniPegaso course state did not become stable after reload.");

      return false;
    }

    log("UniPegaso course state appears stable.");

    return true;
  }

  async function recoverAfterReload() {
    const recovery = readChapterRecovery();

    if (!recovery?.currentIdentity) {
      return;
    }

    log(
      "Recovering interrupted chapter transition after reload:",
      recovery.currentIdentity,
    );

    const ready = await waitForCourseReadyAfterReload(recovery.currentIdentity);

    if (!ready) {
      log("Could not safely recover after reload.");
      clearChapterRecovery();
      return;
    }

    const oldVideo = video();

    const sectionOpened = await openSection(
      recovery.currentIdentity.sectionText,
    );

    if (!sectionOpened) {
      log("Could not reopen the recovery course section.");
      clearChapterRecovery();
      return;
    }

    const result = await openNextAvailableChapter(
      recovery.currentIdentity,
      oldVideo,
      true,
    );

    if (result === "reloaded") {
      return;
    }

    clearChapterRecovery();

    if (result === true) {
      log("Chapter recovery completed.");
    } else {
      log("Chapter recovery stopped safely.");
    }
  }

  function getChapterContainer(chapter) {
    if (!chapter?.span) {
      return null;
    }

    return chapter.span.closest(
      ".bg-white.text-base.border.font-sans.font-semibold",
    );
  }

  function courseTitle() {
    return (
      document.querySelector("h1[title]")?.getAttribute("title")?.trim() ||
      document.querySelector("h1[title]")?.textContent?.trim() ||
      "UniPegaso course"
    );
  }

  function getChapterDispensa(chapter) {
    const container = getChapterContainer(chapter);

    if (!container) {
      return null;
    }

    const links = [...container.querySelectorAll('a[href*="cloudfront.net"]')];

    return (
      links.find((link) => {
        const href = link.href || "";
        const text = link.textContent
          ?.replace(/\s+/g, " ")
          .trim()
          .toLowerCase();

        return (
          /^https:\/\/[^/]+\.cloudfront\.net\//i.test(href) &&
          /\.pdf(?:[?#]|$)/i.test(href) &&
          text?.includes("visualizza")
        );
      }) || null
    );
  }

  function validMaterialUrl(value) {
    if (typeof value !== "string" || !value) return null;

    try {
      const url = new URL(value);
      return url.protocol === "https:" &&
        /(?:^|\.)cloudfront\.net$/i.test(url.hostname) &&
        /\.pdf$/i.test(url.pathname)
        ? url.href
        : null;
    } catch {
      return null;
    }
  }

  function materialCacheKey(courseCode, lessonNumber) {
    return `${courseCode}:${Number(lessonNumber)}`;
  }

  function cachedMaterial(courseCode, lessonNumber) {
    const entry = materialLinkCache.get(
      materialCacheKey(courseCode, lessonNumber),
    );
    const url = entry?.status === "ready" ? validMaterialUrl(entry.url) : null;
    return url ? { ...entry, url } : null;
  }

  function rememberMaterial(courseCode, entry, url, source) {
    const safeUrl = validMaterialUrl(url);
    if (!safeUrl) return false;

    const key = materialCacheKey(courseCode, entry.lessonNumber);
    const previous = materialLinkCache.get(key);
    materialLinkCache.set(key, {
      status: "ready",
      url: safeUrl,
      section: entry.identity.sectionText,
      chapterTitle: entry.identity.chapterText,
      order: entry.order,
      lessonNumber: entry.lessonNumber,
      source,
      attempts: (previous?.attempts || 0) + 1,
      lastAttemptAt: Date.now(),
      error: null,
    });
    return true;
  }

  function rememberMaterialFailure(courseCode, entry, status, error) {
    const key = materialCacheKey(courseCode, entry.lessonNumber);
    const previous = materialLinkCache.get(key);
    if (previous?.status === "ready" && validMaterialUrl(previous.url)) return;

    materialLinkCache.set(key, {
      status,
      url: null,
      section: entry.identity.sectionText,
      chapterTitle: entry.identity.chapterText,
      order: entry.order,
      lessonNumber: entry.lessonNumber,
      source: previous?.source || null,
      attempts: (previous?.attempts || 0) + 1,
      lastAttemptAt: Date.now(),
      error,
    });
  }

  function cachedMaterialAsExport(courseCode, entry, cached) {
    return {
      chapter: `${entry.identity.sectionText} — ${entry.identity.chapterText}`,
      section: entry.identity.sectionText,
      chapterTitle: entry.identity.chapterText,
      url: cached.url,
      order: entry.order,
      lessonNumber: entry.lessonNumber,
      cacheKey: materialCacheKey(courseCode, entry.lessonNumber),
      fromCache: true,
    };
  }

  async function openSectionForEpub(sectionText, operationId) {
    const hasVisibleChapters = () =>
      chapters().some(
        (chapter) =>
          chapter.sectionText === sectionText &&
          chapter.span.getClientRects().length > 0,
      );

    for (let attempt = 1; attempt <= EPUB_SECTION_ATTEMPTS; attempt++) {
      ensureExportNotCancelled(operationId);
      if (hasVisibleChapters() || (await openSection(sectionText, operationId))) {
        return true;
      }

      if (attempt === EPUB_SECTION_ATTEMPTS) {
        break;
      }

      log(
        `EPUB collector: retrying section ${sectionText} ` +
          `(${attempt + 1}/${EPUB_SECTION_ATTEMPTS}).`,
      );
      await exportSleep(EPUB_RETRY_DELAY_MS, operationId);

      const section = sections().find(
        (candidate) => candidate.text === sectionText,
      );

      if (section?.header) {
        section.header.scrollIntoView({
          block: "center",
          behavior: "instant",
        });
        section.header.click();

        const rendered = await waitForExport(
          hasVisibleChapters,
          WAIT_MS,
          operationId,
        );

        if (rendered) {
          return true;
        }
      }
    }

    return false;
  }

  function closeChapterForEpubRetry(identity) {
    const chapter = findChapter(identity);
    const container = getChapterContainer(chapter);
    const expanded = container?.querySelector('[id*="chevron-up"]');

    if (!chapter?.span || !expanded) {
      return false;
    }

    chapter.span.scrollIntoView({
      block: "center",
      behavior: "instant",
    });
    chapter.span.click();
    return true;
  }

  async function getChapterDispensaForEpub(identity, operationId) {
    for (let attempt = 1; attempt <= EPUB_CHAPTER_ATTEMPTS; attempt++) {
      ensureExportNotCancelled(operationId);
      const sectionReady = await openSectionForEpub(identity.sectionText, operationId);

      if (!sectionReady) {
        await exportSleep(EPUB_RETRY_DELAY_MS, operationId);
        continue;
      }

      const alreadyRendered = getChapterDispensa(findChapter(identity));

      if (alreadyRendered) {
        return alreadyRendered;
      }

      const opened = await openChapter(identity, true, operationId);

      if (opened) {
        const link = await waitForExport(
          () => getChapterDispensa(findChapter(identity)),
          EPUB_LINK_TIMEOUT_MS,
          operationId,
        );

        if (link) {
          return link;
        }
      }

      if (attempt === EPUB_CHAPTER_ATTEMPTS) {
        break;
      }

      log(
        `EPUB collector: Dispensa not ready for ${identity.chapterText}; ` +
          `reopening chapter (${attempt + 1}/${EPUB_CHAPTER_ATTEMPTS}).`,
      );
      closeChapterForEpubRetry(identity);
      await exportSleep(EPUB_RETRY_DELAY_MS, operationId);
    }

    return null;
  }

  async function resetSectionForEpub(sectionText, operationId) {
    const hasVisibleChapters = () =>
      chapters().some(
        (chapter) =>
          chapter.sectionText === sectionText &&
          chapter.span.getClientRects().length > 0,
      );
    let section = sections().find(
      (candidate) => candidate.text === sectionText,
    );

    if (!section) {
      return false;
    }

    if (hasVisibleChapters()) {
      ensureExportNotCancelled(operationId);
      log("EPUB recovery: collapsing section:", sectionText);
      section.header.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
      section.header.click();
      await waitForExport(() => !hasVisibleChapters(), 5000, operationId);
      await exportSleep(EPUB_RETRY_DELAY_MS, operationId);
    }

    section = sections().find((candidate) => candidate.text === sectionText);

    if (!section) {
      return false;
    }

    log("EPUB recovery: reopening section:", sectionText);
    section.header.scrollIntoView({
      block: "center",
      behavior: "instant",
    });
    section.header.click();

    const reopened = await waitForExport(
      hasVisibleChapters,
      EPUB_LINK_TIMEOUT_MS,
      operationId,
    );

    if (reopened) {
      await exportSleep(EPUB_RETRY_DELAY_MS, operationId);
      return true;
    }

    return openSectionForEpub(sectionText, operationId);
  }

  async function recoverMissingEpubDispense(materials, missing, operationId) {
    const retryable = missing.filter((item) => item.identity);
    const courseCode = courseCodeFromUrl();

    if (retryable.length === 0) {
      return;
    }

    const sectionNames = [
      ...new Set(retryable.map((item) => item.identity.sectionText)),
    ];

    for (
      let sectionIndex = 0;
      sectionIndex < sectionNames.length;
      sectionIndex++
    ) {
      ensureExportNotCancelled(operationId);
      const sectionText = sectionNames[sectionIndex];
      setExportCollectionStatus(
        `Recupero ${sectionIndex + 1}/${sectionNames.length}: ripristino della sezione ${sectionText}`,
        false,
        operationId,
      );

      const sectionReady = await resetSectionForEpub(sectionText, operationId);

      if (!sectionReady) {
        log("EPUB recovery: section could not be reset:", sectionText);
        continue;
      }

      const sectionMissing = retryable.filter(
        (item) => item.identity.sectionText === sectionText,
      );

      for (let itemIndex = 0; itemIndex < sectionMissing.length; itemIndex++) {
        ensureExportNotCancelled(operationId);
        const item = sectionMissing[itemIndex];
        setExportCollectionStatus(
          `Recupero: ${itemIndex + 1}/${sectionMissing.length} in ${sectionText}: ${item.identity.chapterText}`,
          false,
          operationId,
        );

        const link = await getChapterDispensaForEpub(item.identity, operationId);

        if (!link) {
          continue;
        }

        materials.push({
          chapter: item.chapter,
          section: item.identity.sectionText,
          chapterTitle: item.identity.chapterText,
          url: link.href,
          order: item.order,
          lessonNumber: item.lessonNumber,
          cacheKey:
            courseCode && item.lessonNumber
              ? materialCacheKey(courseCode, item.lessonNumber)
              : null,
          fromCache: false,
        });

        if (courseCode && item.lessonNumber) {
          rememberMaterial(
            courseCode,
            {
              identity: item.identity,
              order: item.order,
              lessonNumber: item.lessonNumber,
            },
            link.href,
            "visual-recovery",
          );
        }

        const missingIndex = missing.indexOf(item);
        if (missingIndex >= 0) {
          missing.splice(missingIndex, 1);
        }

        log("EPUB recovery: Dispensa recovered:", item.chapter);
        await exportSleep(EPUB_CHAPTER_PACING_MS, operationId);
      }
    }

    materials.sort((first, second) => (first.order ?? 0) - (second.order ?? 0));
  }

  async function recoverMissingPdfDispense(materials, missing, operationId) {
    const retryable = missing.filter((item) => item.identity);
    const courseCode = courseCodeFromUrl();

    for (let index = 0; index < retryable.length; index++) {
      ensureExportNotCancelled(operationId);
      const item = retryable[index];
      setExportCollectionStatus(
        `Recupero PDF ${index + 1}/${retryable.length}: ${item.identity.chapterText}`,
        false,
        operationId,
      );

      const opened = await openChapter(item.identity, false, operationId);
      const link = opened
        ? await waitForExport(
            () => getChapterDispensa(findChapter(item.identity)),
            WAIT_MS,
            operationId,
          )
        : null;

      if (!link) {
        log("PDF recovery: Dispensa still unavailable:", item.chapter);
        continue;
      }

      materials.push({
        chapter: item.chapter,
        section: item.identity.sectionText,
        chapterTitle: item.identity.chapterText,
        url: link.href,
        order: item.order,
        lessonNumber: item.lessonNumber,
        cacheKey:
          courseCode && item.lessonNumber
            ? materialCacheKey(courseCode, item.lessonNumber)
            : null,
        fromCache: false,
      });

      if (courseCode && item.lessonNumber) {
        rememberMaterial(
          courseCode,
          {
            identity: item.identity,
            order: item.order,
            lessonNumber: item.lessonNumber,
          },
          link.href,
          "visual-recovery",
        );
      }

      const missingIndex = missing.indexOf(item);
      if (missingIndex >= 0) missing.splice(missingIndex, 1);
      log("PDF recovery: Dispensa recovered:", item.chapter);
    }

    materials.sort((first, second) => (first.order ?? 0) - (second.order ?? 0));
  }

  function exportCollectionToast() {
    return window.StudyWingNotifications;
  }

  function setExportCollectionStatus(
    message,
    isError = false,
    operationId = null,
  ) {
    const notifications = exportCollectionToast();
    const key = `export:${operationId || activeExportOperationId || "current"}`;
    lastExportNotification = { message, isError, key };
    notifications?.show({ message, type: isError ? "error" : "info", key, progress: true });
    window.postMessage(
      { type: "PEGASO_EXPORT_COLLECTION_STATUS", operationId, message },
      "*",
    );
  }

  function removeExportCollectionToastAfter(message, delayMs) {
    if (lastExportNotification?.message !== message) return;
    window.StudyWingNotifications?.show({
      message,
      type: lastExportNotification.isError ? "error" : "success",
      key: lastExportNotification.key,
      terminal: true,
      durationMs: delayMs,
    });
  }

  function hasRequiredLessonData(response, requiredData) {
    if (response.data?.dataAvailable !== true) return false;
    if (requiredData === "material") return Boolean(response.data.material);
    if (requiredData === "test") return Boolean(response.data.test);
    if (requiredData === "objective") return Boolean(response.data.objective);
    if (requiredData === "playback") {
      return response.data.playbackDataComplete === true;
    }
    return true;
  }

  function lessonApiCacheKey(courseCode, lessonNumber) {
    return `${courseCode}:${Number(lessonNumber)}`;
  }

  function rememberLessonResponse(
    courseCode,
    lessonNumber,
    response,
    routeIdentity = null,
    preserveConflictingCache = false,
  ) {
    if (!response.ok || response.data?.dataAvailable !== true) return;

    const key = lessonApiCacheKey(courseCode, lessonNumber);
    const storedPrevious = lessonApiCache.get(key) || {};
    const routeKey = courseProgressRouteKey(courseCode, routeIdentity);
    if (
      preserveConflictingCache &&
      routeKey &&
      storedPrevious.routeKey &&
      storedPrevious.routeKey !== routeKey
    ) {
      rememberCourseProgressSnapshot(
        courseCode,
        lessonNumber,
        response.data.progressItems,
        response.data.progressDataComplete === true,
        routeIdentity,
      );
      return;
    }
    const sameRoute =
      !routeKey ||
      !storedPrevious.routeKey ||
      storedPrevious.routeKey === routeKey;
    const previous = sameRoute ? storedPrevious : {};
    const cacheActivity = (activity, previousActivity) => {
      if (!activity) return null;
      const lpId = Number(activity.lp_id);
      const lpItemId = Number(activity.lp_item_id);
      const sameActivity =
        previousActivity?.lpId === lpId &&
        previousActivity?.lpItemId === lpItemId;
      const percentage = Math.max(
        Number(activity.percentage) || 0,
        sameActivity ? Number(previousActivity.percentage) || 0 : 0,
      );
      return {
        id: Number(activity.id) || previousActivity?.id || null,
        lpId,
        lpItemId,
        testImported: Number(activity.testImported) === 1
          ? 1
          : previousActivity?.testImported || 0,
        testEmpty: Number(activity.testEmpty) === 1
          ? 1
          : previousActivity?.testEmpty || 0,
        percentage,
        completed: percentage >= 100 || (sameActivity && previousActivity.completed === true),
        title: activity.title || previousActivity?.title || null,
      };
    };
    const objective = response.data.objective
      ? cacheActivity(response.data.objective, previous.objective)
      : previous.objective || null;
    const test = response.data.test
      ? cacheActivity(response.data.test, previous.test)
      : previous.test || null;
    const responseVideos = Array.isArray(response.data.playbackItems)
      ? response.data.playbackItems.map((item) => {
          const lpItemId = Number(item.lp_item_id) || null;
          const previousItem = previous.videos?.find(
            (candidate) => candidate.lp_item_id === lpItemId,
          );
          return {
            contentType: item.contentType,
            lp_item_id: lpItemId,
            lp_id: Number(item.lp_id) || null,
            previous_item_id: Number.isFinite(Number(item.previous_item_id))
              ? Number(item.previous_item_id)
              : null,
            next_item_id: Number.isFinite(Number(item.next_item_id))
              ? Number(item.next_item_id)
              : null,
            percentage: Math.max(
              Number(item.percentage) || 0,
              Number(previousItem?.percentage) || 0,
            ),
            paragNumber: Number(item.paragNumber) || null,
            title: item.title || previousItem?.title || null,
          };
        })
      : [];
    const playbackDataComplete =
      response.data.playbackDataComplete === true ||
      previous.playbackDataComplete === true;
    const videos = response.data.playbackDataComplete === true || !previous.videos?.length
      ? responseVideos
      : previous.videos;
    const responseProgressItems = normalizedProgressItems(response.data.progressItems);
    const previousProgressByKey = new Map(
      (previous.progressItems || []).map((item) => [progressItemKey(item), item]),
    );
    const progressItems = response.data.progressDataComplete === true
      ? responseProgressItems.map((item) => {
          const old = previousProgressByKey.get(progressItemKey(item));
          return old
            ? { ...item, percentage: Math.max(old.percentage, item.percentage) }
            : item;
        })
      : previous.progressItems || [];
    const progressDataComplete =
      response.data.progressDataComplete === true || previous.progressDataComplete === true;
    const nextEntry = {
      dataAvailable: true,
      objective,
      videos,
      playbackDataComplete,
      test,
      progressItems,
      progressDataComplete,
      routeKey,
      material: response.data.material || previous.material || null,
      fetchedAt: Date.now(),
    };
    lessonApiCache.set(key, nextEntry);
    rememberCourseProgressSnapshot(
      courseCode,
      lessonNumber,
      progressItems,
      progressDataComplete,
      routeIdentity,
    );
  }

  function cachedLessonResponse(
    courseCode,
    lessonNumber,
    requiredData,
    allowStaleMutableData = false,
  ) {
    const entry = lessonApiCache.get(lessonApiCacheKey(courseCode, lessonNumber));
    if (entry?.dataAvailable !== true) return null;
    const fresh = Date.now() - Number(entry.fetchedAt || 0) <= API_LESSON_CACHE_FRESH_MS;
    if (!allowStaleMutableData) {
      if (requiredData === "data" && !fresh) return null;
      if (requiredData === "playback" && !fresh) return null;
      if (requiredData === "test" && !fresh && entry.test?.completed !== true) return null;
      if (requiredData === "objective" && !fresh && entry.objective?.completed !== true) return null;
    }
    const activityPayload = (activity) => activity ? {
      id: activity.id,
      lp_item_id: activity.lpItemId,
      lp_id: activity.lpId,
      testImported: activity.testImported || 0,
      testEmpty: activity.testEmpty || 0,
      percentage: activity.completed ? 100 : activity.percentage,
      title: activity.title,
    } : null;
    const response = {
      ok: true,
      cached: true,
      data: {
        dataAvailable: true,
        objective: activityPayload(entry.objective),
        test: activityPayload(entry.test),
        material: entry.material,
        playbackItems: entry.videos || [],
        playbackDataComplete: entry.playbackDataComplete === true,
        progressItems: entry.progressItems || [],
        progressDataComplete: entry.progressDataComplete === true,
      },
    };
    return hasRequiredLessonData(response, requiredData) ? response : null;
  }

  function cachedCompletedTest(courseCode, lessonNumber) {
    const entry = lessonApiCache.get(
      lessonApiCacheKey(courseCode, lessonNumber),
    );
    return entry?.test?.completed === true ? entry.test : null;
  }

  function cachedCompletedObjective(courseCode, lessonNumber) {
    const entry = lessonApiCache.get(lessonApiCacheKey(courseCode, lessonNumber));
    return entry?.objective?.completed === true ? entry.objective : null;
  }

  function markCachedTestCompleted(
    courseCode,
    lessonNumber,
    lpId,
    lpItemId,
  ) {
    const key = lessonApiCacheKey(courseCode, lessonNumber);
    const previous = lessonApiCache.get(key) || {};
    const progressItems = (previous.progressItems || []).map((item) =>
      item.contentType === "test" && item.lpItemId === Number(lpItemId)
        ? { ...item, percentage: 100 }
        : item,
    );
    markKnownCourseProgressActivity(
      courseCode,
      lessonNumber,
      "test",
      lpItemId,
      100,
    );
    lessonApiCache.set(key, {
      ...previous,
      test: {
        id: previous.test?.id || null,
        lpId: Number(lpId),
        lpItemId: Number(lpItemId),
        testImported: previous.test?.testImported || 0,
        testEmpty: previous.test?.testEmpty || 0,
        percentage: 100,
        completed: true,
        title: previous.test?.title || null,
      },
      progressItems,
      fetchedAt: Date.now(),
    });
  }

  function markCachedObjectiveCompleted(courseCode, lessonNumber, lpId, lpItemId) {
    const key = lessonApiCacheKey(courseCode, lessonNumber);
    const previous = lessonApiCache.get(key) || {};
    const progressItems = (previous.progressItems || []).map((item) =>
      item.contentType === "intro" && item.lpItemId === Number(lpItemId)
        ? { ...item, percentage: 100 }
        : item,
    );
    markKnownCourseProgressActivity(
      courseCode,
      lessonNumber,
      "intro",
      lpItemId,
      100,
    );
    lessonApiCache.set(key, {
      ...previous,
      objective: {
        lpId: Number(lpId),
        lpItemId: Number(lpItemId),
        percentage: 100,
        completed: true,
        title: previous.objective?.title || "Obiettivi",
      },
      progressItems,
      fetchedAt: Date.now(),
    });
  }

  async function completeTestViaApi(courseCode, lessonNumber, test) {
    const completed = await turboApiRequest("complete", {
      courseCode,
      lpItemId: test.lp_item_id,
      lpId: test.lp_id,
    });

    if (completed.ok && completed.data?.completed === true) {
      markCachedTestCompleted(
        courseCode,
        lessonNumber,
        test.lp_id,
        test.lp_item_id,
      );
    }

    return completed;
  }

  async function completeObjectiveViaApi(courseCode, lessonNumber, objective) {
    const completed = await turboApiRequest("complete", {
      courseCode,
      lpItemId: objective.lp_item_id,
      lpId: objective.lp_id,
    });
    if (completed.ok && completed.data?.completed === true) {
      markCachedObjectiveCompleted(
        courseCode,
        lessonNumber,
        objective.lp_id,
        objective.lp_item_id,
      );
    }
    return completed;
  }

  async function requestLessonWithRetry(
    courseCode,
    lessonNumber,
    requiredData = "data",
    onRetry = null,
    exportOperationId = null,
    lessonLpId = lessonNumber,
    allowStaleMutableCache = false,
    lessonParagraphId = lessonLpId,
  ) {
    const cachedResponse = cachedLessonResponse(
      courseCode,
      lessonNumber,
      requiredData,
      allowStaleMutableCache,
    );
    if (cachedResponse) return cachedResponse;

    let response = null;
    for (
      let attempt = 0;
      attempt <= API_LESSON_RETRY_DELAYS_MS.length;
      attempt++
    ) {
      if (exportOperationId) ensureExportNotCancelled(exportOperationId);
      if (attempt === 0) {
        log("Detailed lesson API route:", {
          displayOrder: lessonNumber,
          lpId: lessonLpId,
          paragraphId: lessonParagraphId,
          requiredData,
        });
      }
      response = await turboApiRequest("lesson", {
        courseCode,
        lessonNumber,
        lpId: lessonLpId,
        paragraphId: lessonParagraphId,
      });
      if (exportOperationId) ensureExportNotCancelled(exportOperationId);
      if (!response.ok) return response;

      rememberLessonResponse(courseCode, lessonNumber, response, {
        lpId: lessonLpId,
        paragraphId: lessonParagraphId,
      });

      if (hasRequiredLessonData(response, requiredData)) return response;

      if (attempt === API_LESSON_RETRY_DELAYS_MS.length) break;
      const delay = API_LESSON_RETRY_DELAYS_MS[attempt];
      log(
        `API lesson data incomplete for module ${lessonNumber}; ` +
          `retry ${attempt + 1}/${API_LESSON_RETRY_DELAYS_MS.length} in ${delay}ms.`,
      );
      onRetry?.(attempt + 1, API_LESSON_RETRY_DELAYS_MS.length, delay);
      if (exportOperationId) await exportSleep(delay, exportOperationId);
      else await sleep(delay);
    }

    return { ok: false, error: "LESSON_DATA_INCOMPLETE" };
  }

  async function apiCourseOutline(
    initialSections,
    onSection = null,
    exportOperationId = null,
    shouldCancel = null,
  ) {
    const outline = [];
    for (
      let sectionIndex = 0;
      sectionIndex < initialSections.length;
      sectionIndex++
    ) {
      if (exportOperationId) ensureExportNotCancelled(exportOperationId);
      if (shouldCancel?.()) return null;
      const sectionText = initialSections[sectionIndex];
      onSection?.(sectionText, sectionIndex, initialSections.length);
      if (!(await openSection(sectionText, exportOperationId))) return null;
      if (shouldCancel?.()) return null;
      const readChapters = () => {
        const rendered = chapters()
          .filter((chapter) => chapter.sectionText === sectionText)
          .map(chapterIdentity);
        return rendered.length ? rendered : null;
      };
      const sectionChapters = exportOperationId
        ? await waitForExport(readChapters, WAIT_MS, exportOperationId)
        : await waitFor(readChapters);
      if (!sectionChapters) return null;
      for (
        let chapterIndex = 0;
        chapterIndex < sectionChapters.length;
        chapterIndex++
      ) {
        outline.push({
          identity: sectionChapters[chapterIndex],
          sectionIndex,
          sectionCount: initialSections.length,
          chapterIndex,
          chapterCount: sectionChapters.length,
          order: outline.length,
          lessonNumber: outline.length + 1,
        });
      }
    }
    return outline.length ? outline : null;
  }

  async function apiMaterialOutline(courseCode, initialSections, operationId) {
    const sectionSignature = initialSections.join("\u001f");
    const cached = materialOutlineCache.get(courseCode);

    if (cached?.sectionSignature === sectionSignature && cached.outline?.length) {
      setExportCollectionStatus(
        `Struttura del corso recuperata dalla cache: ${cached.outline.length} dispense.`,
        false,
        operationId,
      );
      return cached.outline;
    }

    const outline = await apiCourseOutline(
      initialSections,
      (sectionText, sectionIndex, sectionCount) =>
        setExportCollectionStatus(
          `Preparazione API: lettura sezione ${sectionIndex + 1}/${sectionCount}: ${sectionText}`,
          false,
          operationId,
        ),
      operationId,
    );

    if (outline?.length) {
      materialOutlineCache.set(courseCode, { sectionSignature, outline });
    }

    return outline;
  }

  function courseIndexRouteMap(courseIndex, outline) {
    const entries = Array.isArray(courseIndex) ? courseIndex : [];
    const availableIndexes = new Set(entries.map((_, index) => index));
    const routes = new Map();

    for (const outlineEntry of outline || []) {
      const expectedTitle = normalizedText(
        outlineEntry?.identity?.chapterText,
      ).toLocaleLowerCase("it");
      const titleMatches = [...availableIndexes].filter((index) =>
        expectedTitle &&
        normalizedText(entries[index]?.title).toLocaleLowerCase("it") === expectedTitle,
      );
      let selectedIndex = titleMatches.length === 1 ? titleMatches[0] : null;

      if (selectedIndex === null) {
        const orderMatches = [...availableIndexes].filter(
          (index) => entries[index]?.displayOrder === outlineEntry.lessonNumber,
        );
        if (orderMatches.length === 1) selectedIndex = orderMatches[0];
      }

      if (selectedIndex === null) continue;
      availableIndexes.delete(selectedIndex);
      routes.set(outlineEntry.lessonNumber, entries[selectedIndex]);
    }

    return routes;
  }

  async function collectCourseMaterialsViaApi(
    format,
    initialSections,
    materials,
    missing,
    operationId,
  ) {
    const courseCode = courseCodeFromUrl();
    if (!courseCode) {
      log("API material collection unavailable: course code not found.");
      return false;
    }

    const outline = await apiMaterialOutline(
      courseCode,
      initialSections,
      operationId,
    );
    if (!outline) {
      log("API material collection unavailable: course outline not found.");
      return false;
    }

    const courseIndex = await getPlaybackCourseIndex(courseCode, {
      allowCollection: true,
      ignoreEnabled: true,
    });
    const routeByLessonNumber = courseIndexRouteMap(courseIndex, outline);
    const lessonRoute = (lessonNumber) => {
      const entry = routeByLessonNumber.get(lessonNumber);
      return {
        lpId: entry?.lpId || lessonNumber,
        paragraphId: entry?.id || lessonNumber,
      };
    };

    const cachedCount = outline.filter((entry) =>
      cachedMaterial(courseCode, entry.lessonNumber),
    ).length;
    setExportCollectionStatus(
      cachedCount
        ? `${cachedCount}/${outline.length} dispense già disponibili in cache.`
        : `Verifica accesso API per ${outline.length} dispense…`,
      false,
      operationId,
    );
    const firstCached = cachedMaterial(courseCode, 1);
    const firstLesson = firstCached
      ? { ok: true, data: { material: { url: firstCached.url } }, cached: true }
      : await requestLessonWithRetry(
          courseCode,
          1,
          "material",
          (attempt, total) =>
            setExportCollectionStatus(
              `Risposta incompleta per ${outline[0].identity.chapterText}. Nuovo tentativo ${attempt}/${total}…`,
              false,
              operationId,
            ),
          operationId,
          lessonRoute(1).lpId,
          false,
          lessonRoute(1).paragraphId,
        );
    const apiAccessible =
      firstLesson.ok || firstLesson.error === "LESSON_DATA_INCOMPLETE";
    if (!apiAccessible) {
      log(
        "API material collection unavailable; using visual fallback:",
        firstLesson.error,
      );
      return false;
    }

    const apiMaterials = [];
    const apiMissing = [];
    log("API material collection started.", {
      courseCode,
      modules: outline.length,
      format,
    });

    for (let index = 0; index < outline.length; index++) {
      ensureExportNotCancelled(operationId);
      const entry = outline[index];
      const identity = entry.identity;
      const qualifiedChapter = `${identity.sectionText} — ${identity.chapterText}`;
      const cached = cachedMaterial(courseCode, entry.lessonNumber);

      if (cached) {
        apiMaterials.push(cachedMaterialAsExport(courseCode, entry, cached));
        continue;
      }

      setExportCollectionStatus(
        `Raccolta API ${index + 1}/${outline.length}: ${identity.chapterText}`,
        false,
        operationId,
      );

      const lesson =
        index === 0
          ? firstLesson
          : await requestLessonWithRetry(
              courseCode,
              entry.lessonNumber,
              "material",
              (attempt, total) =>
                setExportCollectionStatus(
                  `Risposta incompleta per ${identity.chapterText}. Nuovo tentativo ${attempt}/${total}…`,
                  false,
                  operationId,
                ),
              operationId,
              lessonRoute(entry.lessonNumber).lpId,
              false,
              lessonRoute(entry.lessonNumber).paragraphId,
            );

      if (!lesson.ok) {
        log(
          `API material collection: module ${entry.lessonNumber} failed:`,
          lesson.error,
        );
        const failure = {
          chapter: qualifiedChapter,
          reason: "Dati della dispensa non disponibili tramite API",
        };
        failure.identity = identity;
        failure.order = entry.order;
        failure.lessonNumber = entry.lessonNumber;
        apiMissing.push(failure);
        rememberMaterialFailure(
          courseCode,
          entry,
          "error",
          lesson.error || failure.reason,
        );
        if (index + 1 < outline.length) {
          await exportSleep(API_MATERIAL_PACING_MS, operationId);
        }
        continue;
      }

      const material = lesson.data?.material;
      const materialUrl = validMaterialUrl(material?.url);
      if (!materialUrl) {
        const failure = {
          chapter: qualifiedChapter,
          reason: "Dispensa non trovata",
        };
        failure.identity = identity;
        failure.order = entry.order;
        failure.lessonNumber = entry.lessonNumber;
        apiMissing.push(failure);
        rememberMaterialFailure(
          courseCode,
          entry,
          "missing",
          failure.reason,
        );
        if (index + 1 < outline.length) {
          await exportSleep(API_MATERIAL_PACING_MS, operationId);
        }
        continue;
      }

      apiMaterials.push({
        chapter: qualifiedChapter,
        section: identity.sectionText,
        chapterTitle: identity.chapterText,
        url: materialUrl,
        order: entry.order,
        lessonNumber: entry.lessonNumber,
        cacheKey: materialCacheKey(courseCode, entry.lessonNumber),
        fromCache: false,
      });
      rememberMaterial(courseCode, entry, materialUrl, "api");
      if (index + 1 < outline.length) {
        await exportSleep(API_MATERIAL_PACING_MS, operationId);
      }
    }

    if (!apiMaterials.length) {
      log(
        "API material collection returned no usable PDF links; using visual fallback.",
      );
      return false;
    }

    materials.push(...apiMaterials);
    missing.push(...apiMissing);
    materials.sort((first, second) => (first.order ?? 0) - (second.order ?? 0));
    log("API material collection completed.", {
      total: outline.length,
      reused: cachedCount,
      requested: outline.length - cachedCount,
      ready: apiMaterials.length,
      missing: apiMissing.length,
    });
    return true;
  }

  async function collectCourseMaterials(requestedFormat, operationId) {
    const format = ["materials", "epub"].includes(requestedFormat)
      ? requestedFormat
      : "pdf";
    const collectionFormat = format === "materials" ? "epub" : format;
    const label = format === "materials" ? "dispense" : format.toUpperCase();
    if (collectingCourseMaterials) {
      setExportCollectionStatus(
        format === "materials"
          ? "La raccolta delle dispense è già in esecuzione."
          : `La raccolta per il ${label} è già in esecuzione.`,
        true,
        operationId,
      );
      window.postMessage(
        { type: "PEGASO_EXPORT_COLLECTION_FAILED", operationId },
        "*",
      );
      return;
    }

    if (courseBatchRunning()) {
      setExportCollectionStatus(
        "Interrompi l’operazione automatica prima di raccogliere le dispense.",
        true,
        operationId,
      );
      window.postMessage(
        { type: "PEGASO_EXPORT_COLLECTION_FAILED", operationId },
        "*",
      );
      return;
    }

    if (window !== window.top) {
      return;
    }

    const initialSections = sections().map((section) => section.text);

    if (initialSections.length === 0) {
      setExportCollectionStatus(
        "Nessuna sezione trovata. Apri prima la pagina dei contenuti del corso.",
        true,
        operationId,
      );
      window.postMessage(
        { type: "PEGASO_EXPORT_COLLECTION_FAILED", operationId },
        "*",
      );
      return;
    }

    collectingCourseMaterials = true;
    exportCancelRequested = false;
    activeExportOperationId = operationId;
    const materials = [];
    const missing = [];
    let chapterOrder = 0;
    const collectionCourseCode = courseCodeFromUrl();

    try {
      ensureExportNotCancelled(operationId);
      const apiHandled = await collectCourseMaterialsViaApi(
        collectionFormat,
        initialSections,
        materials,
        missing,
        operationId,
      );

      if (!apiHandled) {
        ensureExportNotCancelled(operationId);
        materials.length = 0;
        missing.length = 0;
        setExportCollectionStatus(
          "API non disponibile. Avvio della raccolta visuale di sicurezza…",
          false,
          operationId,
        );

        for (
          let sectionIndex = 0;
          sectionIndex < initialSections.length;
          sectionIndex++
        ) {
          ensureExportNotCancelled(operationId);
          const sectionText = initialSections[sectionIndex];
          setExportCollectionStatus(
            `Apertura sezione ${sectionIndex + 1} di ${initialSections.length}: ${sectionText}`,
            false,
            operationId,
          );

          const sectionOpened =
            collectionFormat === "epub"
              ? await openSectionForEpub(sectionText, operationId)
              : await openSection(sectionText, operationId);

          if (!sectionOpened) {
            missing.push({
              chapter: sectionText,
              reason: "Impossibile aprire la sezione",
            });
            continue;
          }

          const sectionChapters = chapters()
            .filter((chapter) => chapter.sectionText === sectionText)
            .map(chapterIdentity);

          for (
            let chapterIndex = 0;
            chapterIndex < sectionChapters.length;
            chapterIndex++
          ) {
            ensureExportNotCancelled(operationId);
            const identity = sectionChapters[chapterIndex];
            const qualifiedChapter = `${identity.sectionText} — ${identity.chapterText}`;
            const materialOrder = chapterOrder++;
            const cacheEntry = {
              identity,
              order: materialOrder,
              lessonNumber: materialOrder + 1,
            };
            const cached = collectionCourseCode
              ? cachedMaterial(collectionCourseCode, cacheEntry.lessonNumber)
              : null;

            if (cached) {
              materials.push(
                cachedMaterialAsExport(
                  collectionCourseCode,
                  cacheEntry,
                  cached,
                ),
              );
              continue;
            }

            setExportCollectionStatus(
              `Sezione ${sectionIndex + 1}/${initialSections.length}, capitolo ${chapterIndex + 1}/${sectionChapters.length}: ${identity.chapterText}`,
              false,
              operationId,
            );

            let link = null;

            if (collectionFormat === "epub") {
              link = await getChapterDispensaForEpub(identity, operationId);
            } else {
              const opened = await openChapter(identity, false, operationId);

              if (!opened) {
                missing.push({
                  chapter: qualifiedChapter,
                  reason: "Impossibile aprire il capitolo",
                  identity,
                  order: materialOrder,
                  lessonNumber: cacheEntry.lessonNumber,
                });
                if (collectionCourseCode) {
                  rememberMaterialFailure(
                    collectionCourseCode,
                    cacheEntry,
                    "error",
                    "Impossibile aprire il capitolo",
                  );
                }
                continue;
              }

              link = await waitForExport(
                () => getChapterDispensa(findChapter(identity)),
                WAIT_MS,
                operationId,
              );
            }

            if (!link) {
              const failure = {
                chapter: qualifiedChapter,
                reason: "Dispensa non trovata",
              };

              if (collectionFormat === "epub") {
                failure.identity = identity;
                failure.order = materialOrder;
              }

              failure.lessonNumber = cacheEntry.lessonNumber;
              if (collectionCourseCode) {
                rememberMaterialFailure(
                  collectionCourseCode,
                  cacheEntry,
                  "missing",
                  failure.reason,
                );
              }

              missing.push(failure);
              continue;
            }

            materials.push({
              chapter: qualifiedChapter,
              section: identity.sectionText,
              chapterTitle: identity.chapterText,
              url: link.href,
              order: materialOrder,
              lessonNumber: cacheEntry.lessonNumber,
              cacheKey: collectionCourseCode
                ? materialCacheKey(collectionCourseCode, cacheEntry.lessonNumber)
                : null,
              fromCache: false,
            });

            if (collectionCourseCode) {
              rememberMaterial(
                collectionCourseCode,
                cacheEntry,
                link.href,
                "visual",
              );
            }

            if (collectionFormat === "epub") {
              await exportSleep(EPUB_CHAPTER_PACING_MS, operationId);
            }
          }
        }
      }

      if (
        apiHandled &&
        collectionFormat === "pdf" &&
        missing.some((item) => item.identity)
      ) {
        ensureExportNotCancelled(operationId);
        setExportCollectionStatus(
          `Raccolta API completata: ${missing.filter((item) => item.identity).length} dispense da recuperare visivamente…`,
          false,
          operationId,
        );
        await recoverMissingPdfDispense(materials, missing, operationId);
      }

      if (collectionFormat === "epub" && missing.some((item) => item.identity)) {
        ensureExportNotCancelled(operationId);
        setExportCollectionStatus(
          `Prima raccolta completata: ${missing.filter((item) => item.identity).length} dispense mancanti. Avvio del recupero…`,
          false,
          operationId,
        );
        await recoverMissingEpubDispense(materials, missing, operationId);
      }

      ensureExportNotCancelled(operationId);

      materials.sort(
        (first, second) => (first.order ?? 0) - (second.order ?? 0),
      );

      if (materials.length === 0) {
        const noMaterialsMessage = format === "materials"
          ? "Nessuna dispensa trovata. L’esportazione non è stata avviata."
          : `Nessuna dispensa trovata. La creazione del ${label} non è stata avviata.`;
        setExportCollectionStatus(
          noMaterialsMessage,
          true,
          operationId,
        );
        window.postMessage(
          { type: "PEGASO_EXPORT_COLLECTION_FAILED", operationId },
          "*",
        );
        removeExportCollectionToastAfter(noMaterialsMessage, 15000);
        return;
      }

      setExportCollectionStatus(
        format === "materials"
          ? `Raccolte ${materials.length} dispense. Apertura della scelta del formato…`
          : `Raccolte ${materials.length} dispense. Apertura dello strumento ${label}…`,
        false,
        operationId,
      );

      window.postMessage(
        {
          type: "PEGASO_COURSE_MATERIALS_COLLECTED",
          format,
          operationId,
          payload: {
            courseTitle: courseTitle(),
            materials,
            missing,
          },
        },
        "*",
      );

      removeExportCollectionToastAfter(
        format === "materials"
          ? `Raccolte ${materials.length} dispense. Apertura della scelta del formato…`
          : `Raccolte ${materials.length} dispense. Apertura dello strumento ${label}…`,
        8000,
      );
    } catch (error) {
      if (error?.name === "AbortError") {
        log(`Course ${label} collection cancelled by the user.`);
        const cancelledMessage = `Raccolta ${label} annullata. Nessun file è stato creato.`;
        setExportCollectionStatus(
          cancelledMessage,
          false,
          operationId,
        );
        window.postMessage(
          { type: "PEGASO_EXPORT_COLLECTION_FAILED", operationId },
          "*",
        );
        removeExportCollectionToastAfter(cancelledMessage, 8000);
        return;
      }
      log(`Course ${label} collection failed:`, error);
      const failedMessage = `Raccolta ${label} non riuscita: ${error?.message || "Errore sconosciuto"}`;
      setExportCollectionStatus(
        failedMessage,
        true,
        operationId,
      );
      window.postMessage(
        { type: "PEGASO_EXPORT_COLLECTION_FAILED", operationId },
        "*",
      );
      removeExportCollectionToastAfter(failedMessage, 15000);
    } finally {
      collectingCourseMaterials = false;
      exportCancelRequested = false;
      activeExportOperationId = null;

      if (enabled) {
        resumeIfVideoAlreadyEnded();
      }
    }
  }

  function testSourceCacheKey(courseCode, lessonNumber, testId) {
    return `${courseCode}:${Number(lessonNumber)}:${Number(testId)}`;
  }

  async function requestTestSourceWithRetry(courseCode, test, operationId, onRetry) {
    let response = null;
    for (let attempt = 0; attempt <= API_LESSON_RETRY_DELAYS_MS.length; attempt++) {
      ensureExportNotCancelled(operationId);
      response = await turboApiRequest("test-source", {
        courseCode,
        testId: test.id,
        lpId: test.lp_id,
        testImported: test.testImported,
      });
      ensureExportNotCancelled(operationId);
      if (response.ok && response.data?.questions?.length) return response;
      if (response.ok && Number(response.data?.testEmpty) === 1) return response;
      if (response.error === "AUTH_UNAVAILABLE" || attempt === API_LESSON_RETRY_DELAYS_MS.length) break;
      const delay = API_LESSON_RETRY_DELAYS_MS[attempt];
      onRetry?.(attempt + 1, API_LESSON_RETRY_DELAYS_MS.length);
      await exportSleep(delay, operationId);
    }
    return response || { ok:false, error:"TEST_SOURCE_UNAVAILABLE" };
  }

  async function collectCourseTests(operationId) {
    if (collectingCourseMaterials || courseBatchRunning() || window !== window.top) {
      setExportCollectionStatus(
        "Un’altra operazione del corso è già in esecuzione.",
        true,
        operationId,
      );
      window.postMessage({ type: "PEGASO_EXPORT_COLLECTION_FAILED", operationId }, "*");
      return;
    }

    const courseCode = courseCodeFromUrl();
    const initialSections = sections().map((section) => section.text);
    if (!courseCode || !initialSections.length) {
      setExportCollectionStatus(
        "Apri prima la pagina dei contenuti di un corso.",
        true,
        operationId,
      );
      window.postMessage({ type: "PEGASO_EXPORT_COLLECTION_FAILED", operationId }, "*");
      return;
    }

    collectingCourseMaterials = true;
    exportCancelRequested = false;
    activeExportOperationId = operationId;
    const collected = [];
    const missing = [];

    try {
      const sectionSignature = initialSections.join("\u001f");
      const cachedOutline = materialOutlineCache.get(courseCode);
      const outline = cachedOutline?.sectionSignature === sectionSignature
        ? cachedOutline.outline
        : await apiCourseOutline(
            initialSections,
            (sectionText, sectionIndex, sectionCount) =>
              setExportCollectionStatus(
                `Preparazione test: sezione ${sectionIndex + 1}/${sectionCount}: ${sectionText}`,
                false,
                operationId,
              ),
            operationId,
          );
      if (!outline?.length) throw new Error("Struttura del corso non disponibile");
      if (!cachedOutline || cachedOutline.sectionSignature !== sectionSignature) {
        materialOutlineCache.set(courseCode, { sectionSignature, outline });
      }

      const courseIndex = await getPlaybackCourseIndex(courseCode, {
        allowCollection: true,
        ignoreEnabled: true,
      });
      const routeByLessonNumber = courseIndexRouteMap(courseIndex, outline);

      for (let index = 0; index < outline.length; index++) {
        ensureExportNotCancelled(operationId);
        const entry = outline[index];
        const route = routeByLessonNumber.get(entry.lessonNumber);
        const qualifiedChapter = `${entry.identity.sectionText} — ${entry.identity.chapterText}`;
        setExportCollectionStatus(
          `Raccolta test ${index + 1}/${outline.length}: ${entry.identity.chapterText}`,
          false,
          operationId,
        );

        const lesson = await requestLessonWithRetry(
          courseCode,
          entry.lessonNumber,
          "data",
          null,
          operationId,
          route?.lpId || entry.lessonNumber,
          true,
          route?.id || entry.lessonNumber,
        );
        if (!lesson.ok) {
          missing.push({ chapter: qualifiedChapter, reason: lesson.error || "Dati del capitolo non disponibili" });
          continue;
        }

        const test = lesson.data?.test;
        if (!Number.isInteger(Number(test?.id)) || Number(test.id) < 1) {
          missing.push({ chapter: qualifiedChapter, reason: "Test di autovalutazione non disponibile" });
          continue;
        }
        if (Number(test.testEmpty) === 1) {
          missing.push({ chapter: qualifiedChapter, reason: "Test privo di domande" });
          continue;
        }

        const cacheKey = testSourceCacheKey(courseCode, entry.lessonNumber, test.id);
        let source = testSourceCache.get(cacheKey)?.source || null;
        if (!source) {
          const response = await requestTestSourceWithRetry(
            courseCode,
            test,
            operationId,
            (attempt, total) => setExportCollectionStatus(
              `Domande non disponibili per ${entry.identity.chapterText}. Nuovo tentativo ${attempt}/${total}…`,
              false,
              operationId,
            ),
          );
          ensureExportNotCancelled(operationId);
          if (!response.ok || !response.data?.questions?.length) {
            missing.push({
              chapter: qualifiedChapter,
              reason: response.error || "Domande del test non disponibili",
            });
            continue;
          }
          source = response.data;
          testSourceCache.set(cacheKey, { source, fetchedAt: Date.now() });
        }

        collected.push({
          chapter: qualifiedChapter,
          section: entry.identity.sectionText,
          chapterTitle: entry.identity.chapterText,
          lessonNumber: entry.lessonNumber,
          order: entry.order,
          testId: Number(test.id),
          questions: source.questions,
        });
        if (index + 1 < outline.length) {
          await exportSleep(TURBO_API_PACING_MS, operationId);
        }
      }

      ensureExportNotCancelled(operationId);
      if (!collected.length) {
        throw new Error("Nessun test con domande è stato trovato");
      }
      collected.sort((first, second) => first.order - second.order);
      const completedMessage = `Raccolti ${collected.length} test. Apertura dello strumento di esportazione…`;
      setExportCollectionStatus(completedMessage, false, operationId);
      window.postMessage({
        type: "PEGASO_COURSE_TESTS_COLLECTED",
        operationId,
        payload: { courseTitle: courseTitle(), tests: collected, missing },
      }, "*");
      removeExportCollectionToastAfter(completedMessage, 5000);
    } catch (error) {
      const cancelled = error?.name === "AbortError";
      const terminalMessage = cancelled
        ? "Raccolta dei test annullata. Nessun file è stato creato."
        : `Raccolta dei test non riuscita: ${error?.message || "Errore sconosciuto"}`;
      setExportCollectionStatus(terminalMessage, !cancelled, operationId);
      window.postMessage({ type: "PEGASO_EXPORT_COLLECTION_FAILED", operationId }, "*");
      removeExportCollectionToastAfter(terminalMessage, cancelled ? 5000 : 15000);
    } finally {
      collectingCourseMaterials = false;
      exportCancelRequested = false;
      activeExportOperationId = null;
      if (enabled) resumeIfVideoAlreadyEnded();
    }
  }

  function getEndOfLessonTest(chapter) {
    if (!chapter?.span) {
      return null;
    }

    const chapterList = chapters();
    const chapterIndex = chapterList.findIndex(
      (candidate) => candidate.span === chapter.span,
    );

    if (chapterIndex < 0) {
      return null;
    }

    const nextChapter = chapterList[chapterIndex + 1] || null;
    const rows = [...document.querySelectorAll("div.border-t")];

    return (
      rows.find((row) => {
        const testIcon = row.querySelector("path#test");

        // Ensure this is the actual test row, not a parent container.
        if (!testIcon || testIcon.closest("div.border-t") !== row) {
          return false;
        }

        const afterCurrentChapter =
          chapter.span.compareDocumentPosition(row) &
          Node.DOCUMENT_POSITION_FOLLOWING;

        const beforeNextChapter =
          !nextChapter ||
          nextChapter.span.compareDocumentPosition(row) &
            Node.DOCUMENT_POSITION_PRECEDING;

        const executeButton = [...row.querySelectorAll("button")].find(
          (button) => button.textContent?.trim().toLowerCase() === "esegui",
        );

        return (
          Boolean(afterCurrentChapter) &&
          Boolean(beforeNextChapter) &&
          Boolean(executeButton)
        );
      }) || null
    );
  }

  function isEndOfLessonTestCompleted(row) {
    const testIcon = row?.querySelector("path#test");
    const fill = testIcon?.getAttribute("fill")?.trim().toUpperCase();

    log("Detected test icon color:", fill);

    return fill === "#2FA33D";
  }

  function isElementVisible(element) {
    if (!element?.isConnected || element.getClientRects().length === 0) {
      return false;
    }

    const style = window.getComputedStyle(element);

    return style.display !== "none" && style.visibility !== "hidden";
  }

  function buttonByText(text) {
    const expected = text.trim().toLowerCase();

    return (
      [...document.querySelectorAll("button")].find(
        (button) =>
          button.textContent?.trim().toLowerCase() === expected &&
          isElementVisible(button),
      ) || null
    );
  }

  function testAnswerGroups(visibleOnly = true) {
    return [...document.querySelectorAll("div.divide-y-2")].filter((group) => {
      const answers = [...group.children];

      return (
        (!visibleOnly || isElementVisible(group)) &&
        answers.length >= 2 &&
        answers[0]?.id === "0" &&
        answers.every((answer, index) => answer.id === String(index))
      );
    });
  }

  function answerGroupSignature(group) {
    return [...group.children]
      .map(
        (answer) =>
          `${answer.id}:${answer.textContent?.replace(/\s+/g, " ").trim() || ""}`,
      )
      .join("||");
  }

  function captureAnswerRender(groups = testAnswerGroups(false)) {
    return {
      groups,
      nodes: new Set(groups),
      signatures: new Map(
        groups.map((group) => [group, answerGroupSignature(group)]),
      ),
      signature: groups.map(answerGroupSignature).join("|||"),
    };
  }

  function currentAnswerGroups(previousRender) {
    const current = testAnswerGroups();

    if (!current.length || !previousRender.groups.length) {
      return current;
    }

    const sameOrderedNodes =
      current.length === previousRender.groups.length &&
      current.every((group, index) => group === previousRender.groups[index]);
    const currentSignature = current.map(answerGroupSignature).join("|||");

    /*
     * Vue can reuse the same nodes for the next test. In that case, changed
     * answer text proves that the current render replaced the previous one.
     */
    if (sameOrderedNodes && currentSignature !== previousRender.signature) {
      return current;
    }

    /*
     * During a route transition, UniPegaso can briefly keep the previous
     * test mounted while it adds the next one. Exclude every unchanged old
     * group so turbo mode cannot click stale answers.
     */
    return current.filter(
      (group) =>
        !previousRender.nodes.has(group) ||
        previousRender.signatures.get(group) !== answerGroupSignature(group),
    );
  }

  async function waitForFreshAnswerGroups(previousRender) {
    const start = Date.now();
    let stableKey = "";
    let stableSince = null;
    let stableGroups = null;

    while (Date.now() - start < WAIT_MS) {
      const groups = currentAnswerGroups(previousRender);
      const key = groups.map(answerGroupSignature).join("|||");

      if (!groups.length) {
        stableKey = "";
        stableSince = null;
        stableGroups = null;
      } else if (key !== stableKey || groups.length !== stableGroups?.length) {
        stableKey = key;
        stableSince = Date.now();
        stableGroups = groups;
      } else if (Date.now() - stableSince >= TEST_GROUPS_STABLE_MS) {
        return groups;
      }

      await sleep(100);
    }

    return null;
  }

  function isAnswerASelected(group) {
    const answerA = group?.children?.[0];

    if (!answerA) {
      return false;
    }

    if (answerA.classList.contains("bg-platform-active-color")) {
      return true;
    }

    const selectionIndicator = answerA.lastElementChild;
    const selectionPath = selectionIndicator?.querySelector("svg path");
    const fill = selectionPath?.getAttribute("fill")?.trim().toUpperCase();

    return fill === "#CF1D56";
  }

  async function selectAndVerifyAnswerA(
    previousRender,
    groupIndex,
    expectedGroupCount,
    mode,
  ) {
    for (let attempt = 1; attempt <= ANSWER_SELECTION_ATTEMPTS; attempt++) {
      if (!canContinueTestCompletion(mode)) {
        return false;
      }

      const groups = currentAnswerGroups(previousRender);
      const group =
        groups.length === expectedGroupCount ? groups[groupIndex] : null;
      const answerA = group?.children?.[0];

      if (!answerA) {
        await sleep(150);
        continue;
      }

      if (!isAnswerASelected(group)) {
        answerA.scrollIntoView({ block: "center", behavior: "instant" });
        answerA.click();
      }

      const selected = await waitFor(() => {
        const freshGroups = currentAnswerGroups(previousRender);
        const freshGroup =
          freshGroups.length === expectedGroupCount
            ? freshGroups[groupIndex]
            : null;

        return isAnswerASelected(freshGroup) ? true : null;
      }, ANSWER_SELECTION_TIMEOUT_MS);

      if (selected) {
        return true;
      }

      log(
        `Answer A was not registered for question ${groupIndex + 1}; retry ${attempt}/${ANSWER_SELECTION_ATTEMPTS}.`,
      );
    }

    return false;
  }

  function canContinueTestCompletion(mode) {
    return mode === "turbo"
      ? turboTestsRunning && !turboTestsCancelRequested
      : enabled && autoCompleteTests && !stopAtTests;
  }

  async function completeEndOfLessonTest(
    identity,
    testRow,
    mode = "automatic",
  ) {
    if (isEndOfLessonTestCompleted(testRow)) {
      log("End-of-lesson test is already completed. It will not be repeated.");
      return true;
    }

    const executeButton = [...testRow.querySelectorAll("button")].find(
      (button) => button.textContent?.trim().toLowerCase() === "esegui",
    );

    if (!executeButton) {
      log("Could not find the Esegui button for the pending test.");
      return false;
    }

    const previousRender = captureAnswerRender();

    log("Opening pending end-of-lesson test.");
    executeButton.scrollIntoView({ block: "center", behavior: "smooth" });
    executeButton.click();

    const groups = await waitForFreshAnswerGroups(previousRender);

    if (!groups) {
      log("Fresh test questions were not rendered before timeout.");
      return false;
    }

    log("Selecting answer A for", groups.length, "questions.");

    for (let index = 0; index < groups.length; index++) {
      if (!canContinueTestCompletion(mode)) {
        log("Automatic test completion was cancelled from the popup.");
        return false;
      }

      const selected = await selectAndVerifyAnswerA(
        previousRender,
        index,
        groups.length,
        mode,
      );

      if (!selected) {
        log(`Could not safely select answer A for question ${index + 1}.`);
        return false;
      }
    }

    const verifiedGroups = currentAnswerGroups(previousRender);
    const everyAnswerSelected =
      verifiedGroups.length === groups.length &&
      verifiedGroups.every(isAnswerASelected);

    if (!everyAnswerSelected) {
      log("At least one answer was not selected after verification.");
      return false;
    }

    log("Answer A selection verified for every question.");

    const submitButton = await waitFor(() => buttonByText("Invia"));

    if (!submitButton) {
      log("Invia did not appear after answering every question.");
      return false;
    }

    log("Submitting end-of-lesson test.");
    submitButton.scrollIntoView({ block: "center", behavior: "smooth" });
    submitButton.click();

    const submitted = await waitFor(() => buttonByText("Ripeti"));

    if (!submitted) {
      log("Test submission was not confirmed by the Ripeti button.");
      return false;
    }

    const registered = await waitFor(() => {
      const freshChapter = findChapter(identity);
      const freshTest = getEndOfLessonTest(freshChapter);

      return isEndOfLessonTestCompleted(freshTest) ? true : null;
    });

    if (!registered) {
      log(
        "Test was submitted, but its green completion state was not registered.",
      );
      return false;
    }

    log("End-of-lesson test completed and registered as green.");
    const progressCourseCode = courseCodeFromUrl();
    const progressLessonNumber = lessonNumberFromUrl();
    const progressEntry = progressCourseCode && progressLessonNumber
      ? lessonApiCache.get(lessonApiCacheKey(progressCourseCode, progressLessonNumber))
      : null;
    if (progressEntry?.test?.lpId && progressEntry.test.lpItemId) {
      markCachedTestCompleted(
        progressCourseCode,
        progressLessonNumber,
        progressEntry.test.lpId,
        progressEntry.test.lpItemId,
      );
    }
    await sleep(TEST_COMPLETION_SETTLE_MS);
    return true;
  }

  async function completeEndOfLessonTestViaApi(
    identity,
    requestedLessonNumber = null,
    knownTest = null,
    requestedLessonLpId = null,
    requestedParagraphId = null,
  ) {
    const courseCode = courseCodeFromUrl();
    const requestedNumber = Number(requestedLessonNumber);
    const lessonNumber =
      Number.isInteger(requestedNumber) && requestedNumber > 0
        ? requestedNumber
        : lessonNumberFromUrl();
    const courseIndex = courseCode
      ? await getPlaybackCourseIndex(courseCode)
      : null;
    const indexedChapter = courseIndex?.find(
      (entry) => entry.displayOrder === lessonNumber,
    );
    const requestedLpId = Number(requestedLessonLpId);
    const lessonLpId =
      Number.isInteger(requestedLpId) && requestedLpId > 0
        ? requestedLpId
        : indexedChapter?.lpId || lessonNumber;
    const requestedParagraph = Number(requestedParagraphId);
    const lessonParagraphId =
      Number.isInteger(requestedParagraph) && requestedParagraph > 0
        ? requestedParagraph
        : indexedChapter?.id || lessonNumber;

    if (!courseCode || !lessonNumber) {
      log(
        "Autoplay API unavailable: course or module number not found in the current URL.",
      );
      return false;
    }

    if (!canContinueTestCompletion("automatic")) return false;

    let test = knownTest;
    if (!test) {
      const lesson = await requestLessonWithRetry(
        courseCode,
        lessonNumber,
        "test",
        null,
        null,
        lessonLpId,
        false,
        lessonParagraphId,
      );

      if (!canContinueTestCompletion("automatic")) {
        log("Autoplay API test completion was cancelled before submission.");
        return false;
      }

      if (!lesson.ok) {
        log(
          "Autoplay API could not read the end-of-lesson test; using the visual fallback:",
          lesson.error,
        );
        return false;
      }

      test = lesson.data?.test;
    }

    if (Number(test?.percentage) >= 100) {
      log("Autoplay API: end-of-lesson test is already completed:", identity);
      return true;
    }

    const completed = await completeTestViaApi(
      courseCode,
      lessonNumber,
      test,
    );

    if (!completed.ok || completed.data?.completed !== true) {
      log(
        "Autoplay API test completion failed; using the visual fallback:",
        completed.error,
      );
      return false;
    }

    log("Autoplay API: end-of-lesson test completed.", {
      lessonNumber,
      lpId: test.lp_id,
      lpItemId: test.lp_item_id,
    });

    if (!canContinueTestCompletion("automatic")) {
      log(
        "Autoplay API completed the test, but automatic progression is now paused.",
      );
      return false;
    }

    await sleep(TEST_COMPLETION_SETTLE_MS);
    return true;
  }

  async function completeAutomaticEndOfLessonTest(
    identity,
    testRow,
    requestedLessonNumber = null,
    requestedLessonLpId = null,
    requestedParagraphId = null,
  ) {
    if (
      await completeEndOfLessonTestViaApi(
        identity,
        requestedLessonNumber,
        null,
        requestedLessonLpId,
        requestedParagraphId,
      )
    ) {
      return true;
    }
    if (!canContinueTestCompletion("automatic")) return false;

    await sleep(TURBO_API_PACING_MS);
    const freshTest = getEndOfLessonTest(findChapter(identity)) || testRow;
    if (!freshTest) {
      log("Visual test completion fallback unavailable: test row not found.");
      return false;
    }
    log("Using visual test completion fallback:", identity);
    return completeEndOfLessonTest(identity, freshTest, "automatic");
  }

  function turboTestToast() {
    return window.StudyWingNotifications;
  }

  function setTurboTestStatus(status) {
    const normalized = {
      running: status.running === true,
      stopping: status.stopping === true,
      outcome: ["success", "cancelled", "error"].includes(status.outcome) ? status.outcome : null,
      message: status.message || "",
    };
    const notifications = turboTestToast();
    const key = `turbo:${turboOperationId || "current"}`;
    notifications?.show({
      message: normalized.message,
      type: status.error ? "error" : normalized.running ? "info" : "success",
      key,
      progress: normalized.running,
      terminal: !normalized.running,
    });

    window.postMessage(
      {
        type: "PEGASO_TURBO_TESTS_STATUS",
        operationId: turboOperationId,
        status: normalized,
      },
      "*",
    );

  }

  function setObjectivesStatus(status) {
    const normalized = {
      running: status.running === true,
      stopping: status.stopping === true,
      outcome: ["success", "cancelled", "error"].includes(status.outcome) ? status.outcome : null,
      message: status.message || "",
    };
    const notifications = turboTestToast();
    const key = `objectives:${objectivesOperationId || "current"}`;
    notifications?.show({
      message: normalized.message,
      type: status.error ? "error" : normalized.running ? "info" : "success",
      key,
      progress: normalized.running,
      terminal: !normalized.running,
    });
    window.postMessage(
      {
        type: "PEGASO_OBJECTIVES_STATUS",
        operationId: objectivesOperationId,
        status: normalized,
      },
      "*",
    );
  }

  function courseCodeFromUrl() {
    const match = location.pathname.match(/\/videolezioni\/([^/?#]+)/i);
    if (!match) return null;
    try {
      const courseCode = decodeURIComponent(match[1]);
      return /^[A-Za-z0-9_-]{3,80}$/.test(courseCode) ? courseCode : null;
    } catch {
      return null;
    }
  }

  function lessonNumberFromUrl() {
    const match = location.pathname.match(
      /\/videolezioni\/[^/?#]+\/(\d+)(?:\/|$)/i,
    );
    if (!match) return null;
    const lessonNumber = Number(match[1]);
    return Number.isInteger(lessonNumber) && lessonNumber > 0
      ? lessonNumber
      : null;
  }

  function readPegasoCoursePercentage() {
    const candidates = [...document.querySelectorAll("div.percent")]
      .filter((element) =>
        element.querySelector("circle.circular-progress") &&
        element.querySelector(".number-container"),
      )
      .map((element) => {
        const match = String(element.textContent || "").trim().match(/^(\d{1,3})%$/);
        const rect = element.getBoundingClientRect();
        return match && rect.width > 0 && rect.height > 0
          ? Math.max(0, Math.min(100, Number(match[1])))
          : null;
      })
      .filter((value) => value !== null);
    return candidates.length === 1 ? candidates[0] : null;
  }

  function courseProgressRouteKey(courseCode, routeIdentity, items = null, lessonNumber = null) {
    const lpId = Number(routeIdentity?.lpId);
    const paragraphId = Number(routeIdentity?.paragraphId);
    if (
      Number.isInteger(lpId) && lpId > 0 &&
      Number.isInteger(paragraphId) && paragraphId > 0
    ) {
      return `${courseCode}:route:${lpId}:${paragraphId}`;
    }

    const itemLpIds = [...new Set(
      normalizedProgressItems(items)
        .map((item) => Number(item.lpId))
        .filter((value) => Number.isInteger(value) && value > 0),
    )];
    if (itemLpIds.length === 1) return `${courseCode}:lp:${itemLpIds[0]}`;

    const fallbackOrder = Number(lessonNumber);
    return Number.isInteger(fallbackOrder) && fallbackOrder > 0
      ? `${courseCode}:order:${fallbackOrder}`
      : null;
  }

  function courseProgressExpectedKeys(courseCode) {
    if (playbackCourseIndexCode !== courseCode || !playbackCourseIndex?.length) return null;
    const keys = playbackCourseIndex.map((entry) =>
      courseProgressRouteKey(courseCode, {
        lpId: entry.lpId,
        paragraphId: entry.id,
      }),
    );
    if (keys.some((key) => !key) || new Set(keys).size !== keys.length) return null;
    return keys;
  }

  function synchronizeCourseProgressOutline(state) {
    const expectedKeys = courseProgressExpectedKeys(state.courseCode);
    if (!expectedKeys) {
      if (!state.expectedKeys?.length) {
        state.chapterCount = Math.max(state.chapterCount, chapters().length);
      }
      return;
    }

    const signature = expectedKeys.join("\u001f");
    if (state.expectedSignature !== signature) {
      state.expectedKeys = expectedKeys;
      state.expectedSignature = signature;
      state.chapterCount = expectedKeys.length;
      state.sessionDelta = 0;
      state.exactPercent = null;
    }
  }

  function ensureCourseProgressState() {
    if (window !== window.top) return null;
    const courseCode = courseCodeFromUrl();
    if (!courseCode) return null;
    if (courseProgressState?.courseCode !== courseCode) {
      courseProgressChapters.clear();
      courseProgressState = {
        courseCode,
        baselinePercent: null,
        domPercent: null,
        sessionDelta: 0,
        exactPercent: null,
        chapterCount: 0,
        expectedKeys: null,
        expectedSignature: null,
      };
      window.postMessage({
        type: PAGE_LESSON_SNAPSHOT_REQUEST,
        courseCode,
      }, "*");
    }
    synchronizeCourseProgressOutline(courseProgressState);
    const domPercent = readPegasoCoursePercentage();
    if (domPercent !== null && courseProgressState.baselinePercent === null) {
      courseProgressState.baselinePercent = domPercent;
      courseProgressState.domPercent = domPercent;
    } else if (
      domPercent !== null &&
      courseProgressState.domPercent !== null &&
      domPercent !== courseProgressState.domPercent
    ) {
      courseProgressState.baselinePercent = domPercent;
      courseProgressState.domPercent = domPercent;
      courseProgressState.sessionDelta = 0;
      courseProgressState.exactPercent = null;
      log("Course progress rebased from Pegaso DOM:", `${domPercent}%`);
    }
    return courseProgressState;
  }

  function courseProgressVisiblePercent(state = courseProgressState) {
    if (!state || state.baselinePercent === null) return null;
    const exactAvailable = state.exactPercent !== null && Number.isFinite(Number(state.exactPercent));
    const value = exactAvailable
      ? Number(state.exactPercent)
      : state.baselinePercent + Math.max(0, Number(state.sessionDelta) || 0);
    return Math.max(0, Math.min(100, Math.floor(value + 1e-7)));
  }

  function publishCourseProgressStatus() {
    const state = ensureCourseProgressState();
    if (!state) return;
    const percent = courseProgressVisiblePercent(state);
    const exactAvailable = state.exactPercent !== null && Number.isFinite(Number(state.exactPercent));
    window.postMessage({
      type: "PEGASO_COURSE_PROGRESS_STATUS",
      status: {
        courseCode: state.courseCode,
        available: percent !== null && state.chapterCount > 0,
        percent,
        chapterCount: state.chapterCount,
        knownChapters: courseProgressChapters.size,
        exact: exactAvailable,
        updatedByStudyWing: exactAvailable || state.sessionDelta >= 1,
        message: exactAvailable
          ? "Calcolato sui dati completi del corso."
          : state.sessionDelta > 0
            ? "Aggiornato in tempo reale da PlumePilot."
            : "Sincronizzato con Pegaso.",
      },
    }, "*");
  }

  function scheduleCourseProgressInitialization(delayMs = 250) {
    if (window !== window.top) return;
    clearTimeout(courseProgressInitTimer);
    courseProgressInitTimer = setTimeout(() => {
      courseProgressInitTimer = null;
      ensureCourseProgressState();
      publishCourseProgressStatus();
    }, Math.max(0, Number(delayMs) || 0));
  }

  function normalizedProgressItems(items) {
    if (!Array.isArray(items)) return [];
    return items
      .filter((item) => ["intro", "video", "test"].includes(item?.contentType))
      .map((item, index) => ({
        contentType: item.contentType,
        lpItemId: Number(item.lp_item_id ?? item.lpItemId) || null,
        lpId: Number(item.lp_id ?? item.lpId) || null,
        percentage: Math.max(0, Math.min(100, Number(item.percentage) || 0)),
        paragNumber: Number(item.paragNumber) || null,
        title: item.title || null,
        fallbackKey: `${item.contentType}:${Number(item.paragNumber) || index}`,
      }));
  }

  function progressItemKey(item) {
    return item.lpItemId ? `${item.contentType}:${item.lpItemId}` : item.fallbackKey;
  }

  function submitChapterVideoSnapshot(routeKey, items) {
    if (!routeKey || !Array.isArray(items)) return;
    const videos = items
      .filter((item) => item?.contentType === "video" && item.lpItemId)
      .map((item) => ({ id: item.lpItemId, percentage: item.percentage }));
    if (!videos.length) return;
    window.postMessage({
      type: "STUDYWING_CHAPTER_VIDEOS_CLAIM_REQUEST",
      chapterKey: routeKey,
      videos,
    }, "*");
  }

  function maybeRecalculateExactCourseProgress() {
    const state = ensureCourseProgressState();
    if (!state?.expectedKeys?.length) return false;
    const models = [];
    for (const key of state.expectedKeys) {
      const model = courseProgressChapters.get(key);
      if (!model?.complete || !model.items.length) return false;
      models.push(model);
    }
    const candidate = models.reduce((courseTotal, model) => {
      const chapterPercentage = model.items.reduce(
        (total, item) => total + item.percentage,
        0,
      ) / model.items.length;
      return courseTotal + chapterPercentage;
    }, 0) / models.length;
    if (
      state.baselinePercent !== null &&
      Math.floor(candidate + 1e-7) < state.baselinePercent
    ) {
      state.exactPercent = null;
      log("Course progress exact calculation rejected because it is below Pegaso DOM:", {
        calculated: candidate,
        pegaso: state.baselinePercent,
      });
      return false;
    }
    state.exactPercent = candidate;
    return true;
  }

  function rememberCourseProgressSnapshot(
    courseCode,
    lessonNumber,
    items,
    complete,
    routeIdentity = null,
  ) {
    if (!complete) return;
    const state = ensureCourseProgressState();
    if (!state || state.courseCode !== courseCode || !state.chapterCount) return;
    const normalized = normalizedProgressItems(items);
    if (!normalized.length) return;
    const key = courseProgressRouteKey(courseCode, routeIdentity, normalized, lessonNumber);
    if (!key) return;
    const previous = courseProgressChapters.get(key);
    const previousByKey = new Map(
      (previous?.items || []).map((item) => [progressItemKey(item), item]),
    );
    const merged = normalized.map((item) => {
      const old = previousByKey.get(progressItemKey(item));
      return old ? { ...item, percentage: Math.max(old.percentage, item.percentage) } : item;
    });
    submitChapterVideoSnapshot(key, merged);
    if (previous?.complete && previous.items.length === merged.length) {
      const increase = merged.reduce((total, item) => {
        const old = previousByKey.get(progressItemKey(item));
        return total + Math.max(0, item.percentage - (old?.percentage || 0));
      }, 0);
      if (
        increase > 0 &&
        state.exactPercent === null &&
        state.expectedKeys?.includes(key)
      ) {
        state.sessionDelta += increase / (state.chapterCount * merged.length);
      }
    }
    courseProgressChapters.set(key, { complete: true, items: merged });
    maybeRecalculateExactCourseProgress();
    publishCourseProgressStatus();
  }

  let completedLessonAchievementQueue = Promise.resolve();

  function outlineChapterProgressKeys(courseCode, outlineEntry, courseIndexEntry) {
    const keys = [];
    const canonical = courseProgressRouteKey(courseCode, {
      lpId: courseIndexEntry?.lpId,
      paragraphId: courseIndexEntry?.id,
    });
    if (canonical) keys.push(canonical);
    const lpId = Number(courseIndexEntry?.lpId);
    if (Number.isInteger(lpId) && lpId > 0) keys.push(`${courseCode}:lp:${lpId}`);
    const lessonNumber = Number(outlineEntry?.lessonNumber);
    if (Number.isInteger(lessonNumber) && lessonNumber > 0) {
      keys.push(`${courseCode}:order:${lessonNumber}`);
    }
    return [...new Set(keys)];
  }

  async function claimCompletedLessonIfEligible(courseCode, completedChapterKey) {
    const options = {
      ignoreEnabled: true,
      allowCollection: true,
      allowBatch: true,
    };
    const outline = await getPlaybackCourseOutline(courseCode, options);
    const courseIndex = await getPlaybackCourseIndex(courseCode, options);
    if (
      courseCodeFromUrl() !== courseCode ||
      !outline?.length ||
      !courseIndex?.length
    ) {
      return false;
    }

    const routeByLessonNumber = courseIndexRouteMap(courseIndex, outline);
    const mapped = outline.map((outlineEntry) => {
      const courseIndexEntry = routeByLessonNumber.get(outlineEntry.lessonNumber) || null;
      return {
        outlineEntry,
        courseIndexEntry,
        keys: outlineChapterProgressKeys(courseCode, outlineEntry, courseIndexEntry),
      };
    });
    const completedEntry = mapped.find((entry) =>
      entry.keys.includes(completedChapterKey),
    );
    const sectionText = completedEntry?.outlineEntry?.identity?.sectionText;
    if (!sectionText || !completedEntry.courseIndexEntry) return false;

    const lessonChapters = mapped.filter(
      (entry) => entry.outlineEntry?.identity?.sectionText === sectionText,
    );
    if (
      !lessonChapters.length ||
      lessonChapters.some((entry) => !entry.courseIndexEntry)
    ) {
      log("Achievement not claimed: the lesson outline could not be mapped completely.", {
        sectionText,
      });
      return false;
    }

    const chaptersSnapshot = lessonChapters.map((entry) => {
      const model = entry.keys
        .map((key) => courseProgressChapters.get(key))
        .find((candidate) => candidate?.complete && candidate.items?.length);
      const modelComplete = model?.items.every((item) => item.percentage >= 100) === true;
      return {
        key: entry.keys[0],
        percentage: modelComplete ? 100 : Number(entry.courseIndexEntry.percentage) || 0,
      };
    });
    const lessonComplete = chaptersSnapshot.every((chapter) => chapter.percentage >= 100);
    if (!lessonComplete) {
      log("Lesson completion awaits Pegaso confirmation; a reload can confirm rounded progress.", {
        sectionText,
      });
    }

    window.postMessage({
      type: "STUDYWING_LESSON_COMPLETION_CANDIDATE_REQUEST",
      lessonKey: `${courseCode}:lesson:${Number(completedEntry.outlineEntry.sectionIndex) + 1}`,
      chapters: chaptersSnapshot,
      candidate: true,
    }, "*");
    return lessonComplete;
  }

  function requestPendingLessonVerification(courseCode) {
    const attempt = Number(pendingLessonVerificationAttempts.get(courseCode)) || 0;
    if (!courseCode || attempt >= 3) return;
    pendingLessonVerificationAttempts.set(courseCode, attempt + 1);
    window.postMessage({
      type: "STUDYWING_PENDING_LESSONS_REQUEST",
      courseCode,
    }, "*");
  }

  async function verifyPendingLessonCompletions(candidates) {
    const courseCode = courseCodeFromUrl();
    if (!courseCode || !Array.isArray(candidates) || !candidates.length) return;
    const courseIndex = await getPlaybackCourseIndex(courseCode, {
      ignoreEnabled: true,
      allowCollection: true,
      allowBatch: true,
      forceRefresh: true,
    });
    if (!courseIndex?.length || courseCodeFromUrl() !== courseCode) return;

    const progressByKey = new Map();
    for (const entry of courseIndex) {
      const routeKey = courseProgressRouteKey(courseCode, {
        lpId: entry.lpId,
        paragraphId: entry.id,
      }, null, entry.displayOrder);
      if (routeKey) progressByKey.set(routeKey, entry.percentage);
      const lpId = Number(entry.lpId);
      if (Number.isInteger(lpId) && lpId > 0) {
        progressByKey.set(`${courseCode}:lp:${lpId}`, entry.percentage);
      }
      progressByKey.set(`${courseCode}:order:${entry.displayOrder}`, entry.percentage);
    }

    let stillPending = false;
    for (const candidate of candidates.slice(0, 50)) {
      const chapterKeys = Array.isArray(candidate?.chapterKeys)
        ? candidate.chapterKeys.slice(0, 100)
        : [];
      if (!chapterKeys.length || chapterKeys.some((key) => !progressByKey.has(key))) {
        stillPending = true;
        continue;
      }
      const chapters = chapterKeys.map((key) => ({
        key,
        percentage: Number(progressByKey.get(key)) || 0,
      }));
      if (!chapters.every((chapter) => chapter.percentage >= 100)) {
        stillPending = true;
      }
      window.postMessage({
        type: "STUDYWING_LESSON_COMPLETION_CANDIDATE_REQUEST",
        lessonKey: candidate.lessonKey,
        chapters,
        candidate: false,
      }, "*");
    }

    const attempts = Number(pendingLessonVerificationAttempts.get(courseCode)) || 0;
    if (stillPending && attempts < 3) {
      setTimeout(() => requestPendingLessonVerification(courseCode), attempts === 1 ? 2500 : 6000);
    }
  }

  function scheduleCompletedLessonAchievementCheck(courseCode, completedChapterKey) {
    completedLessonAchievementQueue = completedLessonAchievementQueue
      .then(() => claimCompletedLessonIfEligible(courseCode, completedChapterKey))
      .catch((error) => {
        log("Completed-lesson achievement check failed safely:", error);
        return false;
      });
  }

  function markKnownCourseProgressActivity(
    courseCode,
    lessonNumber,
    contentType,
    lpItemId,
    percentage = 100,
  ) {
    const state = ensureCourseProgressState();
    if (!state || state.courseCode !== courseCode) return false;
    const modelEntry = [...courseProgressChapters.entries()].find(([, candidate]) =>
      candidate?.complete && candidate.items?.some(
        (item) => item.contentType === contentType && item.lpItemId === Number(lpItemId),
      ),
    );
    const modelKey = modelEntry?.[0] || null;
    const model = modelEntry?.[1] || null;
    if (!model?.complete || !model.items.length) return false;
    const target = model.items.find(
      (item) => item.contentType === contentType && item.lpItemId === Number(lpItemId),
    );
    const nextPercentage = Math.max(0, Math.min(100, Number(percentage) || 0));
    if (!target || nextPercentage <= target.percentage) return false;
    const chapterWasCompletionCandidate = model.items.every(
      (item) => item.percentage >= 99.9,
    );
    const increase = nextPercentage - target.percentage;
    target.percentage = nextPercentage;
    if (target.contentType === "video") submitChapterVideoSnapshot(modelKey, model.items);
    if (
      state.exactPercent === null &&
      state.expectedKeys?.includes(modelKey)
    ) {
      state.sessionDelta += increase / (state.chapterCount * model.items.length);
    }
    maybeRecalculateExactCourseProgress();
    publishCourseProgressStatus();
    if (
      !chapterWasCompletionCandidate &&
      model.items.every((item) => item.percentage >= 99.9)
    ) {
      scheduleCompletedLessonAchievementCheck(courseCode, modelKey);
    }
    return true;
  }

  function normalizedActivityTitle(value) {
    return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("it");
  }

  function knownVideoForRow(courseCode, lessonNumber, row) {
    const cachedItems = lessonApiCache.get(
      lessonApiCacheKey(courseCode, lessonNumber),
    )?.progressItems || [];
    const cachedLpIds = new Set(
      cachedItems
        .map((item) => Number(item.lpId))
        .filter((value) => Number.isInteger(value) && value > 0),
    );
    const candidates = [...courseProgressChapters.values()].filter((candidate) =>
      candidate?.complete && (
        cachedLpIds.size === 0 ||
        candidate.items?.some((item) => cachedLpIds.has(Number(item.lpId)))
      ),
    );
    const model = candidates.length === 1 ? candidates[0] : null;
    if (!model?.complete) return null;
    const videos = model.items.filter((item) => item.contentType === "video");
    const title = normalizedActivityTitle(lessonName(row));
    const titleMatches = videos.filter(
      (item) => normalizedActivityTitle(item.title) === title,
    );
    if (titleMatches.length === 1) return titleMatches[0];
    const chapter = currentChapter(row);
    const videoRows = chapterRows(chapter).filter((candidate) => {
      const name = normalizedActivityTitle(lessonName(candidate));
      return name && name !== "obiettivi" && !name.includes("test di autovalutazione");
    });
    const rowIndex = videoRows.indexOf(row);
    return rowIndex >= 0
      ? [...videos].sort((first, second) =>
          (first.paragNumber || 0) - (second.paragNumber || 0),
        )[rowIndex] || null
      : null;
  }

  function recordKnownVideoProgress(row, percentage) {
    const courseCode = courseCodeFromUrl();
    const lessonNumber = lessonNumberFromUrl();
    if (!courseCode || !lessonNumber || !row) return false;
    const target = knownVideoForRow(courseCode, lessonNumber, row);
    if (!target?.lpItemId) return false;
    const changed = markKnownCourseProgressActivity(
      courseCode,
      lessonNumber,
      "video",
      target.lpItemId,
      percentage,
    );
    if (!changed) return false;
    const entry = lessonApiCache.get(lessonApiCacheKey(courseCode, lessonNumber));
    if (entry?.progressItems) {
      entry.progressItems = entry.progressItems.map((item) =>
        item.contentType === "video" && item.lpItemId === target.lpItemId
          ? { ...item, percentage: Math.max(item.percentage, Number(percentage) || 0) }
          : item,
      );
    }
    return true;
  }

  async function captureEndedVideoProgress(videoElement) {
    const initialRow = currentLesson();
    if (!initialRow) return;
    const registered = await waitFor(() => {
      const row = currentLesson();
      if (!row || video() !== videoElement) return null;
      const percentage = getProgress(row);
      return percentage > 0 ? { row, percentage } : null;
    });
    const row = registered?.row || initialRow;
    const percentage = registered?.percentage ?? getProgress(row);
    if (percentage > 0) recordKnownVideoProgress(row, percentage);
  }

  function turboApiRequest(action, payload = {}) {
    return new Promise((resolve) => {
      const requestId = `studywing-${Date.now()}-${++turboApiRequestSequence}`;
      const timeout = setTimeout(() => {
        pendingTurboApiRequests.delete(requestId);
        resolve({ ok: false, error: "RESPONSE_TIMEOUT" });
      }, TURBO_API_RESPONSE_TIMEOUT_MS);

      pendingTurboApiRequests.set(requestId, { resolve, timeout });
      window.postMessage(
        {
          type: TURBO_API_REQUEST,
          requestId,
          action,
          ...payload,
        },
        "*",
      );
    });
  }

  async function runApiTurboTests(results) {
    const courseCode = courseCodeFromUrl();
    if (!courseCode) {
      log("API turbo unavailable: course code not found in the current URL.");
      return false;
    }

    const batchOptions = {
      allowBatch: true,
      ignoreEnabled: true,
      isCancelled: () => turboTestsCancelRequested,
    };
    const outline = await getPlaybackCourseOutline(courseCode, batchOptions);
    if (turboTestsCancelRequested) return true;
    if (!outline?.length) {
      log(
        "API turbo unavailable: could not determine the course lesson count.",
      );
      return false;
    }

    const courseIndex = await getPlaybackCourseIndex(courseCode, batchOptions);
    if (turboTestsCancelRequested) return true;
    const routeByLessonNumber = courseIndexRouteMap(courseIndex, outline);
    const lessonRoute = (lessonNumber) => {
      const entry = routeByLessonNumber.get(lessonNumber);
      return {
        lpId: entry?.lpId || lessonNumber,
        paragraphId: entry?.id || lessonNumber,
      };
    };

    const lessonCount = outline.length;
    const cachedLessonNumbers = new Set(
      outline
        .filter((entry) =>
          cachedCompletedTest(courseCode, entry.lessonNumber),
        )
        .map((entry) => entry.lessonNumber),
    );
    const firstUncachedEntry = outline.find(
      (entry) => !cachedLessonNumbers.has(entry.lessonNumber),
    );
    let firstUncachedLesson = null;

    if (firstUncachedEntry) {
      setTurboTestStatus({
        running: true,
        message: `Verifica accesso API per ${lessonCount} moduli…`,
      });
      firstUncachedLesson = await requestLessonWithRetry(
        courseCode,
        firstUncachedEntry.lessonNumber,
        "data",
        null,
        null,
        lessonRoute(firstUncachedEntry.lessonNumber).lpId,
        true,
        lessonRoute(firstUncachedEntry.lessonNumber).paragraphId,
      );

      if (turboTestsCancelRequested) return true;
      if (!firstUncachedLesson.ok && firstUncachedLesson.error === "AUTH_UNAVAILABLE") {
        log(
          "API turbo unavailable; using the visual fallback:",
          firstUncachedLesson.error,
        );
        return false;
      }
      if (!firstUncachedLesson.ok) {
        log(
          `API turbo: module ${firstUncachedEntry.lessonNumber} could not be read; ` +
            "continuing in API mode without opening every chapter:",
          firstUncachedLesson.error,
        );
      }
    }

    log("API turbo mode started.", {
      courseCode,
      lessonCount,
      completedCacheEntries: cachedLessonNumbers.size,
    });
    for (const entry of outline) {
      if (turboTestsCancelRequested) break;

      const lessonNumber = entry.lessonNumber;

      results.checked++;
      setTurboTestStatus({
        running: true,
        message:
          `Modalità API — modulo ${lessonNumber}/${lessonCount}\n` +
          `Completati ora: ${results.completed}; già verdi: ${results.alreadyGreen}`,
      });

      const cachedTest = cachedLessonNumbers.has(lessonNumber)
        ? cachedCompletedTest(courseCode, lessonNumber)
        : null;
      if (cachedTest) {
        results.alreadyGreen++;
        results.cached++;
        log(`API turbo: module ${lessonNumber} reused from memory cache.`, {
          lpId: cachedTest.lpId,
          lpItemId: cachedTest.lpItemId,
        });
        continue;
      }

      const lesson =
        lessonNumber === firstUncachedEntry?.lessonNumber
          ? firstUncachedLesson
          : await requestLessonWithRetry(
              courseCode,
              lessonNumber,
              "data",
              null,
              null,
              lessonRoute(lessonNumber).lpId,
              true,
              lessonRoute(lessonNumber).paragraphId,
            );

      if (!lesson.ok) {
        log(
          `API turbo: module ${lessonNumber} could not be read:`,
          lesson.error,
        );
        results.failed++;
        await sleep(TURBO_API_PACING_MS);
        continue;
      }

      const test = lesson.data?.test;
      if (!test) {
        log(
          `API turbo: module ${lessonNumber} has no terminal self-assessment test.`,
        );
        results.unavailable++;
        await sleep(TURBO_API_PACING_MS);
        continue;
      }

      if (Number(test.percentage) >= 100) {
        log(`API turbo: module ${lessonNumber} is already completed.`);
        results.alreadyGreen++;
        await sleep(TURBO_API_PACING_MS);
        continue;
      }

      if (turboTestsCancelRequested) break;
      const completed = await completeTestViaApi(
        courseCode,
        lessonNumber,
        test,
      );

      if (completed.ok && completed.data?.completed === true) {
        results.completed++;
        log(`API turbo: module ${lessonNumber} completed.`, {
          lpId: test.lp_id,
          lpItemId: test.lp_item_id,
        });
      } else if (!turboTestsCancelRequested) {
        results.failed++;
        log(
          `API turbo: module ${lessonNumber} completion failed:`,
          completed.error,
        );
      }

      await sleep(TURBO_API_PACING_MS);
    }

    if (results.completed > 0) await invalidateCourseIndexCache(courseCode);

    return true;
  }

  async function invalidateCourseIndexCache(courseCode) {
    playbackCourseIndex = null;
    playbackCourseIndexCode = null;
    const response = await turboApiRequest("invalidate-outline", { courseCode });
    if (!response.ok) {
      log("Could not invalidate the cached course completion index:", response.error);
    }
  }

  async function runApiObjectives(results) {
    const courseCode = courseCodeFromUrl();
    if (!courseCode) return false;
    const batchOptions = {
      allowBatch: true,
      ignoreEnabled: true,
      isCancelled: () => objectivesCancelRequested,
    };
    const outline = await getPlaybackCourseOutline(courseCode, batchOptions);
    if (objectivesCancelRequested) return true;
    if (!outline?.length) return false;

    const courseIndex = await getPlaybackCourseIndex(courseCode, batchOptions);
    if (objectivesCancelRequested) return true;
    const routeByLessonNumber = courseIndexRouteMap(courseIndex, outline);

    for (const entry of outline) {
      if (objectivesCancelRequested) break;
      const lessonNumber = entry.lessonNumber;
      results.checked++;
      setObjectivesStatus({
        running: true,
        message:
          `Modalità API — modulo ${lessonNumber}/${outline.length}\n` +
          `Completati ora: ${results.completed}; già completati: ${results.alreadyCompleted}`,
      });

      const cachedObjective = cachedCompletedObjective(courseCode, lessonNumber);
      if (cachedObjective) {
        results.alreadyCompleted++;
        results.cached++;
        log(`Objectives API: module ${lessonNumber} reused from memory cache.`);
        continue;
      }

      const lesson = await requestLessonWithRetry(
        courseCode,
        lessonNumber,
        "data",
        null,
        null,
        routeByLessonNumber.get(lessonNumber)?.lpId || lessonNumber,
        true,
        routeByLessonNumber.get(lessonNumber)?.id || lessonNumber,
      );
      if (!lesson.ok) {
        results.failed++;
        log(`Objectives API: module ${lessonNumber} could not be read:`, lesson.error);
        await sleep(TURBO_API_PACING_MS);
        continue;
      }

      const objective = lesson.data?.objective;
      if (!objective) {
        results.unavailable++;
        log(`Objectives API: module ${lessonNumber} has no Obiettivi item.`);
        await sleep(TURBO_API_PACING_MS);
        continue;
      }
      if (Number(objective.percentage) >= 100) {
        results.alreadyCompleted++;
        log(`Objectives API: module ${lessonNumber} is already completed.`);
        await sleep(TURBO_API_PACING_MS);
        continue;
      }

      if (objectivesCancelRequested) break;
      const completed = await completeObjectiveViaApi(
        courseCode,
        lessonNumber,
        objective,
      );
      if (completed.ok && completed.data?.completed === true) {
        results.completed++;
        log(`Objectives API: module ${lessonNumber} completed.`, {
          lpId: objective.lp_id,
          lpItemId: objective.lp_item_id,
        });
      } else if (!objectivesCancelRequested) {
        results.failed++;
        log(`Objectives API: module ${lessonNumber} completion failed:`, completed.error);
      }
      await sleep(TURBO_API_PACING_MS);
    }

    if (results.completed > 0) await invalidateCourseIndexCache(courseCode);
    return true;
  }

  async function runObjectivesBatch() {
    if (window !== window.top) return;
    if (objectivesRunning) {
      setObjectivesStatus({ running: true, message: "Il completamento degli Obiettivi è già in esecuzione." });
      return;
    }
    if (collectingCourseMaterials || turboTestsRunning) {
      setObjectivesStatus({
        running: false,
        error: true,
        message: "Attendi il completamento dell’altra operazione di PlumePilot.",
      });
      return;
    }
    if (sections().length === 0) {
      setObjectivesStatus({
        running: false,
        error: true,
        message: "Nessuna sezione trovata. Apri prima la pagina dei contenuti del corso.",
      });
      return;
    }

    objectivesRunning = true;
    objectivesCancelRequested = false;
    clearTimeout(timer);
    timer = null;
    const results = {
      checked: 0,
      completed: 0,
      alreadyCompleted: 0,
      cached: 0,
      unavailable: 0,
      failed: 0,
    };

    try {
      setObjectivesStatus({
        running: true,
        message: "Completamento degli Obiettivi avviato. Preparazione del corso…",
      });
      const apiHandled = await runApiObjectives(results);
      if (!apiHandled && !objectivesCancelRequested) {
        throw new Error("API non disponibile. Nessun Obiettivo è stato modificato.");
      }
      const summary =
        `Controllati ${results.checked} capitoli. ` +
        `${results.completed} Obiettivi completati, ` +
        `${results.alreadyCompleted} già completati (${results.cached} dalla cache), ` +
        `${results.unavailable} non disponibili, ` +
        `${results.failed} non riusciti.`;
      setObjectivesStatus({
        running: false,
        error: !objectivesCancelRequested && results.failed > 0,
        outcome: objectivesCancelRequested ? "cancelled" : results.failed > 0 ? "error" : "success",
        message: objectivesCancelRequested
          ? `Completamento degli Obiettivi interrotto in sicurezza. ${summary}`
          : `Completamento degli Obiettivi terminato. ${summary}`,
      });
    } catch (error) {
      log("Objectives batch failed:", error);
      setObjectivesStatus({
        running: false,
        error: true,
        outcome: "error",
        message: `Completamento degli Obiettivi interrotto: ${error?.message || "Errore sconosciuto"}`,
      });
    } finally {
      objectivesRunning = false;
      objectivesCancelRequested = false;
      objectivesOperationId = null;
      if (enabled) resumeIfVideoAlreadyEnded();
    }
  }

  async function runTurboTests() {
    if (window !== window.top) {
      return;
    }

    if (turboTestsRunning) {
      setTurboTestStatus({
        running: true,
        message: "I test automatici sono già in esecuzione.",
      });
      return;
    }

    if (collectingCourseMaterials || objectivesRunning) {
      setTurboTestStatus({
        running: false,
        error: true,
        message: "Attendi il completamento dell’altra operazione di PlumePilot.",
      });
      return;
    }

    const initialSections = sections().map((section) => section.text);

    if (initialSections.length === 0) {
      setTurboTestStatus({
        running: false,
        error: true,
        message:
          "Nessuna sezione trovata. Apri prima la pagina dei contenuti del corso.",
      });
      return;
    }

    turboTestsRunning = true;
    turboTestsCancelRequested = false;
    clearTimeout(timer);
    timer = null;

    const results = {
      checked: 0,
      completed: 0,
      alreadyGreen: 0,
      cached: 0,
      unavailable: 0,
      failed: 0,
    };

    try {
      setTurboTestStatus({
        running: true,
        message: `Test automatici avviati. Controllo di ${initialSections.length} sezioni…`,
      });

      const apiHandled = await runApiTurboTests(results);
      if (!apiHandled && !turboTestsCancelRequested) {
        Object.assign(results, {
          checked: 0,
          completed: 0,
          alreadyGreen: 0,
          cached: 0,
          unavailable: 0,
          failed: 0,
        });
        setTurboTestStatus({
          running: true,
          message:
            "API non disponibile. Avvio della modalità visuale di sicurezza…",
        });

        for (
          let sectionIndex = 0;
          sectionIndex < initialSections.length;
          sectionIndex++
        ) {
          if (turboTestsCancelRequested) {
            break;
          }

          const sectionText = initialSections[sectionIndex];
          setTurboTestStatus({
            running: true,
            message: `Apertura sezione ${sectionIndex + 1}/${initialSections.length}: ${sectionText}`,
          });

          const sectionOpened = await openSection(sectionText);

          if (!sectionOpened) {
            results.failed++;
            continue;
          }

          const sectionChapters = chapters()
            .filter((chapter) => chapter.sectionText === sectionText)
            .map(chapterIdentity);

          for (
            let chapterIndex = 0;
            chapterIndex < sectionChapters.length;
            chapterIndex++
          ) {
            if (turboTestsCancelRequested) {
              break;
            }

            const identity = sectionChapters[chapterIndex];
            results.checked++;
            setTurboTestStatus({
              running: true,
              message:
                `Sezione ${sectionIndex + 1}/${initialSections.length}, ` +
                `capitolo ${chapterIndex + 1}/${sectionChapters.length}\n` +
                `${identity.chapterText}\n` +
                `Completati ora: ${results.completed}; già verdi: ${results.alreadyGreen}`,
            });

            const opened = await openChapter(identity);

            if (!opened) {
              results.failed++;
              continue;
            }

            const chapterReady = await waitFor(() => {
              const freshChapter = findChapter(identity);
              return freshChapter && chapterRows(freshChapter).length > 0
                ? freshChapter
                : null;
            });

            if (!chapterReady) {
              log("Turbo tests: chapter contents did not render:", identity);
              results.failed++;
              continue;
            }

            const test = getEndOfLessonTest(chapterReady);

            if (!test) {
              log("Turbo tests: no available end-of-lesson test:", identity);
              results.unavailable++;
              continue;
            }

            if (isEndOfLessonTestCompleted(test)) {
              log("Turbo tests: test is already green:", identity);
              results.alreadyGreen++;
              continue;
            }

            const completed = await completeEndOfLessonTest(
              identity,
              test,
              "turbo",
            );

            if (completed) {
              results.completed++;
            } else if (!turboTestsCancelRequested) {
              results.failed++;
            }
          }
        }
      }

      if (!apiHandled && results.completed > 0) {
        const courseCode = courseCodeFromUrl();
        if (courseCode) await invalidateCourseIndexCache(courseCode);
      }

      const summary =
        `Controllati ${results.checked} capitoli. ` +
        `${results.completed} test completati, ` +
        `${results.alreadyGreen} già verdi (${results.cached} dalla cache), ` +
        `${results.unavailable} non disponibili, ` +
        `${results.failed} non riusciti.`;

      if (turboTestsCancelRequested) {
        setTurboTestStatus({
          running: false,
          outcome: "cancelled",
          message: `Test automatici interrotti in sicurezza. ${summary}`,
        });
      } else {
        setTurboTestStatus({
          running: false,
          error: results.failed > 0,
          outcome: results.failed > 0 ? "error" : "success",
          message: `Test automatici completati. ${summary}`,
        });
      }
    } catch (error) {
      log("Turbo-test run failed:", error);
      setTurboTestStatus({
        running: false,
        error: true,
        outcome: "error",
        message: `Test automatici interrotti: ${error?.message || "Errore sconosciuto"}`,
      });
    } finally {
      turboTestsRunning = false;
      turboTestsCancelRequested = false;
      turboOperationId = null;

      if (enabled) {
        resumeIfVideoAlreadyEnded();
      }
    }
  }

  async function openChapter(
    identity,
    skipSectionCheck = false,
    exportOperationId = null,
  ) {
    const sectionOpened =
      skipSectionCheck ||
      (await openSection(identity.sectionText, exportOperationId));

    if (exportOperationId) ensureExportNotCancelled(exportOperationId);

    if (!sectionOpened) {
      return false;
    }

    const getChapter = () => findChapter(identity);

    let chapter = getChapter();

    if (!chapter) {
      log("Chapter not found:", identity);
      return false;
    }

    // Check the surrounding chapter container to see
    // whether the chevron is already pointing up.
    const getOuterChapter = (ch) =>
      ch.span.closest(".bg-white.text-base.border.font-sans.font-semibold");

    const isOpen = () => {
      const fresh = getChapter();

      if (!fresh) {
        return false;
      }

      const outer = getOuterChapter(fresh);

      return !!outer?.querySelector('[id*="chevron-up"]');
    };

    if (isOpen()) {
      log("Chapter already open:", identity);
      return true;
    }

    log("Opening chapter by clicking span:", identity);

    chapter.span.scrollIntoView({
      block: "center",
      behavior: "instant",
    });

    /*
     * This is now equivalent to the successful:
     *
     * $0.click()
     *
     * test you performed in DevTools.
     */
    chapter.span.click();

    const readOpenedChapter = () => (isOpen() ? getChapter() : null);
    const opened = exportOperationId
      ? await waitForExport(readOpenedChapter, WAIT_MS, exportOperationId)
      : await waitFor(readOpenedChapter);

    if (!opened) {
      log("Chapter did not open.");
      return false;
    }

    log("Chapter successfully opened:", identity);

    return true;
  }

  function isChapterOpen(identity) {
    const chapter = findChapter(identity);

    if (!chapter) return false;

    const outer = chapter.span.closest(
      ".bg-white.text-base.border.font-sans.font-semibold",
    );

    return !!outer?.querySelector('[id*="chevron-up"]');
  }

  async function reopenEmptyChapterAfterRecovery(identity) {
    const chapter = findChapter(identity);

    if (!chapter || !isChapterOpen(identity)) {
      return null;
    }

    log(
      "Chromium recovery: chapter is open but empty. Closing it before one controlled retry:",
      identity,
    );

    chapter.span.scrollIntoView({
      block: "center",
      behavior: "instant",
    });
    chapter.span.click();

    const closed = await waitFor(() =>
      findChapter(identity) && !isChapterOpen(identity) ? true : null,
    );

    if (!closed) {
      log("Chromium recovery: the empty chapter could not be closed safely.");
      return null;
    }

    await sleep(CHROMIUM_RECOVERY_REOPEN_DELAY_MS);

    const reopened = await openChapter(identity, true);

    if (!reopened) {
      log("Chromium recovery: controlled chapter reopen failed.");
      return null;
    }

    await sleep(CHAPTER_SETTLE_DELAY_MS);

    return await waitFor(() => {
      const fresh = findChapter(identity);

      return fresh && chapterRows(fresh).length > 0 ? fresh : null;
    });
  }

  function sameChapterIdentity(left, right) {
    return Boolean(
      left &&
      right &&
      left.sectionText === right.sectionText &&
      left.chapterText === right.chapterText,
    );
  }

  function resumeDiscoveryToast() {
    return window.StudyWingNotifications;
  }

  function setResumeDiscoveryStatus(message, state = "running") {
    const notifications = resumeDiscoveryToast();
    const fallbackProgress = state === "fallback" && /in corso|avvio|apertura|controllo|verifica visuale/i.test(message);
    const terminal = state === "success" || (state === "fallback" && !fallbackProgress);
    notifications?.show({
      message,
      type: state === "success" ? "success" : state === "fallback" ? "warning" : "info",
      key: "resume-discovery",
      progress: !terminal,
      terminal,
      durationMs: state === "success" ? 8000 : undefined,
    });
  }

  function removeResumeDiscoveryStatus() {
    window.StudyWingNotifications?.dismiss(false);
  }

  async function stopAtCurrentTestBeforeDiscovery(currentIdentity) {
    if (!stopAtTests || autoCompleteTests) return false;

    const currentChapter = findChapter(currentIdentity);
    const renderedTest = getEndOfLessonTest(currentChapter);

    if (renderedTest) {
      log("Stop at tests: test boundary found before resume discovery.");
      setResumeDiscoveryStatus(
        `Test di fine lezione raggiunto\n${currentIdentity.chapterText}`,
        "success",
      );
      renderedTest.scrollIntoView({ block: "center", behavior: "smooth" });
      return true;
    }

    const courseCode = courseCodeFromUrl();
    const lessonNumber = lessonNumberFromUrl();
    if (!courseCode || !lessonNumber) {
      log(
        "Stop at tests: current test could not be verified; stopping safely.",
      );
      setResumeDiscoveryStatus(
        "Impossibile verificare il test corrente. Avanzamento fermato per sicurezza.",
        "fallback",
      );
      return true;
    }

    setResumeDiscoveryStatus(
      `Verifica del test di fine lezione…\nModulo ${lessonNumber}: ${currentIdentity.chapterText}`,
    );
    const courseIndex = await getPlaybackCourseIndex(courseCode);
    const indexedChapter = courseIndex?.find(
      (entry) => entry.displayOrder === lessonNumber,
    );
    const lesson = await requestLessonWithRetry(
      courseCode,
      lessonNumber,
      "playback",
      null,
      null,
      indexedChapter?.lpId || lessonNumber,
      false,
      indexedChapter?.id || lessonNumber,
    );

    if (!enabled || !stopAtTests) {
      removeResumeDiscoveryStatus();
      return true;
    }

    if (!lesson.ok) {
      log(
        "Stop at tests: API verification failed; stopping safely:",
        lesson.error,
      );
      setResumeDiscoveryStatus(
        "Test corrente non verificabile. Avanzamento fermato per sicurezza.",
        "fallback",
      );
      return true;
    }

    const test = lesson.data.test;
    if (!test) {
      return false;
    }

    log("Stop at tests: API confirmed the current test boundary.", {
      lessonNumber,
      lpId: test.lp_id,
      lpItemId: test.lp_item_id,
    });
    setResumeDiscoveryStatus(
      `Test di fine lezione raggiunto\n${currentIdentity.chapterText}`,
      "success",
    );

    const freshTest = getEndOfLessonTest(findChapter(currentIdentity));
    freshTest?.scrollIntoView({ block: "center", behavior: "smooth" });
    return true;
  }

  async function getPlaybackCourseOutline(courseCode, options = {}) {
    if (
      playbackOutlineCourseCode === courseCode &&
      playbackCourseOutline?.length
    ) {
      return playbackCourseOutline;
    }

    const sectionNames = sections().map((section) => section.text);
    if (sectionNames.length === 0) return null;

    const outline = await apiCourseOutline(
      sectionNames,
      null,
      null,
      () => playbackDiscoveryCancelled(options),
    );
    if (!outline) return null;

    playbackCourseOutline = outline;
    playbackOutlineCourseCode = courseCode;
    return playbackCourseOutline;
  }

  async function getPlaybackCourseIndex(courseCode, options = {}) {
    if (
      options.forceRefresh !== true &&
      playbackCourseIndexCode === courseCode &&
      playbackCourseIndex?.length
    ) {
      return playbackCourseIndex;
    }

    let response = null;
    for (
      let attempt = 0;
      attempt <= COURSE_INDEX_RETRY_DELAYS_MS.length;
      attempt++
    ) {
      if (playbackDiscoveryCancelled(options)) return null;
      response = await turboApiRequest("outline", { courseCode });
      if (response.ok && Array.isArray(response.data?.entries)) break;
      if (attempt === COURSE_INDEX_RETRY_DELAYS_MS.length) break;
      await sleep(COURSE_INDEX_RETRY_DELAYS_MS[attempt]);
    }

    if (!response?.ok || !Array.isArray(response.data?.entries)) {
      log(
        "Course completion index unavailable; using detailed lesson discovery:",
        response?.error || "INVALID_COURSE_INDEX",
      );
      return null;
    }

    const entries = response.data.entries
      .map((entry) => {
        const displayOrder = Number(entry?.displayOrder);
        const percentage = Number(entry?.percentage);
        if (!Number.isInteger(displayOrder) || displayOrder < 1) return null;
        return {
          displayOrder,
          percentage: Number.isFinite(percentage) ? percentage : 0,
          id: Number.isInteger(Number(entry?.id)) ? Number(entry.id) : null,
          lpId: Number.isInteger(Number(entry?.lpId))
            ? Number(entry.lpId)
            : null,
          title: typeof entry?.title === "string" ? entry.title : null,
        };
      })
      .filter(Boolean)
      .sort((first, second) => first.displayOrder - second.displayOrder);

    if (!entries.length) return null;
    playbackCourseIndex = entries;
    playbackCourseIndexCode = courseCode;
    log(
      `Course completion index ready: ${entries.length} modules (${response.data.source || "unknown source"}).`,
    );
    return playbackCourseIndex;
  }

  function playbackDiscoveryCancelled(options = {}) {
    return (
      (!enabled && options.ignoreEnabled !== true) ||
      (collectingCourseMaterials && options.allowCollection !== true) ||
      (courseBatchRunning() && options.allowBatch !== true) ||
      options.isCancelled?.() === true
    );
  }

  async function findNextPlaybackTargetViaApi(
    currentIdentity,
    options = {},
  ) {
    const includeCurrent = options.includeCurrent === true;
    const ignoreStopAtTests = options.ignoreStopAtTests === true;
    setResumeDiscoveryStatus(
      includeCurrent
        ? "Ricerca della prima attività incompleta…"
        : "Ricerca della prossima attività da completare…",
    );

    const courseCode = courseCodeFromUrl();
    if (!courseCode) {
      log("API resume discovery unavailable: course code not found.");
      setResumeDiscoveryStatus(
        "Ricerca API non disponibile. Avvio della verifica visuale dei capitoli…",
        "fallback",
      );
      return { status: "fallback" };
    }

    const outline = await getPlaybackCourseOutline(courseCode, options);
    if (playbackDiscoveryCancelled(options)) {
      removeResumeDiscoveryStatus();
      return { status: "cancelled" };
    }
    if (!outline) {
      log("API resume discovery unavailable: course outline not found.");
      setResumeDiscoveryStatus(
        "Indice del corso non disponibile. Avvio della verifica visuale dei capitoli…",
        "fallback",
      );
      return { status: "fallback" };
    }

    const courseIndex = await getPlaybackCourseIndex(courseCode, options);
    if (playbackDiscoveryCancelled(options)) {
      removeResumeDiscoveryStatus();
      return { status: "cancelled" };
    }
    const completionByOrder = new Map(
      (courseIndex || []).map((entry) => [entry.displayOrder, entry]),
    );

    const currentIndex = outline.findIndex((entry) =>
      sameChapterIdentity(entry.identity, currentIdentity),
    );
    if (currentIndex < 0) {
      log(
        "API resume discovery could not map the current chapter:",
        currentIdentity,
      );
      setResumeDiscoveryStatus(
        "Capitolo corrente non riconosciuto. Avvio della verifica visuale…",
        "fallback",
      );
      return { status: "fallback" };
    }

    const firstIndex = includeCurrent ? currentIndex : currentIndex + 1;

    if (options.bookmarkSearch && courseIndex?.length) {
      let masterIndexComplete = true;

      for (let index = firstIndex; index < outline.length; index++) {
        if (playbackDiscoveryCancelled(options)) {
          removeResumeDiscoveryStatus();
          return { status: "cancelled" };
        }

        const entry = outline[index];
        const indexedChapter = completionByOrder.get(entry.lessonNumber);

        if (!indexedChapter) {
          masterIndexComplete = false;
          log(
            `Master course index has no display_order ${entry.lessonNumber}; ` +
              "using detailed discovery from that chapter.",
          );
          break;
        }

        if (Number(indexedChapter.percentage) >= 100) {
          log(
            `Master course index: display_order ${entry.lessonNumber} is 100%; skipping it.`,
          );
          continue;
        }

        const visibleTitle = normalizedText(entry.identity.chapterText)
          .replace(/^\d+\s*-\s*/, "")
          .toLowerCase();
        const indexedTitle = normalizedText(indexedChapter.title).toLowerCase();

        log(
          "First-incomplete bookmark selected the first below-100% master-index entry.",
          {
            displayOrder: indexedChapter.displayOrder,
            lpId: indexedChapter.lpId,
            percentage: indexedChapter.percentage,
            indexedTitle: indexedChapter.title,
            visibleChapter: entry.identity,
            titleMatches:
              !indexedTitle || indexedTitle === visibleTitle,
          },
        );
        setResumeDiscoveryStatus(
          `Primo capitolo incompleto — modulo ${indexedChapter.displayOrder} (${Math.round(indexedChapter.percentage)}%)\n${entry.identity.chapterText}`,
          "success",
        );
        return {
          status: "target",
          entry,
          unfinishedItem: null,
          visualVerification: true,
          masterIndexTarget: true,
          lessonLpId: indexedChapter.lpId || entry.lessonNumber,
          lessonParagraphId: indexedChapter.id || entry.lessonNumber,
        };
      }

      if (masterIndexComplete) {
        setResumeDiscoveryStatus(
          "Ricerca completata: tutti i capitoli risultano al 100%.",
          "success",
        );
        return { status: "end" };
      }
    }

    for (let index = firstIndex; index < outline.length; index++) {
      if (playbackDiscoveryCancelled(options)) {
        removeResumeDiscoveryStatus();
        return { status: "cancelled" };
      }

      const entry = outline[index];
      const indexedChapter = completionByOrder.get(entry.lessonNumber);
      const lessonLpId = indexedChapter?.lpId || entry.lessonNumber;

      if (indexedChapter && Number(indexedChapter.percentage) >= 100) {
        log(
          `Course index: module ${entry.lessonNumber} is 100%; skipping its detailed API call.`,
        );
        continue;
      }

      setResumeDiscoveryStatus(
        `${includeCurrent ? "Ricerca della prima attività incompleta" : "Ricerca della prossima attività"}…\n` +
          `Controllo modulo ${entry.lessonNumber}/${outline.length}: ${entry.identity.chapterText}` +
          (indexedChapter
            ? ` (${Math.round(indexedChapter.percentage)}%)`
            : ""),
      );
      const lesson = await requestLessonWithRetry(
        courseCode,
        entry.lessonNumber,
        "playback",
        null,
        null,
        lessonLpId,
        false,
        indexedChapter?.id || entry.lessonNumber,
      );

      if (playbackDiscoveryCancelled(options)) {
        removeResumeDiscoveryStatus();
        return { status: "cancelled" };
      }

      if (!lesson.ok) {
        log(
          `API resume discovery could not read module ${entry.lessonNumber}; ` +
            "opening that module directly for visual verification:",
          lesson.error,
        );
        setResumeDiscoveryStatus(
          `Dati API incompleti per il modulo ${entry.lessonNumber}. ` +
            "Verifica visuale diretta del capitolo…",
          "fallback",
        );
        return {
          status: "target",
          entry,
          unfinishedItem: null,
          visualVerification: true,
        };
      }

      const unfinishedItem = lesson.data.playbackItems.find(
        (item) => Number(item.percentage) < 100,
      );
      const test = lesson.data.test;
      const pendingTest = test && Number(test.percentage) < 100;
      const testNeedsAttention =
        Boolean(test) &&
        ((!ignoreStopAtTests &&
          stopAtTests &&
          (!options.pendingTestsOnly || pendingTest)) ||
          (autoCompleteTests && pendingTest));

      if (
        !unfinishedItem &&
        (autoCompleteTests || (!ignoreStopAtTests && stopAtTests)) &&
        !test
      ) {
        log(
          `API resume discovery did not receive test metadata for module ${entry.lessonNumber}; ` +
            "opening that module directly for visual verification.",
        );
        setResumeDiscoveryStatus(
          `Dati del test non disponibili per il modulo ${entry.lessonNumber}. ` +
            "Verifica visuale diretta del capitolo…",
          "fallback",
        );
        return {
          status: "target",
          entry,
          unfinishedItem: null,
          visualVerification: true,
          testMetadataUnavailable: true,
        };
      }

      if (unfinishedItem || testNeedsAttention) {
        log(
          "API resume discovery found the next chapter requiring attention.",
          {
            lessonNumber: entry.lessonNumber,
            lpId: lessonLpId,
            chapter: entry.identity,
            itemType: unfinishedItem?.contentType || "test",
            itemTitle: unfinishedItem?.title || test?.title || null,
            percentage: Number(
              unfinishedItem?.percentage ?? test?.percentage ?? 0,
            ),
          },
        );
        const activityTitle =
          unfinishedItem?.title || test?.title || "Attività successiva";
        setResumeDiscoveryStatus(
          `Prossima attività trovata — modulo ${entry.lessonNumber}\n${activityTitle}`,
          "success",
        );
        return {
          status: "target",
          entry,
          unfinishedItem: unfinishedItem || null,
          testTarget: !unfinishedItem && testNeedsAttention ? test : null,
          lessonLpId,
          lessonParagraphId: indexedChapter?.id || entry.lessonNumber,
        };
      }

      log(
        `API resume discovery: module ${entry.lessonNumber} is complete; skipping it.`,
      );
      await sleep(TURBO_API_PACING_MS);
    }

    setResumeDiscoveryStatus(
      "Ricerca completata: non risultano altre attività da completare.",
      "success",
    );
    return { status: "end" };
  }

  async function openNextAvailableChapter(
    currentIdentity,
    oldVideo,
    recovering = false,
    options = {},
  ) {
    if (playbackDiscoveryCancelled(options)) {
      return false;
    }

    if (
      options.skipCurrentTestBoundary !== true &&
      options.ignoreStopAtTests !== true &&
      (await stopAtCurrentTestBeforeDiscovery(currentIdentity))
    ) {
      stoppedAtTestContext = {
        identity: currentIdentity,
        oldVideo,
      };

      log(
        "Stop at tests is active. Resume discovery will not inspect later modules.",
      );
      return false;
    }

    let nextIdentity = null;
    let apiUnfinishedItem = null;
    let apiTestTarget = null;
    let apiVisualVerification = false;
    let apiLessonLpId = null;
    let apiLessonParagraphId = null;
    const apiDiscovery = await findNextPlaybackTargetViaApi(
      currentIdentity,
      options,
    );

    if (apiDiscovery.status === "cancelled") {
      log(
        "API resume discovery stopped because autoplay or another operation changed.",
      );
      return false;
    }

    if (apiDiscovery.status === "end") {
      log(
        "API resume discovery found no remaining chapters requiring attention.",
      );
      return false;
    }

    if (apiDiscovery.status === "target") {
      nextIdentity = apiDiscovery.entry.identity;
      apiUnfinishedItem = apiDiscovery.unfinishedItem;
      apiTestTarget = apiDiscovery.testTarget;
      apiVisualVerification = apiDiscovery.visualVerification === true;
      apiLessonLpId = apiDiscovery.lessonLpId || null;
      apiLessonParagraphId = apiDiscovery.lessonParagraphId || null;
    }

    if (!nextIdentity && options.includeCurrent === true) {
      nextIdentity = currentIdentity;
    }

    if (!nextIdentity) {
      const sectionList = sections();
      const currentSectionIndex = sectionList.findIndex(
        (section) => section.text === currentIdentity.sectionText,
      );

      if (currentSectionIndex < 0) {
        log("Current course section was not found:", currentIdentity);
        return false;
      }

      await openSection(currentIdentity.sectionText);

      const currentSectionChapters = chapters().filter(
        (chapter) => chapter.sectionText === currentIdentity.sectionText,
      );
      const currentChapterIndex = currentSectionChapters.findIndex(
        (chapter) => chapter.text === currentIdentity.chapterText,
      );

      if (
        currentChapterIndex >= 0 &&
        currentChapterIndex + 1 < currentSectionChapters.length
      ) {
        nextIdentity = chapterIdentity(
          currentSectionChapters[currentChapterIndex + 1],
        );
      } else {
        for (
          let sectionIndex = currentSectionIndex + 1;
          sectionIndex < sectionList.length;
          sectionIndex++
        ) {
          const nextSectionText = sectionList[sectionIndex].text;
          const sectionOpened = await openSection(nextSectionText);

          if (!sectionOpened) {
            continue;
          }

          const firstChapter = chapters().find(
            (chapter) => chapter.sectionText === nextSectionText,
          );

          if (firstChapter) {
            nextIdentity = chapterIdentity(firstChapter);
            break;
          }
        }
      }
    }

    if (!nextIdentity) {
      log("No more chapters or course sections available.");
      setResumeDiscoveryStatus(
        "Verifica completata: non risultano altri capitoli da controllare.",
        "success",
      );
      return false;
    }

    if (playbackDiscoveryCancelled(options)) {
      removeResumeDiscoveryStatus();
      return false;
    }

    if (
      apiTestTarget &&
      autoCompleteTests &&
      Number(apiTestTarget.percentage) < 100
    ) {
      setResumeDiscoveryStatus(
        `Completamento del test — modulo ${apiDiscovery.entry.lessonNumber}…\n${nextIdentity.chapterText}`,
      );
      log(
        "API resume discovery found a test-only target; completing it without opening the chapter:",
        nextIdentity,
      );
      const completed = await completeEndOfLessonTestViaApi(
        nextIdentity,
        apiDiscovery.entry.lessonNumber,
        apiTestTarget,
      );

      if (completed) {
        setResumeDiscoveryStatus(
          `Test completato — modulo ${apiDiscovery.entry.lessonNumber}\n${nextIdentity.chapterText}`,
          "success",
        );
        return await openNextAvailableChapter(
          nextIdentity,
          oldVideo,
          false,
          { ...options, includeCurrent: false },
        );
      }

      if (playbackDiscoveryCancelled(options)) {
        removeResumeDiscoveryStatus();
        return false;
      }

      log(
        "Direct test completion failed; opening only the target chapter for visual fallback.",
      );
    }

    if (apiVisualVerification) {
      setResumeDiscoveryStatus(
        `Controllo visuale del modulo ${apiDiscovery.entry.lessonNumber}…\n${nextIdentity.chapterText}`,
        "fallback",
      );
    } else if (apiDiscovery.status === "fallback") {
      setResumeDiscoveryStatus(
        `Verifica visuale in corso…\nApertura: ${nextIdentity.chapterText}`,
        "fallback",
      );
    }

    log("Checking next chapter:", nextIdentity);

    if (recovering && IS_CHROMIUM) {
      log(
        "Chromium recovery: allowing UniPegaso's internal course state to settle before opening the target chapter:",
        nextIdentity,
      );
      await sleep(CHROMIUM_RECOVERY_PREOPEN_DELAY_MS);
    }

    /*
     * Open the next chapter.
     */
    const opened = await openChapter(nextIdentity);

    if (!opened) {
      log("Could not open chapter:", nextIdentity);

      return false;
    }

    log("Waiting before interacting with the next chapter:", nextIdentity);

    await sleep(CHAPTER_SETTLE_DELAY_MS);

    if (playbackDiscoveryCancelled(options)) {
      removeResumeDiscoveryStatus();
      return false;
    }

    /*
     * Wait until the chapter rows exist.
     */
    let chapterReady = await waitFor(() => {
      const fresh = findChapter(nextIdentity);

      if (!fresh) {
        return null;
      }

      const rows = chapterRows(fresh);

      return rows.length > 0 ? fresh : null;
    });

    if (!chapterReady) {
      log("Chapter opened but its contents were not rendered:", nextIdentity);

      if (recovering && IS_CHROMIUM) {
        chapterReady = await reopenEmptyChapterAfterRecovery(nextIdentity);

        if (chapterReady) {
          log(
            "Chromium recovery: chapter contents rendered after the controlled reopen:",
            nextIdentity,
          );
        }
      }

      if (!chapterReady) {
        const reloading = reloadForChapterRecovery(currentIdentity);

        return reloading ? "reloaded" : false;
      }
    }

    if (playbackDiscoveryCancelled(options)) {
      removeResumeDiscoveryStatus();
      return false;
    }

    if (apiTestTarget) {
      const renderedTest = getEndOfLessonTest(chapterReady);

      if (autoCompleteTests && Number(apiTestTarget.percentage) < 100) {
        const completed = await completeAutomaticEndOfLessonTest(
          nextIdentity,
          renderedTest,
        );
        if (!completed) {
          log("The API-confirmed pending test could not be completed safely.");
          return false;
        }

        return await openNextAvailableChapter(
          nextIdentity,
          oldVideo,
          false,
          { ...options, includeCurrent: false },
        );
      }

      if (stopAtTests && options.ignoreStopAtTests !== true) {
        log("API-confirmed test boundary reached. Stopping here:", nextIdentity);
        setResumeDiscoveryStatus(
          `Test di fine lezione raggiunto\n${nextIdentity.chapterText}`,
          "success",
        );
        renderedTest?.scrollIntoView({ block: "center", behavior: "smooth" });
        stoppedAtTestContext = { identity: nextIdentity, oldVideo };
        return false;
      }
    }

    /*
     * Find Obiettivi.
     */
    const rows = chapterRows(chapterReady);

    const objectiveRow = rows.find(
      (row) => lessonName(row).toLowerCase() === "obiettivi",
    );

    const chapterAlreadyStarted = rows.some((row) => {
      const name = lessonName(row).toLowerCase();

      return name !== "obiettivi" && getProgress(row) > 0;
    });

    const apiObjectivePending = apiUnfinishedItem?.contentType === "intro";
    const apiObjectiveKnown =
      apiDiscovery.status === "target" && apiVisualVerification !== true;
    const shouldOpenObjective = apiObjectiveKnown
      ? apiObjectivePending
      : !chapterAlreadyStarted;

    if (objectiveRow && shouldOpenObjective) {
      log("Opening pending Obiettivi.");

      clickRow(objectiveRow);

      log(
        "Waiting for UniPegaso to release Obiettivi before opening its first video.",
      );

      await sleep(OBJECTIVES_SETTLE_DELAY_MS);

      if (playbackDiscoveryCancelled(options)) {
        removeResumeDiscoveryStatus();
        return false;
      }
    } else if (objectiveRow && apiObjectiveKnown) {
      log(
        "API reports Obiettivi already completed. Skipping them and opening the unfinished activity.",
      );
    } else if (chapterAlreadyStarted) {
      log(
        "Chapter already started. Skipping Obiettivi and resuming the unfinished video.",
      );
    } else {
      log("Obiettivi not found in chapter:", nextIdentity);
    }

    /*
     * Vue may have updated the DOM after clicking
     * Obiettivi, so reacquire the chapter.
     */
    const freshChapter = findChapter(nextIdentity);

    if (!freshChapter) {
      log("Could not reacquire chapter:", nextIdentity);

      return false;
    }

    /*
     * Find the first unfinished video.
     */
    const unfinished = firstUnfinishedVideo(nextIdentity);

    if (!unfinished) {
      log("All videos completed in chapter:", nextIdentity);

      /*
       * Videos are complete, but the chapter may still contain
       * a pending end-of-lesson test.
       */
      const test = getEndOfLessonTest(freshChapter);

      if (test) {
        const testAlreadyCompleted = isEndOfLessonTestCompleted(test);

        if (
          stopAtTests &&
          options.ignoreStopAtTests !== true &&
          (!options.pendingTestsOnly || !testAlreadyCompleted)
        ) {
          log("Test boundary reached. Stopping here:", nextIdentity);
          setResumeDiscoveryStatus(
            `Test di fine lezione raggiunto\n${nextIdentity.chapterText}`,
            "success",
          );
          test.scrollIntoView({ block: "center", behavior: "smooth" });
          stoppedAtTestContext = {
            identity: nextIdentity,
            oldVideo,
          };
          return false;
        } else if (testAlreadyCompleted) {
          log("End-of-lesson test is already green:", nextIdentity);
        } else if (autoCompleteTests) {
          log(
            "Videos are complete, but the test is pending. Completing it:",
            nextIdentity,
          );

          const testCompleted = await completeAutomaticEndOfLessonTest(
            nextIdentity,
            test,
            apiDiscovery.entry?.lessonNumber || null,
            apiLessonLpId,
            apiLessonParagraphId,
          );

          if (!testCompleted) {
            log(
              "Chapter cannot be skipped because its test was not safely completed.",
            );

            return false;
          }
        } else {
          log(
            options.ignoreStopAtTests === true
              ? "Pending test ignored during first-incomplete discovery."
              : "Pending test found, but automatic completion and Stop at tests are disabled. Leaving it untouched.",
          );
        }
      } else {
        log("No end-of-lesson test found in chapter:", nextIdentity);
      }

      log("Chapter requirements handled. Checking following chapter.");

      return await openNextAvailableChapter(
        nextIdentity,
        oldVideo,
        false,
        { ...options, includeCurrent: false },
      );
    }

    /*
     * We found something below 100%.
     */
    log(
      "First unfinished video:",
      lessonName(unfinished),
      getProgress(unfinished) + "%",
    );

    if (apiDiscovery.status === "fallback" || apiVisualVerification) {
      setResumeDiscoveryStatus(
        `Attività trovata con la verifica visuale\n${lessonName(unfinished)}`,
        "success",
      );
    }

    clickRow(unfinished);
    if (options.bookmarkSearch) {
      removeResumeDiscoveryStatus();
    }

    /*
     * Wait for UniPegaso to load the video.
     */
    const newVideo = await waitFor(() => {
      const v = video();

      return v && v !== oldVideo ? v : null;
    });

    /*
     * UniPegaso may reuse the same <video>.
     */
    const v = newVideo || video();

    if (!v) {
      log("Could not find the video after selecting:", lessonName(unfinished));

      return false;
    }

    attach(v);
    removeResumeDiscoveryStatus();
    if (options.bookmarkSearch) {
      log(
        "First-incomplete bookmark opened the target video without forcing playback:",
        lessonName(unfinished),
      );
    }

    return true;
  }

  async function nextChapter(oldVideo, oldLesson) {
    const current = currentChapter(oldLesson);

    if (!current) {
      log("Could not determine current chapter.");
      return;
    }

    log("End of chapter:", chapterIdentity(current));

    return await openNextAvailableChapter(chapterIdentity(current), oldVideo);
  }

  async function advance(v) {
    if (findWatchValidationModal()) {
      handleWatchValidationModal();
      log(
        "Advance cancelled because UniPegaso rejected the current viewing session.",
      );
      return;
    }

    if (collectingCourseMaterials) {
      log("Advance postponed while course material links are being collected.");
      return;
    }

    if (courseBatchRunning()) {
      log("Advance postponed while a PlumePilot batch operation is running.");
      return;
    }

    if (!enabled) {
      log("Advance cancelled: extension paused.");
      return;
    }

    if (busy || v !== lastVideo) {
      return;
    }

    busy = true;

    try {
      const cur = currentLesson();

      if (!cur) {
        log("Could not determine current lesson.");
        return;
      }

      const completed = await waitForLessonCompletion(cur, v);

      if (!completed) {
        log(
          "Advance cancelled because the current lesson was not confirmed as completed.",
        );
        return;
      }

      const next = nextLesson(cur);

      log(
        "Current:",
        lessonName(cur),
        "Next:",
        next ? lessonName(next) : "(end of chapter)",
      );

      // There is another video in the SAME chapter.
      if (next) {
        clickRow(next);

        const newVideo = await waitFor(() => {
          const x = video();
          return x && x !== v ? x : null;
        });

        const x = newVideo || video();

        if (x) {
          attach(x);
        } else {
          log("Could not find the next video after clicking it.");
        }

        return;
      }

      // No more videos in this chapter.
      const chapter = currentChapter(cur);

      if (!chapter) {
        log("Could not determine chapter at end of lesson.");
        return;
      }

      const test = getEndOfLessonTest(chapter);

      if (test && stopAtTests) {
        log(
          "End-of-lesson test boundary reached. Automatic progression stopped.",
        );
        setResumeDiscoveryStatus(
          `Test di fine lezione raggiunto\n${chapterIdentity(chapter).chapterText}`,
          "success",
        );
        test.scrollIntoView({ block: "center", behavior: "smooth" });
        stoppedAtTestContext = {
          identity: chapterIdentity(chapter),
          oldVideo: v,
        };
        return;
      } else if (test && isEndOfLessonTestCompleted(test)) {
        log("End-of-lesson test is already green. Skipping it.");
      } else if (test && autoCompleteTests) {
        const testCompleted = await completeAutomaticEndOfLessonTest(
          chapterIdentity(chapter),
          test,
        );

        if (!testCompleted) {
          log(
            "Automatic progression stopped because the test was not safely completed.",
          );
          return;
        }
      } else if (test) {
        log(
          "End-of-lesson test detected, but Stop at tests is disabled. Continuing.",
        );
      }

      log("End of chapter reached. Moving to next chapter.");

      if (chapterLimitReached(chapterIdentity(chapter))) {
        const activeLimit = Math.min(chapterLimit, chapterLimitMaximum);
        log(`Autoplay session limit reached after ${activeLimit} chapters.`);
        setResumeDiscoveryStatus(
          `Limite della sessione raggiunto: ${activeLimit} capitoli completati.`,
          "success",
        );
        return;
      }

      await nextChapter(v, cur);
    } finally {
      busy = false;
    }
  }

  function resumeAfterTestBoundary(context) {
    clearTimeout(timer);

    timer = setTimeout(async () => {
      timer = null;

      if (!enabled || stopAtTests) {
        return;
      }

      if (collectingCourseMaterials || courseBatchRunning()) {
        log("Resume postponed because another PlumePilot operation is running.");
        return;
      }

      log("Continuing after the test boundary:", context.identity);

      await openNextAvailableChapter(context.identity, context.oldVideo);
    }, RESUME_DELAY_MS);
  }

  async function startFirstIncompleteDiscovery(reason) {
    const courseCode = courseCodeFromUrl();
    if (!enabled || !courseCode) {
      setResumeDiscoveryStatus(
        !enabled
          ? "Attiva l’avanzamento automatico per usare il segnalibro."
          : "Apri la pagina delle lezioni di un corso prima di avviare la ricerca.",
        "fallback",
      );
      return;
    }

    if (
      readChapterRecovery()?.currentIdentity ||
      readSessionConflictRecovery() ||
      readWatchValidationRecovery()
    ) {
      log(
        "First-incomplete discovery skipped while a protected playback recovery is active.",
      );
      setResumeDiscoveryStatus(
        "Ripristino della riproduzione in corso. Riprova tra qualche istante.",
        "fallback",
      );
      return;
    }

    if (smartResumeRunning) {
      log("Duplicate first-incomplete bookmark request ignored:", reason);
      return;
    }

    if (collectingCourseMaterials || courseBatchRunning() || busy) {
      log(
        "First-incomplete bookmark unavailable because another PlumePilot operation is running.",
      );
      setResumeDiscoveryStatus(
        "Un’altra operazione di PlumePilot è in corso. Riprova al termine.",
        "fallback",
      );
      return;
    }

    smartResumeRunning = true;
    const generation = ++smartResumeGeneration;

    try {
      log("Starting first-incomplete discovery:", reason);
      setResumeDiscoveryStatus(
        "Preparazione del segnalibro: ricerca dall’inizio del corso…",
      );

      const isCancelled = () =>
        generation !== smartResumeGeneration ||
        !enabled ||
        busy;

      const courseReady = await waitFor(
        () => (sections().length > 0 ? true : null),
        SMART_RESUME_READY_TIMEOUT_MS,
      );

      if (!courseReady || isCancelled()) {
        if (!courseReady && !isCancelled()) {
          log(
            "First-incomplete bookmark could not read the course structure.",
          );
          setResumeDiscoveryStatus(
            "Struttura del corso non disponibile. Ricerca non avviata.",
            "fallback",
          );
        }
        return;
      }

      const outline = await getPlaybackCourseOutline(courseCode, {
        isCancelled,
      });
      const startingEntry = outline?.[0] || null;

      if (!startingEntry || isCancelled()) {
        if (!isCancelled()) {
          setResumeDiscoveryStatus(
            "Impossibile individuare il primo capitolo del corso.",
            "fallback",
          );
        }
        return;
      }

      log(
        "First-incomplete bookmark starting from the beginning of the course:",
        startingEntry.identity,
      );

      const openedTarget = await openNextAvailableChapter(
        startingEntry.identity,
        video(),
        false,
        {
          includeCurrent: true,
          ignoreStopAtTests: false,
          skipCurrentTestBoundary: true,
          pendingTestsOnly: true,
          bookmarkSearch: true,
          isCancelled,
        },
      );
      if (openedTarget === true && !isCancelled()) {
        window.postMessage({ type: "STUDYWING_ACHIEVEMENT_CLAIM_REQUEST", achievementId: "find-first-incomplete" }, "*");
      }
    } catch (error) {
      log("First-incomplete discovery failed safely:", error);
      setResumeDiscoveryStatus(
        `Ricerca della prima attività incompleta non riuscita: ${error?.message || "errore sconosciuto"}`,
        "fallback",
      );
    } finally {
      smartResumeRunning = false;
    }
  }

  async function resumeIfVideoAlreadyEnded() {
    const v = video();
    const activeRow = currentLesson();

    if (lessonName(activeRow).toLowerCase() === "obiettivi") {
      log("Resume requested while Obiettivi is active.");
      resumeFromObjectives(activeRow);
      return;
    }

    if (!v) {
      log("Resume requested, but no video was found.");
      return;
    }

    const playerReachedEnd =
      v.ended ||
      (Number.isFinite(v.duration) &&
        v.duration > 0 &&
        v.currentTime >= v.duration - 0.5);
    const lessonRegisteredComplete =
      Boolean(activeRow) && getProgress(activeRow) >= 100;

    if (!playerReachedEnd && !lessonRegisteredComplete) {
      log("Extension resumed. Current video is still in progress.");
      return;
    }

    if (lessonRegisteredComplete && !playerReachedEnd) {
      log(
        "Extension resumed. UniPegaso already registered the current video at 100%; searching for the next unfinished activity.",
      );
    } else {
      log("Extension resumed with an already completed video.");
    }

    lastVideo = v;

    clearTimeout(timer);

    timer = setTimeout(async () => {
      if (!enabled) {
        return;
      }

      const stableLesson = await waitFor(() => {
        const lesson = currentLesson();
        const currentVideo = video();

        if (!lesson || !currentVideo) {
          return null;
        }

        /*
         * Make sure the page still considers the same video finished or its
         * lesson registered at 100% before attempting the transition.
         */
        const stillFinished =
          currentVideo === v &&
          (currentVideo.ended ||
            (Number.isFinite(currentVideo.duration) &&
              currentVideo.duration > 0 &&
              currentVideo.currentTime >= currentVideo.duration - 0.5) ||
            getProgress(lesson) >= 100);

        return stillFinished ? lesson : null;
      });

      if (!stableLesson) {
        log("Resume cancelled: page state did not stabilize.");
        return;
      }

      log("Resume state stable. Advancing from:", lessonName(stableLesson));

      await advance(v);
    }, RESUME_DELAY_MS);
  }

  function attach(v) {
    if (!v || v.dataset.pegasoAutoNextAttached === "1") return;
    v.dataset.pegasoAutoNextAttached = "1";
    v.addEventListener("ended", () => {
      void captureEndedVideoProgress(v);
      if (!enabled) {
        log("Video ended, but extension is paused.");
        return;
      }

      if (lastVideo === v) return;
      lastVideo = v;
      clearTimeout(timer);
      log("Video ended; advancing.");
      timer = setTimeout(() => {
        if (enabled) {
          advance(v);
        }
      }, DELAY_MS);
    });
    log("Attached to video.");
  }

  function scan() {
    document.querySelectorAll("video").forEach(attach);
    scheduleSessionConflictScan();
    if (!courseProgressState || courseProgressState.baselinePercent === null) {
      scheduleCourseProgressInitialization(250);
    }
  }

  new MutationObserver(scan).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  scan();
  verifySessionConflictRecoveryAfterReload();
  verifyWatchValidationRecoveryAfterReload();
  recoverAfterReload();
})();

(() => {
  "use strict";

  if (window !== window.top) return;

  const HOST_ID = "studywing-floating-menu-host";
  const PROGRESS_OVERLAY_HOST_ID = "studywing-course-progress-overlay-host";
  const COURSE_SELECTOR = "div.flex-wrap.bg-platform-light-gray";
  const EXAM_ONLINE_PATH = "/exam-online";
  const HOME_PATHS = new Set([
    "/",
    "/home",
    "/homepage",
    "/home-page",
    "/dashboard",
    "/student",
    "/student/home",
    "/student/dashboard",
  ]);
  const LAUNCHER_SIZES = Object.freeze({ small: 42, medium: 46, large: 50 });
  const EDGE_MARGIN = 18;
  const PANEL_GAP = 12;
  const MASCOT_IDLE_MIN_DELAY_MS = 25000;
  const MASCOT_IDLE_MAX_DELAY_MS = 45000;
  const DEFAULT_POSITION = { edge: "right", offset: 0.5 };
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const commissionStates = globalThis.StudyWingCommissionState;
  const achievements = globalThis.StudyWingAchievements;
  const defaults = {
    enabled: true,
    stopAtTests: false,
    autoCompleteTests: false,
    autoplayChapterLimitEnabled: false,
    autoplayChapterLimits: {},
    autoplayChapterLimitSessions: {},
    autoplayChapterLimitStatuses: {},
    courseProgressOverlayEnabled: false,
    courseProgressOverlayPosition: "bottom",
    courseProgressThresholdEnabled: false,
    courseProgressThresholdNotified: {},
    playbackErrorRecovery: "automatic",
    visualStyle: "standard",
    themePreference: "system",
    menuSize: "medium",
    floatingMenuEnabled: true,
    floatingMenuPosition: DEFAULT_POSITION,
    commissionCheckEnabled: false,
    commissionExams: [],
    commissionExamsCapturedAt: null,
    commissionUnseenExamIds: [],
    pegasoActiveOperation: null,
    studywingLastNotification: null,
    studywingAchievements: null,
    gamingCosmetics: { barStyle: "arcane", launcherStyle: "arcane" },
  };

  let settings = { ...defaults };
  let host = null;
  let ui = null;
  let visibilityTimer = null;
  let feedbackTimer = null;
  let notificationTimer = null;
  let mascotIdleTimer = null;
  let dragState = null;
  let suppressLauncherClick = false;
  let lastUnseenAlertSignature = "";
  let activeMenuTab = null;
  let courseProgressStatus = null;
  let progressOverlayHost = null;
  let progressOverlayUi = null;
  let progressOverlayBaseline = { courseCode: "", percent: null };
  let progressOverlayExpTimer = null;
  let progressOverlayExpStartTimer = null;
  const progressOverlayExpQueue = [];
  let thresholdActivationAwaitingBaseline = false;
  let lastNotification = null;
  const pendingThresholdClaims = new Set();
  const silentlyAcknowledgedThresholds = new Set();

  function currentCourseCode() {
    return String(
      location.pathname.match(/\/videolezioni\/([^/?#]+)/i)?.[1] || "",
    );
  }

  function requestChapterLimitStatus() {
    if (!currentCourseCode()) return;
    window.postMessage({ type: "PEGASO_CHAPTER_LIMIT_STATUS_REQUEST" }, "*");
  }

  function requestCourseProgressStatus() {
    if (!currentCourseCode()) return;
    window.postMessage({ type: "PEGASO_COURSE_PROGRESS_STATUS_REQUEST" }, "*");
  }

  function normalizeTheme(value) {
    return value === "light" || value === "dark" ? value : "system";
  }

  function applyTheme() {
    const preference = normalizeTheme(settings.themePreference);
    const theme =
      preference === "system"
        ? systemTheme.matches
          ? "dark"
          : "light"
        : preference;
    if (host) host.dataset.studywingTheme = theme;
    if (progressOverlayHost) progressOverlayHost.dataset.theme = theme;
  }

  function normalizeVisualStyle(value) {
    return value === "gaming" ? "gaming" : "standard";
  }

  function canPlayMascotIdle() {
    return Boolean(
      ui &&
      host?.isConnected &&
      normalizeVisualStyle(settings.visualStyle) === "gaming" &&
      document.visibilityState === "visible" &&
      !reducedMotion.matches &&
      !dragState,
    );
  }

  function actionSprites() {
    return ui
      ? [
          ui.turboSprite,
          ui.objectivesSprite,
          ui.testCollectionSprite,
          ui.materialsSprite,
        ]
      : [];
  }

  function controlSprites() {
    return ui
      ? [
          ui.autoplayControlSprite,
          ui.playbackRecoveryControlSprite,
          ui.commissionControlSprite,
        ]
      : [];
  }

  function animatedSprites() {
    return [...actionSprites(), ...controlSprites()];
  }

  function playActionAnimation(sprite) {
    if (
      !ui ||
      normalizeVisualStyle(settings.visualStyle) !== "gaming" ||
      reducedMotion.matches
    )
      return;
    sprite.classList.remove("is-playing");
    void sprite.offsetWidth;
    sprite.classList.add("is-playing");
  }

  function scheduleMascotIdle() {
    clearTimeout(mascotIdleTimer);
    mascotIdleTimer = null;
    if (!canPlayMascotIdle()) return;
    const delay =
      MASCOT_IDLE_MIN_DELAY_MS +
      Math.random() * (MASCOT_IDLE_MAX_DELAY_MS - MASCOT_IDLE_MIN_DELAY_MS);
    mascotIdleTimer = setTimeout(() => {
      mascotIdleTimer = null;
      if (canPlayMascotIdle()) {
        ui.launcher.classList.remove("mascot-idle-playing");
        void ui.launcher.offsetWidth;
        ui.launcher.classList.add("mascot-idle-playing");
      }
      scheduleMascotIdle();
    }, delay);
  }

  function applyVisualStyle() {
    const visualStyle = normalizeVisualStyle(settings.visualStyle);
    if (host) host.dataset.visualStyle = visualStyle;
    if (progressOverlayHost)
      progressOverlayHost.dataset.visualStyle = visualStyle;
    if (visualStyle !== "gaming") {
      for (const sprite of animatedSprites())
        sprite.classList.remove("is-playing");
    }
    applyCosmetics();
    scheduleMascotIdle();
  }

  function applyCosmetics() {
    if (!achievements) return;
    const cosmetics = achievements.normalizeCosmetics(
      settings.gamingCosmetics,
      settings.studywingAchievements,
    );
    settings.gamingCosmetics = cosmetics;
    const barPrefix =
      cosmetics.barStyle === "arcane"
        ? "assets/gaming/progress-arcane"
        : `assets/gaming/rewards/progress-${cosmetics.barStyle}`;
    if (host) {
      host.dataset.barStyle = cosmetics.barStyle;
      host.dataset.launcherStyle = cosmetics.launcherStyle;
      host.style.setProperty(
        "--sw-active-frame-left",
        `url("${chrome.runtime.getURL(`${barPrefix}-frame-left.png`)}")`,
      );
      host.style.setProperty(
        "--sw-active-frame-center",
        `url("${chrome.runtime.getURL(`${barPrefix}-frame-center.png`)}")`,
      );
      host.style.setProperty(
        "--sw-active-frame-right",
        `url("${chrome.runtime.getURL(`${barPrefix}-frame-right.png`)}")`,
      );
      host.style.setProperty(
        "--sw-active-fill",
        `url("${chrome.runtime.getURL(`${barPrefix}-fill.png`)}")`,
      );
      host.style.setProperty(
        "--sw-launcher-frame",
        cosmetics.launcherStyle === "arcane"
          ? "none"
          : `url("${chrome.runtime.getURL(`assets/gaming/rewards/launcher-frame-${cosmetics.launcherStyle}.png`)}")`,
      );
    }
    if (progressOverlayHost)
      progressOverlayHost.dataset.barStyle = cosmetics.barStyle;
  }

  function normalizeMenuSize(value) {
    return ["small", "medium", "large"].includes(value) ? value : "medium";
  }

  function launcherSize() {
    return LAUNCHER_SIZES[normalizeMenuSize(settings.menuSize)];
  }

  function applyMenuSize() {
    if (host) host.dataset.menuSize = normalizeMenuSize(settings.menuSize);
    if (host) applyLauncherPosition();
  }

  function normalizedCourseProgressPosition(value) {
    return ["top", "bottom", "left", "right"].includes(value)
      ? value
      : "bottom";
  }

  function resolvedTheme() {
    const preference = normalizeTheme(settings.themePreference);
    return preference === "system"
      ? systemTheme.matches
        ? "dark"
        : "light"
      : preference;
  }

  function currentCourseProgress() {
    const courseCode = currentCourseCode();
    const ready =
      courseProgressStatus?.available === true &&
      courseProgressStatus.courseCode === courseCode &&
      Number.isFinite(Number(courseProgressStatus.percent));
    return {
      courseCode,
      ready,
      percent: ready
        ? Math.max(
            0,
            Math.min(100, Math.floor(Number(courseProgressStatus.percent))),
          )
        : 0,
    };
  }

  function ensureProgressOverlay() {
    if (progressOverlayHost || !document.documentElement) return;
    const pixelFontUrl = chrome.runtime.getURL(
      "assets/fonts/pixelify-sans-latin.ttf",
    );
    progressOverlayHost = document.createElement("div");
    progressOverlayHost.id = PROGRESS_OVERLAY_HOST_ID;
    progressOverlayHost.dataset.visualStyle = normalizeVisualStyle(
      settings.visualStyle,
    );
    const shadow = progressOverlayHost.attachShadow({ mode: "closed" });
    shadow.innerHTML = `
      <style>
        @font-face {
          font-family: "Pixelify Sans";
          src: url("${pixelFontUrl}") format("truetype");
          font-display: swap;
        }
        :host {
          --sw-overlay-accent: #5b2ca0;
          --sw-overlay-gold: #d3a92d;
          --sw-overlay-threshold: #cf1d56;
          --sw-overlay-panel: rgba(255, 255, 255, 0.96);
          --sw-overlay-text: #25145f;
          --sw-gaming-track: #25145f;
          --sw-gaming-edge: #5b2ca0;
          --sw-gaming-light: #d8c4ff;
          --sw-gaming-mid: #a77ae8;
          --sw-gaming-tip: #f2b84b;
          position: fixed;
          inset: 0;
          z-index: 2147483645;
          pointer-events: none;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        :host([data-theme="dark"]) {
          --sw-overlay-panel: rgba(31, 24, 47, 0.97);
          --sw-overlay-text: #f7f3ff;
        }
        :host([data-bar-style="parchment"]) { --sw-gaming-track:#4a2d1b; --sw-gaming-edge:#8a5a2b; --sw-gaming-light:#f3d68a; --sw-gaming-mid:#c9923e; --sw-gaming-tip:#b52d2d; }
        :host([data-bar-style="tomo"]) { --sw-gaming-track:#101b38; --sw-gaming-edge:#31558c; --sw-gaming-light:#f3cf62; --sw-gaming-mid:#3e78b4; --sw-gaming-tip:#f3cf62; }
        :host([data-bar-style="nature"]) { --sw-gaming-track:#17351f; --sw-gaming-edge:#2f6b3a; --sw-gaming-light:#9bdb65; --sw-gaming-mid:#4d9c55; --sw-gaming-tip:#d6c25b; }
        :host([data-bar-style="sci-fi"]) { --sw-gaming-track:#102338; --sw-gaming-edge:#175c7c; --sw-gaming-light:#70efff; --sw-gaming-mid:#28a7d4; --sw-gaming-tip:#ffca52; }
        :host([data-bar-style="demon"]) { --sw-gaming-track:#2a1016; --sw-gaming-edge:#6f1c24; --sw-gaming-light:#ff765f; --sw-gaming-mid:#c52d34; --sw-gaming-tip:#f4b64b; }
        [hidden] { display: none !important; }
        .bar {
          position: fixed;
          filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.34));
        }
        .bar[data-position="top"], .bar[data-position="bottom"] {
          left: 12px;
          right: 12px;
          height: 6px;
        }
        .bar[data-position="top"] { top: 8px; }
        .bar[data-position="bottom"] { bottom: 8px; }
        .bar[data-position="left"], .bar[data-position="right"] {
          top: 12px;
          bottom: 12px;
          width: 6px;
        }
        .bar[data-position="left"] { left: 8px; }
        .bar[data-position="right"] { right: 8px; }
        :host([data-visual-style="gaming"]) .bar[data-position="top"],
        :host([data-visual-style="gaming"]) .bar[data-position="bottom"] { height: 10px; }
        :host([data-visual-style="gaming"]) .bar[data-position="left"],
        :host([data-visual-style="gaming"]) .bar[data-position="right"] { width: 10px; }
        .track {
          position: absolute;
          inset: 0;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(23, 17, 39, 0.28);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.42);
        }
        :host([data-visual-style="gaming"]) .track {
          border-radius: 0;
          background: var(--sw-gaming-track);
          box-shadow: inset 0 0 0 2px #15111f, inset 0 0 0 3px var(--sw-gaming-edge);
        }
        :host([data-visual-style="gaming"]) .track::after {
          content: "";
          position: absolute;
          z-index: 1;
          inset: 1px;
          pointer-events: none;
        }
        :host([data-visual-style="gaming"]) .bar[data-position="top"] .track::after,
        :host([data-visual-style="gaming"]) .bar[data-position="bottom"] .track::after {
          background-image: linear-gradient(to right, transparent calc(100% - 1px), rgba(21, 17, 31, 0.78) calc(100% - 1px));
          background-size: 10% 100%;
        }
        :host([data-visual-style="gaming"]) .bar[data-position="left"] .track::after,
        :host([data-visual-style="gaming"]) .bar[data-position="right"] .track::after {
          background-image: linear-gradient(to top, transparent calc(100% - 1px), rgba(21, 17, 31, 0.78) calc(100% - 1px));
          background-size: 100% 10%;
        }
        .fill {
          position: absolute;
          left: 0;
          bottom: 0;
          border-radius: inherit;
          background: linear-gradient(90deg, var(--sw-overlay-accent), var(--sw-overlay-gold));
          transition: width 240ms ease, height 240ms ease;
        }
        .bar[data-position="top"] .fill,
        .bar[data-position="bottom"] .fill { top: 0; height: 100%; }
        .bar[data-position="left"] .fill,
        .bar[data-position="right"] .fill {
          width: 100%;
          background: linear-gradient(0deg, var(--sw-overlay-accent), var(--sw-overlay-gold));
        }
        :host([data-visual-style="gaming"]) .fill { border-radius: 0; }
        :host([data-visual-style="gaming"]) .bar[data-position="top"] .fill,
        :host([data-visual-style="gaming"]) .bar[data-position="bottom"] .fill {
          background: linear-gradient(to bottom, var(--sw-gaming-light) 0 20%, var(--sw-gaming-mid) 20% 42%, var(--sw-gaming-edge) 42% 76%, var(--sw-gaming-track) 76% 100%);
          box-shadow: inset -2px 0 0 var(--sw-gaming-tip);
        }
        :host([data-visual-style="gaming"]) .bar[data-position="left"] .fill,
        :host([data-visual-style="gaming"]) .bar[data-position="right"] .fill {
          background: linear-gradient(to right, var(--sw-gaming-light) 0 20%, var(--sw-gaming-mid) 20% 42%, var(--sw-gaming-edge) 42% 76%, var(--sw-gaming-track) 76% 100%);
          box-shadow: inset 0 2px 0 var(--sw-gaming-tip);
        }
        .threshold {
          position: absolute;
          z-index: 2;
          background: var(--sw-overlay-threshold);
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.92);
        }
        .bar[data-position="top"] .threshold,
        .bar[data-position="bottom"] .threshold {
          top: -3px;
          bottom: -3px;
          left: 70%;
          width: 2px;
        }
        .bar[data-position="left"] .threshold,
        .bar[data-position="right"] .threshold {
          left: -3px;
          right: -3px;
          bottom: 70%;
          height: 2px;
        }
        :host([data-visual-style="gaming"]) .bar[data-position="top"] .threshold,
        :host([data-visual-style="gaming"]) .bar[data-position="bottom"] .threshold {
          top: 1px;
          bottom: auto;
          width: 8px;
          height: 8px;
          border: 2px solid #15111f;
          background: #f2b84b;
          box-shadow: inset 0 0 0 1px #d8c4ff;
          transform: translateX(-50%) rotate(45deg);
        }
        :host([data-visual-style="gaming"]) .bar[data-position="left"] .threshold,
        :host([data-visual-style="gaming"]) .bar[data-position="right"] .threshold {
          right: auto;
          left: 1px;
          width: 8px;
          height: 8px;
          border: 2px solid #15111f;
          background: #f2b84b;
          box-shadow: inset 0 0 0 1px #d8c4ff;
          transform: translateY(50%) rotate(45deg);
        }
        .value {
          position: absolute;
          min-width: 32px;
          padding: 2px 5px;
          border-radius: 999px;
          color: var(--sw-overlay-text);
          background: var(--sw-overlay-panel);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          font-size: 10px;
          font-weight: 800;
          line-height: 1.3;
          text-align: center;
        }
        :host([data-visual-style="gaming"]) .value {
          border: 2px solid #d3a92e;
          border-radius: 0;
          color: #d8c4ff;
          background: #15111f;
          box-shadow: inset 0 0 0 2px #25145f, 2px 2px 0 rgba(21, 17, 31, 0.32);
        }
        .bar[data-position="top"] .value { top: 10px; right: 0; }
        .bar[data-position="bottom"] .value { right: 0; bottom: 10px; }
        .bar[data-position="left"] .value { top: 0; left: 10px; }
        .bar[data-position="right"] .value { top: 0; right: 10px; }
        .exp-feedback {
          position: absolute;
          z-index: 4;
          width: 58px;
          box-sizing: border-box;
          padding: 2px 4px;
          border: 2px solid #d3a92d;
          color: #ffd070;
          background: #15111f;
          box-shadow: inset 0 0 0 1px #5b2ca0, 2px 2px 0 rgba(21, 17, 31, 0.34);
          font-family: "Pixelify Sans", monospace;
          font-size: 11px;
          font-weight: 700;
          line-height: 1.1;
          text-align: center;
          white-space: nowrap;
          opacity: 0;
        }
        .bar[data-position="top"] .exp-feedback,
        .bar[data-position="bottom"] .exp-feedback {
          right: 0;
        }
        .bar[data-position="top"] .exp-feedback { top: 16px; }
        .bar[data-position="bottom"] .exp-feedback { bottom: 16px; }
        .bar[data-position="left"] .exp-feedback,
        .bar[data-position="right"] .exp-feedback { top: 36px; }
        .bar[data-position="left"] .exp-feedback { left: 16px; }
        .bar[data-position="right"] .exp-feedback { right: 16px; }
        .exp-feedback.is-playing { animation: exp-feedback-rise 1350ms ease-out both; }
        @keyframes exp-feedback-rise {
          0% { opacity: 0; transform: translateY(5px); }
          14%, 68% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-12px); }
        }
        .toast {
          position: fixed;
          left: 50%;
          bottom: 28px;
          width: min(390px, calc(100vw - 32px));
          box-sizing: border-box;
          padding: 13px 15px;
          border: 1px solid rgba(211, 169, 45, 0.75);
          border-radius: 12px;
          color: var(--sw-overlay-text);
          background: var(--sw-overlay-panel);
          box-shadow: 0 12px 34px rgba(0, 0, 0, 0.28);
          transform: translateX(-50%);
        }
        .toast strong { display: block; margin-bottom: 3px; color: var(--sw-overlay-accent); font-size: 15px; }
        :host([data-theme="dark"]) .toast strong { color: #d9c4ff; }
        .toast span { display: block; font-size: 12px; line-height: 1.4; }
        @media (prefers-reduced-motion: reduce) {
          .fill { transition: none; }
          .exp-feedback.is-playing { animation: none; opacity: 0; }
        }
      </style>
      <div class="bar" data-role="bar" data-position="bottom" hidden>
        <div class="track"><span class="fill" data-role="fill"></span></div>
        <span class="threshold" data-role="threshold" title="Soglia del 70%" hidden></span>
        <span class="value" data-role="value">0%</span>
        <span class="exp-feedback" data-role="exp-feedback" aria-hidden="true"></span>
      </div>
      <div class="toast" data-role="toast" role="status" aria-live="assertive" hidden>
        <strong>70% raggiunto!</strong>
        <span>Hai raggiunto la percentuale richiesta per prenotare l’esame di questo insegnamento.</span>
      </div>`;
    document.documentElement.appendChild(progressOverlayHost);
    applyCosmetics();
    progressOverlayUi = {
      bar: shadow.querySelector('[data-role="bar"]'),
      fill: shadow.querySelector('[data-role="fill"]'),
      threshold: shadow.querySelector('[data-role="threshold"]'),
      value: shadow.querySelector('[data-role="value"]'),
      expFeedback: shadow.querySelector('[data-role="exp-feedback"]'),
      toast: shadow.querySelector('[data-role="toast"]'),
    };
  }

  function removeProgressOverlayIfUnused() {
    if (!progressOverlayUi?.bar.hidden || !progressOverlayUi?.toast.hidden)
      return;
    progressOverlayHost?.remove();
    progressOverlayHost = null;
    progressOverlayUi = null;
  }

  function renderCourseProgressOverlay() {
    const progress = currentCourseProgress();
    const showBar =
      settings.courseProgressOverlayEnabled === true && progress.ready;
    if (!showBar && !progressOverlayUi) return;
    ensureProgressOverlay();
    if (!progressOverlayUi) return;
    progressOverlayHost.dataset.theme = resolvedTheme();
    progressOverlayUi.bar.hidden = !showBar;
    if (showBar) {
      const position = normalizedCourseProgressPosition(
        settings.courseProgressOverlayPosition,
      );
      const vertical = position === "left" || position === "right";
      progressOverlayUi.bar.dataset.position = position;
      progressOverlayUi.fill.style.width = vertical
        ? "100%"
        : `${progress.percent}%`;
      progressOverlayUi.fill.style.height = vertical
        ? `${progress.percent}%`
        : "100%";
      progressOverlayUi.threshold.hidden =
        settings.courseProgressThresholdEnabled !== true;
      progressOverlayUi.value.textContent = `${progress.percent}%`;
      progressOverlayBaseline = {
        courseCode: progress.courseCode,
        percent: progress.percent,
      };
    } else {
      progressOverlayBaseline = { courseCode: "", percent: null };
    }
    removeProgressOverlayIfUnused();
  }

  function playNextProgressOverlayExp() {
    if (progressOverlayExpTimer || !progressOverlayExpQueue.length) return;
    const progress = currentCourseProgress();
    if (
      normalizeVisualStyle(settings.visualStyle) !== "gaming" ||
      settings.courseProgressOverlayEnabled !== true ||
      !progress.ready ||
      reducedMotion.matches
    ) {
      progressOverlayExpQueue.length = 0;
      return;
    }
    renderCourseProgressOverlay();
    if (!progressOverlayUi || progressOverlayUi.bar.hidden) {
      progressOverlayExpQueue.length = 0;
      return;
    }

    const amount = progressOverlayExpQueue
      .splice(0)
      .reduce((total, value) => total + value, 0);
    const feedback = progressOverlayUi.expFeedback;
    feedback.textContent = `+${amount} EXP`;
    feedback.classList.remove("is-playing");
    void feedback.offsetWidth;
    feedback.classList.add("is-playing");
    progressOverlayExpTimer = setTimeout(() => {
      feedback.classList.remove("is-playing");
      feedback.textContent = "";
      progressOverlayExpTimer = null;
      scheduleProgressOverlayExp();
    }, 1400);
  }

  function scheduleProgressOverlayExp() {
    if (
      progressOverlayExpTimer ||
      progressOverlayExpStartTimer ||
      !progressOverlayExpQueue.length
    )
      return;
    progressOverlayExpStartTimer = setTimeout(() => {
      progressOverlayExpStartTimer = null;
      playNextProgressOverlayExp();
    }, 50);
  }

  function queueProgressOverlayExp(value) {
    const amount = Math.max(0, Math.floor(Number(value) || 0));
    if (!amount) return;
    progressOverlayExpQueue.push(amount);
    scheduleProgressOverlayExp();
  }

  function showCourseThresholdToast() {
    window.postMessage(
      {
        type: "STUDYWING_SHOW_NOTIFICATION",
        notification: {
          message:
            "70% raggiunto!\nHai raggiunto la percentuale richiesta per prenotare l’esame di questo insegnamento.",
          type: "success",
          key: `course-threshold:${currentCourseCode()}`,
          terminal: true,
        },
      },
      "*",
    );
  }

  async function claimCourseThreshold(courseCode, silent = false) {
    if (!courseCode || pendingThresholdClaims.has(courseCode)) return;
    if (settings.courseProgressThresholdNotified?.[courseCode] === true) return;
    pendingThresholdClaims.add(courseCode);
    const response = await runtimeMessage({
      type: "PEGASO_COURSE_THRESHOLD_CLAIM",
      courseCode,
    });
    pendingThresholdClaims.delete(courseCode);
    if (
      response?.accepted &&
      !silent &&
      settings.courseProgressThresholdEnabled === true
    ) {
      showCourseThresholdToast();
    }
  }

  function evaluateCourseThreshold() {
    const progress = currentCourseProgress();
    if (thresholdActivationAwaitingBaseline && progress.ready) {
      thresholdActivationAwaitingBaseline = false;
      if (progress.percent >= 70) {
        silentlyAcknowledgedThresholds.add(progress.courseCode);
        void claimCourseThreshold(progress.courseCode, true);
        return;
      }
    }
    if (
      settings.courseProgressThresholdEnabled !== true ||
      !progress.ready ||
      progress.percent < 70 ||
      silentlyAcknowledgedThresholds.has(progress.courseCode)
    )
      return;
    void claimCourseThreshold(progress.courseCode, false);
  }

  function silentlyAcknowledgeCurrentThreshold() {
    const progress = currentCourseProgress();
    if (!progress.ready) {
      thresholdActivationAwaitingBaseline = true;
      return;
    }
    thresholdActivationAwaitingBaseline = false;
    if (progress.percent < 70) return;
    silentlyAcknowledgedThresholds.add(progress.courseCode);
    void claimCourseThreshold(progress.courseCode, true);
  }

  function isExamOnlinePage() {
    return window.location.pathname.replace(/\/$/, "") === EXAM_ONLINE_PATH;
  }

  function normalizedRoute(value) {
    const route =
      String(value || "")
        .trim()
        .replace(/^#/, "")
        .split(/[?#]/, 1)[0]
        .replace(/\/+$/, "") || "/";
    return route.startsWith("/")
      ? route.toLowerCase()
      : `/${route.toLowerCase()}`;
  }

  function isAuthenticationPage() {
    return Boolean(
      document.querySelector('input[type="password"], form[action*="login" i]'),
    );
  }

  function isHomePage() {
    if (isAuthenticationPage()) return false;
    const path = normalizedRoute(window.location.pathname);
    const hashRoute = normalizedRoute(window.location.hash);
    if (path === "/" && window.location.hash && hashRoute !== "/") {
      return HOME_PATHS.has(hashRoute);
    }
    return HOME_PATHS.has(path);
  }

  function isCommissionOnlyPage() {
    return isExamOnlinePage() || isHomePage();
  }

  function selectMenuTab(
    requestedTab,
    { focus = false, acknowledge = true } = {},
  ) {
    if (!ui) return;
    const courseAvailable = !isCommissionOnlyPage();
    const examsAvailable = settings.commissionCheckEnabled === true;
    const achievementsAvailable =
      normalizeVisualStyle(settings.visualStyle) === "gaming";
    const selectedTab =
      requestedTab === "preferences"
        ? "preferences"
        : requestedTab === "achievements" && achievementsAvailable
          ? "achievements"
          : requestedTab === "exams" && examsAvailable
            ? "exams"
            : courseAvailable
              ? "course"
              : examsAvailable
                ? "exams"
                : "preferences";

    activeMenuTab = selectedTab;
    const tabEntries = [
      ["course", ui.courseTab, ui.coursePanel],
      ["exams", ui.examsTab, ui.examsPanel],
      ["achievements", ui.achievementsTab, ui.achievementsPanel],
      ["preferences", ui.preferencesTab, ui.preferencesPanel],
    ];
    for (const [name, tab, panel] of tabEntries) {
      const selected = name === selectedTab;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panel.hidden = !selected;
      if (selected && focus) tab.focus();
    }

    if (selectedTab === "exams" && acknowledge && !ui.panel.hidden)
      markCommissionNotificationsSeen();
    setTimeout(placePanel, 0);
  }

  function runtimeMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(
          chrome.runtime.lastError
            ? { accepted: false, reason: chrome.runtime.lastError.message }
            : response,
        );
      });
    });
  }

  function claimFloatingAchievement(achievementId) {
    if (normalizeVisualStyle(settings.visualStyle) !== "gaming") return;
    runtimeMessage({ type: "STUDYWING_ACHIEVEMENT_CLAIM", achievementId }).then(
      (result) => {
        if (result?.accepted)
          setFeedback(
            `Traguardo completato: ${result.achievement.title} · +${result.awardedExp} EXP`,
          );
      },
    );
  }

  function claimEnabledGamingAchievements() {
    if (normalizeVisualStyle(settings.visualStyle) !== "gaming") return;
    if (settings.enabled !== false)
      claimFloatingAchievement("discover-autoplay");
    if (settings.floatingMenuEnabled === true)
      claimFloatingAchievement("open-floating-menu");
  }

  function renderAchievements() {
    if (!ui || !achievements) return;
    const model = achievements.view(settings.studywingAchievements);
    const claimed = new Set(model.state.claimedAchievementIds);
    ui.achievementLevel.textContent = `Livello ${model.level} · ${model.state.totalExp} EXP`;
    ui.achievementProgressText.textContent = model.capped
      ? "500 / 500 EXP"
      : `${model.expWithinLevel} / 100 EXP`;
    ui.achievementProgressFill.style.width = `calc((100% - 40px) * ${model.expWithinLevel / 100})`;
    const rewardSet =
      achievements.REWARD_SETS[
        Math.min(model.level, achievements.REWARD_SETS.length - 1)
      ];
    const midRewardUnlocked = model.capped || model.expWithinLevel >= 50;
    ui.achievementProgress.dataset.midUnlocked = String(midRewardUnlocked);
    ui.achievementMidMarker.style.backgroundImage = midRewardUnlocked
      ? "none"
      : `url("${chrome.runtime.getURL(`assets/gaming/rewards/reward-bar-${rewardSet.id}.png`)}")`;
    ui.achievementEndMarker.style.backgroundImage = `url("${chrome.runtime.getURL(`assets/gaming/rewards/reward-launcher-${rewardSet.id}.png`)}")`;
    ui.achievementMidMarker.title = midRewardUnlocked
      ? "Premio barra già sbloccato"
      : `${rewardSet.name}: stile barra a 50 EXP`;
    ui.achievementEndMarker.title = model.capped
      ? "Tutti i premi sbloccati"
      : `${rewardSet.name}: stile launcher a 100 EXP`;
    ui.achievementProgress.setAttribute(
      "aria-valuenow",
      String(model.expWithinLevel),
    );
    ui.achievementList.replaceChildren(
      ...achievements.CATALOGUE.map((item) => {
        const complete = claimed.has(item.id);
        const row = document.createElement("div");
        row.className = "achievement-row";
        row.dataset.complete = String(complete);
        const name = document.createElement("strong");
        name.textContent = `${complete ? "✓ " : ""}${item.title}`;
        const exp = document.createElement("span");
        exp.textContent = `+${item.exp} EXP`;
        row.append(name, exp);
        return row;
      }),
    );
    const unlocked = new Set(model.state.unlockedCosmeticIds);
    const cosmetics = achievements.normalizeCosmetics(
      settings.gamingCosmetics,
      model.state,
    );
    ui.rewardsSummary.textContent = `${unlocked.size} di ${achievements.REWARD_SETS.length * 2}`;
    const cards = [];
    for (const set of achievements.REWARD_SETS)
      for (const kind of ["bar", "launcher"]) {
        const threshold =
          kind === "bar" ? set.barThreshold : set.launcherThreshold;
        const available = unlocked.has(`${kind}:${set.id}`);
        const active = cosmetics[`${kind}Style`] === set.id;
        const card = document.createElement("div");
        card.className = "reward-card";
        card.dataset.locked = String(!available);
        const preview = document.createElement("span");
        preview.className = "reward-preview";
        if (set.id === "arcane")
          preview.style.backgroundImage =
            kind === "launcher"
              ? `url("${chrome.runtime.getURL("assets/gaming/mascot-logo-light.png")}")`
              : "linear-gradient(90deg,#5b2ca0,#d3a92d)";
        else
          preview.style.backgroundImage = `url("${chrome.runtime.getURL(`assets/gaming/rewards/${kind === "bar" ? "reward-bar" : "launcher-frame"}-${set.id}.png`)}")`;
        const copy = document.createElement("span");
        copy.className = "reward-copy";
        const name = document.createElement("strong");
        name.textContent = `${kind === "bar" ? "Barra" : "Launcher"} · ${set.name}`;
        const status = document.createElement("small");
        status.textContent = available
          ? active
            ? "In uso"
            : "Sbloccato"
          : `${threshold} EXP`;
        copy.append(name, status);
        card.append(preview, copy);
        if (available) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "reward-apply";
          button.textContent = active ? "In uso" : "Applica";
          button.disabled = active;
          button.addEventListener("click", () => {
            settings.gamingCosmetics = {
              ...cosmetics,
              [`${kind}Style`]: set.id,
            };
            chrome.storage.local.set({
              gamingCosmetics: settings.gamingCosmetics,
            });
            applyCosmetics();
            renderAchievements();
          });
          card.append(button);
        }
        cards.push(card);
      }
    ui.rewardList.replaceChildren(...cards);
    applyCosmetics();
  }

  function operationLabel(operation) {
    if (!operation) return "";
    if (operation.kind === "turbo")
      return operation.message || "Test automatici in esecuzione…";
    if (operation.kind === "objectives")
      return (
        operation.message || "Completamento degli Obiettivi in esecuzione…"
      );
    if (operation.kind === "tests")
      return operation.message || "Raccolta dei test del corso in esecuzione…";
    if (operation.kind === "materials")
      return (
        operation.message || "Raccolta delle dispense del corso in esecuzione…"
      );
    return (
      operation.message ||
      `Creazione del ${operation.kind.toUpperCase()} in corso…`
    );
  }

  function setFeedback(message, isError = false) {
    if (!ui) return;
    clearTimeout(feedbackTimer);
    ui.status.textContent = message || "";
    ui.status.dataset.error = String(isError);
    if (message && !isError && !settings.pegasoActiveOperation) {
      feedbackTimer = setTimeout(() => {
        if (ui && !settings.pegasoActiveOperation) ui.status.textContent = "";
      }, 5000);
    }
  }

  function formatNotificationTime(value) {
    const date = new Date(Number(value));
    return Number.isFinite(date.getTime())
      ? date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
      : "";
  }

  function renderLastNotification() {
    if (!ui) return;
    ui.lastNotification.hidden = !lastNotification;
    if (!lastNotification) return;
    ui.lastNotification.dataset.level = lastNotification.level || "info";
    ui.lastNotificationText.textContent = lastNotification.message || "";
    ui.lastNotificationTime.textContent = formatNotificationTime(
      lastNotification.createdAt,
    );
  }

  function renderSettings() {
    if (!ui) return;
    const autoplayDisabled = settings.enabled === false;
    const testBehavior =
      settings.autoCompleteTests === true
        ? "complete"
        : settings.stopAtTests !== false
          ? "stop"
          : "ignore";
    ui.enabled.checked = settings.enabled !== false;
    ui.findFirstIncomplete.disabled =
      autoplayDisabled || Boolean(settings.pegasoActiveOperation);
    ui.autoplayOptionsContent.classList.toggle("disabled", autoplayDisabled);
    ui.autoplayOptionsContent.setAttribute(
      "aria-disabled",
      String(autoplayDisabled),
    );
    for (const radio of ui.testBehaviorRadios) {
      radio.checked = radio.value === testBehavior;
      radio.disabled =
        autoplayDisabled ||
        (radio.value === "stop" &&
          settings.autoplayChapterLimitEnabled === true);
    }
    const testSummary =
      testBehavior === "complete"
        ? "Test completati"
        : testBehavior === "stop"
          ? "Stop ai test"
          : "Test ignorati";
    const currentCode = currentCourseCode();
    const limitStatus =
      settings.autoplayChapterLimitStatuses?.[currentCode] || null;
    const limitReady = Boolean(limitStatus?.courseCode === currentCode);
    const limit = Math.max(1, Number(limitStatus?.limit) || 1);
    const maximum = Math.max(1, Number(limitStatus?.maximum) || 1);
    ui.chapterLimitEnabled.checked =
      settings.autoplayChapterLimitEnabled === true;
    ui.chapterLimitEnabled.disabled = !limitReady;
    ui.chapterLimitValue.textContent = String(limit);
    ui.chapterLimitMinus.disabled = !limitReady || limit <= 1;
    ui.chapterLimitPlus.disabled = !limitReady || limit >= maximum;
    ui.chapterLimitProgress.textContent = !limitReady
      ? "Limite disponibile dopo il caricamento del corso."
      : limitStatus.reached
        ? `Limite raggiunto: ${limitStatus.completed} di ${limit}.`
        : `Sessione: ${limitStatus.completed || 0} di ${limit} · massimo ${maximum}.`;
    ui.chapterLimitResume.hidden = !limitStatus?.reached;
    ui.chapterLimitResume.textContent = `Riprendi per altri ${limit}`;
    ui.autoplayOptionsSummary.textContent =
      settings.autoplayChapterLimitEnabled === true
        ? `${testSummary} · limite ${limit}`
        : testSummary;
    ui.courseProgressOverlayEnabled.checked =
      settings.courseProgressOverlayEnabled === true;
    const progressPosition = normalizedCourseProgressPosition(
      settings.courseProgressOverlayPosition,
    );
    for (const radio of ui.courseProgressPositionRadios) {
      radio.checked = radio.value === progressPosition;
      radio.disabled = settings.courseProgressOverlayEnabled !== true;
    }
    ui.courseProgressPosition.dataset.disabled = String(
      settings.courseProgressOverlayEnabled !== true,
    );
    ui.courseProgressThresholdEnabled.checked =
      settings.courseProgressThresholdEnabled === true;
    const positionLabels = {
      top: "sopra",
      bottom: "sotto",
      left: "a sinistra",
      right: "a destra",
    };
    const progressSummary = [];
    if (settings.courseProgressOverlayEnabled === true) {
      progressSummary.push(`Barra ${positionLabels[progressPosition]}`);
    }
    if (settings.courseProgressThresholdEnabled === true)
      progressSummary.push("avviso 70%");
    ui.courseProgressOptionsSummary.textContent = progressSummary.length
      ? progressSummary.join(" · ")
      : "Disattivate";
    ui.state.textContent = settings.enabled === false ? "In pausa" : "Attivo";
    ui.state.dataset.running = String(settings.enabled !== false);
    renderPreferences();
  }

  function renderPreferences() {
    if (!ui) return;
    const visualStyle = normalizeVisualStyle(settings.visualStyle);
    const theme = normalizeTheme(settings.themePreference);
    const menuSize = normalizeMenuSize(settings.menuSize);
    const playbackRecovery =
      settings.playbackErrorRecovery === "manual" ? "manual" : "automatic";
    for (const radio of ui.visualStyleRadios)
      radio.checked = radio.value === visualStyle;
    for (const radio of ui.themePreferenceRadios)
      radio.checked = radio.value === theme;
    for (const radio of ui.menuSizeRadios)
      radio.checked = radio.value === menuSize;
    for (const radio of ui.playbackErrorRecoveryRadios)
      radio.checked = radio.value === playbackRecovery;
  }

  function renderCourseProgress() {
    const progress = currentCourseProgress();
    if (ui?.courseProgress) {
      ui.courseProgressValue.textContent = progress.ready
        ? `${progress.percent}%`
        : "—";
      ui.courseProgressFill.style.width = `${progress.percent}%`;
      ui.courseProgressBar.setAttribute(
        "aria-valuenow",
        progress.ready ? String(progress.percent) : "0",
      );
      ui.courseProgressBar.setAttribute(
        "aria-valuetext",
        progress.ready ? `${progress.percent}%` : "Progresso non disponibile",
      );
      ui.courseProgressThreshold.hidden =
        settings.courseProgressThresholdEnabled !== true;
      ui.courseProgressMessage.textContent = progress.ready
        ? courseProgressStatus.message || "Sincronizzato con Pegaso."
        : "Progresso disponibile dopo il caricamento del corso.";
    }
    renderCourseProgressOverlay();
    evaluateCourseThreshold();
  }

  function renderOperation() {
    if (!ui) return;
    const operation = settings.pegasoActiveOperation;
    const busy = Boolean(operation);
    const turbo = operation?.kind === "turbo";
    const objectives = operation?.kind === "objectives";
    const stopping = operation?.phase === "stopping";
    const collectingMaterials =
      operation?.kind === "materials" &&
      ["collecting", "stopping"].includes(operation.phase);
    const collectingTests =
      operation?.kind === "tests" &&
      ["collecting", "stopping"].includes(operation.phase);

    ui.turbo.dataset.running = String(turbo);
    ui.turboLabel.textContent = turbo
      ? stopping
        ? "Interruzione dei test…"
        : "Interrompi i test automatici"
      : "Completa tutti i test";
    ui.turbo.disabled = (busy && !turbo) || stopping;
    ui.objectives.dataset.running = String(objectives);
    ui.objectivesLabel.textContent = objectives
      ? stopping
        ? "Interruzione Obiettivi…"
        : "Interrompi Obiettivi"
      : "Completa tutti gli Obiettivi";
    ui.objectives.disabled = (busy && !objectives) || stopping;
    ui.materialsLabel.textContent = collectingMaterials
      ? stopping
        ? "Interruzione dispense…"
        : "Interrompi raccolta dispense"
      : "Esporta dispense del corso";
    ui.materials.disabled =
      (busy && !collectingMaterials) || (collectingMaterials && stopping);
    ui.testCollectionLabel.textContent = collectingTests
      ? stopping
        ? "Interruzione test…"
        : "Interrompi raccolta test"
      : "Crea raccolta test";
    ui.testCollection.disabled =
      (busy && !collectingTests) || (collectingTests && stopping);
    ui.findFirstIncomplete.disabled = settings.enabled === false || busy;

    if (operation) {
      clearTimeout(feedbackTimer);
      ui.status.dataset.error = "false";
      ui.status.textContent = operationLabel(operation);
    } else if (ui.status.dataset.error !== "true") {
      ui.status.textContent = "";
    }
  }

  function formatExamDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }

  function resultLabel(result) {
    const normalized = String(result || "").toLowerCase();
    const pendingVerbalization = /^daverbalizzare(?:-|$)/.test(normalized);
    if (pendingVerbalization && normalized.includes("promosso"))
      return "Da verbalizzare · Superato";
    if (pendingVerbalization && normalized.includes("bocciato"))
      return "Da verbalizzare · Non superato";
    if (normalized.includes("promosso")) return "Superato";
    if (normalized.includes("bocciato")) return "Non superato";
    return result
      ? String(result).replaceAll("-", " · ")
      : "Esito non disponibile";
  }

  function sortCommissionExams(exams, unseenSet) {
    exams.sort((first, second) => {
      const unseenDifference =
        Number(unseenSet.has(Number(second?.exam_id))) -
        Number(unseenSet.has(Number(first?.exam_id)));
      if (unseenDifference) return unseenDifference;
      const firstDate = new Date(first?.date_exam || 0).getTime() || 0;
      const secondDate = new Date(second?.date_exam || 0).getTime() || 0;
      return secondDate - firstDate;
    });
  }

  function createCommissionExamCard(exam, unseenSet) {
    if (!exam || !Number.isFinite(Number(exam.exam_id))) return null;
    const item = document.createElement("article");
    item.className = "exam-card";
    if (unseenSet.has(Number(exam.exam_id))) item.dataset.new = "true";

    const heading = document.createElement("div");
    heading.className = "exam-title";
    heading.textContent = exam.title_exam || exam.course_code || "Esame online";

    const meta = document.createElement("div");
    meta.className = "exam-meta";
    const parts = [];
    const date = formatExamDate(exam.date_exam);
    if (date) parts.push(date);
    if (Number.isFinite(Number(exam.vote)))
      parts.push(`Voto ${Number(exam.vote)}/30`);
    parts.push(resultLabel(exam.result));
    meta.textContent = parts.join(" · ");

    const verdict = document.createElement("div");
    verdict.className = "commission-verdict";
    const presentation = commissionStates.statePresentation(exam);
    verdict.dataset.tone = presentation.tone;
    verdict.textContent = `Commissione: ${presentation.label}`;

    item.append(heading, meta, verdict);
    const rejectionMotivation = commissionStates.rejectMotivationText(exam);
    if (rejectionMotivation) {
      const motivation = document.createElement("div");
      motivation.className = "exam-motivation";
      motivation.textContent = rejectionMotivation;
      motivation.dataset.expanded = "false";
      motivation.tabIndex = 0;
      motivation.setAttribute("role", "button");
      motivation.setAttribute(
        "aria-label",
        "Mostra o nascondi la motivazione completa",
      );
      const toggleMotivation = () => {
        motivation.dataset.expanded = String(
          motivation.dataset.expanded !== "true",
        );
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

  function renderCommissionExams() {
    if (!ui) return;
    const commissionOnlyPage = isCommissionOnlyPage();
    const enabled = settings.commissionCheckEnabled === true;
    const achievementsEnabled =
      normalizeVisualStyle(settings.visualStyle) === "gaming";
    ui.courseTab.hidden = commissionOnlyPage;
    ui.examsTab.hidden = !enabled;
    ui.achievementsTab.hidden = !achievementsEnabled;
    ui.tabList.dataset.count = String(
      1 +
        Number(!commissionOnlyPage) +
        Number(enabled) +
        Number(achievementsEnabled),
    );
    ui.commissionSection.hidden = !enabled;
    ui.hide.textContent = commissionOnlyPage
      ? "Disattiva il controllo commissione"
      : "Nascondi il menu dalla pagina";

    if (
      !activeMenuTab ||
      (activeMenuTab === "course" && commissionOnlyPage) ||
      (activeMenuTab === "exams" && !enabled) ||
      (activeMenuTab === "achievements" && !achievementsEnabled)
    ) {
      selectMenuTab(
        commissionOnlyPage ? (enabled ? "exams" : "preferences") : "course",
        { acknowledge: false },
      );
    }

    const unseenIds =
      enabled && Array.isArray(settings.commissionUnseenExamIds)
        ? settings.commissionUnseenExamIds.map(Number).filter(Number.isFinite)
        : [];
    const unseenSet = new Set(unseenIds);
    const allExams = Array.isArray(settings.commissionExams)
      ? settings.commissionExams
      : [];
    ui.notificationBadge.hidden = unseenIds.length === 0;
    ui.notificationBadge.dataset.overflow = String(unseenIds.length > 9);
    ui.notificationBadgeText.textContent = unseenIds.length > 9 ? "9+" : "!";
    ui.examsTabBadge.hidden = unseenIds.length === 0;
    ui.examsTabBadge.textContent =
      unseenIds.length > 9 ? "9+" : String(unseenIds.length || "!");

    const unseenAlertSignature = JSON.stringify(
      unseenIds.map((examId) => {
        const exam = allExams.find(
          (candidate) => Number(candidate?.exam_id) === examId,
        );
        return [
          examId,
          String(exam?.commission || ""),
          String(exam?.result || ""),
          commissionStates.rejectMotivationText(exam),
        ];
      }),
    );
    if (
      unseenIds.length > 0 &&
      unseenAlertSignature !== lastUnseenAlertSignature
    ) {
      clearTimeout(notificationTimer);
      ui.launcher.classList.remove("commission-alert");
      void ui.launcher.offsetWidth;
      ui.launcher.classList.add("commission-alert");
      notificationTimer = setTimeout(
        () => ui?.launcher.classList.remove("commission-alert"),
        2300,
      );
    }
    if (unseenIds.length === 0)
      ui.launcher.classList.remove("commission-alert");
    lastUnseenAlertSignature = unseenAlertSignature;

    ui.commissionList.replaceChildren();
    ui.loadedPassedList.replaceChildren();
    ui.loadedFailedList.replaceChildren();
    ui.loadedOtherList.replaceChildren();
    const openExams = allExams.filter(
      (exam) => !commissionStates.isLoadedExam(exam),
    );
    const loadedExams = allExams.filter(commissionStates.isLoadedExam);
    const passedExams = loadedExams.filter(
      (exam) => commissionStates.loadedOutcome(exam) === "passed",
    );
    const failedExams = loadedExams.filter(
      (exam) => commissionStates.loadedOutcome(exam) === "failed",
    );
    const otherExams = loadedExams.filter(
      (exam) => commissionStates.loadedOutcome(exam) === "other",
    );
    sortCommissionExams(openExams, unseenSet);
    for (const group of [passedExams, failedExams, otherExams])
      sortCommissionExams(group, unseenSet);

    ui.commissionEmpty.hidden = openExams.length > 0;
    ui.commissionEmpty.textContent = settings.commissionExamsCapturedAt
      ? "Nessun esame in attesa o ancora da confermare."
      : "Nessun esame da mostrare. Il controllo partirà quando Pegaso renderà disponibile la sessione autenticata.";
    for (const exam of openExams) {
      const card = createCommissionExamCard(exam, unseenSet);
      if (card) ui.commissionList.append(card);
    }
    for (const [group, list] of [
      [passedExams, ui.loadedPassedList],
      [failedExams, ui.loadedFailedList],
      [otherExams, ui.loadedOtherList],
    ]) {
      for (const exam of group) {
        const card = createCommissionExamCard(exam, unseenSet);
        if (card) list.append(card);
      }
    }

    const loadedUnseen = loadedExams.filter((exam) =>
      unseenSet.has(Number(exam?.exam_id)),
    ).length;
    ui.confirmedToggle.hidden = loadedExams.length === 0;
    ui.confirmedLabel.textContent = `Esiti caricati (${loadedExams.length})${loadedUnseen ? ` · ${loadedUnseen} da leggere` : ""}`;
    for (const [group, section, count] of [
      [passedExams, ui.loadedPassedGroup, ui.loadedPassedCount],
      [failedExams, ui.loadedFailedGroup, ui.loadedFailedCount],
      [otherExams, ui.loadedOtherGroup, ui.loadedOtherCount],
    ]) {
      section.hidden = group.length === 0;
      count.textContent = `(${group.length})`;
    }
    if (!loadedExams.length) {
      ui.confirmedToggle.setAttribute("aria-expanded", "false");
      ui.confirmedPanel.hidden = true;
    }
  }

  function markCommissionNotificationsSeen() {
    if (
      !Array.isArray(settings.commissionUnseenExamIds) ||
      !settings.commissionUnseenExamIds.length
    )
      return;
    writeSetting("commissionUnseenExamIds", []);
  }

  function closePanel() {
    if (!ui || ui.panel.hidden) return;
    ui.panel.hidden = true;
    ui.launcher.setAttribute("aria-expanded", "false");
    ui.launcher.title = "Clicca per aprire PlumePilot · Trascina per spostare";
    ui.launcher.setAttribute(
      "aria-label",
      "Apri PlumePilot; trascina per spostare l’icona lungo il bordo",
    );
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function normalizedPosition(value) {
    const edge = ["top", "right", "bottom", "left"].includes(value?.edge)
      ? value.edge
      : DEFAULT_POSITION.edge;
    const numericOffset = Number(value?.offset);
    return {
      edge,
      offset: Number.isFinite(numericOffset)
        ? clamp(numericOffset, 0, 1)
        : DEFAULT_POSITION.offset,
    };
  }

  function perimeterMetrics() {
    const size = launcherSize();
    const marginX = Math.min(
      EDGE_MARGIN,
      Math.max(0, (window.innerWidth - size) / 2),
    );
    const marginY = Math.min(
      EDGE_MARGIN,
      Math.max(0, (window.innerHeight - size) / 2),
    );
    return {
      marginX,
      marginY,
      travelX: Math.max(0, window.innerWidth - size - marginX * 2),
      travelY: Math.max(0, window.innerHeight - size - marginY * 2),
    };
  }

  function launcherCoordinates(position) {
    const { marginX, marginY, travelX, travelY } = perimeterMetrics();
    const offset = position.offset;
    if (position.edge === "top")
      return { left: marginX + travelX * offset, top: marginY };
    if (position.edge === "bottom")
      return { left: marginX + travelX * offset, top: marginY + travelY };
    if (position.edge === "left")
      return { left: marginX, top: marginY + travelY * offset };
    return { left: marginX + travelX, top: marginY + travelY * offset };
  }

  function positionFromPointer(clientX, clientY) {
    const distances = {
      top: Math.max(0, clientY),
      right: Math.max(0, window.innerWidth - clientX),
      bottom: Math.max(0, window.innerHeight - clientY),
      left: Math.max(0, clientX),
    };
    const edge = Object.keys(distances).reduce(
      (nearest, candidate) =>
        distances[candidate] < distances[nearest] ? candidate : nearest,
      "top",
    );
    const { marginX, marginY, travelX, travelY } = perimeterMetrics();
    const halfSize = launcherSize() / 2;
    const launcherLeft = clamp(clientX - halfSize, marginX, marginX + travelX);
    const launcherTop = clamp(clientY - halfSize, marginY, marginY + travelY);
    const offset =
      edge === "top" || edge === "bottom"
        ? travelX
          ? (launcherLeft - marginX) / travelX
          : 0
        : travelY
          ? (launcherTop - marginY) / travelY
          : 0;
    return normalizedPosition({ edge, offset });
  }

  function placePanel() {
    if (!host || !ui || ui.panel.hidden) return;
    const launcherRect = host.getBoundingClientRect();
    const panelRect = ui.panel.getBoundingClientRect();
    const position = normalizedPosition(settings.floatingMenuPosition);
    let left = launcherRect.left + (launcherRect.width - panelRect.width) / 2;
    let top = launcherRect.top + (launcherRect.height - panelRect.height) / 2;

    if (position.edge === "top") top = launcherRect.bottom + PANEL_GAP;
    else if (position.edge === "bottom")
      top = launcherRect.top - PANEL_GAP - panelRect.height;
    else if (position.edge === "left") left = launcherRect.right + PANEL_GAP;
    else left = launcherRect.left - PANEL_GAP - panelRect.width;

    const viewportPadding = 12;
    ui.panel.style.left = `${clamp(left, viewportPadding, Math.max(viewportPadding, window.innerWidth - panelRect.width - viewportPadding))}px`;
    ui.panel.style.top = `${clamp(top, viewportPadding, Math.max(viewportPadding, window.innerHeight - panelRect.height - viewportPadding))}px`;
  }

  function applyLauncherPosition() {
    if (!host) return;
    const position = normalizedPosition(settings.floatingMenuPosition);
    settings.floatingMenuPosition = position;
    const coordinates = launcherCoordinates(position);
    host.style.left = `${Math.round(coordinates.left)}px`;
    host.style.top = `${Math.round(coordinates.top)}px`;
    placePanel();
  }

  function beginLauncherDrag(event) {
    if (event.button !== 0 || !ui) return;
    dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    ui.launcher.setPointerCapture(event.pointerId);
    ui.launcher.classList.add("dragging");
    scheduleMascotIdle();
  }

  function moveLauncher(event) {
    if (!dragState || event.pointerId !== dragState.pointerId || !ui) return;
    const distance = Math.hypot(
      event.clientX - dragState.startX,
      event.clientY - dragState.startY,
    );
    if (!dragState.moved && distance < 5) return;
    if (!dragState.moved) {
      dragState.moved = true;
      closePanel();
    }
    event.preventDefault();
    settings.floatingMenuPosition = positionFromPointer(
      event.clientX,
      event.clientY,
    );
    applyLauncherPosition();
  }

  function endLauncherDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId || !ui) return;
    const moved = dragState.moved;
    dragState = null;
    ui.launcher.classList.remove("dragging");
    if (ui.launcher.hasPointerCapture(event.pointerId))
      ui.launcher.releasePointerCapture(event.pointerId);
    if (moved) {
      suppressLauncherClick = true;
      writeSetting(
        "floatingMenuPosition",
        normalizedPosition(settings.floatingMenuPosition),
      );
      setTimeout(() => {
        suppressLauncherClick = false;
      }, 0);
    }
    scheduleMascotIdle();
  }

  function togglePanel() {
    if (!ui) return;
    const opening = ui.panel.hidden;
    ui.panel.hidden = !opening;
    ui.launcher.setAttribute("aria-expanded", String(opening));
    ui.launcher.title = opening
      ? "Clicca per chiudere PlumePilot · Trascina per spostare"
      : "Clicca per aprire PlumePilot · Trascina per spostare";
    ui.launcher.setAttribute(
      "aria-label",
      opening
        ? "Chiudi PlumePilot; trascina per spostare l’icona lungo il bordo"
        : "Apri PlumePilot; trascina per spostare l’icona lungo il bordo",
    );
    if (opening) {
      if (normalizeVisualStyle(settings.visualStyle) === "gaming") {
        runtimeMessage({
          type: "STUDYWING_ACHIEVEMENT_CLAIM",
          achievementId: "open-floating-menu",
        }).then((result) => {
          if (result?.accepted)
            setFeedback(
              `Traguardo completato: ${result.achievement.title} · +${result.awardedExp} EXP`,
            );
        });
      }
      requestChapterLimitStatus();
      requestCourseProgressStatus();
      placePanel();
      if (activeMenuTab === "exams") markCommissionNotificationsSeen();
      ui.close.focus();
    }
  }

  async function toggleTurboTests() {
    const operation = settings.pegasoActiveOperation;
    const stopping = operation?.kind === "turbo";

    if (stopping) {
      ui.turbo.disabled = true;
      setFeedback("Interruzione dopo l’operazione corrente…");
      window.postMessage(
        {
          type: "PEGASO_TURBO_TESTS_COMMAND",
          action: "stop",
          operationId: operation.id,
        },
        "*",
      );
      return;
    }

    ui.turbo.disabled = true;
    setFeedback("Avvio dei test automatici…");
    const acquired = await runtimeMessage({
      type: "PEGASO_ACQUIRE_OPERATION",
      kind: "turbo",
    });

    if (!acquired?.accepted) {
      if (acquired?.operation) {
        settings.pegasoActiveOperation = acquired.operation;
        renderOperation();
      } else {
        renderOperation();
        setFeedback(
          acquired?.reason || "Impossibile avviare i test automatici.",
          true,
        );
      }
      return;
    }

    playActionAnimation(ui.turboSprite);
    window.postMessage(
      {
        type: "PEGASO_TURBO_TESTS_COMMAND",
        action: "start",
        operationId: acquired.operation.id,
      },
      "*",
    );
  }

  async function toggleObjectives() {
    const operation = settings.pegasoActiveOperation;
    const stopping = operation?.kind === "objectives";
    if (stopping) {
      ui.objectives.disabled = true;
      setFeedback("Interruzione dopo l’operazione corrente…");
      window.postMessage(
        {
          type: "PEGASO_OBJECTIVES_COMMAND",
          action: "stop",
          operationId: operation.id,
        },
        "*",
      );
      return;
    }

    ui.objectives.disabled = true;
    setFeedback("Avvio del completamento degli Obiettivi…");
    const acquired = await runtimeMessage({
      type: "PEGASO_ACQUIRE_OPERATION",
      kind: "objectives",
    });
    if (!acquired?.accepted) {
      if (acquired?.operation) {
        settings.pegasoActiveOperation = acquired.operation;
        renderOperation();
      } else {
        renderOperation();
        setFeedback(
          acquired?.reason ||
            "Impossibile avviare il completamento degli Obiettivi.",
          true,
        );
      }
      return;
    }
    playActionAnimation(ui.objectivesSprite);
    window.postMessage(
      {
        type: "PEGASO_OBJECTIVES_COMMAND",
        action: "start",
        operationId: acquired.operation.id,
      },
      "*",
    );
  }

  async function toggleTestExport() {
    const operation = settings.pegasoActiveOperation;
    const collecting =
      operation?.kind === "tests" && operation.phase === "collecting";
    if (collecting) {
      setFeedback("Interruzione della raccolta dei test…");
      await runtimeMessage({
        type: "PEGASO_CANCEL_EXPORT",
        operationId: operation.id,
      });
      return;
    }
    setFeedback("Avvio della raccolta dei test…");
    const response = await runtimeMessage({
      type: "PEGASO_START_TEST_EXPORT",
      requestSource: "floating-menu",
    });
    if (!response?.accepted) {
      if (response?.operation) {
        settings.pegasoActiveOperation = response.operation;
        renderOperation();
      } else {
        setFeedback(
          response?.reason || "Impossibile avviare la raccolta dei test.",
          true,
        );
      }
    } else {
      playActionAnimation(ui.testCollectionSprite);
    }
  }

  async function startMaterialsExport() {
    setFeedback("Avvio della raccolta delle dispense…");
    ui.materials.disabled = true;
    const response = await runtimeMessage({
      type: "PEGASO_START_EXPORT",
      format: "materials",
      requestSource: "floating-menu",
    });
    if (!response?.accepted) {
      if (response?.operation) {
        settings.pegasoActiveOperation = response.operation;
        renderOperation();
      } else {
        renderOperation();
        setFeedback(
          response?.reason || "Impossibile avviare l’operazione.",
          true,
        );
      }
    } else {
      playActionAnimation(ui.materialsSprite);
    }
  }

  async function toggleMaterialsExport() {
    const operation = settings.pegasoActiveOperation;
    if (operation?.kind !== "materials" || operation.phase !== "collecting") {
      await startMaterialsExport();
      return;
    }
    setFeedback("Interruzione della raccolta delle dispense…");
    const response = await runtimeMessage({
      type: "PEGASO_CANCEL_EXPORT",
      operationId: operation.id,
    });
    if (!response?.accepted) {
      if (response?.operation) {
        settings.pegasoActiveOperation = response.operation;
        renderOperation();
      } else {
        setFeedback(
          response?.reason || "Impossibile interrompere la raccolta.",
          true,
        );
      }
    }
  }

  function writeSetting(key, value) {
    chrome.storage.local.set({ [key]: value });
  }

  function createMenu() {
    if (host || !document.documentElement) return;

    host = document.createElement("div");
    host.id = HOST_ID;
    applyTheme();
    applyVisualStyle();
    applyMenuSize();
    const shadow = host.attachShadow({ mode: "closed" });
    const iconUrl = chrome.runtime.getURL("icons/icon-48.png");
    const mascotLogoLightUrl = chrome.runtime.getURL(
      "assets/gaming/mascot-logo-light.png",
    );
    const mascotLogoDarkUrl = chrome.runtime.getURL(
      "assets/gaming/mascot-logo-dark.png",
    );
    const mascotIdleLightUrl = chrome.runtime.getURL(
      "assets/gaming/mascot-idle-light.png",
    );
    const mascotIdleDarkUrl = chrome.runtime.getURL(
      "assets/gaming/mascot-idle-dark.png",
    );
    const actionObjectivesUrl = chrome.runtime.getURL(
      "assets/gaming/action-objectives.png",
    );
    const actionAutoTestsUrl = chrome.runtime.getURL(
      "assets/gaming/action-auto-tests.png",
    );
    const actionTestCollectionUrl = chrome.runtime.getURL(
      "assets/gaming/action-test-collection.png",
    );
    const actionStudyMaterialsUrl = chrome.runtime.getURL(
      "assets/gaming/action-study-materials.png",
    );
    const actionAutoplayUrl = chrome.runtime.getURL(
      "assets/gaming/action-autoplay.png",
    );
    const actionPlaybackRecoveryUrl = chrome.runtime.getURL(
      "assets/gaming/action-playback-recovery.png",
    );
    const actionCommissionCheckUrl = chrome.runtime.getURL(
      "assets/gaming/action-commission-check.png",
    );
    const notificationAlertUrl = chrome.runtime.getURL(
      "assets/gaming/notification-alert.png",
    );
    const pixelFontUrl = chrome.runtime.getURL(
      "assets/fonts/pixelify-sans-latin.ttf",
    );
    const progressFrameLeftUrl = chrome.runtime.getURL(
      "assets/gaming/progress-arcane-frame-left.png",
    );
    const progressFrameCenterUrl = chrome.runtime.getURL(
      "assets/gaming/progress-arcane-frame-center.png",
    );
    const progressFrameRightUrl = chrome.runtime.getURL(
      "assets/gaming/progress-arcane-frame-right.png",
    );
    const progressFillUrl = chrome.runtime.getURL(
      "assets/gaming/progress-arcane-fill.png",
    );

    shadow.innerHTML = `
      <style>
        @font-face {
          font-family: "Pixelify Sans";
          src: url("${pixelFontUrl}") format("truetype");
          font-style: normal;
          font-weight: 400 700;
          font-display: swap;
        }
        :host {
          --sw-text: #1f2937;
          --sw-panel: #ffffff;
          --sw-border: #d9d1ed;
          --sw-divider: #ebe7f4;
          --sw-divider-soft: #f0edf6;
          --sw-heading: #25145f;
          --sw-muted: #6b7280;
          --sw-accent: #5b2ca0;
          --sw-accent-strong: #421f7c;
          --sw-accent-soft: #f3effb;
          --sw-control-text: #2f3340;
          --sw-choice-text: #3f4451;
          --sw-disabled-text: #6b7280;
          --sw-disabled-border: #d1d5db;
          --sw-disabled-bg: #e5e7eb;
          --sw-elevated: #faf8ff;
          --sw-gold-hover: #fff4d7;
          --sw-info-text: #4b5563;
          --sw-info-bg: #fffaf0;
          --sw-empty-bg: #f8f7fb;
          --sw-exam-border: #e2dcef;
          --sw-warning-text: #7a5411;
          --sw-warning-bg: #fff4d8;
          --sw-success-text: #12613b;
          --sw-success-bg: #dcf7e9;
          --sw-danger-text: #8a1818;
          --sw-danger-bg: #fee2e2;
          --sw-note-text: #7c6f57;
          --sw-paused-text: #8a3b12;
          --sw-running-text: #177245;
          --sw-on-accent: #ffffff;
          --sw-gold: #f2b84b;
          --sw-gold-border: #d39a2e;
          --sw-action-start: #25145f;
          --sw-action-end: #5b2ca0;
          --sw-action-hover-start: #1d104d;
          --sw-action-hover-end: #421f7c;
          --sw-stop: #991b1b;
          --sw-panel-shadow: rgb(37 20 95 / 24%);
          --sw-launcher-size: 46px;
          --sw-launcher-radius: 14px;
          --sw-badge-size: 23px;
          --sw-badge-font-size: 14px;
          --sw-badge-offset: -4px;
          --sw-badge-padding: 5px;
          all: initial;
          position: fixed;
          width: var(--sw-launcher-size);
          height: var(--sw-launcher-size);
          z-index: 2147483647;
          color: var(--sw-text);
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color-scheme: light;
        }
        :host([data-menu-size="small"]) {
          --sw-launcher-size: 42px;
          --sw-launcher-radius: 13px;
          --sw-badge-size: 20px;
          --sw-badge-font-size: 12px;
          --sw-badge-offset: -3px;
          --sw-badge-padding: 4px;
        }
        :host([data-menu-size="large"]) {
          --sw-launcher-size: 50px;
          --sw-launcher-radius: 15px;
          --sw-badge-size: 26px;
          --sw-badge-font-size: 15px;
          --sw-badge-offset: -5px;
          --sw-badge-padding: 6px;
        }
        :host([data-studywing-theme="dark"]) {
          --sw-text: #f4f0fa;
          --sw-panel: #211a2d;
          --sw-border: #493b5e;
          --sw-divider: #40344f;
          --sw-divider-soft: #3a304a;
          --sw-heading: #d8c4ff;
          --sw-muted: #c4bacf;
          --sw-accent: #a77ae8;
          --sw-accent-strong: #c4a7ff;
          --sw-accent-soft: #2b223a;
          --sw-control-text: #e3dbea;
          --sw-choice-text: #d9d0e2;
          --sw-disabled-text: #958ba1;
          --sw-disabled-border: #493b5e;
          --sw-disabled-bg: #342b40;
          --sw-elevated: #2b223a;
          --sw-gold-hover: #3b301b;
          --sw-info-text: #e8dfcf;
          --sw-info-bg: #2d2618;
          --sw-empty-bg: #2b223a;
          --sw-exam-border: #493b5e;
          --sw-warning-text: #ffd070;
          --sw-warning-bg: #3b301b;
          --sw-success-text: #75d6a5;
          --sw-success-bg: #173b2c;
          --sw-danger-text: #ff9da5;
          --sw-danger-bg: #471f29;
          --sw-note-text: #c8bda9;
          --sw-paused-text: #ffb98a;
          --sw-running-text: #75d6a5;
          --sw-gold-border: #ffd070;
          --sw-action-start: #3d2776;
          --sw-action-end: #6a3fa5;
          --sw-action-hover-start: #4d318f;
          --sw-action-hover-end: #7a4fba;
          --sw-stop: #b8323f;
          --sw-panel-shadow: rgb(0 0 0 / 42%);
          color-scheme: dark;
        }
        *, *::before, *::after { box-sizing: border-box; }
        [hidden] { display: none !important; }
        button, input { font: inherit; }
        .launcher {
          position: relative;
          display: block;
          width: var(--sw-launcher-size);
          height: var(--sw-launcher-size);
          padding: 0;
          overflow: hidden;
          border: 2px solid #f2b84b;
          border-radius: var(--sw-launcher-radius);
          background: #25145f;
          box-shadow: 0 7px 20px rgb(37 20 95 / 32%);
          cursor: grab;
          touch-action: none;
          user-select: none;
          transition: transform 140ms ease, box-shadow 140ms ease;
        }
        :host([data-visual-style="gaming"]) .launcher {
          border-color: #15111f;
          border-radius: 4px;
          background: linear-gradient(to bottom, #d8c4ff 0 62%, #a77ae8 62% 100%);
          box-shadow: 3px 3px 0 rgb(21 17 31 / 30%);
        }
        :host([data-visual-style="gaming"][data-studywing-theme="dark"]) .launcher {
          border-color: #d3a92d;
          background: #15111f;
          box-shadow: 3px 3px 0 rgb(0 0 0 / 42%);
        }
        :host([data-visual-style="gaming"]) .launcher::before {
          content: "";
          position: absolute;
          z-index: 0;
          top: 4px;
          right: 4px;
          width: 5px;
          height: 5px;
          background: #ffd070;
          pointer-events: none;
        }
        :host([data-visual-style="gaming"][data-studywing-theme="dark"]) .launcher::before {
          top: 5px;
          right: auto;
          left: 5px;
          width: 2px;
          height: 2px;
          background: #d8c4ff;
          box-shadow: 9px -2px 0 #d8c4ff, 24px 4px 0 #d8c4ff, 5px 10px 0 #a77ae8;
        }
        .launcher:hover {
          transform: translateY(-2px);
          box-shadow: 0 9px 24px rgb(37 20 95 / 38%);
        }
        .launcher.dragging {
          cursor: grabbing;
          transform: none;
          transition: none;
        }
        .launcher.commission-alert {
          animation: commission-pulse 520ms ease-in-out 4;
        }
        @keyframes commission-pulse {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(-8deg) scale(1.08); }
          75% { transform: rotate(8deg) scale(1.08); }
        }
        .notification-badge {
          position: absolute;
          top: var(--sw-badge-offset);
          right: var(--sw-badge-offset);
          min-width: var(--sw-badge-size);
          height: var(--sw-badge-size);
          padding: 0 var(--sw-badge-padding);
          border: 2px solid var(--sw-panel);
          border-radius: 999px;
          color: var(--sw-heading);
          background: var(--sw-gold);
          box-shadow: 0 3px 9px rgb(37 20 95 / 30%);
          font-size: var(--sw-badge-font-size);
          font-weight: 900;
          line-height: calc(var(--sw-badge-size) - 4px);
          text-align: center;
          pointer-events: none;
          z-index: 4;
        }
        .notification-alert-sprite { display: none; }
        :host([data-visual-style="gaming"]) .notification-badge:not([data-overflow="true"]) {
          display: grid;
          place-items: center;
          padding: 0;
          border-color: #15111f;
          border-radius: 2px;
          color: #ffd070;
          background: #25145f;
          box-shadow: inset 0 0 0 1px #d3a92d, 2px 2px 0 rgb(21 17 31 / 45%);
        }
        :host([data-visual-style="gaming"]) .notification-badge:not([data-overflow="true"]) .notification-badge-text {
          display: none;
        }
        :host([data-visual-style="gaming"]) .notification-badge:not([data-overflow="true"]) .notification-alert-sprite {
          display: block;
          width: 16px;
          height: 16px;
          background-image: url("${notificationAlertUrl}");
          background-repeat: no-repeat;
          background-position: 0 0;
          background-size: 500% 100%;
          image-rendering: pixelated;
        }
        :host([data-visual-style="gaming"]) .launcher.commission-alert + .notification-badge:not([data-overflow="true"]) .notification-alert-sprite {
          animation: notification-alert 900ms steps(4, end) 2 both;
        }
        @keyframes notification-alert {
          from { background-position-x: 0; }
          to { background-position-x: 100%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .launcher.commission-alert { animation: none; }
          .launcher:hover .launcher-mascot,
          .launcher.mascot-idle-playing .launcher-mascot,
          .gaming-action-sprite,
          .gaming-control-sprite,
          .notification-alert-sprite { animation: none !important; }
        }
        .launcher:focus-visible, button:focus-visible, input:focus-visible {
          outline: 3px solid #f2b84b;
          outline-offset: 2px;
        }
        .launcher-standard {
          display: block;
          width: 100%;
          height: 100%;
          pointer-events: none;
          -webkit-user-drag: none;
        }
        .launcher-mascot {
          position: absolute;
          z-index: 1;
          inset: 0;
          display: none;
          background-repeat: no-repeat;
          background-position: 0 0;
          background-size: 500% 100%;
          image-rendering: pixelated;
          pointer-events: none;
        }
        .launcher-cosmetic-frame { display:none; position:absolute; z-index:2; inset:2px; background:center/contain no-repeat var(--sw-launcher-frame, none); image-rendering:pixelated; pointer-events:none; }
        :host([data-visual-style="gaming"]:not([data-launcher-style="arcane"])) .launcher-cosmetic-frame { display:block; }
        :host([data-visual-style="gaming"]:not([data-launcher-style="arcane"])) .launcher-mascot { inset:3px; }
        :host([data-visual-style="gaming"]) .launcher-standard { display: none; }
        :host([data-visual-style="gaming"]) .launcher-mascot {
          display: block;
          background-image: url("${mascotIdleLightUrl}");
        }
        :host([data-visual-style="gaming"][data-studywing-theme="dark"]) .launcher-mascot {
          background-image: url("${mascotIdleDarkUrl}");
        }
        :host([data-visual-style="gaming"]) .launcher:hover:not(.dragging) .launcher-mascot,
        :host([data-visual-style="gaming"]) .launcher.mascot-idle-playing .launcher-mascot {
          animation: mascot-idle 1000ms steps(1, end) 1;
        }
        @keyframes mascot-idle {
          0%, 19.99% { background-position: 0 0; }
          20%, 39.99% { background-position: 25% 0; }
          40%, 59.99% { background-position: 50% 0; }
          60%, 79.99% { background-position: 75% 0; }
          80%, 100% { background-position: 100% 0; }
        }
        @keyframes objectives-arrow {
          0% { background-position: 0 0; }
          83.333%, 100% { background-position: 100% 0; }
        }
        @keyframes action-six-frames {
          0% { background-position: 0 0; }
          83.333%, 100% { background-position: 100% 0; }
        }
        @keyframes objectives-hover-preview {
          0% { background-position: 0 0; }
          62.5%, 100% { background-position: 100% 0; }
        }
        @keyframes auto-tests-hover-preview {
          0% { background-position: 0 0; }
          55.556%, 100% { background-position: 100% 0; }
        }
        @keyframes action-hover-preview {
          0% { background-position: 0 0; }
          58.824%, 100% { background-position: 100% 0; }
        }
        @keyframes control-hover-preview {
          0% { background-position: 0 0; }
          56.25%, 100% { background-position: 100% 0; }
        }
        :host([data-visual-style="gaming"]) .name,
        :host([data-visual-style="gaming"]) .menu-tab,
        :host([data-visual-style="gaming"]) .section-title,
        :host([data-visual-style="gaming"]) .actions-title,
        :host([data-visual-style="gaming"]) .course-progress-heading,
        :host([data-visual-style="gaming"]) .course-progress-value,
        :host([data-visual-style="gaming"]) .chapter-limit-stepper,
        :host([data-visual-style="gaming"]) .autoplay-options-title,
        :host([data-visual-style="gaming"]) .test-choice-heading,
        :host([data-visual-style="gaming"]) .commission-heading,
        :host([data-visual-style="gaming"]) .loaded-outcome-heading,
        :host([data-visual-style="gaming"]) .preferences-heading,
        :host([data-visual-style="gaming"]) .preference-group-heading,
        :host([data-visual-style="gaming"]) .setting,
        :host([data-visual-style="gaming"]) .autoplay-options-toggle,
        :host([data-visual-style="gaming"]) .test-choice-list label,
        :host([data-visual-style="gaming"]) .chapter-limit-row,
        :host([data-visual-style="gaming"]) .course-progress-options-menu summary,
        :host([data-visual-style="gaming"]) .course-progress-setting,
        :host([data-visual-style="gaming"]) .course-progress-position-title,
        :host([data-visual-style="gaming"]) .course-progress-position-list label,
        :host([data-visual-style="gaming"]) .preference-options label,
        :host([data-visual-style="gaming"]) .confirmed-toggle,
        :host([data-visual-style="gaming"]) .last-notification-heading,
        :host([data-visual-style="gaming"]) .action,
        :host([data-visual-style="gaming"]) .bookmark-action {
          font-family: "Pixelify Sans", system-ui, sans-serif;
        }
        .panel {
          position: fixed;
          display: flex;
          flex-direction: column;
          width: min(292px, calc(100vw - 28px));
          max-height: calc(100vh - 98px);
          overflow: hidden;
          border: 1px solid var(--sw-border);
          border-radius: 14px;
          background: var(--sw-panel);
          box-shadow: 0 18px 48px var(--sw-panel-shadow);
        }
        :host([data-menu-size="medium"]) .panel { width: min(340px, calc(100vw - 28px)); }
        :host([data-menu-size="large"]) .panel { width: min(390px, calc(100vw - 28px)); }
        .header {
          display: flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 9px;
          padding: 12px 12px 10px;
          border-bottom: 1px solid var(--sw-divider);
        }
        .header-logo {
          position: relative;
          width: 30px;
          height: 30px;
          flex: 0 0 auto;
          overflow: hidden;
          border-radius: 8px;
        }
        .header-logo img {
          position: absolute;
          inset: 0;
          display: block;
          width: 30px;
          height: 30px;
          image-rendering: pixelated;
          pointer-events: none;
        }
        .header-logo-gaming { display: none !important; }
        .header-logo-gaming {
          position: absolute;
          inset: 0;
          width: 30px;
          height: 30px;
          background-repeat: no-repeat;
          background-position: center;
          background-size: 30px 30px;
          image-rendering: pixelated;
          pointer-events: none;
        }
        :host([data-visual-style="gaming"]) .header-logo {
          border: 1px solid #15111f;
          border-radius: 3px;
          background: linear-gradient(to bottom, #d8c4ff 0 62%, #a77ae8 62% 100%);
        }
        :host([data-visual-style="gaming"]) .header-logo-standard { display: none; }
        :host([data-visual-style="gaming"]) .header-logo-gaming {
          display: block !important;
          background-image: url("${mascotLogoLightUrl}");
        }
        :host([data-visual-style="gaming"][data-studywing-theme="dark"]) .header-logo-gaming {
          background-image: url("${mascotLogoDarkUrl}");
        }
        :host([data-visual-style="gaming"][data-studywing-theme="dark"]) .header-logo {
          border-color: #d3a92d;
          background: #15111f;
        }
        .identity { min-width: 0; flex: 1; }
        .name { color: var(--sw-heading); font-size: 15px; font-weight: 750; line-height: 1.15; }
        .subtitle { margin-top: 2px; color: var(--sw-muted); font-size: 10px; line-height: 1.2; }
        .state {
          margin-top: 4px;
          color: var(--sw-paused-text);
          font-size: 10px;
          font-weight: 700;
        }
        :host([data-menu-size="medium"]) .subtitle,
        :host([data-menu-size="medium"]) .state,
        :host([data-menu-size="large"]) .subtitle,
        :host([data-menu-size="large"]) .state { font-size: 11px; }
        .state[data-running="true"] { color: var(--sw-running-text); }
        .close {
          width: 30px;
          height: 30px;
          padding: 0;
          border: 0;
          border-radius: 8px;
          color: var(--sw-accent);
          background: var(--sw-accent-soft);
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
        }
        .body {
          min-height: 0;
          padding: 9px 12px 12px;
          overflow: auto;
          scrollbar-gutter: stable;
        }
        @supports selector(::-webkit-scrollbar) {
          .body { scrollbar-gutter: auto; }
        }
        .menu-tabs {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 4px;
          margin-bottom: 10px;
          padding: 3px;
          border: 1px solid var(--sw-divider);
          border-radius: 9px;
          background: var(--sw-accent-soft);
        }
        .menu-tabs[data-count="1"] { grid-template-columns: 1fr; }
        .menu-tabs[data-count="2"] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .menu-tabs[data-count="3"] { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .menu-tabs[data-count="4"] { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .achievement-list { display:grid; gap:5px; max-height:230px; overflow:auto; }
        .achievement-row { display:flex; justify-content:space-between; gap:8px; padding:7px; border:1px solid var(--sw-exam-border); border-radius:7px; font-size:11px; }
        .achievement-row[data-complete="true"] { opacity:.7; }
        .achievement-row span { color:var(--sw-accent); font-weight:700; white-space:nowrap; }
        .achievement-footer { position:sticky; bottom:0; padding-top:9px; background:var(--sw-panel); }
        .achievement-level { display:flex; justify-content:space-between; gap:8px; font-size:11px; margin-bottom:6px; }
        .achievement-progress { position:relative; height:28px; overflow:visible; background-color:#15111f; background-image:var(--sw-active-frame-left),var(--sw-active-frame-right),var(--sw-active-frame-center); background-position:left top,right top,left top; background-repeat:no-repeat,no-repeat,repeat-x; background-size:28px 28px,28px 28px,16px 28px; image-rendering:pixelated; }
        .achievement-progress-fill { position:absolute; left:20px; top:10px; display:block; max-width:calc(100% - 40px); height:10px; width:0; background-image:var(--sw-active-fill); background-repeat:repeat-x; background-size:16px 10px; image-rendering:pixelated; }
        .achievement-mid-marker,.achievement-end-marker { position:absolute; z-index:3; top:50%; width:16px; height:16px; overflow:hidden; background:center/contain no-repeat; image-rendering:pixelated; transform:translate(-50%,-50%); }
        .achievement-mid-marker { left:50%; }
        .achievement-end-marker { left:100%; }
        .achievement-progress[data-mid-unlocked="true"] .achievement-mid-marker { width:3px; height:12px; background-image:none !important; background-color:var(--sw-accent); box-shadow:0 0 0 1px #15111f; }
        .rewards-menu { margin-top:8px; border:1px solid var(--sw-exam-border); border-radius:7px; }
        .rewards-menu > summary { display:flex; justify-content:space-between; gap:8px; padding:7px; cursor:pointer; font-size:11px; font-weight:750; }
        .rewards-menu > summary small { color:var(--sw-muted); }
        .reward-list { display:grid; gap:5px; padding:0 6px 6px; }
        .reward-card { display:grid; grid-template-columns:28px minmax(0,1fr) auto; align-items:center; gap:6px; padding:5px; border:1px solid var(--sw-exam-border); border-radius:6px; }
        .reward-card[data-locked="true"] { opacity:.55; filter:saturate(.4); }
        .reward-preview { width:24px; height:24px; background:center/contain no-repeat; image-rendering:pixelated; }
        .reward-copy { display:flex; min-width:0; flex-direction:column; gap:1px; }
        .reward-copy strong { overflow:hidden; font-size:10px; text-overflow:ellipsis; white-space:nowrap; }
        .reward-copy small { color:var(--sw-muted); font-size:9px; }
        .reward-apply { padding:4px 6px; border:1px solid var(--sw-accent); border-radius:5px; color:var(--sw-heading); background:var(--sw-surface); cursor:pointer; font-size:9px; font-weight:750; }
        .menu-tab {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 30px;
          padding: 5px 8px;
          border: 0;
          border-radius: 6px;
          color: var(--sw-muted);
          background: transparent;
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
        }
        .menu-tab:hover { color: var(--sw-accent-strong); }
        .menu-tab[aria-selected="true"] {
          color: var(--sw-heading);
          background: var(--sw-panel);
          box-shadow: 0 1px 4px var(--sw-panel-shadow);
        }
        .menu-tab-badge {
          min-width: 17px;
          height: 17px;
          padding: 0 4px;
          border-radius: 999px;
          color: #25145f;
          background: var(--sw-gold);
          font-size: 9px;
          font-weight: 900;
          line-height: 17px;
          text-align: center;
        }
        .menu-tab-panel { min-width: 0; }
        .preferences-panel {
          display: grid;
          gap: 10px;
        }
        .preferences-section {
          display: grid;
          gap: 8px;
        }
        .preferences-heading {
          margin: 0;
          color: var(--sw-heading);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .preference-group {
          min-width: 0;
          margin: 0;
          padding: 9px;
          border: 1px solid var(--sw-border);
          border-radius: 8px;
          background: var(--sw-elevated);
        }
        .preference-group-heading {
          margin-bottom: 7px;
          color: var(--sw-heading);
          font-size: 10px;
          font-weight: 750;
          line-height: 1.3;
        }
        .preference-options {
          display: grid;
          gap: 7px;
        }
        .preference-options[data-columns="3"] {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .preference-options[data-columns="2"] {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .preference-options label {
          display: flex;
          align-items: center;
          gap: 5px;
          min-width: 0;
          color: var(--sw-choice-text);
          font-size: 10px;
          line-height: 1.3;
          cursor: pointer;
        }
        .preference-options input {
          flex: 0 0 auto;
          margin: 0;
          accent-color: var(--sw-accent);
          cursor: pointer;
        }
        .preference-hint {
          margin: 7px 0 0;
          color: var(--sw-muted);
          font-size: 9px;
          line-height: 1.35;
        }
        :host([data-menu-size="medium"]) .preference-group-heading,
        :host([data-menu-size="medium"]) .preference-options label { font-size: 11px; }
        :host([data-menu-size="large"]) .preference-group-heading,
        :host([data-menu-size="large"]) .preference-options label { font-size: 12px; }
        :host([data-menu-size="medium"]) .preference-hint { font-size: 10px; }
        :host([data-menu-size="large"]) .preference-hint { font-size: 11px; }
        .course-progress {
          margin-bottom: 8px;
          padding: 9px;
          border: 1px solid var(--sw-border);
          border-radius: 8px;
          background: var(--sw-surface-elevated);
        }
        .course-progress-heading {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
          color: var(--sw-heading);
          font-size: 10px;
          font-weight: 800;
        }
        .course-progress-value { font-size: 16px; }
        .course-progress-track {
          position: relative;
          height: 7px;
          margin-top: 6px;
          overflow: hidden;
          border-radius: 999px;
          background: var(--sw-divider);
        }
        .course-progress-inner {
          position: absolute;
          inset: 0;
          overflow: hidden;
          border-radius: inherit;
        }
        .course-progress-fill {
          display: block;
          width: 0;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, var(--sw-accent), var(--sw-gold));
          transition: width 240ms ease;
        }
        :host([data-visual-style="gaming"]) .course-progress-track {
          height: 28px;
          overflow: visible;
          border-radius: 0;
          background-color: #15111f;
          background-image:
            var(--sw-active-frame-left, url("${progressFrameLeftUrl}")),
            var(--sw-active-frame-right, url("${progressFrameRightUrl}")),
            var(--sw-active-frame-center, url("${progressFrameCenterUrl}"));
          background-position: left top, right top, left top;
          background-repeat: no-repeat, no-repeat, repeat-x;
          background-size: 28px 28px, 28px 28px, 16px 28px;
          filter: drop-shadow(2px 2px 0 rgb(21 17 31 / 30%));
          image-rendering: pixelated;
        }
        :host([data-visual-style="gaming"]) .course-progress-inner {
          inset: 10px 20px 8px;
          border-radius: 0;
          background: #25145f;
        }
        :host([data-visual-style="gaming"]) .course-progress-fill {
          position: relative;
          border-radius: 0;
          background-color: #5b2ca0;
          background-image: var(--sw-active-fill, url("${progressFillUrl}"));
          background-repeat: repeat-x;
          background-position: left top;
          background-size: 16px 10px;
          box-shadow: inset -4px 0 0 #f2b84b;
          image-rendering: pixelated;
        }
        :host([data-visual-style="gaming"]) .course-progress-track::after {
          content: "";
          position: absolute;
          z-index: 2;
          inset: 10px 20px 8px;
          background-image: linear-gradient(to right, transparent calc(100% - 2px), rgb(21 17 31 / 70%) calc(100% - 2px));
          background-size: 10% 100%;
          pointer-events: none;
        }
        :host([data-visual-style="gaming"]) .course-progress {
          position: relative;
        }
        :host([data-visual-style="gaming"]) .course-progress-value {
          position: absolute;
          z-index: 5;
          top: 42px;
          left: 50%;
          min-width: 40px;
          padding: 1px 6px 2px;
          border: 2px solid #d3a92e;
          color: #d8c4ff;
          background: #15111f;
          box-shadow: inset 0 0 0 2px #25145f, 2px 2px 0 rgb(21 17 31 / 32%);
          font-size: 13px;
          line-height: 1.15;
          text-align: center;
          transform: translate(-50%, -50%);
        }
        :host([data-visual-style="gaming"]) .course-progress-threshold {
          top: 9px;
          bottom: auto;
          width: 8px;
          height: 8px;
          border: 2px solid #15111f;
          background: #f2b84b;
          box-shadow: inset 0 0 0 1px #d8c4ff;
          transform: translateX(-50%) rotate(45deg);
        }
        .course-progress-threshold {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 70%;
          width: 2px;
          background: #cf1d56;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8);
          z-index: 3;
        }
        .course-progress-threshold[hidden] { display: none; }
        .course-progress-message {
          margin: 5px 0 0;
          color: var(--sw-muted);
          font-size: 10px;
          line-height: 1.3;
        }
        .course-progress-options-menu {
          margin-top: 7px;
          border-top: 1px solid var(--sw-divider);
        }
        .course-progress-options-menu summary {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) 8px;
          align-items: center;
          gap: 5px;
          padding: 6px 0 3px;
          color: var(--sw-heading);
          font-size: 9px;
          font-weight: 700;
          cursor: pointer;
          list-style: none;
        }
        .course-progress-options-menu summary::-webkit-details-marker { display: none; }
        .course-progress-options-menu summary small {
          overflow: hidden;
          color: var(--sw-muted);
          font-size: 8px;
          font-weight: 500;
          text-align: right;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .course-progress-options-chevron {
          width: 5px;
          height: 5px;
          border-right: 1.5px solid currentColor;
          border-bottom: 1.5px solid currentColor;
          transform: rotate(45deg) translate(-1px, -1px);
          transition: transform 160ms ease;
        }
        .course-progress-options-menu[open] .course-progress-options-chevron {
          transform: rotate(225deg) translate(-1px, -1px);
        }
        .course-progress-settings {
          padding-left: 6px;
          border-left: 2px solid var(--sw-divider);
        }
        .course-progress-setting {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 5px 0;
          color: var(--sw-control-text);
          font-size: 10px;
        }
        .course-progress-setting input { accent-color: var(--sw-accent); }
        .course-progress-position {
          padding: 5px 0 7px;
          border-top: 1px solid var(--sw-divider-soft);
        }
        .course-progress-position-title {
          color: var(--sw-heading);
          font-size: 9px;
          font-weight: 700;
        }
        .course-progress-position-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 4px 7px;
          margin-top: 5px;
        }
        .course-progress-position-list label {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--sw-choice-text);
          font-size: 9px;
        }
        .course-progress-position-list input {
          margin: 0;
          accent-color: var(--sw-accent);
        }
        .course-progress-position[data-disabled="true"] { opacity: 0.48; }
        .course-progress-hint {
          margin: 1px 0 0;
          color: var(--sw-muted);
          font-size: 8px;
          line-height: 1.3;
        }
        .setting {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 34px;
          color: var(--sw-control-text);
          font-size: 12px;
          line-height: 1.25;
          cursor: pointer;
        }
        .setting + .setting { border-top: 1px solid var(--sw-divider-soft); }
        .setting input {
          width: 17px;
          height: 17px;
          flex: 0 0 auto;
          accent-color: var(--sw-accent);
          cursor: pointer;
        }
        .setting.disabled { color: var(--sw-disabled-text); cursor: not-allowed; }
        .setting.disabled input { cursor: not-allowed; }
        .setting label { flex: 1 1 auto; cursor: pointer; }
        .setting-controls {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .autoplay-options-toggle {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 7px 8px;
          border: 0;
          border-top: 1px solid var(--sw-divider-soft);
          color: var(--sw-accent-strong);
          background: transparent;
          font: inherit;
          text-align: left;
          cursor: pointer;
        }
        .autoplay-options-label {
          display: grid;
          gap: 2px;
          min-width: 0;
        }
        .autoplay-options-title { font-size: 11px; font-weight: 750; }
        .autoplay-options-summary {
          overflow: hidden;
          color: var(--sw-muted);
          font-size: 9px;
          line-height: 1.25;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .autoplay-options-chevron {
          width: 7px;
          height: 7px;
          margin-right: 7px;
          border-right: 2px solid currentColor;
          border-bottom: 2px solid currentColor;
          transform: rotate(45deg);
          transition: transform 180ms ease;
        }
        .autoplay-options-toggle[aria-expanded="true"] .autoplay-options-chevron {
          transform: rotate(225deg);
        }
        .autoplay-options-shell {
          display: grid;
          grid-template-rows: 0fr;
          opacity: 0;
          transition: grid-template-rows 220ms ease, opacity 180ms ease;
        }
        .autoplay-options-shell[data-expanded="true"] {
          grid-template-rows: 1fr;
          opacity: 1;
        }
        .autoplay-options-overflow { min-height: 0; overflow: hidden; }
        .autoplay-options-content {
          margin: 1px 0 7px 5px;
          padding: 4px 0 5px 10px;
          border-left: 3px solid var(--sw-border);
          transition: opacity 180ms ease, border-color 180ms ease;
        }
        .autoplay-options-content.disabled {
          border-left-color: var(--sw-disabled-border);
          opacity: 0.55;
        }
        .autoplay-options-content.disabled input { cursor: not-allowed; }
        .chapter-limit { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--sw-border); }
        .chapter-limit-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .chapter-limit-stepper { display: grid; grid-template-columns: 28px 36px 28px; align-items: center; margin-top: 7px; border: 1px solid var(--sw-border); border-radius: 7px; overflow: hidden; }
        .chapter-limit-stepper button { border: 0; min-height: 28px; color: var(--sw-heading); background: var(--sw-surface-elevated); }
        .chapter-limit-stepper output { text-align: center; font-weight: 750; }
        .chapter-limit-progress { margin: 6px 0 0; color: var(--sw-text-muted); font-size: 10px; line-height: 1.35; }
        .bookmark-action {
          width: 100%;
          min-height: 32px;
          padding: 6px 8px;
          border: 1px solid var(--sw-accent);
          border-radius: 7px;
          color: var(--sw-accent-strong);
          background: var(--sw-accent-soft);
          font-size: 10px;
          font-weight: 750;
          line-height: 1.25;
          cursor: pointer;
        }
        .bookmark-action:hover { color: var(--sw-on-accent); background: var(--sw-accent-strong); }
        .bookmark-action:disabled {
          border-color: var(--sw-disabled-border);
          color: var(--sw-disabled-text);
          background: var(--sw-disabled-bg);
          cursor: not-allowed;
        }
        .test-choice-heading {
          margin: 7px 0 5px;
          padding-top: 7px;
          border-top: 1px solid var(--sw-divider-soft);
          color: var(--sw-accent-strong);
          font-size: 10px;
          font-weight: 750;
        }
        .test-choice-list { display: grid; gap: 5px; }
        .test-choice-list label {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--sw-choice-text);
          font-size: 10px;
          cursor: pointer;
        }
        .test-choice-list input {
          width: 14px;
          height: 14px;
          margin: 0;
          accent-color: var(--sw-accent);
        }
        @media (prefers-reduced-motion: reduce) {
          .autoplay-options-shell,
          .autoplay-options-chevron,
          .autoplay-options-content,
          .course-progress-fill,
          .course-progress-options-chevron { transition: none; }
        }
        .expand-button {
          position: relative;
          width: 24px;
          height: 24px;
          min-width: 24px;
          padding: 0;
          border: 1px solid var(--sw-border);
          border-radius: 6px;
          color: var(--sw-accent-strong);
          background: var(--sw-elevated);
          cursor: pointer;
        }
        .expand-button::before {
          content: "";
          position: absolute;
          top: 7px;
          left: 8px;
          width: 6px;
          height: 6px;
          border-right: 2px solid currentColor;
          border-bottom: 2px solid currentColor;
          transform: rotate(45deg);
          transition: transform 160ms ease, top 160ms ease;
        }
        .expand-button:hover,
        .expand-button[aria-expanded="true"] {
          border-color: var(--sw-gold-border);
          color: var(--sw-heading);
          background: var(--sw-gold-hover);
        }
        .expand-button[aria-expanded="true"]::before {
          top: 10px;
          transform: rotate(225deg);
        }
        .info-panel {
          margin: 1px 0 10px;
          padding: 8px 9px;
          border-left: 3px solid var(--sw-gold);
          border-radius: 4px;
          color: var(--sw-info-text);
          background: var(--sw-info-bg);
          font-size: 10px;
          line-height: 1.4;
        }
        :host([data-menu-size="medium"]) .info-panel { font-size: 11px; }
        :host([data-menu-size="large"]) .info-panel { font-size: 12px; }
        :host([data-menu-size="medium"]) .menu-tab,
        :host([data-menu-size="medium"]) .course-progress-heading,
        :host([data-menu-size="medium"]) .course-progress-message,
        :host([data-menu-size="medium"]) .course-progress-options-menu summary,
        :host([data-menu-size="medium"]) .course-progress-setting,
        :host([data-menu-size="medium"]) .course-progress-position-title,
        :host([data-menu-size="medium"]) .course-progress-position-list label,
        :host([data-menu-size="medium"]) .autoplay-options-summary,
        :host([data-menu-size="medium"]) .chapter-limit-progress,
        :host([data-menu-size="medium"]) .bookmark-action,
        :host([data-menu-size="medium"]) .test-choice-heading,
        :host([data-menu-size="medium"]) .test-choice-list label,
        :host([data-menu-size="large"]) .menu-tab,
        :host([data-menu-size="large"]) .course-progress-heading,
        :host([data-menu-size="large"]) .course-progress-message,
        :host([data-menu-size="large"]) .course-progress-options-menu summary,
        :host([data-menu-size="large"]) .course-progress-setting,
        :host([data-menu-size="large"]) .course-progress-position-title,
        :host([data-menu-size="large"]) .course-progress-position-list label,
        :host([data-menu-size="large"]) .autoplay-options-summary,
        :host([data-menu-size="large"]) .chapter-limit-progress,
        :host([data-menu-size="large"]) .bookmark-action,
        :host([data-menu-size="large"]) .test-choice-heading,
        :host([data-menu-size="large"]) .test-choice-list label { font-size: 11px; }
        :host([data-menu-size="large"]) .course-progress-options-menu summary,
        :host([data-menu-size="large"]) .course-progress-setting,
        :host([data-menu-size="large"]) .course-progress-position-title,
        :host([data-menu-size="large"]) .course-progress-position-list label { font-size: 12px; }
        :host([data-menu-size="large"]) .course-progress-options-menu summary small { font-size: 10px; }
        :host([data-menu-size="large"]) .course-progress-hint { font-size: 11px; }
        .commission-section {
          padding-top: 1px;
        }
        .commission-heading {
          margin: 0 0 3px;
          color: var(--sw-heading);
          font-size: 12px;
          font-weight: 800;
        }
        .commission-heading-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .commission-intro {
          margin: 0 0 9px;
          color: var(--sw-muted);
          font-size: 10px;
          line-height: 1.35;
        }
        .commission-list {
          display: grid;
          gap: 8px;
        }
        .commission-empty {
          margin: 9px 0;
          padding: 10px;
          border-radius: 7px;
          color: var(--sw-muted);
          background: var(--sw-empty-bg);
          font-size: 10px;
          line-height: 1.4;
          text-align: center;
        }
        .confirmed-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          width: 100%;
          margin-top: 9px;
          padding: 7px 8px;
          border: 1px solid var(--sw-exam-border);
          border-radius: 7px;
          color: var(--sw-heading);
          background: var(--sw-panel);
          font: inherit;
          font-size: 10px;
          font-weight: 750;
          text-align: left;
          cursor: pointer;
        }
        .confirmed-toggle:hover,
        .confirmed-toggle[aria-expanded="true"] {
          border-color: var(--sw-accent-strong);
          background: var(--sw-accent-soft);
        }
        .confirmed-chevron {
          width: 7px;
          height: 7px;
          margin-right: 2px;
          border-right: 2px solid currentColor;
          border-bottom: 2px solid currentColor;
          transform: rotate(45deg);
          transition: transform 160ms ease;
        }
        .confirmed-toggle[aria-expanded="true"] .confirmed-chevron { transform: rotate(225deg); }
        .loaded-outcome-group { margin-top: 9px; }
        .loaded-outcome-heading {
          margin: 0 0 5px;
          color: var(--sw-muted);
          font-size: 10px;
          font-weight: 750;
          line-height: 1.3;
        }
        .loaded-outcome-heading span { font-weight: 600; }
        .loaded-outcome-group[hidden] { display: none; }
        .confirmed-list { margin-top: 0; }
        .confirmed-toggle[hidden], .confirmed-panel[hidden] { display: none; }
        .exam-card {
          padding: 9px;
          border: 1px solid var(--sw-exam-border);
          border-radius: 8px;
          background: var(--sw-panel);
        }
        .exam-card[data-new="true"] {
          border-color: var(--sw-gold);
          box-shadow: inset 3px 0 0 var(--sw-gold);
        }
        .exam-title {
          color: var(--sw-heading);
          font-size: 11px;
          font-weight: 800;
          line-height: 1.3;
        }
        .exam-meta {
          margin-top: 3px;
          color: var(--sw-muted);
          font-size: 10px;
          line-height: 1.35;
        }
        .commission-verdict {
          display: inline-block;
          margin-top: 6px;
          padding: 3px 6px;
          border-radius: 999px;
          color: var(--sw-warning-text);
          background: var(--sw-warning-bg);
          font-size: 10px;
          font-weight: 750;
          line-height: 1.3;
        }
        .commission-verdict[data-tone="accepted"] { color: var(--sw-success-text); background: var(--sw-success-bg); }
        .commission-verdict[data-tone="rejected"] { color: var(--sw-danger-text); background: var(--sw-danger-bg); }
        .exam-motivation {
          display: -webkit-box;
          margin-top: 5px;
          overflow: hidden;
          color: var(--sw-danger-text);
          font-size: 10px;
          line-height: 1.35;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
          cursor: pointer;
        }
        .exam-motivation[data-expanded="true"] {
          display: block;
          overflow: visible;
          -webkit-line-clamp: unset;
        }
        .commission-note {
          margin: 9px 0 0;
          color: var(--sw-note-text);
          font-size: 10px;
          line-height: 1.35;
        }
        .actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
          padding-top: 10px;
          border-top: 1px solid var(--sw-divider);
        }
        .action {
          position: relative;
          min-height: 34px;
          padding: 7px 8px;
          border: 1px solid var(--sw-accent-strong);
          border-radius: 7px;
          color: var(--sw-on-accent);
          background: linear-gradient(135deg, var(--sw-action-start), var(--sw-action-end));
          font-size: 11px;
          font-weight: 700;
          line-height: 1.2;
          cursor: pointer;
        }
        .action:hover { background: linear-gradient(135deg, var(--sw-action-hover-start), var(--sw-action-hover-end)); }
        .action.turbo,
        .action.objectives,
        .action.test-collection,
        .action.materials {
          grid-column: 1 / -1;
          color: var(--sw-heading);
          background: var(--sw-accent-soft);
        }
        .action.turbo:hover,
        .action.objectives:hover,
        .action.test-collection:hover,
        .action.materials:hover {
          color: var(--sw-on-accent);
          background: linear-gradient(135deg, var(--sw-action-hover-start), var(--sw-action-hover-end));
        }
        .action.turbo[data-running="true"],
        .action.objectives[data-running="true"] {
          border-color: var(--sw-stop);
          color: var(--sw-on-accent);
          background: var(--sw-stop);
        }
        .action:disabled {
          border-color: var(--sw-disabled-border);
          color: var(--sw-disabled-text);
          background: var(--sw-disabled-bg);
          cursor: wait;
        }
        .gaming-action-label { position: relative; z-index: 1; }
        .gaming-action-sprite { display: none; }
        .gaming-control-sprite { display: none; }
        :host([data-visual-style="gaming"]) .gaming-control-row {
          min-height: 40px;
        }
        :host([data-visual-style="gaming"]) .playback-recovery-legend {
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          gap: 7px;
          min-height: 32px;
          max-width: 100%;
        }
        :host([data-visual-style="gaming"]) .gaming-control-sprite {
          display: block;
          flex: 0 0 64px;
          width: 64px;
          height: 32px;
          background-position: 0 0;
          background-repeat: no-repeat;
          background-size: 600% 100%;
          image-rendering: pixelated;
          pointer-events: none;
        }
        :host([data-visual-style="gaming"]) .autoplay-control-sprite { background-image: url("${actionAutoplayUrl}"); }
        :host([data-visual-style="gaming"]) .playback-recovery-control-sprite { background-image: url("${actionPlaybackRecoveryUrl}"); }
        :host([data-visual-style="gaming"]) .commission-control-sprite { background-image: url("${actionCommissionCheckUrl}"); }
        @media (hover: hover) {
          :host([data-visual-style="gaming"]) .gaming-control-row:hover .gaming-control-sprite:not(.is-playing) {
            animation: control-hover-preview 1600ms steps(5, end) infinite both;
          }
        }
        :host([data-visual-style="gaming"]) .gaming-control-row:focus-within .gaming-control-sprite:not(.is-playing) {
          animation: control-hover-preview 1600ms steps(5, end) infinite both;
        }
        :host([data-visual-style="gaming"]) .gaming-control-sprite.is-playing {
          animation: action-six-frames 1000ms steps(5, end) 1 both;
        }
        :host([data-visual-style="gaming"]) .action.has-gaming-art {
          min-height: 40px;
          padding-left: 104px;
        }
        :host([data-visual-style="gaming"]) .action.gaming-art-compact { padding-left: 72px; }
        :host([data-visual-style="gaming"]) .gaming-action-sprite {
          position: absolute;
          z-index: 0;
          top: 4px;
          left: 4px;
          display: block;
          width: 96px;
          height: 32px;
          background-position: 0 0;
          background-repeat: no-repeat;
          background-size: 1100% 100%;
          image-rendering: pixelated;
          pointer-events: none;
        }
        :host([data-visual-style="gaming"]) .objectives-sprite {
          background-image: url("${actionObjectivesUrl}");
        }
        :host([data-visual-style="gaming"]) .gaming-art-compact .gaming-action-sprite {
          width: 64px;
          background-size: 600% 100%;
        }
        :host([data-visual-style="gaming"]) .turbo-tests-sprite { background-image: url("${actionAutoTestsUrl}"); }
        :host([data-visual-style="gaming"]) .test-collection-sprite { background-image: url("${actionTestCollectionUrl}"); }
        :host([data-visual-style="gaming"]) .materials-sprite { background-image: url("${actionStudyMaterialsUrl}"); }
        @media (hover: hover) {
          :host([data-visual-style="gaming"]) .action:not(:disabled):not([data-running="true"]):hover .objectives-sprite:not(.is-playing) {
            animation: objectives-hover-preview 1600ms steps(10, end) infinite both;
          }
          :host([data-visual-style="gaming"]) .action:not(:disabled):not([data-running="true"]):hover .turbo-tests-sprite:not(.is-playing) {
            animation: auto-tests-hover-preview 1500ms steps(5, end) infinite both;
          }
          :host([data-visual-style="gaming"]) .action:not(:disabled):hover .test-collection-sprite:not(.is-playing),
          :host([data-visual-style="gaming"]) .action:not(:disabled):hover .materials-sprite:not(.is-playing) {
            animation: action-hover-preview 1700ms steps(5, end) infinite both;
          }
        }
        :host([data-visual-style="gaming"]) .action:not(:disabled):not([data-running="true"]):focus-visible .objectives-sprite:not(.is-playing) {
          animation: objectives-hover-preview 1600ms steps(10, end) infinite both;
        }
        :host([data-visual-style="gaming"]) .action:not(:disabled):not([data-running="true"]):focus-visible .turbo-tests-sprite:not(.is-playing) {
          animation: auto-tests-hover-preview 1500ms steps(5, end) infinite both;
        }
        :host([data-visual-style="gaming"]) .action:not(:disabled):focus-visible .test-collection-sprite:not(.is-playing),
        :host([data-visual-style="gaming"]) .action:not(:disabled):focus-visible .materials-sprite:not(.is-playing) {
          animation: action-hover-preview 1700ms steps(5, end) infinite both;
        }
        :host([data-visual-style="gaming"]) .objectives-sprite.is-playing {
          animation: objectives-arrow 1000ms steps(10, end) 1 both;
        }
        :host([data-visual-style="gaming"]) .turbo-tests-sprite.is-playing {
          animation: action-six-frames 1000ms steps(5, end) 1 both;
        }
        :host([data-visual-style="gaming"]) .test-collection-sprite.is-playing,
        :host([data-visual-style="gaming"]) .materials-sprite.is-playing {
          animation: action-six-frames 1200ms steps(5, end) 1 both;
        }
        .status {
          margin: 8px 0 0;
          color: var(--sw-accent);
          font-size: 10px;
          font-weight: 650;
          line-height: 1.35;
        }
        .status:empty { display: none; }
        .status[data-error="true"] { color: var(--sw-danger-text); }
        .last-notification {
          margin: 0 10px 9px;
          padding: 9px 32px 9px 10px;
          position: relative;
          border: 1px solid var(--sw-border);
          border-left: 3px solid var(--sw-accent);
          border-radius: 9px;
          background: var(--sw-elevated);
        }
        .last-notification[data-level="success"] { border-left-color: var(--sw-success-text); }
        .last-notification[data-level="warning"] { border-left-color: var(--sw-warning-text); }
        .last-notification[data-level="error"] { border-left-color: var(--sw-danger-text); }
        .last-notification-heading {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 4px;
          color: var(--sw-heading);
          font-size: 10px;
          font-weight: 750;
        }
        .last-notification-time { color: var(--sw-muted); font-weight: 550; }
        .last-notification-text {
          display: -webkit-box;
          margin: 0;
          overflow: hidden;
          color: var(--sw-control-text);
          font-size: 10px;
          line-height: 1.4;
          white-space: pre-line;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          cursor: pointer;
        }
        .last-notification[data-expanded="true"] .last-notification-text {
          display: block;
          overflow: visible;
          -webkit-line-clamp: unset;
        }
        :host([data-menu-size="medium"]) .commission-intro,
        :host([data-menu-size="medium"]) .commission-note,
        :host([data-menu-size="medium"]) .course-progress-message,
        :host([data-menu-size="medium"]) .chapter-limit-progress,
        :host([data-menu-size="medium"]) .commission-empty,
        :host([data-menu-size="medium"]) .confirmed-toggle,
        :host([data-menu-size="medium"]) .loaded-outcome-heading,
        :host([data-menu-size="medium"]) .exam-meta,
        :host([data-menu-size="medium"]) .commission-verdict,
        :host([data-menu-size="medium"]) .exam-motivation,
        :host([data-menu-size="medium"]) .status,
        :host([data-menu-size="medium"]) .last-notification-text { font-size: 11px; }
        :host([data-menu-size="large"]) .commission-intro,
        :host([data-menu-size="large"]) .commission-note,
        :host([data-menu-size="large"]) .course-progress-heading,
        :host([data-menu-size="large"]) .course-progress-message,
        :host([data-menu-size="large"]) .chapter-limit-progress,
        :host([data-menu-size="large"]) .commission-empty,
        :host([data-menu-size="large"]) .confirmed-toggle,
        :host([data-menu-size="large"]) .loaded-outcome-heading,
        :host([data-menu-size="large"]) .exam-meta,
        :host([data-menu-size="large"]) .commission-verdict,
        :host([data-menu-size="large"]) .exam-motivation,
        :host([data-menu-size="large"]) .status,
        :host([data-menu-size="large"]) .last-notification-text { font-size: 12px; }
        :host([data-menu-size="medium"]) .commission-heading { font-size: 13px; }
        :host([data-menu-size="large"]) .commission-heading { font-size: 14px; }
        :host([data-menu-size="medium"]) .exam-title { font-size: 12px; }
        :host([data-menu-size="large"]) .exam-title { font-size: 13px; }
        .last-notification-dismiss {
          position: absolute;
          top: 5px;
          right: 5px;
          width: 25px;
          height: 25px;
          padding: 0;
          border: 0;
          border-radius: 6px;
          color: var(--sw-muted);
          background: transparent;
          font-size: 17px;
          line-height: 25px;
          cursor: pointer;
        }
        .last-notification-dismiss:hover { color: var(--sw-danger-text); background: var(--sw-danger-bg); }
        .hide-menu {
          display: block;
          width: 100%;
          margin-top: 8px;
          padding: 5px;
          border: 0;
          color: var(--sw-muted);
          background: transparent;
          font-size: 10px;
          text-decoration: underline;
          cursor: pointer;
        }
        .hide-menu:hover { color: var(--sw-accent-strong); }

        /* Gaming pixel frames: static CSS only, with unclipped focus outlines. */
        :host([data-visual-style="gaming"]) {
          --sw-pixel-outline: #15111f;
          --sw-pixel-edge: #7043b4;
          --sw-pixel-highlight: #d8c4ff;
          --sw-pixel-shadow: rgb(21 17 31 / 34%);
        }
        :host([data-visual-style="gaming"][data-studywing-theme="dark"]) {
          --sw-pixel-outline: #0c0912;
          --sw-pixel-edge: #9b6ad6;
          --sw-pixel-highlight: #d8c4ff;
          --sw-pixel-shadow: rgb(0 0 0 / 52%);
        }
        :host([data-visual-style="gaming"]) .panel {
          border: 2px solid var(--sw-pixel-outline);
          border-radius: 0;
          box-shadow:
            inset 0 0 0 1px var(--sw-pixel-edge),
            inset 0 0 0 3px rgb(216 196 255 / 48%),
            4px 4px 0 var(--sw-pixel-shadow),
            0 18px 48px var(--sw-panel-shadow);
        }
        :host([data-visual-style="gaming"]) .body {
          margin: 0 3px 3px;
        }
        :host([data-visual-style="gaming"]) .header {
          border-bottom: 2px solid var(--sw-pixel-outline);
          box-shadow: inset 0 -1px 0 var(--sw-pixel-edge);
        }
        :host([data-visual-style="gaming"]) .menu-tabs,
        :host([data-visual-style="gaming"]) .course-progress,
        :host([data-visual-style="gaming"]) .exam-card,
        :host([data-visual-style="gaming"]) .last-notification {
          border: 2px solid var(--sw-pixel-outline);
          border-radius: 0;
          box-shadow:
            inset 0 0 0 1px var(--sw-pixel-edge),
            2px 2px 0 var(--sw-pixel-shadow);
        }
        :host([data-visual-style="gaming"]) .preference-group {
          border: 1px solid var(--sw-pixel-edge);
          border-left: 3px solid var(--sw-gold-border);
          border-radius: 0;
          background: var(--sw-elevated);
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sw-pixel-highlight) 32%, transparent);
        }
        :host([data-visual-style="gaming"]) .last-notification[data-level="success"] { border-left-color: var(--sw-success-text); }
        :host([data-visual-style="gaming"]) .last-notification[data-level="warning"] { border-left-color: var(--sw-warning-text); }
        :host([data-visual-style="gaming"]) .last-notification[data-level="error"] { border-left-color: var(--sw-danger-text); }
        :host([data-visual-style="gaming"]) .menu-tab,
        :host([data-visual-style="gaming"]) .action,
        :host([data-visual-style="gaming"]) .bookmark-action,
        :host([data-visual-style="gaming"]) .autoplay-options-toggle,
        :host([data-visual-style="gaming"]) .confirmed-toggle,
        :host([data-visual-style="gaming"]) .chapter-limit-stepper,
        :host([data-visual-style="gaming"]) .close {
          border-radius: 0;
        }
        :host([data-visual-style="gaming"]) .menu-tab {
          border: 1px solid transparent;
        }
        :host([data-visual-style="gaming"]) .menu-tab[aria-selected="true"] {
          border-color: var(--sw-pixel-outline);
          box-shadow:
            inset 0 0 0 1px var(--sw-gold),
            2px 2px 0 var(--sw-pixel-shadow);
        }
        :host([data-visual-style="gaming"]) .action,
        :host([data-visual-style="gaming"]) .bookmark-action,
        :host([data-visual-style="gaming"]) .confirmed-toggle {
          border: 2px solid var(--sw-pixel-outline);
          box-shadow:
            inset 0 0 0 1px var(--sw-pixel-edge),
            2px 2px 0 var(--sw-pixel-shadow);
        }
        :host([data-visual-style="gaming"]) .action:hover,
        :host([data-visual-style="gaming"]) .bookmark-action:hover,
        :host([data-visual-style="gaming"]) .confirmed-toggle:hover,
        :host([data-visual-style="gaming"]) .confirmed-toggle[aria-expanded="true"] {
          box-shadow:
            inset 0 0 0 1px var(--sw-gold),
            3px 3px 0 var(--sw-pixel-shadow);
        }
        :host([data-visual-style="gaming"]) .action:active,
        :host([data-visual-style="gaming"]) .bookmark-action:active,
        :host([data-visual-style="gaming"]) .confirmed-toggle:active {
          transform: translate(1px, 1px);
          box-shadow: inset 0 0 0 1px var(--sw-gold);
        }
        :host([data-visual-style="gaming"]) .action:disabled,
        :host([data-visual-style="gaming"]) .bookmark-action:disabled {
          border-color: var(--sw-disabled-border);
          box-shadow: inset 0 0 0 1px var(--sw-border);
        }
        :host([data-visual-style="gaming"]) .autoplay-options-toggle,
        :host([data-visual-style="gaming"]) .chapter-limit-stepper,
        :host([data-visual-style="gaming"]) .close {
          border-color: var(--sw-pixel-outline);
          box-shadow: inset 0 0 0 1px var(--sw-pixel-edge);
        }
        :host([data-visual-style="gaming"]) .menu-tab-badge,
        :host([data-visual-style="gaming"]) .commission-verdict,
        :host([data-visual-style="gaming"]) .status {
          border-radius: 1px;
        }
      </style>
      <button class="launcher" type="button" aria-label="Apri PlumePilot; trascina per spostare l’icona lungo il bordo" aria-expanded="false" aria-controls="studywing-panel" title="Clicca per aprire PlumePilot · Trascina per spostare">
        <img class="launcher-standard" src="${iconUrl}" alt="" draggable="false">
        <span class="launcher-mascot" aria-hidden="true"></span>
        <span class="launcher-cosmetic-frame" aria-hidden="true"></span>
      </button>
      <span class="notification-badge" aria-hidden="true" data-overflow="false" hidden>
        <span class="notification-alert-sprite"></span>
        <span class="notification-badge-text" data-role="notification-badge-text">!</span>
      </span>
      <section id="studywing-panel" class="panel" aria-label="Menu PlumePilot" hidden>
        <div class="header">
          <span class="header-logo" aria-hidden="true">
            <img class="header-logo-standard" src="${iconUrl}" alt="">
            <span class="header-logo-gaming"></span>
          </span>
          <div class="identity">
            <div class="name">PlumePilot</div>
            <div class="subtitle">Assistente per la piattaforma Pegaso</div>
            <div class="state" data-role="state"></div>
          </div>
          <button class="close" type="button" aria-label="Riduci il menu" title="Riduci">−</button>
        </div>
        <div class="body">
          <nav class="menu-tabs" data-count="4" role="tablist" aria-label="Sezioni del menu PlumePilot">
            <button id="studywing-course-tab" class="menu-tab" data-tab="course" type="button" role="tab" aria-selected="true" aria-controls="studywing-course-panel">Corso</button>
            <button id="studywing-exams-tab" class="menu-tab" data-tab="exams" type="button" role="tab" aria-selected="false" aria-controls="studywing-exams-panel" tabindex="-1">
              <span>Esami</span><span class="menu-tab-badge" data-role="exams-tab-badge" hidden>!</span>
            </button>
            <button id="studywing-achievements-tab" class="menu-tab" data-tab="achievements" type="button" role="tab" aria-selected="false" aria-controls="studywing-achievements-panel" tabindex="-1">Traguardi</button>
            <button id="studywing-preferences-tab" class="menu-tab" data-tab="preferences" type="button" role="tab" aria-selected="false" aria-controls="studywing-preferences-panel" tabindex="-1">Preferenze</button>
          </nav>
          <section class="last-notification" data-role="last-notification" data-expanded="false" aria-label="Ultimo messaggio di PlumePilot" hidden>
            <div class="last-notification-heading"><span>Ultimo messaggio</span><time class="last-notification-time" data-role="last-notification-time"></time></div>
            <p class="last-notification-text" data-role="last-notification-text" tabindex="0" role="button" aria-label="Mostra o nascondi il messaggio completo"></p>
            <button class="last-notification-dismiss" data-action="dismiss-last-notification" type="button" aria-label="Elimina definitivamente l’ultimo messaggio" title="Elimina messaggio">×</button>
          </section>
          <div id="studywing-course-panel" class="menu-tab-panel" data-role="course-panel" role="tabpanel" aria-labelledby="studywing-course-tab">
            <div data-role="course-tools">
            <section class="course-progress" data-role="course-progress" aria-label="Progresso del corso">
              <div class="course-progress-heading"><span>Progresso del corso</span><strong class="course-progress-value" data-role="course-progress-value">—</strong></div>
              <div class="course-progress-track" data-role="course-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuetext="Progresso non disponibile"><span class="course-progress-inner"><span class="course-progress-fill" data-role="course-progress-fill"></span></span><span class="course-progress-threshold" data-role="course-progress-threshold" title="Soglia del 70%" hidden></span></div>
              <p class="course-progress-message" data-role="course-progress-message">Progresso disponibile dopo il caricamento del corso.</p>
              <details class="course-progress-options-menu">
                <summary><span>Opzioni progresso</span><small data-role="course-progress-options-summary">Disattivate</small><span class="course-progress-options-chevron" aria-hidden="true"></span></summary>
                <div class="course-progress-settings">
                  <label class="course-progress-setting"><span>Barra sullo schermo</span><input data-setting="course-progress-overlay-enabled" type="checkbox"></label>
                  <div class="course-progress-position" data-role="course-progress-position" data-disabled="true">
                    <div class="course-progress-position-title">Posizione</div>
                    <div class="course-progress-position-list">
                      <label><input type="radio" name="studywing-course-progress-position" value="top"> <span>Sopra</span></label>
                      <label><input type="radio" name="studywing-course-progress-position" value="bottom"> <span>Sotto</span></label>
                      <label><input type="radio" name="studywing-course-progress-position" value="left"> <span>Sinistra</span></label>
                      <label><input type="radio" name="studywing-course-progress-position" value="right"> <span>Destra</span></label>
                    </div>
                  </div>
                  <label class="course-progress-setting"><span>Avvisami al 70%</span><input data-setting="course-progress-threshold-enabled" type="checkbox"></label>
                  <p class="course-progress-hint">L’avviso funziona anche senza la barra sullo schermo.</p>
                </div>
              </details>
            </section>
            <label class="setting gaming-control-row"><span>Avanzamento automatico</span><span class="gaming-control-sprite autoplay-control-sprite" data-role="autoplay-control-sprite" aria-hidden="true"></span><input data-setting="enabled" type="checkbox"></label>
            <button class="autoplay-options-toggle" data-action="toggle-autoplay-options" type="button" aria-controls="studywing-autoplay-options" aria-expanded="false">
              <span class="autoplay-options-label">
                <span class="autoplay-options-title">Opzioni autoplay</span>
                <span class="autoplay-options-summary" data-role="autoplay-options-summary"></span>
              </span>
              <span class="autoplay-options-chevron" aria-hidden="true"></span>
            </button>
            <div id="studywing-autoplay-options" class="autoplay-options-shell" data-expanded="false" aria-hidden="true">
              <div class="autoplay-options-overflow">
                <div class="autoplay-options-content" data-role="autoplay-options-content">
                  <button class="bookmark-action" data-action="find-first-incomplete" type="button">Trova prima attività incompleta</button>
                  <div class="test-choice-heading">Quando raggiunge un test</div>
                  <div class="test-choice-list">
                    <label><input type="radio" name="studywing-test-behavior" value="ignore"> <span>Ignora e continua</span></label>
                    <label><input type="radio" name="studywing-test-behavior" value="stop"> <span>Fermati</span></label>
                    <label><input type="radio" name="studywing-test-behavior" value="complete"> <span>Completa automaticamente</span></label>
                  </div>
                  <div class="chapter-limit">
                    <label class="chapter-limit-row"><span>Limite sessione autoplay</span><input data-setting="chapter-limit-enabled" type="checkbox"></label>
                    <div class="chapter-limit-stepper">
                      <button data-action="chapter-limit-minus" type="button" aria-label="Riduci il limite">−</button>
                      <output data-role="chapter-limit-value">1</output>
                      <button data-action="chapter-limit-plus" type="button" aria-label="Aumenta il limite">+</button>
                    </div>
                    <p class="chapter-limit-progress" data-role="chapter-limit-progress"></p>
                    <button class="bookmark-action" data-action="chapter-limit-resume" type="button" hidden>Riprendi sessione</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="actions">
              <button class="action turbo has-gaming-art gaming-art-compact" data-action="turbo" type="button"><span class="gaming-action-sprite turbo-tests-sprite" aria-hidden="true"></span><span class="gaming-action-label" data-role="turbo-label">Completa tutti i test</span></button>
              <button class="action objectives has-gaming-art" data-action="objectives" type="button"><span class="gaming-action-sprite objectives-sprite" aria-hidden="true"></span><span class="gaming-action-label" data-role="objectives-label">Completa tutti gli Obiettivi</span></button>
              <button class="action test-collection has-gaming-art gaming-art-compact" data-action="test-collection" type="button"><span class="gaming-action-sprite test-collection-sprite" aria-hidden="true"></span><span class="gaming-action-label" data-role="test-collection-label">Crea raccolta test</span></button>
              <button class="action materials has-gaming-art gaming-art-compact" data-action="materials" type="button"><span class="gaming-action-sprite materials-sprite" aria-hidden="true"></span><span class="gaming-action-label" data-role="materials-label">Esporta dispense del corso</span></button>
            </div>
            <p class="status" data-role="status" data-error="false" aria-live="polite"></p>
            </div>
          </div>
          <div id="studywing-exams-panel" class="menu-tab-panel" data-role="exams-panel" role="tabpanel" aria-labelledby="studywing-exams-tab" hidden>
            <section class="commission-section" data-role="commission-section" hidden>
              <div class="commission-heading-row gaming-control-row"><h2 class="commission-heading">Stato della commissione</h2><span class="gaming-control-sprite commission-control-sprite" data-role="commission-control-sprite" aria-hidden="true"></span></div>
              <p class="commission-intro">Controllo automatico ogni 10 minuti mentre una pagina Pegaso è visibile. Gli esami restano qui durante la valutazione; gli esiti caricati da Pegaso sono raccolti nel sottomenù.</p>
              <div class="commission-empty" data-role="commission-empty">Nessun esame da mostrare. Il controllo partirà quando l’autenticazione della pagina Pegaso sarà disponibile.</div>
              <div class="commission-list" data-role="commission-list"></div>
              <button class="confirmed-toggle" data-action="toggle-confirmed" type="button" aria-expanded="false" aria-controls="studywing-confirmed-exams" hidden>
                <span data-role="confirmed-label">Esiti caricati</span>
                <span class="confirmed-chevron" aria-hidden="true"></span>
              </button>
              <div id="studywing-confirmed-exams" class="confirmed-panel" hidden>
                <section class="loaded-outcome-group" data-role="loaded-passed-group" hidden>
                  <h3 class="loaded-outcome-heading">Superati <span data-role="loaded-passed-count"></span></h3>
                  <div class="commission-list confirmed-list" data-role="loaded-passed-list"></div>
                </section>
                <section class="loaded-outcome-group" data-role="loaded-failed-group" hidden>
                  <h3 class="loaded-outcome-heading">Non superati <span data-role="loaded-failed-count"></span></h3>
                  <div class="commission-list confirmed-list" data-role="loaded-failed-list"></div>
                </section>
                <section class="loaded-outcome-group" data-role="loaded-other-group" hidden>
                  <h3 class="loaded-outcome-heading">Altri esiti <span data-role="loaded-other-count"></span></h3>
                  <div class="commission-list confirmed-list" data-role="loaded-other-list"></div>
                </section>
              </div>
              <p class="commission-note">L’elenco principale mostra gli esami il cui esito non è ancora stato caricato da Pegaso.</p>
            </section>
          </div>
          <div id="studywing-achievements-panel" class="menu-tab-panel achievements-panel" data-role="achievements-panel" role="tabpanel" aria-labelledby="studywing-achievements-tab" hidden>
            <div class="achievement-level"><strong data-role="achievement-level">Livello 1 · 0 EXP</strong><span data-role="achievement-progress-text">0 / 100 EXP</span></div>
            <div class="achievement-list" data-role="achievement-list"></div>
            <details class="rewards-menu"><summary><span>Ricompense</span><small data-role="rewards-summary">2 di 12</small></summary><div class="reward-list" data-role="reward-list"></div></details>
            <div class="achievement-footer"><div class="achievement-progress" data-role="achievement-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="achievement-progress-fill" data-role="achievement-progress-fill"></span><span class="achievement-mid-marker" data-role="achievement-mid-marker" title="Premio stile barra"></span><span class="achievement-end-marker" data-role="achievement-end-marker" title="Premio stile launcher"></span></div></div>
          </div>
          <div id="studywing-preferences-panel" class="menu-tab-panel preferences-panel" data-role="preferences-panel" role="tabpanel" aria-labelledby="studywing-preferences-tab" hidden>
            <section class="preferences-section" aria-labelledby="studywing-interface-preferences-heading">
              <h2 id="studywing-interface-preferences-heading" class="preferences-heading">Interfaccia</h2>
              <fieldset class="preference-group" aria-labelledby="studywing-floating-visual-style-heading">
                <div id="studywing-floating-visual-style-heading" class="preference-group-heading">Stile visivo</div>
                <div class="preference-options" data-columns="2">
                  <label><input type="radio" name="studywing-visual-style" value="standard"> <span>Standard</span></label>
                  <label><input type="radio" name="studywing-visual-style" value="gaming"> <span>Gaming</span></label>
                </div>
                <p class="preference-hint">Lo stile Gaming è solo estetico e può essere combinato con ogni tema.</p>
              </fieldset>
              <fieldset class="preference-group" aria-labelledby="studywing-floating-theme-heading">
                <div id="studywing-floating-theme-heading" class="preference-group-heading">Tema</div>
                <div class="preference-options" data-columns="3">
                  <label><input type="radio" name="studywing-theme-preference" value="system"> <span>Sistema</span></label>
                  <label><input type="radio" name="studywing-theme-preference" value="light"> <span>Chiaro</span></label>
                  <label><input type="radio" name="studywing-theme-preference" value="dark"> <span>Scuro</span></label>
                </div>
                <p class="preference-hint">“Sistema” segue il tema indicato dal browser.</p>
              </fieldset>
              <fieldset class="preference-group" aria-labelledby="studywing-floating-menu-size-heading">
                <div id="studywing-floating-menu-size-heading" class="preference-group-heading">Dimensione menu</div>
                <div class="preference-options" data-columns="3">
                  <label><input type="radio" name="studywing-menu-size" value="small"> <span>Piccolo</span></label>
                  <label><input type="radio" name="studywing-menu-size" value="medium"> <span>Medio</span></label>
                  <label><input type="radio" name="studywing-menu-size" value="large"> <span>Grande</span></label>
                </div>
                <p class="preference-hint">Regola larghezza e leggibilità di entrambi i menu.</p>
              </fieldset>
            </section>
            <section class="preferences-section" aria-labelledby="studywing-behavior-preferences-heading">
              <h2 id="studywing-behavior-preferences-heading" class="preferences-heading">Comportamento</h2>
              <fieldset class="preference-group" aria-labelledby="studywing-floating-playback-recovery-heading">
                <div id="studywing-floating-playback-recovery-heading" class="preference-group-heading gaming-control-row playback-recovery-legend"><span>Errori di riproduzione</span><span class="gaming-control-sprite playback-recovery-control-sprite" data-role="playback-recovery-control-sprite" aria-hidden="true"></span></div>
                <div class="preference-options">
                  <label><input type="radio" name="studywing-playback-error-recovery" value="automatic"> <span>Tenta il ripristino automatico</span></label>
                  <label><input type="radio" name="studywing-playback-error-recovery" value="manual"> <span>Lascia aperto l’avviso</span></label>
                </div>
              </fieldset>
            </section>
          </div>
          <button class="hide-menu" data-action="hide" type="button">Nascondi il menu dalla pagina</button>
        </div>
      </section>`;

    document.documentElement.appendChild(host);
    ui = {
      launcher: shadow.querySelector(".launcher"),
      panel: shadow.querySelector(".panel"),
      notificationBadge: shadow.querySelector(".notification-badge"),
      notificationBadgeText: shadow.querySelector(
        '[data-role="notification-badge-text"]',
      ),
      close: shadow.querySelector(".close"),
      tabList: shadow.querySelector(".menu-tabs"),
      courseTab: shadow.querySelector('[data-tab="course"]'),
      examsTab: shadow.querySelector('[data-tab="exams"]'),
      achievementsTab: shadow.querySelector('[data-tab="achievements"]'),
      preferencesTab: shadow.querySelector('[data-tab="preferences"]'),
      examsTabBadge: shadow.querySelector('[data-role="exams-tab-badge"]'),
      coursePanel: shadow.querySelector('[data-role="course-panel"]'),
      examsPanel: shadow.querySelector('[data-role="exams-panel"]'),
      achievementsPanel: shadow.querySelector(
        '[data-role="achievements-panel"]',
      ),
      achievementLevel: shadow.querySelector('[data-role="achievement-level"]'),
      achievementProgressText: shadow.querySelector(
        '[data-role="achievement-progress-text"]',
      ),
      achievementProgress: shadow.querySelector(
        '[data-role="achievement-progress"]',
      ),
      achievementProgressFill: shadow.querySelector(
        '[data-role="achievement-progress-fill"]',
      ),
      achievementMidMarker: shadow.querySelector(
        '[data-role="achievement-mid-marker"]',
      ),
      achievementEndMarker: shadow.querySelector(
        '[data-role="achievement-end-marker"]',
      ),
      achievementList: shadow.querySelector('[data-role="achievement-list"]'),
      rewardsSummary: shadow.querySelector('[data-role="rewards-summary"]'),
      rewardList: shadow.querySelector('[data-role="reward-list"]'),
      preferencesPanel: shadow.querySelector('[data-role="preferences-panel"]'),
      visualStyleRadios: [
        ...shadow.querySelectorAll('input[name="studywing-visual-style"]'),
      ],
      themePreferenceRadios: [
        ...shadow.querySelectorAll('input[name="studywing-theme-preference"]'),
      ],
      menuSizeRadios: [
        ...shadow.querySelectorAll('input[name="studywing-menu-size"]'),
      ],
      playbackErrorRecoveryRadios: [
        ...shadow.querySelectorAll(
          'input[name="studywing-playback-error-recovery"]',
        ),
      ],
      state: shadow.querySelector('[data-role="state"]'),
      status: shadow.querySelector('[data-role="status"]'),
      lastNotification: shadow.querySelector('[data-role="last-notification"]'),
      lastNotificationText: shadow.querySelector(
        '[data-role="last-notification-text"]',
      ),
      lastNotificationTime: shadow.querySelector(
        '[data-role="last-notification-time"]',
      ),
      dismissLastNotification: shadow.querySelector(
        '[data-action="dismiss-last-notification"]',
      ),
      courseProgress: shadow.querySelector('[data-role="course-progress"]'),
      courseProgressValue: shadow.querySelector(
        '[data-role="course-progress-value"]',
      ),
      courseProgressBar: shadow.querySelector(
        '[data-role="course-progress-bar"]',
      ),
      courseProgressFill: shadow.querySelector(
        '[data-role="course-progress-fill"]',
      ),
      courseProgressThreshold: shadow.querySelector(
        '[data-role="course-progress-threshold"]',
      ),
      courseProgressMessage: shadow.querySelector(
        '[data-role="course-progress-message"]',
      ),
      courseProgressOverlayEnabled: shadow.querySelector(
        '[data-setting="course-progress-overlay-enabled"]',
      ),
      courseProgressPosition: shadow.querySelector(
        '[data-role="course-progress-position"]',
      ),
      courseProgressPositionRadios: [
        ...shadow.querySelectorAll(
          'input[name="studywing-course-progress-position"]',
        ),
      ],
      courseProgressThresholdEnabled: shadow.querySelector(
        '[data-setting="course-progress-threshold-enabled"]',
      ),
      courseProgressOptionsSummary: shadow.querySelector(
        '[data-role="course-progress-options-summary"]',
      ),
      enabled: shadow.querySelector('[data-setting="enabled"]'),
      autoplayControlSprite: shadow.querySelector(
        '[data-role="autoplay-control-sprite"]',
      ),
      playbackRecoveryControlSprite: shadow.querySelector(
        '[data-role="playback-recovery-control-sprite"]',
      ),
      commissionControlSprite: shadow.querySelector(
        '[data-role="commission-control-sprite"]',
      ),
      findFirstIncomplete: shadow.querySelector(
        '[data-action="find-first-incomplete"]',
      ),
      autoplayOptionsButton: shadow.querySelector(
        '[data-action="toggle-autoplay-options"]',
      ),
      autoplayOptionsShell: shadow.querySelector("#studywing-autoplay-options"),
      autoplayOptionsContent: shadow.querySelector(
        '[data-role="autoplay-options-content"]',
      ),
      autoplayOptionsSummary: shadow.querySelector(
        '[data-role="autoplay-options-summary"]',
      ),
      testBehaviorRadios: [
        ...shadow.querySelectorAll('input[name="studywing-test-behavior"]'),
      ],
      chapterLimitEnabled: shadow.querySelector(
        '[data-setting="chapter-limit-enabled"]',
      ),
      chapterLimitMinus: shadow.querySelector(
        '[data-action="chapter-limit-minus"]',
      ),
      chapterLimitPlus: shadow.querySelector(
        '[data-action="chapter-limit-plus"]',
      ),
      chapterLimitValue: shadow.querySelector(
        '[data-role="chapter-limit-value"]',
      ),
      chapterLimitProgress: shadow.querySelector(
        '[data-role="chapter-limit-progress"]',
      ),
      chapterLimitResume: shadow.querySelector(
        '[data-action="chapter-limit-resume"]',
      ),
      courseTools: shadow.querySelector('[data-role="course-tools"]'),
      commissionSection: shadow.querySelector(
        '[data-role="commission-section"]',
      ),
      commissionEmpty: shadow.querySelector('[data-role="commission-empty"]'),
      commissionList: shadow.querySelector('[data-role="commission-list"]'),
      confirmedToggle: shadow.querySelector('[data-action="toggle-confirmed"]'),
      confirmedLabel: shadow.querySelector('[data-role="confirmed-label"]'),
      confirmedPanel: shadow.querySelector("#studywing-confirmed-exams"),
      loadedPassedGroup: shadow.querySelector(
        '[data-role="loaded-passed-group"]',
      ),
      loadedPassedCount: shadow.querySelector(
        '[data-role="loaded-passed-count"]',
      ),
      loadedPassedList: shadow.querySelector(
        '[data-role="loaded-passed-list"]',
      ),
      loadedFailedGroup: shadow.querySelector(
        '[data-role="loaded-failed-group"]',
      ),
      loadedFailedCount: shadow.querySelector(
        '[data-role="loaded-failed-count"]',
      ),
      loadedFailedList: shadow.querySelector(
        '[data-role="loaded-failed-list"]',
      ),
      loadedOtherGroup: shadow.querySelector(
        '[data-role="loaded-other-group"]',
      ),
      loadedOtherCount: shadow.querySelector(
        '[data-role="loaded-other-count"]',
      ),
      loadedOtherList: shadow.querySelector('[data-role="loaded-other-list"]'),
      turbo: shadow.querySelector('[data-action="turbo"]'),
      turboLabel: shadow.querySelector('[data-role="turbo-label"]'),
      turboSprite: shadow.querySelector(".turbo-tests-sprite"),
      objectives: shadow.querySelector('[data-action="objectives"]'),
      objectivesLabel: shadow.querySelector('[data-role="objectives-label"]'),
      objectivesSprite: shadow.querySelector(".objectives-sprite"),
      testCollection: shadow.querySelector('[data-action="test-collection"]'),
      testCollectionLabel: shadow.querySelector(
        '[data-role="test-collection-label"]',
      ),
      testCollectionSprite: shadow.querySelector(".test-collection-sprite"),
      materials: shadow.querySelector('[data-action="materials"]'),
      materialsLabel: shadow.querySelector('[data-role="materials-label"]'),
      materialsSprite: shadow.querySelector(".materials-sprite"),
      hide: shadow.querySelector('[data-action="hide"]'),
    };

    ui.launcher.addEventListener("click", (event) => {
      if (suppressLauncherClick) {
        event.preventDefault();
        return;
      }
      togglePanel();
    });
    ui.launcher.addEventListener("pointerdown", beginLauncherDrag);
    ui.launcher.addEventListener("pointermove", moveLauncher);
    ui.launcher.addEventListener("pointerup", endLauncherDrag);
    ui.launcher.addEventListener("pointercancel", endLauncherDrag);
    ui.launcher.addEventListener("animationend", (event) => {
      if (event.animationName === "mascot-idle")
        ui.launcher.classList.remove("mascot-idle-playing");
    });
    for (const sprite of animatedSprites()) {
      sprite.addEventListener("animationend", () =>
        sprite.classList.remove("is-playing"),
      );
    }
    ui.close.addEventListener("click", () => {
      closePanel();
      ui.launcher.focus();
    });
    const toggleLastNotification = () => {
      const expanded = ui.lastNotification.dataset.expanded !== "true";
      ui.lastNotification.dataset.expanded = String(expanded);
    };
    ui.lastNotificationText.addEventListener("click", toggleLastNotification);
    ui.lastNotificationText.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggleLastNotification();
    });
    ui.dismissLastNotification.addEventListener("click", () => {
      lastNotification = null;
      ui.lastNotification.dataset.expanded = "false";
      writeSetting("studywingLastNotification", null);
      renderLastNotification();
    });
    const menuTabs = [
      ui.courseTab,
      ui.examsTab,
      ui.achievementsTab,
      ui.preferencesTab,
    ];
    for (const tab of menuTabs) {
      tab.addEventListener("click", () =>
        selectMenuTab(tab.dataset.tab, { focus: true }),
      );
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
          return;
        const availableTabs = menuTabs.filter((candidate) => !candidate.hidden);
        if (availableTabs.length < 2) return;
        event.preventDefault();
        const currentIndex = availableTabs.indexOf(tab);
        let nextIndex = currentIndex;
        if (event.key === "ArrowLeft")
          nextIndex =
            (currentIndex - 1 + availableTabs.length) % availableTabs.length;
        if (event.key === "ArrowRight")
          nextIndex = (currentIndex + 1) % availableTabs.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = availableTabs.length - 1;
        selectMenuTab(availableTabs[nextIndex].dataset.tab, { focus: true });
      });
    }
    ui.confirmedToggle.addEventListener("click", () => {
      const expanded =
        ui.confirmedToggle.getAttribute("aria-expanded") !== "true";
      ui.confirmedToggle.setAttribute("aria-expanded", String(expanded));
      ui.confirmedPanel.hidden = !expanded;
    });
    for (const radio of ui.visualStyleRadios)
      radio.addEventListener("change", () => {
        if (radio.checked)
          writeSetting("visualStyle", normalizeVisualStyle(radio.value));
      });
    for (const radio of ui.themePreferenceRadios)
      radio.addEventListener("change", () => {
        if (radio.checked)
          writeSetting("themePreference", normalizeTheme(radio.value));
      });
    for (const radio of ui.menuSizeRadios)
      radio.addEventListener("change", () => {
        if (radio.checked)
          writeSetting("menuSize", normalizeMenuSize(radio.value));
      });
    for (const radio of ui.playbackErrorRecoveryRadios)
      radio.addEventListener("change", () => {
        if (!radio.checked) return;
        writeSetting(
          "playbackErrorRecovery",
          radio.value === "manual" ? "manual" : "automatic",
        );
        playActionAnimation(ui.playbackRecoveryControlSprite);
      });
    ui.enabled.addEventListener("change", () => {
      writeSetting("enabled", ui.enabled.checked);
      if (ui.enabled.checked) playActionAnimation(ui.autoplayControlSprite);
      if (ui.enabled.checked) claimFloatingAchievement("discover-autoplay");
    });
    ui.autoplayOptionsButton.addEventListener("click", () => {
      const expanded =
        ui.autoplayOptionsButton.getAttribute("aria-expanded") !== "true";
      ui.autoplayOptionsButton.setAttribute("aria-expanded", String(expanded));
      ui.autoplayOptionsShell.dataset.expanded = String(expanded);
      ui.autoplayOptionsShell.setAttribute("aria-hidden", String(!expanded));
    });
    ui.findFirstIncomplete.addEventListener("click", () => {
      if (ui.findFirstIncomplete.disabled) return;
      ui.findFirstIncomplete.disabled = true;
      setFeedback("Ricerca dall’inizio del corso avviata…");
      window.postMessage(
        {
          type: "PEGASO_FIND_FIRST_INCOMPLETE_REQUEST",
          source: "floating-menu",
        },
        "*",
      );
      setTimeout(renderSettings, 1500);
    });
    for (const radio of ui.testBehaviorRadios)
      radio.addEventListener("change", () => {
        if (!radio.checked) return;
        chrome.storage.local.set({
          stopAtTests: radio.value === "stop",
          autoCompleteTests: radio.value === "complete",
        });
      });
    ui.chapterLimitEnabled.addEventListener("change", () => {
      writeSetting(
        "autoplayChapterLimitEnabled",
        ui.chapterLimitEnabled.checked,
      );
      if (ui.chapterLimitEnabled.checked && currentCourseCode())
        claimFloatingAchievement("configure-autoplay-limit");
    });
    ui.courseProgressOverlayEnabled.addEventListener("change", () => {
      writeSetting(
        "courseProgressOverlayEnabled",
        ui.courseProgressOverlayEnabled.checked,
      );
      if (ui.courseProgressOverlayEnabled.checked)
        claimFloatingAchievement("enable-progress-overlay");
    });
    for (const radio of ui.courseProgressPositionRadios)
      radio.addEventListener("change", () => {
        if (!radio.checked) return;
        writeSetting(
          "courseProgressOverlayPosition",
          normalizedCourseProgressPosition(radio.value),
        );
      });
    ui.courseProgressThresholdEnabled.addEventListener("change", () => {
      writeSetting(
        "courseProgressThresholdEnabled",
        ui.courseProgressThresholdEnabled.checked,
      );
      if (ui.courseProgressThresholdEnabled.checked)
        claimFloatingAchievement("enable-70-advice");
    });
    const changeLimit = (delta) => {
      const currentCode = currentCourseCode();
      const status =
        settings.autoplayChapterLimitStatuses?.[currentCode] || null;
      if (!status?.courseCode) return;
      const limits = { ...(settings.autoplayChapterLimits || {}) };
      limits[status.courseCode] = Math.max(
        1,
        Math.min(status.maximum, (Number(status.limit) || 1) + delta),
      );
      chrome.storage.local.set({ autoplayChapterLimits: limits });
    };
    ui.chapterLimitMinus.addEventListener("click", () => changeLimit(-1));
    ui.chapterLimitPlus.addEventListener("click", () => changeLimit(1));
    ui.chapterLimitResume.addEventListener("click", () => {
      const currentCode = currentCourseCode();
      const status =
        settings.autoplayChapterLimitStatuses?.[currentCode] || null;
      if (!status?.courseCode) return;
      chrome.storage.local.set({
        autoplayChapterLimitSessions: {
          ...(settings.autoplayChapterLimitSessions || {}),
          [status.courseCode]: {
            courseCode: status.courseCode,
            completed: 0,
            reached: false,
            lastChapterKey: "",
          },
        },
      });
    });
    ui.turbo.addEventListener("click", toggleTurboTests);
    ui.objectives.addEventListener("click", toggleObjectives);
    ui.testCollection.addEventListener("click", toggleTestExport);
    ui.materials.addEventListener("click", toggleMaterialsExport);
    ui.hide.addEventListener("click", () =>
      writeSetting(
        isCommissionOnlyPage()
          ? "commissionCheckEnabled"
          : "floatingMenuEnabled",
        false,
      ),
    );

    renderSettings();
    renderCourseProgress();
    renderOperation();
    renderLastNotification();
    renderCommissionExams();
    renderAchievements();
    applyLauncherPosition();
    requestChapterLimitStatus();
    requestCourseProgressStatus();
    scheduleMascotIdle();
  }

  function removeMenu() {
    clearTimeout(feedbackTimer);
    clearTimeout(notificationTimer);
    clearTimeout(mascotIdleTimer);
    mascotIdleTimer = null;
    dragState = null;
    suppressLauncherClick = false;
    host?.remove();
    host = null;
    ui = null;
    lastUnseenAlertSignature = "";
    activeMenuTab = null;
  }

  function applyVisibility() {
    const courseMenu =
      settings.floatingMenuEnabled === true &&
      Boolean(document.querySelector(COURSE_SELECTOR));
    const commissionMenu =
      settings.commissionCheckEnabled === true && isCommissionOnlyPage();
    const shouldShow = courseMenu || commissionMenu;
    if (shouldShow) createMenu();
    else removeMenu();
    if (shouldShow) renderCommissionExams();
  }

  function scheduleVisibilityCheck() {
    clearTimeout(visibilityTimer);
    visibilityTimer = setTimeout(() => {
      applyVisibility();
      renderCourseProgress();
      requestCourseProgressStatus();
    }, 150);
  }

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (
        host &&
        ui &&
        !ui.panel.hidden &&
        !event.composedPath().includes(host)
      )
        closePanel();
    },
    true,
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" && ui && !ui.panel.hidden) {
        closePanel();
        ui.launcher.focus();
      }
    },
    true,
  );

  window.addEventListener("resize", applyLauncherPosition);
  window.addEventListener("popstate", scheduleVisibilityCheck);
  window.addEventListener("hashchange", scheduleVisibilityCheck);

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data) return;
    if (event.data.type === "PEGASO_CHAPTER_LIMIT_STATUS") {
      const status = event.data.status || null;
      const courseCode = String(status?.courseCode || "");
      if (!courseCode) return;
      settings.autoplayChapterLimitStatuses = {
        ...(settings.autoplayChapterLimitStatuses || {}),
        [courseCode]: status,
      };
      if (ui && courseCode === currentCourseCode()) renderSettings();
      return;
    }
    if (event.data.type === "PEGASO_COURSE_PROGRESS_STATUS") {
      const status = event.data.status || null;
      if (String(status?.courseCode || "") !== currentCourseCode()) return;
      courseProgressStatus = status;
      renderCourseProgress();
      return;
    }
    if (event.data.type === "STUDYWING_ACHIEVEMENT_AWARDED") {
      const result = event.data.result || null;
      if (result?.accepted === true) queueProgressOverlayExp(result.awardedExp);
      return;
    }
    if (event.data.type === "STUDYWING_NOTIFICATION_UPDATED") {
      const notification = event.data.notification || null;
      const message = String(notification?.message || "").trim();
      if (!message) return;
      lastNotification = {
        message,
        level: ["success", "warning", "error"].includes(notification.level)
          ? notification.level
          : "info",
        createdAt: Number(notification.createdAt) || Date.now(),
      };
      renderLastNotification();
      return;
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const thresholdWasEnabled =
      settings.courseProgressThresholdEnabled === true;
    for (const key of Object.keys(defaults)) {
      if (changes[key]) settings[key] = changes[key].newValue ?? defaults[key];
    }
    if (changes.floatingMenuEnabled || changes.commissionCheckEnabled)
      scheduleVisibilityCheck();
    if (changes.visualStyle) {
      applyVisualStyle();
      claimEnabledGamingAchievements();
    }
    if (changes.themePreference) applyTheme();
    if (changes.menuSize) applyMenuSize();
    if (
      changes.visualStyle ||
      changes.themePreference ||
      changes.menuSize ||
      changes.playbackErrorRecovery
    )
      renderPreferences();
    if (changes.visualStyle) renderCommissionExams();
    if (changes.studywingAchievements) renderAchievements();
    if (changes.gamingCosmetics) {
      applyCosmetics();
      renderAchievements();
      renderCourseProgress();
      renderCourseProgressOverlay();
    }
    if (changes.floatingMenuPosition && !dragState) applyLauncherPosition();
    if (
      changes.enabled ||
      changes.stopAtTests ||
      changes.autoCompleteTests ||
      changes.autoplayChapterLimitEnabled ||
      changes.autoplayChapterLimits ||
      changes.autoplayChapterLimitSessions ||
      changes.autoplayChapterLimitStatuses
    )
      renderSettings();
    if (
      changes.courseProgressOverlayEnabled ||
      changes.courseProgressOverlayPosition ||
      changes.courseProgressThresholdEnabled
    ) {
      if (
        !thresholdWasEnabled &&
        settings.courseProgressThresholdEnabled === true
      ) {
        silentlyAcknowledgeCurrentThreshold();
      } else if (settings.courseProgressThresholdEnabled !== true) {
        thresholdActivationAwaitingBaseline = false;
      }
      renderSettings();
      renderCourseProgress();
    }
    if (changes.pegasoActiveOperation) renderOperation();
    if (changes.studywingLastNotification) {
      lastNotification = settings.studywingLastNotification || null;
      renderLastNotification();
    }
    if (
      changes.commissionCheckEnabled ||
      changes.commissionExams ||
      changes.commissionUnseenExamIds ||
      changes.commissionExamsCapturedAt
    )
      renderCommissionExams();
  });

  const observer = new MutationObserver(scheduleVisibilityCheck);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  chrome.storage.local.get(defaults, (result) => {
    settings = { ...defaults, ...result };
    lastNotification = settings.studywingLastNotification || null;
    applyVisibility();
    renderCourseProgress();
    requestCourseProgressStatus();
  });

  systemTheme.addEventListener("change", () => {
    if (normalizeTheme(settings.themePreference) === "system") applyTheme();
  });
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
      ui?.launcher.classList.remove("mascot-idle-playing");
      for (const sprite of animatedSprites())
        sprite.classList.remove("is-playing");
    }
    scheduleMascotIdle();
  });
  document.addEventListener("visibilitychange", scheduleMascotIdle);
})();

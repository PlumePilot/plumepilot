(() => {
  "use strict";

  if (globalThis.StudyWingCommissionState) return;

  const STATES = Object.freeze({
    PENDING: "pending",
    ACCEPTED: "accepted",
    REJECTED: "rejected",
    CONFIRMED: "confirmed",
    UNKNOWN: "unknown",
  });

  function normalizedText(value) {
    return typeof value === "string"
      ? value.trim().replace(/\s+/g, " ").toLocaleLowerCase("it-IT")
      : "";
  }

  function nullableText(value) {
    const normalized = normalizedText(value);
    return normalized || null;
  }

  function nullableNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function rejectMotivationText(exam) {
    const value = exam?.reject_motivation;
    const motivation = value && typeof value === "object"
      ? value.motivation
      : value;
    return typeof motivation === "string" ? motivation.trim().replace(/\s+/g, " ") : "";
  }

  function classifyExam(exam) {
    const commission = normalizedText(exam?.commission);
    const result = normalizedText(exam?.result);
    const motivation = normalizedText(rejectMotivationText(exam));

    if (
      motivation ||
      commission.includes("rifiut") ||
      commission.includes("respint") ||
      commission.includes("non accett")
    ) {
      return STATES.REJECTED;
    }
    if (/^confermato(?:-|$)/.test(result)) return STATES.CONFIRMED;
    if (commission === "in attesa" || commission === "attesa") return STATES.PENDING;
    if (commission.includes("accett") || commission.includes("validat")) return STATES.ACCEPTED;
    return STATES.UNKNOWN;
  }

  function createSnapshot(exam) {
    return {
      version: 2,
      state: classifyExam(exam),
      commission: nullableText(exam?.commission),
      result: nullableText(exam?.result),
      reject_motivation: nullableText(rejectMotivationText(exam)),
      vote: nullableNumber(exam?.vote),
      status: nullableNumber(exam?.status),
    };
  }

  function normalizeStoredSnapshot(value, fallbackExam = null) {
    if (fallbackExam && typeof fallbackExam === "object") return createSnapshot(fallbackExam);
    if (value && typeof value === "object" && value.version === 2) {
      return createSnapshot(value);
    }
    if (typeof value !== "string") return null;
    try {
      const legacy = JSON.parse(value);
      return legacy && typeof legacy === "object" ? createSnapshot(legacy) : null;
    } catch {
      return null;
    }
  }

  function snapshotsEqual(first, second) {
    if (!first || !second) return false;
    const keys = ["state", "commission", "result", "reject_motivation", "vote", "status"];
    return keys.every((key) => first[key] === second[key]);
  }

  function isLoadedResult(value) {
    return /^caricato(?:-|$)/.test(normalizedText(value));
  }

  function isLoadedExam(exam) {
    return isLoadedResult(exam?.result);
  }

  function loadedOutcome(exam) {
    const result = normalizedText(exam?.result);
    if (!isLoadedResult(result)) return null;
    if (result.includes("promosso")) return "passed";
    if (result.includes("bocciato")) return "failed";
    return "other";
  }

  function shouldNotifyChange(previous, current) {
    if (!current) return false;
    if (previous && isLoadedResult(current.result) && previous.result !== current.result) {
      return true;
    }
    if ([STATES.PENDING, STATES.CONFIRMED, STATES.UNKNOWN].includes(current.state)) {
      return false;
    }
    if (!previous) return [STATES.ACCEPTED, STATES.REJECTED].includes(current.state);
    return !snapshotsEqual(previous, current);
  }

  function shouldShowExam(exam) {
    return !isLoadedExam(exam);
  }

  function statePresentation(exam) {
    const state = classifyExam(exam);
    if (state === STATES.PENDING) return { state, label: "In attesa", tone: "pending" };
    if (state === STATES.ACCEPTED) return { state, label: "Accettato", tone: "accepted" };
    if (state === STATES.REJECTED) return { state, label: "Rifiutato", tone: "rejected" };
    if (state === STATES.CONFIRMED) return { state, label: "Confermato", tone: "accepted" };
    return { state, label: "Da verificare", tone: "pending" };
  }

  Object.defineProperty(globalThis, "StudyWingCommissionState", {
    value: Object.freeze({
      STATES,
      classifyExam,
      createSnapshot,
      normalizeStoredSnapshot,
      shouldNotifyChange,
      isLoadedExam,
      loadedOutcome,
      shouldShowExam,
      statePresentation,
      rejectMotivationText,
    }),
    configurable: false,
    writable: false,
  });
})();

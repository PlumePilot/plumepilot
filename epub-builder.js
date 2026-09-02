import { buildCourseEpub } from "./epub-core.mjs";

const titleElement = document.getElementById("courseTitle");
const statusElement = document.getElementById("status");
const detailsElement = document.getElementById("details");
const progressBar = document.getElementById("progressBar");
const failuresElement = document.getElementById("failures");
const downloadAgainButton = document.getElementById("downloadAgain");
const cancelBuildButton = document.getElementById("cancelBuild");
const buildController = new AbortController();
let completedDownload = null;
let operationId = null;
let storageKey = null;
let lastOperationMessage = "";
let lastOperationUpdateAt = 0;

function storageGet(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(result[key]);
    });
  });
}

function storageRemove(key) {
  return new Promise((resolve) => {
    chrome.storage.local.remove(key, resolve);
  });
}

function updateOperation(message) {
  if (!operationId) {
    return;
  }

  const now = Date.now();
  if (message === lastOperationMessage && now - lastOperationUpdateAt < 750) {
    return;
  }
  lastOperationMessage = message;
  lastOperationUpdateAt = now;

  chrome.runtime.sendMessage({
    type: "PEGASO_UPDATE_OPERATION",
    operationId,
    patch: {
      phase: "building",
      message,
    },
  });
}
function setProgress(update) {
  statusElement.textContent = update.message;
  if (Number.isFinite(update.percent)) {
    progressBar.style.width = `${Math.min(100, Math.max(0, Math.round(update.percent)))}%`;
  } else if (Number.isFinite(update.completed) && Number.isFinite(update.total)) {
    progressBar.style.width = `${update.total ? Math.round(update.completed / update.total * 100) : 0}%`;
  }
  if (update.details) {
    detailsElement.textContent = update.details;
  } else if (Number.isFinite(update.completed) && Number.isFinite(update.total)) {
    detailsElement.textContent = `${Math.floor(update.completed)} di ${update.total} dispense elaborate`;
  }
  if (update.cancellable === false) {
    cancelBuildButton.disabled = true;
    cancelBuildButton.textContent = "Finalizzazione in corso…";
  }
  updateOperation(update.message);
}
function download(bytes, filename) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/epub+zip" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function showFailures(failures) {
  failuresElement.replaceChildren();
  for (const failure of failures) {
    const item = document.createElement("li");
    item.textContent = `${failure.chapter}: ${failure.reason}`;
    failuresElement.appendChild(item);
  }
}
function invalidateFailedMaterialLinks(failures) {
  const cacheKeys = [
    ...new Set(
      failures
        .map((failure) => failure.cacheKey)
        .filter((cacheKey) => typeof cacheKey === "string" && cacheKey),
    ),
  ];
  if (!operationId || !cacheKeys.length) return Promise.resolve();
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: "PEGASO_INVALIDATE_MATERIAL_CACHE",
        operationId,
        cacheKeys,
      },
      () => resolve(),
    );
  });
}
async function start() {
  const jobId = new URLSearchParams(location.search).get("job");
  if (!jobId) throw new Error("Identificativo dell’operazione EPUB mancante.");
  storageKey = `pegasoExportJob:${jobId}`;
  const job = await storageGet(storageKey);
  if (!job || !job.materials || job.materials.length === 0) {
    throw new Error("Impossibile trovare le dispense raccolte.");
  }
  operationId = job.operationId;
  titleElement.textContent = job.courseTitle;
  document.title = `${job.courseTitle} – Creazione EPUB`;
  const result = await buildCourseEpub(
    job.courseTitle,
    job.materials,
    setProgress,
    {
      generatorVersion: chrome.runtime.getManifest().version,
      signal: buildController.signal,
    },
  );
  const failures = [...(job.missing || []), ...result.failures];
  showFailures(failures);
  await invalidateFailedMaterialLinks(result.failures);
  completedDownload = { bytes: result.bytes, filename: result.filename };
  progressBar.style.width = "100%";
  statusElement.textContent = "EPUB creato con successo.";
  detailsElement.textContent = `${result.included.length} dispense convertite${failures.length ? `; ${failures.length} saltate` : ""}`;
  cancelBuildButton.hidden = true;
  downloadAgainButton.hidden = false;
  download(result.bytes, result.filename);
  await storageRemove(storageKey);
  chrome.runtime.sendMessage({ type: "PEGASO_RELEASE_OPERATION", operationId });
}
cancelBuildButton.addEventListener("click", () => {
  if (buildController.signal.aborted) return;
  cancelBuildButton.disabled = true;
  cancelBuildButton.textContent = "Annullamento in corso…";
  statusElement.textContent = "Interruzione sicura della creazione EPUB…";
  buildController.abort();
});
downloadAgainButton.addEventListener("click", () => {
  if (completedDownload) {
    download(completedDownload.bytes, completedDownload.filename);
  }
});
start().catch(async (error) => {
  console.error("[PlumePilot] EPUB builder failed:", error);
  const cancelled = error?.name === "AbortError";
  statusElement.textContent = cancelled
    ? "Creazione EPUB annullata."
    : "Impossibile creare l’EPUB del corso.";
  detailsElement.textContent = cancelled
    ? "Nessun file incompleto è stato scaricato."
    : error?.message || "Errore sconosciuto";
  progressBar.style.background = cancelled ? "#d99a24" : "#991b1b";
  cancelBuildButton.hidden = true;
  if (storageKey) await storageRemove(storageKey);
  if (operationId) chrome.runtime.sendMessage({ type: "PEGASO_RELEASE_OPERATION", operationId });
});

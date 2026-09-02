import { buildCourseEpub } from "./epub-core.mjs";

const titleElement = document.getElementById("courseTitle");
const summaryElement = document.getElementById("summary");
const statusElement = document.getElementById("status");
const progressElement = document.getElementById("progressBar");
const pdfButton = document.getElementById("downloadPdf");
const epubButton = document.getElementById("downloadEpub");
const cancelButton = document.getElementById("cancelBuild");
const missingCard = document.getElementById("missingCard");
const missingList = document.getElementById("missingList");

let job = null;
let activeOperationId = null;
let buildController = null;
let building = false;
let lastOperationMessage = "";
let lastOperationUpdateAt = 0;

const storageGet = (key) => new Promise((resolve, reject) => {
  chrome.storage.local.get(key, (result) => chrome.runtime.lastError
    ? reject(new Error(chrome.runtime.lastError.message))
    : resolve(result[key]));
});
const storageRemove = (key) => new Promise((resolve) => chrome.storage.local.remove(key, resolve));
const runtimeMessage = (message) => new Promise((resolve) => {
  chrome.runtime.sendMessage(message, (response) => resolve(chrome.runtime.lastError
    ? { accepted: false, reason: chrome.runtime.lastError.message }
    : response));
});

function setBusy(value) {
  building = value;
  pdfButton.disabled = value;
  epubButton.disabled = value;
}

function showFailures(failures) {
  missingList.replaceChildren();
  for (const failure of failures) {
    const item = document.createElement("li");
    item.textContent = `${failure.chapter || "Dispensa"}: ${failure.reason || "non disponibile"}`;
    missingList.appendChild(item);
  }
  missingCard.hidden = failures.length === 0;
}

function updateOperation(message) {
  if (!activeOperationId) return;
  const now = Date.now();
  if (message === lastOperationMessage && now - lastOperationUpdateAt < 750) return;
  lastOperationMessage = message;
  lastOperationUpdateAt = now;
  chrome.runtime.sendMessage({
    type: "PEGASO_UPDATE_OPERATION",
    operationId: activeOperationId,
    patch: { phase: "building", message },
  });
}

function setProgress(update) {
  statusElement.textContent = update.message || "Creazione in corso…";
  let percent = Number(update.percent);
  if (!Number.isFinite(percent) && Number.isFinite(update.completed) && Number.isFinite(update.total)) {
    percent = update.total ? update.completed / update.total * 100 : 0;
  }
  if (Number.isFinite(percent)) progressElement.style.width = `${Math.max(0, Math.min(100, Math.round(percent)))}%`;
  updateOperation(statusElement.textContent);
  if (update.cancellable === false) {
    cancelButton.disabled = true;
    cancelButton.textContent = "Finalizzazione in corso…";
  }
}

function download(bytes, filename, mime) {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function claimExportAchievement() {
  chrome.runtime.sendMessage({ type: "STUDYWING_ACHIEVEMENT_CLAIM", achievementId: "export-materials" }, (result) => {
    if (!chrome.runtime.lastError && result?.accepted) {
      statusElement.textContent += ` Traguardo completato: +${result.awardedExp} EXP.`;
    }
  });
}

async function invalidateFailedLinks(failures) {
  const cacheKeys = [...new Set(failures
    .map((failure) => failure.cacheKey)
    .filter((cacheKey) => typeof cacheKey === "string" && cacheKey))];
  if (!activeOperationId || !cacheKeys.length) return;
  await runtimeMessage({
    type: "PEGASO_INVALIDATE_MATERIAL_CACHE",
    operationId: activeOperationId,
    sourceTabId: job.courseTabId,
    cacheKeys,
  });
}

async function acquire(format) {
  const response = await runtimeMessage({ type: "PEGASO_ACQUIRE_OPERATION", kind: format });
  if (!response?.accepted) {
    throw new Error(response?.operation?.message || response?.reason || "Un’altra operazione PlumePilot è già in corso.");
  }
  activeOperationId = response.operation.id;
  await runtimeMessage({
    type: "PEGASO_UPDATE_OPERATION",
    operationId: activeOperationId,
    patch: { phase: "building", message: `Creazione ${format.toUpperCase()} in corso…` },
  });
}

async function release() {
  const operationId = activeOperationId;
  activeOperationId = null;
  if (operationId) await runtimeMessage({ type: "PEGASO_RELEASE_OPERATION", operationId });
}

function releaseOnPageExit() {
  if (!activeOperationId) return;
  chrome.runtime.sendMessage({
    type: "PEGASO_RELEASE_OPERATION",
    operationId: activeOperationId,
  });
}

async function build(format) {
  if (building || !job) return;
  setBusy(true);
  progressElement.style.width = "0%";
  progressElement.style.background = "";
  cancelButton.hidden = format !== "epub";
  cancelButton.disabled = false;
  cancelButton.textContent = "Annulla creazione EPUB";
  buildController = format === "epub" ? new AbortController() : null;

  try {
    await acquire(format);
    const result = format === "pdf"
      ? await globalThis.PegasoPdfCore.buildCoursePdf(job.courseTitle, job.materials, setProgress)
      : await buildCourseEpub(job.courseTitle, job.materials, setProgress, {
        generatorVersion: chrome.runtime.getManifest().version,
        signal: buildController.signal,
      });
    const failures = [...(job.missing || []), ...(result.failures || [])];
    showFailures(failures);
    await invalidateFailedLinks(result.failures || []);
    progressElement.style.width = "100%";
    statusElement.textContent = `${format.toUpperCase()} creato: ${result.included.length} dispense incluse${failures.length ? `, ${failures.length} saltate` : ""}.`;
    download(
      result.bytes,
      result.filename,
      format === "pdf" ? "application/pdf" : "application/epub+zip",
    );
    claimExportAchievement();
  } catch (error) {
    const cancelled = error?.name === "AbortError";
    statusElement.textContent = cancelled
      ? "Creazione EPUB annullata. Nessun file incompleto è stato scaricato."
      : `Impossibile creare il ${format.toUpperCase()}: ${error?.message || "errore sconosciuto"}`;
    progressElement.style.background = cancelled ? "#d99a24" : "#991b1b";
  } finally {
    await release();
    buildController = null;
    cancelButton.hidden = true;
    setBusy(false);
  }
}

cancelButton.addEventListener("click", () => {
  if (!buildController || buildController.signal.aborted) return;
  cancelButton.disabled = true;
  cancelButton.textContent = "Annullamento in corso…";
  statusElement.textContent = "Interruzione sicura della creazione EPUB…";
  buildController.abort();
});
pdfButton.addEventListener("click", () => build("pdf"));
epubButton.addEventListener("click", () => build("epub"));
window.addEventListener("pagehide", releaseOnPageExit);

async function start() {
  const jobId = new URLSearchParams(location.search).get("job");
  if (!jobId) throw new Error("Identificativo della raccolta mancante.");
  const storageKey = `pegasoExportJob:${jobId}`;
  job = await storageGet(storageKey);
  if (!job?.materials?.length || job.format !== "materials") {
    await storageRemove(storageKey);
    if (job?.operationId) {
      await runtimeMessage({ type: "PEGASO_RELEASE_OPERATION", operationId: job.operationId });
    }
    throw new Error("Impossibile trovare le dispense raccolte.");
  }
  titleElement.textContent = job.courseTitle;
  document.title = `${job.courseTitle} – Dispense PlumePilot`;
  summaryElement.textContent = `${job.materials.length} dispense pronte. Puoi scaricare entrambi i formati, uno alla volta, senza ripetere la raccolta.`;
  showFailures(job.missing || []);
  statusElement.textContent = "Scegli PDF oppure EPUB.";
  await storageRemove(storageKey);
  await runtimeMessage({ type: "PEGASO_RELEASE_OPERATION", operationId: job.operationId });
  setBusy(false);
}

start().catch((error) => {
  console.error("[PlumePilot] Materials builder failed:", error);
  setBusy(true);
  statusElement.textContent = error?.message || "Impossibile caricare le dispense raccolte.";
  progressElement.style.background = "#991b1b";
});

(() => {
  "use strict";

  const titleElement = document.getElementById("courseTitle");
  const statusElement = document.getElementById("status");
  const detailsElement = document.getElementById("details");
  const progressBar = document.getElementById("progressBar");
  const failuresElement = document.getElementById("failures");
  const downloadAgainButton = document.getElementById("downloadAgain");
  let completedDownload = null;
  let operationId = null;

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
    return new Promise((resolve) => chrome.storage.local.remove(key, resolve));
  }

  function setProgress(update) {
    statusElement.textContent = update.message;

    if (Number.isFinite(update.completed) && Number.isFinite(update.total)) {
      const percent = update.total > 0
        ? Math.round((update.completed / update.total) * 100)
        : 0;
      progressBar.style.width = `${percent}%`;
      detailsElement.textContent = `${update.completed} di ${update.total} dispense elaborate`;
    }

    if (operationId) {
      chrome.runtime.sendMessage({
        type: "PEGASO_UPDATE_OPERATION",
        operationId,
        patch: { phase: "building", message: update.message },
      });
    }
  }

  function downloadPdf(bytes, filename) {
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
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

    if (!jobId) {
      throw new Error("Identificativo dell’operazione PDF mancante.");
    }

    const storageKey = `pegasoExportJob:${jobId}`;
    const job = await storageGet(storageKey);

    if (!job?.materials?.length) {
      throw new Error("Impossibile trovare le dispense raccolte.");
    }

    operationId = job.operationId;

    titleElement.textContent = job.courseTitle;
    document.title = `${job.courseTitle} – Creazione PDF`;

    const result = await PegasoPdfCore.buildCoursePdf(
      job.courseTitle,
      job.materials,
      setProgress,
    );

    const allFailures = [...(job.missing || []), ...result.failures];
    showFailures(allFailures);
    await invalidateFailedMaterialLinks(result.failures);

    completedDownload = {
      bytes: result.bytes,
      filename: result.filename,
    };

    progressBar.style.width = "100%";
    statusElement.textContent = "PDF creato con successo.";
    detailsElement.textContent =
      `${result.included.length} dispense unite` +
      (allFailures.length ? `; ${allFailures.length} saltate` : "");
    downloadAgainButton.hidden = false;
    downloadPdf(result.bytes, result.filename);
    await storageRemove(storageKey);
    chrome.runtime.sendMessage({ type: "PEGASO_RELEASE_OPERATION", operationId });
  }

  downloadAgainButton.addEventListener("click", () => {
    if (completedDownload) {
      downloadPdf(completedDownload.bytes, completedDownload.filename);
    }
  });

  start().catch((error) => {
    console.error("[PlumePilot] PDF builder failed:", error);
    statusElement.textContent = "Impossibile creare il PDF del corso.";
    detailsElement.textContent = error?.message || "Errore sconosciuto";
    progressBar.style.background = "#991b1b";
    if (operationId) {
      chrome.runtime.sendMessage({ type: "PEGASO_RELEASE_OPERATION", operationId });
    }
  });
})();

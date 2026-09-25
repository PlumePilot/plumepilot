(() => {
  "use strict";
  const A4 = [595.28, 841.89];
  const MARGIN = 54;
  const COLORS = { accent:[207,29,86], purple:[91,44,160], text:[40,29,50], muted:[111,100,121], line:[225,217,232] };
  const title = document.getElementById("courseTitle");
  const GENERATED_SIGNATURE = "Generato con PlumePilot - Assistente per Multiversity, disponibile su Chrome, Edge e Firefox.";
  const summary = document.getElementById("summary");
  const status = document.getElementById("status");
  const progress = document.getElementById("progressBar");
  const pdfButton = document.getElementById("downloadPdf");
  const htmlButton = document.getElementById("downloadHtml");
  const missingCard = document.getElementById("missingCard");
  const missingList = document.getElementById("missingList");
  let job = null;
  const imageCache = new Map();
  const reportedImageFailures = new Set();

  const rgb255 = (values) => PDFLib.rgb(...values.map((value) => value / 255));
  const filenameBase = (value) => String(value || "corso")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "corso";
  const storageGet = (key) => new Promise((resolve, reject) => chrome.storage.local.get(key, (result) =>
    chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve(result[key])));
  const storageRemove = (key) => new Promise((resolve) => chrome.storage.local.remove(key, resolve));
  const download = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  const claimCollectionAchievement = () => chrome.runtime.sendMessage({ type:"STUDYWING_ACHIEVEMENT_CLAIM", achievementId:"create-test-collection" }, (result) => {
    if (!chrome.runtime.lastError && result?.accepted && document.documentElement.dataset.visualStyle === "gaming") setBusy(false, `Raccolta creata · Traguardo completato: +${result.awardedExp} EXP.`, 100);
  });
  const setBusy = (busy, message, percent = 0) => {
    pdfButton.disabled = busy; htmlButton.disabled = busy;
    status.textContent = message; progress.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  };

  function displayChapterNumber(test) {
    const titleMatch = String(test?.chapterTitle || "").match(/^\s*(\d+)\s*-\s+/);
    const titleNumber = Number(titleMatch?.[1]);
    if (Number.isInteger(titleNumber) && titleNumber > 0) return titleNumber;

    const lessonNumber = Number(test?.lessonNumber);
    return Number.isInteger(lessonNumber) && lessonNumber > 0 ? lessonNumber : "?";
  }

  function imageLabel(image) {
    if (image?.title) return image.title;
    try {
      return new URL(image?.url).pathname.split("/").filter(Boolean).at(-1) || "immagine del test";
    } catch {
      return "immagine del test";
    }
  }

  function reportImageFailure(image) {
    const key = image?.url || imageLabel(image);
    if (reportedImageFailures.has(key)) return;
    reportedImageFailures.add(key);
    const item = document.createElement("li");
    item.textContent = `Immagine non disponibile: ${imageLabel(image)}`;
    missingList.appendChild(item);
    missingCard.hidden = false;
  }

  function bytesToDataUrl(bytes, mime) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return `data:${mime};base64,${btoa(binary)}`;
  }

  function loadImageAsset(image) {
    const url = typeof image?.url === "string" ? image.url : "";
    if (!url) return Promise.reject(new Error("INVALID_IMAGE_URL"));
    if (imageCache.has(url)) return imageCache.get(url);
    const request = (async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const declaredLength = Number(response.headers?.get?.("content-length"));
      if (Number.isFinite(declaredLength) && declaredLength > 8 * 1024 * 1024) {
        throw new Error("IMAGE_TOO_LARGE");
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new Error("INVALID_IMAGE_SIZE");
      const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      const png = bytes.length >= 8 &&
        bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
        bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
      if (!jpeg && !png) throw new Error("UNSUPPORTED_IMAGE_DATA");
      const mime = jpeg ? "image/jpeg" : "image/png";
      return { bytes, mime, dataUrl:bytesToDataUrl(bytes, mime) };
    })().catch((error) => {
      imageCache.delete(url);
      reportImageFailure(image);
      throw error;
    });
    imageCache.set(url, request);
    return request;
  }

  function wrap(text, font, size, width) {
    const paragraphs = String(text ?? "").replace(/\r/g, "").split("\n");
    const lines = [];
    for (const paragraph of paragraphs) {
      const words = paragraph.split(/\s+/).filter(Boolean);
      let line = "";
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= width) { line = candidate; continue; }
        if (line) lines.push(line);
        line = "";
        let part = "";
        for (const character of word) {
          if (part && font.widthOfTextAtSize(part + character, size) > width) { lines.push(part); part = character; }
          else part += character;
        }
        line = part;
      }
      lines.push(line);
    }
    return lines.length ? lines : [""];
  }

  function addLink(documentPdf, page, rect, targetPage) {
    const annotation = documentPdf.context.register(documentPdf.context.obj({
      Type:"Annot", Subtype:"Link", Rect:rect, Border:[0,0,0],
      C:COLORS.accent.map((value) => value / 255),
      Dest:[targetPage.ref, PDFLib.PDFName.of("Fit")],
    }));
    page.node.addAnnot(annotation);
  }

  function addBookmarks(documentPdf, questionEntries, solutionEntries) {
    const roots = [
      { label:"Domande", entries:questionEntries },
      { label:"Soluzioni", entries:solutionEntries },
    ];
    const context = documentPdf.context;
    const outlineRef = context.nextRef();
    const rootRefs = roots.map(() => context.nextRef());
    const allDescendants = [];
    roots.forEach((root) => {
      const sections = [];
      for (const entry of root.entries) {
        let section = sections.at(-1);
        if (!section || section.label !== entry.section) {
          section = { label:entry.section, entries:[] };
          sections.push(section);
        }
        section.entries.push(entry);
      }
      root.sections = sections;
      root.sectionRefs = sections.map(() => context.nextRef());
      root.chapterRefs = sections.map((section) => section.entries.map(() => context.nextRef()));
      allDescendants.push(...root.sectionRefs, ...root.chapterRefs.flat());
    });
    context.assign(outlineRef, context.obj({ Type:"Outlines", First:rootRefs[0], Last:rootRefs.at(-1), Count:rootRefs.length + allDescendants.length }));
    roots.forEach((root, rootIndex) => {
      context.assign(rootRefs[rootIndex], context.obj({
        Title:PDFLib.PDFHexString.fromText(root.label), Parent:outlineRef,
        Dest:[root.entries[0].page.ref, PDFLib.PDFName.of("Fit")],
        First:root.sectionRefs[0], Last:root.sectionRefs.at(-1), Count:root.sectionRefs.length + root.chapterRefs.flat().length,
        ...(rootIndex ? { Prev:rootRefs[rootIndex - 1] } : {}),
        ...(rootIndex + 1 < roots.length ? { Next:rootRefs[rootIndex + 1] } : {}),
      }));
      root.sections.forEach((section, sectionIndex) => {
        const sectionRef = root.sectionRefs[sectionIndex];
        const chapterRefs = root.chapterRefs[sectionIndex];
        context.assign(sectionRef, context.obj({
          Title:PDFLib.PDFHexString.fromText(section.label), Parent:rootRefs[rootIndex],
          Dest:[section.entries[0].page.ref, PDFLib.PDFName.of("Fit")],
          First:chapterRefs[0], Last:chapterRefs.at(-1), Count:chapterRefs.length,
          ...(sectionIndex ? { Prev:root.sectionRefs[sectionIndex - 1] } : {}),
          ...(sectionIndex + 1 < root.sections.length ? { Next:root.sectionRefs[sectionIndex + 1] } : {}),
        }));
        section.entries.forEach((entry, entryIndex) => context.assign(chapterRefs[entryIndex], context.obj({
          Title:PDFLib.PDFHexString.fromText(entry.chapterTitle), Parent:sectionRef,
          Dest:[entry.page.ref, PDFLib.PDFName.of("Fit")],
          ...(entryIndex ? { Prev:chapterRefs[entryIndex - 1] } : {}),
          ...(entryIndex + 1 < section.entries.length ? { Next:chapterRefs[entryIndex + 1] } : {}),
        })));
      });
    });
    documentPdf.catalog.set(PDFLib.PDFName.of("Outlines"), outlineRef);
    documentPdf.catalog.set(PDFLib.PDFName.of("PageMode"), PDFLib.PDFName.of("UseOutlines"));
  }

  async function buildPdf() {
    setBusy(true, "Preparazione del PDF e dei caratteri Unicode…", 4);
    const documentPdf = await PDFLib.PDFDocument.create();
    documentPdf.registerFontkit(globalThis.fontkit);
    const [regularBytes, boldBytes] = await Promise.all([
      fetch(chrome.runtime.getURL("vendor/standard_fonts/LiberationSans-Regular.ttf")).then((r) => r.arrayBuffer()),
      fetch(chrome.runtime.getURL("vendor/standard_fonts/LiberationSans-Bold.ttf")).then((r) => r.arrayBuffer()),
    ]);
    const regular = await documentPdf.embedFont(regularBytes, { subset:true });
    const bold = await documentPdf.embedFont(boldBytes, { subset:true });
    documentPdf.setTitle(`${job.courseTitle} – Test di autovalutazione`);
    documentPdf.setSubject("Domande, risposte e soluzioni dei test di autovalutazione");
    documentPdf.setCreator(`PlumePilot ${chrome.runtime.getManifest().version}`);
    documentPdf.setProducer(`PlumePilot ${chrome.runtime.getManifest().version} e pdf-lib`);
    let page = null; let y = 0;
    const embeddedImages = new Map();
    const questionEntries = []; const solutionEntries = []; const pendingLinks = [];
    const addPage = () => { page = documentPdf.addPage(A4); y = A4[1] - MARGIN; return page; };
    const drawLines = (text, options = {}) => {
      const font = options.bold ? bold : regular;
      const size = options.size || 11;
      const lineHeight = options.lineHeight || size * 1.35;
      const x = options.x || MARGIN;
      const width = options.width || A4[0] - MARGIN * 2;
      const lines = wrap(text, font, size, width);
      for (const line of lines) {
        if (y - lineHeight < 42) addPage();
        page.drawText(line, { x, y, size, font, color:rgb255(options.color || COLORS.text) });
        y -= lineHeight;
      }
      y -= options.after || 0;
    };
    const drawImages = async (images, options = {}) => {
      for (const image of Array.isArray(images) ? images : []) {
        try {
          const asset = await loadImageAsset(image);
          let embedded = embeddedImages.get(image.url);
          if (!embedded) {
            embedded = asset.mime === "image/png"
              ? await documentPdf.embedPng(asset.bytes)
              : await documentPdf.embedJpg(asset.bytes);
            embeddedImages.set(image.url, embedded);
          }
          const maxWidth = options.width || A4[0] - MARGIN * 2;
          const maxHeight = options.maxHeight || 270;
          const scale = Math.min(maxWidth / embedded.width, maxHeight / embedded.height, options.maxScale || 2.5);
          const width = embedded.width * scale;
          const height = embedded.height * scale;
          if (y - height < 42) addPage();
          const baseX = options.x ?? MARGIN;
          const x = options.center === false ? baseX : baseX + (maxWidth - width) / 2;
          page.drawImage(embedded, { x, y:y - height, width, height });
          y -= height + (options.after ?? 10);
        } catch {
          drawLines(`[Immagine non disponibile: ${imageLabel(image)}]`, {
            x:options.x ?? MARGIN,
            width:options.width,
            size:9.5,
            color:COLORS.muted,
            after:options.after ?? 8,
          });
        }
      }
    };
    const chapterStart = (test, label) => {
      addPage();
      drawLines(label, { bold:true, size:10, color:COLORS.accent, after:8 });
      drawLines(test.section, { bold:true, size:12, color:COLORS.purple, after:4 });
      drawLines(test.chapterTitle, { bold:true, size:21, lineHeight:26, after:14 });
      page.drawLine({ start:{x:MARGIN,y:y + 5}, end:{x:A4[0]-MARGIN,y:y + 5}, thickness:.8, color:rgb255(COLORS.line) });
      y -= 10;
      return page;
    };

    addPage();
    drawLines("PLUMEPILOT · TEST DI AUTOVALUTAZIONE", { bold:true, size:11, color:COLORS.accent, after:18 });
    drawLines(job.courseTitle, { bold:true, size:27, lineHeight:33, after:15 });
    drawLines("Le domande sono raccolte nella prima parte. Le soluzioni si trovano alla fine del documento e sono raggiungibili tramite link e segnalibri.", { size:13, lineHeight:18, color:COLORS.muted });
    drawLines(GENERATED_SIGNATURE, { size:9.5, lineHeight:13, color:COLORS.muted, after:8 });

    for (let testIndex = 0; testIndex < job.tests.length; testIndex++) {
      const test = job.tests[testIndex];
      const firstPage = chapterStart(test, `DOMANDE · CAPITOLO ${displayChapterNumber(test)}`);
      questionEntries.push({ ...test, page:firstPage });
      for (let questionIndex = 0; questionIndex < test.questions.length; questionIndex++) {
        const question = test.questions[questionIndex];
        drawLines(`${questionIndex + 1}. ${question.question || "Domanda in immagine"}`, { bold:true, size:12, lineHeight:16, after:5 });
        await drawImages(question.images, { maxHeight:270, after:8 });
        for (let answerIndex = 0; answerIndex < question.answers.length; answerIndex++) {
          const answer = question.answers[answerIndex];
          drawLines(`${String.fromCharCode(65 + answerIndex)}. ${answer.answer || "Risposta in immagine"}`, { x:MARGIN + 14, width:A4[0]-MARGIN*2-14, size:10.5, lineHeight:14, after:2 });
          await drawImages(answer.images, { x:MARGIN + 28, width:A4[0]-MARGIN*2-28, maxHeight:180, center:false, after:5 });
        }
        y -= 8;
      }
      if (y < 70) addPage();
      const linkPage = page; const top = y + 13;
      drawLines("Vai alle soluzioni del capitolo →", { bold:true, size:10.5, color:COLORS.accent });
      pendingLinks.push({ kind:"to-solution", index:testIndex, page:linkPage, rect:[MARGIN,y,330,top] });
      setBusy(true, `Impaginazione domande ${testIndex + 1}/${job.tests.length}…`, 8 + (testIndex + 1) / job.tests.length * 38);
    }

    for (let testIndex = 0; testIndex < job.tests.length; testIndex++) {
      const test = job.tests[testIndex];
      const firstPage = chapterStart(test, `SOLUZIONI · CAPITOLO ${displayChapterNumber(test)}`);
      solutionEntries.push({ ...test, page:firstPage });
      for (let questionIndex = 0; questionIndex < test.questions.length; questionIndex++) {
        const question = test.questions[questionIndex];
        const position = Number(question.correctPosition);
        const answer = Number.isInteger(position) ? question.answers[position - 1] : null;
        const letter = answer ? String.fromCharCode(64 + position) : "?";
        const answerText = answer ? (answer.answer || "Risposta in immagine") : "Soluzione non indicata dalla piattaforma";
        drawLines(`${questionIndex + 1}. ${letter} — ${answerText}`, { size:11, lineHeight:15, after:7 });
        if (answer) await drawImages(answer.images, { x:MARGIN + 18, width:A4[0]-MARGIN*2-18, maxHeight:170, center:false, after:8 });
      }
      if (y < 70) addPage();
      const linkPage = page; const top = y + 13;
      drawLines("← Torna alle domande del capitolo", { bold:true, size:10.5, color:COLORS.accent });
      pendingLinks.push({ kind:"to-question", index:testIndex, page:linkPage, rect:[MARGIN,y,330,top] });
      setBusy(true, `Impaginazione soluzioni ${testIndex + 1}/${job.tests.length}…`, 46 + (testIndex + 1) / job.tests.length * 38);
    }
    pendingLinks.forEach((link) => addLink(documentPdf, link.page, link.rect,
      link.kind === "to-solution" ? solutionEntries[link.index].page : questionEntries[link.index].page));
    addBookmarks(documentPdf, questionEntries, solutionEntries);
    const pages = documentPdf.getPages();
    pages.forEach((item, index) => item.drawText(`${index + 1} / ${pages.length}`, { x:A4[0]-MARGIN-28, y:24, size:8.5, font:regular, color:rgb255(COLORS.muted) }));
    setBusy(true, "Finalizzazione del PDF…", 90);
    const bytes = await documentPdf.save({ useObjectStreams:true, addDefaultPage:false });
    download(new Blob([bytes], { type:"application/pdf" }), `${filenameBase(job.courseTitle)}-test-autovalutazione.pdf`);
    setBusy(false, "PDF creato e scaricato.", 100);
    claimCollectionAchievement();
  }

  async function interactiveHtml() {
    const offlineImages = async (images) => Promise.all((Array.isArray(images) ? images : []).map(async (image) => {
      try {
        const asset = await loadImageAsset(image);
        return { title:imageLabel(image), dataUrl:asset.dataUrl };
      } catch {
        return { title:imageLabel(image), dataUrl:null };
      }
    }));
    const tests = await Promise.all(job.tests.map(async (test) => ({
      ...test,
      displayLessonNumber:displayChapterNumber(test),
      questions:await Promise.all(test.questions.map(async (question, questionIndex) => ({
        ...question,
        noteKey:`test:${Number(test.testId) || Number(test.order) || Number(test.lessonNumber) || "unknown"}:question:${questionIndex + 1}`,
        images:await offlineImages(question.images),
        answers:await Promise.all(question.answers.map(async (answer) => ({
          ...answer,
          images:await offlineImages(answer.images),
        }))),
      }))),
    })));
    const payload = JSON.stringify({
      courseTitle:job.courseTitle,
      annotatedFilename:`${filenameBase(job.courseTitle)}-quiz-con-appunti.html`,
      tests,
    })
      .replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
    const runtimeResponse = await fetch("offline-quiz-runtime.js");
    if (!runtimeResponse.ok) {
      throw new Error(`Runtime quiz non disponibile (${runtimeResponse.status})`);
    }
    const runtimeSource = await runtimeResponse.text();
    return `<!doctype html><html lang="it" data-theme="auto"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${String(job.courseTitle).replace(/[&<>"']/g, "") } – Quiz PlumePilot</title><style>
    :root{color-scheme:light;--ok-bg:#eaf8f1;--bad-bg:#fff0ee;--note:#356047;--note-border:#4f8a68;--note-bg:rgba(79,138,104,.14)}:root[data-theme="dark"]{color-scheme:dark;--bg:#171a1f;--card:#22262d;--text:#e8eaed;--muted:#b7bdc7;--accent:#f05b8c;--purple:#bd9aff;--ok:#8fc7a3;--ok-bg:#18372a;--bad:#ff9b91;--bad-bg:#402321;--line:#3b414b;--note:#b7dfc5;--note-border:#8fc7a3;--note-bg:rgba(143,199,163,.13)}@media(prefers-color-scheme:dark){:root[data-theme="auto"]{color-scheme:dark;--bg:#171a1f;--card:#22262d;--text:#e8eaed;--muted:#b7bdc7;--accent:#f05b8c;--purple:#bd9aff;--ok:#8fc7a3;--ok-bg:#18372a;--bad:#ff9b91;--bad-bg:#402321;--line:#3b414b;--note:#b7dfc5;--note-border:#8fc7a3;--note-bg:rgba(143,199,163,.13)}}html .answer.correct{background:var(--ok-bg)}html .answer.wrong{background:var(--bad-bg)}html .personal-notes[data-has-notes="true"]{margin-top:12px;padding:10px;border:1px solid var(--note-border);border-radius:10px;background:var(--note-bg)}html .personal-notes[data-has-notes="true"] summary{color:var(--note)}html .options{align-items:center}.theme-control{display:inline-flex;align-items:center;gap:6px;margin-left:auto}.theme-control select{padding:5px 8px;border:1px solid var(--line);border-radius:7px;background:var(--card);color:var(--text);font:inherit}@media(max-width:760px){.theme-control{margin-left:0}}
    :root{--bg:#f6f2fa;--card:#fff;--text:#281d32;--muted:#73677c;--accent:#cf1d56;--purple:#5b2ca0;--ok:#18794e;--bad:#b42318;--line:#e3dae9}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}.app{display:grid;grid-template-columns:280px 1fr;min-height:100vh}aside{display:flex;flex-direction:column;padding:22px;background:#2b1839;color:#fff;position:sticky;top:0;height:100vh;overflow:auto}aside h1{font-size:18px;margin:6px 0 4px}.brand{font-size:11px;font-weight:800;letter-spacing:.12em;color:#ff91b4}.score{color:#dbcbe5;margin:0 0 18px}aside nav{flex:1}.generated-signature{margin:18px 0 0;color:#dbcbe5;font-size:10px;line-height:1.4}.chapter{display:block;width:100%;margin:6px 0;padding:9px 10px;border:0;border-radius:8px;background:transparent;color:#fff;text-align:left;cursor:pointer}.chapter.active{background:#613493}.content{width:min(850px,calc(100% - 32px));margin:32px auto}.toolbar,.question{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;margin-bottom:14px}.toolbar h2{margin:0 0 6px}.options{display:flex;gap:16px;flex-wrap:wrap;color:var(--muted)}.prompt-image{display:block;max-width:100%;max-height:420px;object-fit:contain;margin:12px auto;border-radius:8px}.answer-image{display:block;max-width:100%;max-height:240px;object-fit:contain;margin:8px 0;border-radius:6px}.image-missing{color:var(--muted);font-style:italic;margin:8px 0}.answer{display:flex;gap:10px;margin:8px 0;padding:11px;border:1px solid var(--line);border-radius:10px;cursor:pointer}.answer>span{min-width:0;flex:1}.answer.correct{border-color:var(--ok);background:#eaf8f1}.answer.wrong{border-color:var(--bad);background:#fff0ee}.feedback{font-weight:700;min-height:24px}.personal-notes{margin-top:12px;border-top:1px solid var(--line);padding-top:10px}.personal-notes summary{color:var(--purple);font-weight:750;cursor:pointer}.personal-notes[data-has-notes="true"] summary{color:var(--accent)}.notes-indicator{display:inline-block;margin-left:8px;padding:2px 7px;border:1px solid currentColor;border-radius:999px;font-size:11px;line-height:1.35;vertical-align:middle}.personal-notes[data-has-notes="false"] .notes-indicator{display:none}.note-field{display:block;margin-top:10px;color:var(--muted);font-size:14px;font-weight:700}.note-field textarea{display:block;width:100%;min-height:78px;margin-top:5px;padding:10px;border:1px solid var(--line);border-radius:9px;background:var(--card);color:var(--text);font:15px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;resize:vertical}.symbol-bar{display:flex;gap:5px;flex-wrap:wrap;margin-top:9px}.symbol-bar button{min-width:30px;min-height:30px;padding:3px 7px;border:1px solid var(--line);border-radius:7px;background:var(--bg);color:var(--text);font:17px serif;cursor:pointer}.actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:20px 0}.actions button{border:0;border-radius:10px;padding:11px 15px;background:var(--purple);color:#fff;font:inherit;font-weight:700;cursor:pointer}.actions .check{background:var(--accent)}.chapter-score{display:inline-flex;align-items:center;min-height:46px;padding:0 15px;border:2px solid var(--purple);border-radius:10px;background:var(--card);color:var(--purple);font-weight:800}.chapter-score[hidden]{display:none}@media(max-width:760px){.app{display:block}aside{position:static;height:auto}.content{margin:20px auto}.chapter{display:inline-block;width:auto}}

    .review-counts{margin:12px 0 6px;color:var(--muted);font-size:14px}.review-filter,.review-control{display:inline-flex;align-items:center;gap:8px;color:var(--muted);font-size:14px}.review-filter select,.review-control select{padding:6px;border:1px solid var(--line);border-radius:7px;background:var(--card);color:var(--text);font:inherit}.review-control{margin:8px 0}.question-chapter{display:block;color:var(--muted)}.actions button:disabled{opacity:.5;cursor:not-allowed}.note-field .note-editor{display:block;width:100%;min-height:78px;margin-top:5px;padding:10px;border:1px solid var(--line);border-radius:9px;background:var(--card);color:var(--text);font:15px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;overflow-wrap:anywhere}.note-editor:empty:before{content:attr(data-placeholder);color:var(--muted);font-weight:400}.note-editor:focus{outline:2px solid var(--purple);outline-offset:1px}.editor-tools{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px}.editor-tools button{padding:4px 7px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--text);cursor:pointer;font:12px system-ui,sans-serif}.note-editor .highlight[data-color=yellow]{background:#f9de76;color:#232323}.note-editor .highlight[data-color=green]{background:#a7e5b6;color:#232323}.note-editor .highlight[data-color=blue]{background:#a9dcf4;color:#232323}.note-editor .highlight[data-color=pink]{background:#f5b5d4;color:#232323}.note-editor .study-mask{border-radius:3px;background:var(--text);color:transparent;cursor:pointer;user-select:none}.note-editor .study-mask.revealed{background:var(--note-bg);color:var(--text);user-select:text}.note-editor .callout{border-left:4px solid var(--purple);padding:6px 10px;margin:6px 0;background:var(--note-bg)}.note-editor .callout[data-kind=attention]{border-color:var(--bad)}.note-editor .callout[data-kind=review]{border-color:var(--accent)}.note-editor .checklist{list-style:none;padding-left:22px}.note-editor .checklist>li{position:relative;cursor:pointer}.note-editor .checklist>li:before{content:"☐";position:absolute;left:-20px}.note-editor .checklist>li.checked:before{content:"☑"}.note-editor .checklist>li.checked{text-decoration:line-through;opacity:.7}
    </style></head><body><div class="app"><aside><div class="brand">PLUMEPILOT · QUIZ OFFLINE</div><h1 id="title"></h1><p class="score" id="score"></p><nav id="nav"></nav><p class="generated-signature">${GENERATED_SIGNATURE}</p></aside><main class="content"><section class="toolbar"><h2 id="chapterTitle" tabindex="-1"></h2><div class="options"><label><input id="shuffleQuestions" type="checkbox"> Mescola domande</label><label><input id="shuffleAnswers" type="checkbox"> Mescola risposte</label><label><input id="showSolutions" type="checkbox"> Mostra soluzioni</label></div><p id="reviewCounts" class="review-counts" aria-live="polite"></p><label class="review-filter">Filtra domande <select id="reviewFilter"><option value="all">Tutte</option><option value="verified">Verificate</option><option value="review">Da rivedere</option><option value="verify">Da verificare</option><option value="observations">Con osservazioni</option></select></label></section><div id="questions"></div><div class="actions"><button class="check" id="check">Verifica capitolo</button><button id="reset">Ricomincia capitolo</button><button id="downloadNotes">Scarica HTML con appunti</button><output class="chapter-score" id="chapterScore" aria-live="polite" hidden></output></div></main></div><script id="notes-data" type="application/octet-stream">e30=</script><script>
    const DATA=${payload};
${runtimeSource}
    </script></body></html>`;
  }

  htmlButton.addEventListener("click", async () => {
    setBusy(true, "Preparazione delle immagini per il quiz offline…", 20);
    try {
      const html = await interactiveHtml();
      download(new Blob([html], { type:"text/html;charset=utf-8" }), `${filenameBase(job.courseTitle)}-quiz-interattivo.html`);
      setBusy(false, "Quiz HTML creato e scaricato. Funziona anche offline.", 100);
      claimCollectionAchievement();
    } catch (error) {
      console.error("[PlumePilot] Interactive test generation failed:", error);
      setBusy(false, `Creazione HTML non riuscita: ${error?.message || "Errore sconosciuto"}`, 0);
    }
  });
  pdfButton.addEventListener("click", () => buildPdf().catch((error) => {
    console.error("[PlumePilot] Test PDF generation failed:", error);
    setBusy(false, `Creazione PDF non riuscita: ${error?.message || "Errore sconosciuto"}`, 0);
  }));

  async function start() {
    const jobId = new URLSearchParams(location.search).get("job");
    if (!jobId) throw new Error("Identificativo della raccolta mancante");
    const storageKey = `pegasoExportJob:${jobId}`;
    job = await storageGet(storageKey);
    if (!job?.tests?.length) throw new Error("Nessun test raccolto disponibile");
    title.textContent = job.courseTitle;
    document.title = `${job.courseTitle} – Raccolta test`;
    const questionCount = job.tests.reduce((total, test) => total + test.questions.length, 0);
    summary.textContent = `${job.tests.length} capitoli · ${questionCount} domande raccolte`;
    missingList.replaceChildren(...(job.missing || []).map((item) => {
      const li = document.createElement("li"); li.textContent = `${item.chapter}: ${item.reason}`; return li;
    }));
    missingCard.hidden = !(job.missing || []).length;
    await storageRemove(storageKey);
    chrome.runtime.sendMessage({ type:"PEGASO_RELEASE_OPERATION", operationId:job.operationId });
    setBusy(false, "Raccolta pronta. Puoi scaricare uno o entrambi i formati.", 100);
  }
  start().catch((error) => {
    setBusy(false, `Impossibile aprire la raccolta: ${error.message}`, 0);
    pdfButton.disabled = true;
    htmlButton.disabled = true;
    if (job?.operationId) {
      chrome.runtime.sendMessage({ type:"PEGASO_RELEASE_OPERATION", operationId:job.operationId });
    }
  });
})();

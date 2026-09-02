(() => {
  "use strict";

  const A4 = [595.28, 841.89];
  const PAGE_MARGIN = 54;
  const ACCENT = { r: 207 / 255, g: 29 / 255, b: 86 / 255 };
  const TEXT = { r: 31 / 255, g: 41 / 255, b: 55 / 255 };
  const MUTED = { r: 107 / 255, g: 114 / 255, b: 128 / 255 };
  const STUDYWING_SIGNATURE = "Generato con PlumePilot - Assistente per Pegaso.";
  const STUDYWING_GENERATOR = `PlumePilot ${globalThis.chrome?.runtime?.getManifest?.().version || "versione sconosciuta"}`;

  function filenameFor(title) {
    const normalized = title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();

    return `${normalized || "unipegaso-course"}-dispense.pdf`;
  }

  function fontSafe(text, font) {
    return [...String(text)].map((character) => {
      try {
        font.encodeText(character);
        return character;
      } catch {
        return "?";
      }
    }).join("");
  }

  function wrapText(text, font, size, maxWidth) {
    const safeText = fontSafe(text, font);
    const words = safeText.split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;

      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }

      if (line) {
        lines.push(line);
        line = "";
      }

      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        line = word;
        continue;
      }

      let part = "";
      for (const character of word) {
        const nextPart = part + character;
        if (font.widthOfTextAtSize(nextPart, size) > maxWidth && part) {
          lines.push(part);
          part = character;
        } else {
          part = nextPart;
        }
      }
      line = part;
    }

    if (line) {
      lines.push(line);
    }

    return lines.length ? lines : [""];
  }

  function sectionLabelFor(item) {
    const explicit = String(item?.section || "").trim();
    if (explicit) return explicit;

    const chapter = String(item?.chapter || "").trim();
    const separatorIndex = chapter.indexOf(" — ");
    return separatorIndex > 0 ? chapter.slice(0, separatorIndex).trim() : "Dispense";
  }

  function chapterLabelFor(item) {
    const explicit = String(item?.chapterTitle || "").trim();
    if (explicit) return explicit;

    const chapter = String(item?.chapter || "").trim();
    const section = sectionLabelFor(item);
    const prefix = `${section} — `;
    return chapter.startsWith(prefix) ? chapter.slice(prefix.length).trim() : chapter;
  }

  function groupBySection(items) {
    const groups = [];
    const byLabel = new Map();

    for (const item of items) {
      const label = sectionLabelFor(item);
      let group = byLabel.get(label);

      if (!group) {
        group = { label, items: [] };
        byLabel.set(label, group);
        groups.push(group);
      }

      group.items.push(item);
    }

    return groups;
  }

  function addInternalLink(document, page, rectangle, targetPage) {
    const { PDFName } = PDFLib;
    const annotation = document.context.register(
      document.context.obj({
        Type: "Annot",
        Subtype: "Link",
        Rect: rectangle,
        Border: [0, 0, 0],
        C: [ACCENT.r, ACCENT.g, ACCENT.b],
        Dest: [targetPage.ref, PDFName.of("Fit")],
      }),
    );

    page.node.addAnnot(annotation);
  }

  function addBookmarks(document, included) {
    if (!included.length) {
      return;
    }

    const { PDFHexString, PDFName } = PDFLib;
    const context = document.context;
    const groups = groupBySection(included);
    const outlineRef = context.nextRef();
    const sectionRefs = groups.map(() => context.nextRef());
    const chapterRefs = groups.map((group) =>
      group.items.map(() => context.nextRef()),
    );

    context.assign(
      outlineRef,
      context.obj({
        Type: "Outlines",
        First: sectionRefs[0],
        Last: sectionRefs[sectionRefs.length - 1],
        Count: groups.length + included.length,
      }),
    );

    groups.forEach((group, sectionIndex) => {
      const childRefs = chapterRefs[sectionIndex];
      const sectionItem = {
        Title: PDFHexString.fromText(group.label),
        Parent: outlineRef,
        Dest: [group.items[0].firstPage.ref, PDFName.of("Fit")],
        First: childRefs[0],
        Last: childRefs[childRefs.length - 1],
        Count: childRefs.length,
      };

      if (sectionIndex > 0) {
        sectionItem.Prev = sectionRefs[sectionIndex - 1];
      }
      if (sectionIndex + 1 < sectionRefs.length) {
        sectionItem.Next = sectionRefs[sectionIndex + 1];
      }

      context.assign(sectionRefs[sectionIndex], context.obj(sectionItem));

      group.items.forEach((item, chapterIndex) => {
        const chapterItem = {
          Title: PDFHexString.fromText(chapterLabelFor(item)),
          Parent: sectionRefs[sectionIndex],
          Dest: [item.firstPage.ref, PDFName.of("Fit")],
        };

        if (chapterIndex > 0) {
          chapterItem.Prev = childRefs[chapterIndex - 1];
        }
        if (chapterIndex + 1 < childRefs.length) {
          chapterItem.Next = childRefs[chapterIndex + 1];
        }

        context.assign(childRefs[chapterIndex], context.obj(chapterItem));
      });
    });

    document.catalog.set(PDFName.of("Outlines"), outlineRef);
    document.catalog.set(PDFName.of("PageMode"), PDFName.of("UseOutlines"));
  }

  function addInteractiveIndex(document, courseTitle, included, regular, bold) {
    const { rgb } = PDFLib;
    const pageWidth = A4[0];
    const maxTextWidth = pageWidth - PAGE_MARGIN * 2;
    let page = null;
    let pageNumber = 0;
    let y = 0;
    const groups = groupBySection(included);

    function addIndexPage() {
      page = document.insertPage(pageNumber, A4);
      pageNumber += 1;
      y = A4[1] - PAGE_MARGIN;

      if (pageNumber === 1) {
        const signatureLines = wrapText(STUDYWING_SIGNATURE, regular, 9, maxTextWidth);
        for (const line of signatureLines) {
          page.drawText(line, {
            x: PAGE_MARGIN,
            y,
            size: 9,
            font: regular,
            color: rgb(MUTED.r, MUTED.g, MUTED.b),
          });
          y -= 12;
        }
        y -= 10;
      }

      page.drawText("DISPENSE DEL CORSO", {
        x: PAGE_MARGIN,
        y,
        size: 10,
        font: bold,
        color: rgb(ACCENT.r, ACCENT.g, ACCENT.b),
      });
      y -= 28;

      const titleLines = wrapText(`Corso - ${courseTitle}`, bold, 22, maxTextWidth);
      for (const line of titleLines) {
        page.drawText(line, {
          x: PAGE_MARGIN,
          y,
          size: 22,
          font: bold,
          color: rgb(TEXT.r, TEXT.g, TEXT.b),
        });
        y -= 27;
      }

      page.drawText("Indice interattivo", {
        x: PAGE_MARGIN,
        y: y - 2,
        size: 12,
        font: regular,
        color: rgb(MUTED.r, MUTED.g, MUTED.b),
      });
      y -= 32;
    }

    addIndexPage();

    function sectionHeadingHeight(label) {
      return wrapText(label, bold, 14, maxTextWidth).length * 18 + 14;
    }

    function chapterEntryHeight(item) {
      return wrapText(
        chapterLabelFor(item),
        regular,
        12,
        maxTextWidth - 24,
      ).length * 16 + 12;
    }

    function drawSectionHeading(label, targetPage, continued = false) {
      const heading = continued ? `${label} (continua)` : label;
      const lines = wrapText(heading, bold, 14, maxTextWidth);
      const top = y + 5;

      for (const line of lines) {
        page.drawText(line, {
          x: PAGE_MARGIN,
          y,
          size: 14,
          font: bold,
          color: rgb(TEXT.r, TEXT.g, TEXT.b),
        });
        y -= 18;
      }

      addInternalLink(
        document,
        page,
        [PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, top + 12],
        targetPage,
      );
      y -= 14;
    }

    function drawChapterEntry(item) {
      const lines = wrapText(
        chapterLabelFor(item),
        regular,
        12,
        maxTextWidth - 24,
      );
      const top = y + 5;

      for (const line of lines) {
        page.drawText(line, {
          x: PAGE_MARGIN + 24,
          y,
          size: 12,
          font: regular,
          color: rgb(ACCENT.r, ACCENT.g, ACCENT.b),
        });
        y -= 16;
      }

      const bottom = y + 5;
      page.drawLine({
        start: { x: PAGE_MARGIN + 14, y: bottom - 5 },
        end: { x: pageWidth - PAGE_MARGIN, y: bottom - 5 },
        thickness: 0.5,
        color: rgb(0.9, 0.9, 0.92),
      });

      addInternalLink(
        document,
        page,
        [PAGE_MARGIN + 14, bottom, pageWidth - PAGE_MARGIN, top + 12],
        item.firstPage,
      );
      y -= 12;
    }

    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      const group = groups[groupIndex];
      const sectionGap = groupIndex > 0 ? 8 : 0;
      const firstEntryHeight = chapterEntryHeight(group.items[0]);
      if (
        y - sectionGap - sectionHeadingHeight(group.label) - firstEntryHeight <
        54
      ) {
        addIndexPage();
      } else {
        y -= sectionGap;
      }

      drawSectionHeading(group.label, group.items[0].firstPage);

      for (const item of group.items) {
        const entryHeight = chapterEntryHeight(item);

        if (y - entryHeight < 54) {
          addIndexPage();
          drawSectionHeading(group.label, item.firstPage, true);
        }

        drawChapterEntry(item);
      }
    }

    for (let index = 0; index < pageNumber; index++) {
      const indexPage = document.getPage(index);
      indexPage.drawText(
        `Indice ${index + 1} di ${pageNumber} - fai clic su un capitolo per aprirlo`,
        {
          x: PAGE_MARGIN,
          y: 28,
          size: 9,
          font: regular,
          color: rgb(MUTED.r, MUTED.g, MUTED.b),
        },
      );
    }
  }

  async function buildCoursePdf(
    courseTitle,
    materials,
    onProgress = () => {},
    fetchImpl = globalThis.fetch,
  ) {
    const { PDFDocument, StandardFonts } = PDFLib;
    const document = await PDFDocument.create();
    const regular = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    const included = [];
    const failures = [];

    document.setTitle(courseTitle);
    document.setSubject("Materiali del corso Pegaso con indice interattivo");
    document.setCreator(STUDYWING_GENERATOR);
    document.setProducer(`${STUDYWING_GENERATOR} e pdf-lib`);

    for (let index = 0; index < materials.length; index++) {
      const material = materials[index];
      onProgress({
        completed: index,
        total: materials.length,
        message: `Download: ${material.chapter}`,
      });

      try {
        const response = await fetchImpl(material.url);

        if (!response.ok) {
          throw new Error(`Download non riuscito (HTTP ${response.status})`);
        }

        const bytes = new Uint8Array(await response.arrayBuffer());
        const source = await PDFDocument.load(bytes, {
          ignoreEncryption: true,
          updateMetadata: false,
        });
        const sourceIndices = source.getPageIndices();

        if (!sourceIndices.length) {
          throw new Error("Il PDF non contiene pagine");
        }

        const copiedPages = await document.copyPages(source, sourceIndices);
        let firstPage = null;

        for (const copiedPage of copiedPages) {
          const addedPage = document.addPage(copiedPage);
          firstPage ||= addedPage;
        }

        included.push({
          chapter: material.chapter,
          chapterTitle: material.chapterTitle,
          section: material.section,
          firstPage,
          pageCount: copiedPages.length,
        });
      } catch (error) {
        failures.push({
          chapter: material.chapter,
          reason: error?.message || "Errore PDF sconosciuto",
          cacheKey: material.cacheKey || null,
        });
      }

      onProgress({
        completed: index + 1,
        total: materials.length,
        message: `Elaborata: ${material.chapter}`,
      });
    }

    if (!included.length) {
      throw new Error("Non è stato possibile scaricare e unire nessuna dispensa.");
    }

    onProgress({
      completed: materials.length,
      total: materials.length,
      message: "Creazione dell’indice interattivo e dei segnalibri…",
    });

    addInteractiveIndex(document, courseTitle, included, regular, bold);
    addBookmarks(document, included);

    const bytes = await document.save({
      addDefaultPage: false,
      useObjectStreams: true,
    });

    return {
      bytes,
      filename: filenameFor(courseTitle),
      included,
      failures,
    };
  }

  globalThis.PegasoPdfCore = {
    buildCoursePdf,
    filenameFor,
    __testing: { chapterLabelFor, groupBySection, sectionLabelFor },
  };
})();

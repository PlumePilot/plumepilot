function offlineQuizRuntime(DATA) {
  let current = 0;
  const results = new Map();
  const byId = (id) => document.getElementById(id);
  const decodeNotes = (value) =>
    JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(value), (character) => character.charCodeAt(0)),
      ),
    );
  const encodeNotes = (value) =>
    btoa(
      Array.from(new TextEncoder().encode(JSON.stringify(value)), (byte) =>
        String.fromCharCode(byte),
      ).join(""),
    );
  const notes = new Map(
    Object.entries(decodeNotes(byId("notes-data").textContent || "e30=")),
  );
  const statuses = { verified: "Verificata", review: "Da rivedere", verify: "Da verificare" };
  let filter = "all";
  const hasText = (value) => Boolean(value && value.replace(/<[^>]*>/g, "").trim());
  const hasNotes = (note) => Boolean(note && (
    hasText(note.explanationHtml || note.explanation) ||
    hasText(note.observationsHtml || note.observations)
  ));
  function cleanHtml(source) {
    const allowed = new Set(["B", "STRONG", "I", "EM", "U", "S", "UL", "OL", "LI", "SUP", "SUB", "BR", "DIV", "P", "SPAN"]);
    const styles = new Set(["yellow", "green", "blue", "pink"]);
    const blocks = new Set(["important", "attention", "review"]);
    const doc = new DOMParser().parseFromString("<body>" + source + "</body>", "text/html");
    function clean(node) {
      if (node.nodeType === 3) return document.createTextNode(node.textContent);
      if (node.nodeType !== 1) return document.createDocumentFragment();
      const fragment = document.createDocumentFragment();
      if (!allowed.has(node.tagName)) {
        // Unknown markup is discarded along with its content.
        return fragment;
      }
      const element = document.createElement(node.tagName.toLowerCase());
      if (node.tagName === "SPAN") {
        if (node.classList.contains("study-mask")) element.className = "study-mask";
        else if (node.classList.contains("highlight") && styles.has(node.dataset.color)) {
          element.className = "highlight";
          element.dataset.color = node.dataset.color;
        }
      }
      if (node.tagName === "DIV" && node.classList.contains("callout") && blocks.has(node.dataset.kind)) {
        element.className = "callout";
        element.dataset.kind = node.dataset.kind;
      }
      if (node.tagName === "UL" && node.classList.contains("checklist")) element.className = "checklist";
      if (node.tagName === "LI" && node.classList.contains("checked")) element.className = "checked";
      for (const child of node.childNodes) element.appendChild(clean(child));
      return element;
    }
    const result = document.createElement("div");
    for (const child of doc.body.childNodes) result.appendChild(clean(child));
    return result.innerHTML;
  }
  function updateReview() {
    const counts = { verified: 0, review: 0, verify: 0, plain: 0, observations: 0 };
    for (const test of DATA.tests) for (const question of test.questions) {
      const entry = notes.get(question.noteKey) || {};
      if (statuses[entry.status]) counts[entry.status]++;
      else counts.plain++;
      if (hasText(entry.observationsHtml || entry.observations)) counts.observations++;
    }
    byId("reviewCounts").textContent = DATA.tests.reduce((sum, test) => sum + test.questions.length, 0) +
      " domande · " + counts.verified + " verificate · " + counts.review +
      " da rivedere · " + counts.verify + " da verificare · " + counts.plain + " normali";
    byId("reviewFilter").value = filter;
    byId("reviewFilter").querySelector('[value="observations"]').textContent =
      "Con osservazioni (" + counts.observations + ")";
  }
  const symbols = [
    "α",
    "β",
    "γ",
    "Δ",
    "π",
    "√",
    "∞",
    "≤",
    "≥",
    "≠",
    "±",
    "×",
    "÷",
    "∫",
    "∑",
    "²",
  ];
  const shuffled = (items) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  function setTheme(theme) {
    const value = ["auto", "light", "dark"].includes(theme) ? theme : "auto";
    document.documentElement.dataset.theme = value;
    byId("themeSelect").value = value;
  }
  function mountThemeControl() {
    let select = byId("themeSelect");
    if (!select) {
      const label = document.createElement("label");
      label.className = "theme-control";
      label.append("Tema ");
      select = document.createElement("select");
      select.id = "themeSelect";
      for (const [value, text] of [
        ["auto", "Automatico"],
        ["light", "Chiaro"],
        ["dark", "Scuro"],
      ]) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        select.appendChild(option);
      }
      label.appendChild(select);
      document.querySelector(".options").appendChild(label);
    }
    select.onchange = (event) => setTheme(event.target.value);
    setTheme(document.documentElement.dataset.theme);
  }
  function chapterScore() {
    const output = byId("chapterScore");
    const result = results.get(current);
    if (!result) {
      output.hidden = true;
      output.textContent = "";
      return;
    }
    const questions =
      Number(result.questions) || DATA.tests[current].questions.length;
    output.textContent =
      "Risultato capitolo: " + result.right + " / " + questions;
    output.hidden = false;
  }
  function score() {
    let right = 0,
      total = 0;
    for (const value of results.values()) {
      right += value.right;
      total += value.total;
    }
    byId("score").textContent = total
      ? right + " / " + total + " risposte corrette verificate"
      : "Nessun capitolo verificato";
    chapterScore();
  }
  function nav() {
    byId("title").textContent = DATA.courseTitle;
    byId("nav").replaceChildren(
      ...DATA.tests.map((test, index) => {
        const b = document.createElement("button");
        b.className = "chapter" + (index === current ? " active" : "");
        b.textContent = test.displayLessonNumber + " · " + test.chapterTitle;
        b.onclick = () => {
          current = index;
          render();
          const heading = byId("chapterTitle");
          heading.focus({ preventScroll: true });
          heading.scrollIntoView({ block: "start" });
        };
        return b;
      }),
    );
  }
  function appendImages(parent, images, className) {
    (images || []).forEach((image) => {
      if (image.dataUrl) {
        const element = document.createElement("img");
        element.className = className;
        element.src = image.dataUrl;
        element.alt = image.title || "Immagine del test";
        parent.appendChild(element);
      } else {
        const missing = document.createElement("div");
        missing.className = "image-missing";
        missing.textContent =
          "Immagine non disponibile: " + (image.title || "immagine del test");
        parent.appendChild(missing);
      }
    });
  }
  function saveNote(question, field, value) {
    const previous = notes.get(question.noteKey) || {
      explanation: "",
      observations: "",
    };
    const next = { ...previous, [field]: value };
    if (field.endsWith("Html")) next[field.slice(0, -4)] = "";
    const present = hasNotes(next);
    if (present || statuses[next.status]) notes.set(question.noteKey, next);
    else notes.delete(question.noteKey);
    updateReview();
    return present;
  }
  function reviewControl(question) {
    const label = document.createElement("label");
    label.className = "review-control";
    label.append("Stato personale ");
    const select = document.createElement("select");
    for (const [value, text] of [["", "Normale"], ...Object.entries(statuses)]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      select.appendChild(option);
    }
    select.value = notes.get(question.noteKey)?.status || "";
    select.onchange = () => {
      saveNote(question, "status", select.value);
      if (filter !== "all") render();
    };
    label.appendChild(select);
    return label;
  }
  function noteEditor(question) {
    const saved = notes.get(question.noteKey) || {
      explanation: "",
      observations: "",
    };
    const details = document.createElement("details");
    details.className = "personal-notes";
    details.open = false;
    details.dataset.hasNotes = String(hasNotes(saved));
    const summary = document.createElement("summary");
    summary.append("Spiegazione e osservazioni");
    const indicator = document.createElement("span");
    indicator.className = "notes-indicator";
    indicator.textContent = "Appunti presenti";
    summary.appendChild(indicator);
    details.appendChild(summary);
    let activeField = null;
    let selectedRange = null;
    const rememberSelection = () => {
      const selection = window.getSelection();
      if (activeField && selection.rangeCount && activeField.contains(selection.anchorNode) &&
          activeField.contains(selection.focusNode)) selectedRange = selection.getRangeAt(0).cloneRange();
    };
    function runCommand(editor, command, value) {
      editor.focus();
      if (selectedRange && editor.contains(selectedRange.commonAncestorContainer)) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(selectedRange);
      }
      document.execCommand(command, false, value);
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      rememberSelection();
    }
    function wrapSelection(editor, className, key, value) {
      if (!selectedRange || selectedRange.collapsed || !editor.contains(selectedRange.commonAncestorContainer)) return;
      const range = selectedRange.cloneRange();
      if (range.startContainer.parentElement?.closest("div,li,p") !==
          range.endContainer.parentElement?.closest("div,li,p")) return;
      const wrapper = document.createElement("span");
      wrapper.className = className;
      if (key) wrapper.dataset[key] = value;
      try {
        wrapper.appendChild(range.extractContents());
        range.insertNode(wrapper);
        editor.dispatchEvent(new Event("input", { bubbles: true }));
        selectedRange = null;
      } catch { /* Selection crossed incompatible blocks. */ }
    }
    function button(bar, title, action) {
      const item = document.createElement("button");
      item.type = "button";
      const short = {
        Grassetto: "B", Corsivo: "I", Sottolineato: "U", Barrato: "S",
        "Elenco puntato": "•", "Elenco numerato": "1.", Apice: "x²",
        Pedice: "x₂", Annulla: "↶", Ripristina: "↷",
        "Rimuovi formattazione": "Tx", "Nascondi per ripasso": "🙈 Nascondi",
        Checklist: "☐", "Callout Importante": "💡", "Callout Attenzione": "⚠",
        "Callout Da ripassare": "🔁", "Evidenzia yellow": "🖍 Giallo",
        "Evidenzia green": "Verde", "Evidenzia blue": "Azzurro",
        "Evidenzia pink": "Rosa",
      };
      item.textContent = short[title] || title;
      item.title = title;
      item.setAttribute("aria-label", title);
      item.addEventListener("mousedown", (event) => event.preventDefault());
      item.onclick = () => { if (activeField) action(activeField); };
      bar.appendChild(item);
    }
    for (const [field, labelText] of [
      ["explanation", "Spiegazione"],
      ["observations", "Osservazioni"],
    ]) {
      const label = document.createElement("div");
      label.className = "note-field";
      const heading = document.createElement("span");
      heading.textContent = labelText;
      label.appendChild(heading);
      const editor = document.createElement("div");
      editor.className = "note-editor";
      editor.contentEditable = "true";
      editor.setAttribute("role", "textbox");
      editor.setAttribute("aria-label", labelText);
      editor.setAttribute("aria-multiline", "true");
      editor.dataset.placeholder =
        field === "explanation"
          ? "Scrivi il procedimento o il motivo della risposta…"
          : "Aggiungi dubbi, collegamenti o promemoria…";
      if (saved[field + "Html"]) editor.innerHTML = cleanHtml(saved[field + "Html"]);
      else editor.textContent = saved[field] || "";
      editor.addEventListener("focus", () => {
        activeField = editor;
      });
      editor.addEventListener("keyup", rememberSelection);
      editor.addEventListener("mouseup", rememberSelection);
      editor.addEventListener("paste", (event) => {
        event.preventDefault();
        document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
      });
      editor.addEventListener("click", (event) => {
        const mask = event.target.closest(".study-mask");
        if (mask && editor.contains(mask)) {
          mask.classList.toggle("revealed");
          return;
        }
        const item = event.target.closest(".checklist > li");
        if (item && editor.contains(item) && event.clientX < item.getBoundingClientRect().left) {
          item.classList.toggle("checked");
          editor.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });
      editor.addEventListener("input", () => {
        details.dataset.hasNotes = String(
          saveNote(question, field + "Html", cleanHtml(editor.innerHTML)),
        );
      });
      const tools = document.createElement("div");
      tools.className = "editor-tools";
      tools.setAttribute("aria-label", "Formattazione " + labelText);
      for (const [name, command] of [
        ["Grassetto", "bold"], ["Corsivo", "italic"], ["Sottolineato", "underline"],
        ["Barrato", "strikeThrough"], ["Elenco puntato", "insertUnorderedList"],
        ["Elenco numerato", "insertOrderedList"], ["Apice", "superscript"], ["Pedice", "subscript"],
        ["Annulla", "undo"], ["Ripristina", "redo"], ["Rimuovi formattazione", "removeFormat"],
      ]) button(tools, name, (target) => runCommand(target, command));
      for (const color of ["yellow", "green", "blue", "pink"]) {
        button(tools, "Evidenzia " + color, (target) => wrapSelection(target, "highlight", "color", color));
      }
      button(tools, "Nascondi per ripasso", (target) => wrapSelection(target, "study-mask"));
      button(tools, "Checklist", (target) => {
        runCommand(target, "insertUnorderedList");
        const list = target.querySelector("ul:last-of-type");
        if (list) { list.classList.add("checklist"); target.dispatchEvent(new Event("input", { bubbles: true })); }
      });
      for (const [kind, title] of [["important", "Importante"], ["attention", "Attenzione"], ["review", "Da ripassare"]]) {
        button(tools, "Callout " + title, (target) => {
          runCommand(target, "formatBlock", "div");
          const block = window.getSelection()?.anchorNode?.parentElement?.closest("div");
          if (block && target.contains(block) && block !== target) {
            block.className = "callout";
            block.dataset.kind = kind;
            target.dispatchEvent(new Event("input", { bubbles: true }));
          }
        });
      }
      label.append(tools, editor);
      details.appendChild(label);
      if (!activeField) activeField = editor;
    }
    const bar = document.createElement("div");
    bar.className = "symbol-bar";
    bar.setAttribute("aria-label", "Simboli matematici");
    for (const symbol of symbols) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = symbol;
      button.title = "Inserisci " + symbol;
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => {
        const field = activeField;
        if (!field) return;
        runCommand(field, "insertText", symbol);
      });
      bar.appendChild(button);
    }
    details.appendChild(bar);
    return details;
  }
  function render() {
    nav();
    const test = DATA.tests[current];
    byId("chapterTitle").textContent = test.section + " — " + test.chapterTitle;
    const questions = byId("shuffleQuestions").checked
      ? shuffled(test.questions)
      : [...test.questions];
    const visible = filter === "all" ? questions.map((question) => ({ question, chapter: test.chapterTitle }))
      : DATA.tests.flatMap((part) => part.questions.filter((question) => {
          const entry = notes.get(question.noteKey) || {};
          return filter === "observations" ? hasText(entry.observationsHtml || entry.observations) : entry.status === filter;
        }).map((question) => ({ question, chapter: part.chapterTitle })));
    if (filter !== "all") byId("chapterTitle").textContent = "Domande filtrate — " + byId("reviewFilter").selectedOptions[0].textContent;
    byId("check").disabled = filter !== "all";
    byId("reset").disabled = filter !== "all";
    const container = byId("questions");
    container.replaceChildren();
    if (!visible.length) {
      const empty = document.createElement("p");
      empty.textContent = "Nessuna domanda per questo filtro.";
      container.appendChild(empty);
    }
    visible.forEach(({ question, chapter }, qIndex) => {
      const card = document.createElement("section");
      card.className = "question";
      card.dataset.correct = question.correctPosition;
      if (filter !== "all") {
        const location = document.createElement("small");
        location.className = "question-chapter";
        location.textContent = chapter;
        card.appendChild(location);
      }
      const h = document.createElement("h3");
      h.textContent =
        qIndex + 1 + ". " + (question.question || "Domanda in immagine");
      card.appendChild(h);
      appendImages(card, question.images, "prompt-image");
      const answers = question.answers.map((answer, index) => ({
        answer,
        position: index + 1,
      }));
      (byId("shuffleAnswers").checked ? shuffled(answers) : answers).forEach(
        ({ answer, position }, displayIndex) => {
          const label = document.createElement("label");
          label.className = "answer";
          label.dataset.position = position;
          const radio = document.createElement("input");
          radio.type = "radio";
          radio.name = "q" + qIndex;
          radio.value = position;
          const text = document.createElement("span");
          const answerText = document.createElement("span");
          answerText.textContent =
            String.fromCharCode(65 + displayIndex) +
            ". " +
            (answer.answer || "Risposta in immagine");
          text.appendChild(answerText);
          appendImages(text, answer.images, "answer-image");
          label.append(radio, text);
          card.appendChild(label);
        },
      );
      const feedback = document.createElement("div");
      feedback.className = "feedback";
      card.appendChild(feedback);
      card.appendChild(reviewControl(question));
      card.appendChild(noteEditor(question));
      container.appendChild(card);
    });
    if (byId("showSolutions").checked) reveal(false);
    updateReview();
    score();
  }
  function reveal(record = true) {
    let right = 0,
      total = 0,
      questions = 0;
    document.querySelectorAll(".question").forEach((card) => {
      questions++;
      const correct = Number(card.dataset.correct);
      const selected = Number(card.querySelector("input:checked")?.value);
      card.querySelectorAll(".answer").forEach((label) => {
        const value = Number(label.dataset.position);
        label.classList.toggle("correct", value === correct);
        label.classList.toggle(
          "wrong",
          Boolean(selected) && value === selected && value !== correct,
        );
      });
      const feedback = card.querySelector(".feedback");
      if (selected) {
        total++;
        if (selected === correct) {
          right++;
          feedback.textContent = "Risposta corretta";
        } else feedback.textContent = "Risposta errata";
      } else
        feedback.textContent = byId("showSolutions").checked
          ? "Soluzione mostrata"
          : "Nessuna risposta selezionata";
    });
    if (record) {
      results.set(current, { right, total, questions });
      score();
    }
  }
  function downloadAnnotated() {
    const clone = document.documentElement.cloneNode(true);
    clone.querySelector("#notes-data").textContent = encodeNotes(
      Object.fromEntries(notes),
    );
    const html = "<!doctype html>\\n" + clone.outerHTML;
    const url = URL.createObjectURL(
      new Blob([html], { type: "text/html;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = DATA.annotatedFilename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  byId("check").onclick = () => reveal(true);
  byId("reset").onclick = () => {
    results.delete(current);
    render();
  };
  byId("downloadNotes").onclick = downloadAnnotated;
  byId("showSolutions").onchange = () =>
    byId("showSolutions").checked ? reveal(false) : render();
  byId("shuffleQuestions").onchange = render;
  byId("shuffleAnswers").onchange = render;
  byId("reviewFilter").onchange = (event) => { filter = event.target.value; render(); };
  mountThemeControl();
  render();
}

offlineQuizRuntime(DATA);

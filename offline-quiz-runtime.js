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
    const hasNotes = Boolean(next.explanation || next.observations);
    if (hasNotes) notes.set(question.noteKey, next);
    else notes.delete(question.noteKey);
    return hasNotes;
  }
  function noteEditor(question) {
    const saved = notes.get(question.noteKey) || {
      explanation: "",
      observations: "",
    };
    const details = document.createElement("details");
    details.className = "personal-notes";
    details.open = false;
    details.dataset.hasNotes = String(
      Boolean(saved.explanation || saved.observations),
    );
    const summary = document.createElement("summary");
    summary.append("Spiegazione e osservazioni");
    const indicator = document.createElement("span");
    indicator.className = "notes-indicator";
    indicator.textContent = "Appunti presenti";
    summary.appendChild(indicator);
    details.appendChild(summary);
    let activeField = null;
    for (const [field, labelText] of [
      ["explanation", "Spiegazione"],
      ["observations", "Osservazioni"],
    ]) {
      const label = document.createElement("label");
      label.className = "note-field";
      label.append(labelText);
      const textarea = document.createElement("textarea");
      textarea.value = saved[field] || "";
      textarea.placeholder =
        field === "explanation"
          ? "Scrivi il procedimento o il motivo della risposta…"
          : "Aggiungi dubbi, collegamenti o promemoria…";
      textarea.addEventListener("focus", () => {
        activeField = textarea;
      });
      textarea.addEventListener("input", () => {
        details.dataset.hasNotes = String(
          saveNote(question, field, textarea.value),
        );
      });
      label.appendChild(textarea);
      details.appendChild(label);
      if (!activeField) activeField = textarea;
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
        const start = field.selectionStart;
        const end = field.selectionEnd;
        field.setRangeText(symbol, start, end, "end");
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.focus();
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
    const container = byId("questions");
    container.replaceChildren();
    questions.forEach((question, qIndex) => {
      const card = document.createElement("section");
      card.className = "question";
      card.dataset.correct = question.correctPosition;
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
      card.appendChild(noteEditor(question));
      container.appendChild(card);
    });
    if (byId("showSolutions").checked) reveal(false);
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
  mountThemeControl();
  render();
}

offlineQuizRuntime(DATA);

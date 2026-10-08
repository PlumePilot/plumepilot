(() => {
  "use strict";

  const gamingFonts = new WeakMap();
  function ensureGamingFont(document, url) {
    if (gamingFonts.has(document)) return gamingFonts.get(document);
    // Chromium does not register @font-face declarations inside a shadow root.
    // Register the packaged font explicitly, without adding styles to the LMS.
    const loading = document.defaultView.fetch(url).then(response => {
      if (!response.ok) throw new Error("Gaming font unavailable");
      return response.arrayBuffer();
    }).then(bytes => new document.defaultView.FontFace("Pixelify Sans", bytes,
      { style: "normal", weight: "400 700" }).load()).then(font => {
      document.fonts.add(font);
      return true;
    }).catch(() => {
      gamingFonts.delete(document);
      return false;
    });
    gamingFonts.set(document, loading);
    return loading;
  }

  // Presentation only: both menus keep their existing storage and operation owners.
  function autoplayPresentation({ skipCompleted = false, testBehavior = "ignore",
    limitEnabled = false, limit = 1, stopAt70 = false, thresholdBypassed = false } = {}) {
    const effectiveTestBehavior = limitEnabled && testBehavior === "stop" ? "ignore" : testBehavior;
    const parts = [skipCompleted ? "Solo video da completare" : "Tutti i video",
      effectiveTestBehavior === "complete" ? "Test automatici"
        : effectiveTestBehavior === "stop" ? "Stop ai test" : "Test ignorati"];
    if (stopAt70 && !thresholdBypassed) parts.push("Stop al 70%");
    if (limitEnabled) parts.push(`Limite: ${Math.max(1, Number(limit) || 1)} capitoli`);
    return {
      summary: parts.join(" · "),
      testOverride: limitEnabled && testBehavior === "stop"
        ? "Con il limite capitoli attivo, l’autoplay ignora i test invece di fermarsi. La scelta salvata resta “Fermati”." : "",
      stopHint: stopAt70 && !thresholdBypassed && limitEnabled
        ? "Lo stop al 70% ha la precedenza sul limite capitoli e termina l’attività corrente."
        : stopAt70 && thresholdBypassed ? "Per questo corso hai scelto di continuare oltre il 70%."
          : "Lo stop al 70% termina l’attività corrente prima di fermarsi.",
    };
  }

  function bindCourseNavigation(root, scrollElement, onChange = () => {}) {
    const home = root.querySelector("[data-ux-home]");
    const detail = root.querySelector("[data-ux-detail]");
    const opener = root.querySelector("[data-ux-open]");
    const back = root.querySelector("[data-ux-back]");
    let homeScroll = 0;
    const close = (focus = true) => {
      if (detail.hidden) return false;
      detail.hidden = true;
      home.hidden = false;
      opener.setAttribute("aria-expanded", "false");
      if (focus) {
        opener.focus({ preventScroll: true });
        if (scrollElement) scrollElement.scrollTop = homeScroll;
      }
      onChange();
      return true;
    };
    opener.addEventListener("click", () => {
      homeScroll = scrollElement?.scrollTop || 0;
      home.hidden = true;
      detail.hidden = false;
      opener.setAttribute("aria-expanded", "true");
      if (scrollElement) scrollElement.scrollTop = 0;
      detail.querySelector("[data-ux-detail-title]").focus({ preventScroll: true });
      onChange();
    });
    back.addEventListener("click", () => close());
    root.addEventListener("keydown", event => {
      if (event.key === "Escape" && close()) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
    return { close, reset: () => close(false) };
  }

  function bindExpansionScroll(root, scrollElement, onLayout = () => {}) {
    const document = root.ownerDocument || root;
    const window = document.defaultView;
    const reveal = (panel, opener) => {
      if (!panel.getClientRects().length || !opener.getClientRects().length) return;
      onLayout();
      const isDocument = scrollElement === document.scrollingElement;
      const viewport = isDocument ? { top: 0, bottom: window.innerHeight }
        : scrollElement.getBoundingClientRect();
      // The popup header stays fixed while its document scrolls.
      const header = isDocument ? root.querySelector(".popup-sticky-header") : null;
      const top = Math.max(viewport.top, header?.getBoundingClientRect().bottom || 0) + 10;
      const bottom = viewport.bottom - 10;
      const panelRect = panel.getBoundingClientRect();
      const openerRect = opener.getBoundingClientRect();
      const start = Math.min(openerRect.top, panelRect.top);
      let delta = 0;
      if (panelRect.bottom > bottom) {
        // For long sections show their beginning, keeping the opener in view.
        delta = Math.min(panelRect.bottom - bottom, Math.max(0, start - top));
      } else if (start < top) delta = start - top;
      if (Math.abs(delta) < 1) return;
      scrollElement.scrollTo({ top: scrollElement.scrollTop + delta,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    };
    // Capture before the native <details> default action and existing handlers.
    // Only user-triggered openings scroll; restoration and closing do not.
    root.addEventListener("click", event => {
      const summary = event.target.closest?.("summary");
      const details = summary?.parentElement;
      const button = event.target.closest?.("[aria-expanded][aria-controls]");
      let panel, opener, isOpen;
      if (details?.tagName === "DETAILS" && !details.open) {
        panel = details;
        opener = summary;
        isOpen = () => details.open;
      } else if (button && button.getAttribute("aria-expanded") === "false"
        && !button.matches("[data-ux-open], [role=tab], .launcher")) {
        panel = root.getElementById(button.getAttribute("aria-controls"));
        opener = button;
        isOpen = () => button.getAttribute("aria-expanded") === "true" && !panel.hidden;
      }
      if (!panel) return;
      window.requestAnimationFrame(() => {
        if (!isOpen()) return;
        const animations = panel.getAnimations().filter(animation =>
          animation.effect?.getComputedTiming().iterations !== Infinity);
        Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
          window.requestAnimationFrame(() => {
            if (isOpen()) reveal(panel, opener);
          });
        });
      });
    }, true);
  }

  const operationItems = { turbo: "complete-tests", objectives: "complete-objectives",
    tests: "test-collection", materials: "study-materials" };
  function applyActionLayout(root, value, operation) {
    const layoutApi = globalThis.PlumePilotFloatingMenuLayout;
    const layout = layoutApi.normalizeLayout(value);
    const activeItem = operationItems[operation?.kind];
    for (const group of root.querySelectorAll("[data-menu-group]")) {
      for (const item of layout.items) {
        const node = group.querySelector(`[data-menu-item="${item.id}"]`);
        if (!node) continue;
        // A saved hidden action must never hide its cancellation control.
        node.hidden = !item.visible && item.id !== activeItem;
        group.append(node);
      }
      const section = group.closest("[data-menu-section]");
      section.hidden = ![...group.children].some(node => !node.hidden);
      if (group.dataset.menuGroup === "completion" && ["turbo", "objectives"].includes(operation?.kind))
        section.open = true;
    }
  }

  function bindLayoutEditor(list, reset, onChange) {
    const api = globalThis.PlumePilotFloatingMenuLayout;
    let value = api.normalizeLayout(null);
    let draggedId = null;
    const groupFor = id => ["complete-tests", "complete-objectives"].includes(id) ? "completion" : "materials";
    const render = next => {
      value = api.normalizeLayout(next);
      const document = list.ownerDocument;
      const focused = list.getRootNode().activeElement;
      const focusedId = focused?.closest?.("[data-layout-item]")?.dataset.layoutItem;
      const focusedDirection = focused?.dataset.direction;
      const rows = [];
      for (const [group, title] of [["materials", "Materiali per lo studio"], ["completion", "Completamento del corso"]]) {
        const heading = document.createElement("li");
        heading.className = "ux-layout-heading";
        heading.textContent = title;
        rows.push(heading);
        const items = value.items.filter(item => groupFor(item.id) === group);
        items.forEach((item, index) => {
          const definition = api.definitionFor(item.id);
          const row = document.createElement("li");
          row.className = "floating-menu-layout-item";
          row.dataset.layoutItem = item.id;
          row.draggable = true;
          const handle = document.createElement("span");
          handle.className = "floating-menu-layout-handle";
          handle.textContent = "⋮⋮";
          handle.setAttribute("aria-hidden", "true");
          const label = document.createElement("label");
          const input = document.createElement("input");
          input.type = "checkbox";
          input.checked = item.visible;
          const text = document.createElement("span");
          text.textContent = definition.label;
          label.append(input, text);
          const moves = document.createElement("span");
          moves.className = "floating-menu-layout-moves";
          for (const direction of ["up", "down"]) {
            const button = document.createElement("button");
            button.type = "button";
            button.dataset.direction = direction;
            button.textContent = direction === "up" ? "↑" : "↓";
            button.disabled = direction === "up" ? index === 0 : index === items.length - 1;
            button.setAttribute("aria-label", `Sposta ${definition.label} ${direction === "up" ? "verso l’alto" : "verso il basso"}`);
            moves.append(button);
          }
          row.append(handle, label, moves);
          rows.push(row);
        });
      }
      list.replaceChildren(...rows);
      if (focusedId) {
        const selector = focusedDirection ? `[data-direction="${focusedDirection}"]` : "input";
        const row = list.querySelector(`[data-layout-item="${focusedId}"]`);
        const control = row?.querySelector(selector);
        (control?.disabled ? row.querySelector("input") : control)?.focus({ preventScroll: true });
      }
    };
    const move = (id, otherId, after = false) => {
      if (id === otherId || groupFor(id) !== groupFor(otherId)) return;
      const items = value.items.filter(item => item.id !== id);
      const item = value.items.find(item => item.id === id);
      const index = items.findIndex(item => item.id === otherId);
      if (!item || index < 0) return;
      items.splice(index + Number(after), 0, item);
      render({ version: api.VERSION, items });
      onChange(value, true);
    };
    list.addEventListener("change", event => {
      const row = event.target.closest("[data-layout-item]");
      if (!row || event.target.type !== "checkbox") return;
      value.items.find(item => item.id === row.dataset.layoutItem).visible = event.target.checked;
      onChange(value, true);
    });
    list.addEventListener("click", event => {
      const button = event.target.closest("[data-direction]");
      if (!button || button.disabled) return;
      const id = button.closest("[data-layout-item]").dataset.layoutItem;
      const items = value.items.filter(item => groupFor(item.id) === groupFor(id));
      const index = items.findIndex(item => item.id === id);
      move(id, items[index + (button.dataset.direction === "up" ? -1 : 1)]?.id,
        button.dataset.direction === "down");
      const row = list.querySelector(`[data-layout-item="${id}"]`);
      const control = row.querySelector(`[data-direction="${button.dataset.direction}"]`);
      (control.disabled ? row.querySelector("input") : control).focus({ preventScroll: true });
    });
    list.addEventListener("dragstart", event => {
      draggedId = event.target.closest("[data-layout-item]")?.dataset.layoutItem || null;
      if (draggedId) event.dataTransfer.setData("text/plain", draggedId);
    });
    list.addEventListener("dragover", event => {
      const target = event.target.closest("[data-layout-item]");
      if (draggedId && target && groupFor(draggedId) === groupFor(target.dataset.layoutItem)) event.preventDefault();
    });
    list.addEventListener("drop", event => {
      const target = event.target.closest("[data-layout-item]");
      if (!draggedId || !target) return;
      event.preventDefault();
      const rect = target.getBoundingClientRect();
      move(draggedId, target.dataset.layoutItem, event.clientY > rect.top + rect.height / 2);
      draggedId = null;
    });
    list.addEventListener("dragend", () => { draggedId = null; });
    reset.addEventListener("click", () => {
      render(api.DEFAULT_LAYOUT);
      onChange(value, false);
    });
    render(value);
    return { render };
  }

  globalThis.PlumePilotMenuUx = Object.freeze({ autoplayPresentation, bindCourseNavigation,
    bindExpansionScroll, ensureGamingFont, applyActionLayout, bindLayoutEditor });
})();

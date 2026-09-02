(() => {
  "use strict";

  if (window !== window.top || window.StudyWingNotifications) return;

  const TOAST_ID = "studywing-notification-toast";
  const FADE_DURATION_MS = 2500;
  const hiddenProgressKeys = new Set();
  let fadeTimer = null;
  let current = null;

  const durations = { success: 8000, info: 8000, warning: 12000, error: 15000 };

  function ensureToast() {
    let toast = document.getElementById(TOAST_ID);
    if (toast) return toast;
    toast = document.createElement("div");
    toast.id = TOAST_ID;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    Object.assign(toast.style, {
      position: "fixed", right: "20px", bottom: "20px", zIndex: "2147483647",
      width: "min(390px, calc(100vw - 40px))", boxSizing: "border-box",
      padding: "12px 42px 12px 16px", borderRadius: "10px", color: "#ffffff",
      background: "#5b2ca0", boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
      fontFamily: "system-ui, sans-serif", fontSize: "14px", lineHeight: "1.4",
      whiteSpace: "pre-line", opacity: "1", transition: `opacity ${FADE_DURATION_MS}ms ease-in-out`,
      cursor: "default",
    });
    const text = document.createElement("span");
    text.dataset.role = "message";
    Object.assign(text.style, {
      display: "-webkit-box", overflow: "hidden", WebkitBoxOrient: "vertical",
      WebkitLineClamp: "3",
    });
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.dataset.role = "toggle";
    toggle.textContent = "Mostra altro";
    toggle.hidden = true;
    toggle.setAttribute("aria-label", "Mostra il messaggio completo");
    Object.assign(toggle.style, {
      position: "absolute", right: "13px", bottom: "6px", padding: "2px 4px",
      border: "0", color: "inherit", background: "transparent",
      font: "650 11px/1.3 system-ui, sans-serif", textDecoration: "underline", cursor: "pointer",
    });
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "×";
    close.setAttribute("aria-label", "Nascondi il messaggio");
    close.title = "Nascondi";
    Object.assign(close.style, {
      position: "absolute", top: "6px", right: "7px", width: "28px", height: "28px",
      padding: "0", border: "0", borderRadius: "7px", color: "inherit",
      background: "transparent", font: "700 21px/28px system-ui, sans-serif", cursor: "pointer",
    });
    close.addEventListener("mouseenter", () => { close.style.background = "rgba(255,255,255,.16)"; });
    close.addEventListener("mouseleave", () => { close.style.background = "transparent"; });
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      dismiss(true);
    });
    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleExpansion();
    });
    toast.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      toggleExpansion();
    });
    toast.addEventListener("mouseenter", () => {
      clearTimeout(fadeTimer);
      fadeTimer = null;
      toast.style.opacity = "1";
    });
    toast.addEventListener("mouseleave", () => {
      if (current?.terminal && !current.expanded) scheduleFade(current.durationMs);
    });
    toast.append(text, toggle, close);
    document.body.appendChild(toast);
    return toast;
  }

  function applyExpansion(toast, expanded) {
    const text = toast.querySelector('[data-role="message"]');
    const toggle = toast.querySelector('[data-role="toggle"]');
    const canExpand = toggle.hidden !== true;
    const active = canExpand && expanded === true;
    current.expanded = active;
    toast.setAttribute("aria-expanded", String(active));
    toast.style.cursor = canExpand ? "pointer" : "default";
    toast.style.paddingBottom = canExpand ? "31px" : "12px";
    text.style.display = active ? "block" : "-webkit-box";
    text.style.overflow = active ? "visible" : "hidden";
    text.style.WebkitLineClamp = active ? "unset" : "3";
    toggle.textContent = active ? "Mostra meno" : "Mostra altro";
    toggle.setAttribute(
      "aria-label",
      active ? "Riduci il messaggio" : "Mostra il messaggio completo",
    );
  }

  function toggleExpansion() {
    const toast = document.getElementById(TOAST_ID);
    if (!toast || !current || toast.querySelector('[data-role="toggle"]').hidden) return;
    const expand = current.expanded !== true;
    clearTimeout(fadeTimer);
    fadeTimer = null;
    toast.style.opacity = "1";
    applyExpansion(toast, expand);
    if (!expand && current.terminal) scheduleFade(current.durationMs);
  }

  function refreshOverflow(toast, message, preserveExpanded) {
    const text = toast.querySelector('[data-role="message"]');
    const toggle = toast.querySelector('[data-role="toggle"]');
    text.style.display = "-webkit-box";
    text.style.overflow = "hidden";
    text.style.WebkitLineClamp = "3";
    toast.style.paddingBottom = "12px";
    requestAnimationFrame(() => {
      if (!current || current.message !== message || !toast.isConnected) return;
      const overflowed = text.scrollHeight > text.clientHeight + 1;
      toggle.hidden = !overflowed;
      applyExpansion(toast, overflowed && preserveExpanded);
    });
  }

  function colorFor(type) {
    if (type === "error") return "#991b1b";
    if (type === "warning") return "#92400e";
    if (type === "success") return "#166534";
    return "#5b2ca0";
  }

  function dismiss(byUser = false) {
    clearTimeout(fadeTimer);
    fadeTimer = null;
    if (byUser && current?.progress && current.key) hiddenProgressKeys.add(current.key);
    document.getElementById(TOAST_ID)?.remove();
    current = null;
  }

  function scheduleFade(delayMs) {
    clearTimeout(fadeTimer);
    const toast = document.getElementById(TOAST_ID);
    if (!toast || !current?.terminal) return;
    toast.style.opacity = "1";
    fadeTimer = setTimeout(() => {
      const activeToast = document.getElementById(TOAST_ID);
      if (!activeToast || !current?.terminal) return;
      activeToast.style.opacity = "0";
      fadeTimer = setTimeout(() => dismiss(false), FADE_DURATION_MS + 80);
    }, Math.max(0, Number(delayMs) || 0));
  }

  function show({ message, type = "info", key = "", progress = false, terminal = false, durationMs } = {}) {
    const normalizedMessage = String(message || "").trim();
    const normalizedKey = String(key || "");
    if (!normalizedMessage) return;
    if (progress && normalizedKey && hiddenProgressKeys.has(normalizedKey)) return;
    if (terminal && normalizedKey) hiddenProgressKeys.delete(normalizedKey);
    clearTimeout(fadeTimer);
    fadeTimer = null;
    const toast = ensureToast();
    const normalizedType = ["success", "warning", "error"].includes(type) ? type : "info";
    const preserveExpanded = current?.key === normalizedKey &&
      current?.progress === true && progress === true && current?.expanded === true;
    current = {
      message: normalizedMessage, type: normalizedType, key: normalizedKey,
      progress: progress === true, terminal: terminal === true,
      durationMs: Number(durationMs) || durations[normalizedType],
      expanded: false,
    };
    toast.querySelector('[data-role="message"]').textContent = normalizedMessage;
    toast.style.background = colorFor(normalizedType);
    toast.style.opacity = "1";
    refreshOverflow(toast, normalizedMessage, preserveExpanded);
    if (current.terminal) {
      window.postMessage({
        type: "STUDYWING_NOTIFICATION_UPDATED",
        notification: { message: normalizedMessage, level: normalizedType, createdAt: Date.now() },
      }, "*");
      scheduleFade(current.durationMs);
    }
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.type !== "STUDYWING_SHOW_NOTIFICATION") return;
    show(event.data.notification || {});
  });

  window.StudyWingNotifications = { show, dismiss };
})();

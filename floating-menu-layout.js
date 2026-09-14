(() => {
  "use strict";

  const STORAGE_KEY = "floatingMenuLayout";
  const VERSION = 1;
  const ITEMS = Object.freeze([
    Object.freeze({ id: "complete-tests", action: "turbo", label: "Completa tutti i test" }),
    Object.freeze({ id: "complete-objectives", action: "objectives", label: "Completa tutti gli Obiettivi" }),
    Object.freeze({ id: "test-collection", action: "test-collection", label: "Crea raccolta test" }),
    Object.freeze({ id: "study-materials", action: "materials", label: "Esporta dispense del corso" }),
  ]);
  const DEFAULT_LAYOUT = Object.freeze({
    version: VERSION,
    items: Object.freeze(ITEMS.map((item) => Object.freeze({ id: item.id, visible: true }))),
  });

  function normalizeLayout(value) {
    const saved = Array.isArray(value?.items) ? value.items : [];
    const savedById = new Map();
    for (const item of saved) {
      if (!item || typeof item.id !== "string" || savedById.has(item.id)) continue;
      savedById.set(item.id, item);
    }

    const items = [];
    for (const savedItem of saved) {
      const definition = ITEMS.find((item) => item.id === savedItem?.id);
      if (!definition || items.some((item) => item.id === definition.id)) continue;
      items.push({ id: definition.id, visible: savedItem.visible !== false });
    }
    for (const definition of ITEMS) {
      if (items.some((item) => item.id === definition.id)) continue;
      const savedItem = savedById.get(definition.id);
      items.push({ id: definition.id, visible: savedItem?.visible !== false });
    }
    return { version: VERSION, items };
  }

  function isDefaultLayout(value) {
    const normalized = normalizeLayout(value);
    return normalized.items.every((item, index) =>
      item.id === DEFAULT_LAYOUT.items[index].id && item.visible === true
    );
  }

  function definitionFor(id) {
    return ITEMS.find((item) => item.id === id) || null;
  }

  globalThis.PlumePilotFloatingMenuLayout = Object.freeze({
    STORAGE_KEY,
    VERSION,
    ITEMS,
    DEFAULT_LAYOUT,
    normalizeLayout,
    isDefaultLayout,
    definitionFor,
  });
})();

// Pausa? — deterministic 90-second graybox. Times mark when an item reaches Plume.
(() => {
  "use strict";

  const duration = 90;
  const collectibles = [];
  const beats = [
    "Prendi confidenza con il volo", "Prime dispense", "Percorso libero",
    "La prima pila di libri", "Alterna alto e basso", "Prima nuvola",
    "Un tratto di respiro", "Il primo bug", "Libri e dispense",
    "Cambio di traiettoria", "Nuvola e bug", "Ritorno al centro",
    "Libri e obiettivi", "Nuvole leggere", "Un altro respiro",
    "Ultimi ostacoli", "Verso il traguardo", "Arrivo",
  ];

  // Five objects in each five-second beat. All three kinds appear before the
  // final third; the dominant kind shifts gradually across the course.
  const patterns = [
    "ddddt", "ddddo", "dddtt", "dddto", "ddtto", "ddtto",
    "ddtto", "ddtto", "dttto", "dttto", "dttoo", "dttto",
    "dttoo", "dttoo", "dtooo", "dtooo", "toooo", "ooooo",
  ];
  const codes = { d: "dispensa", t: "test", o: "obiettivo" };
  const lanes = [0.46, 0.43, 0.40, 0.47, 0.54, 0.59, 0.55, 0.48, 0.41,
    0.38, 0.44, 0.51, 0.57, 0.53, 0.46, 0.41, 0.48, 0.52];
  for (let beat = 0; beat < 18; beat += 1) {
    for (let i = 0; i < 5; i += 1) {
      const type = codes[patterns[beat][i]];
      collectibles.push({ time: beat * 5 + 0.9 + i * 0.83,
        type, y: Math.max(0.30, Math.min(0.70, lanes[beat] + (i - 2) * 0.024)) });
    }
  }

  const hazards = [
    { time: 18, type: "books", y: 0.82 }, { time: 25, type: "cloud", y: 0.17 },
    { time: 32, type: "books", y: 0.83 }, { time: 38, type: "bug", y: 0.67 },
    { time: 44, type: "cloud", y: 0.17 }, { time: 50, type: "books", y: 0.82 },
    { time: 55, type: "bug", y: 0.33 }, { time: 61, type: "cloud", y: 0.17 },
    { time: 67, type: "books", y: 0.82 }, { time: 73, type: "bug", y: 0.67 },
    { time: 78, type: "cloud", y: 0.17 }, { time: 82, type: "books", y: 0.82 },
  ];
  globalThis.PausaLevel = Object.freeze({ duration, beats, collectibles, hazards });
})();

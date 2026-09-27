// Pausa? — deterministic level. Times are when an object reaches Plume's x.
// The hand-drawn map is a guide to the rhythm, not a literal object count.
(() => {
  "use strict";
  const duration = 90;
  const beats = [
    "Primi comandi", "Volo libero", "Una curva gentile",
    "Prime pile", "Una nuvola", "Si sale",
    "Matita alta", "Si scende", "Libri e dispense",
    "Tra libri e nuvole", "Traiettoria bassa", "Due nuvole",
    "Passaggio centrale", "Pile più alte", "Cambio di quota",
    "Il tratto più pieno", "Ultimi ostacoli", "Arrivo",
  ];
  // Five collectibles per five-second beat, 30 of each kind overall. The
  // leading category changes gradually without imposing three rigid zones.
  const patterns = [
    "ddddt", "ddddo", "dddtt", "dddto", "ddtto", "ddtto",
    "ddtto", "ddtto", "dttto", "dttto", "dttoo", "dttto",
    "dttoo", "dttoo", "dtooo", "dtooo", "toooo", "ooooo",
  ];
  const codes = { d: "dispensa", t: "test", o: "obiettivo" };
  // Curves follow the three broad height bands in the sketch. Intermediate
  // points keep consecutive objects within a manageable flight path.
  const paths = [
    [.50,.50,.49,.48,.48], [.48,.47,.45,.44,.44], [.44,.43,.44,.45,.46],
    [.47,.46,.44,.42,.41], [.40,.40,.42,.44,.45], [.45,.43,.40,.38,.37],
    [.46,.47,.49,.50,.51], [.55,.57,.58,.56,.54], [.53,.55,.57,.60,.61],
    [.61,.62,.59,.55,.52], [.52,.54,.56,.58,.60], [.62,.62,.59,.56,.53],
    [.53,.54,.57,.61,.63], [.63,.61,.58,.54,.51], [.49,.47,.45,.47,.50],
    [.53,.56,.59,.60,.57], [.54,.51,.48,.45,.43], [.43,.45,.48,.49,.49],
  ];
  const collectibles = [];
  for (let beat = 0; beat < beats.length; beat += 1) {
    for (let i = 0; i < 5; i += 1) {
      collectibles.push({ time: beat * 5 + .85 + i * .83,
        type: codes[patterns[beat][i]], y: paths[beat][i] });
    }
  }
  // Books rise from the ground, clouds descend from the sky. Each unit is a
  // 13×9 sprite shown at 5× (65×45). Pencil flies straight in one of three
  // lanes; its rotation changes appearance, never its route.
  const hazards = [
    { time: 18.2, type: "books", count: 2 },
    { time: 21.5, type: "cloud", count: 1 },
    { time: 27.0, type: "books", count: 3 },
    { time: 31.3, type: "pencil", lane: "high" },
    { time: 36.4, type: "cloud", count: 1 },
    { time: 41.4, type: "books", count: 1 },
    { time: 46.1, type: "books", count: 2 },
    { time: 49.3, type: "cloud", count: 3 },
    { time: 54.0, type: "books", count: 2 },
    { time: 56.0, type: "pencil", lane: "low" },
    { time: 58.8, type: "cloud", count: 2 },
    { time: 62.8, type: "cloud", count: 1 },
    { time: 66.5, type: "books", count: 2 },
    { time: 69.0, type: "cloud", count: 1 },
    { time: 71.0, type: "books", count: 3 },
    { time: 74.7, type: "pencil", lane: "middle" },
    { time: 76.3, type: "cloud", count: 3 },
    { time: 77.2, type: "books", count: 2 },
    { time: 80.0, type: "cloud", count: 1 },
    { time: 81.5, type: "pencil", lane: "low" },
    { time: 84.0, type: "books", count: 3 },
    { time: 86.2, type: "cloud", count: 1 },
  ];
  globalThis.PausaLevel = Object.freeze({ duration, beats, collectibles, hazards });
})();

(() => {
  "use strict";
  const level = globalThis.PausaLevel;
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height, PX = 226, SPEED = 198;
  const UNIT_W = 52, UNIT_H = 36, SKY_TOP = 55, FLOOR = H - 31;
  const PENCIL_Y = { high: H * .27, middle: H * .50, low: H * .73 };
  const CHIRP_TIMES = [13.5, 39, 64, 83];
  const overlay = document.getElementById("overlay");
  const card = document.getElementById("card");
  const soundButton = document.getElementById("sound");
  const systemTheme = matchMedia("(prefers-color-scheme: dark)");
  const sprites = { light: new Image(), dark: new Image() };
  sprites.light.src = "../assets/gaming/mascot-idle-light.png";
  sprites.dark.src = "../assets/gaming/mascot-idle-dark.png";
  const art = Object.fromEntries(Object.entries({
    dispensa: "collect-book.png", test: "collect-test.png", obiettivo: "collect-obj.png",
    books: "enemy-books.png", cloud: "enemy-cloud.png", pencil: "enemy-pencil.png",
  }).map(([name, filename]) => {
    const sprite = new Image(); sprite.src = `assets/${filename}`; return [name, sprite];
  }));
  // Fixed, uneven star positions; no random jump between animation frames.
  const stars = [];
  let seed = 3079;
  while (stars.length < 29) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const sx = 28 + (seed % 905);
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const sy = 24 + (seed % 225);
    if (stars.every(([x, y]) => Math.hypot(x - sx, y - sy) > 24)) stars.push([sx, sy]);
  }
  const totals = { dispensa: 0, test: 0, obiettivo: 0 };
  const collected = [];
  let themePreference = "system", dark = systemTheme.matches;
  let soundEnabled = false, audioContext = null;
  let state = "ready", elapsed = 0, lastFrame = 0, y = H * .48, velocity = 0;
  let invulnerable = 0, flash = "", flashUntil = 0;
  let nextChirp = 0;
  const hitHazards = new Set(), taken = new Set();

  function resolveTheme() {
    dark = themePreference === "dark" || (themePreference === "system" && systemTheme.matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }
  function setSound(value, persist = false) {
    soundEnabled = !!value;
    soundButton.textContent = soundEnabled ? "🔊" : "🔇";
    soundButton.setAttribute("aria-label", soundEnabled ? "Disattiva audio" : "Attiva audio");
    if (persist) {
      if (globalThis.chrome?.storage?.local) chrome.storage.local.set({ pausaSoundEnabled: soundEnabled });
      else localStorage.setItem("pausaSoundEnabled", String(soundEnabled));
    }
  }
  if (globalThis.chrome?.storage?.local) {
    chrome.storage.local.get({ themePreference: "system", soundNotificationsEnabled: false, pausaSoundEnabled: null }, (values) => {
      themePreference = ["system", "light", "dark"].includes(values.themePreference) ? values.themePreference : "system";
      resolveTheme();
      setSound(values.pausaSoundEnabled === null ? values.soundNotificationsEnabled : values.pausaSoundEnabled);
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.themePreference) { themePreference = changes.themePreference.newValue; resolveTheme(); }
    });
  } else {
    setSound(localStorage.getItem("pausaSoundEnabled") === "true");
  }
  systemTheme.addEventListener("change", resolveTheme);
  resolveTheme();

  function tone(frequency, duration, type = "sine", delay = 0, volume = .065) {
    if (!soundEnabled) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      oscillator.type = type; oscillator.frequency.value = frequency;
      const start = audioContext.currentTime + delay;
      gain.gain.setValueAtTime(.001, start);
      gain.gain.linearRampToValueAtTime(volume, start + .014);
      gain.gain.exponentialRampToValueAtTime(.001, start + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(start); oscillator.stop(start + duration + .01);
    } catch { /* A browser without Web Audio keeps the game playable. */ }
  }
  function effect(name) {
    if (name === "dispensa") tone(480, .075, "sine");
    if (name === "test") tone(620, .055, "triangle");
    if (name === "obiettivo") { tone(660, .09); tone(880, .10, "sine", .07); }
    if (name === "hit") tone(150, .13, "triangle", 0, .05);
    if (name === "chirp") { tone(1240, .045, "sine", 0, .032); tone(1580, .055, "sine", .052, .026); }
    if (name === "finish") { tone(523, .13); tone(659, .13, "sine", .13); tone(784, .22, "sine", .26); }
  }
  function show(title, body, buttons) {
    overlay.hidden = false;
    card.replaceChildren();
    const heading = document.createElement("h2"); heading.textContent = title;
    const info = document.createElement("div"); info.innerHTML = body;
    const row = document.createElement("div"); row.className = "buttons";
    for (const { label, primary, onClick } of buttons) {
      const button = document.createElement("button"); button.type = "button";
      button.className = primary ? "primary" : ""; button.textContent = label;
      button.addEventListener("click", onClick); row.append(button);
    }
    card.append(heading, info, row);
  }
  function reset() {
    // Unlock Web Audio on the start/retry gesture when the initial preference is on.
    if (soundEnabled) {
      try {
        audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === "suspended") audioContext.resume();
      } catch { /* Audio is optional. */ }
    }
    elapsed = 0; y = H * .48; velocity = 0; invulnerable = 0; flash = ""; nextChirp = 0;
    taken.clear(); hitHazards.clear(); collected.length = 0;
    for (const kind of Object.keys(totals)) totals[kind] = 0;
    updateHud(); state = "playing"; overlay.hidden = true;
  }
  function close() { window.close(); }
  function pause() {
    if (state === "playing") {
      state = "paused";
      show("Pausa", "<p>Il livello riprende da qui quando vuoi.</p>", [
        { label: "Riprendi", primary: true, onClick: () => { state = "playing"; overlay.hidden = true; lastFrame = performance.now(); } },
        { label: "Torna a studiare", onClick: close },
      ]);
    } else if (state === "paused") { state = "playing"; overlay.hidden = true; lastFrame = performance.now(); }
  }
  function finish() {
    state = "finished"; effect("finish");
    const sum = Object.values(totals).reduce((a, b) => a + b, 0);
    const cfu = Math.round(30 * sum / level.collectibles.length);
    show("Ecco come è andata", `<div class="scores">📚 Dispense · ${totals.dispensa} / 30<br>📝 Test · ${totals.test} / 30<br>🎯 Obiettivi · ${totals.obiettivo} / 30</div><p><strong>${sum} / 90 raccolti</strong><br>🎓 <strong>${cfu} / 30 CFU di Plume</strong></p><p><em>Ok, pausa finita.</em></p>`, [
      { label: "Torna a studiare", primary: true, onClick: close },
      { label: "Riprova", onClick: reset },
    ]);
  }
  function updateHud() {
    for (const kind of Object.keys(totals)) document.getElementById(kind).textContent = totals[kind];
    document.getElementById("time").textContent = `${Math.max(0, Math.ceil(level.duration - elapsed))} s`;
  }
  function flap() { if (state === "playing") velocity = Math.max(-245, velocity - 175); }
  function collide(x, cy, radius = 22) { return Math.hypot(x - PX, cy - y) < radius + 17; }
  function circleRect(x0, y0, width, height, radius = 17) {
    const nearestX = Math.max(x0, Math.min(PX, x0 + width));
    const nearestY = Math.max(y0, Math.min(y, y0 + height));
    return Math.hypot(PX - nearestX, y - nearestY) < radius;
  }
  function hazardBounds(item, x, frame = 0) {
    if (item.type === "books") return [x - UNIT_W / 2, FLOOR - item.count * UNIT_H, UNIT_W, item.count * UNIT_H];
    if (item.type === "cloud") return [x - UNIT_W / 2, SKY_TOP, UNIT_W, item.count * UNIT_H];
    const vertical = frame % 2 === 1;
    return [x - (vertical ? 6 : 20), PENCIL_Y[item.lane] - (vertical ? 20 : 6), vertical ? 12 : 40, vertical ? 40 : 12];
  }
  function hit(index) {
    if (invulnerable > 0) return;
    hitHazards.add(index); invulnerable = 1.7; velocity = -155;
    const lost = collected.pop();
    if (lost) { totals[lost.type] -= 1; flash = `Urto · -1 ${lost.type}`; }
    else flash = "Piccolo urto!";
    flashUntil = elapsed + 1.1; effect("hit"); updateHud();
  }
  function tick(dt) {
    if (state !== "playing") return;
    elapsed = Math.min(level.duration, elapsed + dt);
    if (nextChirp < CHIRP_TIMES.length && elapsed >= CHIRP_TIMES[nextChirp]) {
      effect("chirp"); nextChirp += 1;
    }
    velocity = Math.min(260, velocity + 450 * dt);
    y += velocity * dt;
    if (y < 82) { y = 82; velocity = Math.max(0, velocity); }
    if (y > H - 75) { y = H - 75; velocity = 0; }
    invulnerable = Math.max(0, invulnerable - dt);
    level.collectibles.forEach((item, index) => {
      if (taken.has(index)) return;
      const x = PX + (item.time - elapsed) * SPEED;
      if (x < -30) { taken.add(index); return; }
      if (collide(x, item.y * H, 20)) {
        taken.add(index); totals[item.type] += 1; collected.push(item);
        flash = `+1 ${item.type}`; flashUntil = elapsed + .6;
        effect(item.type);
      }
    });
    level.hazards.forEach((item, index) => {
      const x = PX + (item.time - elapsed) * SPEED;
      if (x < PX - 60 || x > PX + 80 || hitHazards.has(index)) return;
      const bounds = hazardBounds(item, x, Math.floor(elapsed * 7) % 4);
      if (circleRect(...bounds)) hit(index);
    });
    updateHud();
    if (elapsed >= level.duration) finish();
  }
  function rounded(x, y0, w, h, r, fill) {
    ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y0, w, h, r); ctx.fill();
  }
  function render() {
    ctx.fillStyle = dark ? "#1c2449" : "#a9def5"; ctx.fillRect(0, 0, W, H);
    if (dark) {
      for (let i = 0; i < stars.length; i += 1) {
        const [sx, sy] = stars[i];
        ctx.fillStyle = i % 4 ? "#b9c8ff" : "#fff"; ctx.fillRect(sx, sy, i % 3 ? 2 : 3, i % 3 ? 2 : 3);
      }
    }
    const progress = elapsed / level.duration;
    const celestialX = 884 - progress * 792, celestialY = 94 - 17 * Math.sin(Math.PI * progress);
    ctx.beginPath(); ctx.arc(celestialX, celestialY, 30, 0, Math.PI * 2);
    ctx.fillStyle = dark ? "#fff1c7" : "#ffdb70"; ctx.fill();
    if (dark) { ctx.beginPath(); ctx.arc(celestialX + 12, celestialY - 9, 27, 0, Math.PI * 2); ctx.fillStyle = "#1c2449"; ctx.fill(); }
    ctx.fillStyle = dark ? "#29375d" : "#d5ecfa";
    for (let i = 0; i < 7; i += 1) {
      const x = ((i * 257 - elapsed * 18) % 1250 + 1250) % 1250 - 120;
      ctx.beginPath(); ctx.ellipse(x, 360 + i % 3 * 52, 110, 28, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = dark ? "#4a5d82" : "#83bfc2"; ctx.fillRect(0, H - 31, W, 31);
    level.collectibles.forEach((item, index) => {
      if (taken.has(index)) return;
      const x = PX + (item.time - elapsed) * SPEED, cy = item.y * H;
      if (x < -40 || x > W + 40) return;
      const sprite = art[item.type];
      if (sprite.complete && sprite.naturalWidth) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sprite, Math.floor(elapsed * 6) % 4 * 16, 0, 16, 16, x - 26, cy - 26, 52, 52);
      } else rounded(x - 20, cy - 20, 40, 40, 5, "#f8de78");
    });
    level.hazards.forEach((item, index) => {
      const x = PX + (item.time - elapsed) * SPEED;
      if (x < -70 || x > W + 70) return;
      ctx.globalAlpha = hitHazards.has(index) ? .4 : 1;
      const sprite = art[item.type];
      if (item.type === "books" || item.type === "cloud") {
        for (let n = 0; n < item.count; n += 1) {
          const top = item.type === "books" ? FLOOR - (n + 1) * UNIT_H : SKY_TOP + n * UNIT_H;
          if (sprite.complete && sprite.naturalWidth) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(sprite, x - UNIT_W / 2, top, UNIT_W, UNIT_H);
          } else rounded(x - UNIT_W / 2, top, UNIT_W, UNIT_H, 4, "#785894");
        }
      } else {
        const cy = PENCIL_Y[item.lane];
        if (sprite.complete && sprite.naturalWidth) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(sprite, Math.floor(elapsed * 7) % 4 * 16, 0, 16, 16, x - 32, cy - 32, 64, 64);
        } else {
          rounded(x - 20, cy - 6, 40, 12, 3, "#785894");
        }
      }
      ctx.globalAlpha = 1;
    });
    ctx.globalAlpha = invulnerable > 0 && Math.floor(elapsed * 12) % 2 ? .45 : 1;
    const sprite = sprites[dark ? "dark" : "light"];
    if (sprite.complete && sprite.naturalWidth) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, Math.floor(elapsed * 7) % 5 * 32, 0, 32, 32, PX - 42, y - 42, 84, 84);
    } else { rounded(PX - 20, y - 20, 40, 40, 10, "#7655b9"); }
    ctx.globalAlpha = 1;
    if (flash && flashUntil > elapsed) {
      rounded(W / 2 - 108, 14, 216, 38, 10, dark ? "#303958" : "#fff");
      ctx.fillStyle = dark ? "#fff" : "#354063"; ctx.font = "bold 16px system-ui";
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(flash, W / 2, 33);
    }
    if (elapsed > 82) {
      ctx.font = "bold 34px system-ui"; ctx.fillStyle = dark ? "#f5d88d" : "#654d9a";
      ctx.textAlign = "right"; ctx.fillText("🎓 Arrivo", W - 40, 280);
    }
  }
  function frame(now) {
    const dt = Math.min(.05, (now - (lastFrame || now)) / 1000);
    lastFrame = now; tick(dt); render(); requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden && state === "playing") pause(); lastFrame = performance.now(); });
  window.addEventListener("keydown", (event) => {
    if (event.code === "Space") { event.preventDefault(); if (state === "playing") flap(); else if (state === "ready") reset(); }
    if (event.code === "KeyP" || event.code === "Escape") { event.preventDefault(); pause(); }
  });
  canvas.addEventListener("pointerdown", (event) => { event.preventDefault(); flap(); });
  soundButton.addEventListener("click", () => { setSound(!soundEnabled, true); if (soundEnabled) effect("test"); });
  document.getElementById("close").addEventListener("click", close);
  show("Una piccola pausa", "<p>Vola con Plume, raccogli dispense, test e obiettivi. Puoi fermarti quando vuoi.</p><p><strong>Spazio, clic o tocco</strong> per salire.</p>", [
    { label: "Inizia", primary: true, onClick: reset }, { label: "Torna a studiare", onClick: close },
  ]);
  requestAnimationFrame(frame);
})();

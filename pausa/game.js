(() => {
  "use strict";
  const level = globalThis.PausaLevel;
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height, PX = 226, SPEED = 198;
  const overlay = document.getElementById("overlay");
  const card = document.getElementById("card");
  const soundButton = document.getElementById("sound");
  const systemTheme = matchMedia("(prefers-color-scheme: dark)");
  const sprites = { light: new Image(), dark: new Image() };
  sprites.light.src = "../assets/gaming/mascot-idle-light.png";
  sprites.dark.src = "../assets/gaming/mascot-idle-dark.png";
  const totals = { dispensa: 0, test: 0, obiettivo: 0 };
  const collected = [];
  let themePreference = "system", dark = systemTheme.matches;
  let soundEnabled = false, audioContext = null;
  let state = "ready", elapsed = 0, lastFrame = 0, y = H * .48, velocity = 0;
  let invulnerable = 0, flash = "", flashUntil = 0;
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
    elapsed = 0; y = H * .48; velocity = 0; invulnerable = 0; flash = "";
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
    velocity = Math.min(260, velocity + 450 * dt);
    y += velocity * dt;
    if (y < 82) { y = 82; velocity = Math.max(0, velocity); }
    if (y > H - 75) { y = H - 75; velocity = 0; }
    invulnerable = Math.max(0, invulnerable - dt);
    level.collectibles.forEach((item, index) => {
      if (taken.has(index)) return;
      const x = PX + (item.time - elapsed) * SPEED;
      if (x < -30) { taken.add(index); return; }
      if (collide(x, item.y * H, 21)) {
        taken.add(index); totals[item.type] += 1; collected.push(item);
        flash = `+1 ${item.type}`; flashUntil = elapsed + .6;
        effect(item.type);
      }
    });
    level.hazards.forEach((item, index) => {
      const x = PX + (item.time - elapsed) * SPEED;
      if (x < PX - 60 || x > PX + 80 || hitHazards.has(index)) return;
      const cy = item.type === "bug" ? (item.y + .045 * Math.sin(elapsed * 3 + index)) * H : item.y * H;
      if (collide(x, cy, item.type === "bug" ? 17 : 36)) hit(index);
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
      for (let i = 0; i < 25; i += 1) {
        const sx = (i * 197 + 89) % W, sy = 35 + (i * 83) % 210;
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
      if (x < -35 || x > W + 35) return;
      const colors = { dispensa: "#f7eee0", test: "#fae17e", obiettivo: "#a6efb0" };
      rounded(x - 19, cy - 19, 38, 38, 7, colors[item.type]);
      ctx.strokeStyle = "#4b527c"; ctx.lineWidth = 3; ctx.strokeRect(x - 18, cy - 18, 36, 36);
      ctx.font = "23px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = "#354063"; ctx.fillText({ dispensa: "▤", test: "✎", obiettivo: "★" }[item.type], x, cy + 1);
    });
    level.hazards.forEach((item, index) => {
      const x = PX + (item.time - elapsed) * SPEED;
      if (x < -90 || x > W + 90) return;
      const cy = item.type === "bug" ? (item.y + .045 * Math.sin(elapsed * 3 + index)) * H : item.y * H;
      ctx.globalAlpha = hitHazards.has(index) ? .4 : 1;
      if (item.type === "books") {
        for (let n = 0; n < 3; n += 1) rounded(x - 40 + n * 4, cy - 34 + n * 20, 78 - n * 8, 20, 3, ["#7b62a8", "#b46174", "#536fba"][n]);
      } else if (item.type === "cloud") {
        ctx.fillStyle = dark ? "#987ca8" : "#8a71a3";
        for (const [dx, dy, rx, ry] of [[-27,7,29,23],[0,-9,33,31],[29,9,27,22]]) {
          ctx.beginPath(); ctx.ellipse(x + dx, cy + dy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = "#554778"; ctx.lineWidth = 3; ctx.strokeRect(x - 43, cy - 19, 86, 47);
      } else {
        ctx.fillStyle = "#785894"; ctx.beginPath(); ctx.ellipse(x, cy, 20, 15, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#392c5e"; ctx.lineWidth = 3;
        for (const side of [-1, 1]) for (let n = -1; n <= 1; n += 1) {
          ctx.beginPath(); ctx.moveTo(x + side * 15, cy + n * 5); ctx.lineTo(x + side * 28, cy + n * 11); ctx.stroke();
        }
        ctx.fillStyle = "#fff"; ctx.fillRect(x + 6, cy - 5, 4, 4);
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

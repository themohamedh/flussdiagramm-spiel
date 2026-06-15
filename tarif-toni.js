(() => {
  "use strict";

  const STORAGE_KEY = "tarif-toni-preferences";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const protectedSelector = [
    "button", ".card", ".slot", ".info-btn", ".status", ".feedback",
    ".info-popup.open", ".final-overlay.open", ".mode-selector", ".controls",
    ".board-viewport", ".cards", ".page-footer"
  ].join(",");

  const messages = {
    learn: [
      "Brauchst du einen kleinen Tarif-Tipp?",
      "Schau dir die Reihenfolge noch einmal genau an.",
      "Gemeinsam kriegen wir das hin.",
      "Erst auswählen, dann die passende Station anklicken."
    ],
    exam: [
      "Im Prüfungsmodus halte ich mich lieber zurück.",
      "Konzentrier dich, du schaffst das.",
      "Diesmal keine Tipps von mir."
    ],
    correct: ["Stark, das war richtig!", "Sauber eingeordnet!", "Genau so geht es weiter."],
    wrong: ["Fast, versuch es noch einmal.", "Kein Problem, prüfe den Ablauf noch einmal."],
    complete: ["Geschafft! Das war eine starke Tarifrunde.", "Alles richtig. Zeit für einen kleinen Jubel!"]
  };

  const root = document.createElement("aside");
  root.className = "tarif-toni";
  root.dataset.motion = "idle";
  root.setAttribute("aria-label", "Tarif Toni, digitaler Lernbegleiter");
  root.innerHTML = `
    <div class="tarif-toni__bubble" role="status" aria-live="polite">
      <span class="tarif-toni__label">Tarif Toni</span>
      <span class="tarif-toni__message"></span>
    </div>
    <div class="tarif-toni__tools" aria-label="Tarif Toni steuern">
      <button class="tarif-toni__tool" data-toni-action="pause" type="button" title="Animation pausieren" aria-label="Animation pausieren">Ⅱ</button>
      <button class="tarif-toni__tool" data-toni-action="minimize" type="button" title="Tarif Toni minimieren" aria-label="Tarif Toni minimieren">−</button>
      <button class="tarif-toni__tool" data-toni-action="hide" type="button" title="Tarif Toni ausblenden" aria-label="Tarif Toni ausblenden">×</button>
    </div>
    <button class="tarif-toni__character" type="button" aria-label="Tarif Toni fragen">
      <svg class="tarif-toni__svg" viewBox="0 0 160 190" aria-hidden="true">
        <defs>
          <linearGradient id="toniMetal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#173d68"/><stop offset=".42" stop-color="#071a34"/>
            <stop offset=".72" stop-color="#0a2b4e"/><stop offset="1" stop-color="#020b1a"/>
          </linearGradient>
          <linearGradient id="toniChrome" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#bff8ff"/><stop offset=".22" stop-color="#1288bf"/>
            <stop offset=".55" stop-color="#051a35"/><stop offset=".82" stop-color="#62ecff"/><stop offset="1" stop-color="#06274b"/>
          </linearGradient>
          <radialGradient id="toniEye"><stop offset=".2" stop-color="#fff"/><stop offset=".62" stop-color="#dffcff"/><stop offset="1" stop-color="#47dfff"/></radialGradient>
          <filter id="toniGlow"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <g class="tarif-toni__shell">
          <g class="tarif-toni__leg-left"><path d="M59 145 Q55 158 51 170" fill="none" stroke="url(#toniChrome)" stroke-width="9" stroke-linecap="round"/><path d="M38 174 Q52 164 64 174 Q61 183 40 182Z" fill="url(#toniMetal)" stroke="#45dcff" stroke-width="2"/></g>
          <g class="tarif-toni__leg-right"><path d="M101 145 Q105 158 109 170" fill="none" stroke="url(#toniChrome)" stroke-width="9" stroke-linecap="round"/><path d="M96 174 Q109 164 123 174 Q120 183 98 182Z" fill="url(#toniMetal)" stroke="#45dcff" stroke-width="2"/></g>
          <g class="tarif-toni__arm-left"><path d="M39 88 Q18 95 19 119 Q18 132 29 136" fill="none" stroke="url(#toniChrome)" stroke-width="9" stroke-linecap="round"/><circle cx="29" cy="138" r="8" fill="url(#toniMetal)" stroke="#45dcff" stroke-width="2"/></g>
          <g class="tarif-toni__arm-right"><path d="M121 88 Q142 95 141 119 Q142 132 131 136" fill="none" stroke="url(#toniChrome)" stroke-width="9" stroke-linecap="round"/><circle cx="131" cy="138" r="8" fill="url(#toniMetal)" stroke="#45dcff" stroke-width="2"/></g>
          <rect x="38" y="22" width="84" height="132" rx="42" fill="url(#toniMetal)" stroke="url(#toniChrome)" stroke-width="8"/>
          <rect x="47" y="31" width="66" height="114" rx="33" fill="none" stroke="#21ddff" stroke-width="2.5" filter="url(#toniGlow)" opacity=".92"/>
          <path d="M57 46 V32 Q57 8 80 8 Q103 8 103 32 V44" fill="none" stroke="url(#toniChrome)" stroke-width="9" stroke-linecap="round"/>
          <path d="M59 47 V31 Q59 12 80 12 Q101 12 101 31 V44" fill="none" stroke="#21ddff" stroke-width="2" filter="url(#toniGlow)"/>
          <g>
            <ellipse cx="65" cy="76" rx="20" ry="24" fill="url(#toniEye)" stroke="#0b82bb" stroke-width="3"/>
            <ellipse cx="95" cy="76" rx="20" ry="24" fill="url(#toniEye)" stroke="#0b82bb" stroke-width="3"/>
            <g class="tarif-toni__eye"><circle cx="68" cy="77" r="8" fill="#04162d"/><circle cx="71" cy="73" r="2.5" fill="#fff"/></g>
            <g class="tarif-toni__eye"><circle cx="98" cy="77" r="8" fill="#04162d"/><circle cx="101" cy="73" r="2.5" fill="#fff"/></g>
            <path class="tarif-toni__lid" d="M47 62 Q65 52 82 63 M79 63 Q96 52 113 62" fill="none" stroke="#071b34" stroke-width="6" stroke-linecap="round"/>
          </g>
          <path d="M58 108 Q80 128 102 108 Q98 137 80 137 Q62 137 58 108Z" fill="#020b17" stroke="#28dfff" stroke-width="2"/>
          <path d="M66 116 Q80 124 94 116" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
          <g filter="url(#toniGlow)">
            <rect x="103" y="111" width="22" height="27" rx="5" fill="#9f1028" stroke="#ff7890" stroke-width="2"/>
            <path d="M108 131 L114 117 L120 131 M110 126 H118" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>
          </g>
          <path d="M48 142 Q80 155 112 142" fill="none" stroke="#42e6ff" stroke-width="3" filter="url(#toniGlow)"/>
        </g>
      </svg>
    </button>`;
  document.body.appendChild(root);

  const restore = document.createElement("button");
  restore.className = "tarif-toni__restore";
  restore.type = "button";
  restore.hidden = true;
  restore.title = "Tarif Toni wieder einblenden";
  restore.setAttribute("aria-label", "Tarif Toni wieder einblenden");
  restore.textContent = "T";
  document.body.appendChild(restore);

  const character = root.querySelector(".tarif-toni__character");
  const bubble = root.querySelector(".tarif-toni__bubble");
  const messageEl = root.querySelector(".tarif-toni__message");
  const pauseButton = root.querySelector('[data-toni-action="pause"]');
  const eyes = [...root.querySelectorAll(".tarif-toni__eye")];
  let preferences = loadPreferences();
  let position = getStartPosition();
  let behaviorTimer = null;
  let bubbleTimer = null;
  let motionTimer = null;
  let motionName = "idle";
  let motionEndAt = 0;
  let motionRemaining = 0;
  let moving = false;
  let activeTravelAnimation = null;
  let cancelTravel = false;

  function loadPreferences() {
    try { return { paused: false, minimized: false, hidden: false, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; }
    catch { return { paused: false, minimized: false, hidden: false }; }
  }

  function savePreferences() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); }
    catch { /* Toni remains usable when storage is unavailable. */ }
  }

  function getMode() {
    return document.querySelector('.mode-option.active')?.dataset.mode === "exam" ? "exam" : "learn";
  }

  function choose(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function getStartPosition() {
    const size = getSize();
    return { x: Math.max(10, window.innerWidth - size.width - 18), y: Math.max(70, window.innerHeight - size.height - 18) };
  }

  function getSize() {
    return window.innerWidth <= 720 ? { width: 96, height: 124 } : { width: 164, height: 208 };
  }

  function applyPosition() {
    root.style.setProperty("--toni-x", `${Math.round(position.x)}px`);
    root.style.setProperty("--toni-y", `${Math.round(position.y)}px`);
    root.dataset.side = position.x < window.innerWidth / 2 ? "left" : "right";
  }

  function rectsOverlap(a, b, padding = 12) {
    return !(a.right + padding < b.left || a.left - padding > b.right || a.bottom + padding < b.top || a.top - padding > b.bottom);
  }

  function getCandidates() {
    const { width, height } = getSize();
    const margin = window.innerWidth <= 720 ? 8 : 16;
    const maxX = Math.max(margin, window.innerWidth - width - margin);
    const maxY = Math.max(66, window.innerHeight - height - margin);
    const midX = Math.max(margin, (window.innerWidth - width) / 2);
    const midY = Math.max(80, (window.innerHeight - height) / 2);
    const candidates = [
      { x: maxX, y: maxY }, { x: margin, y: maxY },
      { x: maxX, y: 78 }, { x: margin, y: 78 },
      { x: maxX, y: midY }, { x: margin, y: midY },
      { x: midX, y: maxY }
    ];
    return window.innerWidth <= 720 ? candidates.slice(0, 2) : candidates;
  }

  function scoreCandidate(candidate) {
    const size = getSize();
    const rect = { left: candidate.x, top: candidate.y, right: candidate.x + size.width, bottom: candidate.y + size.height };
    const protectedRects = [...document.querySelectorAll(protectedSelector)]
      .filter((element) => element.offsetParent !== null && !root.contains(element))
      .map((element) => element.getBoundingClientRect());
    const collisions = protectedRects.filter((protectedRect) => rectsOverlap(rect, protectedRect)).length;
    const distance = Math.hypot(candidate.x - position.x, candidate.y - position.y);
    return collisions * 10000 + distance * .05 + Math.random() * 80;
  }

  function findFreePosition() {
    return getCandidates().sort((a, b) => scoreCandidate(a) - scoreCandidate(b))[0];
  }

  function showMessage(text, duration = 4300) {
    if (preferences.hidden || preferences.minimized) return;
    clearTimeout(bubbleTimer);
    messageEl.textContent = text;
    bubble.classList.add("open");
    bubbleTimer = setTimeout(() => bubble.classList.remove("open"), duration);
  }

  function setMotion(name, duration = 1600) {
    clearTimeout(motionTimer);
    motionName = name;
    root.dataset.motion = name;
    motionRemaining = duration;
    if (!preferences.paused) scheduleMotionEnd();
  }

  function scheduleMotionEnd() {
    clearTimeout(motionTimer);
    motionEndAt = Date.now() + motionRemaining;
    motionTimer = window.setTimeout(() => {
      if (root.dataset.motion === motionName) root.dataset.motion = "idle";
      motionRemaining = 0;
    }, motionRemaining);
  }

  async function travel(kind = "walk") {
    if (moving || preferences.paused || preferences.hidden || preferences.minimized || reduceMotion.matches || root.contains(document.activeElement)) return;
    moving = true;
    cancelTravel = false;
    const destination = findFreePosition();
    const dx = destination.x - position.x;
    const dy = destination.y - position.y;
    if (Math.hypot(dx, dy) < 60) {
      setMotion(choose(["thinking", "celebrate"]), 1800);
      moving = false;
      return;
    }

    const duration = kind === "hustle" ? 1250 : kind === "hop" ? 1500 : 2200;
    const curve = Math.min(85, Math.max(30, Math.abs(dx) * .18));
    setMotion(kind, duration);
    const frames = [
      { transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(1) rotate(0deg)` },
      { transform: `translate3d(${position.x + dx * .48}px, ${position.y + dy * .48 - (kind === "hop" ? 80 : curve)}px, 0) scale(${kind === "hop" ? ".95, 1.05" : "1"}) rotate(${kind === "flip" ? "190deg" : kind === "spin" ? "210deg" : "0deg"})`, offset: .52 },
      { transform: `translate3d(${destination.x}px, ${destination.y}px, 0) scale(1) rotate(${kind === "flip" || kind === "spin" ? "360deg" : "0deg"})` }
    ];
    const animation = root.animate(frames, { duration, easing: "cubic-bezier(.22,.72,.22,1)", fill: "forwards" });
    activeTravelAnimation = animation;
    try { await animation.finished; } catch { /* Animation was intentionally interrupted. */ }
    if (cancelTravel) {
      activeTravelAnimation = null;
      moving = false;
      setMotion("idle", 1);
      applyPosition();
      return;
    }
    position = destination;
    animation.cancel();
    activeTravelAnimation = null;
    applyPosition();
    setMotion("idle");
    moving = false;
  }

  function runBehavior() {
    if (preferences.paused || preferences.hidden) return scheduleBehavior();
    const roll = Math.random();
    if (roll < .4) setMotion(choose(["thinking", "idle"]), 1900);
    else if (roll < .6) travel("walk");
    else if (roll < .75) travel("hustle");
    else if (roll < .88) travel("hop");
    else if (roll < .97) travel("spin");
    else travel("flip");
    scheduleBehavior();
  }

  function scheduleBehavior(initial = false) {
    clearTimeout(behaviorTimer);
    const modeDelay = getMode() === "exam" ? 10000 : 0;
    const delay = initial ? 5000 : reduceMotion.matches ? 60000 : 20000 + modeDelay + Math.random() * 25000;
    behaviorTimer = setTimeout(runBehavior, delay);
  }

  function react(type) {
    if (getMode() === "exam" && (type === "correct" || type === "wrong")) {
      setMotion("idle", 1200);
      return;
    }
    if (type === "complete") setMotion("celebrate", 2200);
    else if (type === "correct") setMotion("celebrate", 1500);
    else if (type === "wrong") setMotion("thinking", 1800);
    showMessage(choose(messages[type]));
  }

  function syncPreferences() {
    root.classList.toggle("is-paused", preferences.paused);
    root.classList.toggle("is-minimized", preferences.minimized);
    root.hidden = preferences.hidden;
    restore.hidden = !preferences.hidden;
    pauseButton.textContent = preferences.paused ? "▶" : "Ⅱ";
    pauseButton.title = preferences.paused ? "Animation fortsetzen" : "Animation pausieren";
    pauseButton.setAttribute("aria-label", pauseButton.title);
    if (preferences.paused && motionRemaining > 0) {
      motionRemaining = Math.max(1, motionEndAt - Date.now());
      clearTimeout(motionTimer);
    } else if (!preferences.paused && motionRemaining > 0) {
      scheduleMotionEnd();
    }
    if (activeTravelAnimation) {
      if (preferences.minimized || preferences.hidden) {
        cancelTravel = true;
        activeTravelAnimation.cancel();
      }
      else if (preferences.paused) activeTravelAnimation.pause();
      else activeTravelAnimation.play();
    }
    if (!preferences.paused) scheduleBehavior();
    savePreferences();
  }

  character.addEventListener("click", () => {
    if (preferences.minimized) {
      preferences.minimized = false;
      syncPreferences();
      showMessage("Da bin ich wieder.");
      return;
    }
    setMotion("thinking", 1600);
    showMessage(choose(messages[getMode()]));
  });

  root.querySelector(".tarif-toni__tools").addEventListener("click", (event) => {
    const action = event.target.closest("[data-toni-action]")?.dataset.toniAction;
    if (!action) return;
    if (action === "pause") preferences.paused = !preferences.paused;
    if (action === "minimize") preferences.minimized = !preferences.minimized;
    if (action === "hide") preferences.hidden = true;
    syncPreferences();
  });

  restore.addEventListener("click", () => {
    preferences.hidden = false;
    preferences.minimized = false;
    syncPreferences();
    showMessage("Da bin ich wieder.");
  });

  document.addEventListener("pointermove", (event) => {
    if (preferences.hidden || preferences.paused) return;
    const rect = character.getBoundingClientRect();
    const x = Math.max(-3, Math.min(3, (event.clientX - (rect.left + rect.width / 2)) / 45));
    const y = Math.max(-2, Math.min(2, (event.clientY - (rect.top + rect.height / 2)) / 55));
    eyes.forEach((eye) => { eye.style.transform = `translate(${x}px, ${y}px)`; });
  }, { passive: true });

  document.addEventListener("dragstart", () => root.classList.add("is-user-active"));
  document.addEventListener("dragend", () => root.classList.remove("is-user-active"));

  root.addEventListener("focusin", () => activeTravelAnimation?.pause());
  root.addEventListener("focusout", () => {
    if (!preferences.paused) activeTravelAnimation?.play();
  });

  document.querySelectorAll(".mode-option").forEach((button) => {
    button.addEventListener("click", () => {
      window.setTimeout(() => showMessage(choose(messages[getMode()])), 120);
    });
  });

  const status = document.getElementById("status");
  if (status) {
    new MutationObserver(() => {
      if (status.classList.contains("is-positive")) react("correct");
      else if (status.classList.contains("is-negative")) react("wrong");
    }).observe(status, { childList: true, attributes: true, attributeFilter: ["class"] });
  }

  const finalOverlay = document.getElementById("finalOverlay");
  if (finalOverlay) {
    new MutationObserver(() => {
      if (finalOverlay.classList.contains("open")) react("complete");
    }).observe(finalOverlay, { attributes: true, attributeFilter: ["class"] });
  }

  window.addEventListener("resize", () => {
    activeTravelAnimation?.cancel();
    activeTravelAnimation = null;
    moving = false;
    position = findFreePosition();
    applyPosition();
  }, { passive: true });

  reduceMotion.addEventListener?.("change", () => scheduleBehavior());
  position = findFreePosition();
  applyPosition();
  syncPreferences();
  scheduleBehavior(true);
  window.setTimeout(() => showMessage("Hallo, ich bin Tarif Toni. Klick mich an, wenn du mich brauchst."), 900);
})();

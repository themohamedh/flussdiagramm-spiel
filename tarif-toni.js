(() => {
  "use strict";

  if (window.__tarifToniLoaded) return;
  window.__tarifToniLoaded = true;

  const STORAGE_KEY = "tarif-toni-preferences";
  const DEFAULT_SOURCE_URL = "https://www.bpb.de/";
  const ALLOWED_SOURCE_HOSTS = new Set(["www.bpb.de", "bpb.de"]);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const protectedSelector = [
    "button", ".card", ".slot", ".info-btn", ".status", ".feedback",
    ".info-popup.open", ".final-overlay.open", ".mode-selector", ".controls",
    ".hero-panel", ".reference-box", ".board-viewport", ".cards", ".page-footer"
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
    <section class="tarif-toni__ask" aria-label="Tarif Toni fragen" hidden>
      <p class="tarif-toni__answer">Frag mich nach einem Denkanstoß. Ich nutze die bpb-Quellen aus dem Spiel und verrate keine fertige Lösung.</p>
      <form class="tarif-toni__form">
        <input class="tarif-toni__input" type="text" maxlength="120" autocomplete="off" placeholder="Kurze Frage an Toni" aria-label="Kurze Frage an Tarif Toni">
        <button class="tarif-toni__send" type="submit">Tipp</button>
      </form>
      <a class="tarif-toni__source" href="${DEFAULT_SOURCE_URL}" target="_blank" rel="noopener noreferrer">Quelle: bpb</a>
    </section>
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
  const askPanel = root.querySelector(".tarif-toni__ask");
  const answerEl = root.querySelector(".tarif-toni__answer");
  const formEl = root.querySelector(".tarif-toni__form");
  const inputEl = root.querySelector(".tarif-toni__input");
  const sourceEl = root.querySelector(".tarif-toni__source");
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
  let lastReactionType = "";
  let lastReactionAt = 0;
  let moving = false;
  let activeTravelAnimation = null;
  let cancelTravel = false;
  let greetingTimer = null;
  let deferredMessageTimer = null;
  const observers = [];

  function clearBehaviorTimer() {
    clearTimeout(behaviorTimer);
    behaviorTimer = null;
  }

  function clearBubbleTimer(closeBubble = false) {
    clearTimeout(bubbleTimer);
    bubbleTimer = null;
    if (closeBubble) bubble.classList.remove("open");
  }

  function clearMotionTimer() {
    clearTimeout(motionTimer);
    motionTimer = null;
    motionRemaining = 0;
    root.dataset.motion = "idle";
  }

  function stopTravel() {
    cancelTravel = true;
    if (activeTravelAnimation) {
      try { activeTravelAnimation.cancel(); }
      catch { /* Ignore animations that were already finished or canceled. */ }
    }
    activeTravelAnimation = null;
    moving = false;
  }

  function observeElement(target, callback, options) {
    if (!target || typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(callback);
    observer.observe(target, options);
    observers.push(observer);
  }

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

  function getProtectedRects() {
    return [...document.querySelectorAll(protectedSelector)]
      .filter((element) => element.offsetParent !== null && !root.contains(element))
      .map((element) => element.getBoundingClientRect());
  }

  function getBubbleRectForCandidate(candidate) {
    const { width, height } = getSize();
    const isMobile = window.innerWidth <= 720;
    const side = candidate.x < window.innerWidth / 2 ? "left" : "right";
    const offsetX = isMobile ? 66 : 114;
    const offsetBottom = isMobile ? 82 : 142;
    const bubbleWidth = bubble.offsetWidth || (isMobile ? Math.min(205, window.innerWidth - 24) : Math.min(270, window.innerWidth - 34));
    const bubbleHeight = bubble.offsetHeight || (isMobile ? 96 : 82);
    const left = side === "left"
      ? candidate.x + offsetX
      : candidate.x + width - offsetX - bubbleWidth;
    const top = candidate.y + height - offsetBottom - bubbleHeight;

    return {
      left,
      top,
      right: left + bubbleWidth,
      bottom: top + bubbleHeight
    };
  }

  function getCandidateRects(candidate, options = {}) {
    const { width, height } = getSize();
    const rects = [{
      left: candidate.x,
      top: candidate.y,
      right: candidate.x + width,
      bottom: candidate.y + height
    }];

    if (options.includeBubble) rects.push(getBubbleRectForCandidate(candidate));
    return rects;
  }

  function viewportPenalty(rect) {
    const margin = window.innerWidth <= 720 ? 8 : 12;
    let penalty = 0;
    if (rect.left < margin) penalty += margin - rect.left;
    if (rect.top < margin) penalty += margin - rect.top;
    if (rect.right > window.innerWidth - margin) penalty += rect.right - (window.innerWidth - margin);
    if (rect.bottom > window.innerHeight - margin) penalty += rect.bottom - (window.innerHeight - margin);
    return penalty;
  }

  function getCollisionCount(candidate, options = {}) {
    const protectedRects = options.protectedRects || getProtectedRects();
    return getCandidateRects(candidate, options).reduce((count, rect) => {
      return count + protectedRects.filter((protectedRect) => rectsOverlap(rect, protectedRect)).length;
    }, 0);
  }

  function scoreCandidate(candidate, protectedRects, options = {}) {
    const rects = getCandidateRects(candidate, options);
    const collisions = getCollisionCount(candidate, { ...options, protectedRects });
    const offscreen = rects.reduce((sum, rect) => sum + viewportPenalty(rect), 0);
    const distance = Math.hypot(candidate.x - position.x, candidate.y - position.y);
    return collisions * 10000 + offscreen * 120 + distance * .05 + Math.random() * 80;
  }

  function findFreePosition(options = {}) {
    const protectedRects = getProtectedRects();
    return getCandidates()
      .map((candidate) => ({ candidate, score: scoreCandidate(candidate, protectedRects, options) }))
      .sort((a, b) => a.score - b.score)[0]?.candidate || getStartPosition();
  }

  function showMessage(text, duration = 4300) {
    if (preferences.hidden || preferences.minimized || !askPanel.hidden) return;
    const nextPosition = findFreePosition({ includeBubble: true });
    const bubbleWouldCollide = getCollisionCount(nextPosition, { includeBubble: true }) > 0;
    position = nextPosition;
    applyPosition();
    if (bubbleWouldCollide) return;
    clearBubbleTimer();
    messageEl.textContent = text;
    bubble.classList.add("open");
    bubbleTimer = setTimeout(() => bubble.classList.remove("open"), duration);
  }

  function getKnowledge() {
    return Array.isArray(window.TARIFF_TONI_KNOWLEDGE) ? window.TARIFF_TONI_KNOWLEDGE : [];
  }

  function getSafeSource(source) {
    if (!source || typeof source.url !== "string") return { label: "bpb-Quellen im Spiel", url: DEFAULT_SOURCE_URL };
    try {
      const url = new URL(source.url, window.location.href);
      if (url.protocol === "https:" && ALLOWED_SOURCE_HOSTS.has(url.hostname)) {
        return { label: source.label || "bpb-Quellen im Spiel", url: url.href };
      }
    } catch {
      // Fallback below keeps Toni usable if source data is malformed.
    }
    return { label: "bpb-Quellen im Spiel", url: DEFAULT_SOURCE_URL };
  }

  function normalizeText(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function scoreKnowledge(entry, question) {
    const normalizedQuestion = normalizeText(question);
    return (entry.keywords || []).reduce((score, keyword) => {
      return normalizedQuestion.includes(normalizeText(keyword)) ? score + 1 : score;
    }, 0);
  }

  function getFocusedStepTip() {
    const focusedSlot = document.querySelector(".slot.is-focus-target");
    const key = focusedSlot?.dataset.key;
    const entry = key ? window.TARIFF_FLOW_LEARNING?.[key] : null;
    if (!entry) return "";
    return `Gerade hilft dir vielleicht diese Denkfrage: ${entry.question}`;
  }

  function findSourceTip(question) {
    const knowledge = getKnowledge();
    const ranked = knowledge
      .map((entry) => ({ entry, score: scoreKnowledge(entry, question) }))
      .sort((a, b) => b.score - a.score);
    const match = ranked.find((item) => item.score > 0)?.entry || knowledge[Math.floor(Math.random() * Math.max(1, knowledge.length))];
    const focusedTip = getFocusedStepTip();
    return {
      text: match
        ? `${match.tip}${focusedTip ? ` ${focusedTip}` : ""}`
        : focusedTip || "Kleiner Tipp: Schau zuerst, ob es gerade um Verhandlung, Druckmittel oder Ergebnis geht.",
      source: match || null
    };
  }

  function answerQuestion(question) {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;
    setMotion("thinking", 1600);

    if (getMode() === "exam") {
      answerEl.textContent = "Im Prüfungsmodus bleibe ich neutral: Ich kann dich motivieren, aber keine fachlichen Hinweise geben. Denk Schritt für Schritt an den Ablauf.";
      sourceEl.textContent = "Prüfungsmodus: keine Quelle als Tipp";
      sourceEl.removeAttribute("href");
      showMessage("Im Prüfungsmodus keine Tipps von mir.");
      return;
    }

    const result = findSourceTip(trimmedQuestion);
    answerEl.textContent = result.text;
    if (result.source) {
      const safeSource = getSafeSource(result.source);
      sourceEl.textContent = `Quelle: ${safeSource.label}`;
      sourceEl.href = safeSource.url;
    } else {
      sourceEl.textContent = "Quelle: bpb-Quellen im Spiel";
      sourceEl.href = DEFAULT_SOURCE_URL;
    }
    showMessage("Ich gebe dir einen kleinen Tipp, keine fertige Lösung.");
  }

  function setAskPanelOpen(open) {
    const shouldOpen = Boolean(open && !preferences.hidden && !preferences.minimized);
    askPanel.hidden = !shouldOpen;
    root.classList.toggle("is-asking", shouldOpen);
    character.setAttribute("aria-expanded", String(shouldOpen));
    if (shouldOpen) {
      clearBehaviorTimer();
      stopTravel();
      position = findFreePosition();
      applyPosition();
      clearBubbleTimer(true);
      inputEl.focus();
    } else if (!preferences.paused && !preferences.hidden && !preferences.minimized) {
      scheduleBehavior();
    }
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
    if (preferences.paused || preferences.hidden || preferences.minimized) return;
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
    clearBehaviorTimer();
    if (preferences.paused || preferences.hidden || preferences.minimized) return;
    const modeDelay = getMode() === "exam" ? 10000 : 0;
    const delay = initial ? 5000 : reduceMotion.matches ? 60000 : 20000 + modeDelay + Math.random() * 25000;
    behaviorTimer = setTimeout(runBehavior, delay);
  }

  function react(type, customMessage) {
    const now = Date.now();
    if (type === lastReactionType && now - lastReactionAt < 700) return;
    lastReactionType = type;
    lastReactionAt = now;

    if (getMode() === "exam" && (type === "correct" || type === "wrong")) {
      setMotion("idle", 1200);
      return;
    }
    if (type === "complete") setMotion("celebrate", 2200);
    else if (type === "correct") setMotion("celebrate", 1500);
    else if (type === "wrong") setMotion("thinking", 1800);
    showMessage(customMessage || choose(messages[type]));
  }

  function syncPreferences() {
    root.classList.toggle("is-paused", preferences.paused);
    root.classList.toggle("is-minimized", preferences.minimized);
    root.hidden = preferences.hidden;
    restore.hidden = !preferences.hidden;
    pauseButton.textContent = preferences.paused ? "▶" : "Ⅱ";
    pauseButton.title = preferences.paused ? "Animation fortsetzen" : "Animation pausieren";
    pauseButton.setAttribute("aria-label", pauseButton.title);
    if (preferences.hidden || preferences.minimized) {
      setAskPanelOpen(false);
      clearBubbleTimer(true);
      clearMotionTimer();
      stopTravel();
      clearBehaviorTimer();
    } else {
      if (preferences.paused && motionRemaining > 0) {
        motionRemaining = Math.max(1, motionEndAt - Date.now());
        clearTimeout(motionTimer);
      } else if (!preferences.paused && motionRemaining > 0) {
        scheduleMotionEnd();
      }
      if (activeTravelAnimation) {
        try {
          if (preferences.paused) activeTravelAnimation.pause();
          else activeTravelAnimation.play();
        } catch { /* Ignore animations that cannot be resumed by the browser. */ }
      }
      if (preferences.paused) clearBehaviorTimer();
      else scheduleBehavior();
    }
    savePreferences();
    emitState();
  }

  function emitState() {
    window.dispatchEvent(new CustomEvent("tarif-toni:state", {
      detail: { enabled: !preferences.hidden }
    }));
  }

  character.addEventListener("click", () => {
    if (preferences.minimized) {
      preferences.minimized = false;
      syncPreferences();
      showMessage("Da bin ich wieder.");
      return;
    }
    setMotion("thinking", 1600);
    setAskPanelOpen(askPanel.hidden);
    if (askPanel.hidden) showMessage(choose(messages[getMode()]));
  });

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    answerQuestion(inputEl.value);
    inputEl.value = "";
  });

  root.querySelector(".tarif-toni__tools").addEventListener("click", (event) => {
    const action = event.target.closest("[data-toni-action]")?.dataset.toniAction;
    if (!action) return;
    if (action === "pause") preferences.paused = !preferences.paused;
    if (action === "minimize") preferences.minimized = !preferences.minimized;
    if (action === "hide") preferences.hidden = true;
    if (preferences.minimized || preferences.hidden) setAskPanelOpen(false);
    syncPreferences();
  });

  restore.addEventListener("click", () => {
    preferences.hidden = false;
    preferences.minimized = false;
    syncPreferences();
    showMessage("Da bin ich wieder.");
  });

  document.addEventListener("pointermove", (event) => {
    if (preferences.hidden || preferences.paused || preferences.minimized) return;
    const rect = character.getBoundingClientRect();
    const x = Math.max(-3, Math.min(3, (event.clientX - (rect.left + rect.width / 2)) / 45));
    const y = Math.max(-2, Math.min(2, (event.clientY - (rect.top + rect.height / 2)) / 55));
    eyes.forEach((eye) => { eye.style.transform = `translate(${x}px, ${y}px)`; });
  }, { passive: true });

  document.addEventListener("dragstart", () => root.classList.add("is-user-active"));
  document.addEventListener("dragend", () => root.classList.remove("is-user-active"));

  root.addEventListener("focusin", () => {
    try { activeTravelAnimation?.pause(); }
    catch { /* Ignore animations that cannot be paused by the browser. */ }
  });
  root.addEventListener("focusout", () => {
    if (!preferences.paused) {
      try { activeTravelAnimation?.play(); }
      catch { /* Ignore animations that cannot be resumed by the browser. */ }
    }
  });

  document.querySelectorAll(".mode-option").forEach((button) => {
    button.addEventListener("click", () => {
      clearTimeout(deferredMessageTimer);
      deferredMessageTimer = window.setTimeout(() => {
        deferredMessageTimer = null;
        showMessage(choose(messages[getMode()]));
      }, 120);
    });
  });

  const status = document.getElementById("status");
  if (status) {
    observeElement(status, () => {
      if (status.classList.contains("is-positive")) react("correct");
      else if (status.classList.contains("is-negative")) react("wrong");
    }, { childList: true, attributes: true, attributeFilter: ["class"] });
  }

  const finalOverlay = document.getElementById("finalOverlay");
  if (finalOverlay) {
    observeElement(finalOverlay, () => {
      if (finalOverlay.classList.contains("open")) react("complete");
    }, { attributes: true, attributeFilter: ["class"] });
  }

  window.addEventListener("tarif-toni:react", (event) => {
    const type = event.detail?.type;
    if (!messages[type]) return;
    react(type, event.detail?.message);
  });

  window.addEventListener("tarif-toni:set-enabled", (event) => {
    const enabled = Boolean(event.detail?.enabled);
    preferences.hidden = !enabled;
    if (enabled) {
      preferences.minimized = false;
      position = findFreePosition();
      applyPosition();
    } else {
      setAskPanelOpen(false);
    }
    syncPreferences();
    if (enabled) showMessage("Tarif Toni ist wieder da.");
  });

  window.addEventListener("tarif-toni:request-state", emitState);

  window.addEventListener("resize", () => {
    stopTravel();
    position = findFreePosition();
    applyPosition();
  }, { passive: true });

  function handleReducedMotionChange() {
    if (reduceMotion.matches) {
      stopTravel();
      clearMotionTimer();
      root.dataset.motion = "idle";
    }
    scheduleBehavior();
  }

  if (typeof reduceMotion.addEventListener === "function") {
    reduceMotion.addEventListener("change", handleReducedMotionChange);
  } else if (typeof reduceMotion.addListener === "function") {
    reduceMotion.addListener(handleReducedMotionChange);
  }

  window.addEventListener("beforeunload", () => {
    clearBehaviorTimer();
    clearBubbleTimer();
    clearMotionTimer();
    clearTimeout(greetingTimer);
    clearTimeout(deferredMessageTimer);
    stopTravel();
    observers.forEach((observer) => observer.disconnect());
    observers.length = 0;
    if (typeof reduceMotion.removeEventListener === "function") {
      reduceMotion.removeEventListener("change", handleReducedMotionChange);
    } else if (typeof reduceMotion.removeListener === "function") {
      reduceMotion.removeListener(handleReducedMotionChange);
    }
  }, { once: true });

  position = findFreePosition();
  applyPosition();
  syncPreferences();
  scheduleBehavior(true);
  greetingTimer = window.setTimeout(() => showMessage("Hallo, ich bin Tarif Toni. Klick mich an, wenn du mich brauchst."), 900);
})();

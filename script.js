
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

function goToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}
const CLIENT_ID = "client";
const PASSWORD = "scarsfitseverybody327";
const ACCESS_SEQUENCE_MS = 3270;
const ARCHIVE_REVEAL_MS = 7230;
const STAY_INTERRUPT_MS = 32700;
const DIRECT_SHOP_ENTRY = new URLSearchParams(window.location.search).get("shop") === "1";

const accessScreen = document.getElementById("accessScreen");
const touchBox = document.getElementById("touchBox");
const loginPanel = document.getElementById("loginPanel");
const identifierField = document.getElementById("identifierField");
const passwordField = document.getElementById("passwordField");
const identifierText = document.getElementById("identifierText");
const passwordText = document.getElementById("passwordText");
const shopButton = document.getElementById("shopButton");
const fakeCursor = document.getElementById("fakeCursor");
const serverLoading = document.getElementById("serverLoading");
const stayOverlay = document.getElementById("stayOverlay");
const wastedOverlay = document.getElementById("wastedOverlay");
const shopOverOverlay = document.getElementById("shopOverOverlay");
const continueButton = document.getElementById("continueButton");
const quitButton = document.getElementById("quitButton");
const shopCountdown = document.getElementById("shopCountdown");

const DVD_COLORS = shuffleArray([
  "rgba(255, 255, 255, 0.70)",
  "rgba(255, 42, 42, 0.72)",
  "rgba(255, 191, 0, 0.74)",
  "rgba(49, 255, 112, 0.72)",
  "rgba(0, 218, 255, 0.72)",
  "rgba(128, 87, 255, 0.72)",
  "rgba(255, 74, 207, 0.72)"
]);

let dvdAnimationFrame = null;
let dvdX = 0;
let dvdY = 0;
let dvdDx = 1.35;
let dvdDy = 1.05;
let currentColor = Math.floor(Math.random() * DVD_COLORS.length);
let lastFrameTime = null;
let accessStarted = false;
let sequenceFinished = false;
let activeMove = null;
let lastDvdColorChange = 0;
let stayTimer = null;
let stayOverlayShown = false;
let shopCountdownTimer = null;
let stayActivityListening = false;

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function shuffleArray(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}

function playBeep(freq = 540, duration = 0.05, type = "square", gainValue = 0.052) {
  ensureAudio();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainValue;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.start(now);
  osc.stop(now + duration);
}


function playTone(freq, start, duration, type = "square", gainValue = 0.066) {
  ensureAudio();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime + start);
  gain.gain.setValueAtTime(0.0001, audioCtx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(gainValue, audioCtx.currentTime + start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + start + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime + start);
  osc.stop(audioCtx.currentTime + start + duration + 0.02);
}




function playUiSelectSound() {
  ensureAudio();
  if (!audioCtx) return;
  playTone(660, 0, 0.055, "triangle", 0.034);
  playTone(430, 0.052, 0.085, "sine", 0.026);
}

function playWastedLikeSound() {
  ensureAudio();
  if (!audioCtx) return;

  // Different GTA-like dark stinger: low hit + reversed-feel swell + descending chords. No sample used.
  const now = audioCtx.currentTime;

  const master = audioCtx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.096, now + 0.04);
  master.gain.setValueAtTime(0.084, now + 0.95);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 2.35);
  master.connect(audioCtx.destination);

  // Heavy sub hit
  const sub = audioCtx.createOscillator();
  const subGain = audioCtx.createGain();
  sub.type = "sine";
  sub.frequency.setValueAtTime(48, now);
  sub.frequency.exponentialRampToValueAtTime(31, now + 0.95);
  subGain.gain.setValueAtTime(0.46, now);
  subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);
  sub.connect(subGain);
  subGain.connect(master);
  sub.start(now);
  sub.stop(now + 1.12);

  // Minor chord drop, more serious, less goofy
  const chord = [
    { f: 174.61, d: 0.00, g: 0.13 },
    { f: 207.65, d: 0.035, g: 0.09 },
    { f: 261.63, d: 0.07, g: 0.07 },
    { f: 130.81, d: 0.42, g: 0.11 },
    { f: 98.00, d: 0.78, g: 0.12 }
  ];

  chord.forEach(({ f, d, g }, i) => {
    const osc = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();

    osc.type = i < 3 ? "triangle" : "sawtooth";
    osc.frequency.setValueAtTime(f, now + d);
    osc.frequency.exponentialRampToValueAtTime(f * 0.78, now + d + 1.25);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(850, now + d);
    filter.frequency.exponentialRampToValueAtTime(190, now + d + 1.45);

    gain.gain.setValueAtTime(g, now + d);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + d + 1.55);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(now + d);
    osc.stop(now + d + 1.62);
  });

  // Quiet dark noise tail
  const buffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * 0.85), audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    const fade = 1 - i / data.length;
    data[i] = (Math.random() * 2 - 1) * fade * fade * 0.55;
  }

  const noise = audioCtx.createBufferSource();
  const bp = audioCtx.createBiquadFilter();
  const noiseGain = audioCtx.createGain();
  noise.buffer = buffer;
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(260, now + 0.18);
  bp.Q.setValueAtTime(0.55, now + 0.18);
  noiseGain.gain.setValueAtTime(0.035, now + 0.18);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.03);
  noise.connect(bp);
  bp.connect(noiseGain);
  noiseGain.connect(master);
  noise.start(now + 0.18);
  noise.stop(now + 1.05);
}

function playRetroLoseSound() {
  ensureAudio();
  if (!audioCtx) return;

  // Retro losing-jingle style, altered and synthesized.
  const notes = [987.77, 783.99, 659.25, 523.25, 391.99, 329.63, 261.63];
  notes.forEach((freq, index) => {
    playTone(freq, index * 0.095, 0.125, "square", 0.033);
  });

  // small low fall at the end
  playTone(196, 0.72, 0.32, "triangle", 0.018);
  playTone(130.81, 0.84, 0.42, "triangle", 0.016);
}

function setDvdColor() {
  if (!touchBox) return;
  touchBox.style.setProperty("--dvd-color", DVD_COLORS[currentColor % DVD_COLORS.length]);
}

function applyDvdMotionProfile() {
  const isMobile = window.innerWidth <= 760;
  const baseDx = isMobile ? randomBetween(0.22, 0.62) : randomBetween(0.9, 1.75);
  const baseDy = isMobile ? randomBetween(1.1, 2.35) : randomBetween(0.78, 1.45);
  const dirX = Math.random() < 0.5 ? -1 : 1;
  const dirY = Math.random() < 0.5 ? -1 : 1;
  dvdDx = dirX * baseDx;
  dvdDy = dirY * baseDy;
}

function resetDvdPosition() {
  if (!touchBox || accessStarted) return;
  applyDvdMotionProfile();

  const width = touchBox.offsetWidth || 340;
  const height = touchBox.offsetHeight || 76;
  const maxX = Math.max(0, window.innerWidth - width);
  const maxY = Math.max(0, window.innerHeight - height);

  if (dvdX === 0 && dvdY === 0) {
    dvdX = Math.max(0, Math.round(Math.random() * maxX));
    dvdY = Math.max(0, Math.round(Math.random() * maxY));
  } else {
    dvdX = Math.min(Math.max(0, dvdX), maxX);
    dvdY = Math.min(Math.max(0, dvdY), maxY);
  }

  touchBox.style.transform = `translate3d(${dvdX}px, ${dvdY}px, 0)`;
  setDvdColor();
}

function animateDvd(time) {
  if (!touchBox || accessStarted) return;

  if (lastFrameTime === null) lastFrameTime = time;
  const delta = Math.min(34, time - lastFrameTime) / 16.67;
  lastFrameTime = time;

  const width = touchBox.offsetWidth || 340;
  const height = touchBox.offsetHeight || 76;
  const maxX = Math.max(0, window.innerWidth - width);
  const maxY = Math.max(0, window.innerHeight - height);
  let bounced = false;

  dvdX += dvdDx * delta;
  dvdY += dvdDy * delta;

  if (dvdX <= 0) {
    dvdX = 0;
    dvdDx = Math.abs(dvdDx);
    bounced = true;
  } else if (dvdX >= maxX) {
    dvdX = maxX;
    dvdDx = -Math.abs(dvdDx);
    bounced = true;
  }

  if (dvdY <= 0) {
    dvdY = 0;
    dvdDy = Math.abs(dvdDy);
    bounced = true;
  } else if (dvdY >= maxY) {
    dvdY = maxY;
    dvdDy = -Math.abs(dvdDy);
    bounced = true;
  }

  if (bounced) {
    const colorDelay = window.innerWidth <= 760 ? 900 : 260;
    if (!lastDvdColorChange || time - lastDvdColorChange > colorDelay) {
      currentColor = Math.floor(Math.random() * DVD_COLORS.length);
      setDvdColor();
      lastDvdColorChange = time;
    }
    const bounceRemix = window.innerWidth <= 760 ? 0.16 : 0.24;
    dvdDx += (dvdDx > 0 ? 1 : -1) * randomBetween(-bounceRemix, bounceRemix);
    dvdDy += (dvdDy > 0 ? 1 : -1) * randomBetween(-bounceRemix, bounceRemix);
  }

  touchBox.style.transform = `translate3d(${dvdX}px, ${dvdY}px, 0)`;
  dvdAnimationFrame = window.requestAnimationFrame(animateDvd);
}

function startDvdAnimation() {
  resetDvdPosition();
  dvdAnimationFrame = window.requestAnimationFrame(animateDvd);
}

function getPointForElement(element, xRatio = 0.5, yRatio = 0.5) {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width * xRatio,
    y: rect.top + rect.height * yRatio
  };
}

function showCursor() {
  if (!fakeCursor) return;
  fakeCursor.classList.remove("is-hidden");
}

function hideCursor() {
  if (!fakeCursor) return;
  fakeCursor.classList.add("is-hidden");
}

function setCursorHand(isHand) {
  if (!fakeCursor) return;
  fakeCursor.classList.toggle("is-hand", Boolean(isHand));
}

function moveCursorTo(element, xRatio = 0.5, yRatio = 0.5, duration = 390) {
  if (!fakeCursor || !element) return sleep(duration);

  const point = getPointForElement(element, xRatio, yRatio);
  const cursorX = Math.max(8, Math.round(point.x));
  const cursorY = Math.max(8, Math.round(point.y));

  fakeCursor.style.transitionDuration = `${duration}ms, 120ms`;
  fakeCursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;

  if (activeMove) window.clearTimeout(activeMove);
  return new Promise((resolve) => {
    activeMove = window.setTimeout(resolve, duration + 35);
  });
}

function clearActiveFields() {
  identifierField?.classList.remove("is-active");
  passwordField?.classList.remove("is-active");
}

async function typeInto(field, target, value, speed = 42) {
  clearActiveFields();
  field.classList.add("is-active");
  target.textContent = "";
  hideCursor();

  for (let i = 0; i < value.length; i += 1) {
    target.textContent += value[i];
    await sleep(speed);
  }

  field.classList.remove("is-active");
  await sleep(70);
  showCursor();
}

async function clickShopButton() {
  setCursorHand(false);
  await moveCursorTo(shopButton, 0.52, 0.56, 360);
  setCursorHand(true);
  shopButton.classList.add("is-hovered");
  playBeep(640, 0.045, "triangle", 0.018);
  await sleep(90);

  const cursorBaseTransform = fakeCursor ? fakeCursor.style.transform : "";
  if (fakeCursor) {
    fakeCursor.style.transitionDuration = "95ms, 90ms";
    fakeCursor.style.transform = `${cursorBaseTransform} scale(0.94)`;
  }

  shopButton.classList.add("is-pressed");
  playBeep(780, 0.08, "sawtooth", 0.016);
  await sleep(96);

  if (fakeCursor) fakeCursor.style.transform = cursorBaseTransform;
  shopButton.classList.remove("is-pressed");
  await sleep(90);
}

function openDirectShop() {
  const targetHash = window.location.hash;
  if (!targetHash) goToTop();
  if (accessScreen) accessScreen.remove();
  document.body.classList.add("show-intro", "shop-direct", "archive-revealed");
  document.body.classList.remove("access-login", "cursor-ready", "access-loading", "access-done");

  if (targetHash) {
    window.setTimeout(() => {
      const target = document.querySelector(targetHash);
      if (target) target.scrollIntoView({ block: "start", behavior: "auto" });
    }, 80);
  }

  startStayInterruptTimer();

  if (window.history && window.history.replaceState) {
    window.history.replaceState({}, document.title, window.location.pathname + targetHash);
  }
}


function chooseStayMode() {
  let nextMode = "wasted";
  try {
    const previous = window.localStorage.getItem("scars327-stay-mode");
    nextMode = previous === "wasted" ? "shop" : "wasted";
    window.localStorage.setItem("scars327-stay-mode", nextMode);
  } catch (error) {
    nextMode = Math.random() < 0.5 ? "wasted" : "shop";
  }
  return nextMode;
}

function hideStayOverlay() {
  stayOverlayShown = true;
  if (stayTimer) {
    window.clearTimeout(stayTimer);
    stayTimer = null;
  }
  if (shopCountdownTimer) {
    window.clearInterval(shopCountdownTimer);
    shopCountdownTimer = null;
  }
  if (stayOverlay) {
    stayOverlay.setAttribute("aria-hidden", "true");
    stayOverlay.dataset.mode = "";
  }
  document.body.classList.remove("stay-overlay-on", "stay-locked");
}

function runShopCountdown() {
  if (!shopCountdown) return;
  let remaining = 15;
  shopCountdown.textContent = String(remaining);
  shopCountdown.classList.toggle("is-gold", [3, 2, 7].includes(remaining));

  shopCountdownTimer = window.setInterval(() => {
    remaining -= 1;
    shopCountdown.textContent = String(remaining);
    shopCountdown.classList.toggle("is-gold", [3, 2, 7].includes(remaining));

    if (remaining <= 0) {
      window.clearInterval(shopCountdownTimer);
      shopCountdownTimer = null;
      hideStayOverlay();
    }
  }, 1000);
}

function showStayOverlay() {
  if (stayOverlayShown || !stayOverlay) return;
  stayOverlayShown = true;
  const mode = chooseStayMode();
  stayOverlay.dataset.mode = mode;
  stayOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("stay-overlay-on", "stay-locked");

  if (mode === "shop") {
    playRetroLoseSound();
    runShopCountdown();
  } else {
    playWastedLikeSound();
  }
}

function resetStayInterruptTimer() {
  if (stayOverlayShown) return;
  if (stayTimer) window.clearTimeout(stayTimer);
  stayTimer = window.setTimeout(showStayOverlay, STAY_INTERRUPT_MS);
}

function handleStayActivity() {
  if (stayOverlayShown) return;
  resetStayInterruptTimer();
}

function startStayInterruptTimer() {
  if (stayOverlayShown) return;

  if (!stayActivityListening) {
    stayActivityListening = true;
    ["mousemove", "mousedown", "keydown", "wheel", "scroll", "touchstart", "touchmove", "click"].forEach((eventName) => {
      window.addEventListener(eventName, handleStayActivity, { passive: true });
    });
  }

  resetStayInterruptTimer();
}

if (continueButton) {
  continueButton.addEventListener("click", () => {
    playUiSelectSound();
    hideStayOverlay();
  });
}

if (quitButton) {
  quitButton.addEventListener("click", () => {
    playUiSelectSound();
    window.setTimeout(() => {
      window.location.href = "https://www.instagram.com/327scars?igsh=MW13dHhydmlmdnVoeQ%3D%3D&utm_source=qr";
    }, 120);
  });
}

function revealArchiveLink() {
  window.setTimeout(() => {
    document.body.classList.add("archive-revealed");
  }, ARCHIVE_REVEAL_MS);
}

function launchGoldenIntro() {
  if (sequenceFinished) return;
  sequenceFinished = true;
  document.body.classList.add("access-done");
  goToTop();

  window.setTimeout(() => {
    if (accessScreen) accessScreen.remove();
    goToTop();
    document.body.classList.add("show-intro");
    revealArchiveLink();
    startStayInterruptTimer();
    window.setTimeout(goToTop, 1200);
    window.setTimeout(goToTop, 2400);
  }, 520);
}

function showServerLoading() {
  document.body.classList.add("access-loading");
  if (serverLoading) serverLoading.setAttribute("aria-hidden", "false");
}

async function runAccessSequence() {
  if (accessStarted) return;
  accessStarted = true;
  const startedAt = performance.now();

  ensureAudio();
  playBeep(520, 0.045, "square", 0.016);

  if (dvdAnimationFrame) {
    window.cancelAnimationFrame(dvdAnimationFrame);
    dvdAnimationFrame = null;
  }

  document.body.classList.add("access-login");
  if (loginPanel) loginPanel.setAttribute("aria-hidden", "false");

  identifierText.textContent = "";
  passwordText.textContent = "";

  await sleep(120);
  document.body.classList.add("cursor-ready");
  showCursor();
  setCursorHand(false);

  await moveCursorTo(identifierField, 0.88, 0.53, 220);
  await typeInto(identifierField, identifierText, CLIENT_ID, 34);

  await sleep(60);
  setCursorHand(false);
  await moveCursorTo(passwordField, 0.92, 0.53, 220);
  await typeInto(passwordField, passwordText, PASSWORD, 22);

  clearActiveFields();
  await sleep(70);
  await clickShopButton();

  hideCursor();
  showServerLoading();

  const elapsed = performance.now() - startedAt;
  await sleep(Math.max(420, ACCESS_SEQUENCE_MS - elapsed));
  launchGoldenIntro();
}

if (DIRECT_SHOP_ENTRY) {
  openDirectShop();
} else {
  if (touchBox) {
    touchBox.addEventListener("click", runAccessSequence);
    touchBox.addEventListener("touchend", (event) => {
      event.preventDefault();
      runAccessSequence();
    }, { passive: false });
  }

  if (shopButton) {
    shopButton.addEventListener("click", () => {
      if (passwordText.textContent === PASSWORD && identifierText.textContent === CLIENT_ID) {
        launchGoldenIntro();
      }
    });
  }

  window.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && !accessStarted) runAccessSequence();
  });

  window.addEventListener("resize", () => {
    if (!accessStarted) resetDvdPosition();
  });

  window.addEventListener("load", () => {
    goToTop();
    startDvdAnimation();
  });
  if (document.readyState !== "loading") {
    goToTop();
    startDvdAnimation();
  }
}


/* v81 - mobile shirt autoplay + manual tap toggle */
(function () {
  const mobileQuery = window.matchMedia('(max-width: 700px)');
  const cards = Array.from(document.querySelectorAll('.product-card'));
  if (!cards.length) return;

  function clearManualState(card) {
    card.classList.remove('is-manual', 'is-manual-front', 'is-manual-back');
    delete card.dataset.manualFace;
  }

  function applyManualFace(card, face) {
    card.classList.add('is-manual');
    card.classList.toggle('is-manual-front', face === 'front');
    card.classList.toggle('is-manual-back', face === 'back');
    card.dataset.manualFace = face;
  }

  function bindCard(card) {
    if (card.dataset.mobileFlipBound === 'true') return;
    card.dataset.mobileFlipBound = 'true';
    card.addEventListener('click', function (event) {
      if (!mobileQuery.matches) return;
      event.preventDefault();
      event.stopPropagation();
      const nextFace = card.dataset.manualFace === 'back' ? 'front' : 'back';
      applyManualFace(card, nextFace);
    }, { passive: false });
    card.addEventListener('keydown', function (event) {
      if (!mobileQuery.matches) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      const nextFace = card.dataset.manualFace === 'back' ? 'front' : 'back';
      applyManualFace(card, nextFace);
    });
    card.dataset.mobileFlipKeyBound = 'true';
  }

  cards.forEach(bindCard);
  mobileQuery.addEventListener?.('change', (event) => {
    if (!event.matches) {
      cards.forEach(clearManualState);
    }
  });
})();

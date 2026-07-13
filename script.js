
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

function playBeep(freq = 540, duration = 0.05, type = "square", gainValue = 0.018) {
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
  goToTop();
  if (accessScreen) accessScreen.remove();
  document.body.classList.add("show-intro", "shop-direct", "archive-revealed");
  document.body.classList.remove("access-login", "cursor-ready", "access-loading", "access-done");

  if (window.history && window.history.replaceState) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
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

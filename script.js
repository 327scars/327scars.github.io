const CLIENT_ID = "client";
const PASSWORD = "scarsfitseverybody327";
const ACCESS_SEQUENCE_MS = 3270;

const accessScreen = document.getElementById("accessScreen");
const touchBox = document.getElementById("touchBox");
const loginPanel = document.getElementById("loginPanel");
const identifierField = document.getElementById("identifierField");
const passwordField = document.getElementById("passwordField");
const identifierText = document.getElementById("identifierText");
const passwordText = document.getElementById("passwordText");
const shopButton = document.getElementById("shopButton");
const fakeCursor = document.getElementById("fakeCursor");

const DVD_COLORS = [
  "rgba(255, 255, 255, 0.70)",
  "rgba(255, 42, 42, 0.72)",
  "rgba(255, 191, 0, 0.74)",
  "rgba(49, 255, 112, 0.72)",
  "rgba(0, 218, 255, 0.72)",
  "rgba(128, 87, 255, 0.72)",
  "rgba(255, 74, 207, 0.72)"
];

let dvdAnimationFrame = null;
let dvdX = 0;
let dvdY = 0;
let dvdDx = 1.35;
let dvdDy = 1.05;
let currentColor = 0;
let lastFrameTime = null;
let accessStarted = false;
let sequenceFinished = false;
let activeMove = null;
let lastDvdColorChange = 0;

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function setDvdColor() {
  if (!touchBox) return;
  touchBox.style.setProperty("--dvd-color", DVD_COLORS[currentColor % DVD_COLORS.length]);
}

function applyDvdMotionProfile() {
  const isMobile = window.innerWidth <= 760;
  const baseDx = isMobile ? 0.42 : 1.35;
  const baseDy = isMobile ? 1.72 : 1.05;
  dvdDx = (dvdDx < 0 ? -1 : 1) * baseDx;
  dvdDy = (dvdDy < 0 ? -1 : 1) * baseDy;
}

function resetDvdPosition() {
  if (!touchBox || accessStarted) return;
  applyDvdMotionProfile();

  const width = touchBox.offsetWidth || 340;
  const height = touchBox.offsetHeight || 76;
  const maxX = Math.max(0, window.innerWidth - width);
  const maxY = Math.max(0, window.innerHeight - height);

  if (dvdX === 0 && dvdY === 0) {
    dvdX = Math.max(0, Math.round(maxX / 2));
    dvdY = Math.max(0, Math.round(maxY / 2));
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
    const colorDelay = window.innerWidth <= 760 ? 1150 : 360;
    if (!lastDvdColorChange || time - lastDvdColorChange > colorDelay) {
      currentColor += 1;
      setDvdColor();
      lastDvdColorChange = time;
    }
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
  await sleep(110);

  const cursorBaseTransform = fakeCursor ? fakeCursor.style.transform : "";
  if (fakeCursor) {
    fakeCursor.style.transitionDuration = "95ms, 90ms";
    fakeCursor.style.transform = `${cursorBaseTransform} scale(0.94)`;
  }

  shopButton.classList.add("is-pressed");
  await sleep(105);

  if (fakeCursor) fakeCursor.style.transform = cursorBaseTransform;
  shopButton.classList.remove("is-pressed");
  await sleep(90);
}

function launchGoldenIntro() {
  if (sequenceFinished) return;
  sequenceFinished = true;
  document.body.classList.add("access-done");

  window.setTimeout(() => {
    if (accessScreen) accessScreen.remove();
    document.body.classList.add("show-intro");
  }, 520);
}

async function runAccessSequence() {
  if (accessStarted) return;
  accessStarted = true;
  const startedAt = performance.now();

  if (dvdAnimationFrame) {
    window.cancelAnimationFrame(dvdAnimationFrame);
    dvdAnimationFrame = null;
  }

  document.body.classList.add("access-login");
  if (loginPanel) loginPanel.setAttribute("aria-hidden", "false");

  identifierText.textContent = "";
  passwordText.textContent = "";

  await sleep(210);
  document.body.classList.add("cursor-ready");
  showCursor();
  setCursorHand(false);

  // Le curseur se pose plutôt vers la droite du rectangle avant d'écrire.
  await moveCursorTo(identifierField, 0.88, 0.53, 390);
  await typeInto(identifierField, identifierText, CLIENT_ID, 48);

  await sleep(120);
  setCursorHand(false);
  await moveCursorTo(passwordField, 0.92, 0.53, 390);
  await typeInto(passwordField, passwordText, PASSWORD, 34);

  clearActiveFields();
  await sleep(110);
  await clickShopButton();

  const elapsed = performance.now() - startedAt;
  await sleep(Math.max(0, ACCESS_SEQUENCE_MS - elapsed));
  launchGoldenIntro();
}

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

window.addEventListener("load", startDvdAnimation);
if (document.readyState !== "loading") startDvdAnimation();

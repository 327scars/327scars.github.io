/* SCARS327 — système de marques (cicatrices)
   Chargé sur toutes les pages. Stocke la progression en localStorage,
   affiche une notification façon trophée PS (slide depuis la droite,
   4 paliers) mais habillée dans le langage et les couleurs de la
   marque :
     bronze  -> bronze réel (pas de détournement de couleur ici)
     argent  -> blanc-gris froid, proche de --scars-white
     or      -> #fbaf17, déjà la couleur "327" du site
     platine -> vert néon #57ff7a, déjà la couleur des Archives,
                révélé en glitch, affiché plus longtemps

   Une marque gagnée juste avant une navigation (ex: choix d'un starter,
   qui enchaîne vers product.html ~1.2s après) reste en attente dans
   sessionStorage et se termine d'afficher sur la page suivante, pour
   que le visiteur ait vraiment le temps de la lire.

   Utilisation depuis n'importe quelle page :
     window.SCARS327Marks.unlock('touch-here');
*/
(function () {
  const STORAGE_KEY = "scars327_marks";
  const PENDING_KEY = "scars327_marks_pending";

  const MARKS = {
    "touch-here": {
      tier: "bronze",
      fr: { name: "PREMIER CONTACT", desc: "tu as touché l’écran" },
      en: { name: "FIRST CONTACT", desc: "you touched the screen" }
    },
    "starter-white": {
      tier: "argent",
      fr: { name: "STARTER BLANC", desc: "clarté choisie" },
      en: { name: "WHITE STARTER", desc: "clarity chosen" }
    },
    "starter-black": {
      tier: "argent",
      fr: { name: "STARTER NOIR", desc: "profondeur choisie" },
      en: { name: "BLACK STARTER", desc: "depth chosen" }
    },
    "starter-pink": {
      tier: "argent",
      fr: { name: "STARTER ROSE", desc: "audace choisie" },
      en: { name: "PINK STARTER", desc: "boldness chosen" }
    },
    "wasted": {
      tier: "or",
      fr: { name: "WASTED", desc: "tu es resté trop longtemps" },
      en: { name: "WASTED", desc: "you stayed too long" }
    },
    "shop-over": {
      tier: "or",
      fr: { name: "SHOP OVER", desc: "32,7 secondes passées" },
      en: { name: "SHOP OVER", desc: "32.7 seconds passed" }
    },
    "archives": {
      tier: "platine",
      fr: { name: "327'S ARCHIVES", desc: "archive ouverte" },
      en: { name: "327'S ARCHIVES", desc: "archive opened" }
    }
  };

  /* Noms de palier volontairement dans le ton SCARS327, identiques en
     FR/EN comme "Professeur c3h2e7n" : ça ne se traduit pas. */
  const TIER_LABEL = {
    bronze: "PETITES CICATRICES",
    argent: "CICATRICES GÊNANTES",
    or: "GROSSE CICATRICE",
    platine: "XXL CICATRICE PRO MAX V12 BI-TURBO"
  };

  const TIER_DISPLAY_MS = {
    bronze: 3200,
    argent: 3200,
    or: 3200,
    platine: 4800
  };

  function currentLang() {
    try {
      const raw =
        window.localStorage.getItem("scars327_lang") ||
        window.localStorage.getItem("scars327-info-lang") ||
        document.documentElement.lang ||
        "fr";
      return String(raw).toLowerCase().indexOf("en") === 0 ? "en" : "fr";
    } catch (e) {
      return "fr";
    }
  }

  function readState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeState(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* navigation privée stricte ou storage plein : on continue sans persister */
    }
  }

  function readPending() {
    try {
      const raw = window.sessionStorage.getItem(PENDING_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function writePending(list) {
    try {
      window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(list));
    } catch (e) {
      /* pas grave si ça ne persiste pas, la marque reste débloquée dans STORAGE_KEY */
    }
  }

  function addPending(id) {
    const list = readPending();
    if (list.indexOf(id) === -1) list.push(id);
    writePending(list);
  }

  function removePending(id) {
    writePending(readPending().filter((x) => x !== id));
  }

  function has(id) {
    return Boolean(readState()[id]);
  }

  function getAll() {
    const state = readState();
    const lang = currentLang();
    return Object.keys(MARKS).map((id) => ({
      id: id,
      tier: MARKS[id].tier,
      tierLabel: TIER_LABEL[MARKS[id].tier],
      name: MARKS[id][lang].name,
      desc: MARKS[id][lang].desc,
      unlocked: Boolean(state[id])
    }));
  }

  let audioCtx = null;
  function playMarkSound(isGlitch) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const now = audioCtx.currentTime;
      const notes = isGlitch
        ? [[220, 0, 0.04, 0.05], [640, 0.03, 0.03, 0.045], [180, 0.06, 0.05, 0.05],
           [900, 0.1, 0.04, 0.04], [720, 0.16, 0.09, 0.05], [980, 0.24, 0.09, 0.045], [1280, 0.33, 0.15, 0.045]]
        : [[720, 0, 0.07, 0.05], [980, 0.07, 0.09, 0.045], [1280, 0.16, 0.13, 0.04]];
      notes.forEach(([freq, start, dur, vol]) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = isGlitch ? "square" : "triangle";
        osc.frequency.setValueAtTime(freq, now + start);
        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(vol, now + start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + start);
        osc.stop(now + start + dur + 0.02);
      });
    } catch (e) {
      /* pas d'audio dispo, silencieux */
    }
  }

  const TROPHY_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true" class="scars-mark-toast__trophy-icon">' +
    '<path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />' +
    '<path d="M7 5H4a3 3 0 0 0 3 5" />' +
    '<path d="M17 5h3a3 3 0 0 1-3 5" />' +
    '<path d="M12 13v3" />' +
    '<path d="M9 20h6" />' +
    '<path d="M10 16.5h4l.6 3.5H9.4l.6-3.5Z" />' +
    "</svg>";

  let queue = [];
  let showing = false;

  function ensureContainer() {
    let el = document.getElementById("scarsMarkToast");
    if (el) return el;
    el = document.createElement("div");
    el.id = "scarsMarkToast";
    el.className = "scars-mark-toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.innerHTML =
      '<div class="scars-mark-toast__icon">' + TROPHY_SVG + "</div>" +
      '<div class="scars-mark-toast__body">' +
      '<span class="scars-mark-toast__eyebrow"></span>' +
      '<span class="scars-mark-toast__name"></span>' +
      '<span class="scars-mark-toast__desc"></span>' +
      "</div>";
    document.body.appendChild(el);
    return el;
  }

  function showNext() {
    if (showing || !queue.length) return;
    showing = true;
    const id = queue.shift();
    const mark = MARKS[id];
    const lang = currentLang();
    const copy = mark[lang];
    const el = ensureContainer();
    const isGlitch = mark.tier === "platine";

    el.className = "scars-mark-toast scars-mark-toast--" + mark.tier + (isGlitch ? " scars-mark-toast--glitch" : "");
    el.querySelector(".scars-mark-toast__eyebrow").textContent = TIER_LABEL[mark.tier];
    el.querySelector(".scars-mark-toast__name").textContent = copy.name;
    el.querySelector(".scars-mark-toast__desc").textContent = copy.desc;

    playMarkSound(isGlitch);
    requestAnimationFrame(() => el.classList.add("is-visible"));

    const displayMs = TIER_DISPLAY_MS[mark.tier] || 3200;
    window.setTimeout(() => {
      el.classList.remove("is-visible");
      window.setTimeout(() => {
        showing = false;
        removePending(id);
        showNext();
      }, 320);
    }, displayMs);
  }

  function unlock(id, options) {
    if (!MARKS[id]) return false;
    const state = readState();
    if (state[id]) return false;
    state[id] = { at: new Date().toISOString() };
    writeState(state);
    addPending(id);
    /* defer: true -> la marque est enregistrée et mise en attente, mais
       ne s'affiche pas sur la page courante. Utile quand une navigation
       suit tout de suite (ex: choix d'un starter) : la notification
       apparaît seulement une fois arrivée sur la page suivante, via
       resumePending(), au lieu de démarrer puis d'être coupée. */
    if (options && options.defer) return true;
    queue.push(id);
    if (document.body) {
      showNext();
    } else {
      document.addEventListener("DOMContentLoaded", showNext, { once: true });
    }
    return true;
  }

  function resumePending() {
    const pending = readPending();
    if (!pending.length) return;
    pending.forEach((id) => {
      if (MARKS[id] && queue.indexOf(id) === -1) queue.push(id);
    });
    showNext();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", resumePending);
  } else {
    resumePending();
  }

  window.SCARS327Marks = { unlock, has, getAll, MARKS };
})();

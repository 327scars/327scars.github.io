/* SCARS327 tracking v159
   Remplace les IDs ci-dessous avant mise en ligne :
   - GA4_MEASUREMENT_ID : Google Analytics 4, format G-XXXXXXXXXX
   - META_PIXEL_ID : Meta/Facebook Pixel
   - TIKTOK_PIXEL_ID : TikTok Pixel
   Si un ID reste vide ou commence par "REPLACE_", le pixel correspondant ne se charge pas.
*/
(function () {
  const CONFIG = {
    GA4_MEASUREMENT_ID: "REPLACE_GA4_MEASUREMENT_ID",
    META_PIXEL_ID: "REPLACE_META_PIXEL_ID",
    TIKTOK_PIXEL_ID: "REPLACE_TIKTOK_PIXEL_ID",
    DEBUG: false
  };

  const isRealId = (value) => value && !String(value).startsWith("REPLACE_");
  const pagePath = window.location.pathname || "/";
  const params = new URLSearchParams(window.location.search);

  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  function log() {
    if (CONFIG.DEBUG) console.log.apply(console, ["[SCARS327 tracking]"].concat([].slice.call(arguments)));
  }

  function loadScript(src, id) {
    if (id && document.getElementById(id)) return;
    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    if (id) script.id = id;
    document.head.appendChild(script);
  }

  function initGA4() {
    if (!isRealId(CONFIG.GA4_MEASUREMENT_ID)) return;
    loadScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(CONFIG.GA4_MEASUREMENT_ID), "scars327-ga4");
    gtag("js", new Date());
    gtag("config", CONFIG.GA4_MEASUREMENT_ID, {
      page_title: document.title,
      page_path: pagePath
    });
  }

  function initMetaPixel() {
    if (!isRealId(CONFIG.META_PIXEL_ID)) return;
    !function(f,b,e,v,n,t,s){
      if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)
    }(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq("init", CONFIG.META_PIXEL_ID);
    window.fbq("track", "PageView");
  }

  function initTikTokPixel() {
    if (!isRealId(CONFIG.TIKTOK_PIXEL_ID)) return;
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
      ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
      ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
      for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
      ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
      ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
        ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};
        var o=d.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;
        var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
    }(window, document, 'ttq');
    window.ttq.load(CONFIG.TIKTOK_PIXEL_ID);
    window.ttq.page();
  }

  function sendEvent(eventName, payload) {
    const data = Object.assign({
      page_path: pagePath,
      page_title: document.title,
      language: document.documentElement.lang || "fr"
    }, payload || {});

    window.dataLayer.push(Object.assign({ event: eventName }, data));

    if (typeof window.gtag === "function" && isRealId(CONFIG.GA4_MEASUREMENT_ID)) {
      window.gtag("event", eventName, data);
    }
    if (typeof window.fbq === "function" && isRealId(CONFIG.META_PIXEL_ID)) {
      window.fbq("trackCustom", eventName, data);
    }
    if (window.ttq && typeof window.ttq.track === "function" && isRealId(CONFIG.TIKTOK_PIXEL_ID)) {
      window.ttq.track(eventName, data);
    }
    log(eventName, data);
  }

  window.SCARS327Track = sendEvent;

  function getProductColorFromElement(element) {
    if (!element) return "unknown";
    const href = element.getAttribute && element.getAttribute("href");
    if (href) {
      try {
        const url = new URL(href, window.location.href);
        const item = url.searchParams.get("item");
        if (item) return item.toLowerCase();
      } catch (e) {}
    }
    const holder = element.closest && element.closest(".product-page, [id]");
    const source = [
      element.className || "",
      holder && holder.className || "",
      holder && holder.id || "",
      element.getAttribute && element.getAttribute("aria-label") || ""
    ].join(" ").toLowerCase();
    if (source.includes("black") || source.includes("noir")) return "black";
    if (source.includes("white") || source.includes("blanc")) return "white";
    if (source.includes("pink") || source.includes("rose")) return "pink";
    return "unknown";
  }

  function bindClickTracking() {
    document.addEventListener("click", function (event) {
      const link = event.target.closest && event.target.closest("a");
      if (link) {
        const href = link.getAttribute("href") || "";
        const label = (link.textContent || "").trim().replace(/\s+/g, " ");

        if (link.classList.contains("buy-card") || /story\.html\?item=/.test(href) || label.toLowerCase().includes("buy")) {
          const color = getProductColorFromElement(link);
          sendEvent("buy_click", {
            item_color: color,
            link_url: link.href || href,
            click_text: label
          });
          sendEvent("color_click", {
            item_color: color,
            click_source: "buy_button"
          });
        }

        if (/instagram\.com/i.test(href)) {
          sendEvent("social_click", { platform: "instagram", link_url: link.href || href, click_text: label });
        }
        if (/x\.com|twitter\.com/i.test(href)) {
          sendEvent("social_click", { platform: "x_twitter", link_url: link.href || href, click_text: label });
        }
      }

      const card = event.target.closest && event.target.closest(".product-card, .product-page");
      if (card) {
        sendEvent("color_click", {
          item_color: getProductColorFromElement(card),
          click_source: card.classList.contains("product-card") ? "product_card" : "product_section"
        });
      }
    }, true);
  }

  function trackStoryTime() {
    const isStory = document.body.classList.contains("story-body") || /\/story\.html$/i.test(pagePath);
    if (!isStory) return;

    const item = (params.get("item") || "unknown").toLowerCase();
    const startedAt = Date.now();
    let lastMilestone = 0;
    let finalSent = false;

    sendEvent("story_start", { item_color: item });

    const milestones = [15, 30, 60, 120, 180, 327];
    const interval = window.setInterval(function () {
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      const next = milestones.find((m) => seconds >= m && m > lastMilestone);
      if (next) {
        lastMilestone = next;
        sendEvent("story_time_milestone", { item_color: item, seconds: next });
      }
    }, 5000);

    function sendFinal() {
      if (finalSent) return;
      finalSent = true;
      window.clearInterval(interval);
      const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      sendEvent("story_time_spent", { item_color: item, seconds: seconds });
    }

    window.addEventListener("pagehide", sendFinal);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") sendFinal();
    });
  }

  initGA4();
  initMetaPixel();
  initTikTokPixel();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      bindClickTracking();
      trackStoryTime();
    });
  } else {
    bindClickTracking();
    trackStoryTime();
  }
})();

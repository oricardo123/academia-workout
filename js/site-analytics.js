(() => {
  "use strict";

  const settings = document.currentScript?.dataset || {};
  const measurementId = settings.measurementId || "";
  const allowedHosts = (settings.allowedHosts || "").split(",");
  const production = allowedHosts.includes(location.hostname);
  if (!/^G-[A-Z0-9]+$/.test(measurementId)) return;
  if (document.querySelector("#analytics-consent")) return;

  const storageKey = `analytics-consent-${measurementId}-v1`;
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  const disableKey = `ga-disable-${measurementId}`;
  let started = false;
  let consent = null;
  let returnFocus = null;

  function readConsent() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved && ["granted", "denied"].includes(saved.choice) &&
          Number.isFinite(saved.expires) && saved.expires > Date.now()) {
        return saved.choice;
      }
    } catch { /* Storage can be unavailable in private or restricted browsers. */ }
    return null;
  }

  function saveConsent(choice) {
    consent = choice;
    try {
      localStorage.setItem(storageKey, JSON.stringify({choice, expires: Date.now() + lifetime}));
    } catch { /* The current-page choice still applies. */ }
  }

  // Page/referrer queries and fragments are not sent to Analytics.
  function cleanUrl(value) {
    try {
      const url = new URL(value);
      return /^https?:$/.test(url.protocol) ? url.origin + url.pathname : "";
    } catch { return ""; }
  }

  function clearAnalyticsCookies() {
    const names = ["_ga", `_ga_${measurementId.slice(2)}`];
    const hostParts = location.hostname.split(".");
    const domains = [""];
    for (let i = 0; i < hostParts.length - 1; i++) {
      domains.push(`; Domain=${hostParts.slice(i).join(".")}`);
    }
    names.forEach((name) => domains.forEach((domain) => {
      document.cookie = `${name}=; Max-Age=0; Path=/${domain}; SameSite=Lax`;
    }));
  }

  function startAnalytics() {
    if (started || consent !== "granted" || !production) return;
    started = true;
    window[disableKey] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", {
      analytics_storage: "denied", ad_storage: "denied",
      ad_user_data: "denied", ad_personalization: "denied",
    });
    window.gtag("consent", "update", {analytics_storage: "granted"});
    window.gtag("set", "ads_data_redaction", true);
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: lifetime / 1000,
      cookie_flags: "SameSite=Lax;Secure",
      page_location: cleanUrl(location.href),
      page_referrer: cleanUrl(document.referrer),
    });
    window.gtag("event", "page_view", {
      send_to: measurementId,
      page_location: cleanUrl(location.href),
      page_referrer: cleanUrl(document.referrer),
      page_title: document.title,
    });

    const tag = document.createElement("script");
    tag.async = true;
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.append(tag);
  }

  function stopAnalytics() {
    window[disableKey] = true;
    clearAnalyticsCookies();
    // Reload removes Google's runtime after a withdrawal; next load stays untagged.
    if (started) location.reload();
  }

  function contactEvent(href) {
    try {
      const url = new URL(href, location.href);
      if (url.protocol === "tel:") return "phone_click";
      if (url.protocol === "mailto:") return "email_click";
      if (url.hostname === "wa.me" || url.hostname === "api.whatsapp.com") return "whatsapp_click";
      if ((["www.google.com", "google.com", "maps.google.com"].includes(url.hostname) &&
           (url.pathname.startsWith("/maps") || url.hostname === "maps.google.com")) ||
          url.hostname === "maps.app.goo.gl") return "directions_click";
    } catch { /* Ignore malformed or unrelated links. */ }
    return null;
  }

  function trackContact(event) {
    if (consent !== "granted" || !started || window[disableKey]) return;
    if (event.type === "auxclick" && event.button !== 1) return;
    const link = event.target?.closest?.("a[href]");
    if (!link) return;
    const name = contactEvent(link.href);
    if (!name) return;
    const area = link.closest("header, footer, section[id]");
    const placement = area?.id || area?.tagName.toLowerCase() || "floating";
    window.gtag("event", name, {
      send_to: measurementId,
      link_placement: placement,
      page_location: cleanUrl(location.href),
    });
  }
  document.addEventListener("click", trackContact);
  document.addEventListener("auxclick", trackContact);

  const copy = {
    pt: {
      title: "Podemos medir visitas e cliques?",
      description: "Com a tua autorização, o Google Analytics usa cookies para medir páginas visitadas e cliques em contactos. Podes recusar e alterar a escolha no rodapé.",
      details: "Como a Google utiliza os dados",
      accept: "Aceitar estatísticas", reject: "Recusar", close: "Fechar",
      preferences: "Preferências de privacidade",
    },
    en: {
      title: "May we measure visits and clicks?",
      description: "With your permission, Google Analytics uses cookies to measure page visits and contact clicks. You can decline and change your choice in the footer.",
      details: "How Google uses data",
      accept: "Accept analytics", reject: "Decline", close: "Close",
      preferences: "Privacy preferences",
    },
  };

  function element(tag, className) {
    const item = document.createElement(tag);
    if (className) item.className = className;
    return item;
  }
  const banner = element("section", "analytics-consent");
  banner.id = "analytics-consent";
  banner.hidden = true;
  banner.setAttribute("aria-labelledby", "analytics-consent-title");
  const content = element("div", "analytics-consent-copy");
  const heading = element("h2");
  heading.id = "analytics-consent-title";
  const description = element("p");
  const details = element("a");
  details.href = "https://policies.google.com/technologies/partner-sites";
  details.target = "_blank";
  details.rel = "noopener noreferrer";
  content.append(heading, description, details);
  const actions = element("div", "analytics-consent-actions");
  const reject = element("button");
  const accept = element("button");
  const close = element("button", "analytics-consent-close");
  [reject, accept, close].forEach((button) => { button.type = "button"; });
  actions.append(reject, accept, close);
  banner.append(content, actions);
  document.body.append(banner);

  const preferencesRow = element("div", "analytics-preferences");
  const preferences = element("button");
  preferences.type = "button";
  preferences.setAttribute("aria-controls", banner.id);
  preferences.setAttribute("aria-expanded", "false");
  preferencesRow.append(preferences);
  (document.querySelector("footer") || document.body).append(preferencesRow);

  function translate() {
    const language = document.documentElement.lang.startsWith("en") ? "en" : "pt";
    const words = copy[language];
    heading.textContent = words.title;
    description.textContent = words.description;
    details.textContent = words.details;
    accept.textContent = words.accept;
    reject.textContent = words.reject;
    close.textContent = words.close;
    preferences.textContent = words.preferences;
  }
  translate();
  new MutationObserver(translate).observe(document.documentElement, {attributes: true, attributeFilter: ["lang"]});

  function hideBanner() {
    banner.hidden = true;
    document.body.classList.remove("analytics-consent-open");
    preferences.setAttribute("aria-expanded", "false");
    if (returnFocus) { returnFocus.focus(); returnFocus = null; }
  }
  function showBanner(focus = false) {
    close.hidden = !consent;
    banner.hidden = false;
    document.body.classList.add("analytics-consent-open");
    preferences.setAttribute("aria-expanded", "true");
    if (focus) { returnFocus = preferences; reject.focus(); }
  }
  reject.addEventListener("click", () => {
    saveConsent("denied"); hideBanner(); stopAnalytics();
  });
  accept.addEventListener("click", () => {
    saveConsent("granted"); hideBanner(); startAnalytics();
  });
  close.addEventListener("click", hideBanner);
  preferences.addEventListener("click", () => showBanner(true));
  banner.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && consent) hideBanner();
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== storageKey) return;
    consent = readConsent();
    if (consent !== "granted") stopAnalytics();
    else startAnalytics();
    if (!consent) showBanner(); else hideBanner();
  });

  consent = readConsent();
  window[disableKey] = consent !== "granted";
  if (consent === "granted") startAnalytics();
  else {
    clearAnalyticsCookies();
    if (!consent) showBanner();
  }
})();

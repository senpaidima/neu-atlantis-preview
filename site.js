/* site.js — kleine Seitenhelfer für alle Seiten (über SiteHeader/SiteFooter eingebunden)
   1) „Nach oben“-Button: erscheint nach ~600px Scrollweg unten links, führt sanft zurück zum Menü.
   2) FAQ-Anker: Links auf <details id="…"> (z. B. Aufstellungsarbeit.dc.html#faq-quantenfeld)
      öffnen den Eintrag automatisch und scrollen ihn ins Bild — auch nach dem Rendern der
      DC-Runtime, deshalb mit kurzer Wiederholung.
   3) Sticky-Header: sobald die Menüleiste „klebt“, bekommt sie einen leichten Schatten. */
(function () {
  function init() {
    /* ---- 1) Nach oben ---- */
    if (!document.getElementById("na-top")) {
      var btn = document.createElement("a");
      btn.id = "na-top";
      btn.href = "#top";
      btn.setAttribute("aria-label", "Nach oben");
      btn.title = "Nach oben";
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V6"/><path d="M5 13l7-7 7 7"/></svg>';
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      document.body.appendChild(btn);
    }
    var top = document.getElementById("na-top");
    function onScroll() {
      var y = window.scrollY || document.documentElement.scrollTop;
      if (top) top.classList.toggle("is-visible", y > 600);
      document.documentElement.classList.toggle("is-scrolled", y > 60);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    /* ---- 2) FAQ-Anker ---- */
    function openHash(tries) {
      var id = (location.hash || "").slice(1);
      if (!id) return;
      var el = document.getElementById(id);
      if (!el) { if (tries > 0) setTimeout(function () { openHash(tries - 1); }, 250); return; }
      var det = el.tagName === "DETAILS" ? el : el.closest("details");
      if (det) det.open = true;
      el.scrollIntoView({ block: "start", behavior: "smooth" });
    }
    window.addEventListener("hashchange", function () { openHash(4); });
    openHash(12);

    /* ---- 4) Google Maps & Consent-Banner (Design-Panel: „Karte & Datenschutz“) ----
       Die Karte wird nie ungefragt geladen. Zwei Wege: Klick auf „Karte laden“ (Zwei-Klick)
       oder Zustimmung im Banner (nur bei html.consent). Die Entscheidung liegt in localStorage. */
    var html = document.documentElement;
    var CONSENT_KEY = "na-consent";
    function consent() { try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; } }
    function setConsent(v) { try { localStorage.setItem(CONSENT_KEY, v); } catch (e) {} syncConsent(); }

    function loadMaps() {
      var boxes = document.querySelectorAll(".na-map-google[data-src]");
      for (var i = 0; i < boxes.length; i++) {
        var box = boxes[i];
        if (box.querySelector("iframe")) continue;
        var frame = box.querySelector(".na-map-frame") || box;
        var f = document.createElement("iframe");
        f.src = box.getAttribute("data-src");
        f.title = "Google Maps: Praxis Ralf Baars, Scharr 1, 23896 Panten";
        f.setAttribute("loading", "lazy");
        f.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
        f.setAttribute("allowfullscreen", "");
        f.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:0";
        var ph = frame.querySelector(".na-map-ph");
        if (ph) ph.remove();
        frame.appendChild(f);
      }
    }
    document.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest(".na-map-load") : null;
      if (t) { e.preventDefault(); loadMaps(); }
    });

    var banner = null;
    function buildBanner() {
      var b = document.createElement("div");
      b.id = "na-consent";
      b.setAttribute("role", "dialog");
      b.setAttribute("aria-label", "Datenschutz-Hinweis");
      b.innerHTML =
        '<div class="na-consent-inner">' +
          '<div class="na-consent-text">' +
            '<strong>Datenschutz-Hinweis</strong>' +
            '<span>Diese Website nutzt keine Tracking-Cookies. Auf der Kontaktseite kann eine Karte von Google Maps angezeigt werden. Dafür werden Daten wie deine IP-Adresse an Google übertragen. Möchtest du solche externen Inhalte erlauben? Deine Wahl kannst du jederzeit im Seitenfuß ändern. <a href="Datenschutz.dc.html">Datenschutzerklärung</a></span>' +
          '</div>' +
          '<div class="na-consent-actions">' +
            '<button type="button" data-consent="essential">Nur notwendige</button>' +
            '<button type="button" data-consent="all" class="is-primary">Externe Inhalte erlauben</button>' +
          '</div>' +
        '</div>';
      b.addEventListener("click", function (e) {
        var btn = e.target.closest ? e.target.closest("[data-consent]") : null;
        if (btn) setConsent(btn.getAttribute("data-consent"));
      });
      document.body.appendChild(b);
      return b;
    }
    function ensureFooterLink() {
      if (document.getElementById("na-consent-link")) return;
      var sitemap = document.querySelector('footer a[href*="Sitemap"]');
      if (!sitemap) return;
      var a = document.createElement("a");
      a.id = "na-consent-link";
      a.href = "#";
      a.textContent = "Datenschutz-Einstellungen";
      a.style.cssText = sitemap.style.cssText;
      a.addEventListener("click", function (e) {
        e.preventDefault();
        try { localStorage.removeItem(CONSENT_KEY); } catch (err) {}
        syncConsent();
      });
      sitemap.parentNode.appendChild(a);
    }
    function syncConsent() {
      var mode = html.classList.contains("consent");
      var choice = consent();
      html.classList.toggle("consent-media", mode && choice === "all");
      if (mode && choice === "all") loadMaps();
      if (mode) { ensureFooterLink(); if (!banner) banner = buildBanner(); }
      var link = document.getElementById("na-consent-link");
      if (link) link.style.display = mode ? "" : "none";
      var open = mode && !choice;
      if (banner) banner.classList.toggle("is-open", open);
      html.classList.toggle("na-consent-open", open);
    }
    document.addEventListener("na-theme-applied", syncConsent);
    setTimeout(syncConsent, 0);
    var tries = 0, t = setInterval(function () { syncConsent(); if (++tries > 12) clearInterval(t); }, 500); // Footer kommt asynchron
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

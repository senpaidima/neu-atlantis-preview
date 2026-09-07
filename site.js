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

    /* ---- 4) Google Maps als Zwei-Klick-Lösung (Design-Panel: „Karte & Datenschutz“) ----
       Die Karte wird nie ungefragt geladen: erst der Klick auf „Karte laden“ setzt das iframe ein.
       Der Klick ist die Einwilligung — ein Cookie-Banner ist dafür nicht nötig. */

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

  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

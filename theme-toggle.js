/* Design-Varianten-Schalter: Auswahl-Panel mit drei Sektionen —
   Farbwelt (Palette aus Assets/Manual.pdf), Hero-Layout und Navigation.
   Merkt sich jede Wahl in localStorage und gilt auf allen Seiten. */
(function () {

  var DIMENSIONS = [
    {
      key: "na-farbwelt",
      title: "Farbwelt",
      options: [
        { id: "empfehlung",       label: "Unsere Empfehlung", sub: "Grün · Creme · Gold",       dot1: "#23423F", dot2: "#C08A4E", cls: "" },
        { id: "kunde-blau",       label: "Kunde: Blau",       sub: "Petrolblau · Braun-Akzent", dot1: "#254954", dot2: "#80592C", cls: "theme-kunde variant-blau" },
        { id: "kunde-sand",       label: "Kunde: Sand",       sub: "Braun · Petrol-Akzent",     dot1: "#6E4C25", dot2: "#254954", cls: "theme-kunde variant-sand" },
        { id: "kunde-hell",       label: "Kunde: Hell",       sub: "Hellblau · luftig",         dot1: "#D5E9EF", dot2: "#254954", cls: "theme-kunde variant-hell" },
        { id: "kunde-gold",       label: "Kunde: Gold",       sub: "Gold · Petrol-Text",        dot1: "#B0A07D", dot2: "#254954", cls: "theme-kunde variant-gold" },
        { id: "kunde-mittelblau", label: "Kunde: Mittelblau", sub: "Kräftiges Blau · Braun",    dot1: "#9FC3E1", dot2: "#80592C", cls: "theme-kunde variant-mittelblau" }
      ],
      allClasses: ["theme-kunde", "variant-blau", "variant-sand", "variant-hell", "variant-gold", "variant-mittelblau"]
    },
    {
      key: "na-hero",
      title: "Hero-Layout",
      options: [
        { id: "overlay",   label: "Überlagert",   sub: "Welle hinter Farbverlauf (aktuell)",        dot1: "#3D615A", dot2: "#8FB0A8", cls: "" },
        { id: "split",     label: "Split",        sub: "Text links, Welle pur · Termin-Karten",     dot1: "#23423F", dot2: "#9FC3E1", cls: "hero-split" },
        { id: "fade",      label: "Fade",         sub: "Welle pur, Verlauf nur hinterm Text",       dot1: "#2E524E", dot2: "#D5E9EF", cls: "hero-fade" },
        { id: "panorama",  label: "Panorama ✻ Unsere Empfehlung", sub: "Welle läuft weich aus · Termin-Route", dot1: "#9FC3E1", dot2: "#C8B98F", cls: "hero-panorama" },
        { id: "portal",    label: "Portal-Bogen", sub: "Welle im Rundbogen · kompakte Liste",       dot1: "#B0A17D", dot2: "#23423F", cls: "hero-portal" },
        { id: "editorial", label: "Editorial",    sub: "Magazin-Headline · nummeriertes Programm",  dot1: "#F1EBDF", dot2: "#B0703C", cls: "hero-editorial" }
      ],
      allClasses: ["hero-split", "hero-fade", "hero-banner", "hero-panorama", "hero-portal", "hero-editorial"]
    },
    {
      key: "na-nav",
      title: "Navigation",
      options: [
        { id: "flach",    label: "Flach",                 sub: "Alle Punkte nebeneinander (aktuell)",     dot1: "#33413C", dot2: "#B0703C", cls: "" },
        { id: "dropdown", label: "Dropdown Aufstellung",  sub: "Weiterbildung & Orakel als Unterpunkte",  dot1: "#23423F", dot2: "#F1EBDF", cls: "nav-drop" },
        { id: "gruppe",   label: "Gruppe „Angebote“",     sub: "Alle Angebote gebündelt im Menü",         dot1: "#B0703C", dot2: "#F1EBDF", cls: "nav-gruppe" },
        { id: "sitemap",  label: "Sitemap-Struktur V09",  sub: "3 Gruppen wie in der Kunden-Sitemap",     dot1: "#254954", dot2: "#B0A07D", cls: "nav-sitemap" }
      ],
      allClasses: ["nav-drop", "nav-gruppe", "nav-sitemap"]
    }
  ];

  function findOption(dim, id) {
    for (var i = 0; i < dim.options.length; i++) if (dim.options[i].id === id) return dim.options[i];
    return dim.options[0];
  }

  function current(dim) {
    try {
      var v = localStorage.getItem(dim.key);
      if (dim.key === "na-farbwelt" && v === "kunde") v = "kunde-blau"; // Migration
      if (dim.key === "na-hero" && v === "banner") v = "panorama"; // Banner-Variante wurde ersetzt
      return findOption(dim, v).id;
    } catch (e) { return dim.options[0].id; }
  }

  function applyAll() {
    var el = document.documentElement;
    DIMENSIONS.forEach(function (dim) {
      dim.allClasses.forEach(function (c) { el.classList.remove(c); });
      var opt = findOption(dim, current(dim));
      if (opt.cls) opt.cls.split(" ").forEach(function (c) { el.classList.add(c); });
    });
    var panel = document.getElementById("na-theme-panel");
    if (panel) {
      DIMENSIONS.forEach(function (dim) {
        var act = current(dim);
        var rows = panel.querySelectorAll('[data-dim="' + dim.key + '"]');
        for (var i = 0; i < rows.length; i++) {
          var isActive = rows[i].getAttribute("data-opt") === act;
          rows[i].style.background = isActive ? "#EEF3F1" : "transparent";
          rows[i].style.borderColor = isActive ? "#23423F" : "transparent";
        }
      });
    }
  }

  // Fonts der Kunden-Varianten immer vorladen, damit der Wechsel ohne Springen klappt
  function ensureFonts() {
    if (document.getElementById("na-kunde-fonts")) return;
    var l = document.createElement("link");
    l.id = "na-kunde-fonts";
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&family=Open+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap";
    document.head.appendChild(l);
  }

  function ensureCss(id, href) {
    if (document.getElementById(id)) return;
    if (document.querySelector('link[href*="' + href + '"]')) return;
    var l = document.createElement("link");
    l.id = id;
    l.rel = "stylesheet";
    l.href = href;
    document.head.appendChild(l);
  }

  function buildPanel() {
    var panel = document.createElement("div");
    panel.id = "na-theme-panel";
    panel.style.cssText = "position:fixed;bottom:66px;right:18px;z-index:9999;display:none;flex-direction:column;background:#FFFFFF;border:1px solid #D5D0C4;border-radius:12px;padding:10px;box-shadow:0 14px 40px rgba(0,0,0,0.25);font-family:Arial,sans-serif;min-width:265px;max-height:calc(100vh - 110px);overflow-y:auto";

    DIMENSIONS.forEach(function (dim, di) {
      var head = document.createElement("div");
      head.textContent = dim.title + " wählen";
      head.style.cssText = "font-size:11.5px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8A7E68;padding:" + (di === 0 ? "4px" : "14px") + " 8px 8px" + (di > 0 ? ";border-top:1px solid #EFEAE0;margin-top:8px" : "");
      panel.appendChild(head);

      dim.options.forEach(function (t) {
        var row = document.createElement("button");
        row.type = "button";
        row.setAttribute("data-dim", dim.key);
        row.setAttribute("data-opt", t.id);
        row.style.cssText = "display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:transparent;border:1px solid transparent;border-radius:8px;padding:7px 10px;cursor:pointer";
        var dot = document.createElement("span");
        dot.style.cssText = "flex:none;width:20px;height:20px;border-radius:50%;border:1px solid rgba(0,0,0,0.18);background:linear-gradient(135deg," + t.dot1 + " 50%," + t.dot2 + " 50%)";
        var txt = document.createElement("span");
        txt.style.cssText = "display:flex;flex-direction:column;gap:1px";
        var l1 = document.createElement("span");
        l1.textContent = t.label;
        l1.style.cssText = "font-size:13.5px;font-weight:700;color:#2E2B26";
        var l2 = document.createElement("span");
        l2.textContent = t.sub;
        l2.style.cssText = "font-size:11.5px;color:#8A8273";
        txt.appendChild(l1); txt.appendChild(l2);
        row.appendChild(dot); row.appendChild(txt);
        row.addEventListener("click", function () {
          try { localStorage.setItem(dim.key, t.id); } catch (e) {}
          applyAll();
        });
        panel.appendChild(row);
      });
    });
    return panel;
  }

  function init() {
    ensureFonts();
    ensureCss("na-kunde-layoutcss", "layout-variants.css");
    ensureCss("na-kunde-css", "theme-kunde.css");
    if (!document.getElementById("na-theme-toggle")) {
      var btn = document.createElement("button");
      btn.id = "na-theme-toggle";
      btn.type = "button";
      btn.textContent = "Design-Varianten";
      btn.title = "Farbwelt, Hero-Layout und Navigation vergleichen (Vorschläge + Kundenideen aus dem Manual)";
      btn.style.cssText = "position:fixed;bottom:18px;right:18px;z-index:9999;font-family:Arial,sans-serif;font-size:13.5px;font-weight:700;letter-spacing:0.03em;color:#FFFFFF;background:#23423F;border:1px solid rgba(255,255,255,0.35);border-radius:999px;padding:10px 18px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,0.28)";
      var panel = buildPanel();
      btn.addEventListener("click", function () {
        panel.style.display = panel.style.display === "flex" ? "none" : "flex";
      });
      document.body.appendChild(panel);
      document.body.appendChild(btn);
    }
    applyAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

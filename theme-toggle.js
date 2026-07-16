/* Farbwelt-Schalter: Auswahl-Panel mit allen Varianten —
   unsere Empfehlung + alle Kunden-Farbwelten (Palette aus Assets/Manual.pdf).
   Merkt sich die Wahl in localStorage und gilt auf allen Seiten. */
(function () {
  var KEY = "na-farbwelt";
  var VARIANT_CLASSES = ["variant-blau", "variant-sand", "variant-hell", "variant-gold", "variant-mittelblau"];

  var THEMES = [
    { id: "empfehlung",       label: "Unsere Empfehlung",   sub: "Grün · Creme · Gold",        dot1: "#23423F", dot2: "#C08A4E", cls: "" },
    { id: "kunde-blau",       label: "Kunde: Blau",         sub: "Petrolblau · Braun-Akzent",  dot1: "#254954", dot2: "#80592C", cls: "theme-kunde variant-blau" },
    { id: "kunde-sand",       label: "Kunde: Sand",         sub: "Braun · Petrol-Akzent",      dot1: "#6E4C25", dot2: "#254954", cls: "theme-kunde variant-sand" },
    { id: "kunde-hell",       label: "Kunde: Hell",         sub: "Hellblau · luftig",          dot1: "#D5E9EF", dot2: "#254954", cls: "theme-kunde variant-hell" },
    { id: "kunde-gold",       label: "Kunde: Gold",         sub: "Gold · Petrol-Text",         dot1: "#B0A07D", dot2: "#254954", cls: "theme-kunde variant-gold" },
    { id: "kunde-mittelblau", label: "Kunde: Mittelblau",   sub: "Kräftiges Blau · Braun",     dot1: "#9FC3E1", dot2: "#80592C", cls: "theme-kunde variant-mittelblau" }
  ];

  function findTheme(id) {
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i];
    return THEMES[0];
  }

  function current() {
    try {
      var v = localStorage.getItem(KEY);
      if (v === "kunde") v = "kunde-blau"; // Migration: alte einzelne Kunden-Variante
      return findTheme(v).id;
    } catch (e) { return "empfehlung"; }
  }

  function apply(id) {
    var t = findTheme(id);
    var el = document.documentElement;
    el.classList.remove("theme-kunde");
    VARIANT_CLASSES.forEach(function (c) { el.classList.remove(c); });
    if (t.cls) t.cls.split(" ").forEach(function (c) { el.classList.add(c); });
    var btn = document.getElementById("na-theme-toggle");
    if (btn) {
      btn.textContent = "Farbwelt: " + t.label;
      btn.style.background = t.dot1 === "#D5E9EF" || t.dot1 === "#9FC3E1" || t.dot1 === "#B0A07D" ? t.dot2 : t.dot1;
    }
    var panel = document.getElementById("na-theme-panel");
    if (panel) {
      var rows = panel.querySelectorAll("[data-theme-id]");
      for (var i = 0; i < rows.length; i++) {
        var active = rows[i].getAttribute("data-theme-id") === t.id;
        rows[i].style.background = active ? "#EEF3F1" : "transparent";
        rows[i].style.borderColor = active ? "#23423F" : "transparent";
      }
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

  function ensureCss() {
    if (document.getElementById("na-kunde-css")) return;
    var l = document.createElement("link");
    l.id = "na-kunde-css";
    l.rel = "stylesheet";
    l.href = "theme-kunde.css";
    document.head.appendChild(l);
  }

  function buildPanel() {
    var panel = document.createElement("div");
    panel.id = "na-theme-panel";
    panel.style.cssText = "position:fixed;bottom:66px;right:18px;z-index:9999;display:none;flex-direction:column;gap:2px;background:#FFFFFF;border:1px solid #D5D0C4;border-radius:12px;padding:10px;box-shadow:0 14px 40px rgba(0,0,0,0.25);font-family:Arial,sans-serif;min-width:250px";

    var head = document.createElement("div");
    head.textContent = "Farbwelt wählen";
    head.style.cssText = "font-size:11.5px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8A7E68;padding:4px 8px 8px";
    panel.appendChild(head);

    THEMES.forEach(function (t) {
      var row = document.createElement("button");
      row.type = "button";
      row.setAttribute("data-theme-id", t.id);
      row.style.cssText = "display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:transparent;border:1px solid transparent;border-radius:8px;padding:8px 10px;cursor:pointer";
      var dot = document.createElement("span");
      dot.style.cssText = "flex:none;width:22px;height:22px;border-radius:50%;border:1px solid rgba(0,0,0,0.18);background:linear-gradient(135deg," + t.dot1 + " 50%," + t.dot2 + " 50%)";
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
        try { localStorage.setItem(KEY, t.id); } catch (e) {}
        apply(t.id);
      });
      panel.appendChild(row);
    });
    return panel;
  }

  function init() {
    ensureFonts();
    ensureCss();
    if (!document.getElementById("na-theme-toggle")) {
      var btn = document.createElement("button");
      btn.id = "na-theme-toggle";
      btn.type = "button";
      btn.title = "Farbwelten vergleichen: unsere Empfehlung und die Farbideen des Kunden (Manual)";
      btn.style.cssText = "position:fixed;bottom:18px;right:18px;z-index:9999;font-family:Arial,sans-serif;font-size:13.5px;font-weight:700;letter-spacing:0.03em;color:#FFFFFF;background:#23423F;border:1px solid rgba(255,255,255,0.35);border-radius:999px;padding:10px 18px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,0.28)";
      var panel = buildPanel();
      btn.addEventListener("click", function () {
        panel.style.display = panel.style.display === "flex" ? "none" : "flex";
      });
      document.body.appendChild(panel);
      document.body.appendChild(btn);
    }
    apply(current());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

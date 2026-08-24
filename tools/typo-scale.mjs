/*
  typo-scale.mjs — Schriftgrad-Sweep über alle .dc.html-Seiten
  ============================================================

  Hintergrund: Alle Schriftgrößen liegen als Inline-Styles in den Seiten.
  Kundin Heidi wünscht größeren Fließtext + größere Versalien-Kicker in den
  Kästen. Referenz: drrolfkluge.com — dort 18px "Mulish", bei uns 18px
  "Alegreya Sans". Gemessene x-Höhe: Mulish 0.500em, Alegreya Sans 0.458em
  → Faktor 1,09. 18px Mulish entspricht optisch ~19,7px Alegreya Sans.

  Das Skript ist idempotent und beliebig oft wiederholbar: beim ersten Lauf
  merkt es sich den Ausgangswert am Element (data-fs-base / data-ls-base) und
  rechnet danach immer von dort aus, nie vom bereits skalierten Wert.

  Zum Nachjustieren ("noch einen Tick größer") also nur die Tabellen unten
  ändern und neu laufen lassen:

      node tools/typo-scale.mjs

  Kein Zurücksetzen nötig — deshalb überlebt das auch neue Texte, die
  zwischenzeitlich in die Seiten geschrieben wurden.
*/

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ---------------------------------------------------------------- Tabellen */

// A — Fließtext, Kastentext, Meta-Angaben (Faktor ≈ 1,10)
const FLIESS = {
  19: 21,
  18.5: 20.5,
  18: 20,
  17.5: 19.5,
  17: 19,
  16.5: 18,
  16: 17.5,
  15.5: 17,
  15: 16.5,
  14.5: 16,
  14: 15.5,
  13.5: 15,
  13: 14.5,
};

// B — Versalien-Kicker in den Kästen (erkannt an text-transform:uppercase)
const VERSAL = {
  17: 19,
  14: 16.5,
  13.5: 16,
  13: 16,
  12.5: 14.5,
  12: 14,
  11.5: 13.5,
  11: 13,
};

// B2 — Sperrung mitskalieren, damit die Labels trotz größerer Glyphen nicht
//      breiter werden und im Kasten umbrechen (390px!)
const SPERRUNG = {
  0.22: 0.16,
  0.2: 0.14,
  0.18: 0.13,
  0.16: 0.12,
  0.14: 0.11,
  0.12: 0.1,
  0.1: 0.08,
};

/* Das Dekor-Sternchen ✻ trägt als einziges Element diese Farbe und soll
   seine Größe behalten — es sitzt als Aufzählungszeichen neben dem Text,
   mitwachsen lassen würde die Listen unruhig machen. */
const DEKOR_FARBE = "#B0A17D";

// C — Hinweistexte auffälliger: gedämpftes Grau → Marken-Akzent
const HINWEIS_ALT = "#8A7E68";
const HINWEIS_NEU = "#B0703C";

// Alles ab hier gilt als Überschrift und bleibt unangetastet
const UEBERSCHRIFT_AB = 22;

/* ------------------------------------------------------------- Hilfsmittel */

const zahl = (n) => (Number.isInteger(n) ? String(n) : String(n));

/* Geschützte Zeichenbereiche — hier wird nichts angefasst:
   - <nav>…</nav>: Menü-Links sollen ihre Größe behalten, die Leiste bricht
     sonst früher um
   - ab class="m-headrow" bis Dateiende: Logo-Zeile samt Claim. Der Claim
     („Zentrum für Lebensbegleitung…“) ist Wortmarke, kein Kasten-Kicker —
     größer gesetzt überstrahlt er das Logo. */
function schutzBereiche(html) {
  const bereiche = [];
  const re = /<nav\b/gi;
  let m;
  while ((m = re.exec(html))) {
    const ende = html.indexOf("</nav>", m.index);
    bereiche.push([m.index, ende === -1 ? html.length : ende + 6]);
  }
  const kopf = html.indexOf('class="m-headrow"');
  if (kopf !== -1) bereiche.push([kopf, html.length]);
  return bereiche;
}

const imBereich = (pos, bereiche) =>
  bereiche.some(([a, b]) => pos >= a && pos < b);

/** Ist dieses style-Attribut ein Button/CTA? (Fläche + Innenabstand) */
const istButton = (style) =>
  /(^|;)\s*background\s*:/.test(style) && /(^|;)\s*padding\s*:/.test(style);

/** Überschrift oder Zitat — Cormorant Garamond ist die Display-Schrift. */
const istDisplay = (style) => /font-family\s*:\s*'?Cormorant/i.test(style);

/* ------------------------------------------------------------ Kernfunktion */

/* Bearbeitet ein Element. `merker` enthält die beim ersten Lauf gesicherten
   Ausgangswerte — ist einer gesetzt, wird von ihm aus gerechnet statt vom
   aktuellen (bereits skalierten) Wert. Das macht das Skript idempotent.
   Rückgabe: neuer style + die zu schreibenden Merker. */
function styleUmschreiben(tagName, klassen, style, merker, statistik) {
  /* Ausgeschlossenes Element. Trägt es noch einen Merker aus einem früheren
     Lauf, wurde es vor Einführung dieser Ausnahme skaliert — dann den
     Ausgangswert wiederherstellen. Sonst blieben solche Elemente für immer
     auf dem alten Zwischenstand stehen, sobald eine Regel dazukommt. */
  function ausgenommen() {
    let s = style;
    if (merker.fs !== undefined)
      s = s.replace(/font-size\s*:\s*[0-9.]+px/i, `font-size:${zahl(merker.fs)}px`);
    if (merker.ls !== undefined)
      s = s.replace(/letter-spacing\s*:\s*[0-9.]+em/i, `letter-spacing:${zahl(merker.ls)}em`);
    if (s !== style) statistik.zurueck++;
    return { style: s, merker: {} };
  }

  // Hero-/Headline-Klassen haben eigene Mobile-Overrides in mobile.css.
  // na-wortmarke = der Claim unter dem Logo (Kopf wie Fuß): Wortmarke, kein
  // Kasten-Kicker — größer gesetzt überstrahlt er das Logo.
  if (/\b(m-hero|m-h1|m-h2|na-wortmarke)\b/.test(klassen)) return ausgenommen();
  if (istDisplay(style)) return ausgenommen();
  if (istButton(style)) return ausgenommen();
  if (style.includes(DEKOR_FARBE)) return ausgenommen(); // Aufzählungs-✻

  const versalien = /text-transform\s*:\s*uppercase/i.test(style);
  const tabelle = versalien ? VERSAL : FLIESS;
  const neueMerker = {};
  let neu = style;

  neu = neu.replace(/font-size\s*:\s*([0-9.]+)px/gi, (treffer, wert) => {
    const basis = merker.fs !== undefined ? merker.fs : parseFloat(wert);
    if (basis >= UEBERSCHRIFT_AB) return treffer;
    const ziel = tabelle[basis];
    if (ziel === undefined) return treffer;
    neueMerker.fs = basis;
    statistik[versalien ? "versalien" : "fliess"]++;
    return `font-size:${zahl(ziel)}px`;
  });

  if (versalien) {
    neu = neu.replace(/letter-spacing\s*:\s*([0-9.]+)em/gi, (treffer, wert) => {
      const basis = merker.ls !== undefined ? merker.ls : parseFloat(wert);
      const ziel = SPERRUNG[basis];
      if (ziel === undefined) return treffer;
      neueMerker.ls = basis;
      statistik.sperrung++;
      return `letter-spacing:${zahl(ziel)}em`;
    });
  }

  // Hinweis-Absätze: nur <p>, damit Meta-Spans ({{ t.ort }}) grau bleiben
  const istHinweis =
    tagName.toLowerCase() === "p" && (merker.hinweis || neu.includes(HINWEIS_ALT));
  if (istHinweis) {
    neu = neu.replace(/color\s*:\s*#[0-9A-Fa-f]{3,8}/, `color:${HINWEIS_NEU}`);
    if (!/font-weight\s*:/i.test(neu)) neu += ";font-weight:500";
    neueMerker.hinweis = true;
    statistik.hinweis++;
  }

  return { style: neu, merker: neueMerker };
}

/* ----------------------------------------------------------------- Ablauf */

const dateien = readdirSync(ROOT)
  .filter((f) => f.endsWith(".dc.html"))
  .sort();

const gesamt = { fliess: 0, versalien: 0, sperrung: 0, hinweis: 0, zurueck: 0 };

for (const datei of dateien) {
  const pfad = join(ROOT, datei);
  const original = readFileSync(pfad, "utf8");

  // Der DC-Logic-Block enthält JS mit "<"-Vergleichen — nie anfassen.
  const schnitt = original.indexOf('<script type="text/x-dc"');
  const markup = schnitt === -1 ? original : original.slice(0, schnitt);
  const rest = schnitt === -1 ? "" : original.slice(schnitt);

  const schutz = schutzBereiche(markup);
  const statistik = { fliess: 0, versalien: 0, sperrung: 0, hinweis: 0, zurueck: 0 };

  // Ganze Tags matchen, damit class und style zusammen bewertet werden
  const tagRe = /<([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;

  const bearbeitet = markup.replace(tagRe, (treffer, tagName, attrs, pos) => {
    if (!attrs.includes("style=")) return treffer;
    if (imBereich(pos, schutz)) return treffer;

    const klassen = (attrs.match(/\bclass\s*=\s*"([^"]*)"/) || ["", ""])[1];

    // Ausgangswerte aus einem früheren Lauf, falls vorhanden
    const merker = {};
    const fs = attrs.match(/\bdata-fs-base\s*=\s*"([0-9.]+)"/);
    const ls = attrs.match(/\bdata-ls-base\s*=\s*"([0-9.]+)"/);
    if (fs) merker.fs = parseFloat(fs[1]);
    if (ls) merker.ls = parseFloat(ls[1]);
    if (/\bdata-hinweis\b/.test(attrs)) merker.hinweis = true;

    let neueMerker = {};
    // nur das echte style-Attribut, nicht style-hover
    let neueAttrs = attrs.replace(
      /(\s)style\s*=\s*"([^"]*)"/g,
      (_treffer, ws, style) => {
        const r = styleUmschreiben(tagName, klassen, style, merker, statistik);
        neueMerker = r.merker;
        return `${ws}style="${r.style}"`;
      }
    );

    // Ausgangswerte am Element festhalten, damit ein erneuter Lauf von dort
    // aus rechnet statt vom bereits skalierten Wert
    neueAttrs = neueAttrs.replace(/\s+data-(fs-base|ls-base|hinweis)(="[^"]*")?/g, "");
    let zusatz = "";
    if (neueMerker.fs !== undefined) zusatz += ` data-fs-base="${zahl(neueMerker.fs)}"`;
    if (neueMerker.ls !== undefined) zusatz += ` data-ls-base="${zahl(neueMerker.ls)}"`;
    if (neueMerker.hinweis) zusatz += " data-hinweis";

    return `<${tagName}${neueAttrs}${zusatz}>`;
  });

  const ergebnis = bearbeitet + rest;
  if (ergebnis !== original) writeFileSync(pfad, ergebnis, "utf8");

  const summe =
    statistik.fliess + statistik.versalien + statistik.sperrung + statistik.hinweis + statistik.zurueck;
  if (summe > 0) {
    console.log(
      `${datei.padEnd(30)} Fließtext ${String(statistik.fliess).padStart(3)} · ` +
        `Versalien ${String(statistik.versalien).padStart(2)} · ` +
        `Sperrung ${String(statistik.sperrung).padStart(2)} · ` +
        `Hinweis ${statistik.hinweis}` + (statistik.zurueck ? ` · zurückgerollt ${statistik.zurueck}` : "")
    );
  }
  for (const k of Object.keys(gesamt)) gesamt[k] += statistik[k];
}

console.log(
  `\nGesamt: ${gesamt.fliess} Fließtext · ${gesamt.versalien} Versalien · ` +
    `${gesamt.sperrung} Sperrung · ${gesamt.hinweis} Hinweistexte`
);

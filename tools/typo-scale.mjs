/*
  typo-scale.mjs — Schriftgrad-Sweep über alle .dc.html-Seiten
  ============================================================

  Hintergrund: Alle Schriftgrößen liegen als Inline-Styles in den Seiten.
  Kundin Heidi wünscht größeren Fließtext + größere Versalien-Kicker in den
  Kästen. Referenz: drrolfkluge.com — dort 18px "Mulish", bei uns 18px
  "Alegreya Sans". Gemessene x-Höhe: Mulish 0.500em, Alegreya Sans 0.458em
  → Faktor 1,09. 18px Mulish entspricht optisch ~19,7px Alegreya Sans.

  WICHTIG — dieses Skript ist NICHT idempotent (18→20 zweimal ergibt 22).
  Immer vom unskalierten Stand aus fahren. Der liegt auf dem Tag `typo-base`:

      git checkout typo-base -- "*.dc.html"
      node tools/typo-scale.mjs

  Zum Nachjustieren ("noch einen Tick größer") nur die Tabellen unten ändern
  und beide Befehle erneut laufen lassen.
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
  15.5: 17,
  15: 16.5,
  14.5: 16,
  14: 15.5,
  13.5: 15,
};

// B — Versalien-Kicker in den Kästen (erkannt an text-transform:uppercase)
const VERSAL = {
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
};

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

function styleUmschreiben(tagName, klassen, style, statistik) {
  let neu = style;

  // Hero-/Headline-Klassen haben eigene Mobile-Overrides in mobile.css.
  // na-wortmarke = der Claim unter dem Logo (Kopf wie Fuß): Wortmarke, kein
  // Kasten-Kicker — größer gesetzt überstrahlt er das Logo.
  if (/\b(m-hero|m-h1|m-h2|na-wortmarke)\b/.test(klassen)) return style;
  if (istDisplay(style)) return style;
  if (istButton(style)) return style;

  const versalien = /text-transform\s*:\s*uppercase/i.test(style);
  const tabelle = versalien ? VERSAL : FLIESS;

  neu = neu.replace(/font-size\s*:\s*([0-9.]+)px/gi, (treffer, wert) => {
    const alt = parseFloat(wert);
    if (alt >= UEBERSCHRIFT_AB) return treffer;
    const ziel = tabelle[alt];
    if (ziel === undefined) return treffer;
    statistik[versalien ? "versalien" : "fliess"]++;
    return `font-size:${zahl(ziel)}px`;
  });

  if (versalien) {
    neu = neu.replace(/letter-spacing\s*:\s*([0-9.]+)em/gi, (treffer, wert) => {
      const ziel = SPERRUNG[parseFloat(wert)];
      if (ziel === undefined) return treffer;
      statistik.sperrung++;
      return `letter-spacing:${zahl(ziel)}em`;
    });
  }

  // Hinweis-Absätze: nur <p>, damit Meta-Spans ({{ t.ort }}) grau bleiben
  if (tagName.toLowerCase() === "p" && neu.includes(HINWEIS_ALT)) {
    neu = neu.replace(HINWEIS_ALT, HINWEIS_NEU);
    if (!/font-weight\s*:/i.test(neu)) neu += ";font-weight:500";
    statistik.hinweis++;
  }

  return neu;
}

/* ----------------------------------------------------------------- Ablauf */

const dateien = readdirSync(ROOT)
  .filter((f) => f.endsWith(".dc.html"))
  .sort();

const gesamt = { fliess: 0, versalien: 0, sperrung: 0, hinweis: 0 };

for (const datei of dateien) {
  const pfad = join(ROOT, datei);
  const original = readFileSync(pfad, "utf8");

  // Der DC-Logic-Block enthält JS mit "<"-Vergleichen — nie anfassen.
  const schnitt = original.indexOf('<script type="text/x-dc"');
  const markup = schnitt === -1 ? original : original.slice(0, schnitt);
  const rest = schnitt === -1 ? "" : original.slice(schnitt);

  const schutz = schutzBereiche(markup);
  const statistik = { fliess: 0, versalien: 0, sperrung: 0, hinweis: 0 };

  // Ganze Tags matchen, damit class und style zusammen bewertet werden
  const tagRe = /<([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;

  const bearbeitet = markup.replace(tagRe, (treffer, tagName, attrs, pos) => {
    if (!attrs.includes("style=")) return treffer;
    if (imBereich(pos, schutz)) return treffer;

    const klassen = (attrs.match(/\bclass\s*=\s*"([^"]*)"/) || ["", ""])[1];

    // nur das echte style-Attribut, nicht style-hover
    return treffer.replace(
      /(\s)style\s*=\s*"([^"]*)"/g,
      (_treffer, ws, style) => {
        const neu = styleUmschreiben(tagName, klassen, style, statistik);
        return `${ws}style="${neu}"`;
      }
    );
  });

  const ergebnis = bearbeitet + rest;
  if (ergebnis !== original) writeFileSync(pfad, ergebnis, "utf8");

  const summe =
    statistik.fliess + statistik.versalien + statistik.sperrung + statistik.hinweis;
  if (summe > 0) {
    console.log(
      `${datei.padEnd(30)} Fließtext ${String(statistik.fliess).padStart(3)} · ` +
        `Versalien ${String(statistik.versalien).padStart(2)} · ` +
        `Sperrung ${String(statistik.sperrung).padStart(2)} · ` +
        `Hinweis ${statistik.hinweis}`
    );
  }
  for (const k of Object.keys(gesamt)) gesamt[k] += statistik[k];
}

console.log(
  `\nGesamt: ${gesamt.fliess} Fließtext · ${gesamt.versalien} Versalien · ` +
    `${gesamt.sperrung} Sperrung · ${gesamt.hinweis} Hinweistexte`
);

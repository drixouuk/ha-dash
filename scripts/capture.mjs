#!/usr/bin/env node
/**
 * Captures des cinq pages en **mode démonstration** + contrôle des erreurs console.
 *
 * Sert de garde-fou après un changement de dépendances : le mode mock ne dépend
 * pas de Home Assistant, un rendu cassé se voit donc immédiatement. Les captures
 * publiées dans `docs/captures/` sont produites avec la **configuration
 * d'exemple** (aucune donnée personnelle) et une **horloge simulée**, pour
 * montrer le ciel dynamique à toutes ses phases.
 *
 *   npm run dev:mock                     # dans un premier terminal
 *   npm run capture                      # les 5 pages, heure courante → docs/captures/auto/
 *   node scripts/capture.mjs --sortie docs/captures \
 *        --heures 03:00,07:50,12:00,18:44,21:00
 *                                        # l'accueil à chaque phase du ciel
 *
 * Options :
 *   --sortie DIR      dossier de sortie          (défaut docs/captures/auto)
 *   --heure HH:MM     horloge simulée pour les pages
 *   --heures LISTE    horloges simulées pour l'accueil uniquement (séparées par des virgules)
 *   --pages LISTE     pages à capturer           (défaut les cinq)
 *   --url URL         racine du serveur de développement (défaut http://localhost:5173)
 *
 * Variables d'environnement : CAPTURE_URL, CAPTURE_OUT, CHROME_PATH (=/usr/bin/google-chrome).
 * Le code de sortie vaut 1 si une page n'a pas rendu ou si la console a émis une
 * erreur : utilisable tel quel dans une vérification automatique.
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

function option(nom, defaut) {
  const i = process.argv.indexOf(`--${nom}`);
  return i === -1 || i + 1 >= process.argv.length ? defaut : process.argv[i + 1];
}

const BASE = option("url", process.env.CAPTURE_URL ?? "http://localhost:5173");
const OUT = option("sortie", process.env.CAPTURE_OUT ?? "docs/captures/auto");
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const HEURE = option("heure", null);
const HEURES = (option("heures", "") || "").split(",").map((h) => h.trim()).filter(Boolean);

const TOUTES = [
  { chemin: "", nom: "accueil" },
  { chemin: "chauffage", nom: "chauffage" },
  { chemin: "volets", nom: "volets" },
  { chemin: "climat", nom: "climat" },
  { chemin: "prieres", nom: "prieres" },
];
const demandees = (option("pages", "") || "").split(",").map((p) => p.trim()).filter(Boolean);
const PAGES = demandees.length ? TOUTES.filter((p) => demandees.includes(p.nom)) : TOUTES;

/** Horodatage simulé : aujourd'hui à HH:MM (heure locale). */
function horloge(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

const navigateur = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
const contexte = await navigateur.newContext({ viewport: { width: 1440, height: 1200 } });
await mkdir(OUT, { recursive: true });

let echecs = 0;

/**
 * Ouvre une page, attend que React ait monté (le dock est présent partout),
 * capture et rapporte les erreurs console.
 */
async function capturer(chemin, fichier, moment) {
  const onglet = await contexte.newPage();
  const erreurs = [];
  onglet.on("console", (message) => {
    if (message.type() === "error") erreurs.push(`console : ${message.text()}`);
  });
  onglet.on("pageerror", (erreur) => erreurs.push(`exception : ${erreur.message}`));

  try {
    // Horloge simulée : installée avant la navigation pour que le premier rendu
    // (et donc le ciel) utilise l'heure demandée.
    if (moment) await onglet.clock.install({ time: moment });

    await onglet.goto(`${BASE}/#/${chemin}`, { waitUntil: "load", timeout: 20_000 });
    await onglet.waitForSelector(".dock", { timeout: 15_000 });
    await onglet.waitForTimeout(400); // laisse jouer l'animation d'entrée de page
    await onglet.screenshot({ path: fichier });

    if (erreurs.length) {
      echecs += 1;
      console.error(`✗ ${fichier}`);
      for (const erreur of erreurs) console.error(`    ${erreur}`);
    } else {
      console.log(`✓ ${fichier}`);
    }
  } catch (e) {
    echecs += 1;
    console.error(`✗ ${fichier} : ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await onglet.close();
  }
}

if (HEURES.length) {
  // Une capture de l'accueil par phase du ciel : ciel-0300.png, ciel-1844.png…
  for (const heure of HEURES) {
    const nom = heure.replace(":", "");
    await capturer("", `${OUT}/ciel-${nom}.png`, horloge(heure));
  }
} else {
  for (const { chemin, nom } of PAGES) {
    await capturer(chemin, `${OUT}/${nom}.png`, horloge(HEURE));
  }
}

await navigateur.close();
process.exit(echecs ? 1 : 0);

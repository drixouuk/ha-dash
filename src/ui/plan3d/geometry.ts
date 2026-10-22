import polygonClipping, { type MultiPolygon, type Polygon } from "polygon-clipping";
import type { Plan, PlanOpening, PlanPoint, PlanZone } from "@config";

/**
 * Géométrie du plan pour la vue 3D, sans Three.js : tout est en cm dans le
 * repère du plan 2D (x à droite, y vers le bas). La scène convertit en mètres.
 */

/** Hauteurs (cm) : allège, haut des fenêtres et des portes, plafond. */
export const H = { allege: 90, linteau: 215, plafond: 250 };
/** Distance maximale (cm) entre une ouverture ou un appareil et le mur qui le porte. */
const PORTEE = 40;

export type Arete = {
  a: PlanPoint; b: PlanPoint; len: number;
  /** direction unitaire de a vers b */
  ux: number; uy: number;
  /** normale unitaire tournée vers l'intérieur de la pièce */
  nx: number; ny: number;
  zone: PlanZone;
};

const aire = (poly: readonly PlanPoint[]) =>
  poly.reduce((t, [x, y], i) => { const [x2, y2] = poly[(i + 1) % poly.length]; return t + x * y2 - x2 * y; }, 0) / 2;

export function aretes(plan: Plan): Arete[] {
  return plan.zones.flatMap((zone) => {
    // En coordonnées écran (y vers le bas), une aire positive = sens horaire : l'intérieur est à droite.
    const sens = aire(zone.poly) > 0 ? 1 : -1;
    return zone.poly.map((a, i) => {
      const b = zone.poly[(i + 1) % zone.poly.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
      return { a, b, len, ux, uy, nx: -uy * sens, ny: ux * sens, zone };
    });
  });
}

/** Arête la plus proche d'un point, avec l'abscisse du point projeté (cm depuis a) et la distance. */
export function plusProche(liste: Arete[], [x, y]: PlanPoint) {
  let mieux: { e: Arete; s: number; dist: number } | null = null;
  for (const e of liste) {
    const s = Math.max(0, Math.min(e.len, (x - e.a[0]) * e.ux + (y - e.a[1]) * e.uy));
    const px = e.a[0] + e.ux * s, py = e.a[1] + e.uy * s;
    const dist = Math.hypot(x - px, y - py);
    if (!mieux || dist < mieux.dist) mieux = { e, s, dist };
  }
  return mieux;
}

/** Repère d'une ouverture : centre, direction du mur et normale (vers la pièce la plus proche). */
export function repereOuverture(liste: Arete[], o: PlanOpening) {
  const p = plusProche(liste, o.at);
  const e = p?.e;
  return { at: o.at, ux: e?.ux ?? 1, uy: e?.uy ?? 0, nx: e?.nx ?? 0, ny: e?.ny ?? 1 };
}

/** Rectangle traversant le mur à l'emplacement de l'ouverture (profondeur 2 × PORTEE). */
function trou(liste: Arete[], o: PlanOpening): Polygon {
  const { at: [x, y], ux, uy, nx, ny } = repereOuverture(liste, o);
  const w = o.w / 2, d = PORTEE;
  const p = (s: number, t: number): [number, number] => [x + ux * s + nx * t, y + uy * s + ny * t];
  return [[p(-w, -d), p(w, -d), p(w, d), p(-w, d), p(-w, -d)]];
}

const ferme = (poly: readonly PlanPoint[]): Polygon => [[...poly.map(([x, y]) => [x, y] as [number, number]), [poly[0][0], poly[0][1]]]];

/** Point dans un polygone (lancer de rayon). */
export function dedans(poly: readonly PlanPoint[], [x, y]: PlanPoint) {
  let res = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) res = !res;
  }
  return res;
}

/**
 * Bandes de mur à abaisser autour d'une zone extérieure (balcon) : pour chaque
 * côté qui donne dehors, la bande entre ce côté et l'emprise. Les côtés qui
 * touchent le logement (cuisine, chambre…) gardent leur mur plein.
 */
function cotesExterieurs(plan: Plan, liste: Arete[], zone: PlanZone): Polygon[] {
  const cotes = liste.filter((e) => e.zone === zone);
  const D = 80;
  const dehors = cotes.map((e) => !dedans(plan.outline, [(e.a[0] + e.b[0]) / 2 - e.nx * 60, (e.a[1] + e.b[1]) / 2 - e.ny * 60]));
  return cotes.flatMap((e, i) => {
    if (!dehors[i]) return [];
    // Prolongé au-delà des angles qui donnent aussi dehors, pour ne pas laisser de pilier.
    const av = dehors[(i - 1 + cotes.length) % cotes.length] ? D : 0, ap = dehors[(i + 1) % cotes.length] ? D : 0;
    const a: [number, number] = [e.a[0] - e.ux * av, e.a[1] - e.uy * av];
    const b: [number, number] = [e.b[0] + e.ux * ap, e.b[1] + e.uy * ap];
    const loin = (p: [number, number]): [number, number] => [p[0] - e.nx * D, p[1] - e.ny * D];
    return [[[a, b, loin(b), loin(a), a]]];
  });
}

/**
 * Murs en tranches de hauteur : chaque tranche est l'emprise moins les pièces
 * moins ce qui est ouvert à cette hauteur (portes, fenêtres selon leur allège,
 * au-dessus du muret d'un balcon). Toutes les tranches vont jusqu'au plafond :
 * la scène dessine celles sous la hauteur choisie et garde les autres
 * invisibles, pour qu'elles portent quand même leur ombre.
 */
export function tranchesDeMurs(plan: Plan) {
  const liste = aretes(plan);
  const pieces = plan.zones.map((z) => ferme(z.poly));
  const ouvertures = (plan.openings ?? []).map((o) => ({
    bas: o.kind === "window" ? (o.sill ?? H.allege) : 0, haut: H.linteau, trou: trou(liste, o),
  }));
  const murets = plan.zones.filter((z) => z.outdoor).flatMap((z) =>
    cotesExterieurs(plan, liste, z).map((trou) => ({ bas: z.parapet ?? 100, haut: H.plafond, trou })));
  const coupes = [...ouvertures, ...murets];
  const paliers = [...new Set([0, H.plafond, ...coupes.flatMap((c) => [c.bas, c.haut])])]
    .filter((h) => h >= 0 && h <= H.plafond).sort((a, b) => a - b);
  const emprise = ferme(plan.outline);
  return paliers.slice(0, -1).map((de, i) => {
    const a = paliers[i + 1];
    const trous = coupes.filter((c) => c.bas <= de && c.haut >= a).map((c) => c.trou);
    return { de, a, forme: polygonClipping.difference(emprise, ...pieces, ...trous) as MultiPolygon };
  });
}

/** Plafond : l'emprise moins les zones extérieures (le soleil ne passe que par les fenêtres). */
export function plafond(plan: Plan): MultiPolygon {
  const ext = plan.zones.filter((z) => z.outdoor).map((z) => ferme(z.poly));
  return polygonClipping.difference(ferme(plan.outline), ...ext);
}

/** Point posé contre le mur le plus proche s'il est à portée, sinon laissé libre. */
export function contreLeMur(liste: Arete[], at: PlanPoint, profondeur: number) {
  const p = plusProche(liste, at);
  if (!p || p.dist > PORTEE * 1.5) return { at, angle: 0, mural: false };
  const { e, s } = p;
  const x = e.a[0] + e.ux * s + e.nx * (profondeur / 2);
  const y = e.a[1] + e.uy * s + e.ny * (profondeur / 2);
  // Angle autour de la verticale pour que la face avant (+z local) regarde la pièce.
  return { at: [x, y] as PlanPoint, angle: Math.atan2(e.nx, e.ny), mural: true };
}

export function centre(poly: readonly PlanPoint[]): PlanPoint {
  return [poly.reduce((t, p) => t + p[0], 0) / poly.length, poly.reduce((t, p) => t + p[1], 0) / poly.length];
}

export function bornes(poly: readonly PlanPoint[]) {
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

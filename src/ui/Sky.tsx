import { useMemo } from "react";
import { usePrayers } from "./prayer";
import { clamp, useNow } from "../util";

/**
 * Ciel de fond. La nuit est le fond de base (body::before). Trois calques (aube, jour, crépuscule)
 * apparaissent par fondu d'opacité (rien d'autre n'est animé) selon l'heure réelle de Fajr, du lever et du Maghrib.
 * Mise à jour une fois par minute ; les étoiles sont fixes.
 */
export type SkyWeights = { dawn: number; day: number; dusk: number; night: number };

const mins = (d: Date | null | undefined, fallback: number) => (d ? d.getHours() * 60 + d.getMinutes() : fallback);
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Poids des calques pour une minute de la journée. Exporté pour les tests. */
export function skyWeights(m: number, fajr: number, sunrise: number, maghrib: number, isha: number): SkyWeights {
  const a = fajr - 45; // début de l'aube
  const b = sunrise; // aube à son maximum
  const c = sunrise + 90; // plein jour
  const d = maghrib - 90; // fin du plein jour
  const e = maghrib; // crépuscule à son maximum
  const f = isha + 45; // nuit noire
  const seg = (x: number, x0: number, x1: number) => smooth(clamp((x - x0) / Math.max(1, x1 - x0), 0, 1));
  let dawn = 0, day = 0, dusk = 0;
  if (m >= a && m < b) dawn = seg(m, a, b);
  else if (m >= b && m < c) { const k = seg(m, b, c); dawn = 1 - k; day = k; }
  else if (m >= c && m < d) day = 1;
  else if (m >= d && m < e) { const k = seg(m, d, e); day = 1 - k; dusk = k; }
  else if (m >= e && m < f) dusk = 1 - seg(m, e, f);
  return { dawn, day, dusk, night: clamp(1 - dawn - day - dusk, 0, 1) };
}

export function useSky(now: Date): SkyWeights {
  const { rows } = usePrayers(now);
  const t = (k: string) => rows.find((r) => r.key === k)?.time;
  const fajr = mins(t("fajr"), 6 * 60 + 15);
  const sunrise = mins(t("sunrise"), 7 * 60 + 50);
  const maghrib = mins(t("maghrib"), 18 * 60 + 45);
  const isha = mins(t("isha"), 20 * 60 + 5);
  const m = now.getHours() * 60 + now.getMinutes();
  const ok = fajr < sunrise && sunrise < maghrib && maghrib < isha;
  return ok ? skyWeights(m, fajr, sunrise, maghrib, isha) : { dawn: 0, day: 0, dusk: 0, night: 1 };
}

// Étoiles déterministes (même ciel à chaque ouverture), concentrées vers le haut de l'écran.
function makeStars() {
  let s = 20260614;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  return Array.from({ length: 110 }, () => ({
    x: rnd() * 1000,
    y: Math.pow(rnd(), 1.7) * 820,
    r: rnd() < 0.12 ? 1.9 : rnd() < 0.5 ? 1.2 : 0.8,
    o: 0.35 + rnd() * 0.55,
  }));
}

export function Sky() {
  const w = useSky(useNow(60_000));
  const stars = useMemo(makeStars, []);
  return (
    <div className="sky" aria-hidden="true">
      <svg className="sky-stars" style={{ opacity: w.night }} viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#f4efe6" opacity={s.o} />
        ))}
      </svg>
      <div className="sky-l sky-dawn" style={{ opacity: w.dawn }} />
      <div className="sky-l sky-day" style={{ opacity: w.day }} />
      <div className="sky-l sky-dusk" style={{ opacity: w.dusk }} />
    </div>
  );
}

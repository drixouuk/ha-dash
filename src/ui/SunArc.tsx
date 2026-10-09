import { useId } from "react";
import type { PrayerRow } from "./prayer";

/** Couleurs du tracé : doré pour la course du jour, blanc du croissant pour la nuit. */
const JOUR = "#f2b441";
/** Teinte exacte du croissant (le halo de la lune, lui, reste #8f9bff). */
const NUIT = "#ebe8ff";

/** Course du soleil entre Fajr et Isha, avec les prières posées sur l'arc. */
export function SunArc({ rows, now, nextKey }: { rows: PrayerRow[]; now: Date; nextKey?: string }) {
  const id = useId();
  const g = (k: string) => rows.find((r) => r.key === k)?.time?.getTime();
  const fajr = g("fajr"), sunrise = g("sunrise"), maghrib = g("maghrib"), isha = g("isha");
  if (!fajr || !sunrise || !maghrib || !isha) return null;

  const W = 600, H = 170, HOR = 128, AMP = 92;
  const t0 = fajr - 55 * 60_000, t1 = isha + 55 * 60_000;
  const X = (t: number) => ((t - t0) / (t1 - t0)) * W;
  const Y = (t: number) => (t > sunrise && t < maghrib ? HOR - AMP * Math.sin((Math.PI * (t - sunrise)) / (maghrib - sunrise)) : HOR);
  const path = Array.from({ length: 121 }, (_, i) => {
    const t = t0 + ((t1 - t0) * i) / 120;
    return `${i ? "L" : "M"}${X(t).toFixed(1)} ${Y(t).toFixed(1)}`;
  }).join(" ");
  const tn = Math.min(t1, Math.max(t0, now.getTime()));
  const day = now.getTime() >= sunrise && now.getTime() <= maghrib;
  // Bascules jour/nuit sur l'arc, en fraction de largeur : servent au dégradé du tracé.
  const xLever = Math.min(1, Math.max(0, X(sunrise) / W));
  const xMaghrib = Math.min(1, Math.max(0, X(maghrib) / W));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block", overflow: "visible" }} role="img" aria-label="Course du soleil, les cinq prières et l'instant présent">
      <defs>
        <clipPath id={`${id}p`}><rect x="0" y="-20" width={X(tn)} height={H + 40} /></clipPath>
        <radialGradient id={`${id}s`}><stop offset="0" stopColor="#ffe3a3" /><stop offset="1" stopColor="#f2b441" /></radialGradient>
        <filter id={`${id}b`} x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="8" /></filter>
        <mask id={`${id}m`} maskUnits="userSpaceOnUse" x="-14" y="-14" width="28" height="28">
          <circle r="9" fill="#fff" />
          <circle cx="4.6" cy="-3.2" r="8" fill="#000" />
        </mask>
        {/* Tracé de l'arc : les deux paliers de nuit (avant le lever, après Maghrib)
            prennent la couleur de la lune, la course du jour reste dorée. Deux
            arrêts successifs à la même position donnent une bascule franche. */}
        <linearGradient id={`${id}g`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={W} y2="0">
          <stop offset="0" stopColor={NUIT} />
          <stop offset={xLever} stopColor={NUIT} />
          <stop offset={xLever} stopColor={JOUR} />
          <stop offset={xMaghrib} stopColor={JOUR} />
          <stop offset={xMaghrib} stopColor={NUIT} />
        </linearGradient>
      </defs>
      <line x1="0" x2={W} y1={HOR} y2={HOR} stroke="rgba(255,255,255,.14)" strokeDasharray="2 6" />
      <path d={path} fill="none" stroke={`url(#${id}g)`} strokeWidth="2" strokeLinecap="round" opacity=".3" />
      <path d={path} fill="none" stroke={`url(#${id}g)`} strokeWidth="3" strokeLinecap="round" clipPath={`url(#${id}p)`} />
      {rows.map((r) => {
        if (!r.time) return null;
        const t = r.time.getTime();
        const isNext = r.key === nextKey;
        // « prochaine » dont l'heure est déjà passée = celle de demain : on la montre à venir, pas passée
        const past = t <= now.getTime() && !isNext;
        const small = r.key === "sunrise";
        // Les points posés sur le tracé de nuit (Fajr, Isha) prennent la teinte de la lune, comme la ligne.
        const teinte = t < sunrise || t > maghrib ? NUIT : JOUR;
        return (
          <g key={r.key} data-prayer={small ? undefined : r.key}>
            {isNext && <circle cx={X(t)} cy={Y(t)} r="12" fill={teinte} fillOpacity=".25" className="glow" />}
            <circle cx={X(t)} cy={Y(t)} r={small ? 3 : 5.5} fill={past ? teinte : "#141a2e"} stroke={past ? "#141a2e" : "rgba(255,255,255,.7)"} strokeWidth="2.5" />
          </g>
        );
      })}
      {day ? (
        <g transform={`translate(${X(tn)} ${Y(tn)})`} aria-label="Soleil">
          <circle r="20" fill="#f2b441" opacity=".45" filter={`url(#${id}b)`} />
          {Array.from({ length: 8 }, (_, i) => (
            <line key={i} x1="0" y1="-13" x2="0" y2="-17.5" stroke="#f2b441" strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${i * 45})`} />
          ))}
          <circle r="8.5" fill={`url(#${id}s)`} />
        </g>
      ) : (
        <g transform={`translate(${X(tn)} ${HOR - 18})`} aria-label="Lune">
          <circle r="17" fill="#8f9bff" opacity=".35" filter={`url(#${id}b)`} />
          <circle r="9" fill="#ebe8ff" mask={`url(#${id}m)`} />
        </g>
      )}
    </svg>
  );
}

import { useEffect, useState } from "react";

export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** "18:44" ou un horodatage ISO -> Date du jour (heure locale). */
export function parseClock(state: string | undefined, ref = new Date()): Date | null {
  if (!state) return null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(state)) {
    const d = new Date(state);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = state.match(/(\d{1,2})[:h](\d{2})/);
  if (!m) return null;
  const d = new Date(ref);
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
}

export const clock = (d: Date | null) =>
  d ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "–";

export function fmtDuration(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, "0")}`;
}

export const n1 = (v: number | null | undefined, d = 1) =>
  v === null || v === undefined || Number.isNaN(v) ? "–" : v.toFixed(d).replace(".", ",");

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function greeting(d: Date) {
  const h = d.getHours();
  if (h < 5) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

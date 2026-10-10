import { useEffect, useState } from "react";

/**
 * Heure courante, rafraîchie à intervalle régulier **et dès le réveil**.
 *
 * Quand l'écran d'une tablette s'éteint, le navigateur gèle les minuteries : au rallumage l'affichage
 * resterait sur l'ancienne heure jusqu'au prochain tick (puis le fondu du ciel dure encore). On rafraîchit
 * donc aussi au retour de la page (visibilité, focus, reprise) et quand une vérification, toutes les
 * secondes, constate un grand écart d'horloge (cas où aucun événement n'est émis).
 * `wake` augmente à chaque réveil détecté : le ciel s'en sert pour se redessiner sans fondu.
 */
export function useClock(ms = 30_000) {
  const [state, setState] = useState(() => ({ now: new Date(), wake: 0 }));
  useEffect(() => {
    let last = Date.now();
    const refresh = (woke: boolean) => {
      last = Date.now();
      setState((s) => ({ now: new Date(last), wake: woke ? s.wake + 1 : s.wake }));
    };
    const verifier = () => {
      const ecart = Date.now() - last;
      if (ecart >= ms) refresh(ecart > ms + 5_000);
    };
    const auRetour = () => {
      if (document.visibilityState === "visible") refresh(Date.now() - last > 5_000);
    };
    const t = setInterval(verifier, 1_000);
    document.addEventListener("visibilitychange", auRetour);
    document.addEventListener("resume", auRetour);
    window.addEventListener("focus", auRetour);
    window.addEventListener("pageshow", auRetour);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", auRetour);
      document.removeEventListener("resume", auRetour);
      window.removeEventListener("focus", auRetour);
      window.removeEventListener("pageshow", auRetour);
    };
  }, [ms]);
  return state;
}

export const useNow = (ms = 30_000) => useClock(ms).now;

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

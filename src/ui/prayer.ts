import { E } from "@config";
import { useEnt } from "@data";
import { parseClock } from "../util";

export type PrayerRow = { key: string; label: string; time: Date | null; iqamah: Date | null };

/** Horaires du jour + prochaine prière, calculés localement (le compte à rebours ne dépend pas d'un attribut du capteur). */
export function usePrayers(now: Date) {
  const rows: PrayerRow[] = E.prayers.map((p) => {
    // « iqamah » est facultative (le lever du soleil n'en a pas) : on retombe alors sur l'adhan.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const a = useEnt(p.adhan);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const i = useEnt(p.iqamah ?? p.adhan);
    return { key: p.key, label: p.label, time: parseClock(a?.state, now), iqamah: p.iqamah ? parseClock(i?.state, now) : null };
  });
  const fard = rows.filter((r) => r.key !== "sunrise" && r.time);
  let next = fard.find((r) => r.time!.getTime() > now.getTime()) ?? null;
  let nextAt = next?.time ?? null;
  if (!next && fard[0]) {
    next = fard[0];
    nextAt = new Date(fard[0].time!.getTime() + 86400000);
  }
  const prevAt = [...fard].reverse().find((r) => r.time!.getTime() <= now.getTime())?.time ?? null;
  return { rows, next, nextAt, prevAt };
}

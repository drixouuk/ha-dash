import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { COVERS, E, OUTSIDE, ROOMS } from "@config";
import { toEnt, type Call, type Ent, type Point } from "./types";

/**
 * Mode démo : mêmes hooks que real.tsx, mais sur des données simulées (sert aux
 * captures d'écran et à la démonstration en ligne).
 *
 * Les **identifiants** d'entités viennent de la configuration active (`@config`),
 * jamais du code : la démo fonctionne donc aussi bien avec la configuration
 * d'exemple qu'avec une configuration locale. Seules les valeurs sont simulées,
 * par rôle (pièce, prière, volet…).
 */
type S = { state: string; attrs: Record<string, any> };

/** Heures simulées : [adhan, iqamah] par prière. */
const HEURES: Record<string, [string, string]> = {
  fajr: ["06:14", "06:34"],
  sunrise: ["07:52", "07:52"],
  dhuhr: ["13:03", "13:20"],
  asr: ["16:12", "16:30"],
  maghrib: ["18:44", "18:49"],
  isha: ["20:05", "20:25"],
};

/** Valeurs simulées par pièce, dans l'ordre de `ROOMS`. */
const PIECES = [
  { temp: 19.4, hum: 52, consigne: 20.5, action: "heating", chauffe: "on", jour: 3.2, semaine: 21.4 },
  { temp: 17.8, hum: 58, consigne: 17, action: "idle", chauffe: "off", jour: 1.1, semaine: 9.8 },
  { temp: 18.9, hum: 55, consigne: 19, action: "idle", chauffe: "off", jour: 2.0, semaine: 12.6 },
];

/** Position simulée par volet, dans l'ordre de `COVERS`. */
const VOLETS: (number | "unavailable")[] = [100, 100, 35, "unavailable"];

const CONSIGNES = [16, 7];
const MODES = ["off", "off", "on"];

const store: Record<string, S> = {
  [E.weather]: { state: "partlycloudy", attrs: { temperature: 14, humidity: 71, wind_speed: 18, apparent_temperature: 12 } },
  [E.islamicMonth]: { state: "Rabi' al-Thani", attrs: {} },
  [E.nextPrayer]: { state: "Maghrib", attrs: {} },
  [E.nest]: {
    state: "heat",
    attrs: { current_temperature: 19.4, temperature: 21, hvac_action: "heating", hvac_modes: ["off", "heat"], min_temp: 9, max_temp: 32, target_temp_step: 0.5 },
  },
  [E.heatDemand]: { state: "on", attrs: {} },
  [E.heatRooms]: { state: "1", attrs: {} },
  [E.solar]: { state: "off", attrs: {} },
  [E.light]: { state: "on", attrs: { brightness: 180, color_temp_kelvin: 3200 } },
  [E.plant.lux]: { state: "320", attrs: { unit_of_measurement: "lx" } },
  [E.plant.soil]: { state: "34", attrs: { unit_of_measurement: "%" } },
  [OUTSIDE.temp]: { state: "11.8", attrs: { unit_of_measurement: "°C" } },
  [OUTSIDE.hum]: { state: "78", attrs: { unit_of_measurement: "%" } },
  ...Object.fromEntries(E.prayers.map((p) => [p.adhan, { state: (HEURES[p.key] ?? ["", ""])[0], attrs: {} }])),
  ...Object.fromEntries(
    E.prayers.filter((p) => p.iqamah).map((p) => [p.iqamah as string, { state: (HEURES[p.key] ?? ["", ""])[1], attrs: {} }]),
  ),
  ...Object.fromEntries(E.setpoints.map((s, i) => [s.entity, { state: String(CONSIGNES[i] ?? 16), attrs: { min: 5, max: 26, step: 0.5 } }])),
  ...Object.fromEntries(E.modes.map((m, i) => [m.entity, { state: MODES[i] ?? "off", attrs: {} }])),
  ...Object.fromEntries(
    ROOMS.flatMap((piece, i) => {
      const v = PIECES[i] ?? PIECES[0];
      return [
        [piece.climate, {
          state: "heat",
          attrs: {
            current_temperature: v.temp, temperature: v.consigne, hvac_action: v.action,
            hvac_modes: ["off", "heat", "auto"], min_temp: 5, max_temp: 28, target_temp_step: 0.5,
          },
        }],
        [piece.temp, { state: String(v.temp), attrs: { unit_of_measurement: "°C" } }],
        [piece.hum, { state: String(v.hum), attrs: { unit_of_measurement: "%" } }],
        [piece.heating, { state: v.chauffe, attrs: {} }],
        [piece.statDay, { state: String(v.jour), attrs: { unit_of_measurement: "h" } }],
        [piece.statWeek, { state: String(v.semaine), attrs: { unit_of_measurement: "h" } }],
        [piece.setpoint, { state: String(v.consigne), attrs: { min: 5, max: 26, step: 0.5 } }],
      ];
    }),
  ),
  ...Object.fromEntries(
    COVERS.map((volet, i) => {
      const position = VOLETS[i] ?? 100;
      return [volet.id, position === "unavailable" ? { state: "unavailable", attrs: {} } : { state: "open", attrs: { current_position: position } }];
    }),
  ),
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));
const cacheE = new Map<string, { src: S; ent: Ent }>();

function get(id: string): Ent | null {
  const s = store[id];
  if (!s) return null;
  const c = cacheE.get(id);
  if (c && c.src === s) return c.ent;
  const ent = toEnt(id, s.state, s.attrs);
  cacheE.set(id, { src: s, ent });
  return ent;
}
const patch = (id: string, state?: string, attrs?: Record<string, any>) => {
  const s = store[id];
  if (!s) return;
  store[id] = { state: state ?? s.state, attrs: { ...s.attrs, ...attrs } };
  emit();
};

export function Connection({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useEnt(id: string): Ent | null {
  return useSyncExternalStore(subscribe, () => get(id));
}

const timers = new Map<string, number>();
function moveCover(id: string, to: number) {
  clearInterval(timers.get(id));
  const step = () => {
    const cur = Number(store[id].attrs.current_position ?? 0);
    const next = cur + Math.sign(to - cur) * Math.min(5, Math.abs(to - cur));
    patch(id, next === 0 ? "closed" : "open", { current_position: next });
    if (next === to) clearInterval(timers.get(id));
  };
  timers.set(id, window.setInterval(step, 60));
}

export function useCall(): Call {
  return (domain, service, data = {}, entityId) => {
    const ids = entityId === undefined ? [] : Array.isArray(entityId) ? entityId : [entityId];
    for (const id of ids) {
      if (!store[id]) continue;
      if (service === "set_cover_position") moveCover(id, Number(data.position));
      else if (service === "open_cover") moveCover(id, 100);
      else if (service === "close_cover") moveCover(id, 0);
      else if (service === "stop_cover") clearInterval(timers.get(id));
      else if (service === "set_temperature") patch(id, undefined, { temperature: data.temperature });
      else if (service === "set_hvac_mode") patch(id, String(data.hvac_mode));
      else if (service === "set_value") patch(id, String(data.value));
      else if (service === "toggle") patch(id, store[id].state === "on" ? "off" : "on");
      else if (service === "turn_on") patch(id, "on", data.brightness ? { brightness: data.brightness } : undefined);
      else if (service === "turn_off") patch(id, "off");
    }
    void domain;
  };
}

// --- historique simulé, déterministe ---
function rnd(seed: number) {
  let x = seed;
  return () => ((x = (x * 16807) % 2147483647) / 2147483647);
}
export function useHist(ids: string[], hours = 24): Record<string, Point[]> {
  const ref = useRef<Record<string, Point[]>>({});
  const key = `${hours}|${ids.join(",")}`;
  const last = useRef("");
  if (last.current !== key) {
    last.current = key;
    const out: Record<string, Point[]> = {};
    for (const id of ids) {
      const s = store[id];
      if (!s) continue;
      const r = rnd([...id].reduce((a, c) => a + c.charCodeAt(0), 7));
      const pts: Point[] = [];
      const end = Date.now();
      if (id.startsWith("binary_sensor")) {
        let t = end - hours * 3600_000;
        let on = false;
        while (t < end) {
          pts.push({ t, v: null, s: on ? "on" : "off" });
          t += (on ? 40 + r() * 70 : 90 + r() * 240) * 60_000;
          on = !on;
        }
      } else {
        const base = Number(s.state);
        const n = Math.min(hours * 4, 400);
        const amp = id.includes("humid") ? 8 : id.includes("illum") ? base * 0.9 : id.includes("soil") ? 3 : id.includes("plante_temp") ? 4 : 1.1;
        for (let i = 0; i < n; i++) {
          const t = end - ((n - 1 - i) / (n - 1)) * hours * 3600_000;
          const h = new Date(t).getHours() + new Date(t).getMinutes() / 60;
          const day = Math.sin(((h - 9) / 24) * Math.PI * 2);
          let v = base + (day * amp) / 1.6 + (r() - 0.5) * amp * 0.25;
          if (id.includes("illum")) v = Math.max(0, base * 1.4 * Math.max(0, -Math.cos((h / 24) * Math.PI * 2 + 0.2)) + r() * 5);
          if (id.includes("soil")) v = base + 14 - (i / n) * 14 + r();
          pts.push({ t, v: Math.round(v * 10) / 10, s: String(v) });
        }
      }
      out[id] = pts;
    }
    ref.current = out;
  }
  useEffect(() => undefined, []);
  return ref.current;
}

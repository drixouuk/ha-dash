import { useLayoutEffect, useRef, useState, type PointerEvent as PE } from "react";
import {
  Blinds, DoorClosed, DoorOpen, Gauge, Heater, Lightbulb, Radar, RadioTower, Sprout, Thermometer, Tv, type LucideIcon,
} from "lucide-react";
import { useEnt } from "@data";
import { ROOMS, type Plan, type PlanDevice, type PlanDeviceKind, type PlanPoint, type PlanZone } from "@config";
import type { Ent } from "../data/types";
import { clamp, n1 } from "../util";

/**
 * Plan isométrique du logement, dessiné en SVG sans bibliothèque 3D : chaque
 * point (x, y, z) en cm est tourné autour du centre du plan puis projeté avec
 * une élévation fixe. Les faces sont peintes de l'arrière vers l'avant
 * (algorithme du peintre), ce qui suffit pour des murs droits et bas.
 */

/** rot : rotation en degrés · tilt : sin de l'élévation (1 = vue de dessus) · h : hauteur des murs en cm. */
export type Vue = { rot: number; tilt: number; h: number };
export const VUE_3D: Omit<Vue, "rot"> = { tilt: 0.56, h: 90 };
export const VUE_DESSUS: Omit<Vue, "rot"> = { tilt: 1, h: 0 };

export const KIND: Record<PlanDeviceKind, { Icon: LucideIcon; label: string; z: number }> = {
  thermostat: { Icon: Gauge, label: "Thermostat", z: 0.6 },
  trv: { Icon: Heater, label: "Tête de radiateur", z: 0.25 },
  sensor: { Icon: Thermometer, label: "Sonde", z: 0.5 },
  presence: { Icon: Radar, label: "Présence", z: 0.8 },
  cover: { Icon: Blinds, label: "Volet", z: 1 },
  contact: { Icon: DoorClosed, label: "Ouverture", z: 0.5 },
  light: { Icon: Lightbulb, label: "Lumière", z: 0.9 },
  media: { Icon: Tv, label: "Multimédia", z: 0.35 },
  hub: { Icon: RadioTower, label: "Passerelle", z: 0.35 },
  plant: { Icon: Sprout, label: "Plante", z: 0.15 },
};

export type Ton = "ok" | "heat" | "warn" | "plain";
const TON: Record<Ton, string> = { ok: "var(--ok)", heat: "var(--ember)", warn: "var(--brass)", plain: "var(--text)" };

const MEDIA: Record<string, string> = { playing: "Lecture", paused: "Pause", idle: "Veille", standby: "Veille", off: "Éteint", on: "Allumé", buffering: "Chargement" };

/** Valeur courte affichée sous le repère, et sa couleur. */
export function lecture(kind: PlanDeviceKind, e: Ent | null): { text: string; ton: Ton } {
  if (!e) return { text: "?", ton: "warn" };
  if (!e.ok) return { text: "Hors ligne", ton: "warn" };
  const a = e.attrs;
  switch (kind) {
    case "thermostat":
    case "trv":
      return { text: `${n1(a.current_temperature != null ? Number(a.current_temperature) : null)}°`, ton: a.hvac_action === "heating" ? "heat" : "plain" };
    case "presence":
      return e.on ? { text: "Présence", ton: "ok" } : { text: "Vide", ton: "plain" };
    case "contact":
      return e.on ? { text: "Ouverte", ton: "warn" } : { text: "Fermée", ton: "plain" };
    case "cover": {
      if (e.state === "opening" || e.state === "closing") return { text: e.state === "opening" ? "Ouvre…" : "Ferme…", ton: "warn" };
      const pos = Number(a.current_position ?? (e.state === "open" ? 100 : 0));
      return { text: `${pos} %`, ton: "plain" };
    }
    case "light":
      return e.on ? { text: "Allumée", ton: "warn" } : { text: "Éteinte", ton: "plain" };
    case "media":
      return { text: MEDIA[e.state] ?? e.state, ton: e.state === "playing" ? "ok" : "plain" };
    case "hub":
      return e.on ? { text: "En ligne", ton: "ok" } : { text: "Hors ligne", ton: "warn" };
    default: {
      const unite = String(a.unit_of_measurement ?? "");
      if (unite === "%") return { text: `${n1(e.num, 0)} %`, ton: "plain" };
      if (unite.includes("°")) return { text: `${n1(e.num)}°`, ton: "plain" };
      return { text: `${e.num != null ? n1(e.num) : e.state}${unite ? ` ${unite}` : ""}`, ton: "plain" };
    }
  }
}

type P3 = { x: number; y: number; d: number };

function geometrie(plan: Plan, v: Vue) {
  const xs = plan.outline.map((p) => p[0]), ys = plan.outline.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const a = (v.rot * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const zs = Math.sqrt(Math.max(0, 1 - v.tilt * v.tilt));
  const P = (x: number, y: number, z = 0): P3 => {
    const dx = x - cx, dy = y - cy;
    const xr = dx * c - dy * s, yr = dx * s + dy * c;
    return { x: xr, y: yr * v.tilt - z * zs, d: yr };
  };
  /** Point de l'écran (unités SVG) → point du sol, en cm. */
  const sol = (sx: number, sy: number): PlanPoint => {
    const yr = sy / v.tilt;
    return [Math.round(cx + sx * c + yr * s), Math.round(cy - sx * s + yr * c)];
  };
  // Cadre ajusté au dessin pour la rotation courante (socle, sol et sommet des murs),
  // avec une marge pour les repères qui dépassent.
  const coins = plan.outline.flatMap(([x, y]) => [P(x, y, -22), P(x, y, v.h)]);
  const x0 = Math.min(...coins.map((p) => p.x)), x1 = Math.max(...coins.map((p) => p.x));
  const y0 = Math.min(...coins.map((p) => p.y)), y1 = Math.max(...coins.map((p) => p.y));
  const marge = 50;
  const box = { x: x0 - marge, y: y0 - marge * 1.6, w: x1 - x0 + 2 * marge, h: y1 - y0 + marge * 2.6 };
  return { P, sol, box };
}

const pts = (l: P3[]) => l.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
const centre = (poly: readonly PlanPoint[]): PlanPoint =>
  [poly.reduce((t, p) => t + p[0], 0) / poly.length, poly.reduce((t, p) => t + p[1], 0) / poly.length];

/** Pièce du plan qui contient le point (lancer de rayon). */
export function zoneDe(plan: Plan, [x, y]: PlanPoint): PlanZone | undefined {
  return plan.zones.find(({ poly }) => {
    let dedans = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
    }
    return dedans;
  });
}

function Sol({ zone, P, k, onOpen }: { zone: PlanZone; P: (x: number, y: number, z?: number) => P3; k: number; onOpen?: () => void }) {
  const room = ROOMS.find((r) => r.id === zone.room);
  const chauffe = useEnt(room?.heating ?? "");
  const temp = useEnt(room?.temp ?? "");
  const [mx, my] = centre(zone.poly);
  const m = P(mx, my);
  const fill = zone.outdoor ? "url(#plan-hachures)" : chauffe?.on ? "var(--ember)" : room ? room.color : "#ffffff";
  const opacity = zone.outdoor ? 1 : chauffe?.on ? 0.3 : room ? 0.2 : 0.05;
  return (
    <g className={onOpen ? "plan-zone tap-zone" : "plan-zone"} onClick={onOpen} role={onOpen ? "button" : undefined} aria-label={onOpen ? `Ouvrir ${zone.name}` : undefined}>
      <polygon points={pts(zone.poly.map(([x, y]) => P(x, y)))} fill={fill} fillOpacity={opacity} stroke="rgba(255,255,255,.2)" strokeWidth={k} strokeDasharray={zone.outdoor ? `${4 * k} ${3 * k}` : undefined} />
      <text x={m.x} y={m.y - (temp ? 6 * k : 0)} textAnchor="middle" fontSize={10.5 * k} fontWeight={700} letterSpacing={0.08 * 10.5 * k} fill="var(--faint)" style={{ textTransform: "uppercase" }}>{zone.name}</text>
      {temp && <text x={m.x} y={m.y + 17 * k} textAnchor="middle" className="num" fontSize={20 * k} fill="var(--text)">{n1(temp.num)}°</text>}
    </g>
  );
}

function Repere({ d, at, P, h, k, edition, actif, onDown, onOpen }: {
  d: PlanDevice; at: PlanPoint; P: (x: number, y: number, z?: number) => P3; h: number; k: number;
  edition: boolean; actif: boolean; onDown: (e: PE<SVGGElement>) => void; onOpen: () => void;
}) {
  const e = useEnt(d.entity);
  const { text, ton } = lecture(d.kind, e);
  const Icon = d.kind === "contact" && e?.on ? DoorOpen : KIND[d.kind].Icon;
  const base = P(at[0], at[1]), haut = P(at[0], at[1], KIND[d.kind].z * h);
  const r = 15 * k, w = (text.length * 6.6 + 14) * k;
  const couleur = TON[ton];
  return (
    <g
      className="plan-dev" role="button" aria-label={`${d.name} : ${text}`} tabIndex={0}
      style={{ cursor: edition ? (actif ? "grabbing" : "grab") : "pointer", opacity: e?.ok === false || !e ? 0.6 : 1 }}
      onPointerDown={onDown} onClick={edition ? undefined : onOpen}
      onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && !edition && onOpen()}
    >
      {h > 0 && <line x1={base.x} y1={base.y} x2={haut.x} y2={haut.y} stroke="rgba(255,255,255,.35)" strokeWidth={1.2 * k} />}
      {h > 0 && <ellipse cx={base.x} cy={base.y} rx={4 * k} ry={2.2 * k} fill="rgba(255,255,255,.4)" />}
      <circle cx={haut.x} cy={haut.y} r={r + (actif ? 4 * k : 0)} fill="#0c1020" stroke={ton === "plain" ? "rgba(255,255,255,.35)" : couleur} strokeWidth={2 * k} strokeDasharray={e?.ok ? undefined : `${3 * k} ${2.5 * k}`} />
      <Icon x={haut.x - 9 * k} y={haut.y - 9 * k} width={18 * k} height={18 * k} color={ton === "plain" ? "var(--text)" : couleur} strokeWidth={2} />
      <rect x={haut.x - w / 2} y={haut.y + r + 3 * k} width={w} height={18 * k} rx={9 * k} fill="rgba(12,16,32,.86)" />
      <text x={haut.x} y={haut.y + r + 15.5 * k} textAnchor="middle" fontSize={11 * k} fontWeight={700} fill={couleur}>{text}</text>
    </g>
  );
}

export function IsoPlan({ plan, vue, positions, edition, onRot, onMove, onZone, onDevice }: {
  plan: Plan; vue: Vue; positions: Record<string, PlanPoint>; edition: boolean;
  onRot: (rot: number) => void; onMove: (id: string, at: PlanPoint) => void;
  onZone: (zone: PlanZone) => void; onDevice: (d: PlanDevice) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const { P, sol, box } = geometrie(plan, vue);
  // Unités SVG par pixel : repères et textes gardent la même taille à l'écran,
  // un peu réduite sur un écran étroit pour que les repères se chevauchent moins.
  const [k, setK] = useState(1.4);
  useLayoutEffect(() => {
    const el = svg.current;
    if (!el) return;
    const maj = () => el.clientWidth && setK((box.w / el.clientWidth) * clamp(el.clientWidth / 760, 0.7, 1));
    maj();
    const ro = new ResizeObserver(maj);
    ro.observe(el);
    return () => ro.disconnect();
  }, [box.w]);

  // Un glisser horizontal tourne la maquette ; un glissé de plus de 6 px n'est pas un toucher.
  const geste = useRef<{ x: number; rot: number; bouge: boolean } | null>(null);
  const [tire, setTire] = useState<string | null>(null);
  const versSvg = (e: PE) => {
    const el = svg.current!, m = el.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return sol(p.x, p.y);
  };
  const down = (e: PE<SVGSVGElement>) => {
    if (edition) return;
    geste.current = { x: e.clientX, rot: vue.rot, bouge: false };
  };
  const move = (e: PE<SVGSVGElement>) => {
    if (tire) {
      const p = versSvg(e);
      if (p) onMove(tire, p);
      return;
    }
    const g = geste.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    if (!g.bouge && Math.abs(dx) > 6) {
      g.bouge = true;
      svg.current?.setPointerCapture(e.pointerId);
    }
    if (g.bouge) onRot(g.rot + dx * 0.35);
  };
  const up = () => {
    setTire(null);
    // Laisser passer le clic qui suit le relâchement avant d'oublier le geste.
    setTimeout(() => (geste.current = null), 0);
  };
  const toucher = (f: () => void) => () => !geste.current?.bouge && f();

  const ou = (d: PlanDevice) => positions[d.id] ?? d.at;
  // Murs : une face par arête de pièce, triées de l'arrière vers l'avant.
  const murs = vue.h > 0
    ? plan.zones.flatMap((z) => z.poly.map((a, i) => {
      const b = z.poly[(i + 1) % z.poly.length];
      const h = z.outdoor ? vue.h * 0.35 : vue.h;
      const f = [P(a[0], a[1]), P(b[0], b[1]), P(b[0], b[1], h), P(a[0], a[1], h)];
      return { f, d: (f[0].d + f[1].d) / 2, ext: Boolean(z.outdoor) };
    })).sort((m1, m2) => m1.d - m2.d)
    : [];
  // Socle : l'emprise extrudée vers le bas, peinte avant le dessus.
  const socle = vue.h > 0
    ? plan.outline.map((a, i) => {
      const b = plan.outline[(i + 1) % plan.outline.length];
      return [P(a[0], a[1]), P(b[0], b[1]), P(b[0], b[1], -22), P(a[0], a[1], -22)];
    })
    : [];
  const devices = [...plan.devices].sort((d1, d2) => P(...ou(d1)).d - P(...ou(d2)).d);

  return (
    <svg
      ref={svg} className="iso-plan" viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      style={{ touchAction: edition ? "none" : "pan-y", cursor: edition ? "default" : "grab" }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      aria-label="Plan du logement"
    >
      <defs>
        <pattern id="plan-hachures" width={8 * k} height={8 * k} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={8 * k} height={8 * k} fill="rgba(255,255,255,.03)" />
          <line x1="0" y1="0" x2="0" y2={8 * k} stroke="rgba(255,255,255,.12)" strokeWidth={2 * k} />
        </pattern>
      </defs>
      {socle.map((f, i) => <polygon key={i} points={pts(f)} fill="#0b1022" stroke="rgba(255,255,255,.08)" strokeWidth={k} />)}
      <polygon points={pts(plan.outline.map(([x, y]) => P(x, y)))} fill="rgba(4,6,14,.75)" stroke="rgba(255,255,255,.14)" strokeWidth={k} />
      {plan.zones.map((z) => (
        <Sol key={z.name} zone={z} P={P} k={k} onOpen={z.room && !edition ? toucher(() => onZone(z)) : undefined} />
      ))}
      {murs.map((m, i) => (
        <g key={i} pointerEvents="none">
          {!m.ext && <polygon points={pts(m.f)} fill="rgba(190,205,255,.07)" stroke="rgba(255,255,255,.1)" strokeWidth={0.8 * k} />}
          <line x1={m.f[3].x} y1={m.f[3].y} x2={m.f[2].x} y2={m.f[2].y} stroke={m.ext ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.4)"} strokeWidth={(m.ext ? 1 : 1.6) * k} strokeDasharray={m.ext ? `${3 * k} ${3 * k}` : undefined} />
        </g>
      ))}
      {devices.map((d) => (
        <Repere
          key={d.id} d={d} at={ou(d)} P={P} h={vue.h} k={k} edition={edition} actif={tire === d.id}
          onDown={(e) => {
            if (!edition) return;
            e.stopPropagation();
            svg.current?.setPointerCapture(e.pointerId);
            setTire(d.id);
          }}
          onOpen={toucher(() => onDevice(d))}
        />
      ))}
      {edition && <text x={box.x + 20 * k} y={box.y + box.h - 10 * k} fontSize={11 * k} fill="var(--faint)">Vue de dessus · glissez les repères</text>}
    </svg>
  );
}

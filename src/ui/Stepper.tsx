import { Minus, Plus } from "lucide-react";
import { useCall, useEnt } from "@data";
import { n1 } from "../util";

/** Unité affichée : « ° » pour les températures, sinon l'unité de l'entité. */
const unite = (u: string) => (u === "°C" ? "°" : u ? ` ${u}` : "");

/**
 * Réglage d'un `input_number` par pas : bornes, pas et unité viennent de
 * l'entité (repli : ceux fournis). Chaque appui écrit la valeur dans Home Assistant.
 */
export function Stepper({ entity, name, hint, min: minD, max: maxD, step: stepD, unit: unitD }: {
  entity: string; name: string; hint?: string; min?: number; max?: number; step?: number; unit?: string;
}) {
  const e = useEnt(entity);
  const call = useCall();
  if (!e) return null;
  const step = Number(e.attrs.step ?? stepD ?? 0.5), min = Number(e.attrs.min ?? minD ?? 5), max = Number(e.attrs.max ?? maxD ?? 30);
  const u = String(e.attrs.unit_of_measurement ?? unitD ?? "");
  const decimales = Number.isInteger(step) ? 0 : 1;
  const set = (v: number) => call("input_number", "set_value", { value: Math.round(Math.min(max, Math.max(min, v)) / step) * step }, entity);
  const v = e.num;
  return (
    <div className="setting">
      <div className="setting-txt"><div className="setting-nom">{name}</div>{hint && <div className="sub setting-aide">{hint}</div>}</div>
      <div className="row" style={{ gap: 8, flex: "none" }}>
        <button className="icon-btn" style={{ width: 38, height: 38 }} disabled={!e.ok || (v ?? min) <= min} onClick={() => set((v ?? min) - step)} aria-label={`Baisser ${name}`}><Minus /></button>
        <span className="num" style={{ fontSize: 21, minWidth: 74, textAlign: "center" }}>{e.ok ? `${n1(v, decimales)}${unite(u)}` : "–"}</span>
        <button className="icon-btn" style={{ width: 38, height: 38 }} disabled={!e.ok || (v ?? max) >= max} onClick={() => set((v ?? max) + step)} aria-label={`Monter ${name}`}><Plus /></button>
      </div>
    </div>
  );
}

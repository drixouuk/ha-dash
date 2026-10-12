import { useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { clamp, n1 } from "../util";

const START = 135;
const SWEEP = 270;
const C = 110;
const R = 90;
const pt = (deg: number, r = R) => {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const;
};
const arc = (a0: number, a1: number) => {
  const [x0, y0] = pt(a0);
  const [x1, y1] = pt(a1);
  return `M ${x0} ${y0} A ${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};

type Props = {
  value: number; // consigne
  current?: number | null; // température mesurée
  min?: number;
  max?: number;
  step?: number;
  heating?: boolean;
  disabled?: boolean;
  /** Pourquoi le cadran est inerte : affiché en infobulle (entité indisponible, thermostat éteint, piloté par HA…). */
  disabledReason?: string;
  color: string;
  label?: string;
  onCommit: (v: number) => void;
};

/** Cadran de consigne : glisser sur l'arc ou utiliser − / +. Le point blanc marque la température actuelle. */
export function Dial({ value, current, min = 5, max = 28, step = 0.5, heating, disabled, disabledReason, color, label, onCommit }: Props) {
  const [draft, setDraft] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const shown = draft ?? value;
  const toDeg = (v: number) => START + ((clamp(v, min, max) - min) / (max - min)) * SWEEP;
  const snap = (v: number) => clamp(Math.round(v / step) * step, min, max);

  const fromEvent = (e: React.PointerEvent) => {
    const box = ref.current!.getBoundingClientRect();
    const dx = e.clientX - (box.left + box.width / 2);
    const dy = e.clientY - (box.top + box.height / 2);
    let rel = (((Math.atan2(dy, dx) * 180) / Math.PI - START) % 360 + 360) % 360;
    if (rel > SWEEP) rel = rel > SWEEP + (360 - SWEEP) / 2 ? 0 : SWEEP;
    return snap(min + (rel / SWEEP) * (max - min));
  };
  const down = (e: React.PointerEvent) => {
    if (disabled) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDraft(fromEvent(e));
  };
  const move = (e: React.PointerEvent) => {
    if (draft !== null) setDraft(fromEvent(e));
  };
  const up = () => {
    if (draft !== null && draft !== value) onCommit(draft);
    setDraft(null);
  };
  const bump = (d: number) => !disabled && onCommit(snap(value + d));

  const [tx, ty] = pt(toDeg(shown));
  const hot = heating && !disabled;
  const stroke = hot ? "url(#heatGrad)" : color;

  return (
    <div className="dial" style={{ opacity: disabled ? 0.45 : 1 }} title={disabled ? disabledReason : undefined}>
      <svg ref={ref} viewBox="0 0 220 200" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="slider"
        aria-label={label ?? "Consigne"} aria-valuemin={min} aria-valuemax={max} aria-valuenow={shown} aria-disabled={disabled || undefined}>
        <defs>
          <linearGradient id="heatGrad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#f2b441" />
            <stop offset="1" stopColor="#ff6a3a" />
          </linearGradient>
        </defs>
        {hot && <circle className="glow" cx={C} cy={C} r={R - 22} fill="#ff7a45" fillOpacity=".09" />}
        <path d={arc(START, START + SWEEP)} stroke="rgba(255,255,255,.1)" strokeWidth="14" strokeLinecap="round" fill="none" />
        <path d={arc(START, Math.max(START + 0.01, toDeg(shown)))} stroke={stroke} strokeWidth="14" strokeLinecap="round" fill="none" />
        {current != null && (
          <circle cx={pt(toDeg(current))[0]} cy={pt(toDeg(current))[1]} r="3.4" fill="#fff" opacity=".95" />
        )}
        <circle cx={tx} cy={ty} r="13" fill="#f4efe6" stroke="rgba(0,0,0,.25)" strokeWidth="1" style={{ cursor: disabled ? "default" : "grab" }} />
        <circle cx={tx} cy={ty} r="4.5" fill={hot ? "#ff6a3a" : color} />
      </svg>
      <div className="mid">
        <div className="eyebrow">Consigne</div>
        <div className="num">{n1(shown)}°</div>
        <div className="sub" style={{ fontSize: 13, marginTop: 2 }}>
          {current != null ? `Actuel ${n1(current)}°` : "—"}
        </div>
      </div>
      <div className="row" style={{ justifyContent: "center", gap: 18, marginTop: -26, position: "relative" }}>
        <button className="icon-btn" onClick={() => bump(-step)} aria-label="Baisser la consigne" disabled={disabled}><Minus /></button>
        <button className="icon-btn" onClick={() => bump(step)} aria-label="Monter la consigne" disabled={disabled}><Plus /></button>
      </div>
    </div>
  );
}

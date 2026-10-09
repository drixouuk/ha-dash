import { useId, useRef, useState } from "react";
import type { Point } from "../data/types";
import { n1 } from "../util";

type Props = {
  points: Point[] | undefined;
  color: string;
  unit?: string;
  hours?: number;
  height?: number;
  decimals?: number;
};

/** Courbe 24 h avec dégradé, repères min/max et lecture au survol ou au toucher. */
export function Spark({ points, color, unit = "", hours = 24, height = 84, decimals = 1 }: Props) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 320;
  const pts = (points ?? []).filter((p) => p.v !== null) as Array<Point & { v: number }>;
  if (pts.length < 2) return <div style={{ height }} className="sub">Pas encore d'historique</div>;

  const t1 = Date.now();
  const t0 = t1 - hours * 3600_000;
  const vs = pts.map((p) => p.v);
  let lo = Math.min(...vs);
  let hi = Math.max(...vs);
  if (hi - lo < 0.5) { lo -= 0.5; hi += 0.5; }
  const pad = 8;
  const x = (t: number) => ((t - t0) / (t1 - t0)) * W;
  const y = (v: number) => pad + (1 - (v - lo) / (hi - lo)) * (height - pad * 2);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(Math.max(p.t, t0)).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(pts[pts.length - 1].t).toFixed(1)} ${height} L${x(Math.max(pts[0].t, t0)).toFixed(1)} ${height} Z`;
  const imin = vs.indexOf(Math.min(...vs));
  const imax = vs.indexOf(Math.max(...vs));

  const onMove = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    const t = t0 + ((e.clientX - r.left) / r.width) * (t1 - t0);
    let best = 0;
    for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i].t - t) < Math.abs(pts[best].t - t)) best = i;
    setHover(best);
  };
  const h = hover !== null ? pts[hover] : null;
  const u = unit === "°C" ? "°" : unit ? ` ${unit}` : "";

  return (
    <div className="spark" ref={box} onPointerMove={onMove} onPointerLeave={() => setHover(null)} style={{ touchAction: "pan-y" }}>
      {h && (
        <div className="tip" style={{ left: `${(x(h.t) / W) * 100}%` }}>
          {n1(h.v, decimals)} {unit}
          <small>{new Date(h.t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</small>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ height }} role="img" aria-label="Évolution sur 24 heures">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".38" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {h && <line x1={x(h.t)} x2={x(h.t)} y1="0" y2={height} stroke="rgba(255,255,255,.35)" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
      </svg>
      {/* repères en HTML pour rester ronds malgré l'étirement du SVG */}
      {[imin, imax].map((i, k) => (
        <span key={k} style={{
          position: "absolute", left: `${(x(pts[i].t) / W) * 100}%`, top: y(pts[i].v) - 4, width: 8, height: 8, marginLeft: -4,
          borderRadius: "50%", background: color, boxShadow: "0 0 0 2px #1a2038", pointerEvents: "none",
        }} />
      ))}
      {h && (
        <span style={{ position: "absolute", left: `${(x(h.t) / W) * 100}%`, top: y(h.v) - 5, width: 10, height: 10, marginLeft: -5, borderRadius: "50%", background: "#fff", boxShadow: `0 0 0 3px ${color}`, pointerEvents: "none" }} />
      )}
      <div className="row between sub" style={{ fontSize: 12, marginTop: 4, fontWeight: 700, whiteSpace: "nowrap" }}>
        <span>min {n1(lo + (hi - lo < 1.01 ? 0.5 : 0), decimals)}{u}</span>
        <span>max {n1(hi - (hi - lo < 1.01 ? 0.5 : 0), decimals)}{u}</span>
      </div>
    </div>
  );
}

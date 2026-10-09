import { useState } from "react";
import type { Point } from "../data/types";
import { n1 } from "../util";

/** Frise 24 h des périodes de chauffe (binary_sensor on/off). */
export function Timeline({ rows }: { rows: { name: string; color: string; points?: Point[] }[] }) {
  const t1 = Date.now();
  const t0 = t1 - 24 * 3600_000;
  const pct = (t: number) => ((Math.max(t, t0) - t0) / (t1 - t0)) * 100;
  const ticks = Array.from({ length: 5 }, (_, i) => new Date(t0 + (i * 6 * 3600_000)));
  return (
    <div className="stack" style={{ gap: 10 }}>
      {rows.map((r) => {
        const p = r.points ?? [];
        const segs: [number, number][] = [];
        p.forEach((pt, i) => {
          if (pt.s === "on") segs.push([pt.t, p[i + 1]?.t ?? t1]);
        });
        const mins = segs.reduce((a, [s, e]) => a + (e - Math.max(s, t0)), 0) / 60000;
        return (
          <div key={r.name} style={{ display: "grid", gridTemplateColumns: "74px 1fr 52px", gap: 10, alignItems: "center" }}>
            <span className="row" style={{ gap: 8, fontWeight: 700, fontSize: 13.5 }}><i className="dotc" style={{ ["--c" as string]: r.color }} />{r.name}</span>
            <div className="tl-track" role="img" aria-label={`Chauffe ${r.name} sur 24 h`}>
              {segs.map(([s, e], i) => <b key={i} style={{ left: `${pct(s)}%`, width: `${Math.max(0.8, pct(e) - pct(s))}%` }} />)}
            </div>
            <span className="sub" style={{ fontSize: 12.5, fontWeight: 700, textAlign: "right" }}>{Math.floor(mins / 60)} h {String(Math.round(mins % 60)).padStart(2, "0")}</span>
          </div>
        );
      })}
      <div style={{ display: "grid", gridTemplateColumns: "74px 1fr 52px", gap: 10 }}>
        <span />
        <div className="row between sub" style={{ fontSize: 11, fontWeight: 700 }}>
          {ticks.map((d, i) => <span key={i}>{String(d.getHours()).padStart(2, "0")} h</span>)}
        </div>
        <span />
      </div>
    </div>
  );
}

/** Carte thermique 7 jours × 24 heures : l'intensité de la couleur suit la valeur. */
export function Heatmap({ points, color, unit }: { points?: Point[]; color: string; unit: string }) {
  const [sel, setSel] = useState<string | null>(null);
  const now = new Date();
  const sums = new Map<string, { s: number; n: number }>();
  (points ?? []).forEach((p) => {
    if (p.v === null) return;
    const d = new Date(p.t);
    const ago = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
    const k = `${ago}-${d.getHours()}`;
    const c = sums.get(k) ?? { s: 0, n: 0 };
    c.s += p.v; c.n += 1;
    sums.set(k, c);
  });
  const vals = [...sums.values()].map((c) => c.s / c.n);
  if (!vals.length) return <div className="sub">Pas encore d'historique</div>;
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const alpha = (v: number) => 0.14 + 0.86 * ((v - lo) / Math.max(0.001, hi - lo));
  const dayLabel = (ago: number) => ago === 0 ? "Auj." : new Date(now.getTime() - ago * 86400000).toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div style={{ minHeight: 20, fontWeight: 700, fontSize: 13.5 }}>
        {sel ? sel : <span className="sub">Touchez une case pour lire la valeur</span>}
      </div>
      <div className="hm">
        {Array.from({ length: 7 }, (_, ago) => (
          <div className="r" key={ago}>
            <span>{dayLabel(ago)}</span>
            {Array.from({ length: 24 }, (_, h) => {
              const c = sums.get(`${ago}-${h}`);
              const v = c ? c.s / c.n : null;
              const label = v === null ? "" : `${dayLabel(ago)} ${String(h).padStart(2, "0")} h — ${n1(v)} ${unit}`;
              return (
                <i key={h} title={label} onPointerEnter={() => v !== null && setSel(label)} onClick={() => v !== null && setSel(label)}
                  style={v === null ? { border: "1px dashed rgba(255,255,255,.1)" } : { background: color, opacity: alpha(v) }} />
              );
            })}
          </div>
        ))}
        <div className="r"><span /> {[0, 6, 12, 18].map((h) => <span key={h} style={{ gridColumn: `${h + 2} / span 6` }}>{String(h).padStart(2, "0")} h</span>)}</div>
      </div>
      <div className="row sub" style={{ fontSize: 12, fontWeight: 700, gap: 10 }}>
        <span>{n1(lo)} {unit}</span>
        <div style={{ flex: 1, height: 8, borderRadius: 9, background: `linear-gradient(90deg, ${color}24, ${color})` }} />
        <span>{n1(hi)} {unit}</span>
      </div>
    </div>
  );
}

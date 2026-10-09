import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Square, WifiOff } from "lucide-react";
import { useCall, useEnt } from "@data";
import { clamp } from "../util";

/** Volet : glisser sur la fenêtre pour régler la position, ou utiliser les boutons / préréglages. */
export function Shutter({ id, name, compact = false }: { id: string; name: string; compact?: boolean }) {
  const ent = useEnt(id);
  const call = useCall();
  const box = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<number | null>(null);

  if (!ent || !ent.ok) {
    return (
      <div className="stack" style={{ gap: 10 }}>
        <div className="row between"><b>{name}</b><span className="badge warn"><WifiOff /> Injoignable</span></div>
        <div className="win off" style={compact ? { aspectRatio: "16 / 7" } : undefined}>Ce volet ne répond plus. Vérifiez son alimentation ou ré-incluez-le dans Zigbee.</div>
      </div>
    );
  }
  const pos = Number(ent.attrs.current_position ?? (ent.state === "open" ? 100 : 0));
  const shown = draft ?? pos;
  const closed = 100 - shown;

  const fromEvent = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return clamp(Math.round((100 - ((e.clientY - r.top) / r.height) * 100) / 5) * 5, 0, 100);
  };
  const set = (p: number) => call("cover", "set_cover_position", { position: p }, id);

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="row between">
        <b>{name}</b>
        <span className="sub" style={{ fontSize: 13, fontWeight: 700 }}>
          {shown === 100 ? "Ouvert" : shown === 0 ? "Fermé" : `Ouvert à ${shown} %`}
        </span>
      </div>
      <div
        ref={box} className={`win${draft !== null ? " drag" : ""}`} style={compact ? { aspectRatio: "16 / 7" } : undefined}
        onPointerDown={(e) => { (e.currentTarget as Element).setPointerCapture(e.pointerId); setDraft(fromEvent(e)); }}
        onPointerMove={(e) => draft !== null && setDraft(fromEvent(e))}
        onPointerUp={() => { if (draft !== null) set(draft); setDraft(null); }}
        onPointerCancel={() => setDraft(null)}
        role="slider" aria-label={`Position ${name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={shown}
      >
        <div className="slats" style={{ height: `${closed}%` }} />
        {!compact && <div className="pct num">{shown}%</div>}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button className="icon-btn" style={{ flex: 1, borderRadius: 16 }} onClick={() => call("cover", "open_cover", {}, id)} aria-label={`Ouvrir ${name}`}><ArrowUp /></button>
        <button className="icon-btn" style={{ flex: 1, borderRadius: 16 }} onClick={() => call("cover", "stop_cover", {}, id)} aria-label={`Arrêter ${name}`}><Square style={{ width: 16, height: 16 }} /></button>
        <button className="icon-btn" style={{ flex: 1, borderRadius: 16 }} onClick={() => call("cover", "close_cover", {}, id)} aria-label={`Fermer ${name}`}><ArrowDown /></button>
      </div>
      {!compact && (
        <div className="row" style={{ gap: 6 }}>
          {[25, 50, 75].map((p) => (
            <button key={p} className="chip" style={{ flex: 1, justifyContent: "center", padding: "8px 0" }} onClick={() => set(p)}>{p} %</button>
          ))}
        </div>
      )}
    </div>
  );
}

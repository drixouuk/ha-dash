import { useState } from "react";
import { Check, Copy, Pencil, RotateCcw, RotateCw, Undo2, WifiOff } from "lucide-react";
import { useCall, useEnt } from "@data";
import { COVERS, PLAN, ROOMS, type Plan as PlanT, type PlanDevice, type PlanPoint, type Room } from "@config";
import { IsoPlan, KIND, VUE_3D, VUE_DESSUS, lecture, zoneDe } from "../ui/IsoPlan";
import { RoomSheet } from "../ui/RoomSheet";
import { Sheet } from "../ui/Sheet";
import { Shutter } from "../ui/Shutter";
import { n1 } from "../util";

/**
 * Positions déplacées en mode édition : gardées dans ce navigateur le temps de
 * les recopier dans `config.local.ts`, qui reste la seule source de vérité.
 */
const CLE = "ha-dash.plan.positions";
function lirePositions(): Record<string, PlanPoint> {
  try {
    return JSON.parse(window.localStorage.getItem(CLE) ?? "{}");
  } catch {
    return {};
  }
}
function ecrirePositions(p: Record<string, PlanPoint>) {
  try {
    if (Object.keys(p).length) window.localStorage.setItem(CLE, JSON.stringify(p));
    else window.localStorage.removeItem(CLE);
  } catch {
    /* stockage indisponible : les positions vivent le temps de la page */
  }
}

/** Le tableau `devices` prêt à coller dans la configuration. */
function extrait(plan: PlanT, positions: Record<string, PlanPoint>) {
  const q = JSON.stringify;
  const lignes = plan.devices.map((d) => {
    const [x, y] = positions[d.id] ?? d.at;
    return `      { id: ${q(d.id)}, entity: ${q(d.entity)}, kind: ${q(d.kind)}, name: ${q(d.name)}, at: [${x}, ${y}] },`;
  });
  return `    devices: [\n${lignes.join("\n")}\n    ],`;
}

const ACTION: Record<string, string> = { heating: "En chauffe", idle: "Au repos", off: "Arrêt" };

function FicheAppareil({ d, onClose, onRoom }: { d: PlanDevice; onClose: () => void; onRoom?: () => void }) {
  const e = useEnt(d.entity);
  const call = useCall();
  const { text } = lecture(d.kind, e);
  const a = e?.attrs ?? {};
  const lignes: [string, string][] = [];
  if (e?.ok && (d.kind === "thermostat" || d.kind === "trv")) {
    lignes.push(["Mesure", `${n1(a.current_temperature != null ? Number(a.current_temperature) : null)}°`]);
    lignes.push(["Consigne", `${n1(a.temperature != null ? Number(a.temperature) : null)}°`]);
    lignes.push(["État", ACTION[String(a.hvac_action)] ?? String(a.hvac_action ?? e.state)]);
  } else if (e?.ok && d.kind === "media" && a.media_title) {
    lignes.push(["En cours", String(a.media_title)]);
  }
  return (
    <Sheet open onClose={onClose} title={d.name}>
      <div className="stack">
        <div className="row between wrap">
          <span className="badge">{(() => { const I = KIND[d.kind].Icon; return <I />; })()} {KIND[d.kind].label}</span>
          {e?.ok ? <span className="num" style={{ fontSize: 26 }}>{text}</span> : <span className="badge warn"><WifiOff /> Injoignable</span>}
        </div>
        {lignes.map(([k, v]) => (
          <div key={k} className="row between" style={{ padding: "4px 0", borderTop: "1px solid var(--line)" }}>
            <span className="sub">{k}</span><b>{v}</b>
          </div>
        ))}
        {d.kind === "cover" && (
          <div className="card" style={{ padding: 14 }}>
            <Shutter id={d.entity} name={COVERS.find((c) => c.id === d.entity)?.name ?? d.name} compact />
          </div>
        )}
        {d.kind === "light" && e?.ok && (
          <div className="row between">
            <b>{e.on ? "Allumée" : "Éteinte"}</b>
            <button className={`switch${e.on ? " on" : ""}`} onClick={() => call("light", "toggle", {}, d.entity)} aria-label="Allumer ou éteindre" aria-pressed={e.on} />
          </div>
        )}
        {d.kind === "trv" && <div className="sub" style={{ fontSize: 13 }}>La consigne de la tête est pilotée par le thermostat de la pièce : réglez-la depuis la fiche de la pièce.</div>}
        {onRoom && <button className="chip" style={{ justifySelf: "start" }} onClick={onRoom}>Ouvrir la pièce</button>}
        <div className="sub" style={{ fontSize: 12 }}>{d.entity}</div>
      </div>
    </Sheet>
  );
}

function Legende({ plan }: { plan: PlanT }) {
  const sortes = [...new Set(plan.devices.map((d) => d.kind))];
  return (
    <div className="row wrap" style={{ gap: 6 }} aria-label="Légende">
      {sortes.map((s) => { const { Icon, label } = KIND[s]; return <span key={s} className="badge"><Icon /> {label}</span>; })}
    </div>
  );
}

export default function Plan() {
  // Écran étroit (téléphone en portrait) : un quart de tour met la longueur du logement dans la hauteur.
  const etroit = window.innerWidth < 640;
  const [rot, setRot] = useState(etroit ? 78 : -12);
  const [mode, setMode] = useState<"3d" | "dessus">("3d");
  const [edition, setEdition] = useState(false);
  const [positions, setPositions] = useState<Record<string, PlanPoint>>(lirePositions);
  const [appareil, setAppareil] = useState<PlanDevice | null>(null);
  const [piece, setPiece] = useState<Room | null>(null);
  const [copie, setCopie] = useState<"ok" | "manuel" | null>(null);
  if (!PLAN) return null;
  const plan = PLAN;

  // En édition, vue de dessus droite : un glissé correspond exactement au sol.
  const vue = edition ? { ...VUE_DESSUS, rot: etroit ? 90 : 0 } : { ...(mode === "3d" ? VUE_3D : VUE_DESSUS), rot };
  const deplacer = (id: string, at: PlanPoint) => {
    setPositions((p) => { const n = { ...p, [id]: at }; ecrirePositions(n); return n; });
    setCopie(null);
  };
  const annuler = () => { setPositions({}); ecrirePositions({}); setCopie(null); };
  const texte = extrait(plan, positions);
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie("ok");
    } catch {
      // Presse-papiers refusé (page servie en http) : le texte reste à sélectionner.
      setCopie("manuel");
    }
  };
  const roomDe = (d: PlanDevice) => ROOMS.find((r) => r.id === zoneDe(plan, positions[d.id] ?? d.at)?.room);
  const deplaces = Object.keys(positions).length;

  return (
    <>
      <header className="head-page">
        <div><div className="eyebrow">Capteurs et appareils en direct</div><h1 className="h1">Plan</h1></div>
        <div className="row wrap" style={{ gap: 8 }}>
          {!edition && (
            <>
              <div className="seg" role="group" aria-label="Vue">
                <button className={mode === "3d" ? "on" : ""} onClick={() => setMode("3d")}>3D</button>
                <button className={mode === "dessus" ? "on" : ""} onClick={() => setMode("dessus")}>Dessus</button>
              </div>
              <button className="icon-btn" onClick={() => setRot((r) => r - 45)} aria-label="Tourner à gauche"><RotateCcw /></button>
              <button className="icon-btn" onClick={() => setRot((r) => r + 45)} aria-label="Tourner à droite"><RotateCw /></button>
            </>
          )}
          <button className={`chip${edition ? " on" : ""}`} onClick={() => setEdition((e) => !e)} aria-pressed={edition}>
            {edition ? <Check /> : <Pencil />} {edition ? "Terminer" : "Placer les appareils"}
          </button>
        </div>
      </header>

      {edition && (
        <div className="alert" role="status" style={{ marginBottom: 14 }}>
          <Pencil />
          <span>Glissez les repères à leur place. Les positions restent dans ce navigateur : copiez-les ensuite dans <b>src/config.local.ts</b> (bloc <b>PLAN.devices</b>) pour les rendre définitives.</span>
        </div>
      )}

      <section className="card" style={{ padding: "10px 6px" }}>
        <IsoPlan
          plan={plan} vue={vue} positions={positions} edition={edition}
          onRot={setRot} onMove={deplacer}
          onZone={(z) => setPiece(ROOMS.find((r) => r.id === z.room) ?? null)}
          onDevice={setAppareil}
        />
      </section>

      <div className="row between wrap section" style={{ marginTop: 14, gap: 10 }}>
        <Legende plan={plan} />
        {!edition && <span className="sub" style={{ fontSize: 12.5 }}>Glissez pour tourner · touchez une pièce ou un appareil</span>}
      </div>

      {edition && (
        <section className="card section" aria-label="Positions à recopier">
          <div className="row between wrap" style={{ marginBottom: 10 }}>
            <h2 className="h2">Positions · {deplaces} déplacé{deplaces > 1 ? "s" : ""}</h2>
            <div className="row" style={{ gap: 8 }}>
              <button className="chip" onClick={annuler} disabled={!deplaces}><Undo2 /> Annuler</button>
              <button className="chip on" onClick={copier}>{copie === "ok" ? <Check /> : <Copy />} {copie === "ok" ? "Copié" : "Copier"}</button>
            </div>
          </div>
          {copie === "manuel" && <div className="sub" style={{ fontSize: 13, marginBottom: 8 }}>Copie automatique refusée par le navigateur : sélectionnez le texte ci-dessous.</div>}
          <textarea
            readOnly value={texte} rows={8} onFocus={(e) => e.currentTarget.select()} aria-label="Bloc devices à coller"
            style={{ width: "100%", resize: "vertical", background: "rgba(0,0,0,.3)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 14, padding: 12, font: "12px/1.5 ui-monospace, monospace" }}
          />
        </section>
      )}

      {appareil && (
        <FicheAppareil
          d={appareil} onClose={() => setAppareil(null)}
          onRoom={roomDe(appareil) ? () => { setPiece(roomDe(appareil) ?? null); setAppareil(null); } : undefined}
        />
      )}
      <RoomSheet room={piece} onClose={() => setPiece(null)} />
    </>
  );
}

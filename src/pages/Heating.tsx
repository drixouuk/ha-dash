import { AlertTriangle, Flame, Minus, Plus, Sun } from "lucide-react";
import { useCall, useEnt, useHist } from "@data";
import { E, ROOMS } from "@config";
import { dureeEtatFinal, fmtDuration, n1 } from "../util";
import { HvacModes, RoomDial } from "../ui/RoomSheet";
import { PresenceBadge } from "../ui/Presence";
import { Timeline } from "../ui/Charts";

function Stepper({ entity, name }: { entity: string; name: string }) {
  const e = useEnt(entity);
  const call = useCall();
  if (!e) return null;
  const step = Number(e.attrs.step ?? 0.5), min = Number(e.attrs.min ?? 5), max = Number(e.attrs.max ?? 30);
  const set = (v: number) => call("input_number", "set_value", { value: Math.min(max, Math.max(min, v)) }, entity);
  return (
    <div className="row between" style={{ padding: "8px 0" }}>
      <span style={{ fontWeight: 600 }}>{name}</span>
      <div className="row" style={{ gap: 10 }}>
        <button className="icon-btn" style={{ width: 38, height: 38 }} onClick={() => set((e.num ?? min) - step)} aria-label={`Baisser ${name}`}><Minus /></button>
        <span className="num" style={{ fontSize: 22, minWidth: 64, textAlign: "center" }}>{n1(e.num)}°</span>
        <button className="icon-btn" style={{ width: 38, height: 38 }} onClick={() => set((e.num ?? min) + step)} aria-label={`Monter ${name}`}><Plus /></button>
      </div>
    </div>
  );
}

function ModeSwitch({ entity, name, hint }: { entity: string; name: string; hint: string }) {
  const e = useEnt(entity);
  const call = useCall();
  return (
    <div className="row between" style={{ padding: "10px 0" }}>
      <div><div style={{ fontWeight: 700 }}>{name}</div><div className="sub" style={{ fontSize: 12.5 }}>{hint}</div></div>
      <button className={`switch${e?.on ? " on" : ""}`} onClick={() => call("input_boolean", "toggle", {}, entity)} aria-label={name} aria-pressed={!!e?.on} />
    </div>
  );
}

function RoomHeat({ i }: { i: number }) {
  const room = ROOMS[i];
  const c = useEnt(room.climate);
  const heating = c?.attrs.hvac_action === "heating";
  return (
    <div className="card room" style={{ ["--c" as string]: room.color }}>
      <div className="row between wrap" style={{ position: "relative", marginBottom: 6 }}>
        <div className="row" style={{ gap: 8 }}><i className="dotc" /><b style={{ fontSize: 17 }}>{room.name}</b></div>
        <div className="row wrap" style={{ gap: 6, justifyContent: "flex-end" }}>
          {heating ? <span className="badge heat"><Flame /> En chauffe</span> : <span className="badge">Au repos</span>}
          <PresenceBadge entity={room.presence} />
        </div>
      </div>
      <RoomDial room={room.name} climate={room.climate} color={room.color} />
      <div style={{ display: "grid", justifyItems: "center", marginTop: 12 }}><HvacModes climate={room.climate} /></div>
    </div>
  );
}

function Stat({ i, max }: { i: number; max: number }) {
  const r = ROOMS[i];
  const d = useEnt(r.statDay), w = useEnt(r.statWeek);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "74px 1fr 120px", gap: 10, alignItems: "center" }}>
      <span className="row" style={{ gap: 8, fontWeight: 700, fontSize: 13.5 }}><i className="dotc" style={{ ["--c" as string]: r.color }} />{r.name}</span>
      <div className="tl-track"><b style={{ left: 0, width: `${Math.min(100, ((w?.num ?? 0) / max) * 100)}%`, background: r.color }} /></div>
      <span className="sub" style={{ fontSize: 12.5, fontWeight: 700, textAlign: "right" }}>{n1(d?.num)} h auj. · {n1(w?.num)} h</span>
    </div>
  );
}

export default function Heating() {
  const nest = useEnt(E.nest);
  // Quand l'orchestration Home Assistant pilote la production, elle réécrit la consigne du
  // Nest à chaque cycle : le cadran est alors grisé, plutôt que d'accepter un réglage aussitôt écrasé.
  // `E.boilerControl` nomme l'interrupteur qui l'indique (voir docs/ADAPTER.md) ; absent, le cadran reste actif.
  const pilotage = useEnt(E.boilerControl ?? "");
  const demand = useEnt(E.heatDemand);
  const rooms = useEnt(E.heatRooms);
  const solar = useEnt(E.solar);
  const w = ROOMS.map((r) => useEnt(r.statWeek)); // eslint-disable-line react-hooks/rules-of-hooks
  const maxW = Math.max(10, ...w.map((e) => e?.num ?? 0));
  const hist = useHist(ROOMS.map((r) => r.heating), 24);
  // Bandeau « la chaudière ne suit pas » : même diagnostic que l'automatisation
  // côté Home Assistant — une pièce demande de la chaleur depuis 30 minutes alors
  // que le thermostat principal reste au repos.
  const demandeHist = useHist([E.heatDemand], 1);
  const demandeDepuis = demand?.on ? dureeEtatFinal(demandeHist[E.heatDemand], "on") : 0;
  const chaudiereMuette =
    demand?.on === true && nest?.attrs.hvac_action === "idle" && demandeDepuis >= 30 * 60_000;

  return (
    <>
      <header className="head-page">
        <div><div className="eyebrow">Le Nest produit · les têtes demandent · HA orchestre</div><h1 className="h1">Chauffage</h1></div>
        {demand?.on ? <span className="badge heat" style={{ fontSize: 14, padding: "8px 14px" }}><Flame /> Chaudière en demande · {rooms?.state ?? 0} pièce(s)</span> : <span className="badge" style={{ fontSize: 14, padding: "8px 14px" }}>Chaudière au repos</span>}
      </header>

      {chaudiereMuette && (
        <div className="alert section" role="status">
          <AlertTriangle />
          <span>
            La chaudière ne suit pas : une pièce demande de la chaleur depuis {fmtDuration(demandeDepuis)} et le
            thermostat principal est au repos. Causes possibles : mode éco, ou consigne écrasée par le programme du
            thermostat.
          </span>
        </div>
      )}

      <div className="grid cols-3">
        {ROOMS.map((_, i) => <RoomHeat key={i} i={i} />)}
      </div>

      <div className="grid cols-2 section">
        <section className="card">
          <h2 className="h2" style={{ marginBottom: 6 }}>Modes</h2>
          {E.modes.map((m) => <ModeSwitch key={m.entity} entity={m.entity} name={m.name} hint={m.hint} />)}
          <div style={{ height: 1, background: "var(--line)", margin: "10px 0" }} />
          <div className="eyebrow">Températures de référence</div>
          {E.setpoints.map((s) => <Stepper key={s.entity} entity={s.entity} name={s.name} />)}
        </section>
        <section className="card">
          <div className="row between">
            <h2 className="h2">Chaudière · Nest</h2>
            <div className="row wrap" style={{ gap: 8 }}>
              {pilotage?.on && <span className="badge warn">Piloté par HA</span>}
              <span className="badge"><Sun /> Solaire {solar?.on ? "possible" : "non"}</span>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            {nest ? <RoomDial room="Nest" climate={E.nest} color="#9085e9" disabled={Boolean(pilotage?.on)} disabledReason="Piloté par Home Assistant" /> : <div className="sub">Nest introuvable</div>}
          </div>
        </section>
      </div>

      <section className="card section" aria-label="Périodes de chauffe">
        <div className="row between" style={{ marginBottom: 14 }}><h2 className="h2">Périodes de chauffe · 24 h</h2></div>
        <Timeline rows={ROOMS.map((r) => ({ name: r.name, color: r.color, points: hist[r.heating] }))} />
      </section>

      <section className="card section" aria-label="Statistiques">
        <div className="row between" style={{ marginBottom: 14 }}><h2 className="h2">Heures de chauffe · 7 jours</h2></div>
        <div className="stack">{ROOMS.map((_, i) => <Stat key={i} i={i} max={maxW} />)}</div>
      </section>
    </>
  );
}

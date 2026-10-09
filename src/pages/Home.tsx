import { useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, BedDouble, Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Droplets, Flame, Lightbulb, Monitor, Moon, PlaneTakeoff, Snowflake, Sofa, Sun, Wind } from "lucide-react";
import { useCall, useEnt } from "@data";
import { CITY, COVERS, E, OUTSIDE, ROOMS, USER_NAME, type Room } from "@config";
import { clock, fmtDuration, greeting, n1, useNow } from "../util";
import { usePrayers } from "../ui/prayer";
import { SunArc } from "../ui/SunArc";
import { RoomSheet } from "../ui/RoomSheet";

const ROOM_ICON = { sofa: Sofa, bed: BedDouble, desk: Monitor };
const WEATHER: Record<string, [string, typeof Sun]> = {
  sunny: ["Ensoleillé", Sun], "clear-night": ["Nuit claire", Moon], partlycloudy: ["Éclaircies", CloudSun], cloudy: ["Nuageux", Cloud],
  rainy: ["Pluie", CloudRain], pouring: ["Averses", CloudRain], snowy: ["Neige", Snowflake], fog: ["Brouillard", CloudFog],
  windy: ["Venteux", Wind], lightning: ["Orage", CloudLightning], "lightning-rainy": ["Orage", CloudLightning],
};

function Weather() {
  const w = useEnt(E.weather);
  if (!w) return null;
  const [label, Icon] = WEATHER[w.state] ?? [w.state, Cloud];
  return (
    <div className="row" style={{ gap: 12 }}>
      <Icon style={{ width: 34, height: 34, color: "var(--brass)", strokeWidth: 1.6 }} />
      <div>
        <div className="num" style={{ fontSize: 30, lineHeight: 1 }}>{n1(Number(w.attrs.temperature), 0)}°</div>
        <div className="sub" style={{ fontSize: 12.5, fontWeight: 600 }}>{label} · {n1(Number(w.attrs.humidity), 0)} %</div>
      </div>
    </div>
  );
}

function CoverSummary({ ids }: { ids: string[] }) {
  const ents = ids.map((id) => useEnt(id)); // eslint-disable-line react-hooks/rules-of-hooks
  const ok = ents.filter((e) => e?.ok);
  if (!ok.length) return <b>Injoignable</b>;
  const avg = Math.round(ok.reduce((a, e) => a + Number(e!.attrs.current_position ?? (e!.on ? 100 : 0)), 0) / ok.length);
  return <b>{avg === 100 ? "Ouverts" : avg === 0 ? "Fermés" : `${avg} %`}</b>;
}

function RoomCard({ room, onOpen }: { room: Room; onOpen: () => void }) {
  const temp = useEnt(room.temp);
  const hum = useEnt(room.hum);
  const clim = useEnt(room.climate);
  const Icon = ROOM_ICON[room.icon];
  const heating = clim?.attrs.hvac_action === "heating";
  return (
    <button className="card room tap" style={{ ["--c" as string]: room.color }} onClick={onOpen} aria-label={`Ouvrir ${room.name}`}>
      <div className="row between" style={{ position: "relative" }}>
        <div className="row" style={{ gap: 9 }}><Icon style={{ width: 20, height: 20 }} /><b style={{ fontSize: 16 }}>{room.name}</b></div>
        {heating ? <span className="badge heat"><Flame /> Chauffe</span> : <span className="badge">Au repos</span>}
      </div>
      <div className="row" style={{ alignItems: "flex-end", margin: "16px 0 14px", gap: 6 }}>
        <span className="num big">{n1(temp?.num)}</span><span className="num" style={{ fontSize: 24, paddingBottom: 6, color: "var(--muted)" }}>°C</span>
      </div>
      <div className="row" style={{ gap: 20 }}>
        <div className="kv"><span>Cible</span><b>{n1(Number(clim?.attrs.temperature))}°</b></div>
        <div className="kv"><span>Humidité</span><b>{n1(hum?.num, 0)} %</b></div>
        <div className="kv"><span>Volets</span><CoverSummary ids={room.covers} /></div>
      </div>
    </button>
  );
}

function Alerts() {
  const covers = COVERS.map((c) => ({ ...c, e: useEnt(c.id) })); // eslint-disable-line react-hooks/rules-of-hooks
  const bad = covers.filter((c) => !c.e || !c.e.ok);
  if (!bad.length) return null;
  return (
    <div className="alert" role="status">
      <AlertTriangle />
      <span>{bad.length === 1 ? `Le volet « ${bad[0].name} » ne répond plus.` : `${bad.length} volets ne répondent plus : ${bad.map((b) => b.name).join(", ")}.`}</span>
    </div>
  );
}

function Quick() {
  const call = useCall();
  const light = useEnt(E.light);
  const away = useEnt(E.modes[0].entity);
  const ids = COVERS.map((c) => c.id);
  return (
    <div className="scroll-x" aria-label="Actions rapides">
      <button className="chip" onClick={() => call("cover", "open_cover", {}, ids)}><ArrowUp /> Ouvrir les volets</button>
      <button className="chip" onClick={() => call("cover", "close_cover", {}, ids)}><ArrowDown /> Fermer les volets</button>
      <button className={`chip${light?.on ? " on" : ""}`} onClick={() => call("light", "toggle", {}, E.light)}><Lightbulb /> Lumière</button>
      <button className={`chip${away?.on ? " on" : ""}`} onClick={() => call("input_boolean", "toggle", {}, E.modes[0].entity)}><PlaneTakeoff /> Absence</button>
    </div>
  );
}

export default function Home() {
  const now = useNow(15_000);
  const { rows, next, nextAt } = usePrayers(now);
  const month = useEnt(E.islamicMonth);
  const out = { t: useEnt(OUTSIDE.temp), h: useEnt(OUTSIDE.hum) };
  const demand = useEnt(E.heatDemand);
  const rooms = useEnt(E.heatRooms);
  const solar = useEnt(E.solar);
  const light = useEnt(E.light);
  const call = useCall();
  const [open, setOpen] = useState<Room | null>(null);

  return (
    <>
      <header className="head-page">
        <div>
          <div className="eyebrow">{now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</div>
          <h1 className="h1">{greeting(now)}, {USER_NAME}</h1>
        </div>
        <Weather />
      </header>

      <section className="card hero" aria-label="Prochaine prière">
        <div className="hero-grid">
          <div>
            <div className="eyebrow">Prochaine prière · {CITY}</div>
            <div className="row" style={{ gap: 12, alignItems: "baseline", marginTop: 4 }}>
              <span className="h1" style={{ fontSize: "clamp(34px,7vw,54px)" }}>{next?.label ?? "–"}</span>
              <span className="num" style={{ fontSize: 26, color: "var(--brass)" }}>{clock(nextAt)}</span>
            </div>
            <div className="sub" style={{ fontWeight: 600 }}>{nextAt ? `dans ${fmtDuration(nextAt.getTime() - now.getTime())}` : ""}{month?.ok ? ` · ${month.state}` : ""}</div>
          </div>
          <div><SunArc rows={rows} now={now} nextKey={next?.key} /></div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(6, 1fr)", gap: 4, textAlign: "center", marginTop: 6 }}>
          {rows.map((r) => (
            <div key={r.key} style={{ padding: "7px 0", borderRadius: 14, background: r.key === next?.key ? "rgba(242,180,65,.16)" : "transparent" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: r.key === next?.key ? "var(--brass)" : "var(--faint)", letterSpacing: ".04em", textTransform: "uppercase" }}>{r.key === "sunrise" ? "Lever" : r.label}</div>
              <div className="num" style={{ fontSize: 16 }}>{clock(r.time)}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="stack" style={{ marginTop: 16 }}>
        <Quick />
        <Alerts />
      </div>

      <section className="section" aria-label="Pièces">
        <div className="head"><h2 className="h2">Pièces</h2><span className="sub" style={{ fontSize: 13 }}>Touchez une pièce pour la régler</span></div>
        <div className="grid cols-3">
          {ROOMS.map((r) => <RoomCard key={r.id} room={r} onOpen={() => setOpen(r)} />)}
        </div>
      </section>

      <section className="section" aria-label="Maison">
        <div className="grid cols-3">
          <div className="card">
            <div className="eyebrow">Extérieur</div>
            <div className="row" style={{ alignItems: "flex-end", margin: "8px 0 4px", gap: 4 }}>
              <span className="num stat">{n1(out.t?.num)}°</span>
              <span className="row sub" style={{ gap: 4, paddingBottom: 5, marginLeft: 8, fontWeight: 700 }}><Droplets style={{ width: 15, height: 15 }} />{n1(out.h?.num, 0)} %</span>
            </div>
          </div>
          <div className="card">
            <div className="row between"><div className="eyebrow">Chaudière</div>{demand?.on ? <span className="badge heat"><Flame /> Demande</span> : <span className="badge">Au repos</span>}</div>
            <div className="row" style={{ gap: 22, marginTop: 10 }}>
              <div className="kv"><span>Pièces</span><b>{rooms?.state ?? "–"}</b></div>
              <div className="kv"><span>Apport solaire</span><b>{solar?.on ? "Possible" : "Non"}</b></div>
            </div>
          </div>
          <div className="card">
            <div className="row between"><div className="eyebrow">Éclairage</div><button className={`switch${light?.on ? " on" : ""}`} onClick={() => call("light", "toggle", {}, E.light)} aria-label="Allumer ou éteindre" aria-pressed={!!light?.on} /></div>
            <div className="row" style={{ marginTop: 14, gap: 12 }}>
              <Lightbulb style={{ width: 20, height: 20, color: light?.on ? "var(--brass)" : "var(--faint)" }} />
              <input type="range" min={1} max={255} disabled={!light?.on} value={Number(light?.attrs.brightness ?? 0)} aria-label="Luminosité"
                onChange={(e) => call("light", "turn_on", { brightness: Number(e.target.value) }, E.light)} style={{ flex: 1, accentColor: "#f2b441" }} />
            </div>
          </div>
        </div>
      </section>

      <RoomSheet room={open} onClose={() => setOpen(null)} />
    </>
  );
}

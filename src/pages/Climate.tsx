import { useState } from "react";
import { Droplets, Sprout, Sun } from "lucide-react";
import { useEnt, useHist } from "@data";
import { E, OUTSIDE, ROOMS } from "@config";
import { n1 } from "../util";
import { Spark } from "../ui/Spark";
import { Heatmap } from "../ui/Charts";

const SERIES = [...ROOMS.map((r) => ({ id: r.id, name: r.name, color: r.color, temp: r.temp, hum: r.hum })), { id: "ext", name: OUTSIDE.name, color: OUTSIDE.color, temp: OUTSIDE.temp, hum: OUTSIDE.hum }];

function Tile({ s, kind, points }: { s: (typeof SERIES)[number]; kind: "temp" | "hum"; points: any }) {
  const e = useEnt(kind === "temp" ? s.temp : s.hum);
  return (
    <div className="card">
      <div className="row between"><span className="row" style={{ gap: 8, fontWeight: 700 }}><i className="dotc" style={{ ["--c" as string]: s.color }} />{s.name}</span>
        <span className="num" style={{ fontSize: 30 }}>{kind === "temp" ? `${n1(e?.num)}°` : `${n1(e?.num, 0)} %`}</span></div>
      <div style={{ marginTop: 10 }}><Spark points={points} color={s.color} unit={kind === "temp" ? "°C" : "%"} decimals={kind === "temp" ? 1 : 0} /></div>
    </div>
  );
}

function Plants() {
  const soil = useEnt(E.plant.soil);
  const lux = useEnt(E.plant.lux);
  const h = useHist([E.plant.soil, E.plant.lux], 24);
  const v = soil?.num ?? 0;
  const status = !soil?.ok ? "Capteur injoignable" : v < 25 ? "Sol sec · à arroser" : v > 65 ? "Sol détrempé" : "Humidité correcte";
  const R = 52, L = 2 * Math.PI * R * 0.75;
  return (
    <div className="grid cols-2">
      <div className="card">
        <div className="row between"><span className="row" style={{ gap: 8, fontWeight: 700 }}><Sprout style={{ width: 18, height: 18 }} /> Humidité du sol</span><span className={`badge${v < 25 ? " warn" : ""}`}>{status}</span></div>
        <div style={{ position: "relative", width: 150, margin: "10px auto 0" }}>
          <svg viewBox="0 0 130 130" style={{ width: "100%", transform: "rotate(135deg)" }} role="img" aria-label={`Humidité du sol ${v} %`}>
            <circle cx="65" cy="65" r={R} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${L} 999`} />
            <circle cx="65" cy="65" r={R} fill="none" stroke="#199e70" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(L * Math.min(100, v)) / 100} 999`} style={{ transition: "stroke-dasharray .6s" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeContent: "center", textAlign: "center" }}><span className="num" style={{ fontSize: 38 }}>{n1(soil?.num, 0)}%</span></div>
        </div>
        <div style={{ marginTop: 4 }}><Spark points={h[E.plant.soil]} color="#199e70" unit="%" decimals={0} height={60} /></div>
      </div>
      <div className="card">
        <div className="row between"><span className="row" style={{ gap: 8, fontWeight: 700 }}><Sun style={{ width: 18, height: 18 }} /> Luminosité</span><span className="num" style={{ fontSize: 30 }}>{n1(lux?.num, 0)} lx</span></div>
        <div style={{ marginTop: 16 }}><Spark points={h[E.plant.lux]} color="#c98500" unit="lx" decimals={0} height={110} /></div>
      </div>
    </div>
  );
}

export default function Climate() {
  const [kind, setKind] = useState<"temp" | "hum">("temp");
  const [sel, setSel] = useState("salon");
  const h = useHist(SERIES.map((s) => s[kind]), 24);
  const cur = SERIES.find((s) => s.id === sel)!;
  const h7 = useHist([cur.temp], 168);
  return (
    <>
      <header className="head-page">
        <div><div className="eyebrow">24 dernières heures</div><h1 className="h1">Climat</h1></div>
        <div className="seg" role="group" aria-label="Mesure">
          <button className={kind === "temp" ? "on" : ""} onClick={() => setKind("temp")}>Température</button>
          <button className={kind === "hum" ? "on" : ""} onClick={() => setKind("hum")}><Droplets style={{ width: 13, height: 13, verticalAlign: -2, marginRight: 4 }} />Humidité</button>
        </div>
      </header>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))" }}>
        {SERIES.map((s) => <Tile key={s.id + kind} s={s} kind={kind} points={h[s[kind]]} />)}
      </div>

      <section className="card section" aria-label="Carte thermique">
        <div className="row between wrap" style={{ marginBottom: 14, gap: 10 }}>
          <h2 className="h2">Carte thermique · 7 jours</h2>
          <div className="scroll-x">
            {SERIES.map((s) => (
              <button key={s.id} className={`chip${sel === s.id ? " on" : ""}`} style={{ padding: "7px 12px" }} onClick={() => setSel(s.id)}>{s.name}</button>
            ))}
          </div>
        </div>
        <Heatmap key={sel} points={h7[cur.temp]} color={cur.color} unit="°C" />
      </section>

      <section className="section"><div className="head"><h2 className="h2">Plantes</h2></div><Plants /></section>
    </>
  );
}

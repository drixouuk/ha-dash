import { useCall, useEnt } from "@data";
import { SETTINGS, type Setting, type SettingsGroup } from "@config";
import { EditeurPlages } from "../ui/Plages";
import { Stepper } from "../ui/Stepper";

/**
 * Réglages exposés par les automatisations de Home Assistant, groupe par
 * groupe. Le dashboard ne fait que lire et écrire ces entités : la logique de
 * chauffage reste dans Home Assistant, qui relit les valeurs à chaque exécution.
 */

function Interrupteur({ r }: { r: Setting }) {
  const e = useEnt(r.entity);
  const call = useCall();
  if (!e) return null;
  return (
    <div className="setting">
      <div className="setting-txt"><div className="setting-nom">{r.name}</div>{r.hint && <div className="sub setting-aide">{r.hint}</div>}</div>
      <button
        className={`switch${e.on ? " on" : ""}`} disabled={!e.ok} aria-label={r.name} aria-pressed={e.on}
        onClick={() => call("input_boolean", e.on ? "turn_off" : "turn_on", {}, r.entity)}
      />
    </div>
  );
}

/** Heure seule (`input_datetime` sans date) : écrite en « HH:MM:SS ». */
function Heure({ r }: { r: Setting }) {
  const e = useEnt(r.entity);
  const call = useCall();
  if (!e) return null;
  const valeur = e.ok ? e.state.slice(0, 5) : "";
  return (
    <div className="setting">
      <div className="setting-txt"><div className="setting-nom">{r.name}</div>{r.hint && <div className="sub setting-aide">{r.hint}</div>}</div>
      <input
        type="time" className="champ-heure" value={valeur} disabled={!e.ok} aria-label={r.name}
        onChange={(ev) => ev.target.value && call("input_datetime", "set_datetime", { time: `${ev.target.value}:00` }, r.entity)}
      />
    </div>
  );
}

function Reglage({ r }: { r: Setting }) {
  const domaine = r.entity.split(".")[0];
  if (domaine === "input_boolean") return <Interrupteur r={r} />;
  if (domaine === "input_datetime") return <Heure r={r} />;
  return <Stepper entity={r.entity} name={r.name} hint={r.hint} min={r.min} max={r.max} step={r.step} unit={r.unit} />;
}

function Groupe({ g }: { g: SettingsGroup }) {
  return (
    <section className="card reglages-groupe" aria-label={g.title}>
      <h2 className="h2">{g.title}</h2>
      {g.hint && <div className="sub" style={{ fontSize: 13, marginTop: 4 }}>{g.hint}</div>}
      <div style={{ marginTop: 8 }}>
        {g.schedules ? <EditeurPlages /> : g.items?.map((r) => <Reglage key={r.entity} r={r} />)}
      </div>
    </section>
  );
}

export default function Settings() {
  if (!SETTINGS) return <div className="sub">Aucun réglage dans la configuration (champ SETTINGS).</div>;
  // Les plages occupent toute la largeur ; les autres groupes se rangent en colonnes.
  const blocs: SettingsGroup[][] = [];
  for (const g of SETTINGS.groups) {
    const dernier = blocs[blocs.length - 1];
    if (g.schedules || !dernier || dernier[0].schedules) blocs.push([g]);
    else dernier.push(g);
  }
  return (
    <>
      <header className="head-page">
        <div><div className="eyebrow">Chauffage et volets · enregistrés dans Home Assistant</div><h1 className="h1">Réglages</h1></div>
      </header>
      {blocs.map((b, i) => (
        <div key={i} className={b[0].schedules ? "section" : "reglages section"}>
          {b.map((g) => <Groupe key={g.title} g={g} />)}
        </div>
      ))}
      {SETTINGS.constants?.length ? (
        <details className="card section reglages-avance">
          <summary><b>Avancé</b> <span className="sub">· constantes techniques, en lecture seule</span></summary>
          <div className="sub" style={{ fontSize: 13, margin: "10px 0 6px" }}>
            Les modifier peut dégrader la régulation ou user la chaudière : elles ne se changent que dans Home Assistant.
          </div>
          {SETTINGS.constants.map((c) => (
            <div key={c.label} className="setting"><div className="setting-nom">{c.label}</div><div className="sub" style={{ textAlign: "right" }}>{c.value}</div></div>
          ))}
        </details>
      ) : null}
    </>
  );
}

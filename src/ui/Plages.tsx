import { useMemo, useState } from "react";
import { Check, Copy, Lock, Plus, Trash2, Undo2 } from "lucide-react";
import { useAdmin, useEnt, usePlages } from "@data";
import { ROOMS, type Room } from "@config";
import { JOURS, type Creneau, type Jour, type Semaine } from "../data/types";
import { useNow } from "../util";

const NOMS: Record<Jour, string> = {
  monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi", thursday: "Jeudi", friday: "Vendredi", saturday: "Samedi", sunday: "Dimanche",
};
const SEMAINE_TRAVAIL: Jour[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];

/** « HH:MM:SS » → minutes depuis minuit (« 24:00:00 » = 1440). */
const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const hm = (t: string) => t.slice(0, 5);
/** Champ `<input type="time">` : minuit en fin de créneau s'écrit 00:00 et vaut 24:00. */
const versHA = (v: string, fin: boolean) => (fin && v === "00:00" ? "24:00:00" : `${v}:00`);
const versChamp = (t: string) => (t.startsWith("24:") ? "00:00" : hm(t));

/** Problème d'un jour : créneau vide ou à l'envers, ou chevauchement. */
function probleme(creneaux: Creneau[]): string | null {
  const tries = [...creneaux].sort((a, b) => minutes(a.from) - minutes(b.from));
  for (const c of tries) if (minutes(c.to) <= minutes(c.from)) return `${hm(c.from)}–${hm(c.to)} : la fin doit suivre le début`;
  for (let i = 1; i < tries.length; i++) {
    if (minutes(tries[i].from) < minutes(tries[i - 1].to)) return `${hm(tries[i - 1].from)}–${hm(tries[i - 1].to)} et ${hm(tries[i].from)}–${hm(tries[i].to)} se chevauchent`;
  }
  return null;
}

function Piste({ creneaux, maintenant }: { creneaux: Creneau[]; maintenant?: number }) {
  return (
    <div className="plage-piste" aria-hidden="true">
      {[6, 12, 18].map((h) => <i key={h} className="plage-graduation" style={{ left: `${(h / 24) * 100}%` }} />)}
      {creneaux.map((c, i) => (
        <b key={i} style={{ left: `${(minutes(c.from) / 1440) * 100}%`, width: `${Math.max(0.5, ((minutes(c.to) - minutes(c.from)) / 1440) * 100)}%` }} />
      ))}
      {maintenant != null && <i className="plage-maintenant" style={{ left: `${(maintenant / 1440) * 100}%` }} />}
    </div>
  );
}

function PlagesPiece({ room, admin }: { room: Room; admin: boolean }) {
  const { semaine, erreur, enregistrer } = usePlages(room.schedule!, room.scheduleId);
  const etat = useEnt(room.schedule!);
  const now = useNow(60_000);
  const [brouillon, setBrouillon] = useState<Semaine | null>(null);
  const [ouvert, setOuvert] = useState<Jour | null>(null);
  const [envoi, setEnvoi] = useState<"repos" | "envoi" | "ok" | string>("repos");
  const vue = brouillon ?? semaine;
  const aujourdhui = JOURS[(now.getDay() + 6) % 7];
  const problemes = useMemo(() => (vue ? Object.fromEntries(JOURS.map((j) => [j, probleme(vue[j])])) : {}) as Record<Jour, string | null>, [vue]);
  const valide = JOURS.every((j) => !problemes[j]);

  if (erreur) return <div className="alert">Plages illisibles : {erreur}</div>;
  if (!vue) return <div className="sub" style={{ padding: "12px 0" }}>Lecture des plages…</div>;

  const modifier = (jour: Jour, f: (c: Creneau[]) => Creneau[]) => {
    setBrouillon({ ...vue, [jour]: f(vue[jour]) });
    setEnvoi("repos");
  };
  const copier = (de: Jour, vers: Jour[]) => {
    const suivant = { ...vue };
    for (const j of vers) suivant[j] = vue[de].map((c) => ({ ...c }));
    setBrouillon(suivant);
    setEnvoi("repos");
  };
  const ajouter = (jour: Jour) => modifier(jour, (c) => {
    const fin = c.length ? Math.max(...c.map((x) => minutes(x.to))) : 360;
    const de = Math.min(fin + 60, 1380), a = Math.min(de + 120, 1440);
    const t = (m: number) => (m >= 1440 ? "24:00:00" : `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00`);
    return [...c, { from: t(de), to: t(a) }];
  });
  const sauver = async () => {
    if (!brouillon) return;
    setEnvoi("envoi");
    try {
      // Créneaux remis dans l'ordre : Home Assistant les attend triés.
      const trie = Object.fromEntries(JOURS.map((j) => [j, [...brouillon[j]].sort((a, b) => minutes(a.from) - minutes(b.from))])) as Semaine;
      await enregistrer(trie);
      setBrouillon(null);
      setEnvoi("ok");
    } catch (e) {
      setEnvoi(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="stack" style={{ gap: 6 }}>
      <span className={`badge${etat?.on ? " heat" : ""}`} style={{ justifySelf: "start", marginBottom: 4 }}>{etat?.on ? "En plage confort" : "Hors plage · éco"}</span>
      {/* graduations : même grille que les lignes, pour tomber pile sur les frises */}
      <div className="plage-ligne plage-tete" aria-hidden="true">
        <span />
        <div className="plage-echelle sub">{[0, 6, 12, 18, 24].map((h) => <span key={h} style={{ left: `${(h / 24) * 100}%` }}>{h} h</span>)}</div>
        <span />
      </div>
      {JOURS.map((j) => (
        <div key={j} className={`plage-jour${ouvert === j ? " ouvert" : ""}`}>
          <button
            className="plage-ligne" onClick={() => setOuvert(ouvert === j ? null : j)} aria-expanded={ouvert === j}
            aria-label={`${NOMS[j]} : ${vue[j].length ? vue[j].map((c) => `${hm(c.from)} à ${hm(c.to)}`).join(", ") : "aucune plage"}`}
          >
            <span className={`plage-nom${j === aujourdhui ? " auj" : ""}`}>{NOMS[j].slice(0, 3)}</span>
            <Piste creneaux={vue[j]} maintenant={j === aujourdhui ? now.getHours() * 60 + now.getMinutes() : undefined} />
            <span className="plage-resume">{vue[j].length ? vue[j].map((c) => `${hm(c.from)}–${hm(c.to)}`).join(" · ") : "Éco toute la journée"}</span>
          </button>
          {ouvert === j && admin && (
            <div className="plage-edition">
              {vue[j].map((c, i) => (
                <div key={i} className="row" style={{ gap: 8 }}>
                  <input type="time" className="champ-heure" value={versChamp(c.from)} aria-label="Début"
                    onChange={(ev) => ev.target.value && modifier(j, (l) => l.map((x, k) => (k === i ? { ...x, from: versHA(ev.target.value, false) } : x)))} />
                  <span className="sub">→</span>
                  <input type="time" className="champ-heure" value={versChamp(c.to)} aria-label="Fin (00:00 = minuit)"
                    onChange={(ev) => ev.target.value && modifier(j, (l) => l.map((x, k) => (k === i ? { ...x, to: versHA(ev.target.value, true) } : x)))} />
                  <button className="icon-btn" style={{ width: 38, height: 38 }} onClick={() => modifier(j, (l) => l.filter((_, k) => k !== i))} aria-label="Supprimer ce créneau"><Trash2 /></button>
                </div>
              ))}
              {problemes[j] && <div className="plage-erreur">{problemes[j]}</div>}
              <div className="row wrap" style={{ gap: 8 }}>
                <button className="chip" onClick={() => ajouter(j)}><Plus /> Créneau</button>
                <button className="chip" onClick={() => copier(j, SEMAINE_TRAVAIL.filter((x) => x !== j))}><Copy /> Copier du lundi au vendredi</button>
                <button className="chip" onClick={() => copier(j, JOURS.filter((x) => x !== j))}><Copy /> Copier sur tous les jours</button>
              </div>
            </div>
          )}
        </div>
      ))}
      {!admin && (
        <div className="sub row" style={{ gap: 8, fontSize: 13, marginTop: 6 }}>
          <Lock style={{ width: 15, height: 15, flex: "none" }} /> Lecture seule : modifier les plages demande un compte administrateur de Home Assistant.
        </div>
      )}
      {admin && (brouillon || envoi !== "repos") && (
        <div className="row between wrap" style={{ gap: 8, marginTop: 8 }}>
          <span className="sub" style={{ fontSize: 13 }}>
            {envoi === "envoi" ? "Enregistrement…" : envoi === "ok" ? "Enregistré dans Home Assistant." : envoi !== "repos" ? `Refusé : ${envoi}` : !valide ? "À corriger avant d'enregistrer." : "Modifications non enregistrées."}
          </span>
          {brouillon && (
            <div className="row" style={{ gap: 8 }}>
              <button className="chip" onClick={() => { setBrouillon(null); setEnvoi("repos"); }}><Undo2 /> Annuler</button>
              <button className="chip on" disabled={!valide || envoi === "envoi"} onClick={() => void sauver()}><Check /> Enregistrer</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Plages de confort des pièces, une pièce à la fois. */
export function EditeurPlages() {
  const pieces = ROOMS.filter((r) => r.schedule);
  const [id, setId] = useState(pieces[0]?.id);
  const admin = useAdmin();
  const room = pieces.find((r) => r.id === id) ?? pieces[0];
  if (!room) return <div className="sub">Aucune pièce n'a de plage dans la configuration.</div>;
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="seg" role="group" aria-label="Pièce" style={{ alignSelf: "start", justifySelf: "start" }}>
        {pieces.map((r) => <button key={r.id} className={r.id === room.id ? "on" : ""} onClick={() => setId(r.id)}>{r.name}</button>)}
      </div>
      {/* clé : changer de pièce repart d'un état propre (brouillon, jour ouvert) */}
      <PlagesPiece key={room.id} room={room} admin={admin === true} />
    </div>
  );
}

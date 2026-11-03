/** Vue simplifiée d'une entité Home Assistant, identique en mode réel et en mode démo. */
export interface Ent {
  id: string;
  state: string;
  attrs: Record<string, any>;
  /** état converti en nombre (null si non numérique) */
  num: number | null;
  /** false si unavailable / unknown */
  ok: boolean;
  /** state === "on" (ou ouvert / en chauffe) */
  on: boolean;
}

export interface Point {
  t: number; // timestamp ms
  v: number | null; // valeur numérique
  s: string; // état brut
}

/** Jours d'une plage hebdomadaire, dans l'ordre de Home Assistant. */
export const JOURS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type Jour = (typeof JOURS)[number];
/** Créneau d'une plage : heures « HH:MM:SS », `to` peut valoir « 24:00:00 ». */
export type Creneau = { from: string; to: string };
export type Semaine = Record<Jour, Creneau[]>;

/**
 * Plage hebdomadaire d'une entité `schedule` : `semaine` est null tant qu'elle
 * n'est pas lue ; `enregistrer` remplace toute la semaine (compte administrateur).
 */
export interface Plages {
  semaine: Semaine | null;
  erreur: string | null;
  enregistrer: (semaine: Semaine) => Promise<void>;
}

export type Call = (domain: string, service: string, data?: Record<string, unknown>, entityId?: string | string[]) => void;

/**
 * État de la liaison avec Home Assistant.
 * « reconnexion » couvre aussi la toute première connexion : l'interface se
 * contente alors d'un indicateur discret, car les valeurs affichées pendant une
 * coupure sont celles d'avant. Le mode démonstration est toujours « connecte ».
 */
export type Liaison = "connecte" | "reconnexion" | "erreur";

export function toEnt(id: string, state: string, attrs: Record<string, any> = {}): Ent {
  const n = Number(state);
  return {
    id,
    state,
    attrs,
    num: state !== "" && Number.isFinite(n) ? n : null,
    ok: state !== "unavailable" && state !== "unknown",
    on: state === "on" || state === "open" || state === "heat" || state === "heating",
  };
}

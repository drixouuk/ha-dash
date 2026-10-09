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

export type Call = (domain: string, service: string, data?: Record<string, unknown>, entityId?: string | string[]) => void;

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

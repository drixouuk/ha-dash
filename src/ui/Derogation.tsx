import { Hand, X } from "lucide-react";
import { useCall, useEnt } from "@data";
import { clock } from "../util";

/**
 * Dérogation en cours d'une pièce : le minuteur (`timer.*`) est actif tant
 * qu'un réglage manuel prime sur les plages. On dit jusqu'à quand, et l'on
 * permet de l'annuler (`timer.cancel`) pour revenir tout de suite au programme.
 * Rien n'est affiché quand le minuteur est au repos ou absent de la configuration.
 */
export function Derogation({ entity, compact = false }: { entity?: string; compact?: boolean }) {
  const e = useEnt(entity ?? "");
  const call = useCall();
  if (!entity || !e || (e.state !== "active" && e.state !== "paused")) return null;
  const fin = e.attrs.finishes_at ? new Date(String(e.attrs.finishes_at)) : null;
  const texte = e.state === "paused" ? "Réglage manuel en pause" : `Réglage manuel jusqu'à ${clock(fin)}`;
  return (
    <div className={`derog${compact ? " compact" : ""}`} role="status">
      <Hand />
      <span>{texte}</span>
      <button className="derog-x" onClick={() => call("timer", "cancel", {}, entity)} aria-label="Annuler le réglage manuel et revenir au programme">
        <X /> Annuler
      </button>
    </div>
  );
}

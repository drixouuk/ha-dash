import { UserCheck, UserX, WifiOff } from "lucide-react";
import { useEnt } from "@data";

/**
 * État d'occupation d'une pièce, affiché sur les cartes : il explique pourquoi
 * une pièce peut être en consigne éco.
 *
 * Un capteur **indisponible ou inconnu** est annoncé comme tel : le confondre
 * avec « personne » ferait croire à une pièce vide alors qu'on ne sait rien.
 * Sans capteur (réglage absent de `ROOMS[].presence`), rien n'est affiché.
 */
export function PresenceBadge({ entity }: { entity?: string }) {
  const entite = useEnt(entity ?? "");
  if (!entity) return null;
  if (!entite || !entite.ok) {
    return (
      <span className="badge warn" title="Capteur de présence indisponible : on ne sait pas si la pièce est occupée">
        <WifiOff /> Présence ?
      </span>
    );
  }
  if (entite.on) {
    return (
      <span className="badge" style={{ color: "var(--ok)" }} title="Présence détectée : la pièce est occupée">
        <UserCheck /> Présence
      </span>
    );
  }
  return (
    <span className="badge" title="Aucune présence détectée : la pièce peut passer en consigne éco">
      <UserX /> Vide
    </span>
  );
}

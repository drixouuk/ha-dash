import {
  callService as appelerService,
  createConnection,
  createLongLivedTokenAuth,
  getAuth,
  subscribeEntities,
  type AuthData,
  type Connection as ConnexionHA,
  type HassEntities,
  type UnsubscribeFunc,
} from "home-assistant-js-websocket";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { toEnt, type Call, type Ent, type Liaison, type Point } from "./types";

/* ------------------------------------------------------------------ réglages */

const HA_URL = (import.meta.env.VITE_HA_URL as string | undefined) || window.location.origin;
const HA_TOKEN = (import.meta.env.VITE_HA_TOKEN as string | undefined) || undefined;

/** Clé de stockage local des jetons. Le jeton fourni au build reste hors du bundle. */
const CLE_JETONS = "ha-dash:tokens";

const chargerJetons = async (): Promise<AuthData | null | undefined> => {
  try {
    const brut = window.localStorage.getItem(CLE_JETONS);
    return brut ? (JSON.parse(brut) as AuthData) : undefined;
  } catch {
    return undefined;
  }
};

const enregistrerJetons = (donnees: AuthData | null): void => {
  try {
    if (donnees) window.localStorage.setItem(CLE_JETONS, JSON.stringify(donnees));
    else window.localStorage.removeItem(CLE_JETONS);
  } catch {
    // Stockage refusé (navigation privée) : la session ne survivra pas au rechargement.
  }
};

/* -------------------------------------------------------- authentification */

/**
 * Connexion déjà ouverte par l'interface Home Assistant.
 *
 * Le dashboard est encadré par une iframe **de même origine** (voir
 * `public/panel.js`) : `window.top.hassConnection` donne alors la connexion
 * authentifiée du frontend, donc aucun jeton à saisir et aucune reconnexion.
 * C'est le cas normal depuis la barre latérale de Home Assistant.
 */
async function connexionHeritee(): Promise<ConnexionHA | null> {
  try {
    const haut = window.top as (Window & { hassConnection?: Promise<{ conn?: ConnexionHA }> }) | null;
    if (!haut || haut === window || !haut.hassConnection) return null;
    const { conn } = await haut.hassConnection;
    return conn ?? null;
  } catch {
    return null; // iframe d'une autre origine : pas d'héritage possible
  }
}

/**
 * Ouvre la connexion, dans cet ordre :
 *  1. connexion héritée de l'interface Home Assistant (iframe) ;
 *  2. jeton d'accès longue durée fourni au build (`VITE_HA_TOKEN`) ;
 *  3. jetons enregistrés dans le navigateur, sinon formulaire de connexion de
 *     Home Assistant (que `getAuth` affiche en redirigeant vers la page de login).
 *
 * `propre` distingue une connexion créée ici (que l'on peut fermer) d'une
 * connexion héritée, qui appartient au frontend de Home Assistant.
 */
async function ouvrirConnexion(): Promise<{ conn: ConnexionHA; propre: boolean }> {
  const heritee = await connexionHeritee();
  if (heritee) return { conn: heritee, propre: false };

  const auth = HA_TOKEN
    ? await createLongLivedTokenAuth(HA_URL, HA_TOKEN)
    : await getAuth({ hassUrl: HA_URL, saveTokens: enregistrerJetons, loadTokens: chargerJetons });

  return { conn: await createConnection({ auth }), propre: true };
}

function messageErreur(e: unknown): string {
  const brut = e instanceof Error ? e.message : String(e);
  if (brut.includes("ERR_INVALID_AUTH")) return "Authentification refusée par Home Assistant.";
  if (brut.includes("ERR_CANNOT_CONNECT")) return "Home Assistant est injoignable.";
  if (brut.includes("ERR_CONNECTION_LOST")) return "Connexion perdue avec Home Assistant.";
  return brut;
}

/* ------------------------------------------------------------------ entités */

let entites: HassEntities = {};
const abonnes = new Set<() => void>();
let arreterEntites: UnsubscribeFunc | null = null;

const prevenir = () => {
  abonnes.forEach((abonne) => abonne());
};

/**
 * Une **seule** souscription d'entités pour toute l'application : la librairie
 * envoie l'état complet puis les changements, et se réabonne d'elle-même après
 * une reconnexion. Chaque composant lit ensuite ce store via `useEnt`.
 */
function demarrerEntites(conn: ConnexionHA): void {
  arreterEntites?.();
  arreterEntites = subscribeEntities(conn, (suivantes) => {
    entites = suivantes;
    prevenir();
  });
}

function souscrireEntites(abonne: () => void): UnsubscribeFunc {
  abonnes.add(abonne);
  return () => {
    abonnes.delete(abonne);
  };
}

/** Référence stable tant que les entités n'ont pas changé (exigence de `useSyncExternalStore`). */
const lireEntites = () => entites;

/* ----------------------------------------------------------------- contexte */

type Statut = "connexion" | "connecte" | "reconnexion" | "erreur";

interface EtatConnexion {
  conn: ConnexionHA | null;
  statut: Statut;
  erreur: string | null;
}

const ContexteConnexion = createContext<EtatConnexion>({ conn: null, statut: "connexion", erreur: null });

/** Connexion et état de connexion, pour les hooks de ce module. */
const useConnexion = () => useContext(ContexteConnexion);

/**
 * État de la liaison, pour l'indicateur de l'interface. La reconnexion est gérée
 * par la librairie : on se contente de la rendre visible, puisque les valeurs
 * affichées pendant une coupure sont celles d'avant.
 */
export function useLiaison(): Liaison {
  const { statut } = useConnexion();
  return statut === "connecte" ? "connecte" : statut === "erreur" ? "erreur" : "reconnexion";
}

/**
 * Ouvre la connexion et n'affiche les enfants qu'une fois celle-ci établie
 * (même écran d'attente qu'auparavant). Une fois connecté, l'application reste
 * affichée même si la liaison tombe : la librairie retente en arrière-plan.
 */
export function Connection({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<EtatConnexion>({ conn: null, statut: "connexion", erreur: null });

  useEffect(() => {
    let vivant = true;
    let connexionPropre: ConnexionHA | null = null;

    const poserStatut = (statut: Statut, erreur: string | null = null) => {
      if (vivant) setEtat((precedent) => ({ ...precedent, statut, erreur }));
    };

    void (async () => {
      try {
        const { conn, propre } = await ouvrirConnexion();
        if (!vivant) {
          // Déconnecté pendant l'ouverture (StrictMode en développement) : on ne
          // laisse pas traîner de socket derrière soi.
          if (propre) conn.close();
          return;
        }
        if (propre) connexionPropre = conn;

        demarrerEntites(conn);
        setEtat({ conn, statut: "connecte", erreur: null });

        // La reconnexion est gérée par la librairie, et `subscribeEntities` se
        // réabonne seul après un retour : on ne fait ici que suivre l'état.
        conn.addEventListener("ready", () => poserStatut("connecte"));
        conn.addEventListener("disconnected", () => poserStatut("reconnexion"));
        conn.addEventListener("reconnect-error", () => poserStatut("erreur", "Reconnexion impossible."));
      } catch (e) {
        poserStatut("erreur", messageErreur(e));
      }
    })();

    return () => {
      vivant = false;
      arreterEntites?.();
      arreterEntites = null;
      // Une connexion héritée appartient au frontend de Home Assistant : on ne la ferme jamais.
      connexionPropre?.close();
      connexionPropre = null;
    };
  }, []);

  if (!etat.conn) {
    return <div className="boot">{etat.erreur ?? "Connexion à Home Assistant…"}</div>;
  }

  return <ContexteConnexion.Provider value={etat}>{children}</ContexteConnexion.Provider>;
}

/* -------------------------------------------------------------------- hooks */

export function useEnt(id: string): Ent | null {
  const brutes = useSyncExternalStore(souscrireEntites, lireEntites);
  const brute = brutes[id];
  return useMemo(
    () =>
      brute ? toEnt(id, String(brute.state), (brute.attributes ?? {}) as Record<string, any>) : null,
    [brute, id],
  );
}

export function useCall(): Call {
  const { conn } = useConnexion();
  return useCallback<Call>(
    (domain, service, data, entityId) => {
      if (!conn) {
        console.warn("[HA_DASH] service ignoré, aucune connexion :", domain, service);
        return;
      }
      void appelerService(
        conn,
        domain,
        service,
        data ?? {},
        entityId ? { entity_id: entityId } : undefined,
      ).catch((e: unknown) => console.warn("[HA_DASH] service en échec :", domain, service, e));
    },
    [conn],
  );
}

/* ----------------------------------------------------------------- historique */

const cache = new Map<string, { at: number; data: Record<string, Point[]> }>();

/** Forme compacte renvoyée par l'API d'historique (`minimal_response`). */
type EtatHistorique = { s?: string; state?: string; lu?: number; lc?: number };

/**
 * Historique par l'API **WebSocket** de Home Assistant (`history/stream`).
 *
 * Ne jamais repasser par `/api/history/period` : une requête REST non
 * authentifiée est comptée comme une tentative de connexion par Home Assistant
 * et cinq d'entre elles suffisent à bannir l'IP de l'appareil.
 *
 * Le flux envoie d'abord tout l'historique demandé, puis **une seule** nouvelle
 * mesure par message : les points sont donc accumulés par entité (fenêtre
 * glissante), et non remplacés. Après une reconnexion le flux repart de zéro : les
 * points déjà reçus sont ignorés (voir plus bas).
 */
export function useHist(ids: string[], hours = 24): Record<string, Point[]> {
  const { conn } = useConnexion();
  const cle = `${hours}|${ids.join(",")}`;
  const [data, setData] = useState<Record<string, Point[]>>(() => cache.get(cle)?.data ?? {});

  useEffect(() => {
    if (!conn) return;

    let vivant = true;
    let desabonner: (() => void) | undefined;
    const debut = new Date(Date.now() - hours * 3600_000).toISOString();
    const cumul = new Map<string, Point[]>();

    conn
      .subscribeMessage<{ states?: Record<string, EtatHistorique[]> }>(
        (message) => {
          if (!vivant) return;
          const limite = Date.now() - hours * 3600_000;
          for (const [id, etats] of Object.entries(message?.states ?? {})) {
            const liste = cumul.get(id) ?? [];
            for (const etat of etats ?? []) {
              const t = (etat.lc ?? etat.lu ?? 0) * 1000;
              // Après une reconnexion, la librairie se réabonne et le serveur renvoie tout
              // l'historique : on ignore les points déjà connus (ordre chronologique strict),
              // et l'on garde ceux qui comblent la coupure.
              if (liste.length && t <= liste[liste.length - 1].t) continue;
              const valeur = Number(etat.s ?? etat.state);
              liste.push({
                t,
                v: Number.isFinite(valeur) ? valeur : null,
                s: String(etat.s ?? etat.state ?? ""),
              });
            }
            // fenêtre glissante : on garde un point avant la limite (valeur de départ)
            let premier = 0;
            while (premier + 1 < liste.length && liste[premier + 1].t < limite) premier++;
            cumul.set(id, premier ? liste.slice(premier) : liste);
          }
          const points = Object.fromEntries(cumul);
          cache.set(cle, { at: Date.now(), data: points });
          setData(points);
        },
        {
          type: "history/stream",
          entity_ids: ids,
          start_time: debut,
          minimal_response: true,
          significant_changes_only: true,
          no_attributes: true,
        },
      )
      .then((f) => {
        // Démonté avant la réponse du serveur : on ferme l'abonnement tout de suite,
        // sinon il resterait ouvert (et recevrait des mesures) jusqu'au rechargement.
        if (vivant) desabonner = f;
        else f();
      })
      .catch((e) => {
        console.warn("[HA_DASH] historique indisponible :", e);
      });

    return () => {
      vivant = false;
      desabonner?.();
    };
    // `cle` reprend hours et ids : inutile de dépendre du tableau `ids`, qui est
    // recréé à chaque rendu et relancerait l'abonnement sans arrêt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conn, cle, hours]);

  return data;
}

import { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useLiaison } from "@data";
import { Sky } from "./Sky";
import { Blinds, Flame, House, MoonStar, Thermometer, WifiOff } from "lucide-react";

const TABS = [
  { to: "/", label: "Accueil", Icon: House },
  { to: "/chauffage", label: "Chauffage", Icon: Flame },
  { to: "/volets", label: "Volets", Icon: Blinds },
  { to: "/climat", label: "Climat", Icon: Thermometer },
  { to: "/prieres", label: "Prières", Icon: MoonStar },
];

export function Layout() {
  const { pathname } = useLocation();
  // Indicateur discret : les valeurs affichées pendant une coupure sont celles
  // d'avant, mieux vaut le dire que de laisser croire qu'elles sont à jour.
  const liaison = useLiaison();
  // Remonter en haut à chaque changement d'onglet. Le corps de l'effet doit être
  // un bloc : `() => window.scrollTo(...)` renvoie la valeur de scrollTo, et
  // depuis Chrome 145 environ `window.scrollTo()` renvoie une Promise — React la
  // prend alors pour une fonction de nettoyage et démonte tout l'arbre
  // (« destroy is not a function »).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return (
    <div className="app">
      <Sky />
      {liaison !== "connecte" && (
        <div
          className="alert" role="status"
          style={{ position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 50, width: "max-content", maxWidth: "calc(100% - 24px)" }}
        >
          <WifiOff />
          <span>{liaison === "erreur" ? "Connexion à Home Assistant perdue" : "Reconnexion à Home Assistant…"}</span>
        </div>
      )}
      <nav className="dock" aria-label="Navigation principale">
        {TABS.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

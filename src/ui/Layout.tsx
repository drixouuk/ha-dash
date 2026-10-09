import { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Sky } from "./Sky";
import { Blinds, Flame, House, MoonStar, Thermometer } from "lucide-react";

const TABS = [
  { to: "/", label: "Accueil", Icon: House },
  { to: "/chauffage", label: "Chauffage", Icon: Flame },
  { to: "/volets", label: "Volets", Icon: Blinds },
  { to: "/climat", label: "Climat", Icon: Thermometer },
  { to: "/prieres", label: "Prières", Icon: MoonStar },
];

export function Layout() {
  const { pathname } = useLocation();
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

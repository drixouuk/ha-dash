import { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { CanvasTexture, SRGBColorSpace } from "three";
import { useEnt } from "@data";
import type { PlanDevice } from "@config";
import type { Ent } from "../../data/types";

/**
 * Appareils modélisés d'après leur forme réelle, en mètres, dans un repère
 * local : X le long du mur, Y vers le haut, +Z vers la pièce. L'origine est
 * posée au sol, au droit de l'appareil ; `y` est la hauteur de son centre.
 */

const BLANC = "#f2f1ee";
const CHAUFFE = "#ff5a1f";

/** Profondeur (cm) d'un appareil fixé au mur, et hauteur par défaut de son centre (cm). */
export function encombrement(d: PlanDevice): { profondeur: number; z: number; mural: boolean } {
  switch (d.kind) {
    case "trv": return { profondeur: 10, z: d.z ?? 45, mural: true };
    case "thermostat": return { profondeur: 3, z: d.z ?? 150, mural: true };
    case "sensor": return { profondeur: 2.5, z: d.z ?? 140, mural: true };
    case "presence": return { profondeur: 4, z: d.z ?? 210, mural: true };
    case "contact": return { profondeur: 2, z: d.z ?? 200, mural: true };
    case "media":
      if (d.model === "tv") return { profondeur: 6, z: d.z ?? 110, mural: true };
      if (d.model === "soundbar") return { profondeur: 40, z: d.z ?? 45, mural: true };
      return { profondeur: 14, z: d.z ?? 0, mural: false };
    case "hub": return { profondeur: 22, z: d.z ?? 75, mural: false };
    case "light": return { profondeur: 0, z: d.z ?? 232, mural: false };
    case "plant": return { profondeur: 0, z: 0, mural: false };
    case "cover": return { profondeur: 0, z: 200, mural: false };
  }
}

function Radiateur({ e, y }: { e: Ent | null; y: number }) {
  const chauffe = e?.attrs.hvac_action === "heating";
  return (
    <group position={[0, y, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.6, 0.06]} />
        <meshStandardMaterial color={BLANC} roughness={0.45} emissive={CHAUFFE} emissiveIntensity={chauffe ? 0.35 : 0} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[-0.36 + i * 0.09, 0, 0.032]} castShadow>
          <boxGeometry args={[0.025, 0.56, 0.012]} />
          <meshStandardMaterial color="#e4e2dd" roughness={0.5} emissive={CHAUFFE} emissiveIntensity={chauffe ? 0.3 : 0} />
        </mesh>
      ))}
      {/* tête thermostatique SONOFF TRVZB : cylindre blanc, bague grise, voyant */}
      <group position={[0.45, 0.18, 0.02]}>
        <mesh castShadow><cylinderGeometry args={[0.028, 0.028, 0.09, 24]} /><meshStandardMaterial color={BLANC} roughness={0.35} /></mesh>
        <mesh position={[0, -0.05, 0]}><cylinderGeometry args={[0.03, 0.03, 0.012, 24]} /><meshStandardMaterial color="#9aa0aa" metalness={0.4} roughness={0.4} /></mesh>
        <mesh position={[0, 0.02, 0.028]}><sphereGeometry args={[0.005, 8, 8]} /><meshStandardMaterial color={chauffe ? CHAUFFE : "#444"} emissive={chauffe ? CHAUFFE : "#000"} emissiveIntensity={2} /></mesh>
      </group>
    </group>
  );
}

function Nest({ e, y }: { e: Ent | null; y: number }) {
  const chauffe = e?.attrs.hvac_action === "heating";
  return (
    <group position={[0, y, 0]}>
      <mesh rotation-x={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.042, 0.042, 0.03, 40]} />
        <meshStandardMaterial color="#d6d8dc" metalness={0.9} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0, 0.0155]}>
        <circleGeometry args={[0.036, 40]} />
        <meshStandardMaterial color="#05070c" emissive={chauffe ? "#ff6a2a" : "#1f3a8a"} emissiveIntensity={e?.ok ? 0.9 : 0} roughness={0.1} />
      </mesh>
    </group>
  );
}

function Sonde({ y }: { y: number }) {
  // SONOFF SNZB-02D : boîtier carré blanc à écran
  return (
    <group position={[0, y, 0]}>
      <RoundedBox args={[0.062, 0.062, 0.02]} radius={0.006} castShadow><meshStandardMaterial color={BLANC} roughness={0.4} /></RoundedBox>
      <mesh position={[0, 0.004, 0.0105]}><planeGeometry args={[0.046, 0.036]} /><meshStandardMaterial color="#c9d2c4" emissive="#c9d2c4" emissiveIntensity={0.15} roughness={0.6} /></mesh>
    </group>
  );
}

function Presence({ e, y }: { e: Ent | null; y: number }) {
  // SONOFF SNZB-06P : petit cube blanc, lentille radar sombre, voyant d'occupation
  return (
    <group position={[0, y, 0]}>
      <RoundedBox args={[0.07, 0.07, 0.035]} radius={0.008} castShadow><meshStandardMaterial color={BLANC} roughness={0.4} /></RoundedBox>
      <mesh position={[0, 0.004, 0.018]}><circleGeometry args={[0.018, 32]} /><meshStandardMaterial color="#1c1f26" roughness={0.15} /></mesh>
      <mesh position={[0.024, -0.024, 0.018]}><circleGeometry args={[0.004, 12]} /><meshStandardMaterial color={e?.on ? "#4ade9a" : "#333"} emissive={e?.on ? "#4ade9a" : "#000"} emissiveIntensity={2.5} /></mesh>
    </group>
  );
}

function Contact({ e, y }: { e: Ent | null; y: number }) {
  return (
    <group position={[0, y, 0]}>
      <mesh position={[-0.03, 0, 0]} castShadow><boxGeometry args={[0.045, 0.016, 0.012]} /><meshStandardMaterial color={BLANC} /></mesh>
      <mesh position={[e?.on ? 0.07 : 0.022, 0, 0]} castShadow><boxGeometry args={[0.03, 0.012, 0.01]} /><meshStandardMaterial color={BLANC} /></mesh>
    </group>
  );
}

/** Image d'écran allumé : dégradé façon interface de lecteur. */
function useEcran() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 144;
    const g = c.getContext("2d")!;
    const fond = g.createLinearGradient(0, 0, 256, 144);
    fond.addColorStop(0, "#1b2a6b"); fond.addColorStop(0.55, "#5a2d82"); fond.addColorStop(1, "#d0643a");
    g.fillStyle = fond; g.fillRect(0, 0, 256, 144);
    g.fillStyle = "rgba(255,255,255,.12)";
    for (let i = 0; i < 5; i++) g.fillRect(16 + i * 46, 96, 38, 30);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, []);
}

function Tele({ e, y }: { e: Ent | null; y: number }) {
  const ecran = useEcran();
  const allumee = e?.ok && !["off", "standby", "unavailable", "unknown"].includes(e.state);
  return (
    <group position={[0, y, 0]}>
      <mesh castShadow><boxGeometry args={[1.23, 0.71, 0.035]} /><meshStandardMaterial color="#0d0e12" metalness={0.3} roughness={0.35} /></mesh>
      <mesh position={[0, 0.005, 0.0181]}>
        <planeGeometry args={[1.19, 0.665]} />
        {allumee
          ? <meshStandardMaterial map={ecran} emissiveMap={ecran} emissive="#ffffff" emissiveIntensity={e?.state === "playing" ? 0.9 : 0.35} roughness={0.2} />
          : <meshStandardMaterial color="#04050a" roughness={0.08} metalness={0.2} />}
      </mesh>
    </group>
  );
}

function BarreDeSon({ y }: { y: number }) {
  // Sonos Beam posée sur un meuble TV quand elle est en hauteur
  return (
    <group>
      {y > 0.2 && (
        <mesh position={[0, (y - 0.04) / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, y - 0.04, 0.4]} />
          <meshStandardMaterial color="#6e4f37" roughness={0.7} />
        </mesh>
      )}
      <RoundedBox args={[0.65, 0.069, 0.1]} radius={0.025} position={[0, y, 0.05]} castShadow>
        <meshStandardMaterial color="#1a1a1c" roughness={0.85} />
      </RoundedBox>
    </group>
  );
}

function Enceinte({ y }: { y: number }) {
  return (
    <RoundedBox args={[0.12, 0.16, 0.12]} radius={0.02} position={[0, y + 0.08, 0]} castShadow>
      <meshStandardMaterial color="#1a1a1c" roughness={0.8} />
    </RoundedBox>
  );
}

function Passerelle({ e, y }: { e: Ent | null; y: number }) {
  // SLZB-06 : petit boîtier sombre et son antenne, sur une console
  return (
    <group>
      <mesh position={[0, (y - 0.01) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.4, y - 0.01, 0.22]} />
        <meshStandardMaterial color="#5c4331" roughness={0.75} />
      </mesh>
      <mesh position={[0, y + 0.0125, 0]} castShadow><boxGeometry args={[0.1, 0.025, 0.08]} /><meshStandardMaterial color="#2b2f3a" roughness={0.5} /></mesh>
      <mesh position={[0.04, y + 0.08, -0.03]} castShadow><cylinderGeometry args={[0.005, 0.006, 0.12, 8]} /><meshStandardMaterial color="#1b1d22" /></mesh>
      <mesh position={[-0.03, y + 0.026, 0.041]}><circleGeometry args={[0.003, 8]} /><meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={e?.on ? 3 : 0} /></mesh>
    </group>
  );
}

function Suspension({ e, y }: { e: Ent | null; y: number }) {
  const on = e?.on === true;
  const lum = on ? Math.max(0.25, Number(e?.attrs.brightness ?? 255) / 255) : 0;
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.003, 0.003, 0.2, 6]} /><meshStandardMaterial color="#222" /></mesh>
      <mesh position={[0, 0.02, 0]} castShadow>
        <coneGeometry args={[0.14, 0.12, 32, 1, true]} />
        <meshStandardMaterial color="#f5f1e8" roughness={0.6} side={2} emissive="#ffd38a" emissiveIntensity={on ? 0.25 * lum : 0} />
      </mesh>
      <mesh position={[0, -0.03, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={on ? "#fff4d6" : "#d8d8d8"} emissive="#ffcf7a" emissiveIntensity={on ? 3 * lum : 0} />
      </mesh>
      {on && <pointLight position={[0, -0.1, 0]} color="#ffd9a0" intensity={2.5 * lum} distance={4.5} decay={1.6} />}
    </group>
  );
}

function Plante() {
  return (
    <group>
      <mesh position={[0, 0.13, 0]} castShadow receiveShadow><cylinderGeometry args={[0.14, 0.1, 0.26, 24]} /><meshStandardMaterial color="#b4643c" roughness={0.85} /></mesh>
      {[[0, 0.42, 0, 0.17], [0.09, 0.36, 0.05, 0.12], [-0.08, 0.37, -0.04, 0.13], [0.02, 0.56, -0.02, 0.11]].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow><icosahedronGeometry args={[r, 1]} /><meshStandardMaterial color={i % 2 ? "#3f8f4f" : "#2f7a43"} roughness={0.8} flatShading /></mesh>
      ))}
    </group>
  );
}

/** Objet 3D d'un appareil, dans son repère local (origine au sol). */
export function Objet({ d }: { d: PlanDevice }) {
  const e = useEnt(d.entity);
  const y = encombrement(d).z / 100;
  switch (d.kind) {
    case "trv": return <Radiateur e={e} y={y} />;
    case "thermostat": return <Nest e={e} y={y} />;
    case "sensor": return <Sonde y={y} />;
    case "presence": return <Presence e={e} y={y} />;
    case "contact": return <Contact e={e} y={y} />;
    case "media": return d.model === "tv" ? <Tele e={e} y={y} /> : d.model === "soundbar" ? <BarreDeSon y={y} /> : <Enceinte y={y} />;
    case "hub": return <Passerelle e={e} y={y} />;
    case "light": return <Suspension e={e} y={y} />;
    case "plant": return <Plante />;
    case "cover": return null; // dessiné par la fenêtre qui porte ce volet
  }
}

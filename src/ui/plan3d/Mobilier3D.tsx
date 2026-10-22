import { RoundedBox } from "@react-three/drei";
import type { PlanFurniture, PlanKitchenModule } from "@config";

const MUR = "#cdd1d8"; // même teinte que les murs de la scène

/**
 * Mobilier de la vue 3D, en mètres, dans un repère local : X = largeur, Y vers
 * le haut, +Z = façade (vers la pièce), origine au sol au centre du meuble.
 */

const m = (cm: number) => cm / 100;
const CHENE = "#b98b5e";
const BLANC = "#f1efe9";

type Bloc = { p: [number, number, number]; s: [number, number, number]; c: string; r?: number; mt?: number };
function Blocs({ blocs }: { blocs: Bloc[] }) {
  return (
    <>
      {blocs.map(({ p, s, c, r = 0.7, mt = 0 }, i) => (
        <mesh key={i} position={p} castShadow receiveShadow>
          <boxGeometry args={s} />
          <meshStandardMaterial color={c} roughness={r} metalness={mt} />
        </mesh>
      ))}
    </>
  );
}

/** Quatre pieds fins aux coins d'un plateau. */
const pieds = (w: number, d: number, h: number, c: string, e = 0.04): Bloc[] =>
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => ({ p: [sx * (w / 2 - e), h / 2, sz * (d / 2 - e)], s: [e, h, e], c }));

function Canape({ w, d, color = "#8d9096" }: { w: number; d: number; color?: string }) {
  const bras = 0.18, assise = 0.42, dos = 0.2;
  const coussins = Math.max(2, Math.round((w - 2 * bras) / 0.75));
  const lc = (w - 2 * bras) / coussins;
  return (
    <group>
      <RoundedBox args={[w, assise - 0.08, d]} radius={0.03} position={[0, 0.08 + (assise - 0.08) / 2, 0]} castShadow receiveShadow><meshStandardMaterial color={color} roughness={1} /></RoundedBox>
      <RoundedBox args={[w, 0.42, dos]} radius={0.05} position={[0, assise + 0.17, -d / 2 + dos / 2]} castShadow><meshStandardMaterial color={color} roughness={1} /></RoundedBox>
      {[-1, 1].map((sx) => (
        <RoundedBox key={sx} args={[bras, 0.24, d]} radius={0.05} position={[sx * (w / 2 - bras / 2), assise + 0.06, 0]} castShadow><meshStandardMaterial color={color} roughness={1} /></RoundedBox>
      ))}
      {Array.from({ length: coussins }, (_, i) => (
        <RoundedBox key={i} args={[lc - 0.02, 0.13, d - dos - 0.04]} radius={0.04} position={[-w / 2 + bras + lc * (i + 0.5), assise + 0.06, dos / 2]} castShadow><meshStandardMaterial color={color} roughness={1} emissive="#ffffff" emissiveIntensity={0.03} /></RoundedBox>
      ))}
      <Blocs blocs={pieds(w, d, 0.08, "#2a2a2a", 0.05)} />
    </group>
  );
}

function Table({ w, d, h, color = CHENE }: { w: number; d: number; h: number; color?: string }) {
  return <Blocs blocs={[{ p: [0, h - 0.02, 0], s: [w, 0.04, d], c: color, r: 0.55 }, ...pieds(w, d, h - 0.04, color, 0.05)]} />;
}

function Lit({ w, d }: { w: number; d: number }) {
  const sommier = 0.32, matelas = 0.22;
  return (
    <group>
      <Blocs blocs={[
        { p: [0, sommier / 2, 0], s: [w + 0.04, sommier, d + 0.02], c: "#8a6a4f" },
        { p: [0, 0.55, -d / 2 + 0.03], s: [w + 0.08, 1.1, 0.06], c: "#8a6a4f" },
      ]} />
      <RoundedBox args={[w, matelas, d - 0.06]} radius={0.04} position={[0, sommier + matelas / 2, 0.02]} castShadow receiveShadow><meshStandardMaterial color="#f4f1ea" roughness={0.95} /></RoundedBox>
      {/* couette sur les deux tiers du lit, oreillers à la tête */}
      <RoundedBox args={[w + 0.04, 0.06, d * 0.68]} radius={0.025} position={[0, sommier + matelas + 0.02, d / 2 - d * 0.34]} castShadow><meshStandardMaterial color="#c9b8a6" roughness={1} /></RoundedBox>
      {[-1, 1].map((sx) => (
        <RoundedBox key={sx} args={[w / 2 - 0.1, 0.12, 0.38]} radius={0.05} position={[sx * w / 4, sommier + matelas + 0.06, -d / 2 + 0.3]} castShadow><meshStandardMaterial color="#ffffff" roughness={1} /></RoundedBox>
      ))}
    </group>
  );
}

function Chevet({ w, d, h }: { w: number; d: number; h: number }) {
  return <Blocs blocs={[
    { p: [0, h / 2 + 0.05, 0], s: [w, h - 0.1, d], c: CHENE },
    { p: [0, h * 0.62, d / 2 + 0.002], s: [w - 0.04, 0.004, 0.004], c: "#5c4331" },
    { p: [0, h * 0.78, d / 2 + 0.01], s: [0.08, 0.012, 0.015], c: "#9aa0aa", mt: 0.8, r: 0.3 },
    ...pieds(w, d, 0.1, "#5c4331", 0.03),
  ]} />;
}

function Armoire({ w, d, h, doors }: { w: number; d: number; h: number; doors?: number }) {
  const portes = doors ?? Math.max(2, Math.round(w / 0.5));
  const lp = w / portes;
  return <Blocs blocs={[
    { p: [0, h / 2, 0], s: [w, h, d], c: BLANC, r: 0.5 },
    ...Array.from({ length: portes - 1 }, (_, i): Bloc => ({ p: [-w / 2 + lp * (i + 1), h / 2, d / 2 + 0.002], s: [0.006, h - 0.04, 0.004], c: "#bdb7ad" })),
    ...Array.from({ length: portes }, (_, i): Bloc => ({ p: [-w / 2 + lp * (i + 0.5) + (i % 2 ? -1 : 1) * (lp / 2 - 0.05), 1.1, d / 2 + 0.015], s: [0.012, 0.3, 0.02], c: "#9aa0aa", mt: 0.8, r: 0.3 })),
  ]} />;
}

function Frigo({ w, d, h }: { w: number; d: number; h: number }) {
  return <Blocs blocs={[
    { p: [0, h / 2, 0], s: [w, h, d], c: "#d9dcdf", r: 0.3, mt: 0.55 },
    { p: [0, 1.2, d / 2 + 0.002], s: [w - 0.02, 0.006, 0.004], c: "#7d828a" },
    { p: [w / 2 - 0.06, 1.45, d / 2 + 0.02], s: [0.02, 0.4, 0.025], c: "#9aa0aa", mt: 0.8, r: 0.25 },
    { p: [w / 2 - 0.06, 0.95, d / 2 + 0.02], s: [0.02, 0.3, 0.025], c: "#9aa0aa", mt: 0.8, r: 0.25 },
  ]} />;
}

const BAS = 0.87, PLAN = 0.04, SOCLE = 0.1, HAUT_BAS = 1.45, HAUT_H = 0.7, HAUT_P = 0.35;

/** Façade d'un module bas selon sa fonction. */
function facade(mod: PlanKitchenModule, x: number, w: number, d: number): Bloc[] {
  const z = d / 2 + 0.003, h = BAS - SOCLE, yc = SOCLE + h / 2;
  const poignee = (y: number, l = w * 0.5): Bloc => ({ p: [x, y, z + 0.012], s: [l, 0.012, 0.018], c: "#9aa0aa", mt: 0.8, r: 0.3 });
  switch (mod.type) {
    case "oven":
      return [
        { p: [x, SOCLE + 0.66 + 0.06, z], s: [w - 0.02, 0.1, 0.006], c: "#1b1d22", r: 0.3 },
        { p: [x, SOCLE + 0.36, z], s: [w - 0.04, 0.5, 0.008], c: "#101114", r: 0.08, mt: 0.3 },
        poignee(SOCLE + 0.64, w * 0.7),
      ];
    case "washer":
      return [
        { p: [x, yc, z], s: [w - 0.01, h - 0.01, 0.006], c: "#f7f7f5", r: 0.35 },
        { p: [x, SOCLE + 0.36, z + 0.006], s: [0.36, 0.36, 0.01], c: "#2a2d33", r: 0.15, mt: 0.4 },
        { p: [x, SOCLE + 0.36, z + 0.012], s: [0.26, 0.26, 0.01], c: "#5a6270", r: 0.05, mt: 0.6 },
        { p: [x + w / 4, BAS - 0.07, z + 0.006], s: [w * 0.4, 0.06, 0.006], c: "#c9ccd2" },
      ];
    case "dishwasher":
      return [{ p: [x, yc, z], s: [w - 0.01, h - 0.01, 0.006], c: BLANC, r: 0.45 }, { p: [x, BAS - 0.06, z + 0.004], s: [w - 0.03, 0.05, 0.004], c: "#2a2d33" }, poignee(BAS - 0.13)];
    default:
      return [{ p: [x, yc, z], s: [w - 0.006, h - 0.006, 0.006], c: BLANC, r: 0.45 }, poignee(BAS - 0.08)];
  }
}

function Cuisine({ w, d, modules }: { w: number; d: number; modules: readonly PlanKitchenModule[] }) {
  const blocs: Bloc[] = [];
  let x = -w / 2;
  for (const mod of modules) {
    const lw = m(mod.w), cx = x + lw / 2;
    // caisson (l'électroménager a son propre corps, même encombrement)
    blocs.push({ p: [cx, SOCLE + (BAS - SOCLE) / 2, -0.01], s: [lw - 0.004, BAS - SOCLE, d - 0.02], c: "#e6e2da" });
    blocs.push(...facade(mod, cx, lw, d - 0.02));
    if (mod.upper) {
      blocs.push({ p: [cx, HAUT_BAS + HAUT_H / 2, -d / 2 + HAUT_P / 2], s: [lw - 0.004, HAUT_H, HAUT_P], c: BLANC, r: 0.45 });
      blocs.push({ p: [cx, HAUT_BAS + 0.06, -d / 2 + HAUT_P + 0.012], s: [lw * 0.5, 0.012, 0.018], c: "#9aa0aa", mt: 0.8, r: 0.3 });
    }
    x += lw;
  }
  return <Blocs blocs={[
    ...blocs,
    { p: [0, SOCLE / 2, -0.04], s: [w, SOCLE, d - 0.1], c: "#2b2e35" },
    { p: [0, BAS + PLAN / 2, 0.01], s: [w, PLAN, d + 0.02], c: "#4a4a50", r: 0.35 },
  ]} />;
}

function Baignoire({ w, d }: { w: number; d: number }) {
  const h = 0.55, bord = 0.07;
  return (
    <group>
      <RoundedBox args={[w, h, d]} radius={0.03} position={[0, h / 2, 0]} castShadow receiveShadow><meshStandardMaterial color="#fbfbfa" roughness={0.18} /></RoundedBox>
      {/* cuve : creux plus sombre, eau légèrement bleutée au fond */}
      <RoundedBox args={[w - 2 * bord, 0.02, d - 2 * bord]} radius={0.01} position={[0, h + 0.001, 0]}><meshStandardMaterial color="#d7e1e7" roughness={0.1} /></RoundedBox>
      <mesh position={[-w / 2 + 0.12, h + 0.12, -d / 2 + 0.05]} castShadow><cylinderGeometry args={[0.012, 0.012, 0.22, 12]} /><meshStandardMaterial color="#c9ccd2" metalness={0.9} roughness={0.2} /></mesh>
      <mesh position={[-w / 2 + 0.12, h + 0.22, -d / 2 + 0.11]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.012, 0.012, 0.13, 12]} /><meshStandardMaterial color="#c9ccd2" metalness={0.9} roughness={0.2} /></mesh>
    </group>
  );
}

/** WC suspendu : bâti-support en coffrage contre le mur, plaque de chasse, cuvette. */
function Toilettes({ w, d }: { w: number; d: number }) {
  return (
    <group>
      <Blocs blocs={[
        { p: [0, 0.55, -d / 2 + 0.09], s: [w + 0.2, 1.1, 0.18], c: MUR, r: 0.9 },
        { p: [0, 1.0, -d / 2 + 0.183], s: [0.24, 0.16, 0.008], c: "#ffffff", r: 0.25 },
        { p: [-0.05, 1.0, -d / 2 + 0.19], s: [0.09, 0.11, 0.006], c: "#e3e5e8", r: 0.2 },
        { p: [0.05, 1.0, -d / 2 + 0.19], s: [0.09, 0.11, 0.006], c: "#e3e5e8", r: 0.2 },
      ]} />
      <RoundedBox args={[w, 0.24, d - 0.2]} radius={0.08} position={[0, 0.3, 0.1]} castShadow receiveShadow><meshStandardMaterial color="#fbfbfa" roughness={0.15} /></RoundedBox>
      <RoundedBox args={[w - 0.02, 0.025, d - 0.22]} radius={0.01} position={[0, 0.43, 0.1]} castShadow><meshStandardMaterial color="#ffffff" roughness={0.2} /></RoundedBox>
    </group>
  );
}

export function Meuble({ f }: { f: PlanFurniture }) {
  const w = m(f.w), d = m(f.d);
  switch (f.kind) {
    case "sofa": return <Canape w={w} d={d} color={f.color} />;
    case "table": return <Table w={w} d={d} h={m(f.h ?? 75)} color={f.color} />;
    case "coffee-table": return <Table w={w} d={d} h={m(f.h ?? 40)} color={f.color ?? "#e8e2d6"} />;
    case "bed": return <Lit w={w} d={d} />;
    case "nightstand": return <Chevet w={w} d={d} h={m(f.h ?? 50)} />;
    case "wardrobe": return <Armoire w={w} d={d} h={m(f.h ?? 220)} doors={f.doors} />;
    case "bathtub": return <Baignoire w={w} d={d} />;
    case "toilet": return <Toilettes w={w} d={d} />;
    case "duct": return <Blocs blocs={[{ p: [0, m(f.h ?? 250) / 2, 0], s: [w, m(f.h ?? 250), d], c: MUR, r: 0.92 }]} />;
    case "fridge": return <Frigo w={w} d={d} h={m(f.h ?? 190)} />;
    case "kitchen": return <Cuisine w={w} d={d} modules={f.modules ?? [{ type: "base", w: f.w }]} />;
  }
}

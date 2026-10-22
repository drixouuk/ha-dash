import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, type ComponentRef, type ReactNode, type RefObject } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { DoubleSide, ExtrudeGeometry, Path, PlaneGeometry, Shape, ShapeGeometry, Vector2, Vector3, type PerspectiveCamera, type Texture } from "three";
import type { MultiPolygon } from "polygon-clipping";
import { useEnt } from "@data";
import { ROOMS, type Plan, type PlanDevice, type PlanOpening, type PlanPoint, type PlanZone } from "@config";
import { KIND, lecture } from "../IsoPlan";
import { n1 } from "../../util";
import { Objet, encombrement } from "./Appareils3D";
import { Meuble } from "./Mobilier3D";
import { H, aretes, bornes, centre, contreLeMur, plafond, repereOuverture, tranchesDeMurs, type Arete } from "./geometry";
import { carrelage, exterieur, lamelles, parquet } from "./textures";

/**
 * Maquette 3D du logement (Three.js via @react-three/fiber), chargée à la
 * demande par la page Plan. Rendu « à la demande » : rien n'est recalculé tant
 * que rien ne bouge, ce qui ménage une tablette murale.
 *
 * Repère : le plan 2D (x, y en cm) devient le sol (X, Z en mètres), Y monte.
 */

const m = (cm: number) => cm / 100;
/** Murs gris neutre, peu saturés : ils structurent sans écraser la vue. */
const MUR = "#cdd1d8";
type Controles = ComponentRef<typeof OrbitControls>;

/**
 * Conteneur DOM des étiquettes, fixé dès le montage : sans lui, drei change de
 * cible juste après le premier rendu et démonte chaque étiquette en plein rendu
 * (erreur React « synchronously unmount a root »).
 */
const Calque = createContext<RefObject<HTMLElement> | undefined>(undefined);

/** Matériel modeste (tablette d'entrée de gamme) : ombres simplifiées, sans anticrénelage, résolution 1×. */
const faible = (() => {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return (nav.deviceMemory ?? 8) <= 2 || (nav.hardwareConcurrency ?? 8) <= 2;
})();

function formes(mp: MultiPolygon): Shape[] {
  return mp.map((poly) => {
    const [ext, ...trous] = poly;
    const v = (ring: [number, number][]) => ring.slice(0, -1).map(([x, y]) => new Vector2(m(x), m(y)));
    const s = new Shape(v(ext));
    s.holes = trous.map((t) => new Path(v(t)));
    return s;
  });
}
const forme = (poly: readonly PlanPoint[]) => formes([[[...poly.map(([x, y]) => [x, y] as [number, number]), [poly[0][0], poly[0][1]]]]])[0];

/** Ne capte aucun toucher : un plafond ou un mur invisible ne doit pas masquer les sols. */
const sansClic = () => null;

/**
 * Murs, tranche par tranche. Au-dessus de la hauteur affichée (« Murs bas »),
 * les tranches restent dans la scène mais invisibles : elles portent toujours
 * leur ombre, et la lumière continue d'entrer par les fenêtres seulement.
 */
function Murs({ plan, hauteur }: { plan: Plan; hauteur: number }) {
  const tranches = useMemo(() => tranchesDeMurs(plan).map((t) => ({ ...t, shapes: formes(t.forme) })), [plan]);
  const geos = useMemo(() => tranches.flatMap(({ de, a, shapes }) => {
    const coupe = Math.min(Math.max(hauteur, de), a);
    const extrude = (bas: number, haut: number) => new ExtrudeGeometry(shapes, { depth: m(haut - bas), bevelEnabled: false });
    return [
      ...(coupe > de ? [{ haut: coupe, visible: true, geo: extrude(de, coupe) }] : []),
      ...(a > coupe ? [{ haut: a, visible: false, geo: extrude(coupe, a) }] : []),
    ];
  }), [tranches, hauteur]);
  useEffect(() => () => geos.forEach((g) => g.geo.dispose()), [geos]);
  // Extrusion le long de +Z puis quart de tour : le haut de la tranche se retrouve en y = haut.
  return (
    <>
      {geos.map(({ haut, visible, geo }, i) => (
        <mesh key={i} geometry={geo} rotation-x={Math.PI / 2} position-y={m(haut)} castShadow receiveShadow={visible} raycast={visible ? undefined : sansClic}>
          {visible
            ? <meshStandardMaterial color={MUR} roughness={0.92} />
            : <meshBasicMaterial colorWrite={false} depthWrite={false} />}
        </mesh>
      ))}
    </>
  );
}

/** Plafond invisible : il arrête le soleil, qui n'entre plus que par les fenêtres. */
function Plafond({ plan }: { plan: Plan }) {
  const geo = useMemo(() => new ShapeGeometry(formes(plafond(plan))), [plan]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} rotation-x={Math.PI / 2} position-y={m(H.plafond)} castShadow raycast={sansClic}>
      <meshBasicMaterial colorWrite={false} depthWrite={false} side={DoubleSide} />
    </mesh>
  );
}

/**
 * Soleil : position réelle (entité `sun`, attributs azimuth/elevation) ramenée
 * dans le repère du plan grâce à `orientation` ; sinon un soleil du matin
 * venant du haut du plan. La nuit, il s'éteint et seules les lampes éclairent.
 */
function Soleil({ plan, L }: { plan: Plan; L: number }) {
  const sun = useEnt(plan.sun ?? "");
  const reel = sun?.ok && plan.orientation != null && sun.attrs.azimuth != null;
  const az = reel ? Number(sun.attrs.azimuth) : (plan.orientation ?? 0) + 15;
  const el = reel ? Number(sun.attrs.elevation) : 28;
  // Angle horaire depuis le haut du plan ; le haut du plan est -Z dans la scène.
  const t = ((az - (plan.orientation ?? 0)) * Math.PI) / 180;
  const e = (Math.max(el, 4) * Math.PI) / 180;
  const jour = Math.min(1, Math.max(0, (el + 2) / 10));
  const d = L * 1.6;
  return (
    <>
      <hemisphereLight args={["#e6ecff", "#4a3b2c", 0.6 + 0.9 * jour]} />
      <ambientLight intensity={0.15 + 0.3 * jour} />
      {jour > 0 && (
        <directionalLight
          position={[Math.sin(t) * Math.cos(e) * d, Math.sin(e) * d, -Math.cos(t) * Math.cos(e) * d]}
          intensity={3.2 * jour} color={el < 12 ? "#ffd8a8" : "#fff0d9"} castShadow
          shadow-mapSize={faible ? [1024, 1024] : [2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02}
          shadow-camera-left={-L} shadow-camera-right={L} shadow-camera-top={L} shadow-camera-bottom={-L} shadow-camera-far={L * 4}
        />
      )}
    </>
  );
}

const SOLS: Record<string, () => Texture> = { parquet, carrelage, exterieur };

function Sol({ zone, onZone }: { zone: PlanZone; onZone: (z: PlanZone) => void }) {
  const room = ROOMS.find((r) => r.id === zone.room);
  const chauffe = useEnt(room?.heating ?? "");
  const geo = useMemo(() => new ShapeGeometry(forme(zone.poly)), [zone]);
  useEffect(() => () => geo.dispose(), [geo]);
  const map = SOLS[zone.floor ?? (zone.outdoor ? "exterieur" : "parquet")]();
  const clic = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6 || !room) return;
    e.stopPropagation();
    onZone(zone);
  };
  return (
    <mesh geometry={geo} rotation-x={Math.PI / 2} position-y={0.002} receiveShadow onClick={clic}>
      <meshStandardMaterial map={map} side={DoubleSide} roughness={zone.floor === "carrelage" ? 0.35 : 0.7} emissive="#ff5a1f" emissiveIntensity={chauffe?.on ? 0.14 : 0} />
    </mesh>
  );
}

/** Place un objet dans le repère d'une arête : origine au sol, +Z vers la pièce. */
function Repere({ at, angle, children }: { at: PlanPoint; angle: number; children: ReactNode }) {
  return <group position={[m(at[0]), 0, m(at[1])]} rotation-y={angle}>{children}</group>;
}

function Fenetre({ o, liste }: { o: Extract<PlanOpening, { kind: "window" }>; liste: Arete[] }) {
  const volet = useEnt(o.cover ?? "");
  const r = repereOuverture(liste, o);
  const allege = o.sill ?? H.allege;
  const w = m(o.w), haut = m(H.linteau - allege), y0 = m(allege);
  const pos = volet?.ok ? Number(volet.attrs.current_position ?? (volet.state === "open" ? 100 : 0)) : 100;
  const hv = Math.max(0.001, haut * (1 - pos / 100));
  const tex = useMemo(() => { const t = lamelles().clone(); t.needsUpdate = true; return t; }, []);
  tex.repeat.set(1, hv / 0.3);
  const cadre = "#f4f4f2";
  return (
    <Repere at={o.at} angle={Math.atan2(r.nx, r.ny)}>
      <mesh position={[0, y0 + haut / 2, 0]}>
        <planeGeometry args={[w, haut]} />
        <meshPhysicalMaterial color="#a9c8ff" transparent opacity={0.22} roughness={0.05} side={DoubleSide} depthWrite={false} />
      </mesh>
      {[[0, y0 + 0.025, w, 0.05], [0, y0 + haut - 0.025, w, 0.05], [-w / 2 + 0.025, y0 + haut / 2, 0.05, haut], [w / 2 - 0.025, y0 + haut / 2, 0.05, haut], [0, y0 + haut / 2, 0.04, haut]].map(([x, y, sx, sy], i) => (
        <mesh key={i} position={[x, y, 0]} castShadow><boxGeometry args={[sx, sy, 0.06]} /><meshStandardMaterial color={cadre} roughness={0.4} /></mesh>
      ))}
      {allege > 0 && <mesh position={[0, y0 - 0.015, 0.06]} receiveShadow castShadow><boxGeometry args={[w + 0.08, 0.03, 0.22]} /><meshStandardMaterial color="#e9e4da" roughness={0.6} /></mesh>}
      {o.curtain && <Voilage w={w} />}
      {o.cover && hv > 0.002 && (
        <mesh position={[0, y0 + haut - hv / 2, -0.07]} castShadow>
          <boxGeometry args={[w, hv, 0.015]} />
          <meshStandardMaterial map={tex} color="#ffffff" roughness={0.5} />
        </mesh>
      )}
    </Repere>
  );
}

/**
 * Voilage de lin plissé, du sol au rail, côté pièce, entrouvert : deux pans
 * tirés sur les côtés, le milieu de la fenêtre dégagé. Il ne porte pas
 * d'ombre : le tissu est translucide et le soleil doit le traverser.
 */
function Voilage({ w }: { w: number }) {
  const rail = w + 0.3, pan = rail * 0.34, haut = 2.38;
  const geo = useMemo(() => {
    const g = new PlaneGeometry(pan, haut, Math.round(pan * 60), 1);
    const pos = g.attributes.position;
    // plis serrés : le tissu est ramassé sur le côté
    for (let i = 0; i < pos.count; i++) pos.setZ(i, 0.03 * Math.sin((pos.getX(i) * 2 * Math.PI) / 0.075));
    g.computeVertexNormals();
    return g;
  }, [pan]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <>
      {[-1, 1].map((cote) => (
        <mesh key={cote} geometry={geo} position={[cote * (rail / 2 - pan / 2), 0.02 + haut / 2, 0.2]} receiveShadow>
          <meshStandardMaterial color="#f2ede3" transparent opacity={0.62} roughness={1} side={DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

function Porte({ o, liste }: { o: Extract<PlanOpening, { kind: "door" }>; liste: Arete[] }) {
  const capteur = useEnt(o.contact ?? "");
  const r = repereOuverture(liste, o);
  const w = m(o.w) - 0.04, haut = m(H.linteau - 10);
  const entree = Boolean(o.contact);
  // Portes intérieures entrouvertes ; la porte surveillée suit son capteur.
  const ouverture = entree ? (capteur?.on ? 1.15 : 0) : 1.2;
  if (o.sliding) {
    // Porte coulissante : vantail parallèle au mur, à moitié tiré sur le côté.
    return (
      <Repere at={o.at} angle={Math.atan2(r.nx, r.ny)}>
        <mesh position={[w * 0.55, haut / 2, 0.1]} castShadow receiveShadow>
          <boxGeometry args={[w + 0.04, haut, 0.035]} />
          <meshStandardMaterial color="#efe9df" roughness={0.6} />
        </mesh>
        <mesh position={[w * 0.55, haut + 0.04, 0.1]}><boxGeometry args={[2 * w + 0.1, 0.04, 0.05]} /><meshStandardMaterial color="#9aa0aa" metalness={0.7} roughness={0.35} /></mesh>
      </Repere>
    );
  }
  return (
    <Repere at={o.at} angle={Math.atan2(r.nx, r.ny)}>
      <group position={[-w / 2, 0, 0.02]} rotation-y={-ouverture}>
        <mesh position={[w / 2, haut / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, haut, 0.04]} />
          <meshStandardMaterial color={entree ? "#5b4636" : "#efe9df"} roughness={0.6} />
        </mesh>
        <mesh position={[w - 0.07, 1.0, 0.035]}><sphereGeometry args={[0.022, 12, 12]} /><meshStandardMaterial color="#c9c9c9" metalness={0.9} roughness={0.25} /></mesh>
      </group>
    </Repere>
  );
}

function Etiquette({ d, at, y, onDevice }: { d: PlanDevice; at: PlanPoint; y: number; onDevice: (d: PlanDevice) => void }) {
  const e = useEnt(d.entity);
  const { text, ton } = lecture(d.kind, e);
  const Icon = KIND[d.kind].Icon;
  return (
    <Html position={[m(at[0]), y, m(at[1])]} center zIndexRange={[20, 1]} portal={useContext(Calque)}>
      <button className={`chip3d t-${ton}${e?.ok ? "" : " off"}`} onClick={() => onDevice(d)} aria-label={`${d.name} : ${text}`}>
        <Icon /> {text}
      </button>
    </Html>
  );
}

function NomDePiece({ zone, onZone }: { zone: PlanZone; onZone: (z: PlanZone) => void }) {
  const room = ROOMS.find((r) => r.id === zone.room);
  const temp = useEnt(room?.temp ?? "");
  const [x, y] = centre(zone.poly);
  return (
    <Html position={[m(x), 0.05, m(y)]} center zIndexRange={[19, 1]} portal={useContext(Calque)}>
      <div className={`piece3d${room ? " tap" : ""}`} onClick={room ? () => onZone(zone) : undefined}>
        <span>{zone.name}</span>
        {temp && <b className="num">{n1(temp.num)}°</b>}
      </div>
    </Html>
  );
}

function Appareil({ d, at, liste, hauteur, etiquettes, onDevice, plan }: {
  d: PlanDevice; at: PlanPoint; liste: Arete[]; hauteur: number; etiquettes: boolean; onDevice: (d: PlanDevice) => void; plan: Plan;
}) {
  const enc = encombrement(d);
  const pose = enc.mural ? contreLeMur(liste, at, enc.profondeur) : { at, angle: 0 };
  // Étiquette d'un volet : au-dessus de sa fenêtre plutôt qu'au point du plan.
  const fenetre = d.kind === "cover" ? plan.openings?.find((o) => o.kind === "window" && o.cover === d.entity) : undefined;
  const ici = fenetre?.at ?? pose.at;
  const yEtiquette = Math.min(m(hauteur) + 0.15, m(enc.z) + (d.kind === "light" ? -0.25 : 0.3));
  return (
    <>
      <Repere at={pose.at} angle={pose.angle}><Objet d={d} /></Repere>
      {etiquettes && <Etiquette d={d} at={ici} y={fenetre ? m(H.linteau) + 0.2 : yEtiquette} onDevice={onDevice} />}
    </>
  );
}

/** Direction de la caméra : de face, un peu à gauche, en surplomb ; de côté sur un écran en portrait. */
const VISEE = new Vector3(-0.12, 1.55, 1.05).normalize();
const VISEE_PORTRAIT = new Vector3(1.05, 1.55, 0.12).normalize();

/**
 * Recule la caméra juste assez pour que le logement tienne dans le cadre, quelles
 * que soient ses proportions (téléphone en portrait, tablette en paysage).
 * Cette position devient celle du bouton « Recentrer ».
 */
function Cadrage({ rayon, controles }: { rayon: number; controles: RefObject<Controles | null> }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const { width, height } = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    if (!width || !height) return;
    const v = (camera.fov * Math.PI) / 360;
    const h = Math.atan(Math.tan(v) * (width / height));
    // En portrait, le logement (plus large que profond) est vu de côté : sa longueur passe dans la hauteur.
    const portrait = width < height * 0.85;
    camera.position.copy(portrait ? VISEE_PORTRAIT : VISEE).multiplyScalar((rayon / Math.sin(Math.min(v, h))) * (portrait ? 0.82 : 1));
    camera.lookAt(0, 0, 0);
    controles.current?.target.set(0, 0, 0);
    controles.current?.update();
    controles.current?.saveState();
    invalidate();
  }, [camera, width, height, rayon, controles, invalidate]);
  return null;
}

function Recentrer({ signal, controles }: { signal: number; controles: RefObject<Controles | null> }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!signal) return;
    controles.current?.reset();
    invalidate();
  }, [signal, controles, invalidate]);
  return null;
}

export default function Scene3D({ plan, positions, hauteur, etiquettes, recentrer, onZone, onDevice }: {
  plan: Plan; positions: Record<string, PlanPoint>; hauteur: number; etiquettes: boolean; recentrer: number;
  onZone: (z: PlanZone) => void; onDevice: (d: PlanDevice) => void;
}) {
  const liste = useMemo(() => aretes(plan), [plan]);
  const b = bornes(plan.outline);
  const cx = m((b.x0 + b.x1) / 2), cz = m((b.y0 + b.y1) / 2);
  const L = Math.max(m(b.x1 - b.x0), m(b.y1 - b.y0));
  const controles = useRef<Controles | null>(null);
  const calque = useRef<HTMLDivElement | null>(null);
  const socle = useMemo(() => new ExtrudeGeometry(forme(plan.outline), { depth: 0.18, bevelEnabled: false }), [plan]);
  useEffect(() => () => socle.dispose(), [socle]);

  return (
    <>
    <div ref={calque} className="plan3d-calque" />
    <Calque.Provider value={calque as RefObject<HTMLElement>}>
    <Canvas
      frameloop="demand" shadows dpr={faible ? 1 : [1, 2]}
      gl={{ antialias: !faible, alpha: true, powerPreference: faible ? "low-power" : "high-performance" }}
      camera={{ fov: 32, near: 0.1, far: 300, position: [-0.12 * L, 1.55 * L, 1.05 * L] }}
    >
      <OrbitControls ref={controles} makeDefault target={[0, 0, 0]} maxPolarAngle={1.3} minPolarAngle={0.12} minDistance={2} maxDistance={L * 4} />
      <Cadrage rayon={0.42 * Math.hypot(m(b.x1 - b.x0), m(b.y1 - b.y0))} controles={controles} />
      <Recentrer signal={recentrer} controles={controles} />
      <Soleil plan={plan} L={L} />
      <group position={[-cx, 0, -cz]}>
        <mesh geometry={socle} rotation-x={Math.PI / 2} position-y={0} receiveShadow castShadow>
          <meshStandardMaterial color="#1b2140" roughness={0.9} />
        </mesh>
        {plan.zones.map((z) => <Sol key={z.name} zone={z} onZone={onZone} />)}
        <Murs plan={plan} hauteur={hauteur} />
        <Plafond plan={plan} />
        {/* Murs coupés sous le linteau : menuiseries masquées, elles dépasseraient. */}
        {hauteur >= H.linteau && (plan.openings ?? []).map((o, i) =>
          o.kind === "window" ? <Fenetre key={i} o={o} liste={liste} />
            : o.kind === "door" ? <Porte key={i} o={o} liste={liste} />
              : null)}
        {(plan.furniture ?? []).map((f, i) => (
          <group key={i} position={[m(f.at[0]), 0, m(f.at[1])]} rotation-y={((f.rot ?? 0) * Math.PI) / 180}><Meuble f={f} /></group>
        ))}
        {plan.devices.map((d) => (
          <Appareil key={d.id} d={d} at={positions[d.id] ?? d.at} liste={liste} hauteur={hauteur} etiquettes={etiquettes} onDevice={onDevice} plan={plan} />
        ))}
        {etiquettes && plan.zones.map((z) => <NomDePiece key={z.name} zone={z} onZone={onZone} />)}
      </group>
    </Canvas>
    </Calque.Provider>
    </>
  );
}

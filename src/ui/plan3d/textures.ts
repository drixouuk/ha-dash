import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from "three";

/**
 * Textures dessinées au canvas : aucune image à télécharger ni à héberger.
 * Les UV des sols sont en mètres, `repeat` règle donc la taille réelle du motif.
 */

/** Générateur pseudo-aléatoire déterministe : le parquet est le même à chaque chargement. */
function rnd(graine: number) {
  let x = graine;
  return () => ((x = (x * 16807) % 2147483647) / 2147483647);
}

function texture(taille: number, metres: number, dessin: (c: CanvasRenderingContext2D, r: () => number) => void, rotation = 0): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = taille;
  dessin(canvas.getContext("2d")!, rnd(7));
  const t = new CanvasTexture(canvas);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(1 / metres, 1 / metres);
  t.rotation = rotation;
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const cache = new Map<string, Texture>();
const memo = (cle: string, f: () => Texture) => cache.get(cle) ?? (cache.set(cle, f()), cache.get(cle)!);

/** Parquet chêne clair : lames de 16 cm, joints décalés, motif de 1,2 m, posées dans le sens de la profondeur du plan. */
export const parquet = () => memo("parquet", () => texture(512, 1.2, (c, r) => {
  const lame = 512 / 7.5;
  for (let i = 0; i * lame < 512; i++) {
    let x = -r() * 300;
    while (x < 512) {
      const long = 160 + r() * 260;
      const l = 73 + r() * 9, s = 26 + r() * 10;
      c.fillStyle = `hsl(32 ${s}% ${l}%)`;
      c.fillRect(x, i * lame, long, lame);
      // veinage léger
      c.strokeStyle = `hsla(30 35% ${l - 16}% / .16)`;
      c.lineWidth = 1;
      for (let v = 0; v < 4; v++) {
        const y = i * lame + 6 + r() * (lame - 12);
        c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + long / 3, y + r() * 6 - 3, x + (2 * long) / 3, y + r() * 6 - 3, x + long, y); c.stroke();
      }
      c.fillStyle = "rgba(90,65,40,.35)";
      c.fillRect(x, i * lame, 1.5, lame);
      x += long;
    }
    c.fillStyle = "rgba(90,65,40,.4)";
    c.fillRect(0, i * lame, 512, 1.5);
  }
}, Math.PI / 2));

/** Carrelage 30 × 30 cm, gris chaud, joints clairs. */
export const carrelage = () => memo("carrelage", () => texture(512, 0.6, (c, r) => {
  const n = 2, t = 512 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const l = 80 + r() * 4;
    c.fillStyle = `hsl(35 8% ${l}%)`;
    c.fillRect(i * t, j * t, t, t);
    for (let k = 0; k < 180; k++) {
      c.fillStyle = `hsla(30 10% ${60 + r() * 30}% / .12)`;
      c.fillRect(i * t + r() * t, j * t + r() * t, 2 + r() * 4, 2 + r() * 4);
    }
  }
  c.strokeStyle = "hsl(40 10% 92%)";
  c.lineWidth = 5;
  for (let i = 0; i <= n; i++) {
    c.beginPath(); c.moveTo(i * t, 0); c.lineTo(i * t, 512); c.stroke();
    c.beginPath(); c.moveTo(0, i * t); c.lineTo(512, i * t); c.stroke();
  }
}));

/** Dalle extérieure : béton gris moucheté, joints tous les 50 cm. */
export const exterieur = () => memo("exterieur", () => texture(256, 1, (c, r) => {
  c.fillStyle = "hsl(220 6% 52%)";
  c.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 900; k++) {
    c.fillStyle = `hsla(220 6% ${35 + r() * 40}% / .25)`;
    c.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 3);
  }
  c.strokeStyle = "hsla(220 8% 30% / .6)";
  c.lineWidth = 2;
  for (const p of [0, 128, 256]) {
    c.beginPath(); c.moveTo(p, 0); c.lineTo(p, 256); c.stroke();
    c.beginPath(); c.moveTo(0, p); c.lineTo(256, p); c.stroke();
  }
}));

/** Lames horizontales d'un volet roulant (motif de 30 cm de haut, étiré en largeur). */
export const lamelles = () => memo("lamelles", () => {
  const t = texture(64, 0.3, (c) => {
    for (let i = 0; i < 6; i++) {
      const y = (i * 64) / 6;
      const g = c.createLinearGradient(0, y, 0, y + 64 / 6);
      g.addColorStop(0, "#d9dce3"); g.addColorStop(0.75, "#b7bcc8"); g.addColorStop(1, "#8d93a3");
      c.fillStyle = g;
      c.fillRect(0, y, 64, 64 / 6);
    }
  });
  t.repeat.set(1, 1 / 0.3);
  return t;
});

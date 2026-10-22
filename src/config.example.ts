/**
 * Configuration d'exemple, **neutre** : elle sert de modèle et de référence de
 * typage. Pour l'adapter à votre maison, ne modifiez pas ce fichier : copiez-le
 * en `src/config.local.ts` (ignoré par git, voir docs/ADAPTER.md).
 *
 * L'alias `@config` (vite.config.ts) résout vers `src/config.local.ts` s'il
 * existe, sinon vers ce fichier. `config.local.ts` déclare ses valeurs avec le
 * type `MaisonConfig` exporté ici : `npm run build` (qui lance `tsc`) échoue donc
 * si un champ manque ou change de nature.
 */

export type RoomIcon = "sofa" | "bed" | "desk";

export type Room = {
  id: string;
  name: string;
  icon: RoomIcon;
  color: string; // couleur de donnée (validée sur fond sombre)
  climate: string;
  temp: string;
  hum: string;
  covers: string[];
  heating: string; // binary_sensor : la pièce est en chauffe
  /** Capteur d'occupation de la pièce (facultatif) : affiché sur les cartes, il explique une consigne éco. */
  presence?: string;
  statDay: string;
  statWeek: string;
  setpoint: string;
};

export type PrayerSlot = {
  key: string;
  label: string;
  adhan: string;
  iqamah?: string;
};

/** Point du plan, en centimètres : x vers la droite, y vers le bas du plan 2D. */
export type PlanPoint = readonly [number, number];

/** Sorte d'appareil : choisit l'icône et les libellés du repère sur le plan. */
export type PlanDeviceKind =
  | "thermostat" | "trv" | "sensor" | "presence" | "cover" | "contact" | "light" | "media" | "hub" | "plant";

export type PlanZone = {
  name: string;
  /** Contour intérieur de la pièce (murs exclus), en cm. */
  poly: readonly PlanPoint[];
  /** Pièce de `ROOMS` correspondante : sol teinté, température affichée, fiche au toucher. */
  room?: string;
  /** Balcon, terrasse… : sol hachuré et garde-corps bas au lieu des murs. */
  outdoor?: boolean;
  /** Revêtement en 3D (parquet par défaut, `exterieur` pour une zone `outdoor`). */
  floor?: "parquet" | "carrelage" | "exterieur";
  /** Zone `outdoor` : hauteur (cm) du muret côté extérieur, 100 par défaut. Les murs côté logement restent pleins. */
  parapet?: number;
};

/**
 * Ouverture dans un mur, pour la vue 3D : son centre `at` se place n'importe où
 * dans l'épaisseur du mur (à 40 cm près), `w` est sa largeur en cm. Une fenêtre
 * peut porter le volet qui la ferme, une porte le capteur d'ouverture qui la surveille.
 */
export type PlanOpening =
  /** `sill` : hauteur d'allège en cm (90 par défaut, 0 pour une porte-fenêtre) ; `curtain` : voilage de lin. */
  | { kind: "window"; at: PlanPoint; w: number; cover?: string; sill?: number; curtain?: boolean }
  | { kind: "door"; at: PlanPoint; w: number; contact?: string; sliding?: boolean }
  | { kind: "passage"; at: PlanPoint; w: number };

/** Module d'une cuisine, de gauche à droite vu de face ; `upper` : meuble haut au-dessus. */
export type PlanKitchenModule = { type: "base" | "dishwasher" | "oven" | "washer" | "sink"; w: number; upper?: boolean };

/**
 * Meuble de la vue 3D. `at` est son centre, `w` sa largeur et `d` sa profondeur
 * (cm) ; `rot` tourne sa façade : 0 = vers le bas du plan, 90 = vers la droite,
 * 180 = vers le haut, 270 = vers la gauche.
 */
export type PlanFurniture = {
  /** `duct` : gaine technique (coffrage plein du sol au plafond, couleur des murs). */
  kind: "sofa" | "table" | "coffee-table" | "bed" | "nightstand" | "wardrobe" | "fridge" | "kitchen" | "duct" | "bathtub" | "toilet";
  at: PlanPoint;
  w: number;
  d: number;
  h?: number;
  rot?: number;
  color?: string;
  /** `wardrobe` : nombre de portes (une par 50 cm de largeur par défaut). */
  doors?: number;
  /** `kitchen` : les modules, dont la somme des largeurs fait `w`. */
  modules?: readonly PlanKitchenModule[];
};

export type PlanDevice = {
  /** Identifiant stable du repère (sert au mode édition). */
  id: string;
  entity: string;
  kind: PlanDeviceKind;
  name: string;
  at: PlanPoint;
  /** Hauteur au-dessus du sol en cm (facultatif) : sépare deux appareils superposés, une télé au-dessus d'une barre de son… */
  z?: number;
  /** Forme de l'objet en 3D pour un appareil multimédia (enceinte par défaut). */
  model?: "tv" | "soundbar" | "speaker";
};

export type Plan = {
  /** Emprise extérieure du logement (murs compris), en cm. */
  outline: readonly PlanPoint[];
  zones: readonly PlanZone[];
  devices: readonly PlanDevice[];
  /** Fenêtres, portes et passages de la vue 3D (facultatif : sans eux, les murs sont pleins). */
  openings?: readonly PlanOpening[];
  /** Mobilier de la vue 3D (facultatif). */
  furniture?: readonly PlanFurniture[];
  /**
   * Azimut (°, 0 = nord, 90 = est) vers lequel regarde le haut du plan 2D. Avec
   * `sun`, le soleil de la vue 3D est à sa position réelle et n'entre que par les fenêtres.
   */
  orientation?: number;
  /** Entité du soleil (attributs `azimuth` et `elevation`), en général `sun.sun`. */
  sun?: string;
};

export type MaisonConfig = {
  /** Prénom affiché dans la salutation de l'accueil. */
  USER_NAME: string;
  /** Ville affichée sur l'accueil et la page des prières. */
  CITY: string;
  ROOMS: readonly Room[];
  OUTSIDE: { name: string; color: string; temp: string; hum: string };
  COVERS: readonly { id: string; name: string; room: string }[];
  /**
   * Plan isométrique du logement avec ses appareils (facultatif) : sans ce
   * champ, la page « Plan » n'apparaît pas. Attention, le plan finit dans le
   * bundle publié, servi sans authentification (voir docs/ADAPTER.md).
   */
  PLAN?: Plan;
  E: {
    weather: string;
    islamicMonth: string;
    nextPrayer: string;
    prayers: readonly PrayerSlot[];
    /** Thermostat de la chaudière (orchestration), distinct des thermostats de pièce. */
    nest: string;
    /**
     * Interrupteur (`input_boolean`) qui indique que Home Assistant pilote la
     * production : quand il est actif, la consigne du thermostat principal est
     * réécrite à chaque cycle, donc son cadran est grisé dans le dashboard.
     * Facultatif : sans ce champ, le cadran reste toujours actif.
     */
    boilerControl?: string;
    /**
     * Interrupteur (`input_boolean`) du « mode été » : chaudière éteinte, pièces
     * en hors-gel, orchestration de la production suspendue. Quand il est actif,
     * le cadran du thermostat principal redevient libre et l'alerte « la
     * chaudière ne suit pas » se tait. Facultatif.
     */
    summerMode?: string;
    /**
     * L'orchestration remet d'elle-même les thermostats de pièce en chauffe :
     * le bouton « Arrêt » des pièces est alors masqué (on coupe une pièce par le
     * mode été ou vacances). Facultatif, `false` par défaut.
     */
    keepRoomsOn?: boolean;
    setpoints: readonly { entity: string; name: string }[];
    /**
     * Interrupteurs de mode de la maison. `banner: true` les fait apparaître en
     * bandeau sur l'accueil quand ils sont actifs (absence, vacances…), ce qui
     * évite de deviner lesquels méritent d'être visibles.
     */
    modes: readonly { entity: string; name: string; hint: string; banner?: boolean }[];
    heatDemand: string;
    heatRooms: string;
    solar: string;
    light: string;
    plant: { lux: string; soil: string };
  };
};

export const CONFIG: MaisonConfig = {
  USER_NAME: "Alex",
  CITY: "Ma ville",

  ROOMS: [
    {
      id: "salon", name: "Salon", icon: "sofa", color: "#c98500",
      climate: "climate.salon_radiateur",
      temp: "sensor.salon_temperature", hum: "sensor.salon_humidite",
      covers: ["cover.salon_droite", "cover.salon_gauche"],
      heating: "binary_sensor.salon_chauffe",
      presence: "binary_sensor.salon_presence",
      statDay: "sensor.salon_chauffe_aujourd_hui", statWeek: "sensor.salon_chauffe_7_jours",
      setpoint: "input_number.consigne_salon",
    },
    {
      id: "chambre", name: "Chambre", icon: "bed", color: "#3987e5",
      climate: "climate.chambre_radiateur",
      temp: "sensor.chambre_temperature", hum: "sensor.chambre_humidite",
      covers: ["cover.chambre"],
      heating: "binary_sensor.chambre_chauffe",
      presence: "binary_sensor.chambre_presence",
      statDay: "sensor.chambre_chauffe_aujourd_hui", statWeek: "sensor.chambre_chauffe_7_jours",
      setpoint: "input_number.consigne_chambre",
    },
    {
      id: "bureau", name: "Bureau", icon: "desk", color: "#199e70",
      climate: "climate.bureau_radiateur",
      temp: "sensor.bureau_temperature", hum: "sensor.bureau_humidite",
      covers: ["cover.bureau"],
      heating: "binary_sensor.bureau_chauffe",
      presence: "binary_sensor.bureau_presence",
      statDay: "sensor.bureau_chauffe_aujourd_hui", statWeek: "sensor.bureau_chauffe_7_jours",
      setpoint: "input_number.consigne_bureau",
    },
  ],

  OUTSIDE: {
    name: "Extérieur", color: "#9085e9",
    temp: "sensor.exterieur_temperature", hum: "sensor.exterieur_humidite",
  },

  COVERS: [
    { id: "cover.salon_droite", name: "Salon droite", room: "salon" },
    { id: "cover.salon_gauche", name: "Salon gauche", room: "salon" },
    { id: "cover.chambre", name: "Chambre", room: "chambre" },
    { id: "cover.bureau", name: "Bureau", room: "bureau" },
  ],

  // Plan fictif : contours en cm, murs de 10 cm entre les pièces.
  PLAN: {
    outline: [[0, 0], [920, 0], [920, 620], [0, 620]],
    zones: [
      { name: "Salon", room: "salon", poly: [[10, 10], [430, 10], [430, 380], [10, 380]] },
      { name: "Cuisine", floor: "carrelage", poly: [[440, 10], [620, 10], [620, 250], [440, 250]] },
      { name: "Chambre", room: "chambre", poly: [[630, 10], [910, 10], [910, 300], [630, 300]] },
      { name: "Bureau", room: "bureau", poly: [[630, 310], [910, 310], [910, 610], [630, 610]] },
      { name: "Entrée", poly: [[440, 260], [620, 260], [620, 610], [440, 610]] },
      { name: "Salle de bain", floor: "carrelage", poly: [[10, 390], [430, 390], [430, 610], [10, 610]] },
    ],
    devices: [
      { id: "thermostat", entity: "climate.thermostat_principal", kind: "thermostat", name: "Thermostat principal", at: [415, 200] },
      { id: "tete_salon", entity: "climate.salon_radiateur", kind: "trv", name: "Tête salon", at: [120, 40] },
      { id: "volet_salon_g", entity: "cover.salon_gauche", kind: "cover", name: "Volet gauche", at: [120, 12] },
      { id: "volet_salon_d", entity: "cover.salon_droite", kind: "cover", name: "Volet droit", at: [320, 12] },
      { id: "presence_salon", entity: "binary_sensor.salon_presence", kind: "presence", name: "Présence salon", at: [30, 360] },
      { id: "tete_chambre", entity: "climate.chambre_radiateur", kind: "trv", name: "Tête chambre", at: [770, 40] },
      { id: "volet_chambre", entity: "cover.chambre", kind: "cover", name: "Volet chambre", at: [770, 12] },
      { id: "sonde_chambre", entity: "sensor.chambre_temperature", kind: "sensor", name: "Sonde chambre", at: [890, 200] },
      { id: "presence_chambre", entity: "binary_sensor.chambre_presence", kind: "presence", name: "Présence chambre", at: [650, 280] },
      { id: "tete_bureau", entity: "climate.bureau_radiateur", kind: "trv", name: "Tête bureau", at: [880, 460] },
      { id: "volet_bureau", entity: "cover.bureau", kind: "cover", name: "Volet bureau", at: [908, 460] },
      { id: "sonde_bureau", entity: "sensor.bureau_temperature", kind: "sensor", name: "Sonde bureau", at: [660, 560] },
      { id: "presence_bureau", entity: "binary_sensor.bureau_presence", kind: "presence", name: "Présence bureau", at: [890, 590] },
      { id: "lumiere", entity: "light.salon", kind: "light", name: "Lumière", at: [220, 200] },
    ],
    furniture: [
      { kind: "sofa", at: [60, 200], w: 220, d: 92, rot: 90, color: "#8d9096" },
      { kind: "coffee-table", at: [190, 200], w: 110, d: 55, rot: 90 },
      { kind: "bed", at: [810, 170], w: 160, d: 200, rot: 270 },
      { kind: "nightstand", at: [889, 65], w: 45, d: 40, rot: 270 },
      { kind: "nightstand", at: [889, 275], w: 45, d: 40, rot: 270 },
    ],
    orientation: 160,
    sun: "sun.sun",
    openings: [
      { kind: "window", at: [120, 5], w: 120, cover: "cover.salon_gauche" },
      { kind: "window", at: [320, 5], w: 120, cover: "cover.salon_droite" },
      { kind: "window", at: [770, 5], w: 110, cover: "cover.chambre" },
      { kind: "window", at: [915, 460], w: 110, cover: "cover.bureau" },
      { kind: "window", at: [530, 5], w: 90 },
      { kind: "door", at: [530, 615], w: 90 },
      { kind: "passage", at: [435, 200], w: 120 },
      { kind: "passage", at: [530, 255], w: 80 },
      { kind: "door", at: [625, 150], w: 80 },
      { kind: "door", at: [625, 450], w: 80 },
      { kind: "door", at: [435, 500], w: 80 },
    ],
  },

  E: {
    weather: "weather.home",
    islamicMonth: "sensor.islamic_month",
    nextPrayer: "sensor.next_prayer",
    prayers: [
      { key: "fajr", label: "Fajr", adhan: "sensor.fajr_prayer", iqamah: "sensor.iqamah_fajr" },
      { key: "sunrise", label: "Lever du soleil", adhan: "sensor.sunrise" },
      { key: "dhuhr", label: "Dhuhr", adhan: "sensor.dhuhr_prayer", iqamah: "sensor.iqamah_dhuhr" },
      { key: "asr", label: "Asr", adhan: "sensor.asr_prayer", iqamah: "sensor.iqamah_asr" },
      { key: "maghrib", label: "Maghrib", adhan: "sensor.maghrib_prayer", iqamah: "sensor.iqamah_maghrib" },
      { key: "isha", label: "Isha", adhan: "sensor.isha_prayer", iqamah: "sensor.iqamah_isha" },
    ],
    nest: "climate.thermostat_principal",
    boilerControl: "input_boolean.pilotage_chaudiere",
    summerMode: "input_boolean.chauffage_ete",
    keepRoomsOn: true,
    setpoints: [
      { entity: "input_number.consigne_eco", name: "Éco" },
      { entity: "input_number.consigne_hors_gel", name: "Hors-gel" },
      { entity: "input_number.seuil_rallumage", name: "Seuil « rallumer » (été)" },
    ],
    modes: [
      { entity: "input_boolean.chauffage_absence", name: "Absence", hint: "Passe en éco", banner: true },
      { entity: "input_boolean.chauffage_vacances", name: "Vacances", hint: "Hors-gel · chaudière au minimum", banner: true },
      { entity: "input_boolean.chauffage_ete", name: "Mode été", hint: "Chaudière éteinte · pièces en hors-gel", banner: true },
      { entity: "input_boolean.pilotage_chaudiere", name: "Pilotage chaudière", hint: "Home Assistant commande la chaudière" },
    ],
    heatDemand: "binary_sensor.demande_chauffe",
    heatRooms: "sensor.pieces_en_demande",
    solar: "binary_sensor.apport_solaire_possible",
    light: "light.salon",
    plant: { lux: "sensor.plante_illuminance", soil: "sensor.plante_soil_moisture" },
  },
};

export const { USER_NAME, CITY, ROOMS, OUTSIDE, COVERS, PLAN, E } = CONFIG;

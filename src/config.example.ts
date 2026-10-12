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

export type MaisonConfig = {
  /** Prénom affiché dans la salutation de l'accueil. */
  USER_NAME: string;
  /** Ville affichée sur l'accueil et la page des prières. */
  CITY: string;
  ROOMS: readonly Room[];
  OUTSIDE: { name: string; color: string; temp: string; hum: string };
  COVERS: readonly { id: string; name: string; room: string }[];
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
      statDay: "sensor.salon_chauffe_aujourd_hui", statWeek: "sensor.salon_chauffe_7_jours",
      setpoint: "input_number.consigne_salon",
    },
    {
      id: "chambre", name: "Chambre", icon: "bed", color: "#3987e5",
      climate: "climate.chambre_radiateur",
      temp: "sensor.chambre_temperature", hum: "sensor.chambre_humidite",
      covers: ["cover.chambre"],
      heating: "binary_sensor.chambre_chauffe",
      statDay: "sensor.chambre_chauffe_aujourd_hui", statWeek: "sensor.chambre_chauffe_7_jours",
      setpoint: "input_number.consigne_chambre",
    },
    {
      id: "bureau", name: "Bureau", icon: "desk", color: "#199e70",
      climate: "climate.bureau_radiateur",
      temp: "sensor.bureau_temperature", hum: "sensor.bureau_humidite",
      covers: ["cover.bureau"],
      heating: "binary_sensor.bureau_chauffe",
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
    setpoints: [
      { entity: "input_number.consigne_eco", name: "Éco" },
      { entity: "input_number.consigne_hors_gel", name: "Hors-gel" },
    ],
    modes: [
      { entity: "input_boolean.chauffage_absence", name: "Absence", hint: "Passe en éco", banner: true },
      { entity: "input_boolean.chauffage_vacances", name: "Vacances", hint: "Hors-gel", banner: true },
      { entity: "input_boolean.pilotage_chaudiere", name: "Pilotage chaudière", hint: "Home Assistant commande la chaudière" },
    ],
    heatDemand: "binary_sensor.demande_chauffe",
    heatRooms: "sensor.pieces_en_demande",
    solar: "binary_sensor.apport_solaire_possible",
    light: "light.salon",
    plant: { lux: "sensor.plante_illuminance", soil: "sensor.plante_soil_moisture" },
  },
};

export const { USER_NAME, CITY, ROOMS, OUTSIDE, COVERS, E } = CONFIG;

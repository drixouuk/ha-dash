# Adapting ha-dash to your home

This dashboard ships with a **neutral example configuration**. Everything that
depends on one particular home is listed here, with the file to touch and whether
to **replace** it or **remove** it.

The golden rule: **adapt, don't redesign.** Entity ids, names and text come from
the configuration; colours, spacing and layout come from the design system and
should stay as they are.

## 0. Start here

    cp src/config.example.ts src/config.local.ts
    $EDITOR src/config.local.ts        # your home
    npm run dev:mock                   # check the result with simulated data
    npm run build                      # tsc is the gate: it fails on a missing field

`src/config.local.ts` is **ignored by git** — it is your private configuration,
never published. `src/config.example.ts` holds the `MaisonConfig` type: it is the
authority on which fields must exist. To drop a feature for good, remove its field
there *and* the matching block in the page that uses it.

`scripts/deploy.sh` refuses to deploy without `src/config.local.ts` (override with
`ALLOW_EXAMPLE=1` only if you really want to publish the demo data).

## 1. Checklist

| # | What it is | File | Action |
| --- | --- | --- | --- |
| 1 | First name in the greeting | `src/config.local.ts` → `USER_NAME` | replace |
| 2 | City shown on Accueil and Prières | `src/config.local.ts` → `CITY` | replace |
| 3 | Rooms, their icons, colours and sensors | `src/config.local.ts` → `ROOMS` | replace |
| 4 | Outdoor temperature/humidity | `src/config.local.ts` → `OUTSIDE` | replace |
| 4b | Presence sensor of a room (optional) | `ROOMS[].presence` | replace / remove |
| 5 | Covers (shutters, blinds) | `src/config.local.ts` → `COVERS` | replace / remove rows |
| 6 | Heating, per room | `ROOMS[].climate`, `.heating`, `.setpoint`, `.statDay`, `.statWeek` | replace |
| 7 | Boiler / main thermostat | `src/config.local.ts` → `E.nest` | replace |
| 7b | Switch meaning "Home Assistant drives the boiler" | `E.boilerControl` (optional) | replace / remove |
| 7c | "Summer mode" switch (boiler off, orchestration paused) | `E.summerMode` (optional) | replace / remove |
| 7d | Hide the room "Off" button (orchestration turns rooms back on) | `E.keepRoomsOn` (optional) | keep / remove |
| 8 | Setpoints (eco, frost-free, summer threshold) | `E.setpoints` | replace / remove rows |
| 9 | House modes (away, holidays, summer, boiler control) | `E.modes` | replace / remove rows || 10 | Heat demand + rooms demanding heat | `E.heatDemand`, `E.heatRooms` | replace / remove |
| 10b | Isometric floor plan with live devices (optional page) | `PLAN` | replace / remove |
| 11 | Solar gain indicator | `E.solar` | replace / remove |
| 12 | A light (kitchen/entrance card) | `E.light` | replace / remove |
| 13 | Plant sensors (light + soil) | `E.plant` | replace / remove |
| 14 | Weather entity | `E.weather` | replace |
| 15 | Prayer times + current Islamic month | `E.prayers`, `E.nextPrayer`, `E.islamicMonth` | replace |
| 16 | The Prières page itself | `src/pages/Prayers.tsx`, `src/App.tsx`, `src/ui/Layout.tsx` | remove |
| 17 | Dynamic sky + sun arc | `src/ui/Sky.tsx`, `src/ui/SunArc.tsx`, `src/ui/Layout.tsx` | remove if no prayer times |
| 18 | Deployment target | `HA_HOST` / `HA_DASH_FOLDER`, documented in `.env.example` | replace |
| 19 | Sidebar panel in Home Assistant | `ha/panel_custom.yaml` | replace |
| 20 | URL inside the panel wrapper | `public/panel.js` → `DASHBOARD_URL` | replace if folder differs |
| 21 | Screenshots in the documentation | `docs/captures/*.png` | replace (optional) |
| 22 | Online demo workflow | `.github/workflows/pages.yml` | remove if unused |

## 2. What each item really is

### 1–4. Name, city, rooms, outside

```ts
export const CONFIG: MaisonConfig = {
  USER_NAME: "Alex",          // 1
  CITY: "Ma ville",           // 2
  ROOMS: [                    // 3
    { id: "salon", name: "Salon", icon: "sofa", color: "#c98500",
      climate: "climate.salon_radiateur",       // thermostat of the room
      temp:    "sensor.salon_temperature",      // temperature
      hum:     "sensor.salon_humidite",         // humidity
      covers:  ["cover.salon_droite"],          // shutters of this room
      heating: "binary_sensor.salon_chauffe",   // "this room is heating" (binary_sensor)
      presence: "binary_sensor.salon_presence", // occupancy sensor of the room (optional)
      statDay: "sensor.salon_chauffe_aujourd_hui",   // heating hours today
      statWeek:"sensor.salon_chauffe_7_jours",       // heating hours, last 7 days
      setpoint:"input_number.consigne_salon" },      // target temperature helper
  ],
  OUTSIDE: { name: "Extérieur", color: "#9085e9",
             temp: "sensor.exterieur_temperature", hum: "sensor.exterieur_humidite" }, // 4
```

`icon` must stay one of `sofa`, `bed`, `desk` (they are mapped to bundled icons).
Two to four rooms work best; the layout is responsive.

Missing sensors are tolerated at runtime: a card whose entity is absent shows a
dash instead of a value. Nothing crashes — so you can fill in only what you have.

### 5. Covers

`COVERS` drives the Volets page and the per-room summary. Each row is
`{ id, name, room }`, where `room` must match a `ROOMS[].id`. Remove the rows you
do not have. `current_position` is used when the entity provides it.

Some covers are Zigbee and occasionally drop off the network: the page simply
shows them as unavailable until they are back.

### 6–10. Heating

The heating page is built around one thermostat per room plus an optional main
thermostat (boiler) and three house modes:

- `E.nest` — the boiler/main thermostat. **Replace** it with your own, or remove
  the boiler block in `src/pages/Heating.tsx` together with the field if you have
  only TRVs.
- `E.boilerControl` — optional. The `input_boolean` that means "Home Assistant
  drives the boiler" (the one your orchestration automation tests as a
  condition). While it is on, the automation rewrites the boiler setpoint on
  every cycle, so the dashboard greys out the boiler dial instead of accepting a
  setting that would be overwritten immediately. Remove the field and the dial
  stays active at all times.
- `E.summerMode` — optional. The `input_boolean` of a "summer mode" (boiler
  switched off, rooms at frost-free, orchestration paused). While it is on, the
  boiler dial is no longer greyed out, the header says the boiler is off and the
  "the boiler is not following" alert stays quiet. Remove the field if you have
  no such mode.
- `E.keepRoomsOn` — optional. Set it to `true` when your automation puts room
  thermostats back to `heat` by itself: the room "Arrêt" button would not hold,
  so it is hidden (and the mode selector disappears if only one mode is left).
  Rooms are then switched off through the summer or holidays mode.
- `E.setpoints` — the helper `input_number`s used for eco and frost-free
  temperatures (plus, in the example, the room temperature below which a
  summer-mode automation suggests turning the boiler back on). Replace the
  entity ids, or remove the rows.
- `E.modes` — the house `input_boolean`s (away, holidays, summer, boiler control). Their
  labels and hints are free text: rename them to match your own automations.
  Add `banner: true` to the ones that should appear as a banner on the home page
  while they are on (typically away and holidays) — leave it out for the others.
- `E.heatDemand` / `E.heatRooms` — informational sensors ("is the boiler being
  asked to heat", "how many rooms are asking"). Set them to your own sensors or
  remove the fields and the cards that show them.

Nothing in the dashboard *automates* the heating: it reads and writes setpoints.
Your Home Assistant automations stay in charge.

### 10b. Floor plan (optional)

`PLAN` draws the home as an isometric model (plain SVG, no 3D library) with one
live marker per device; the **Plan** tab only appears when the field is set.

- `outline` — the footprint of the home, walls included; `zones` — the inside
  contour of each room. Points are `[x, y]` in **centimetres**, x to the right
  and y downwards, as read on a 2D plan with its dimensions. Link a zone to a
  room of `ROOMS` with `room` (tinted floor, live temperature, tap opens the
  room sheet); mark a balcony or terrace with `outdoor: true`.
- `devices` — `{ id, entity, kind, name, at }`. `kind` picks the icon and the
  short value shown under the marker (`thermostat`, `trv`, `sensor`,
  `presence`, `cover`, `contact`, `light`, `media`, `hub`, `plant`).
- Placing devices: on the Plan page, **Placer les appareils** switches to a top
  view where markers can be dragged; the page then gives the `devices` block to
  paste back into `src/config.local.ts`. Dragged positions are only kept in
  that browser until then.

**Privacy:** like the rest of the configuration, the plan ends up in the
published bundle, which `/config/www` serves without authentication. Leave
`PLAN` out if the layout of your home must not be reachable that way.

### 11–13. Solar, light, plants

Small home cards. Point them at your own entities, or delete the field in
`src/config.example.ts` and the block that uses it in `src/pages/Home.tsx` /
`src/pages/Climate.tsx`.

### 14. Weather

`E.weather` is any `weather.*` entity. The card shows its state, temperature,
humidity and wind.

### 15–17. Prayer times, and the sky that follows them

`E.prayers` is the source of everything time-of-day related:

```ts
prayers: [
  { key: "fajr", label: "Fajr", adhan: "sensor.fajr_prayer", iqamah: "sensor.iqamah_fajr" },
  { key: "sunrise", label: "Lever du soleil", adhan: "sensor.sunrise" },   // no iqamah
  …
]
```

- The **sensor state** must be a time, either `"18:44"` or an ISO timestamp.
- `E.nextPrayer` is informational (the sensor naming the next prayer).
- `E.islamicMonth` is displayed next to the city; it is optional in practice —
  remove the field and the `month` usage in `src/pages/Prayers.tsx`.

To **remove** the pages and keep the rest:

1. delete `src/pages/Prayers.tsx`;
2. remove its `<Route path="prieres" …>` from `src/App.tsx`;
3. remove the `{ to: "/prieres", label: "Prières", Icon: MoonStar }` row from
   `TABS` in `src/ui/Layout.tsx`;
4. remove `E.prayers`, `E.nextPrayer` and `E.islamicMonth` from
   `src/config.example.ts` (the type) and your `config.local.ts`;
5. remove the sun arc block from `src/pages/Home.tsx` and the `<Sky />` line from
   `src/ui/Layout.tsx` (both are driven by prayer times), then delete
   `src/ui/Sky.tsx`, `src/ui/SunArc.tsx` and `src/ui/prayer.ts`.

Keeping the prayer sensors but dropping only the page (steps 1–3) is fine: the
sky and the arc will still work.

### 18–20. Deployment and the Home Assistant panel

```bash
HA_HOST=192.0.2.10 npm run deploy          # your Home Assistant host
HA_DASH_FOLDER=dashboard                   # folder created under /config/www
```

The script builds, copies the static files to `/config/www/<folder>/`, then
checks that the page, its JS bundle and `panel.js` answer over HTTP. Use a
**test folder** while experimenting (`HA_DASH_FOLDER=dashboard-test`), then
switch when you are happy.

To get the dashboard in the Home Assistant sidebar, copy the block from
`ha/panel_custom.yaml` into `configuration.yaml` and adjust:

- `sidebar_title` and `sidebar_icon` — free choice;
- `url_path` — the dashboard's URL (`/ha-dashboard`);
- `module_url` — `/local/<folder>/panel.js`, matching `HA_DASH_FOLDER`;
- `public/panel.js`'s `DASHBOARD_URL` — `/local/<folder>/index.html`.

Validate the configuration (Developer tools → Check configuration) and restart
Home Assistant. Alternative without `panel_custom`: a dashboard view in `panel`
mode containing a single `iframe` card pointing at
`/local/<folder>/index.html`.

### 21–22. Documentation images and the online demo

`docs/captures/` holds screenshots produced with the example configuration by
`npm run capture` (see the README). Replace them with your own if you change the
configuration, or delete the folder.

`.github/workflows/pages.yml` publishes `dist-mock` to GitHub Pages on every push
to `main`. Delete the workflow if you do not want an online demo — note that the
demo always uses the **example** configuration, since `config.local.ts` is never
committed.

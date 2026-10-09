# ha-dash — un dashboard pour Home Assistant

Dashboard React monopage pour Home Assistant : accueil avec un ciel dynamique qui
suit le soleil et les heures de prière, arc solaire, cartes par pièce, chauffage
avec cadrans, volets, courbes de climat et page des heures de prière optionnelle.

L'interface est en français et le design system est volontairement sombre — bleu
nuit profond, accents laiton, polices Fraunces et Manrope embarquées (aucun CDN,
aucune police chargée depuis Internet).

![Accueil, plein jour](docs/captures/accueil.png)

## Le ciel suit votre journée

Le fond n'est pas une image fixe : `src/ui/Sky.tsx` fond quatre calques (nuit,
aube, jour, crépuscule) à partir des heures réelles de Fajr, du lever du soleil,
du Maghrib et d'Isha. Le contraste du texte a été relevé pour que chaque phase
reste lisible. La même page, à cinq moments :

| 03:00 | 07:50 | 12:00 | 18:44 | 21:00 |
| --- | --- | --- | --- | --- |
| ![nuit](docs/captures/ciel-0300.png) | ![aube](docs/captures/ciel-0750.png) | ![jour](docs/captures/ciel-1200.png) | ![crépuscule](docs/captures/ciel-1844.png) | ![nuit](docs/captures/ciel-2100.png) |

| Chauffage | Volets | Climat | Prières |
| --- | --- | --- | --- |
| ![chauffage](docs/captures/chauffage.png) | ![volets](docs/captures/volets.png) | ![climat](docs/captures/climat.png) | ![prières](docs/captures/prieres.png) |

**[Démo en ligne](https://drixouuk.github.io/ha-dash/)** — la démo tourne sur la
configuration d'exemple et des données simulées : elle ne touche jamais un vrai
Home Assistant.

## Démarrage rapide (sans Home Assistant)

    npm ci                  # Node >= 22, voir .nvmrc
    npm run dev:mock        # http://localhost:5173/

`npm run dev:mock` sert toute l'interface sur des données inventées : c'est le
moyen le plus rapide de voir à quoi ressemble le dashboard, et de vérifier une
modification.

## Adaptez-le à votre maison avec votre IA

Le dépôt ne contient qu'**une configuration d'exemple neutre** et rien de
personnel : aucun prénom, aucune ville, aucun identifiant d'entité, aucune
adresse, aucun jeton. Votre configuration vit dans `src/config.local.ts`, un
fichier ignoré par git.

Copiez ce prompt dans votre agent IA (Claude Code, Cursor, Codex…), après avoir
cloné le dépôt :

```text
Lis AGENTS.md et docs/ADAPTER.md dans ce dépôt, puis adapte ce dashboard Home Assistant
à ma maison.

Règles :
- Ma configuration va dans src/config.local.ts (copie d'abord src/config.example.ts s'il
  n'existe pas). Ne mets mes données personnelles nulle part ailleurs, et ne commite
  jamais ce fichier.
- Change la configuration, pas le design : aucune refonte, aucune dépendance
  supplémentaire, aucun refactoring. Si une de mes entités n'existe pas, dis-le-moi
  plutôt que d'en inventer une.
- Termine par `npm run build` (doit passer : il lance le vérificateur de types) et
  `npm run capture` (aucune erreur console ne doit être signalée).

Voici ce que Home Assistant contient chez moi :
- Pièces et leurs capteurs (climate, température, humidité, binary_sensor « en chauffe »,
  capteurs d'heures de chauffe, input_number de consigne) : ...
- Volets : ...
- Chauffage : thermostats de pièce, entité de chaudière/thermostat principal, consignes
  éco et hors-gel, booléens absence/vacances : ...
- Entité météo : ...
- Heures de prière (capteurs Fajr, lever du soleil, Dhuhr, Asr, Maghrib, Isha) : ...
- Autres (éclairage, capteurs de plante, indicateur solaire) : ...
```

La liste complète de ce qui dépend d'une installation — et de ce qu'il faut
supprimer si vous ne l'avez pas — est dans
**[docs/ADAPTER.md](docs/ADAPTER.md)** (en anglais) : pièces, volets, chauffage,
heures de prière, météo, déploiement et panneau latéral de Home Assistant.

## Déployer dans Home Assistant

    cp src/config.example.ts src/config.local.ts   # puis adaptez-le
    HA_HOST=192.0.2.10 npm run deploy              # build, copie, vérification HTTP

Le script publie dans `/config/www/<dossier>/` (par défaut `dashboard`) et refuse
de fonctionner sans `src/config.local.ts` : la configuration d'exemple ne peut
donc pas être publiée par erreur sur une vraie instance. Utilisez
`HA_DASH_FOLDER=dashboard-test` pour essayer dans un dossier à part.

Pour l'avoir dans la barre latérale, recopiez le bloc `panel_custom` de
`ha/panel_custom.yaml` dans `configuration.yaml` (voir `docs/ADAPTER.md` §18–20).
Autre solution : une vue de tableau de bord en mode `panel` avec une seule carte
`iframe` pointant sur `/local/<dossier>/index.html`.

## Sécurité

**`/config/www` est servi par Home Assistant sans authentification.** Tout ce qui
se trouve dans le bundle publié est lisible par quiconque atteint votre instance.

- Ne compilez jamais un jeton dans le bundle. `scripts/deploy.sh` force
  `VITE_HA_URL` et `VITE_HA_TOKEN` à vide et refuse de publier s'il trouve un JWT
  dans `dist/`. Un jeton longue durée se met dans `.env.local` (ignoré par git),
  pour le développement à distance uniquement.
- Ne placez jamais `src/config.local.ts` dans `/config/www` : il contient vos
  identifiants d'entités, votre prénom et votre ville. Gardez-en une copie en
  dehors de `www` si vous voulez une sauvegarde.
- Le dashboard hérite de la session Home Assistant lorsqu'il s'affiche dans
  l'interface (iframe de même origine) : aucun identifiant n'est stocké dans la
  page.

## Mises à jour

Les versions sont épinglées exactement ; une pull request Dependabot mensuelle
regroupe toutes les mises à jour npm. À la main :

    git switch -c maj-dependances
    npm install --save-exact <paquet>@<version>
    npm ci && npm run build && npm run build:mock
    npm run dev:mock        # et npm run capture pour les captures

On ne fusionne qu'une fois la CI verte (`.github/workflows/ci.yml` : installation
+ les deux builds) et les pages toujours correctes. `npx knip` signale les
fichiers et dépendances inutilisés ; les exceptions connues sont documentées dans
`knip.json`.

## Où est quoi

    src/config.example.ts   exemple neutre + le type MaisonConfig (qui fait foi)
    src/config.local.ts     VOTRE configuration — ignorée par git
    src/data/real.tsx       vraie connexion Home Assistant (client WebSocket officiel)
    src/data/mock.tsx       données simulées pour la démo
    src/ui/, src/pages/     composants et les cinq pages
    scripts/deploy.sh       build, publication, vérification
    scripts/capture.mjs     captures Playwright + contrôle des erreurs console
    AGENTS.md               instructions pour les IA (architecture, règles)
    docs/ADAPTER.md         liste de contrôle d'adaptation

Pour modifier le code, lisez d'abord `AGENTS.md` : la couche de données (`@data`)
et la configuration (`@config`) sont les deux seuls endroits qui connaissent Home
Assistant ou votre maison.

## Fourni tel quel

Projet personnel partagé tel quel, sans support ni garantie. Les demandes de
fonctionnalités et les issues ne seront pas forcément traitées — voir
[CONTRIBUTING.md](CONTRIBUTING.md). Licence MIT.

[English version of this document](README.md)

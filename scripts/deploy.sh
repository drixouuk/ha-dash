#!/usr/bin/env bash
#
# Construit le dashboard puis le publie dans /config/www/<dossier> de la machine
# Home Assistant, où il est servi sur /local/<dossier>/.
#
# Usage :
#   HA_HOST=192.0.2.10 npm run deploy
#   HA_HOST=homeassistant.local HA_DASH_FOLDER=dashboard ./scripts/deploy.sh
#
# Aucune adresse n'est codée en dur : HA_HOST est obligatoire, les autres
# variables ont des valeurs par défaut et sont documentées dans .env.example.
# `base` vaut "./" dans vite.config.ts : le build fonctionne depuis n'importe
# quel sous-dossier de www/.
set -euo pipefail

if [[ -z "${HA_HOST:-}" ]]; then
  cat >&2 <<'MESSAGE'
ERREUR : HA_HOST n'est pas défini (aucune adresse par défaut n'est codée en dur).

    HA_HOST=192.0.2.10 npm run deploy

Variables reconnues (voir .env.example) :
    HA_HOST          hôte ou IP de la machine Home Assistant   (obligatoire)
    HA_USER          utilisateur SSH                            (défaut : root)
    HA_KEY           clé SSH privée                             (défaut : ~/.ssh/HA_VM)
    HA_PORT          port HTTP de Home Assistant                (défaut : 8123)
    HA_DASH_FOLDER   dossier dans /config/www                   (défaut : dashboard)
    HA_PUBLIC_URL    URL publique, affichée à la fin            (facultatif)
    ALLOW_EXAMPLE    « 1 » pour publier la configuration d'exemple (déconseillé)
MESSAGE
  exit 1
fi

# --------------------------------------------------------------------------
# GARDE-FOU : sans src/config.local.ts, le build partirait avec la configuration
# d'exemple (« Alex », entités fictives) et serait publié sur la vraie instance,
# où toutes les cartes seraient vides. On refuse, sauf demande explicite.
# --------------------------------------------------------------------------
if [[ ! -f src/config.local.ts && "${ALLOW_EXAMPLE:-0}" != "1" ]]; then
  cat >&2 <<'MESSAGE'
ERREUR : src/config.local.ts est absent.

Ce fichier contient la configuration réelle de la maison (prénom, ville,
identifiants d'entités). Il n'est pas versionné : copiez l'exemple puis adaptez-le.

    cp src/config.example.ts src/config.local.ts
    $EDITOR src/config.local.ts

Pour publier volontairement la version de démonstration (entités fictives),
relancer avec ALLOW_EXAMPLE=1.

Voir docs/ADAPTER.md pour la liste complète des éléments à adapter.
MESSAGE
  exit 1
fi

HA_USER="${HA_USER:-root}"
HA_KEY="${HA_KEY:-$HOME/.ssh/HA_VM}"
HA_PORT="${HA_PORT:-8123}"
FOLDER="${HA_DASH_FOLDER:-dashboard}"
PUBLIC_URL="${HA_PUBLIC_URL:-}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SSH_OPTS=(
  -F /dev/null
  -o UserKnownHostsFile=/dev/null
  -o StrictHostKeyChecking=no
  -o ConnectTimeout=15
  -o BatchMode=yes
  -i "$HA_KEY"
)

# --------------------------------------------------------------------------
# SÉCURITÉ : /config/www est servi SANS authentification par Home Assistant.
# Vite grave les variables VITE_* dans le bundle : un jeton présent à la
# compilation serait lisible par quiconque atteint l'instance. On force donc ces
# deux variables à vide pour le build publié — le dashboard hérite alors de la
# session Home Assistant (iframe de même origine) ou affiche son formulaire.
# --------------------------------------------------------------------------
echo "==> Build (VITE_HA_URL et VITE_HA_TOKEN forcés à vide)"
VITE_HA_URL="" VITE_HA_TOKEN="" npm run build

# Garde-fou : aucun jeton JWT (les jetons longue durée de HA commencent par
# « eyJhbGciOi ») ne doit se retrouver dans le bundle publié.
if grep -rl 'eyJhbGciOi' dist/assets >/dev/null 2>&1; then
  echo "ERREUR : un jeton Home Assistant semble présent dans dist/." >&2
  echo "Publication annulée." >&2
  exit 1
fi

echo "==> Publication vers ${HA_USER}@${HA_HOST}:/config/www/${FOLDER}"
ssh "${SSH_OPTS[@]}" "${HA_USER}@${HA_HOST}" \
  "rm -rf /config/www/${FOLDER} && mkdir -p /config/www/${FOLDER}"
tar -C dist -czf - . | ssh "${SSH_OPTS[@]}" "${HA_USER}@${HA_HOST}" \
  "tar -xzf - -C /config/www/${FOLDER}"

verifier() {
  curl -s -o /dev/null -w '%{http_code}' "http://${HA_HOST}:${HA_PORT}$1"
}

index_status="$(verifier "/local/${FOLDER}/index.html")"
asset="$(sed -n 's/.*src="\.\?\(\/local[^"]*\.js\)".*/\1/p' dist/index.html | head -1)"
if [[ -z "$asset" ]]; then
  asset="$(sed -n 's/.*src="\.\/\([^"]*\.js\)".*/\/local\/'"${FOLDER}"'\/\1/p' dist/index.html | head -1)"
fi
asset_status="$(verifier "$asset")"
panel_status="$(verifier "/local/${FOLDER}/panel.js")"

echo "==> Vérification"
echo "    index.html      : HTTP ${index_status}"
echo "    asset JS        : HTTP ${asset_status} (${asset})"
echo "    panel.js (menu) : HTTP ${panel_status}"

if [[ "$index_status" != "200" || "$asset_status" != "200" || "$panel_status" != "200" ]]; then
  echo "ÉCHEC : le dashboard n'est pas servi correctement." >&2
  exit 1
fi

echo
echo "Dashboard local    : http://${HA_HOST}:${HA_PORT}/local/${FOLDER}/index.html"
if [[ -n "$PUBLIC_URL" ]]; then
  echo "Dashboard public   : ${PUBLIC_URL%/}/local/${FOLDER}/index.html"
fi

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Configuration de la maison : `src/config.local.ts` s'il existe (fichier local,
 * ignoré par git, voir docs/ADAPTER.md), sinon `src/config.example.ts`.
 * Le typage est vérifié par `tsc` : `config.local.ts` doit respecter le type
 * `MaisonConfig` exporté par l'exemple.
 */
const configLocale = fileURLToPath(new URL("./src/config.local.ts", import.meta.url));
const config = existsSync(configLocale)
  ? configLocale
  : fileURLToPath(new URL("./src/config.example.ts", import.meta.url));

// `vite --mode mock` / `vite build --mode mock` : données de démonstration, sans Home Assistant.
export default defineConfig(({ mode }) => ({
  base: "./", // le build fonctionne depuis n'importe quel sous-dossier (ex. /config/www/dashboard)
  plugins: [react()],
  resolve: {
    alias: {
      "@config": config,
      "@data": fileURLToPath(new URL(mode === "mock" ? "./src/data/mock.tsx" : "./src/data/real.tsx", import.meta.url)),
    },
  },
  build: { chunkSizeWarningLimit: 2000 },
}));

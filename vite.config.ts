// @lovable.dev/vite-tanstack-config inclut déjà les éléments suivants — ne les ajoutez PAS manuellement
// sous peine de dysfonctionnement de l'application dû à des plugins dupliqués :
// - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (uniquement en mode compilation, avec cloudflare comme cible par défaut),
// componentTagger (uniquement en mode développement), injection de variables d'environnement VITE_*, alias de chemin, déduplication React/TanStack,
// plugins de journalisation des erreurs et détection du sandbox (port/hôte/strictPort).
// Vous pouvez ajouter une configuration supplémentaire via defineConfig({ vite: { ... }, etc... }) si nécessaire.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});

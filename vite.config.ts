import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts
    server: { entry: "server" },
  },
  // Wymuszamy włączenie backendu (silnik Nitro)
  nitro: true,
  // Dajemy Cloudflare pustą tablicę plugins, żeby przestał sypać błędami
  vite: {
    plugins: []
  }
});
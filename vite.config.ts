import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command }) => {
  const isCloudflareWorkersBuild = process.env.WORKERS_CI === "1";

  return {
    plugins: [
      tailwindcss(),
      tsconfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**", "**/*.server.*"],
            specifiers: ["server-only"],
          },
        },
      }),
      ...(command === "build"
        ? [
            nitro(
              isCloudflareWorkersBuild
                ? {
                    preset: "cloudflare-module",
                    output: {
                      dir: "dist",
                      serverDir: "dist/server",
                      publicDir: "dist/client",
                    },
                    cloudflare: {
                      nodeCompat: true,
                      deployConfig: true,
                    },
                  }
                : { preset: "vercel" },
            ),
          ]
        : []),
      viteReact(),
    ],
    server: {
      host: "::",
      port: 8080,
    },
  };
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      workbox: {
        // bunta även ljudklippen så uppläsning funkar offline
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,mp3}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: "Nabu – Lär dig ord",
        short_name: "Nabu",
        description: "En gratis, flerspråkig lärapp för barn.",
        lang: "sv",
        theme_color: "#a855f7",
        background_color: "#fdf7ea",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
        ],
      },
    }),
  ],
});

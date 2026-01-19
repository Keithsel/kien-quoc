import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  ssr: false,
  server: {
    preset: "static"
  },
  vite: {
    plugins: [tailwindcss()]
  }
});

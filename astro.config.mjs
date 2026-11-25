// @ts-check
import { defineConfig } from "astro/config";

// Fully static output: every page is prerendered at build time.
export default defineConfig({
  output: "static",
  build: { inlineStylesheets: "always" },
});

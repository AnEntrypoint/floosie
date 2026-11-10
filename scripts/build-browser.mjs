import { build } from "esbuild";
import { mkdirSync } from "node:fs";

mkdirSync("dist", { recursive: true });
await build({
  entryPoints: ["src/browser.ts"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  outfile: "dist/browser.js",
  sourcemap: false,
  minify: false,
});
console.log("floosie browser bundle written to dist/browser.js");

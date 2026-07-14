import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig, type Plugin } from "vite";

import baseConfig from "./vite.config";

const publicDataPath = fileURLToPath(new URL("./public/data", import.meta.url));
const outputDataPath = fileURLToPath(new URL("./dist/data", import.meta.url));

function copyPublicData(): Plugin {
  return {
    name: "copy-public-bible-data",
    async closeBundle() {
      await mkdir(outputDataPath, { recursive: true });
      await cp(publicDataPath, outputDataPath, { recursive: true, force: true });
    },
  };
}

export default defineConfig(async (environment) => mergeConfig(
  await baseConfig(environment),
  {
    build: { copyPublicDir: false },
    plugins: [copyPublicData()],
  },
));

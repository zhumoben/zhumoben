import fs from "node:fs";
import path from "node:path";
import { createJiti } from "jiti";
import type { KitConfig } from "../../shared/types.js";

const CONFIG_FILES = [
  "kit.config.ts",
  "kit.config.mts",
  "kit.config.js",
  "kit.config.mjs",
];

export async function loadConfig(cwd: string): Promise<KitConfig> {
  const jsonFile = path.join(cwd, "kit.config.json");
  if (fs.existsSync(jsonFile)) {
    try {
      return JSON.parse(fs.readFileSync(jsonFile, "utf8")) as KitConfig;
    } catch (error) {
      throw new Error(`kit.config.json is not valid JSON: ${(error as Error).message}`);
    }
  }

  for (const name of CONFIG_FILES) {
    const file = path.join(cwd, name);
    if (!fs.existsSync(file)) continue;
    try {
      const jiti = createJiti(import.meta.url, { interopDefault: true });
      const mod = (await jiti.import(file)) as { default?: KitConfig } | KitConfig;
      const config = (mod as { default?: KitConfig }).default ?? (mod as KitConfig);
      return config ?? {};
    } catch (error) {
      throw new Error(`${name} failed to load: ${(error as Error).message}`);
    }
  }

  return {};
}

import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildSite } from "../src/site-generator.mjs";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(currentDir, "..");

await buildSite({
  outputsDir: path.join(rootDir, "outputs"),
  siteDir: path.join(rootDir, "site"),
});

console.log("site generated");

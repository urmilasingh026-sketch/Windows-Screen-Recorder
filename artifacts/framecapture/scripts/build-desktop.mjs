import { build } from "vite";

process.env.PORT ??= "5173";
process.env.BASE_PATH = "./";

await build({ configFile: "vite.config.ts" });

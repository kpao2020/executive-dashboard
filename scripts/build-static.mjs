import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp("index.html", "dist/index.html");
await cp("assets", "dist/assets", { recursive: true });
await cp("public/dashboard-data.json", "dist/dashboard-data.json");

console.log("Built static dashboard in dist/.");

import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, cp, mkdir } from "fs/promises";

const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server for serverless...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  // Build server code as modules that can be required by api/index.js
  await esbuild({
    entryPoints: ["server/routes.ts", "server/storage.ts", "server/db.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outdir: "dist/server",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    external: externals,
    logLevel: "info",
  });

  // Copy report fonts so report-image-satori can find them at __dirname/fonts/
  console.log("copying report fonts to dist/server/fonts...");
  await mkdir("dist/server/fonts", { recursive: true });
  await cp("server/fonts", "dist/server/fonts", { recursive: true });
  console.log("fonts copied");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { defineConfig, env } from "prisma/config";

// Prisma 7 keeps connection URLs out of schema.prisma and no longer auto-loads .env.
// Node's built-in loader keeps this dependency-free.
try {
  process.loadEnvFile();
} catch {
  // No .env file — rely on the ambient environment (CI, container, VPS).
}

// The URL lives in .env (gitignored) and is read here for CLI commands;
// the app itself passes an adapter to PrismaClient — see src/lib/db.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});

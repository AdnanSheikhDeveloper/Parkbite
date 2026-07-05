import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Detect if we are running a CLI schema modification command (migrate/push/seed)
const isCliMigration = process.argv.some(
  (arg) => arg.includes("migrate") || arg.includes("push") || arg.includes("seed")
);

const dbUrl = isCliMigration 
  ? (env("DIRECT_URL") || env("DATABASE_URL"))
  : (env("DATABASE_URL") || env("DIRECT_URL"));

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: dbUrl,
  },
});

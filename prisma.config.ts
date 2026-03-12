import { defineConfig } from "prisma/config";
import path from "path";

const dbPath = path.join(process.cwd(), "prisma", "dev.db");

export default defineConfig({
  earlyAccess: true,
  schema: "./prisma/schema.prisma",
  datasource: {
    provider: "sqlite",
    url: `file:${dbPath}`,
  },
});
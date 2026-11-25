import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // process.env (y no env()) para que `prisma generate` funcione aunque no haya base configurada (ej. en el build del front).
    url: process.env.DATABASE_URL ?? '',
  },
});

import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

config({ path: 'server/.env' });

export default defineConfig({
  schema: 'server/prisma/schema.prisma',
  migrations: {
    path: 'server/prisma/migrations',
    seed: 'npm run db:seed --workspace server'
  },
  datasource: {
    url: env('DATABASE_URL')
  }
});

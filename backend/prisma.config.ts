import { defineConfig } from 'prisma/config';
import * as dotenv from 'dotenv';

dotenv.config();

// `prisma generate` (e.g. Docker build) does not connect; `env('DATABASE_URL')` throws if unset.
const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@127.0.0.1:5432/prisma_generate_placeholder';

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
});

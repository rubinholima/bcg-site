import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://bcg:bcg_password@localhost:5432/bcg_platform?schema=public';

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: DATABASE_URL,
  },
});

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

let DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://bcg:bcg_password@localhost:5432/bcg_platform?schema=public';

// Em produção (ex.: AWS Lightsail), usar 127.0.0.1 evita problemas de resolução IPv6 do Node com "localhost"
if (process.env.NODE_ENV === 'production' && DATABASE_URL.includes('localhost')) {
  DATABASE_URL = DATABASE_URL.replace(/localhost/g, '127.0.0.1');
}

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: DATABASE_URL,
  },
});

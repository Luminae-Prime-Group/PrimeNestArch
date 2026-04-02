import 'dotenv/config';
import { DataSource } from 'typeorm';

const sslEnabled = process.env.DB_SSL === 'true';
const isTsRuntime = __filename.endsWith('.ts');

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'postgres',
  entities: [isTsRuntime ? 'src/**/*.entity.ts' : 'dist/**/*.entity.js'],
  migrations: [
    isTsRuntime
      ? 'src/infrastructure/database/migrations/*.ts'
      : 'dist/infrastructure/database/migrations/*.js',
  ],
  ssl: sslEnabled
    ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        ca: process.env.DB_SSL_CA,
      }
    : false,
  synchronize: false,
});

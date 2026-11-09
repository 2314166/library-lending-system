import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { applyConstraints } from '../src/db/apply-constraints';

// Creates/updates the isolated "test" schema once before all test files run.
export default async function () {
  require('dotenv').config();
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://library:library@localhost:5433/library_lending?schema=test';
  execSync('npx prisma db push --skip-generate --accept-data-loss', { env: { ...process.env, DATABASE_URL: url }, stdio: 'ignore' });
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  await applyConstraints(prisma);
  await prisma.$disconnect();
}

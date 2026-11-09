import 'dotenv/config';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://library:library@localhost:5433/library_lending?schema=test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';

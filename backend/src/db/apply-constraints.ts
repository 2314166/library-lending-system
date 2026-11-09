import { PrismaClient } from '@prisma/client';

/** DB-level guards Prisma cannot express in schema.prisma. Idempotent. */
export async function applyConstraints(prisma: PrismaClient) {
  const stmts = [
    `ALTER TABLE "Book" DROP CONSTRAINT IF EXISTS "book_total_copies_nonneg"`,
    `ALTER TABLE "Book" ADD CONSTRAINT "book_total_copies_nonneg" CHECK ("totalCopies" >= 0)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "loan_one_active_per_member_book" ON "Loan" ("bookId","memberId") WHERE "returnedAt" IS NULL`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "reservation_one_active_per_member_book" ON "Reservation" ("bookId","memberId") WHERE "status" IN ('QUEUED','READY')`,
  ];
  for (const s of stmts) await prisma.$executeRawUnsafe(s);
}

if (require.main === module) {
  require('dotenv').config();
  const prisma = new PrismaClient();
  applyConstraints(prisma)
    .then(() => console.log('Constraints applied'))
    .finally(() => prisma.$disconnect());
}

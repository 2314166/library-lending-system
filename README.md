# Library Lending (backend done, frontend next)

NestJS + Prisma + PostgreSQL. Angular frontend comes in the next step.

## Run
```bash
docker compose up -d                 # Postgres on port 5433
cd backend
npm install
npm run db:setup                     # creates tables + DB constraints
npm run seed                         # 40 books, 10 members, 25 loans
npm run start:dev                    # API on http://localhost:3100
npm test                             # 15 tests, uses isolated schema "test"
```
Logins (password `Password123!`): `librarian@library.test`, `member1@library.test` ... `member10@library.test` (member10 is blocked by fines).

## Key design decisions
- Time only via `ClockService`; tests inject `FakeClock`.
- Money stored in paise (integers).
- Settings are rows in the DB, read on every operation.
- Concurrency: every stock/queue change runs in a transaction that first does `SELECT ... FOR UPDATE` on the Book row.
- Available copies are derived: total - active loans - READY holds.
- Hold expiry is applied lazily inside every checkout/reserve, and also by a per-minute cron.

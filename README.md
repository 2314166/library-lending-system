# Library Lending System

Library lending with a **first-come-first-served reservation queue**, **hold expiry** and **fines**.

- Backend: NestJS 10, Prisma 6, PostgreSQL
- Frontend: Angular 18 (standalone components)
- Two roles: **Member** and **Librarian**, enforced on the server

## 1. What the system does

**Members** can:
- Search the catalogue and check out a book if a copy is free
- Join the reservation queue when all copies are out
- See their queue position and a live hold countdown
- See their loans (overdue loans in red) and fines

**Librarians** can:
- Add, edit and delete books and set the number of copies
- Process returns (a fine is created automatically if the book is late)
- Record fine payments (partial or full)
- See all members and who is blocked
- Change library rules in a Settings page (no restart needed)

## 2. Architecture

```
Angular (port 4300)  --/api proxy-->  NestJS API (port 3100)  -->  PostgreSQL
```

- The Angular dev server proxies `/api` to `http://localhost:3100` and removes the `/api` prefix.
- Backend modules: `auth`, `books`, `loans`, `reservations`, `fines`, `settings`, `users`, `clock`, `prisma`.
- Login returns a JWT. Every request sends `Authorization: Bearer <token>`.
- Roles are checked by a guard on the server. The frontend also hides pages (route guards), but the real security is on the server.

## 3. Data model

| Table | Purpose |
|---|---|
| `User` | name, email, password hash, role (`MEMBER` or `LIBRARIAN`) |
| `Book` | title, author, genre, `totalCopies` |
| `Loan` | book, member, `borrowedAt`, `dueAt`, `returnedAt` (null = still active) |
| `Reservation` | book, member, status, `createdAt`, `readyAt`, `holdExpiresAt` |
| `Fine` | one per loan (`loanId` is unique), `daysLate`, `amount`, `amountPaid` |
| `FinePayment` | each payment, and which librarian recorded it |
| `Setting` | key/value rules (loan days, fine per day, etc.) |

Reservation status: `QUEUED` -> `READY` (hold) -> `FULFILLED`, or `EXPIRED` / `CANCELLED`.

Important choices:
- **Money is stored in paise** (integers, 100 paise = 1 rupee) so there are no floating point errors. The UI shows rupees.
- **Available copies are calculated**, not stored: `totalCopies - active loans - READY holds`.

## 4. Setup on Windows (no Docker)

### Requirements
- Node.js 20 or newer
- PostgreSQL 14 or newer (running locally on port 5432)
- Git

### Step 1: Create the database
Open `psql` or pgAdmin and run (use your own user and password):

```sql
CREATE USER seat WITH PASSWORD 'seat';
CREATE DATABASE library_lending OWNER seat;
```

### Step 2: Backend
```powershell
cd backend
copy .env.example .env
```

Open `backend\.env` and set your own values:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/library_lending?schema=public"
TEST_DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/library_lending?schema=test"
JWT_SECRET="any-long-random-string"
PORT=3100
CORS_ORIGIN="http://localhost:4300"
```

Then:

```powershell
npm install
npm run db:setup     # creates tables and database constraints
npm run seed         # sample books, 10 members, about 25 loans, fines
npm run start:dev    # API on http://localhost:3100
```

`.env` is in `.gitignore` and is never committed.

### Step 3: Frontend (new terminal)
```powershell
cd frontend
npm install
npm start            # opens on http://localhost:4300
```

### Step 4: Tests
```powershell
cd backend
npm test
```

## 5. Demo accounts

Password for all: `Password123!`

| Role | Email |
|---|---|
| Librarian | `librarian@library.test` |
| Members | `member1@library.test` ... `member10@library.test` |

`member10` starts blocked because of unpaid fines. Paying the fine unblocks the member.

## 6. Business rules

### Default settings (editable in the Librarian > Settings page)

| Setting | Default |
|---|---|
| Loan period | 14 days |
| Fine per day | Rs 5 |
| Fine cap (per loan) | Rs 200 |
| Max active loans | 5 |
| Borrow-block threshold | Rs 100 (unpaid fines above this block borrowing) |
| Hold window | 48 hours |

Settings are rows in the database and are **read on every operation**, so a change takes effect immediately without code change or restart.

### Fine calculation
Implemented as a pure function (`src/fines/fine-calculator.ts`):

```
lateMs   = returnedAt - dueAt
daysLate = lateMs > 0 ? ceil(lateMs / 1 day) : 0      // a part-day counts as a full day
amount   = min(daysLate * finePerDay, fineCap)
```

Example: 12 days late x Rs 5 = Rs 60. 3 days late = Rs 15. A fine is created when the librarian processes the return.

### Reservation queue (FIFO)
1. If no copy is free, a member can join the queue (`QUEUED`). Order is by `createdAt`.
2. When a copy is returned, the **earliest** queued member becomes `READY` and gets a hold until `now + holdWindow`.
3. While a copy is on hold, nobody else can check it out (server returns `409 Conflict`).
4. The member with the hold checks out, and the reservation becomes `FULFILLED`.
5. If the hold window passes, the reservation becomes `EXPIRED` and the hold moves to the next member in the queue.
6. A member can cancel a reservation at any time.

Hold expiry is applied in two ways: lazily inside every checkout/reserve call, and by a cron job that runs every minute.

### Borrowing is refused when
- No copy is available (or the free copy is held for someone else)
- The member already has the maximum active loans
- The member's unpaid fines are above the block threshold
- The member already has an active loan or reservation for the same book

### Other rules
- A fine payment cannot be more than the outstanding balance.
- A book with loan or reservation history cannot be deleted. Set its copies to 0 instead.

## 7. Concurrency

Two members must never get the last copy. Every stock or queue change runs inside a database transaction that first locks the book row with `SELECT ... FOR UPDATE`. A second request for the same book waits for the first to finish, then sees the updated availability and is rejected.

## 8. Testing with a fixed clock

All time in the backend comes from a `ClockService`.
- In production it returns the real time (`SystemClock`).
- In tests a `FakeClock` is injected, so a test can jump forward by 48 hours instantly instead of waiting.

**15 tests** (all pass, they use a separate schema called `test` in the same database):

| File | Tests |
|---|---|
| `test/fine.spec.ts` | 4 unit tests for the fine calculation |
| `test/library.spec.ts` | 8 integration tests on real PostgreSQL with the fake clock |
| `test/e2e.spec.ts` | 3 HTTP tests with supertest (auth, validation, roles) |

The 8 integration tests cover: due date = now + loan period, max loans, block and unblock by fines, FIFO promotion with 3 members, hold expiry passing to the next member, non-reserver cannot take a held copy, two members cannot take the last copy at the same time, and changing `FINE_PER_DAY` changes behaviour without code change.

Run only the hold-expiry test:

```powershell
npx jest -t "hold expires"
```

## 9. API routes

Money fields are in paise. Errors look like `{ "message": "..." }`.

| Method | Route | Who |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | public |
| GET | `/auth/me` | any logged-in user |
| GET | `/books`, `/books/:id` | any logged-in user |
| POST, PATCH, DELETE | `/books`, `/books/:id` | Librarian |
| GET | `/books/:id/queue` | Librarian |
| POST | `/loans/checkout` | Member |
| GET | `/loans/mine` | Member |
| GET | `/loans` | Librarian |
| POST | `/loans/:id/return` | Librarian |
| POST | `/reservations` | Member |
| DELETE | `/reservations/:id` | Member |
| GET | `/reservations/mine` | Member |
| GET | `/fines/mine` | Member |
| GET | `/fines` | Librarian |
| POST | `/fines/:id/payments` | Librarian |
| GET | `/me/summary` | Member |
| GET | `/users`, `/users/:id/summary` | Librarian |
| GET, PUT | `/settings` | Librarian |

Wrong role returns `403 Insufficient role`. Missing or bad token returns `401`.

## 10. Demo checklist

1. **Fine calculation:** as librarian, process a return of an overdue book (12 days late -> Rs 60). Check the Fines page.
2. **FIFO queue:** member joins the queue for "Clean Code". Librarian > Books > Queue shows the order.
3. **Hold:** librarian returns the copy. The first member sees "being held for you" with a live countdown.
4. **Last copy:** another member cannot check out the held copy (`409 No copy available`).
5. **Hold expiry with fixed clock:** run `npx jest -t "hold expires"`.
6. **Role enforcement:** a member token calling `GET /fines` returns `403`. A member opening `/librarian/settings` is redirected.
7. **Config change:** set the borrow-block threshold from Rs 100 to Rs 50. A member with Rs 60 unpaid becomes blocked immediately.

## 11. Project structure

```
backend/
  prisma/        schema.prisma, seed.ts
  src/           auth, books, loans, reservations, fines, settings, users, clock, prisma, db
  test/          fine.spec.ts, library.spec.ts, e2e.spec.ts, helpers/fake-clock.ts
frontend/
  src/app/
    core/        api service, auth service, interceptor, guards, models
    member/      dashboard, catalogue, my-loans, my-reservations, my-fines
    librarian/   dashboard, books, loans, fines, members, member-detail, settings
    shared/      countdown component
```

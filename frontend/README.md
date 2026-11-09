# Library Lending Frontend

Angular 18 standalone frontend for the NestJS API in `../backend`.

## Requirements
- Node.js 20.19+ (or a Node.js version supported by Angular 18)
- PostgreSQL and the backend running on port 3100

## Install and run (Windows PowerShell)
Open a terminal in this `frontend` folder:

```powershell
npm install
npm start
```

Open http://localhost:4300. The Angular dev-server proxy forwards `/api/*` requests to `http://localhost:3100` and removes the `/api` prefix.

## Demo accounts
Password for all seeded accounts: `Password123!`

- Librarian: `librarian@library.test`
- Member: `member1@library.test` through `member10@library.test`

## Features
- Member and librarian sign-in; self-registration creates a MEMBER account.
- Member catalogue search, checkout, reservation queue, loans, fines and reservations.
- Librarian catalogue CRUD, active/overdue loan list and returns, fine payments, member summaries and settings.
- JWT bearer token interceptor and role-aware navigation.
- Fine amounts are shown in INR; the backend stores money in paise.

## Important
Start the backend first from `../backend`:

```powershell
npm run start:dev
```

The frontend uses the API contract currently implemented by the backend. AI recommendations are not included yet because the uploaded backend does not currently expose a `/recommendations` endpoint.

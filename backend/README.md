# Sunshine CSSC — Backend API

Express + TypeScript + MongoDB API powering the Sunshine CSSC school management
system (student/parent portal, staff portal, admin dashboard, and the public
website CMS).

## Requirements

- Node.js 20+
- MongoDB **with transactions support** — i.e. a replica set. This includes:
  - [MongoDB Atlas](https://www.mongodb.com/atlas) (replica set by default, free tier works), or
  - A local MongoDB started as a single-node replica set.
  - A plain standalone `mongod` will **not** work: several writes (account
    creation, fee payment recording) use multi-document transactions, which
    MongoDB only supports on a replica set.
- A [Cloudinary](https://cloudinary.com/) account for image/file uploads (optional for
  local development of non-upload features, required for anything that uploads a file).

## Setup

```bash
cd backend
npm install
cp .env.example .env
# fill in MONGODB_URI, JWT secrets, Cloudinary credentials, INITIAL_ADMIN_*
```

Generate strong JWT secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Create the first administrator

No admin account is ever created automatically. Run this once, with
`INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` / `INITIAL_ADMIN_NAME` set in
`.env` (or passed inline):

```bash
npm run seed:admin
```

The account is created with `mustChangePassword: true`, so the dashboard
forces a password change on first login.

## Running

```bash
npm run dev     # tsx watch, http://localhost:4000
npm run build   # compile to dist/
npm start        # run the compiled build (after npm run build)
```

The frontend expects the API at `VITE_API_BASE_URL` (see the project root
`.env.example`), which defaults to `http://localhost:4000/api`.

## Testing

```bash
npm test
```

Tests run against an **in-memory** single-node MongoDB replica set
(`mongodb-memory-server`), so no real database is needed or touched. The
first run downloads a MongoDB binary (requires internet access once; it's
then cached).

## Project structure

```
src/
  config/      env loading, DB connection, Cloudinary config
  models/      Mongoose schemas (~35 models)
  middleware/  auth/RBAC, validation, rate limiting, error handling, uploads
  validators/  Zod request schemas
  services/    business logic that spans multiple models (user creation,
               teaching-scope checks, parent-scope checks, profile lookups)
  controllers/ request handlers
  routes/      route definitions, mounted in routes/index.ts
  seed/        one-off scripts (initial admin)
  app.ts       Express app assembly (middleware + routes)
  server.ts    process entrypoint (DB connect + listen + graceful shutdown)
tests/         vitest + supertest integration tests
```

## Authentication model

- JWT access token (short-lived, sent as `Authorization: Bearer`) +
  JWT refresh token (httpOnly cookie, scoped to `/api/auth`).
- `tokenVersion` on the `User` document is bumped on password change/reset,
  instantly invalidating every other outstanding access/refresh token.
- Roles: `super_admin`, `admin`, `academic_admin`, `teacher`, `staff`,
  `student`, `parent`. There is no public self-registration endpoint —
  every account is created by an admin (directly, or via an approved
  admission application).
- Password reset: `POST /api/auth/forgot-password` generates a hashed,
  expiring token. **No email transport is wired up** — the reset link is
  logged server-side (see `src/services/email.service.ts`) and, outside of
  `NODE_ENV=production`, returned directly in the API response so the flow
  is testable without SMTP. Wire a real provider (nodemailer, SES, Resend…)
  into `email.service.ts` to send it for real; nothing else needs to change.

## Deployment notes

- Set `NODE_ENV=production`, real JWT secrets, a replica-set MongoDB URI
  (Atlas is the simplest), and `FRONTEND_URL` to your deployed frontend's
  origin (comma-separate multiple origins if needed) — CORS is restricted to
  this list.
- Behind a reverse proxy / load balancer, `app.set("trust proxy", 1)` is
  already set so rate limiting and secure cookies see the real client IP/scheme.
- `backend/.env` is never committed (see `.gitignore`); only `.env.example`
  documents the variable names.

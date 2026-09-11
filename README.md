# Template_v1

A full-stack TypeScript starter: a Create React App front end, an Express 5 API, and a
hand-rolled Postgres migration runner.

> **Status: work in progress.** The pieces are built but not yet wired together — the API
> currently answers `404` to every request, and the `db:*` npm scripts point at a file that
> does not exist. See [Known issues](#known-issues) for the specifics and the workarounds.

---

## Stack

| Layer     | Choices                                                                        |
| --------- | ------------------------------------------------------------------------------ |
| Front end | React 19, React Router 7, Sass (indented `.sass`), CRA 5                        |
| API       | Express 5, TypeScript 5.9, `tsx` + nodemon, Zod-validated env, pino logging      |
| Database  | PostgreSQL via `pg`, custom migration runner with advisory locks                 |
| Tooling   | Prettier, ESLint 9, Vitest + Supertest (server), Jest + Testing Library (client)  |

**Many declared dependencies are unused.** The server's `package.json` carries Apollo Server,
Prisma, Drizzle, Sequelize, Passport, Redis, nodemailer, speakeasy, qrcode, and both argon2 and
bcrypt — none are imported by any source file. Only `pg`, `express`, `zod`, `pino`/`pino-http`,
`helmet`, `cors`, `cookie-parser`, `compression`, `express-rate-limit`, and `dotenv` are actually
used. On the client, `@reduxjs/toolkit` and `three` are likewise declared but never imported.
Treat the rest as a shopping list, and prune what you don't use — it's a large install and a
large audit surface for code that isn't there.

---

## Layout

```
.
├── client/          Create React App front end (TypeScript + Sass)
│   ├── src/
│   │   ├── components/common/    Button, Input, Form, Label, Heading, Container, Tooltip, Loading
│   │   ├── components/advance/   Dashboard, Toaster
│   │   ├── pages/                Home, Admin
│   │   ├── assets/styles/        Sass partials, mixins, fonts, animations
│   │   └── types/index.types.ts  Shared prop types for every component
│   └── build/                    Committed CRA output (gitignored, served by the API)
├── server/          Express API
│   └── src/
│       ├── server.ts             Boot: connect DB, listen, graceful shutdown
│       ├── main/App.ts           Express app: middleware, error handling
│       ├── config/env.config.ts  The one place .env is read and validated
│       ├── database/
│       │   ├── db.ts             Pool, query helper, slow-query logging
│       │   ├── cli/init.ts       Migration CLI entry point
│       │   ├── migrations/       Runner + per-migration controllers
│       │   └── models/*.sql      Table DDL, read by the runner
│       ├── routes/               Route definitions (not yet mounted)
│       └── utils/                logger, rate limiter, response helpers
├── pipeline/        Docker scaffolding only — no application code yet
├── push.js          Interactive `git add . && commit && push` helper
└── LICENSE          Apache-2.0
```

---

## Prerequisites

- **Node 22+** (the Dockerfiles pin 22.15.0)
- **PostgreSQL** running and reachable — a local install or a container
- **Yarn** for the client (`server`'s `client` script calls `yarn`); npm works if you run the
  client directly

---

## Setup

### 1. Install dependencies

Each workspace installs separately — there is no root-level install that covers both.

```bash
cd server && npm install
cd ../client && yarn install
```

### 2. Configure the server environment

`server/.env` already exists and is heavily commented — read it, it documents every variable
and the dotenv syntax rules that actually bite. Adjust `DB_*` to match your Postgres:

```bash
# server/.env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_user
DB_PASSWORD=your_password
```

Generate real secrets for `SESSION_SECRET` and `COOKIE_SECRET`:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

In development any non-empty value is accepted. In production the config layer **rejects** short
secrets and anything that still looks like a placeholder (`your_`, `changeme`, `example`,
`change_in_production`), and the process exits at boot naming the offending variable.

### 3. Create the database and run migrations

```bash
createdb your_database          # if it doesn't exist yet

cd server
npx tsx src/database/cli/init.ts status   # shows what's pending
npx tsx src/database/cli/init.ts up       # applies everything
```

Use `npx tsx src/database/cli/init.ts`, **not** `npm run db:up` — see
[Known issues](#known-issues).

---

## Running

### API

```bash
cd server
npm run server        # nodemon + tsx, restarts on changes under src/
```

Listens on `PORT` from `.env` (default `5000`) and logs
`Server running at http://localhost:5000 in development mode`.

> **macOS:** port 5000 is taken by the AirPlay Receiver (`ControlCenter`). Requests to
> `localhost:5000` are silently answered by AirTunes with `403` instead of reaching your API.
> Either turn it off in *System Settings → General → AirDrop & Handoff → AirPlay Receiver*, or
> set a different `PORT` in `server/.env`. Check with `lsof -iTCP:5000 -sTCP:LISTEN -n -P`.

### Client

```bash
cd client
yarn start            # http://localhost:3000
```

CRA proxies non-static requests to `http://localhost:5000` (set via `proxy` in
`client/package.json`), so keep the API on 5000 or update that field to match.

### Both together

```bash
cd server
npm run dev           # concurrently: nodemon API + yarn install/build/start for the client
```

Note that `npm run dev` runs a full `yarn install` **and** a production `yarn build` before
starting the client, so the first boot is slow. Running the two processes in separate terminals
is usually faster during development.

---

## Database commands

The CLI accepts five commands:

| Command  | Effect                                                            |
| -------- | ----------------------------------------------------------------- |
| `up`     | Apply all pending migrations (default when no command is given)    |
| `down`   | Roll back. Takes an optional step count, defaults to **1**         |
| `fresh`  | Drop everything and re-apply from scratch                          |
| `drop`   | Drop all migrations                                                |
| `status` | List each migration as applied or pending                          |

```bash
cd server
npx tsx src/database/cli/init.ts status
npx tsx src/database/cli/init.ts up
npx tsx src/database/cli/init.ts down 2
```

Three invariants the runner guarantees:

1. Every migration runs in its own transaction, so a failure leaves nothing half-applied.
2. A Postgres advisory lock is held for the whole run, so two instances booting together
   cannot race.
3. Nothing is swallowed — a failure throws all the way out, the CLI exits non-zero, and a
   deploy stops.

**Adding a migration:** write the DDL as a `.sql` file in `database/models/`, add a controller
in `database/migrations/controllers/` exporting `up(client: PoolClient)` and
`down(client: PoolClient)`, then register it in the registry at the top of
`database/migrations/migration.ts`. Both hooks must take the `PoolClient` they are handed —
using the pool instead would run the DDL on a different connection from the `BEGIN` and
silently place the change outside the transaction.

---

## Environment variables

All of these are read and validated exactly once, in `server/src/config/env.config.ts`.
A missing or malformed value stops the process at boot and names the variable.

| Variable                                       | Required | Default            | Notes                                       |
| ---------------------------------------------- | -------- | ------------------ | ------------------------------------------- |
| `NODE_ENV`                                     | no       | `development`      | `development` \| `test` \| `production`     |
| `PORT`                                         | no       | `5000`             | API listen port                             |
| `FRONTEND_URL`                                 | no       | —                  | Full URL with scheme, used for CORS         |
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASSWORD` | **yes** | port `5432` | Server will not start without all five      |
| `DB_SSL` / `DB_SSL_CA`                         | no       | `false`            | Cert verification is always on              |
| `SESSION_SECRET` `COOKIE_SECRET`               | **yes**  | —                  | 32+ chars, non-placeholder, in production   |
| `COOKIE_DOMAIN`                                | no       | unset              | Must be a real hostname; leave unset unless sharing across subdomains |
| `BCRYPT_ROUNDS`                                | no       | `12`               | 10–15; only relevant if you hash with bcrypt |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_REQUESTS` | no   | 15 min / `100`     | Applied to `/api/auth`                      |
| `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` | no     | unset              | Safer left unset; 16+ chars enforced in production |
| `LOG_LEVEL`                                    | no       | `debug` / `info`   | pino levels only — `http`/`verbose`/`silly` fail validation |
| `LOG_DIR`                                      | no       | `./logs`           | Enables rotating daily log files             |

`localhost:3000` and `localhost:5173` are always allowed by CORS regardless of `FRONTEND_URL`.
In development an unlisted origin is allowed with a warning; in production it is blocked by
omitting the CORS headers (never by throwing, which would answer `500` as though the server
were broken).

---

## What's implemented

**Server middleware** (`main/App.ts`), in order: `trust proxy 1`, `x-powered-by` disabled, JSON
and urlencoded body parsing at a 10 MB limit, Helmet (CSP on in production only), CORS with the
policy above, signed cookies, compression above 1 KB, a rate limiter on `/api/auth`, and
`pino-http` request logging that stamps every request with an `X-Request-Id` — reusing an
upstream `x-request-id` when a gateway supplies one — and maps 5xx to `error`, 4xx to `warn`.

**Graceful shutdown** (`server.ts`): `SIGINT`, `SIGTERM`, `unhandledRejection` and
`uncaughtException` all route through one idempotent `shutdown()` that closes the HTTP server,
disconnects the pool, and hard-exits after a 10-second timeout so a stuck connection cannot
hang the process forever.

**Client components** are presentational and typed through `client/src/types/index.types.ts`:
`Button`, `Input`, `Form`, `Label`, `Heading`, `Container`, `Tooltip`, `Loading`, plus
`Dashboard` and `Toaster`. Each imports its own `.sass` partial. Routing is `/` → `Home` and
`/admin` → `Admin`, both lazy-loaded behind a `Suspense` fallback.

---

## Testing

Neither suite currently runs anything meaningful — see [Known issues](#known-issues).

```bash
cd client && yarn test     # Jest + Testing Library (CRA)
cd server && npx vitest    # Vitest + Supertest
```

`App.ts` deliberately exports the app without starting it, so a test can import it and drive it
with Supertest:

```ts
import request from 'supertest';
import app from '@/main/App';

await request(app).get('/api/health').expect(200);
```

(That contract is currently broken by a stray `app.listen()` at the bottom of `App.ts`.)

---

## Docker

Each workspace has a `Dockerfile` and a `compose.yaml`, all still close to the Docker
scaffolding defaults:

- `server/compose.yaml` defines a `test-db` (postgres:16-alpine, tmpfs-backed) and the API on
  port 5000. The `test-db` port mapping contains a typo — `'%{TEST_DB_PORT:-5432}:5432'` should
  use `$`, not `%`.
- `server/Dockerfile` ends with `CMD node server.ts`, which cannot run a TypeScript file
  directly. It needs a build step and `node dist/server.js`, or `tsx`.
- `client/Dockerfile` and `pipeline/Dockerfile` are unmodified templates — the client one still
  prints "Hello world", and the pipeline one ends with `CMD docker:up`, which is not a command.

---

## Known issues

Real, reproducible problems in the current tree. Worth fixing before building on this.

1. **The API answers `404` to everything.** In `main/App.ts` the catch-all 404 handler is
   registered *before* the error handler, the static file middleware, and the SPA fallback, so
   nothing below it is ever reached. `curl localhost:5000/` returns
   `{"error":"No route for GET /"}`. Move the 404 handler so it sits after all real routes and
   before the error handler.

2. **`routes/index.routes.ts` is never mounted.** It defines `/` and `/health`, but no file
   imports it, so those endpoints do not exist. Add `app.use('/api', router)` in `App.ts`.

3. **The server starts two listeners.** `App.ts` calls `app.listen()` at module load *and*
   `server.ts` calls it again after connecting to the database — you can see both log lines on
   every boot. Delete the `app.listen()` in `App.ts`; it also breaks the Supertest contract
   that file's own docblock describes.

4. **The `db:*` scripts point at a missing file.** They reference
   `src/database/cli/migration.ts`, which does not exist — the CLI is `src/database/cli/init.ts`.
   Also, `server/.env` tells you to run `npm run db:status`, but no such script is defined.
   Fix: point the scripts at `init.ts` and add `db:status`.

5. **`server/.env` is committed** even though `server/.gitignore` excludes `.env`, because it
   was tracked before the ignore rule was added. Anything ever put in it is in git history
   permanently. Run `git rm --cached server/.env`, rename the committed copy to `.env.example`,
   and rotate any credential that was in it. The root README previously told you to
   `cp server/.env.example server/.env`; no such file exists yet.

6. **Client tests never run.** The files are named `*.tests.ts` (plural) — CRA's Jest only
   matches `*.test.{js,ts,tsx}` and `__tests__/`. They are also `.ts`, not `.tsx`, so they
   cannot contain JSX. Rename to `*.test.tsx`.

7. **`server/src/tests/init.test.ts` is empty**, so Vitest has nothing to run.

8. **The GitHub Actions workflow does nothing.** `.github/workflow/deploy.yml` is an empty file,
   and the directory must be `.github/workflows/` (plural) for GitHub to find it at all.

9. **License is inconsistent.** `LICENSE` and every source header say Apache-2.0;
   `server/package.json` agrees, but the root `package.json` says ISC. Make the root match.

10. **`Headng.tsx` is misspelled** (`client/src/components/common/Headng.tsx`), and every import
    of it carries the typo.

---

## Conventions

- Source files carry an `@copyright / @license / @author` header — keep it on new files.
- The server uses the `@/*` path alias for `src/*` (configured in `tsconfig.json`); the client
  uses relative imports.
- Styles are indented `.sass` syntax, not `.scss`. Each component imports its own partial.
- Prettier config lives in `server/.prettierrc`.

---

## License

Apache-2.0 — see [LICENSE](LICENSE). © 2026–present, Heniseeyou, LLC.

# HDFC football dashboard

The React/Vite frontend and Node.js Azure Functions v4 API are deployed
together by Azure Static Web Apps. The API is the managed API in the standard
root-level `api/` folder; there is no separate Function App deployment.

## Local development

```powershell
npm install
copy .env.example .env
npm run dev
```

To run the managed API locally, copy
`api/local.settings.json.example` to `api/local.settings.json`, replace every
placeholder with a local value, install API dependencies, and run
`func start` from `api/`. The Static Web Apps `/api` prefix is added by the
host in production. Core Tools exposes these routes without that prefix, so
use the local function URLs when testing the API directly. Generate an admin
hash with:

```powershell
node -e "console.log(require('bcryptjs').hashSync('change-me', 12))"
```

Set `VITE_API_BASE_URL` to the API origin for direct local API testing. Leave
it unset for a deployed Static Web App: the frontend then calls the managed
same-origin `/api` routes. The API keeps the public routes
`/api/health`, `/api/auth/login`, `/api/players`,
`/api/players/{playerId}`, and `/api/attendance`.

## Azure Static Web Apps configuration

The workflow uses `app_location: /`, `api_location: api`, and
`output_location: dist`. It builds the Vite app and lets Static Web Apps
install/build the managed API from `api/package.json`. The API's
`host.json` uses the required Functions `api` route prefix. Function routes are
registered without an additional `api/` prefix, so public paths are exposed
exactly once as `/api/...`.

In the Static Web App **Configuration > Application settings**, add these
server-side settings (not Vite variables):

- `DATABASE_URL`: the Neon PostgreSQL connection string (include
  `?sslmode=require`).
- `JWT_SECRET_KEY`: a random secret of at least 32 characters.
- `ADMIN_USERNAME`: the administrator login name.
- `ADMIN_PASSCODE_HASH`: optional bcrypt hash (preferred).
- `ADMIN_PASSCODE`: optional plain-text fallback for simpler setup. If neither
  setting is supplied, development uses `SDFC-ADMIN`; set one explicitly in
  production.
- `JWT_SECRET_KEY` should be at least 32 characters. If it is missing, the
  API uses a development fallback so local/admin login can still work; replace
  it in production because the fallback is not a secret.

Admin login validates these settings before attempting any SQL query. Make sure
the Azure application setting names contain no trailing spaces:
`ADMIN_USERNAME`, `ADMIN_PASSCODE` or `ADMIN_PASSCODE_HASH`, and
`JWT_SECRET_KEY`. If using `ADMIN_PASSCODE_HASH`, it must begin with a valid
bcrypt prefix such as `$2b$12$`; otherwise the plain `ADMIN_PASSCODE` fallback
is used.
- `CORS_ORIGINS`: optional comma-separated origins for direct/local callers;
  same-origin Static Web Apps requests do not require permissive CORS.

Set `AZURE_STATIC_WEB_APPS_API_TOKEN` as a GitHub Actions repository secret.
The workflow references this exact secret name and uses
`skip_deploy_on_missing_secrets: true`, so builds do not fail with
`deployment_token was not provided` when the secret has not been configured;
the deployment step is skipped until the token is added.
`VITE_API_BASE_URL` is optional and, if needed, should be a non-secret Actions
variable (`vars.VITE_API_BASE_URL`). Never commit credentials or put SQL/JWT
settings in `VITE_*` variables, because Vite exposes them to browsers.

## Neon PostgreSQL schema

The API automatically creates the `players` and `attendance` tables on the
first database query when they are missing. The operation is idempotent and
uses a shared initialization promise per function instance, making it safe for
serverless cold starts. You can still run `api/schema.sql` manually, but it is
not required for a new database. Seed players with bcrypt passcode hashes and
grant the Neon role permission to create tables and indexes.

All non-login API routes require a JWT. Queries are parameterized, and player
tokens are checked against active database records. Admin tokens last seven
days; changing `JWT_SECRET_KEY` invalidates previously issued tokens, so users
must sign in again after that setting changes.

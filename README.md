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
`host.json` intentionally uses an empty Functions route prefix because Static
Web Apps supplies the public `/api` prefix. Function routes therefore must not
include another `api/` prefix.

In the Static Web App **Configuration > Application settings**, add these
server-side settings (not Vite variables):

- `AZURE_SQL_CONNECTION_STRING`: the complete Azure SQL connection string.
- `JWT_SECRET_KEY`: a random secret of at least 32 characters.
- `ADMIN_USERNAME`: the administrator login name.
- `ADMIN_PASSCODE_HASH`: a bcrypt hash, never the plaintext passcode.
- `CORS_ORIGINS`: optional comma-separated origins for direct/local callers;
  same-origin Static Web Apps requests do not require permissive CORS.

Set `AZURE_STATIC_WEB_APPS_API_TOKEN` as a GitHub Actions repository secret.
`VITE_API_BASE_URL` is optional and, if needed, should be a non-secret Actions
variable (`vars.VITE_API_BASE_URL`). Never commit credentials or put SQL/JWT
settings in `VITE_*` variables, because Vite exposes them to browsers.

## Azure SQL schema

Create the target database and run `api/schema.sql` once with an approved
migration tool or SQL client (for example, the Azure portal query editor).
It creates `players` and `attendance`, including the foreign key and unique
player/date constraint. Seed players with bcrypt passcode hashes; the API does
not create tables or seed data automatically. Grant the configured SQL
principal only the database permissions required by these queries.

All non-login API routes require a JWT. Queries are parameterized, and player
tokens are checked against active database records.

# SDFC football dashboard

The React/Vite frontend is deployed to Azure Static Web Apps. Its optional API
is an Azure Functions v4 Node.js app in `api/`, backed by Azure SQL. The
Static Web Apps workflow deploys **only** `dist`; deploy `api/` separately with
Azure Functions Core Tools, VS Code, or your preferred CI/CD pipeline.

## Local development

```powershell
npm install
copy .env.example .env
npm run dev
```

To run the API locally, copy `api/local.settings.json.example` to
`api/local.settings.json`, fill in environment values, install its dependencies,
and run `func start` from `api/`. Generate an admin hash with:

```powershell
node -e "console.log(require('bcryptjs').hashSync('change-me', 12))"
```

Set `VITE_API_BASE_URL` to the API origin (for example
`http://localhost:7071`). If it is unset, the UI intentionally uses its
local-storage fallback.

Required Function App settings are `AZURE_SQL_CONNECTION_STRING`,
`JWT_SECRET_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSCODE_HASH`, and `CORS_ORIGINS`.
Never put these in frontend/Vite variables. Run `api/schema.sql` once against
Azure SQL using a migration/deployment tool; the Functions app does not create
tables automatically.

The API preserves the existing routes: `GET /health`, `POST /api/auth/login`,
`GET/POST /api/players`, `DELETE /api/players/{playerId}`, and
`GET/POST /api/attendance`. All data queries are parameterized and all
non-login routes require a JWT.

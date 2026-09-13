# FastAPI backend

## Setup

Install the Microsoft ODBC Driver 18 for SQL Server on the host, then create a
virtual environment and run `pip install -r backend/requirements.txt`. Copy
`backend/.env.example` to `.env`, set either `AZURE_SQL_CONNECTION_STRING` (a raw Azure ADO connection string) or
`DATABASE_URL`, and set a random `JWT_SECRET_KEY` plus a generated
`ADMIN_PASSCODE_HASH`:

```powershell
python -c "from pwdlib import PasswordHash; print(PasswordHash.recommended().hash('change-me'))"
```

Start locally with:

```powershell
uvicorn backend.main:app --reload
```

`CREATE_TABLES_ON_STARTUP` is disabled by default. It can be enabled for a
first development deployment, but production should use reviewed Alembic
migrations before enabling schema changes. The API never returns password
hashes. Configure `CORS_ORIGINS` as a comma-separated allowlist.

## Production deployment

The React frontend is deployed by Azure Static Web Apps. FastAPI is a separate
Python service and must be deployed to an Azure App Service, Container App, or
another Python-capable host; the Static Web Apps workflow does not run this
backend because its `api_location` is empty.

In GitHub repository secrets, configure:

- `SDFC_API_BASE_URL`: public HTTPS URL of the deployed FastAPI service. The
  Static Web Apps workflow passes this to Vite as `VITE_API_BASE_URL`.
- `AZURE_STATIC_WEB_APPS_API_TOKEN`: the Static Web Apps deployment token.

Configure the backend host's environment separately with
`AZURE_SQL_CONNECTION_STRING`, `JWT_SECRET_KEY`, `ADMIN_PASSCODE_HASH`, and
`CORS_ORIGINS`. Never put database credentials or backend secrets in Vite
variables; anything prefixed with `VITE_` is included in the browser bundle.

**Security:** the credential supplied during setup has been exposed in project
context; rotate it immediately in Azure and do not place it in source control,
logs, or frontend variables.

## Frontend integration

When `VITE_API_BASE_URL` is set, the React app uses this client for login,
players, and attendance; those requests require the configured backend and
bearer token. When it is absent, those three areas explicitly use the existing
localStorage demo fallback. Funds, chat, announcements, match, and images remain
local because no backend endpoints exist for them.

# SDFC Football Club dashboard

The dashboard is a React/Vite client served by an Express API. Shared squad
data is stored centrally in Neon PostgreSQL so all devices see the same
players, attendance, announcements, and funds.

## Configuration

Copy `.env.example` to `.env` and set:

```text
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
JWT_SECRET_KEY=replace-with-a-long-random-secret
ADMIN_USERNAME=admin
ADMIN_PASSCODE=replace-with-an-admin-passcode
PORT=5000
```

The schema is created idempotently on the first API request. Never commit
`.env` or real credentials.

## Development and production

```powershell
npm install
npm run dev       # Vite development client
npm run build
npm start         # Express serves dist on PORT (default 5000)
```

Admin and player login are database-backed. Administrators create players from
the Overview page; the generated player ID and access code can be used on any
device. The browser stores only the bearer session credential (and local UI
preferences such as images and wallpaper), never shared records.

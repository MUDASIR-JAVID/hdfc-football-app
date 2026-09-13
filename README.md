# SDFC Football Club dashboard

SDFC is a local-only React/Vite football team dashboard. All dashboard data,
player credentials, attendance, funds, announcements, and settings are stored
in the browser's `localStorage`. No API server, cloud database, remote API
URL, bearer token, or hosted authentication service is used.

## Local startup

Requirements: Node.js 22.12 or newer.

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. The production build can be checked with:

```powershell
npm run build
```

## Local sign-in

- **Admin:** choose **Admin** and use the local-only passcode `SDFC-ADMIN`.
- **Player:** an administrator can add a player from **Overview**. The
  generated Player ID and access code are displayed once and persisted locally.
  Players can sign in with either value in the single **Player ID or access
  code** field; no username or second login field is required.

This is intentionally a local convenience login, not a security boundary.
Clearing browser storage removes the locally stored squad and credentials. If a
mobile/private browser blocks `localStorage`, the app falls back to
`sessionStorage` for the current browser session.

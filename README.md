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
  generated Player ID and passcode are displayed once and persisted locally,
  so the player can sign in again after a reload on the same browser/device.

This is intentionally a local convenience login, not a security boundary.
Clearing browser storage removes the locally stored squad and credentials.

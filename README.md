# 🐴 Hooves

Frontend for **Hooves** — a horse carriage ride-hailing app for Mackinac Island, Michigan. Built on the [Extensive React Boilerplate](https://github.com/brocoders/extensive-react-boilerplate) with Next.js.

## Overview

Hooves lets riders hail horse-drawn carriages on Mackinac Island (where motorized vehicles are banned). This frontend provides the rider experience, driver dashboard, and admin panel — all with real-time GPS maps and full internationalization.

## Tech Stack

- **Framework:** Next.js 16 (App Router, React 19)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Maps:** Mapbox GL JS via react-map-gl
- **i18n:** i18next (7 locales)
- **Auth:** JWT with refresh token rotation
- **State:** React Query + React Hook Form
- **Process Manager:** PM2

## Features

### Rider
- Hail a carriage by selecting pickup & dropoff from named stands
- **Route preview map** with real road geometry (Mapbox Directions API)
- Live tracking of approaching driver with animated route line
- Trip progress view with zooming map as destination approaches
- Ride session persistence (navigate away and back without losing state)
- GPS permission UX with retry prompt

### Driver
- Profile creation (carriage name)
- Online/offline toggle with GPS tracking
- Incoming ride requests with accept action
- Active ride management (start trip, complete, cancel)
- Ride history with earnings stats and GPS breadcrumb trail
- Expandable route replay per ride

### Admin
- Fleet overview — all drivers, status, ride counts, earnings
- Driver detail with full ride history
- All rides view with status filtering and stats
- User management with 4-role system

### General
- 7 supported locales: English, Spanish, French, Arabic, Chinese, Ukrainian, Hindi
- Dark mode support
- Mobile-responsive design
- Maiden Orange font theming
- Location permission handling with helpful retry UI

## Getting Started

### Prerequisites

- Node.js 18+
- Mapbox access token
- Running [hooves-server](https://github.com/NomadNiko/hooves-server) backend

### Installation

```bash
git clone https://github.com/NomadNiko/hooves.git
cd hooves
cp example.env.local .env.local
npm install
```

### Configuration

Edit `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-mapbox-token
```

> **Note:** `NEXT_PUBLIC_*` values are baked at build time. Rebuild after changing them.

### Development

```bash
npm run dev
```

App available at `http://localhost:3000`.

### Production

```bash
npm run build
pm2 start ecosystem.config.js
```

## Project Structure

```
src/
├── app/[language]/
│   ├── ride/                    # Rider hail page
│   ├── driver/                  # Driver dashboard
│   │   └── history/             # Driver ride history
│   ├── admin-panel/
│   │   ├── drivers/             # Fleet overview
│   │   │   └── [id]/           # Driver detail
│   │   ├── rides/               # All rides
│   │   └── users/               # User management
│   ├── page.tsx                 # Landing page
│   └── layout.tsx               # Root layout (font, theme)
├── components/
│   ├── map/
│   │   └── driver-tracking-map.tsx  # Mapbox map with markers & route line
│   ├── location-permission.tsx      # GPS permission UX
│   └── app-sidebar.tsx              # Navigation sidebar
├── hooks/
│   └── use-mapbox-route.ts      # Mapbox Directions API route fetcher
├── services/
│   ├── api/                     # API client & types
│   └── i18n/
│       └── locales/{lang}/      # Translation JSON files
└── ...
```

## Map Features

The map component (`DriverTrackingMap`) supports:
- **Markers** — Pickup (🟢), dropoff (🏁), carriage (🐴)
- **Route lines** — Real road geometry from Mapbox Directions API (cycling profile)
- **Auto-fit** — Camera automatically frames relevant points, zooms in as distance shrinks
- **User override** — Manual pan/zoom pauses auto-fit for 10s, with re-centre button
- **Fit modes** — `pickupAndDropoff` (preview), `driverAndPickup` (approach), `driverAndDropoff` (trip)

## i18n

All user-facing text is externalized to JSON files under `src/services/i18n/locales/`. Each page has its own namespace file. Pattern:

- `page.tsx` — Server component with `generateMetadata` using `getServerTranslation`
- `page-content.tsx` — Client component with `useTranslation("namespace")`

## Based On

[Brocoders Extensive React Boilerplate](https://github.com/brocoders/extensive-react-boilerplate) — provides auth flows, user management UI, i18n scaffolding, and the component library foundation.

## License

MIT

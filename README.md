# CUVOTO - Smart Water Tank Management System

<p align="center">
  <strong>Real-time IoT water monitoring and pump automation</strong><br/>
  <em>by CUVOTO Private Limited, Bangalore, India</em>
</p>

---

## Overview

CUVOTO is a full-stack IoT platform for smart water tank management. It combines ESP32-based sensor hardware with a modern React web application to provide:

- **Real-time water level monitoring** with animated gauge visualization
- **Temperature and salinity (TDS) tracking** for water quality
- **Remote motor/pump control** via MQTT with acknowledgment feedback
- **Automatic pump control** based on configurable water level thresholds
- **Multi-tenant organization management** with invite-code-based registration
- **Cross-platform support** via web browser and native mobile apps (Capacitor)

## System Architecture

```
  Tank Unit (ESP32)          Pump Unit (ESP32)           Cloud              Web/Mobile App
  +--------------+   ESP-NOW  +--------------+   MQTT    +---------+  WSS   +----------+
  | Ultrasonic   |----------->| PumpController|<-------->| HiveMQ  |<------>| React    |
  | Temperature  |            | Relay Control |          | Cloud   |        | Dashboard|
  | TDS Sensor   |            | WebUI (local) |          +---------+        |          |
  +--------------+            +--------------+                              | Supabase |
                                                          +---------+       | Auth     |
                                                          |Supabase |<----->|          |
                                                          | (Auth+DB)|      +----------+
                                                          +---------+
```

> For detailed architecture documentation with Mermaid diagrams, see **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| **Real-time** | MQTT (mqtt.js) over WebSocket Secure (WSS) via HiveMQ Cloud |
| **Backend** | Supabase (PostgreSQL, Auth, Row-Level Security) |
| **Mobile** | Capacitor (Android & iOS) |
| **Hardware** | ESP32, PlatformIO, C++ (see [water-system](https://github.com/karmen1720/water-system) repo) |

## Pages

| Page | Route | Description |
|------|-------|-------------|
| **Auth** | `/auth` | Login (email/Google), Registration (invite code + OTP), Password recovery |
| **Dashboard** | `/dashboard` | Water level gauge, salinity & temperature cards, motor controls, logs |
| **Tanks** | `/tanks` | Overview of all tanks with status, levels, and sensor readings |
| **Alerts** | `/alerts` | Filterable alert feed (critical, warning, info, resolved) |
| **Profile** | `/profile` | User profile, company info, account settings |

## Getting Started

### Prerequisites

- Node.js 18+ and npm ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))

### Local Development

```sh
# Clone the repository
git clone https://github.com/karmen1720/cuvoto-web-spark.git
cd cuvoto-web-spark

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start Vite dev server with HMR |
| `build` | `npm run build` | Production build |
| `build:dev` | `npm run build:dev` | Development build |
| `preview` | `npm run preview` | Preview production build |
| `lint` | `npm run lint` | Run ESLint |
| `test` | `npm run test` | Run tests (Vitest) |
| `test:watch` | `npm run test:watch` | Run tests in watch mode |

### Environment Variables

The app requires the following environment variables (configured in `.env`):

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anonymous/public key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID |

## Documentation

- **[Architecture & Diagrams](docs/ARCHITECTURE.md)** - Complete system architecture, data flow diagrams, database schema, state machines, MQTT topic map, and deployment overview

## Related Repositories

- **[water-system](https://github.com/karmen1720/water-system)** - ESP32 firmware for Tank Unit (sensors) and Pump Unit (controller)

## Deployment

The web application is deployed via [Lovable](https://lovable.dev). For mobile builds:

- **Android:** Use Capacitor with `npx cap add android && npx cap open android`
- **iOS:** Use Capacitor with `npx cap add ios && npx cap open ios`

## License

Proprietary - CUVOTO Private Limited

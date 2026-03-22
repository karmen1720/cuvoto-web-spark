# CUVOTO System Architecture

## Table of Contents

- [1. System Overview](#1-system-overview)
- [2. High-Level Architecture](#2-high-level-architecture)
- [3. System Architecture Diagram](#3-system-architecture-diagram)
- [4. Hardware Layer](#4-hardware-layer)
  - [4.1 Tank Unit (Sensor Node)](#41-tank-unit-sensor-node)
  - [4.2 Pump Unit (Controller Node)](#42-pump-unit-controller-node)
  - [4.3 Pump Simulator](#43-pump-simulator)
- [5. Communication Layer](#5-communication-layer)
  - [5.1 ESP-NOW (Device-to-Device)](#51-esp-now-device-to-device)
  - [5.2 MQTT (Device-to-Cloud)](#52-mqtt-device-to-cloud)
  - [5.3 MQTT Topic Map](#53-mqtt-topic-map)
- [6. Cloud & Backend Layer](#6-cloud--backend-layer)
  - [6.1 Supabase](#61-supabase)
  - [6.2 HiveMQ Cloud](#62-hivemq-cloud)
- [7. Frontend / Web Application](#7-frontend--web-application)
  - [7.1 Technology Stack](#71-technology-stack)
  - [7.2 Application Routes](#72-application-routes)
  - [7.3 Component Architecture](#73-component-architecture)
- [8. Data Flow Diagrams](#8-data-flow-diagrams)
  - [8.1 Sensor Data Flow](#81-sensor-data-flow)
  - [8.2 Motor Command Flow](#82-motor-command-flow)
  - [8.3 User Authentication Flow](#83-user-authentication-flow)
- [9. Database Schema](#9-database-schema)
- [10. Deployment Architecture](#10-deployment-architecture)
- [11. Security Considerations](#11-security-considerations)
- [12. Component Interaction Diagram](#12-component-interaction-diagram)
- [13. State Machine Diagrams](#13-state-machine-diagrams)

---

## 1. System Overview

**CUVOTO** (by CUVOTO Private Limited, Bangalore, India) is a full-stack IoT water tank management system. It provides real-time monitoring of water levels, temperature, and salinity (TDS), along with remote and automatic pump/motor control.

The system spans three layers:

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Hardware** | ESP32 + PlatformIO (C++) | Sensors, pump relay, ESP-NOW communication |
| **Cloud** | HiveMQ (MQTT) + Supabase (Auth/DB) | Real-time messaging, user management |
| **Frontend** | React + TypeScript + Vite | Web/mobile dashboard for monitoring & control |

---

## 2. High-Level Architecture

```mermaid
graph TB
    subgraph "Physical Layer (ESP32 Devices)"
        TU["Tank Unit<br/>(Sensor Node)"]
        PU["Pump Unit<br/>(Controller Node)"]
    end

    subgraph "Communication Layer"
        EN["ESP-NOW<br/>(Peer-to-Peer)"]
        MQTT["HiveMQ Cloud<br/>(MQTT Broker)"]
    end

    subgraph "Cloud Layer"
        SB["Supabase<br/>(Auth + Database)"]
    end

    subgraph "Application Layer"
        WEB["React Web App<br/>(Vite + TypeScript)"]
        CAP["Capacitor<br/>(Mobile Wrapper)"]
    end

    subgraph "End Users"
        BROWSER["Web Browser"]
        MOBILE["Mobile App"]
    end

    TU -->|"Sensor Data<br/>(level, temp, TDS)"| EN
    EN -->|"ESP-NOW Packet"| PU
    PU -->|"Publish sensor data"| MQTT
    PU -->|"Subscribe commands"| MQTT
    MQTT <-->|"WebSocket (WSS)"| WEB
    WEB <--> SB
    WEB --> BROWSER
    WEB --> CAP --> MOBILE

    style TU fill:#1a5276,stroke:#2980b9,color:#fff
    style PU fill:#1a5276,stroke:#2980b9,color:#fff
    style EN fill:#7d3c98,stroke:#9b59b6,color:#fff
    style MQTT fill:#7d3c98,stroke:#9b59b6,color:#fff
    style SB fill:#1e8449,stroke:#27ae60,color:#fff
    style WEB fill:#b9770e,stroke:#f39c12,color:#fff
    style CAP fill:#b9770e,stroke:#f39c12,color:#fff
```

---

## 3. System Architecture Diagram

```mermaid
C4Context
    title CUVOTO System Context Diagram

    Person(user, "System Operator", "Monitors water tanks and controls pumps")

    System(webapp, "CUVOTO Web App", "React/TypeScript SPA for real-time monitoring and motor control")

    System_Ext(hivemq, "HiveMQ Cloud", "Managed MQTT broker for real-time IoT messaging")
    System_Ext(supabase, "Supabase", "Auth, PostgreSQL database, and RLS policies")

    System(tankunit, "Tank Unit", "ESP32 sensor node: ultrasonic level, DS18B20 temp, TDS")
    System(pumpunit, "Pump Unit", "ESP32 controller: relay, WebUI, ESP-NOW receiver")

    Rel(user, webapp, "Uses", "HTTPS")
    Rel(webapp, hivemq, "Pub/Sub", "WSS :8884")
    Rel(webapp, supabase, "Auth & Data", "HTTPS")
    Rel(tankunit, pumpunit, "Sensor packets", "ESP-NOW")
    Rel(pumpunit, hivemq, "Publish/Subscribe", "MQTT")
```

---

## 4. Hardware Layer

### 4.1 Tank Unit (Sensor Node)

The Tank Unit is an ESP32 microcontroller positioned at the water tank. It reads sensor data and transmits it wirelessly to the Pump Unit.

**Sensors:**

| Sensor | Pin | Purpose |
|--------|-----|---------|
| HC-SR04 Ultrasonic (TRIG) | GPIO 5 | Water level measurement |
| HC-SR04 Ultrasonic (ECHO) | GPIO 18 | Water level measurement |
| DS18B20 Temperature | GPIO 4 | Water temperature (Celsius) |
| TDS Sensor (Analog) | GPIO 34 | Total Dissolved Solids (ppm) |

**Key Parameters:**

| Parameter | Value |
|-----------|-------|
| Tank Depth | 120 cm |
| Full Level (sensor-to-water) | 29.0 cm |
| Empty Level (sensor-to-water) | 155.0 cm |
| Filter Alpha (EMA) | 0.2 |
| Send Interval | 10,000 ms (10 sec) |
| Ultrasonic Samples | 7 (median filtered) |

**Data Packet Structure:**

```c
struct TankPacket {
    uint8_t  level;       // 0-100 (percentage)
    float    temperature; // Celsius
    int      tds;         // ppm (parts per million)
    uint32_t timestamp;   // millis()
};
```

### 4.2 Pump Unit (Controller Node)

The Pump Unit is an ESP32 that receives sensor data from the Tank Unit, makes pump control decisions, and serves a local WebUI for configuration.

**Hardware Pins:**

| Component | Pin | Purpose |
|-----------|-----|---------|
| Relay | GPIO 23 | Pump motor on/off |
| Status LED | GPIO 2 | Pump running indicator |
| Manual ON Button | GPIO 32 | Physical override (on) |
| Manual OFF Button | GPIO 33 | Physical override (off) |

**Operating Modes:**

| Mode | Behavior |
|------|----------|
| `AUTO` (0) | Pump ON when level <= low limit, OFF when level >= high limit |
| `MANUAL` (1) | User-controlled start/stop via WebUI or app |
| `TIMER` (2) | Pump ON during configured time window (supports overnight) |

**Safety Features:**

| Feature | Threshold |
|---------|-----------|
| Max Run Time | 3,600 sec (1 hour) |
| No-Data Timeout | 10,000 ms (10 sec) |
| Boot Behavior | Force pump OFF |

**Default Thresholds:**

| Setting | Default |
|---------|---------|
| Low Limit (pump ON) | 25% |
| High Limit (pump OFF) | 80% |
| Timer Start | 06:00 |
| Timer Stop | 07:00 |

**Persistence:** All settings are stored in ESP32 NVS (Non-Volatile Storage) via the `StateStore` class using the `Preferences` library. Settings survive power cycles.

### 4.3 Pump Simulator

A development/testing tool that simulates water level fluctuations and pump behavior without physical hardware. Runs on ESP32 with a WebUI for testing the control logic.

---

## 5. Communication Layer

### 5.1 ESP-NOW (Device-to-Device)

```mermaid
sequenceDiagram
    participant TU as Tank Unit (ESP32)
    participant PU as Pump Unit (ESP32)

    Note over TU: Every 10 seconds
    TU->>TU: Read ultrasonic (7 samples, median filter)
    TU->>TU: Read temperature (DS18B20)
    TU->>TU: Read TDS (analog)
    TU->>TU: Apply EMA smoothing (alpha=0.2)
    TU->>TU: Calculate level % from distance
    TU->>PU: ESP-NOW send TankPacket
    PU->>PU: Validate packet size
    PU->>PU: Update level, run autoDecision()
    PU->>PU: Control relay (GPIO 23)
```

- **Protocol:** ESP-NOW (Espressif peer-to-peer, no router needed)
- **Range:** ~200m line of sight
- **Packet Size:** ~12 bytes (TankPacket struct)
- **Peer MAC Address:** Hardcoded in Tank Unit config

### 5.2 MQTT (Device-to-Cloud)

The Pump Unit connects to HiveMQ Cloud over WiFi to bridge sensor data to the web application.

- **Broker:** `c54cee0865234335a45b7af73963eef8.s1.eu.hivemq.cloud`
- **Port:** 8884 (WSS - WebSocket Secure)
- **Protocol:** MQTT over WebSocket with TLS
- **Reconnect Period:** 5,000 ms

### 5.3 MQTT Topic Map

```mermaid
graph LR
    subgraph "Subscribe Topics (Web App receives)"
        T1["water/tank/level"]
        T2["water/tank/temperature"]
        T3["water/tank/tds"]
        T4["water/tank/motor/status"]
        T5["water/tank/device/status"]
        T6["water/tank/motor/ack"]
    end

    subgraph "Publish Topics (Web App sends)"
        T7["water/tank/motor/command"]
        T8["water/tank/motor/mode"]
    end

    PU["Pump Unit"] -->|"level %"| T1
    PU -->|"celsius"| T2
    PU -->|"ppm"| T3
    PU -->|"on/off"| T4
    PU -->|"online/offline"| T5
    PU -->|"ok/ack/success"| T6

    WEB["Web App"] -->|"start/stop"| T7
    WEB -->|"auto/manual"| T8

    style PU fill:#1a5276,stroke:#2980b9,color:#fff
    style WEB fill:#b9770e,stroke:#f39c12,color:#fff
```

**Topic Details:**

| Topic | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `water/tank/level` | Device -> App | `0-100` (number) | Water level percentage |
| `water/tank/temperature` | Device -> App | Float (Celsius) | Water temperature |
| `water/tank/tds` | Device -> App | Integer (ppm) | Salinity / TDS reading |
| `water/tank/motor/status` | Device -> App | `on`/`off`/`running`/`1`/`0` | Current motor state |
| `water/tank/device/status` | Device -> App | `online`/`offline`/`alive`/`1` | Heartbeat signal |
| `water/tank/motor/ack` | Device -> App | `ok`/`ack`/`success` | Command acknowledgment |
| `water/tank/motor/command` | App -> Device | `start`/`stop` | Motor start/stop command |
| `water/tank/motor/mode` | App -> Device | `auto`/`manual` | Operating mode change |

---

## 6. Cloud & Backend Layer

### 6.1 Supabase

Supabase provides authentication and the PostgreSQL database.

- **Project URL:** `https://ueeftkmequpcaujdvevx.supabase.co`
- **Features Used:** Auth (email/password, Google OAuth, OTP), PostgreSQL, Row-Level Security (RLS), Database Functions

**Database Tables:**

| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenant organization management |
| `profiles` | User profiles linked to auth.users |
| `invite_codes` | Organization invite codes for registration |

**Database Functions:**

| Function | Purpose |
|----------|---------|
| `use_invite_code(_code, _user_id)` | Validates invite code, increments usage, assigns user to org |
| `handle_new_user()` | Trigger: auto-creates profile on user signup |

### 6.2 HiveMQ Cloud

Managed MQTT broker for real-time IoT communication between ESP32 devices and the web application.

---

## 7. Frontend / Web Application

### 7.1 Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.3.x | UI framework |
| TypeScript | 5.8.x | Type safety |
| Vite | 5.4.x | Build tool & dev server |
| Tailwind CSS | 3.4.x | Utility-first styling |
| shadcn/ui | - | UI component library (Radix-based) |
| Framer Motion | 12.x | Animations |
| mqtt.js | 5.15.x | MQTT client (WebSocket) |
| @supabase/supabase-js | 2.99.x | Supabase client |
| React Router | 6.30.x | Client-side routing |
| TanStack React Query | 5.83.x | Server state management |
| Capacitor | 8.1.x | Native mobile app wrapper |
| Recharts | 2.15.x | Data visualization charts |
| Zod | 3.25.x | Schema validation |
| React Hook Form | 7.61.x | Form management |

### 7.2 Application Routes

```mermaid
graph TD
    ROOT["/ (Root)"] -->|"Redirect"| AUTH["/auth<br/>AuthPage"]
    AUTH -->|"Login Success"| DASH["/dashboard<br/>DashboardPage"]

    subgraph "Protected Routes (requires auth)"
        DASH
        TANKS["/tanks<br/>TanksPage"]
        ALERTS["/alerts<br/>AlertsPage"]
        PROFILE["/profile<br/>ProfilePage"]
    end

    NOTFOUND["/* (404)<br/>NotFound"]

    style AUTH fill:#e74c3c,stroke:#c0392b,color:#fff
    style DASH fill:#27ae60,stroke:#1e8449,color:#fff
    style TANKS fill:#27ae60,stroke:#1e8449,color:#fff
    style ALERTS fill:#27ae60,stroke:#1e8449,color:#fff
    style PROFILE fill:#27ae60,stroke:#1e8449,color:#fff
    style NOTFOUND fill:#95a5a6,stroke:#7f8c8d,color:#fff
```

**Page Descriptions:**

| Page | Route | Description |
|------|-------|-------------|
| AuthPage | `/auth` | Login (email/password + Google OAuth), Registration (with invite code), OTP verification |
| DashboardPage | `/dashboard` | Real-time water level gauge, salinity & temperature cards, motor controls, recent logs |
| TanksPage | `/tanks` | Overview of all tanks (level, capacity, status, salinity, temperature) |
| AlertsPage | `/alerts` | Filterable alert feed (critical, warning, info, resolved) grouped by date |
| ProfilePage | `/profile` | User profile, company info, account settings, logout |
| NotFound | `/*` | 404 error page |

### 7.3 Component Architecture

```mermaid
graph TD
    APP["App.tsx"]
    APP --> QCP["QueryClientProvider"]
    APP --> TTP["TooltipProvider"]
    APP --> TOAST1["Toaster (shadcn)"]
    APP --> TOAST2["Sonner (toast)"]
    APP --> BR["BrowserRouter"]
    BR --> AUTHPROV["AuthProvider (Context)"]
    AUTHPROV --> ROUTES["Routes"]

    ROUTES --> R_AUTH["AuthPage"]
    ROUTES --> R_DASH["ProtectedRoute > DashboardPage"]
    ROUTES --> R_TANKS["ProtectedRoute > TanksPage"]
    ROUTES --> R_ALERTS["ProtectedRoute > AlertsPage"]
    ROUTES --> R_PROFILE["ProtectedRoute > ProfilePage"]

    R_DASH --> MC["MotorControl"]
    R_DASH --> BN1["BottomNav"]
    R_DASH --> MQTT_HOOK["useMQTT Hook"]

    R_TANKS --> BN2["BottomNav"]
    R_ALERTS --> BN3["BottomNav"]
    R_PROFILE --> BN4["BottomNav"]

    MQTT_HOOK --> MQTT_CLIENT["mqtt.js Client"]
    MQTT_CLIENT --> HIVEMQ["HiveMQ Cloud (WSS)"]

    AUTHPROV --> SUPA["Supabase Client"]

    style APP fill:#2c3e50,stroke:#34495e,color:#fff
    style AUTHPROV fill:#8e44ad,stroke:#9b59b6,color:#fff
    style MQTT_HOOK fill:#2980b9,stroke:#3498db,color:#fff
    style HIVEMQ fill:#16a085,stroke:#1abc9c,color:#fff
    style SUPA fill:#27ae60,stroke:#2ecc71,color:#fff
```

---

## 8. Data Flow Diagrams

### 8.1 Sensor Data Flow

```mermaid
flowchart LR
    subgraph "Tank Unit (ESP32)"
        US["Ultrasonic Sensor<br/>HC-SR04"] --> |"7 samples"| MF["Median Filter"]
        MF --> EMA1["EMA Smoothing<br/>(alpha=0.2)"]
        TS["Temp Sensor<br/>DS18B20"] --> EMA2["EMA Smoothing"]
        TDS["TDS Sensor<br/>(Analog)"] --> EMA3["EMA Smoothing"]
        EMA1 --> LC["Level Calc<br/>(distance -> %)"]
        LC --> PKT["TankPacket"]
        EMA2 --> PKT
        EMA3 --> PKT
    end

    PKT -->|"ESP-NOW<br/>(every 10s)"| RECV["Pump Unit<br/>onRecv()"]

    subgraph "Pump Unit (ESP32)"
        RECV --> UL["updateLevel()"]
        RECV --> AD["autoDecision()"]
        AD --> RELAY["Relay<br/>GPIO 23"]
        UL --> MQTT_PUB["MQTT Publish"]
    end

    MQTT_PUB -->|"WSS :8884"| BROKER["HiveMQ Cloud"]

    BROKER -->|"WSS"| HOOK["useMQTT Hook"]

    subgraph "React Web App"
        HOOK --> SD["SensorData State"]
        SD --> GAUGE["Water Level Gauge"]
        SD --> CARDS["Salinity & Temp Cards"]
        SD --> MCTRL["Motor Control UI"]
    end

    style US fill:#1a5276,color:#fff
    style TS fill:#1a5276,color:#fff
    style TDS fill:#1a5276,color:#fff
    style RELAY fill:#c0392b,color:#fff
    style BROKER fill:#7d3c98,color:#fff
    style GAUGE fill:#b9770e,color:#fff
    style CARDS fill:#b9770e,color:#fff
    style MCTRL fill:#b9770e,color:#fff
```

### 8.2 Motor Command Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as React Web App
    participant MQTT as HiveMQ Cloud (MQTT)
    participant PU as Pump Unit (ESP32)
    participant Relay as Relay (GPIO 23)

    User->>UI: Tap "Start Motor" button
    Note over UI: motorMode must be "manual"<br/>device must be online
    UI->>UI: setMotorCommandStatus("pending")
    UI->>MQTT: Publish "water/tank/motor/command" = "start"
    UI->>UI: Start 8s timeout

    MQTT->>PU: Deliver command
    PU->>PU: manualOn()
    PU->>Relay: digitalWrite(HIGH)
    PU->>MQTT: Publish "water/tank/motor/ack" = "ok"
    PU->>MQTT: Publish "water/tank/motor/status" = "on"

    MQTT->>UI: Receive "water/tank/motor/ack" = "ok"
    UI->>UI: clearTimeout, setMotorCommandStatus("success")
    Note over UI: Show "Command acknowledged" for 3s

    MQTT->>UI: Receive "water/tank/motor/status" = "on"
    UI->>UI: Update sensorData.motorRunning = true

    alt Timeout (no ack in 8s)
        UI->>UI: setMotorCommandStatus("error")
        Note over UI: Show "No response from device" for 3s
    end
```

### 8.3 User Authentication Flow

```mermaid
flowchart TD
    START["User visits /auth"] --> CHOICE{Login or Register?}

    CHOICE -->|"Login"| LOGIN_FORM["Email + Password Form"]
    CHOICE -->|"Register"| REG_FORM["Invite Code + Email + Password Form"]
    CHOICE -->|"Google"| GOOGLE["Google OAuth via Lovable"]

    LOGIN_FORM --> LOGIN_API["supabase.auth.signInWithPassword()"]
    LOGIN_API -->|"Success"| DASHBOARD["/dashboard"]
    LOGIN_API -->|"Error"| LOGIN_ERR["Show error toast"]

    REG_FORM --> VALIDATE["Validate invite code<br/>(query invite_codes table)"]
    VALIDATE -->|"Invalid"| REG_ERR["Show 'Invalid invite code' toast"]
    VALIDATE -->|"Valid"| SIGNUP["supabase.auth.signUp()"]
    SIGNUP --> OTP["OTP Verification Screen"]
    OTP --> VERIFY["supabase.auth.verifyOtp()"]
    VERIFY -->|"Success"| APPLY["use_invite_code() RPC<br/>(assign org to user)"]
    APPLY --> DASHBOARD

    GOOGLE -->|"Success"| DASHBOARD
    GOOGLE -->|"Error"| GOOGLE_ERR["Show error toast"]

    DASHBOARD --> PROTECTED["ProtectedRoute checks session"]
    PROTECTED -->|"No session"| START

    style START fill:#3498db,color:#fff
    style DASHBOARD fill:#27ae60,color:#fff
    style LOGIN_ERR fill:#e74c3c,color:#fff
    style REG_ERR fill:#e74c3c,color:#fff
    style GOOGLE_ERR fill:#e74c3c,color:#fff
```

---

## 9. Database Schema

```mermaid
erDiagram
    ORGANIZATIONS {
        uuid id PK
        text name
        timestamptz created_at
    }

    PROFILES {
        uuid id PK "FK -> auth.users"
        text email
        text display_name
        uuid organization_id FK
        timestamptz created_at
    }

    INVITE_CODES {
        uuid id PK
        text code UK
        uuid organization_id FK
        uuid created_by FK "FK -> auth.users"
        int max_uses
        int current_uses
        boolean is_active
        timestamptz created_at
    }

    AUTH_USERS {
        uuid id PK
        text email
    }

    ORGANIZATIONS ||--o{ PROFILES : "has members"
    ORGANIZATIONS ||--o{ INVITE_CODES : "has invite codes"
    AUTH_USERS ||--|| PROFILES : "has profile"
    AUTH_USERS ||--o{ INVITE_CODES : "created by"
```

**Row-Level Security (RLS) Policies:**

| Table | Policy | Rule |
|-------|--------|------|
| `profiles` | Users can read own profile | `auth.uid() = id` |
| `profiles` | Users can update own profile | `auth.uid() = id` |
| `profiles` | Users can insert own profile | `auth.uid() = id` |
| `organizations` | Members can read their org | Profile must have matching `organization_id` |
| `invite_codes` | Authenticated can read active codes | `is_active = true` |
| `invite_codes` | Anon can read active codes | `is_active = true` (for signup validation) |

---

## 10. Deployment Architecture

```mermaid
graph TB
    subgraph "User Devices"
        BROWSER["Web Browser<br/>(Any modern browser)"]
        ANDROID["Android App<br/>(Capacitor)"]
        IOS["iOS App<br/>(Capacitor)"]
    end

    subgraph "Hosting"
        LOVABLE["Lovable.dev<br/>(Static hosting)"]
    end

    subgraph "Cloud Services"
        SUPABASE["Supabase Cloud<br/>(PostgreSQL + Auth)"]
        HIVEMQ["HiveMQ Cloud<br/>(MQTT Broker)"]
    end

    subgraph "On-Premise (Customer Site)"
        WIFI["Local WiFi Router"]
        PU_HW["Pump Unit ESP32<br/>(192.168.x.x)"]
        TU_HW["Tank Unit ESP32"]
        PUMP["Water Pump<br/>(Relay-controlled)"]
        TANK["Water Tank<br/>(with sensors)"]
    end

    BROWSER --> LOVABLE
    ANDROID --> LOVABLE
    IOS --> LOVABLE

    LOVABLE -->|"HTTPS"| SUPABASE
    LOVABLE -->|"WSS :8884"| HIVEMQ

    HIVEMQ <-->|"MQTT over WiFi"| PU_HW
    PU_HW <-->|"ESP-NOW"| TU_HW
    PU_HW -->|"Relay"| PUMP
    TU_HW -->|"Sensors"| TANK

    PU_HW -.->|"Local WebUI<br/>(port 80)"| WIFI
    WIFI -.-> BROWSER

    style LOVABLE fill:#e67e22,color:#fff
    style SUPABASE fill:#27ae60,color:#fff
    style HIVEMQ fill:#8e44ad,color:#fff
    style PU_HW fill:#2c3e50,color:#fff
    style TU_HW fill:#2c3e50,color:#fff
    style PUMP fill:#c0392b,color:#fff
    style TANK fill:#2980b9,color:#fff
```

**Build & Deploy:**

| Component | Build Tool | Target |
|-----------|-----------|--------|
| Web App | Vite (`npm run build`) | Static files -> Lovable.dev |
| Android App | Capacitor + Gradle | APK/AAB |
| iOS App | Capacitor + Xcode | IPA |
| Tank Unit Firmware | PlatformIO (ESP32) | Flash via USB/OTA |
| Pump Unit Firmware | PlatformIO (ESP32) | Flash via USB/OTA |

---

## 11. Security Considerations

| Area | Implementation |
|------|---------------|
| **Authentication** | Supabase Auth (email/password, Google OAuth, OTP) |
| **Authorization** | Row-Level Security (RLS) on all database tables |
| **Invite System** | Organization invite codes with usage limits and deactivation |
| **MQTT Transport** | TLS/SSL via WSS (port 8884) |
| **Database Functions** | `SECURITY DEFINER` for sensitive operations (invite code usage) |
| **Session Management** | Supabase handles JWT tokens, auto-refresh, localStorage persistence |
| **Protected Routes** | React `ProtectedRoute` component checks session before rendering |

---

## 12. Component Interaction Diagram

```mermaid
graph LR
    subgraph "Tank Unit Modules"
        S["Sensors.h"] --> M1["main.cpp"]
        EC["EspNowComm.h"] --> M1
        DP1["DataPacket.h"] --> M1
        CF1["config.h"] --> M1
        L1["Logger.h"] --> M1
    end

    subgraph "Pump Unit Modules"
        M2["main.cpp"]
        PC["PumpController.h"] --> M2
        SS["StateStore.h"] --> PC
        WU["WebUI.h"] --> M2
        RTC["DS3231_Simple.h"] --> M2
        DP2["DataPacket.h"] --> M2
        CF2["config.h"] --> M2
        L2["Logger.h"] --> M2
    end

    subgraph "Web App Modules"
        MAIN["main.tsx"] --> APP["App.tsx"]
        APP --> AUTHCTX["AuthContext"]
        APP --> PAGES["Pages"]
        PAGES --> HOOKS["useMQTT"]
        PAGES --> COMPS["Components"]
        AUTHCTX --> SUPA_CLIENT["Supabase Client"]
        HOOKS --> MQTT_LIB["mqtt.js"]
    end

    M1 -->|"ESP-NOW"| M2
    M2 -->|"MQTT"| MQTT_LIB

    style M1 fill:#1a5276,color:#fff
    style M2 fill:#1a5276,color:#fff
    style APP fill:#b9770e,color:#fff
```

---

## 13. State Machine Diagrams

### 13.1 Pump Controller State Machine

```mermaid
stateDiagram-v2
    [*] --> OFF : Boot (forceOff)

    state "AUTO Mode" as AUTO {
        OFF --> ON : level <= lowLimit
        ON --> OFF : level >= highLimit
    }

    state "MANUAL Mode" as MANUAL {
        OFF --> ON : manualOn() / MQTT "start"
        ON --> OFF : manualOff() / MQTT "stop"
    }

    state "TIMER Mode" as TIMER {
        OFF --> ON : Current time in window
        ON --> OFF : Current time outside window
    }

    state "Safety Overrides" as SAFETY {
        ON --> OFF : No data > 10s
        ON --> OFF : Run time > 1 hour
    }

    note right of AUTO
        Default mode.
        Thresholds configurable
        via WebUI (25%-80% default).
    end note
```

### 13.2 MQTT Connection State Machine

```mermaid
stateDiagram-v2
    [*] --> Connecting : mqtt.connect()

    Connecting --> Connected : "connect" event
    Connecting --> Error : "error" event

    Connected --> Subscribed : Subscribe to 6 topics
    Subscribed --> Receiving : Messages arrive
    Receiving --> Receiving : Parse & update SensorData

    Connected --> Offline : "offline" event
    Offline --> Reconnecting : Auto-reconnect (5s)
    Reconnecting --> Connected : Reconnect success
    Reconnecting --> Error : Reconnect failure

    Error --> Reconnecting : Auto-retry

    note right of Subscribed
        Topics:
        - water/tank/level
        - water/tank/temperature
        - water/tank/tds
        - water/tank/motor/status
        - water/tank/device/status
        - water/tank/motor/ack
    end note
```

### 13.3 Motor Command State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle

    Idle --> Pending : publishMotorCommand()
    Pending --> Success : Receive "ack" = ok/success
    Pending --> Error : 8s timeout (no ack)
    Pending --> Error : Receive "ack" = failure

    Success --> Idle : After 3s
    Error --> Idle : After 3s
```

---

## Repository Structure

```
cuvoto-web-spark/           # Web Application (this repo)
├── src/
│   ├── App.tsx             # Root component with routing
│   ├── main.tsx            # Entry point
│   ├── components/
│   │   ├── BottomNav.tsx   # Bottom navigation bar
│   │   ├── NavLink.tsx     # Navigation link component
│   │   ├── ProtectedRoute.tsx  # Auth guard wrapper
│   │   ├── dashboard/
│   │   │   └── MotorControl.tsx  # Motor control panel
│   │   └── ui/             # shadcn/ui components
│   ├── contexts/
│   │   └── AuthContext.tsx  # Supabase auth context provider
│   ├── hooks/
│   │   ├── useMQTT.ts      # MQTT connection & sensor data hook
│   │   ├── use-mobile.tsx   # Mobile detection hook
│   │   └── use-toast.ts    # Toast notification hook
│   ├── integrations/
│   │   ├── supabase/
│   │   │   ├── client.ts   # Supabase client init
│   │   │   └── types.ts    # Auto-generated DB types
│   │   └── lovable/
│   │       └── index.ts    # Lovable cloud auth integration
│   └── pages/
│       ├── AuthPage.tsx    # Login / Register / OTP
│       ├── DashboardPage.tsx  # Main dashboard with gauge
│       ├── TanksPage.tsx   # All tanks overview
│       ├── AlertsPage.tsx  # Alerts & notifications
│       ├── ProfilePage.tsx # User profile & settings
│       └── NotFound.tsx    # 404 page
├── supabase/
│   └── migrations/         # SQL migration files
├── public/                 # Static assets
├── capacitor.config.json   # Mobile app config
├── tailwind.config.ts      # Tailwind CSS configuration
├── vite.config.ts          # Vite build configuration
└── package.json            # Dependencies & scripts

water-system/               # Hardware Firmware (separate repo)
└── cuvoto_tank/
    ├── tank-unit/          # Sensor node firmware
    │   ├── src/main.cpp
    │   ├── include/
    │   │   ├── config.h       # Pin definitions & constants
    │   │   ├── Sensors.h      # Ultrasonic, temp, TDS drivers
    │   │   ├── EspNowComm.h   # ESP-NOW sender
    │   │   ├── DataPacket.h   # Packet structure
    │   │   └── Logger.h       # Debug logging
    │   └── platformio.ini
    ├── pump-unit/          # Controller node firmware
    │   ├── src/main.cpp
    │   ├── include/
    │   │   ├── config.h       # Pin definitions, modes, safety
    │   │   ├── PumpController.h  # Pump logic (auto/manual/timer)
    │   │   ├── StateStore.h   # NVS persistence
    │   │   ├── WebUI.h        # Local web interface
    │   │   ├── DS3231_Simple.h  # RTC for timer mode
    │   │   ├── DataPacket.h   # Packet structure
    │   │   └── Logger.h       # Debug logging
    │   └── platformio.ini
    └── pump-simulator/     # Development simulator
        ├── src/
        │   ├── main.cpp
        │   ├── PumpController.h
        │   ├── PumpController.cpp
        │   └── WebUI.h
        └── platformio.ini
```

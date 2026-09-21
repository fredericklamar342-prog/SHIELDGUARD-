# ShieldGuard console

React + TypeScript verification console for the ShieldGuard agent. It polls the backend and shows
what the agent has actually processed — it never invents data.

```bash
npm install
npm run dev      # http://localhost:5173
```

Requires the backend on `http://localhost:8787` (see the root README). Point it elsewhere with a
`VITE_API_BASE` environment variable.

## What it shows

- **Agent identity** — Agent #358, ERC-8004 registration, GOAT Testnet3, full operator wallet with copy.
- **Service panels** — latest result, request count and last check time for Orbital Risk and Agent Trust.
- **Verification volume** — checks observed, completed, distinct requesters, oldest record in view.
- **Recent verification activity** — the core table: time, service, result, key figures (min distance +
  NORAD pair, or reputation score + registration), requester and x402 payment hash.

States are designed for all four conditions: **live**, **offline**, **empty** and **loading**
(skeleton rows, no spinner). When the backend is unreachable the console keeps the last known rows but
marks them as not current, and shows an offline status with a retry action.

## Layout

```
src/
├── App.tsx                 polling → layout composition
├── index.css               design tokens (colour, spacing, type) + reset
├── App.css                 layout and component styles
├── hooks/useChecks.ts      GET /v1/checks every 4s; live / offline / connecting
├── types/checks.ts         API contract types
├── lib/
│   ├── checks.ts           defensive parsing, result badges, summary derivations
│   ├── format.ts           addresses, distances, relative and UTC timestamps
│   └── identity.ts         agent identity constants
└── components/             Header, AgentIdentity, ServicePanel, MetricsBar,
                            ActivityTable, Copyable, StatusBadge
```

## Scripts

```bash
npm run dev       # dev server with HMR
npm run build     # tsc -b && vite build
npm run lint      # eslint
npm run preview   # serve the production build
```

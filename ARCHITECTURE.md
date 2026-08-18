# Architecture

## Overview
ShieldGuard is an agent that sells two services to other onchain agents, gated by x402 micropayments.

## Components

### Backend
Node.js/TypeScript service exposing endpoints for:
- Risk assessment requests (orbital)
- Trust verification requests (data source)

### AgentKit Integration
- **EvmWalletProvider** — wallet/signing
- **ActionProvider (custom)** — exposes ShieldGuard's two services as agent actions
- **PolicyEngine** — enforces payment/access policy per request
- **ExecutionRuntime** — orchestrates request → compute → response cycle

### Database (PostgreSQL)
- `checks` — record of each risk/trust check performed
- `tle_cache` — cached Celestrak TLE data
- `agent_trust` — reputation scores per agent (ERC-8004 linked)

### Identity & Payments
- **ERC-8004** — onchain identity registration + reputation scoring (testnet)
- **x402** — micropayment gate in front of both services

### Frontend
React dashboard for grant reviewers — shows live transactions and risk assessments as they happen.

## Build order
Backend logic → Database → ERC-8004 identity → x402 payment gating → Frontend

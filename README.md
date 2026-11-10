# BalanceVault — Money Movement with a Ledger You Can Prove

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-cyan.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.14-indigo.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)

BalanceVault is a secure financial account management web application designed for high-integrity fund movement, strict server-side Role-Based Access Control (RBAC), user onboarding workflows, and an immutable, cryptographically verifiable audit trail.

---

## The Problem
Managing financial accounts and their associated operations requires far more than merely storing records in a database. It demands:
1. **Controlled Access & Identity Isolation:** Ensuring that only authorized account holders and compliance administrators can execute or review transactions.
2. **Double-Entry Consistency & Invariant Preservation:** Preventing partial transfers, negative account states, and phantom fund creation.
3. **Provable Auditability:** Traditional audit logs can be manipulated by malicious actors or database admins. BalanceVault solves this by computing a cryptographic SHA-256 hash chain across every ledger entry, enabling anyone to mathematically prove that no ledger block or balance has been modified, inserted, or deleted.

---

## What I Built
The system provides a production-grade full-stack architecture:
* **React Frontend:** A responsive dashboard built with React 18, Vite, and Tailwind CSS, featuring real-time balance tracking, transfer modals with idempotency keys, KYC onboarding workflows, and an interactive **Provable Ledger Inspector**.
* **Node.js REST API Backend:** Structured layered architecture with TypeScript, Express, Zod validation, and error handling.
* **Cryptographic Provable Ledger Engine:** Every credit and debit entry is chained via SHA-256 (`prevHash + entryIndex + transactionId + accountId + amount + balanceAfter + timestamp`). Provides instant mathematical verification (`/api/ledger/verify`) and downloadable proof certificates (`/api/ledger/proof/:txId`).
* **PostgreSQL with Prisma ORM:** Relational schema enforcing foreign-key integrity, ACID transaction blocks, and indexing.
* **PostgreSQL Role Privileges & Stored Procedures:** Dedicated database roles (`balancevault_owner`, `balancevault_app`, `balancevault_operator`, `balancevault_auditor`) and a `SECURITY DEFINER` bootstrap function ensuring least privilege.
* **Authentication & Role-Based Access Control (RBAC):** JWT session management and route guards supporting `ADMIN`, `ACCOUNT_HOLDER`, and `AUDITOR` personas.
* **Admin Compliance Operations:** Searchable user directory, onboarding approval/rejection workflows, role adjustments, and immutable security audit logs.
* **Redis Integration & Rate Limiting:** Distributed rate limiting with Redis store and seamless automatic fallback to in-memory protection if Redis is unconfigured or offline.
* **Liveness & Readiness Health Probes:** Production-ready `/health` and `/ready` endpoints verifying database ping and Redis connectivity.
* **First-Admin Bootstrap Process:** Both CLI (`npm run admin:bootstrap`) and protected Web UI bootstrap routes guarded by `BOOTSTRAP_SECRET`.

---

## System Architecture

```
                      +---------------------------------------+
                      |       React 18 + Vite Frontend        |
                      |  (Dashboard, Admin Portal, Verifier)  |
                      +-------------------+-------------------+
                                          |
                                          | REST / JSON (Bearer JWT)
                                          v
                      +---------------------------------------+
                      |         Node.js Express Backend       |
                      |  (Auth, RBAC, Controllers, Services)  |
                      +---------+-------------------+---------+
                                |                   |
                 Rate Limiting  |                   |  ACID Transactions
                                v                   v
                     +--------------+     +-------------------+
                     |  Redis Store |     | PostgreSQL (Neon) |
                     | (or Fallback)|     |  (Prisma ORM)     |
                     +--------------+     +---------+---------+
                                                    |
                                                    v
                                      +---------------------------+
                                      | Cryptographic SHA-256     |
                                      | Hash-Chained Provable     |
                                      | Ledger Entries            |
                                      +---------------------------+
```

---

## How to Run It

### Prerequisites
* **Node.js** (v18+ or v20+)
* **npm** (v9+)
* **PostgreSQL** (local instance, Docker, or [Neon Cloud](https://neon.tech))
* **Redis** (optional, Docker or local; memory fallback is built-in)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/thripura214/BalanceVault-money-movement-with-a-ledger-you-can-prove.git
cd BalanceVault-money-movement-with-a-ledger-you-can-prove
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` into `backend/.env`:
```bash
cp .env.example backend/.env
```
Ensure your `DATABASE_URL` is set to your PostgreSQL connection string.

### 3. Generate Prisma Client & Run Migrations
```bash
# Generate the Prisma Client
npm run db:generate

# Apply migrations to your configured database
npm run db:migrate

# (Optional) Seed realistic synthetic demonstration data
npm run db:seed
```

### 4. (Optional) Run PostgreSQL & Redis via Docker
If you do not have local database instances, spin them up with Docker:
```bash
docker compose up -d
```

### 5. Start the Development Servers
From the root directory, launch both the frontend and backend concurrently:
```bash
npm run dev
```
* **Frontend:** [http://localhost:5173](http://localhost:5173)
* **Backend API:** [http://localhost:5000](http://localhost:5000)
* **Health Check:** [http://localhost:5000/health](http://localhost:5000/health)
* **Readiness Check:** [http://localhost:5000/ready](http://localhost:5000/ready)

---

## Demo Accounts (From Seed)

| Role | Email | Password | Account Number | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin@balancevault.com` | `Admin@Vault2026` | — | Full User Management, KYC Approvals, Audit Logs |
| **Auditor** | `auditor@balancevault.com` | `User@Vault2026` | — | Read-only Audit Logs & Cryptographic Verification |
| **Account Holder** | `alice@example.com` | `User@Vault2026` | `BV-100201` | Balance: $5,000.00 — Send / Receive / Deposit |
| **Account Holder** | `bob@example.com` | `User@Vault2026` | `BV-100202` | Balance: $2,500.00 — Send / Receive / Deposit |
| **Pending User** | `charlie@example.com` | `User@Vault2026` | `BV-100203` | Pending KYC Onboarding Review |

---

## First-Administrator Bootstrap

To bootstrap the initial administrator account on a fresh database:

### Option A: CLI Bootstrap Script
```bash
npm run admin:bootstrap
```
This script checks for existing administrators, validates the security constraints, hashes the administrator credentials, records the action in `audit_logs`, and outputs the credentials.

### Option B: API / Web Interface Bootstrap
1. Navigate to [http://localhost:5173](http://localhost:5173)
2. Click **Bootstrap Admin** on the bottom right of the login screen.
3. Supply the `BOOTSTRAP_SECRET` configured in `backend/.env`.

---

## Verifying the Provable Ledger

To run automated verification of the cryptographic chain from the terminal:
```bash
npm run ledger:verify
```

Or run the cryptographic unit tests:
```bash
npm test
```

You can also use the web interface under the **Ledger Proof** tab:
1. Click **Ledger Proof** in the navigation bar.
2. Review the live status of the SHA-256 chain.
3. Paste any transaction ID or click any recent block to inspect the cryptographic certificate proving:
   * Block sequence continuity
   * Hash link validity (`prevHash` matching prior block's `hash`)
   * Mathematical balance arithmetic ($balance_{after} = balance_{before} \pm amount$)

---

## AI Tools I Used
* **ChatGPT:** Technical architecture discussions, conceptual debugging, and deployment configuration troubleshooting.
* **OpenAI Codex in VS Code:** Initial code implementation scaffolding and TypeScript interface review.

---

## What the AI Got Wrong, and What I Fixed Myself
During deployment, AI initially confused database role membership with permission to administer another PostgreSQL role.
It suggested changing a role password through the project-owner connection, but Neon rejected the operation with `SQLSTATE 42501` (permission denied).

I investigated the actual PostgreSQL role configuration and discovered that:
1. The bootstrap login existed and had login permission.
2. It had membership in the bootstrap operator role.
3. The membership allowed `SET ROLE`.
4. The bootstrap operator had permission to execute the admin bootstrap function.

This showed that the original permission assumptions were incomplete. Instead of blindly granting broader database superuser privileges, I inspected the role memberships, function permissions, and bootstrap implementation to narrow down the failure.
I resolved this by implementing a `SECURITY DEFINER` PostgreSQL function (`bootstrap_admin_account`) and isolating permissions strictly through role memberships rather than direct role modification.

**Key takeaway:** AI-generated suggestions must always be validated against the specific database engine configuration, privilege models, and execution environment.

---

## Work Completed & Verification Matrix

* [x] **First-Admin Bootstrap Process:** Implemented via CLI (`scripts/bootstrap-admin.ts`) and secured endpoint with token validation. Verified end-to-end.
* [x] **Admin Login Flow:** Verified against the backend API and React authentication context.
* [x] **Account Registration & Onboarding:** Complete workflow allowing registration, initial account allocation, KYC document submission, and admin approval/rejection.
* [x] **Admin User Management & Audit Logs:** Searchable directory, one-click onboarding approval/suspension, and comprehensive audit logs.
* [x] **Provable Ledger & Verification:** Cryptographic SHA-256 chained ledger with mathematical proof verification and tamper-detection engine.
* [x] **Deployment Monitoring & Reliability:** Health `/health` and readiness `/ready` endpoints with database latency tracking and Redis fallback.

---

## License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
*Disclaimer: BalanceVault is created as a demonstration project using synthetic data for the Snovasys Fresher Hiring Challenge and is not intended for live production financial custody.*

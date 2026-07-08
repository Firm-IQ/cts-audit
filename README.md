# Know Your Book™

An internal password-protected web application built for **Continuity Transition Services (CTS)**. This platform allows internal transition consultants to input advisor information gathered from discovery calls, calculate the multi-dimensional **Know Your Book™ Index**, visualize score profiles, and generate print-ready PDF assessment deliverables.

---

## Technical Stack

- **Framework:** Next.js 15 (App Router, React 19)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 & custom CSS print sheets
- **Database ORM:** Prisma Client v6
- **Database Engines:** SQLite (Local Development) / PostgreSQL (Production)
- **Data Visualization:** Recharts (Interactive benchmarking & spider-chart matrices)
- **Security:** Session cookies with secure JWT authentication validated in Next.js Middleware

---

## Getting Started (Local Development)

### 1. Prerequisites
Ensure you have **Node.js (v18+)** and **npm** installed on your system.

### 2. Clone and Install Dependencies
Install all packages, including development packages:
```bash
npm install
```

### 3. Environment Variables Configuration
The project is configured out-of-the-box to use local SQLite. Create a `.env` file in the root directory (one is pre-configured during setup):
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="continuity-transition-readiness-audit-jwt-secret-key-987654321"
ADMIN_EMAIL="admin@cts.com"
ADMIN_PASSWORD="adminpassword"
```

### 4. Database Setup & Seeding
Run initial Prisma migrations to generate the SQLite database file (`dev.db`) and seed the initial administrator credentials along with three mock advisor assessments (Ready, Advisory, and Critical):
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Start the Development Server
Run the local next server:
```bash
npm run dev
```
Open your browser and navigate to [http://localhost:3000](http://localhost:3000). You will be automatically redirected to the `/login` screen.

---

## Testing Credentials

Use the seeded internal auditor credentials to access the dashboard:
- **Email:** `admin@cts.com`
- **Password:** `adminpassword`

---

## Deployment to Render (Production PostgreSQL)

To deploy this application to Render with a production PostgreSQL database, follow these steps:

### 1. Provision a PostgreSQL Database on Render
- In your Render Dashboard, click **New +** and select **PostgreSQL**.
- Name the database, select a region close to your deployment, and click **Create Database**.
- Once provisioned, copy the **Internal Database URL** or **External Database URL**.

### 2. Modify Prisma Provider (SQLite to PostgreSQL)
To tell Prisma to target a PostgreSQL database instead of SQLite, modify the `datasource` block in `prisma/schema.prisma` before deploying:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```
*Note: Make sure to commit this change to your repository.*

### 3. Deploy the Next.js Web Service on Render
- In Render, click **New +** and select **Web Service**.
- Connect your GitHub repository containing this codebase.
- Configure the service settings:
  - **Runtime:** `Node`
  - **Build Command:** `npm run build`
  - **Start Command:** `npm run start`
- Under **Advanced / Environment Variables**, add:
  - `DATABASE_URL` (Set this to your Render PostgreSQL connection string)
  - `JWT_SECRET` (A strong random secret string for signing session tokens)
  - `ADMIN_EMAIL` (Your desired admin login email)
  - `ADMIN_PASSWORD` (Your desired admin login password)
- Render will trigger a build, run migrations, and spin up your application instance. On start, the seeding script runs automatically to ensure the initial auditor user is created.

---

## Know Your Book™ Index Framework

Know Your Book™ Index scores are mapped on a 0-100% scale and categorized into three risk bands:
- **Ready / Low Risk (80 - 100%):** Practice is ready to transfer immediately. Proceed with standard transition schedules.
- **Advisory / Moderate Risk (60 - 79%):** Identified administrative, data quality, or KYC gaps. Requires 1-3 months of data cleanup.
- **Critical / High Risk (0 - 59%):** Serious document storage, client record, or legal protocol issues. Requires direct intervention before moving.

### Weighted Scoring Categories:
1. **Client Data Readiness (20% Weight):** Measures email/phone/address completeness, CRM householding grouping quality, and duplicate records risk.
2. **KYC & Documentation (25% Weight):** Assesses update frequencies of KYC information, trusted contact agreements, beneficiary reviews, and missing signatures.
3. **Transfer Complexity (15% Weight):** Calculates difficulty of transitioning assets based on account types (Trusts, IRAs, Corporates), annuity/alternative asset exposure, and direct-held business.
4. **Operational Readiness (15% Weight):** Benchmarks support staff operational bandwidth, CRM extraction quality, task management, and digital signature adoption.
5. **Compliance & Legal Awareness (15% Weight):** Assesses broker-dealer protocol membership status, restrictive employment contract reviews, and transition legal reviews.
6. **Client Communication Plan (10% Weight):** Tracks preparedness of client announcement notifications and scheduling sequences.

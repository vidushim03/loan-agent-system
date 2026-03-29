# Loan Agent System

Loan Agent System is a full-stack loan operations app built with Next.js, TypeScript, Supabase, and Groq. It combines conversational loan intake with rule-based underwriting, live application tracking, document workflows, and sanction-letter generation.

## What the project does

A user can sign in, start a guided loan conversation, submit the details needed for KYC and credit checks, and receive an underwriting decision. Once an application is approved, the system creates a document checklist and moves the case through review until a sanction letter is generated.

The app now behaves more like a real internal lending workflow than a simple chatbot demo:
- chat intake creates real application records
- KYC and credit checks can use Supabase-backed profile data
- underwriting rules are policy-backed and auditable
- approved applications create required document records
- reviewer and admin roles can verify or reject submitted documents
- sanction-letter generation updates the application lifecycle

## Main features

- Conversational loan intake with stage-based orchestration
- PAN-based KYC verification flow
- Credit profile lookup with live-table-first fallback logic
- Rule-based underwriting with policy version tracking
- Application lifecycle states from draft to completed
- Document operations for customers, reviewers, and admins
- PDF sanction-letter generation
- Supabase authentication, database access, and row-level security
- Audit logging for agent usage and stage transitions
- Unit tests for calculations and underwriting logic

## Tech stack

Frontend
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui components

Backend
- Next.js route handlers
- Supabase PostgreSQL and Auth
- Groq API

Supporting libraries
- `@supabase/ssr`
- `pdfkit`
- `tsx`

## Product workflow

1. User signs up and logs in
2. User starts a loan conversation in `/chat`
3. The orchestrator collects PAN, employment, income, loan request, and obligations
4. KYC and credit checks run
5. Underwriting creates a decision using the active policy
6. Approved applications move into document collection
7. Reviewer or admin verifies uploaded documents
8. Sanction letter is generated and the case can move to `completed`

## Routes

Protected routes
- `/chat` for conversational intake
- `/applications` for live case management and uploads
- `/documents` for document activity tracking
- `/settings` for account and environment readiness

API routes
- `/api/chat`
- `/api/agents/kyc`
- `/api/agents/credit`
- `/api/agents/underwriting`
- `/api/agents/document`
- `/api/applications/documents`

## Database tables

Core tables used by the app
- `user_profiles`
- `kyc_profiles`
- `credit_profiles`
- `underwriting_policies`
- `loan_applications`
- `application_documents`
- `conversation_logs`
- `agent_audit_logs`

## How to run locally

1. Clone the repo
```bash
git clone https://github.com/vidushim03/loan-agent-system.git
cd loan-agent-system
```

2. Install dependencies
```bash
npm install
```

3. Create `.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GROQ_API_KEY=your_groq_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Run the database setup in Supabase SQL Editor
- [supabase-schema.sql](./supabase-schema.sql)
- [supabase-seed.sql](./supabase-seed.sql)

5. Start the app
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Test commands

```bash
npm run test:unit
npm run test:integration
npm run test:all
```

## Demo notes

Good demo PAN values already supported in the project include:
- `ABCDE1234F`
- `FGHIJ5678K`
- `BBBBB2222B`

A strong approval-style demo flow is:
- PAN: `ABCDE1234F`
- Employment: `Salaried`
- Monthly income: `75000`
- Loan request: `500000 for wedding over 36 months`
- Existing EMI: `12000`

## Current engineering quality

This version includes:
- real applications dashboard instead of hardcoded demo cards
- role-aware document review workflow
- policy-backed underwriting service
- automatic user profile provisioning in schema
- rate limiting and request validation on key APIs
- audit logging and conversation summaries
- dedicated documents and settings pages

## Resume-ready project summary

Built a full-stack AI-assisted loan underwriting platform using Next.js, TypeScript, Supabase, and Groq. Implemented conversational application intake, KYC and credit workflows, configurable underwriting rules, document verification lifecycle, and sanction-letter generation with production-minded auth, data, and testing improvements.

## Author

Vidushi Maheshwari
- GitHub: [vidushim03](https://github.com/vidushim03)

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).

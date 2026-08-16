# API Routes Documentation

All endpoints are served from the Next.js App Router under `/api`.

**Base URL:** `http://localhost:3000/api`

## Authentication

- `POST /api/agents/document` and `GET|POST|PATCH /api/applications/documents` require a signed-in Supabase user (session cookie).
- `POST /api/agents/underwriting` requires a `userId` and verifies it matches the authenticated session.
- The chat, KYC, credit, and Groq endpoints work without auth in local demo mode; when Supabase env vars are present they still validate the session where relevant.
- In demo mode (no env vars) all rule agents fall back to seeded mock data, so the app is fully runnable without external services.

---

## 1. Chat API

**Endpoint:** `POST /api/chat`

Purpose: process a user message and orchestrate the conversation flow. When a conversation reaches a final decision, the application record and required documents are persisted to Supabase automatically (when a user is signed in).

Request body:

```json
{
  "message": "I want to apply for a loan",
  "conversationState": {
    "stage": "greeting",
    "loan_data": {},
    "messages": [],
    "kyc_verified": false,
    "credit_checked": false
  }
}
```

Response:

```json
{
  "success": true,
  "response": "Welcome to QuickLoan! I'm here to help...",
  "updated_state": {
    "application_id": "uuid-of-application",
    "stage": "collect_pan",
    "loan_data": {},
    "messages": [],
    "kyc_verified": false,
    "credit_checked": false
  },
  "agent_used": "master"
}
```

**Health check:** `GET /api/chat`

---

## 2. KYC Verification API

**Endpoint:** `POST /api/agents/kyc`

Purpose: validate PAN format and return the verified KYC profile (Supabase first, mock fallback).

Request body:

```json
{ "pan": "ABCDE1234F" }
```

Response (success):

```json
{
  "success": true,
  "data": {
    "pan_number": "ABCDE1234F",
    "full_name": "Rajesh Kumar",
    "date_of_birth": "1988-03-20",
    "age": 38,
    "phone": "9876543211",
    "kyc_status": "VERIFIED"
  },
  "message": "KYC verified successfully. Welcome, Rajesh Kumar. Let's continue with your loan application."
}
```

Response (error):

```json
{ "success": false, "error": "PAN not found in our records. Please verify the PAN number." }
```

**Get cached KYC:** `GET /api/agents/kyc?pan=ABCDE1234F`

---

## 3. Credit Check API

**Endpoint:** `POST /api/agents/credit`

Purpose: fetch the credit score and credit history (Supabase first, mock fallback).

Request body:

```json
{ "pan": "ABCDE1234F" }
```

Response:

```json
{
  "success": true,
  "data": {
    "score": 820,
    "status": "Excellent payment history",
    "active_loans": 2,
    "credit_history_years": 10,
    "defaults": "No defaults"
  },
  "message": "Credit Score: 820 (Excellent)...",
  "meetsMinimumRequirement": true
}
```

**Health check:** `GET /api/agents/credit`

---

## 4. Underwriting API

**Endpoint:** `POST /api/agents/underwriting`

Purpose: evaluate a loan application against the active policy and persist the result.

Request body:

```json
{
  "loanData": {
    "pan_number": "ABCDE1234F",
    "full_name": "Rajesh Kumar",
    "age": 38,
    "phone": "9876543211",
    "employment_type": "Salaried",
    "monthly_income": 75000,
    "company_name": "TCS",
    "loan_amount_requested": 500000,
    "loan_purpose": "Wedding",
    "preferred_tenure": 36,
    "existing_emi": 12000,
    "credit_score": 820,
    "credit_status": "Excellent payment history",
    "active_loans": 2
  },
  "userId": "user-uuid-here"
}
```

Response (approved):

```json
{
  "success": true,
  "decision": "approved",
  "data": {
    "approved": true,
    "sanctioned_amount": 500000,
    "interest_rate": 10.5,
    "monthly_emi": 16680,
    "tenure": 36,
    "dti_ratio": 37.6
  },
  "message": "Congratulations Rajesh Kumar! Your loan has been APPROVED!...",
  "applicationId": "uuid-of-application",
  "policyVersion": 1,
  "lifecycleStage": "documents_pending",
  "riskBand": "low",
  "counterOffer": null
}
```

Response (rejected):

```json
{
  "success": true,
  "decision": "rejected",
  "data": {
    "approved": false,
    "rejection_reason": "Application does not meet eligibility criteria",
    "failed_rules": [
      "Minimum credit score required: 650",
      "Debt-to-Income ratio (55.0%) exceeds maximum allowed (50%)"
    ]
  },
  "message": "Sorry, we're unable to approve your loan application...",
  "applicationId": "uuid-of-application",
  "counterOffer": { "amount": 300000, "message": "We can offer up to INR 3,00,000 instead." }
}
```

**Get application:** `GET /api/agents/underwriting?id=<application-id>`

---

## 5. Sanction Letter API

**Endpoint:** `POST /api/agents/document`

Purpose: generate a PDF sanction letter for an approved application. All letter values are read from the stored application record, never from client input. Requires a signed-in user who owns the application (or a reviewer/admin).

Request body:

```json
{ "applicationId": "uuid-of-application" }
```

Response:

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="Sanction_Letter_<id>_<name>_<timestamp>.pdf"
```

**Health check:** `GET /api/agents/document`

---

## 6. Application Documents API

**Endpoint:** `POST /api/applications/documents`

Purpose: register an uploaded document against an approved application. Requires the signed-in owner of the application.

Request body:

```json
{
  "applicationId": "uuid-of-application",
  "documentType": "identity_proof",
  "fileName": "pan-card.pdf",
  "storagePath": "documents/app-id/pan-card.pdf"
}
```

Response:

```json
{ "success": true, "data": { "...document record..." }, "applicationStage": "under_review" }
```

**Endpoint:** `GET /api/applications/documents?applicationId=<application-id>`

Lists document records for an application. Customers see their own documents; reviewers/admins see all.

**Endpoint:** `PATCH /api/applications/documents`

Purpose: reviewer/admin action to verify or reject a document. Body:

```json
{
  "applicationId": "uuid-of-application",
  "documentId": "uuid-of-document",
  "status": "verified",
  "notes": "Looks good"
}
```

---

## 7. Groq Intent API

**Endpoint:** `POST /api/groq`

Purpose: extract intent and entities from a message using the Groq LLM. Requires `GROQ_API_KEY`.

Request body:

```json
{ "message": "My PAN is ABCDE1234F and I earn 50000 a month" }
```

Response:

```json
{
  "success": true,
  "intent": "provide_pan",
  "entities": { "pan_number": "ABCDE1234F", "monthly_income": 50000 },
  "response": "Natural language reply"
}
```

**Health check:** `GET /api/groq`

---

## Testing with curl

### Chat

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I want a loan", "conversationState": {"stage": "greeting", "loan_data": {}, "messages": [], "kyc_verified": false, "credit_checked": false}}'
```

### KYC

```bash
curl -X POST http://localhost:3000/api/agents/kyc \
  -H "Content-Type: application/json" \
  -d '{"pan": "ABCDE1234F"}'
```

### Credit

```bash
curl -X POST http://localhost:3000/api/agents/credit \
  -H "Content-Type: application/json" \
  -d '{"pan": "ABCDE1234F"}'
```

### Sanction letter

```bash
curl -X POST http://localhost:3000/api/agents/document \
  -H "Content-Type: application/json" \
  -d '{"applicationId": "uuid-of-approved-application"}' \
  --output sanction-letter.pdf
```

---

## Demo PAN values

| PAN | Credit score | KYC | Notes |
|-----|-------------|-----|-------|
| `ABCDE1234F` | 820 | VERIFIED | Strong approval candidate |
| `GOODP1234A` | 790 | VERIFIED | Approval candidate |
| `FGHIJ5678K` | 720 | VERIFIED | Moderate credit |
| `BADPA0456N` | 680 | VERIFIED | Average credit |
| `KYCFA1234K` | 760 | PENDING_AADHAAR_LINK | KYC not completed |

---

## Error codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Bad request (missing/invalid data) |
| 401 | Unauthorized (not signed in) |
| 403 | Forbidden (insufficient role) |
| 404 | Not found |
| 429 | Rate limited |
| 500 | Internal server error |

## Health checks

```bash
curl http://localhost:3000/api/chat
curl http://localhost:3000/api/agents/credit
curl http://localhost:3000/api/agents/document
curl http://localhost:3000/api/groq
```

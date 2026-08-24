# Adobe Sign Backend Implementation - Status Report

**Date:** 2026-08-24  
**Status:** PARTIALLY IMPLEMENTED - Core infrastructure in place, PDF generation pending  
**Next Steps:** Server-side PDF generation, environment variable setup, testing

---

## ✅ Completed Components

### 1. **Types & Data Model**
- ✅ Extended `Offerte` interface with Adobe Sign fields:
  - `adobe_sign_agreement_id` - Unique agreement ID from Adobe
  - `adobe_sign_status` - Current status (pending, signed, expired, declined, cancelled)
  - `signed_pdf_url` - URL to stored signed PDF
  - `signed_by_email` - Email of signer
- ✅ Created `AdobeSignAgreement` interface for type safety

**Location:** [src/lib/types.ts](../client-portal/src/lib/types.ts)

---

### 2. **Adobe Sign API Client** 
- ✅ Complete client module with all required functions:
  - `getAccessToken()` - OAuth2 token acquisition
  - `uploadDocument(pdfBuffer, fileName)` - Upload PDF to Adobe
  - `createAgreement(documentId, signerEmail, signerName, offerteName)` - Create signing agreement
  - `getAgreementStatus(agreementId)` - Poll agreement status
  - `downloadSignedDocument(agreementId)` - Download signed PDF
  - `initiateSigning(...)` - Complete signing flow
  - `pollAgreementStatus(...)` - Polling with timeout/retries

**Features:**
- OAuth2 Client Credentials flow
- Exponential backoff for retries
- Comprehensive error logging (no secrets logged)
- Status mapping (Adobe → internal format)
- Configurable polling (duration, interval)

**Location:** [src/lib/adobeSign.ts](../client-portal/src/lib/adobeSign.ts)

---

### 3. **Database Schema & Migrations**
- ✅ SQL migration file with:
  - New columns for Adobe Sign fields
  - Constraints for valid status values
  - Consistency checks (e.g., signed_at only when status='signed')
  - Indexes for performance (agreement_id, status, signed_at)

**Location:** [supabase/migration-adobe-sign.sql](../client-portal/supabase/migration-adobe-sign.sql)

**To apply migration:**
```bash
# In Supabase dashboard:
# 1. Go to SQL Editor
# 2. Copy migration-adobe-sign.sql content
# 3. Run the query
```

---

### 4. **API Endpoints**
- ✅ POST `/api/offertes/:id/send-signature` - Initiate signing
- ✅ GET `/api/offertes/:id/signature-status` - Check status & download PDF
- ✅ POST `/api/webhooks/adobe-sign` - Handle Adobe Sign callbacks

**Features:**
- ✅ Authentication checks (admin + client ownership)
- ✅ Error handling with user-friendly Dutch messages
- ✅ Database transaction safety
- ✅ Idempotency support for webhooks
- ✅ Automatic PDF download on signature completion
- ✅ Storage bucket integration

**Locations:**
- [src/app/api/offertes/[id]/send-signature/route.ts](../client-portal/src/app/api/offertes/[id]/send-signature/route.ts)
- [src/app/api/offertes/[id]/signature-status/route.ts](../client-portal/src/app/api/offertes/[id]/signature-status/route.ts)
- [src/app/api/webhooks/adobe-sign/route.ts](../client-portal/src/app/api/webhooks/adobe-sign/route.ts)

---

### 5. **Storage & RLS Configuration**
- ✅ SQL setup file for:
  - Storage bucket creation instructions
  - RLS policies (admin, clients, service role)
  - Database RLS policies for offertes
  - Verification queries

**File:** [supabase/setup-adobe-sign-storage.sql](../client-portal/supabase/setup-adobe-sign-storage.sql)

**To apply:**
```bash
# In Supabase Dashboard:
# 1. Go to Storage → Create bucket "signed-offertes" (Private)
# 2. Go to SQL Editor
# 3. Run RLS policies from setup-adobe-sign-storage.sql
```

---

## 🔄 In Progress / Blocked

### **Server-Side PDF Generation** ⚠️
**Status:** Blocked - needs implementation decision

The `/api/offertes/:id/send-signature` endpoint currently returns a 501 error because server-side PDF generation is not yet implemented.

**Current situation:**
- Client-side `generateOffertePdf()` exists (uses jsPDF in browser)
- Server-side version needed for API endpoint
- PDF must be available as Buffer for Adobe Sign upload

**Solution Options:**

**Option A: Pre-generate PDFs on Offerte Creation** (RECOMMENDED)
```typescript
// When offerte is created in POST /api/admin/offertes
const pdfBuffer = await generateOffertePdfServer(offerte)
const { data } = await storage.upload(`offertes/${offerteId}/original.pdf`, pdfBuffer)
// Store pdf_path in database
```

**Option B: Use Puppeteer for Server-Side Rendering**
```bash
npm install puppeteer puppeteer/browsers
```
```typescript
import puppeteer from 'puppeteer'

async function generateOffertePdfServer(offerte) {
  const browser = await puppeteer.launch({ headless: 'new' })
  const page = await browser.newPage()
  await page.setContent(htmlContent)
  const pdf = await page.pdf()
  await browser.close()
  return pdf
}
```

**Option C: Use jsPDF with Node.js (Buffer handling)**
```typescript
import { jsPDF } from 'jspdf'

async function generateOffertePdfServer(offerte) {
  const doc = new jsPDF('p', 'mm', 'a4')
  // ... same logic as client version but with Buffer
  return doc.output('arraybuffer') as Buffer
}
```

**Recommended:** Option A (pre-generation) - simplest, best performance
**Next Step:** Implement one of these before production use

---

## 📋 Environment Variables Required

Add to `.env.local` (development) and Vercel dashboard (production):

```bash
# Adobe Sign API Credentials
ADOBE_SIGN_CLIENT_ID=your-client-id
ADOBE_SIGN_CLIENT_SECRET=your-client-secret
ADOBE_SIGN_TENANT_ID=your-tenant-id
ADOBE_SIGN_API_BASE_URL=https://api.adobe.io

# Application Base URL (for Adobe Sign callbacks)
NEXT_PUBLIC_BASE_URL=https://portal.brandiscode.com
```

**To get credentials:**
1. Go to https://developer.adobe.com/console/
2. Create a new project
3. Add Adobe Sign API
4. Set up OAuth credentials
5. Generate Client ID, Secret, Tenant ID

---

## 🧪 Testing Checklist

- [ ] Environment variables configured
- [ ] Database migration applied
- [ ] Storage bucket created with RLS policies
- [ ] Server-side PDF generation implemented
- [ ] POST `/api/offertes/:id/send-signature` - test with real Adobe Sign account
- [ ] GET `/api/offertes/:id/signature-status` - poll status
- [ ] Verify signed PDF downloads and saves to storage
- [ ] Test webhook endpoint with Adobe Sign test account
- [ ] Verify RLS policies (clients can't access others' PDFs)
- [ ] TypeScript compilation: `npx tsc --noEmit`
- [ ] Unit tests for `adobeSign.ts`
- [ ] Integration tests for API endpoints

**Test command:**
```bash
# Type check
npx tsc --noEmit

# Run tests
npm test -- lib/adobeSign
npm test -- api/offertes
```

---

## 🔐 Security Implementation Status

- ✅ No hardcoded secrets in code
- ✅ Environment variable usage
- ✅ OAuth2 authentication
- ✅ Admin email verification
- ✅ Client ownership checks
- ✅ RLS policies on storage
- ✅ RLS policies on database
- ⚠️ Webhook signature verification (placeholder - needs Adobe public key)
- ✅ Error logging without secrets
- ✅ Data Safety Protocol compliance

**Outstanding:**
1. Implement proper webhook signature verification with Adobe's public key
2. Rate limiting on API endpoints
3. Add idempotency keys for retries

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Admin Portal                                                     │
└────────┬────────────────────────────────────────────────────────┘
         │ 1. POST /api/offertes/:id/send-signature
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Backend API                                                      │
│ - Validate user (admin/client)                                  │
│ - Generate PDF (server-side)                                    │
│ - Call Adobe Sign API                                           │
└────────┬────────────────────────────────────────────────────────┘
         │ 2. uploadDocument() + createAgreement()
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Adobe Sign API                                                   │
│ - Store agreement_id in database                                │
│ - Send signing link to customer email                           │
└────────┬────────────────────────────────────────────────────────┘
         │ 3. Customer receives email & signs
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Adobe Sign Webhook                                               │
│ - POST /api/webhooks/adobe-sign (status update)                 │
│ - Download signed PDF                                           │
│ - Save to storage                                               │
│ - Update database (status='signed')                             │
└─────────────────────────────────────────────────────────────────┘

Client Polling Flow:
GET /api/offertes/:id/signature-status
  → Check Adobe Sign status
  → If signed: download PDF & save to storage
  → Return status to UI
```

---

## 🚀 Deployment Checklist

- [ ] All environment variables configured in Vercel dashboard
- [ ] Database migration applied in production Supabase
- [ ] Storage bucket created in production
- [ ] RLS policies applied in production
- [ ] Webhook URL registered in Adobe Sign dashboard
  - URL: `https://portal.brandiscode.com/api/webhooks/adobe-sign`
  - Test webhook signature verification
- [ ] Email notifications configured (optional)
- [ ] Staging environment tested end-to-end
- [ ] Production deployment
- [ ] Monitor webhook delivery in Adobe Sign console
- [ ] Test with real customer account

---

## 📚 Related Documentation

- [ADOBE-SIGN-FRONTEND-PROMPT.md](./ADOBE-SIGN-FRONTEND-PROMPT.md) - Frontend implementation guide
- [ADOBE-SIGN-RELEASE-PM-PROMPT.md](./ADOBE-SIGN-RELEASE-PM-PROMPT.md) - Release & PM guide
- [DATA-SAFETY-PROTOCOL.md](./DATA-SAFETY-PROTOCOL.md) - Data safety requirements
- [Adobe Sign API Docs](https://opensource.adobe.com/acrobat-sign/developer_guide/index.html)

---

## ❌ Known Issues & Limitations

1. **PDF Generation Not Implemented** - Server-side PDF generation needed
2. **Webhook Signature Verification** - Currently placeholder implementation
3. **Email Notifications** - Not yet integrated (optional feature)
4. **Rate Limiting** - Not yet implemented
5. **Error Recovery** - Limited retry logic for Adobe API failures

---

## 🔜 Next Steps

1. **Immediate (Blocking):**
   - Implement server-side PDF generation (Option A, B, or C)
   - Set up Adobe Sign developer account
   - Configure environment variables
   - Test local flow with Adobe Sign sandbox

2. **High Priority:**
   - Implement proper webhook signature verification
   - Create unit tests for `adobeSign.ts`
   - Test RLS policies
   - Staging deployment

3. **Medium Priority:**
   - Email notification on signature completion
   - UI components for signature status display
   - Rate limiting on API endpoints
   - Comprehensive integration tests

4. **Nice to Have:**
   - Signature log/audit trail
   - Resend signature requests
   - Bulk document signing
   - Analytics dashboard

---

*Last updated: 2026-08-24*  
*Implemented by: Backend Specialist (GitHub Copilot)*  
*Status: READY FOR TESTING once PDF generation is resolved*

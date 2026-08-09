# EstateWatch MVP Architecture

## Purpose
This document translates the current EstateWatch prototype and README product brief into a concrete MVP architecture and implementation plan. It is designed to keep the build aligned with the brand voice from `README.md`: calm, professional, privacy-conscious, and focused on an alert-driven workflow.

## MVP goal
Deliver a minimum viable product that proves the value of:
1. ingesting public deceased estate notices
2. matching them to saved user alerts
3. dispatching channel-based notifications
4. tracking matched estates through a lightweight lead pipeline
5. maintaining POPIA-safe handling of personal data

## Mission-critical operating principle
All workflows are handled as mission-critical. Alerts, ingestion, notifications, follow-up reminders, dashboards and administrator operations must fail visibly, preserve the last known-good state, avoid unsupported claims, and confirm important writes before showing success. Prefer reversible actions such as pause over permanent deletion where possible. This is a reliability and integrity standard, not a guarantee of legal, financial or notification outcomes.

## Product model
### Core entities
- `User` / `UserProfile`
- `AlertCriteria`
- `DeceasedEstate`
- `NotificationEvent`
- `PipelineItem`

These are already modeled in `src/types.ts`, which provides a strong foundation for both UI and backend design.

### Primary flows
1. User creates or updates an alert
2. Ingestion service adds a new estate record
3. Matching engine evaluates active alerts against the estate
4. Notification service dispatches alerts through configured channels
5. User saves a matched estate into the pipeline and advances the lead stage

## Recommended architecture

### Frontend
- Existing React + Vite app remains the product prototype
- UI responsibilities:
  - alert creation and management
  - estate feed and detail display
  - lead pipeline interaction
  - compliance/billing presentation
- Keep UI components presentation-focused and move stateful workflow logic into hooks or page containers over time

### Backend/service layer
- Build a separate backend service or API layer with these responsibilities:
  - ingest and parse estate notices
  - persist estates, alerts, users, notifications, pipeline items
  - execute the alert matching engine
  - dispatch notifications via adapter abstractions
  - expose REST endpoints for the frontend
- This separation protects the prototype from coupling to ingestion or notification implementation details.

### Ingestion
- Highest technical risk in the MVP
- Preferred path: a parser for Gazette notices or a structured feed from a source like Nuusflits/LegalNotice
- The ingestion pipeline should be layered:
  1. try direct PDF text extraction from uploaded PDFs or source URLs
  2. if direct text is unavailable or malformed, fall back to OCR
  3. if OCR still produces noisy output, use AI-assisted parsing as the last step
- Output: `DeceasedEstate` objects with masked identifiers and parsed fields
- If Gazette parsing is too hard for v1, use a manual or semi-automated data source to validate the rest of the app

### Recommended extraction services
- **Direct PDF text extraction first:** this means parsing the PDF's embedded text layer or text content without OCR. If the notice PDF is a native document with selectable text, this is the most reliable and lowest-cost path. In Node/TypeScript, libraries like `pdfjs-dist`, `pdf-parse`, or `pdf-lib` can read the raw text stream. This step should be attempted before any image-based OCR.
- **OCR fallback:** use OCR only when direct extraction fails or returns garbled text. For the MVP, a managed OCR service is recommended for reliability. Good options are:
  - **Google Cloud Vision OCR**: strong PDF support, multi-language handling, and good accuracy for structured notices.
  - **Azure Computer Vision OCR / Form Recognizer**: good document parsing features and robust PDF handling.
  - **AWS Textract**: strong for document extraction and tables, though it can be more expensive.
  - **Open-source fallback:** `tesseract.js` or a Tesseract service if you want a lower-cost option for initial prototyping.
- **AI cleanup with ChatGPT:** use the AI step as a last resort to normalize noisy OCR/text output and extract structured fields. Recommended OpenAI model choices are `gpt-4.1` for best quality, or `gpt-4.1-mini` for a more cost-conscious fallback. Keep the prompt strict and request only JSON output with fields like `deceasedName`, `dateOfDeath`, `estateNumber`, `province`, `district`, `executorName`, `executorContact`, `executorEmail`, and any asset indicators. This makes AI the final validation and cleanup layer, not the primary extraction engine.

### Matching engine
- Implement as a pure function:
  - `matchEstateToAlerts(estate, alerts) => matchedAlertIds[]`
- Should support:
  - surname / partial-name matching
  - province / district filters
  - estate value band
  - asset type flags
  - executor/applicant status
  - date range
- Should support scoring or confidence for later UX enhancements

### Notification dispatch
- Use adapter/strategy pattern
- Example channels:
  - `EmailNotifier`
  - `WhatsAppNotifier`
  - `SmsNotifier`
  - `PushNotifier`
- Keep payloads minimal and privacy-safe
- Use `sentAt`, `status`, `recipient`, and `channel` in `NotificationEvent`

### Persistence
- For MVP, local JSON storage or a lightweight backend is acceptable
- Keep repository interfaces to allow clean migration to a database or backend service
- Persistence interfaces should include:
  - `AlertRepository`
  - `EstateRepository`
  - `NotificationRepository`
  - `PipelineRepository`
  - `UserRepository`

### Compliance
- Mask ID numbers in the UI and data layer
- Log lawful processing purpose and retention strategy
- Surface POPIA guidance in the app and internal docs
- Do not display full South African ID numbers; keep only masked values

## Implementation backlog

### Phase 1: Validate the data source
- Test the Gazette ingestion path with one real notice
- If possible, identify a structured alternative source (Nuusflits/LegalNotice)
- Confirm whether the estate parser can reliably extract these fields:
  - deceased name
  - date of death
  - estate number
  - province / district
  - executor info
  - asset indicators

### Phase 2: Build backend core services
- Ingestion service that produces structured estates
- Matching engine function(s)
- Notification dispatch adapters
- Persistence layer (mock/local first)
- API contract definitions for the frontend

### Phase 3: Connect prototype to backend
- Replace `src/data/mock*` data with backend-driven data
- Add CRUD endpoints for alerts and pipeline
- Support real estate match notifications
- Improve UI state separation

### Phase 4: Add MVP polish
- Billing/subscription tier UI
- Role-based alert templates
- Compliance messaging and data minimisation
- Report generation or exports if needed for launch

## Next practical step
The single highest-leverage next step is to validate the ingestion source and build a small parser prototype. Once that exists, the rest of the MVP can be built on a stable, real estate feed rather than mock data.

# STEMIFY family portal

The existing website is preserved. `/portal` adds parent, student and staff views backed by an Express API and PostgreSQL. This branch is not deployed to the public site until production services are configured.

## Try it locally

Node 22.12+ is required.

```sh
npm ci --include=dev
npm run dev:portal
```

Open http://127.0.0.1:4504/portal. Register a parent account. Without SMTP, verification/reset emails are saved as private JSON files under `.data/mail/`; open the link in the newest file. These files and the local PostgreSQL data directory are ignored by Git. Never use this mail sink in production. `npm run dev` remains the public site's Vite-only workflow; use `dev:portal` for the integrated backend.

For a separate, clearly synthetic preview:

```sh
node scripts/seed-demo.mjs --local-demo
LOCAL_DATA_DIR=.data/demo-postgres npm run dev:portal
```

Local demo sign-ins only:

| View | Identifier | Password |
| --- | --- | --- |
| Parent | parent@example.test | Stemify-demo-only-2026! |
| Student | demo-learner | Stemify-demo-only-2026! |
| Staff | teacher@example.test | Stemify-demo-only-2026! |

The seeder refuses production mode, any remote database URL, and any existing populated demo database. It writes only to `.data/demo-postgres`. Never deploy this demo data. Stop the server before using another process to access the same local PGlite database.

## Accounts and teaching workflow

1. Parents register and verify their email. Unverified accounts cannot access students or lessons.
2. A parent adds their child, grade and time zone, then chooses **Create student login**. Each child has a unique username and a separate password. A student does not need an email address.
3. A parent can reset or disable their own child's login; this immediately revokes the child's active sessions. Siblings cannot view each other's lessons through their student accounts. Parents see all their own children.
4. Staff register and verify a separate staff email. An operator with database access grants the role using `npm run staff:grant -- teacher@your-domain.ca`. This is never available through public registration. On a local database, stop the server first, run the command with the same `LOCAL_DATA_DIR`, then restart. Sign in again after promotion.
5. Staff schedule classes, choose the student, enter the teacher and lesson time, and add preparation notes. Scheduling uses the staff browser's time zone; the saved instant is displayed in the child's time zone.
6. Create the Zoom meeting in Zoom and paste its HTTPS join link and numeric meeting ID into the class. Automatic creation of Zoom meetings is not included in this version.
7. Staff write or edit lesson notes and save a draft. **Publish to family** explicitly releases the saved draft to that child and their parent. Later AI or teacher edits remain private until published again.
8. Use the class status to mark completed/cancelled lessons. Past lessons and published notes remain available. A class cannot be moved to a different child after creation; cancel an incorrect class and create the correct one.

## Production on Render

Destination from the existing project: repository `stemifycanada-sketch/thestemifyway`, Render service `stem` (`stem-p9ph.onrender.com`), public domain `stemify.ca`. Recheck those values in your Render dashboard before switching branches or deploying.

Provision a durable managed PostgreSQL database and a verified sending mailbox/service before deploying. Database creation and paid plans are separate operational decisions. Do not put a SQLite/PGlite file on Render's ephemeral filesystem. Use the provider's backup/restore features and verify a restore before accepting real student records.

Set these server-only environment variables in Render:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `APP_ORIGIN` | `https://stemify.ca` (the exact canonical origin, no trailing slash) |
| `DATABASE_URL` | Managed PostgreSQL connection URL; keep TLS verification enabled for external connections |
| `SMTP_URL` | Authenticated SMTP URL, e.g. `smtps://USER:URL_ENCODED_PASSWORD@HOST:465` |
| `MAIL_FROM` | `STEMIFY <accounts@your-verified-domain>` |
| `TRUST_PROXY_HOPS` | `1` only for the known single Render proxy topology |
| `ZOOM_ACCOUNT_ID` | Your Zoom account ID, when ready |
| `ZOOM_WEBHOOK_SECRET` | Secret token from your Zoom app, when ready |

Keep secrets out of `VITE_*`, commits, logs and screenshots. Match the sender domain's SPF/DKIM setup to your mail provider. The server refuses production startup without HTTPS origin, database and email configuration. It does not verify SMTP deliverability at startup; test a real verification email before enabling registration publicly.

Keep the existing build command `npm ci --include=dev && npm run build` and start command `npm start`; use `/api/health` as the health path. Render supplies `PORT`; the server binds `0.0.0.0` in production. Migrations run transactionally at startup with a PostgreSQL advisory lock. For the first release, deploy to a staging service/database, register two families, verify isolation and deliverability, then deploy the approved branch to the production service. Do not merge this branch into auto-deploying `main` before these settings are ready.

The worker runs in the web process every 10 seconds and reads durable receipts from PostgreSQL. Use an always-on instance for timely note processing. If an instance sleeps or restarts, committed receipts remain queued and resume when it runs. Multiple instances use row locks to avoid processing the same receipt concurrently.

## Connect Zoom AI meeting notes

This app imports summaries produced by Zoom AI Companion. It does not record children, enable AI Companion, or produce summaries itself. Enable Meeting Summary for the appropriate licensed host and inform families about your recording/AI practices before real classes.

1. In the Zoom App Marketplace, create an account-owned app with webhook event subscriptions. Use the current app creation flow offered for your account and the permissions required by the subscribed events.
2. Copy the app's webhook **Secret Token** into `ZOOM_WEBHOOK_SECRET`; set `ZOOM_ACCOUNT_ID` to the hosting account ID. No Zoom OAuth client secret is needed solely for receiving these events.
3. Set the event notification endpoint to `https://stemify.ca/api/webhooks/zoom` after deploying the configured service. Validate it in Zoom. The endpoint answers `endpoint.url_validation` challenges after checking the signed request.
4. Subscribe to `meeting.started`, `meeting.summary_completed`, and `meeting.summary_updated` for the correct host/account. Enable Meeting Summary in that host's Zoom settings and start it during a test meeting.
5. Schedule that meeting in the staff portal with its numeric meeting ID and the correct start time. A receipt first matches the exact meeting UUID. If none is linked, it may bind one uniquely matching, non-cancelled class with the same meeting ID within 15 minutes of the actual start. It never matches by learner name, title, participant email, or recurring meeting ID alone.
6. After Zoom finishes the summary, it appears as a private draft in that class. Staff review and publish it. The staff status panel shows receipt counts and last receipt/processing times; use **Refresh** to fetch updates.
7. For an unmatched receipt, the staff panel shows meeting metadata and the UUID, without exposing raw transcript content. Confirm the correct child and occurrence, edit that class and enter its exact UUID. Saving queues unresolved receipts for retry. Do not copy a group meeting summary into an individual student's notes without reviewing and removing other learners' information.

The first version models **one student per class/Zoom occurrence**. Group-class enrollment is not implemented. Overlapping candidates stay unmatched. A significantly early or late start may require manual UUID association. Unsupported or empty summary formats remain queued for retry instead of publishing incomplete content.

Implementation follows [Zoom webhook verification](https://developers.zoom.us/docs/api/webhooks/) and [Zoom meeting events](https://developers.zoom.us/docs/api/meetings/events/). It supports the current `summary_content` Markdown field as inert text, plus the legacy overview/details/next-steps fields. No supplied HTML or scripts are executed. Live delivery must still be tested against your Zoom app; automated tests use signed synthetic events.

## Security and retention

- Passwords: salted scrypt; 12-character minimum for new passwords. No plaintext account passwords are stored.
- Sessions: random opaque tokens, only hashes stored, HttpOnly SameSite=Lax cookies, Secure in production, seven-day expiration. Parent reset/logout and child reset/disable revoke applicable sessions.
- Mutations: exact-origin checks plus session-bound CSRF token. Authorization and family/student scope are enforced on the server, independent of UI controls.
- Recovery: verification links expire in 24 hours, reset links in 30 minutes, single-use hashed tokens. Links use URL fragments to keep tokens out of HTTP access logs. Staff promotion requires operator database access.
- Abuse controls: database-backed account/IP rate limits, strict field validation, size limits and parameterized SQL.
- Webhooks: HMAC over raw bytes, five-minute timestamp window, account allowlist, duplicate receipt protection, durable processing and summary version ordering. A new draft never overwrites the published copy.
- Processed webhook bodies are cleared immediately. Unresolved payloads are cleared after seven days, receipt metadata removed after 30 days. Auth/session/rate-limit expirations are cleaned periodically. Lesson notes and audit records persist; define and operate your student-record retention/deletion policy before broad rollout.
- Audit trail stores action names, actor IDs and record IDs, not passwords, meeting text or provider responses. Application errors are generic and omit request bodies.
- Dashboard responses return the latest 500 classes within the caller's scope; pagination and group classes are future work. Staff are trusted school-wide operators; teacher-specific assignment permissions and MFA are not implemented yet.

## Verification and recovery

```sh
npm run test:backend
npm run lint
npm run build
```

Backend tests run actual PostgreSQL semantics through an isolated in-memory PGlite database. They cover role enforcement, family isolation, child credentials, CSRF, verification/reset expiry and reuse, session revocation, Zoom signatures/replay/account checks, idempotency, ordering, ambiguous occurrences, safe draft publishing and local persistence. A managed PostgreSQL connection and real SMTP/Zoom delivery still need staging verification.

If deployment fails, retain the existing production build and inspect only metadata/health status. Never paste raw event payloads or credentials into logs. The initial migration is additive; keep the database backup when reverting the application. Avoid running old application code against later migrations without checking compatibility.

## Homework, worksheets and the family library

The **Homework & library** section is shared by the three roles:

- Staff publish a worksheet/reference file or external link, choose its subject/grade, and select **assigned learners only** or **all families in the library**. Use shared-library visibility for reusable teaching material, never private child work.
- Staff assign a resource or written homework instructions to a specific student, with an optional due date.
- The student or their parent submits an answer, a PDF worksheet or a PNG/JPEG photo. Submissions are private to that student, their parent and staff. Siblings cannot view each other's homework through separate student logins.
- Staff check the work and share feedback, an optional score out of 100, and either **Reviewed** or **Needs another attempt**. Previous attempts and feedback remain available to the family. Review is performed by the teacher; the system does not automatically grade handwriting or invent AI marks.
- Parents can browse the library, find assigned material, and follow submission/review history from the portal. Filters operate on loaded results; **Load more homework and resources** retrieves older pages.

PDF/PNG/JPEG uploads are limited to 5 MiB each. Files are stored in PostgreSQL, delivered only through authenticated download routes and forced to download as attachments. MIME and file signatures are checked; this is not antivirus scanning. Files never enter a public static directory. Per-family upload allowance is 100 MiB/200 files (staff have their own allowance); removing a child's login does not reset the family quota. Unattached uploads are purged after 24 hours. Attached work is retained with its review history; define the operating retention/deletion policy before collecting real student work. Move to private object storage plus malware scanning if larger volume or additional formats are needed.

### Wayground inside the portal

In the staff **Resource library**, **Search the Wayground catalogue** opens topic results on Wayground in a new tab. Choose/start or assign the quiz there, then save its student join link using **+ Add resource → Wayground quiz**. The separate saved-resource filter searches materials already added to STEMIFY. Catalogue search is a teacher-only outbound shortcut, not an API integration: it sends only the entered topic when submitted, does not search while typing, and does not import results or scores. It uses Wayground's currently observed Explore search route; recheck that route if Wayground changes its navigation.

Staff can create a **Wayground quiz** resource with a launch link and optional copied Embed URL. For public education resources, Wayground documents **⋯ → Embed** on the resource details page; Flashcards are excluded. Paste the iframe `src` URL only, not HTML. Official HTTPS Wayground/Quizizz hosts are allowed; unsupported or malicious hosts are rejected.

Students choose **Open quiz here** to load the external quiz in a sandboxed iframe. Nothing contacts Wayground until that click. **Launch quiz** opens a separate tab as a fallback. A live game code may expire when the host ends that session; use a persistent assigned activity/resource link for homework. The supplied live test link is saved only in the local demo, not hardcoded into production or committed.

Quiz hosting, participant identity and automatic grade sync are separate. Wayground's documented LMS/LTI integrations do not establish score sync with this custom portal. This version accepts a student's completion report and a teacher-verified manual score; opening a quiz does not automatically mark it completed or import a score.

References: [Wayground embed instructions](https://help.wayground.com/support/solutions/articles/158000404972-can-i-embed-assessments-lessons-other-resources-into-webpages-), [Wayground LTI capabilities](https://help.wayground.com/support/solutions/articles/158000404851-why-use-lti-to-integrate-wayground-with-your-lms-benefits-faqs). For the Zoom mock lesson and accuracy checklist, see [Zoom live validation](zoom-live-validation.md).

### Validation status — 2026-10-13

- Build and lint pass; all 40 backend tests pass, including 13 learning-hub tests for scoped access, uploads, concurrent updates, review history, family quotas, pagination and quiz URL validation.
- Local browser checks passed with synthetic accounts: staff published and assigned practice, the student submitted text and a JPEG attachment, staff shared a score and feedback, and the parent saw the reviewed work and resource library. Desktop (1280px) and phone (390px) layouts were inspected without horizontal overflow.
- The owner-provided live Wayground session was joined as a test participant. Questions, answer feedback and the session summary loaded. This verifies direct launch/play only. An official resource Embed URL is still needed to validate playback inside the portal.
- Catalogue shortcut checks confirmed teacher-only visibility, blank/dot-only input handling and a new Wayground tab with the trimmed, encoded topic in its URL. Desktop and phone layouts passed visual checks. The destination's search-result contents were not inspected because browser account access was unavailable.
- Real Zoom delivery and transcript/summary accuracy, managed PostgreSQL and real email delivery remain staging acceptance checks. No production deployment is part of this validation.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

RPMS (Research Project Management System) — a university portal where faculty (`USER`) submit funding/research requests, and `HOD`/`ADMIN` review, discuss, and approve them. Two independent apps in one repo: `backend/` (Express + MySQL) and `frontend/` (Next.js).

## Commands

```bash
cd backend && npm install && npm start      # node index.js on PORT (default 4000) — no watcher, restart manually
```

```bash
cd frontend && npm install && npm run dev   # Next dev server on :3000
```

```bash
cd frontend && npm run build                # production build — the only real typecheck/lint gate
```

```bash
cd frontend && npm run lint                 # eslint (flat config, next/core-web-vitals + next/typescript)
```

There is **no test suite, no test runner, and no linter on the backend**. Verification means running both servers against a MySQL instance and exercising the flow in the browser. Do not claim tests pass — there are none to run.

Env files: copy `backend/.env.example` → `backend/.env` and `frontend/.env.local.example` → `frontend/.env.local`. The backend needs MySQL credentials, `JWT_SECRET`, and AWS S3 credentials (uploads fail hard without them). The frontend needs only `NEXT_PUBLIC_API_BASE`.

## Architecture

### Schema lives in code, not in migration files

`backend/src/config/db.js` exports `ensureTables()`, which `index.js` awaits before `app.listen()`. It runs `CREATE TABLE IF NOT EXISTS` plus a series of `ALTER TABLE` statements each wrapped in try/catch that swallows `ER_DUP_FIELDNAME`. This is the **only** migration mechanism — to change the schema, append an idempotent statement there. There is no `migrations/` directory and no schema dump.

### One `requests` table for six request types

Every request type — `seed-research`, `conference`, `workshop`, `fdp`, `laptop-grant`, `external-funding` — is a row in `requests`, distinguished by `request_type`. The type-specific form fields are stringified JSON in the `data` LONGTEXT column, never normalized columns. Consumers `JSON.parse(row.data)` defensively (it arrives as a string from MySQL but as an object in some frontend paths — most call sites handle both).

Adding a request type requires touching the `ALLOWED_TYPES` array in **two** backend files that do not share it — `src/routes/chatRoutes.js` and `src/routes/researchSeedRoutes.js` — plus a new `*FormState.ts` + `*FormModal.tsx` pair under `frontend/app/dashboard/user/requests/` wired into the `activeForm`/`activeRequestType` switch in that directory's `page.tsx`.

### Route file names do not match their mount paths

| Mount | File | What it actually serves |
|---|---|---|
| `/api/seed-research` | `researchSeedRoutes.js` | The **owner's** CRUD over their own drafts, for *all* request types (not just seed-research) |
| `/api/requests` | `chatRoutes.js` | HOD/Admin listing, status transitions, chat threads, private files, post-approval requirements |

Expect to grep for the endpoint path rather than guessing the filename.

### Two parallel, incompatible auth mechanisms

This is the single biggest gotcha. Both are live:

1. **JWT Bearer** — `authMiddleware` populates `req.user` from the token, `requireRole([...])` gates it. Used on `/api/dashboard/*`, `/api/users/me`, `/api/users/admin/*`, `/api/reports/*`, `/api/uploads/admin/*`.
2. **`x-user-email` header** — the route reads the header, looks the email up in `users`, and trusts the resulting role. No token verification at all. Used on `/api/requests/*`, `/api/seed-research/*`, and the non-admin `/api/uploads` handlers.

Helpers `requireHodActor` / `requireAdminActor` in `chatRoutes.js` implement mechanism 2. When adding an endpoint, match whichever mechanism its neighbours use — mixing them within one flow breaks the frontend, which sends `x-user-email` far more often than `Authorization`. Mechanism 2 is trivially spoofable; flag it rather than extending it if the task touches auth.

Frontend route guards are client-side only: each page reads `localStorage` via `frontend/app/lib/authStorage.ts` in a `useEffect` and `router.replace("/signin")` on a role mismatch. `/dashboard` itself is just a role-based redirector.

### Status machine

`draft → submitted | in-review → approved`, plus `rejected`. `validateTransition()` in `backend/src/routes/chatRoutes.js` is the authority: HOD can only push drafts into `in-review`/`submitted`; ADMIN can approve and can reject from any state, including reversing an `approved` request. Users never set status themselves — they only create and edit `draft` rows via `/api/seed-research/drafts`, and editing is refused once status leaves `draft`.

### Three tiers of file visibility

All attachments are rows in `chat_files`, discriminated by two flags:

- `is_private=0` — chat attachment, visible to everyone on the request
- `is_private=1, is_admin_private=0` — HOD/Admin only
- `is_admin_private=1` — Admin only

Separately, `post_approval_requirements` / `post_approval_submissions` model the "Admin asks for a document after approval, owner uploads it" loop — requirements can only be created on an `approved` request, and only the owner may submit against them.

### Uploads

`multer` memory storage → `PutObjectCommand` to S3 (`backend/src/middleware/uploadS3.js`), 10 MB cap, MIME allowlist. A row goes into `uploads` with the S3 key and public URL; requests reference files by key, so the same upload can be reused across requests. **Delete removes only the DB row — the S3 object is left behind** (see the comment in `uploadRoutes.js`). Deletion is blocked when the key is referenced by any `approved` request; `/api/uploads/check-usage` and `/api/uploads/admin/all` compute that usage by unioning `requests.upload_key`, `chat_files.file_key`, and `post_approval_submissions.file_key`.

### Exports

- **PDF** is generated **client-side** in `frontend/lib/requestPdf.ts` with `pdf-lib`. pdf-lib's standard fonts are WinAnsi-encoded and throw on anything outside that range, so all text passes through `sanitizeText()` before `drawText`. Any new field rendered into the PDF must be sanitized — this has already caused two rounds of fixes.
- **Excel/CSV** are generated **server-side** in `backend/src/routes/reportRoutes.js` with `exceljs`. The `.xlsx` export unions every `data` JSON key across all rows into dynamic `data.*` columns and emits one sheet per request type.

## Frontend conventions

- No shared API client. Every page repeats `const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";` and calls `fetch` inline. Follow that pattern rather than introducing a wrapper mid-task.
- Almost everything is `"use client"`; there are no server components doing data fetching and no route handlers under `app/api/`.
- Two separate lib directories: `frontend/app/lib/` (auth storage) and `frontend/lib/` (PDF export). Not a typo — check both.
- Styling is Tailwind v4 utility classes inline, slate/white palette, no component library and no shared UI primitives beyond `app/dashboard/_components/DashCard.tsx` and `app/components/UploadPicker.tsx`.
- Pages are large (several 600–1000 line files) and hold all state, fetching, and markup together. Match the local style when editing rather than refactoring opportunistically.

## Deployment notes

CORS is an explicit allowlist in `backend/src/app.js`: localhost:3000 (http and https), `https://rpms.geu.ac.in`, and `FRONTEND_ORIGIN`. A new deploy origin must be added there or every request fails preflight. `x-user-email` is in the allowed headers list for the reason described above.

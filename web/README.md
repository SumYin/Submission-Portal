Submission Portal – Web (Next.js + Tailwind v4 + shadcn/ui)
===========================================================

This is the front-end for a file submission portal. Users can sign up/sign in (username + password), edit an optional profile, submit files via a public code, and manage their own forms via a dashboard.

Stack
- Next.js App Router (TypeScript)
- Tailwind CSS v4
- shadcn/ui (Radix primitives) – components in `src/components/ui`
- Zod + React Hook Form for forms
- TanStack Query for data fetching cache
- Sonner for toasts

Authentication overview
- The UI determines auth state via `getCurrentUser()` and a small client hook `useCurrentUser()` in `src/lib/auth.ts`.
- We broadcast sign-in/-out changes with a custom browser event `sp:auth-changed` from `src/lib/auth-events.ts`. The header subscribes and updates instantly without a full reload.
- Auth-required pages are protected by a lightweight client `AuthGuard` (`src/components/auth-guard.tsx`) which redirects to `/sign-in?next=<originalPath>` when signed out. After a successful sign-in/sign-up, the app navigates back to `next`.
- Navigation links like Dashboard/Profile/Submissions are “soft protected”: when signed out they link to `/sign-in?next=...`; when signed in they go to the actual pages. This provides immediate feedback and reduces jarring redirects.

Auth storage and backend compatibility
- Mock mode (default): `src/lib/mockApi.ts` stores a session in `localStorage` under `sp.session`. The header updates immediately due to the `sp:auth-changed` event emitted after sign-in/sign-out.
- Real API mode: set `NEXT_PUBLIC_API_BASE_URL`. The API client in `src/lib/api.ts` supports two strategies:
	1) Bearer token header (default): backend returns an `X-Auth-Token` header on sign-in; the client stores it in `localStorage` (`sp.token`) and sends `Authorization: Bearer <token>` on subsequent requests.
	2) Cookie session: set `NEXT_PUBLIC_AUTH_MODE=cookie` to send `credentials: include` with requests and skip the Authorization header. Backend manages an HTTP-only session cookie.
- In both cases, the client dispatches `sp:auth-changed` after sign-in, sign-up, and sign-out so the UI stays in sync across the app without reloading.

Backend endpoints (suggested contract)
- POST `/auth/signup` → returns `User` and may also set session cookie or `X-Auth-Token` header.
- POST `/auth/signin` → returns `User` and may also set session cookie or `X-Auth-Token` header.
- POST `/auth/signout` → clears session/cookie server-side. Client clears bearer token if used.
- GET `/me` → returns the current `User` or 401. UI falls back to unauthenticated when 401.
- GET/PATCH `/me/profile`
- Forms and submissions as listed below (unchanged from earlier notes).

Project layout (key pages)
- `src/app/page.tsx` – Home with 6-character code entry to submit
- `src/app/sign-in`, `src/app/sign-up` – Auth flows (mocked for now)
- `src/app/profile` – Optional profile fields
- `src/app/submit/[code]` – Submit page with file specs + uploader
- `src/app/submissions` – Your past submissions
- `src/app/dashboard` – Your forms list
- `src/app/dashboard/new` – Guided form builder (steps)
- `src/app/dashboard/forms/[id]` – Form detail + received submissions

API contract and backend integration
- Contracted types are in `src/lib/types.ts`.
- The API layer is in `src/lib/api.ts` and currently delegates to a local mock (`src/lib/mockApi.ts`) that uses `localStorage` to persist.
- To connect a real Python backend later, set `NEXT_PUBLIC_API_BASE_URL` and implement the `fetch` calls in `src/lib/api.ts` (auth, profile, forms CRUD, submissions upload, etc.). Keep response shapes aligned with `types.ts`.
- Recommended endpoints (suggested, can be adapted):
	- POST `/auth/signup`, POST `/auth/signin`, POST `/auth/signout`, GET `/me`, GET/PATCH `/me/profile`
	- POST `/forms`, GET `/forms/mine`, GET `/forms/{id}`, PATCH `/forms/{id}`, GET `/forms/{id}/submissions`
	- GET `/forms/code/{code}`, GET `/submit/{code}/validate`, POST `/submit/{code}` (multipart, resumable optional)

Events and state flow
- After sign-in/sign-up/sign-out completes, the client calls `fireAuthChanged()`; the `useCurrentUser()` hook listens and re-fetches `getCurrentUser()`.
- The header (`src/components/site-header.tsx`) consumes `useCurrentUser()` to swap between “Sign in/Sign up” and a single “Sign out” button.
- AuthGuard also relies on `useCurrentUser()` to redirect signed-out visitors to sign-in with a `next` param.

Validation responsibilities
- Client: lightweight pre-checks (size/type) for better UX
- Server (Python): authoritative validation (size/type, video codec/fps, image/video resolution, deadlines, per-user limits). Return accepted/rejected with reasons.

File uploads
Exports and downloads
- Current UI supports exporting metadata (tables) to CSV and JSON via helpers in `src/lib/export.ts`.
- Placeholders for file downloads are provided:
	- `downloadFakeFile(filename, info)` simulates a single-file download.
	- `downloadZipPlaceholder(zipName, items)` simulates a bulk ZIP export with a manifest.
- When wiring the Python backend, add endpoints and swap in real downloads:
	- Single file: `GET /submissions/{id}/download` → returns a file (stream/blob) or a pre-signed URL.
	- Bulk export: `POST /forms/{id}/submissions/export` with `{ ids?: string[] }` → returns `{ jobId }` and later `GET /exports/{jobId}` → `{ status, url }`.
- UI integration points:
	- Submissions page (`src/app/submissions/page.tsx`): per-row “Download” uses the placeholder now; change it to request the real file URL and trigger a download.
	- Dashboard Form Detail (`src/app/dashboard/forms/[id]/page.tsx`): has per-row “Download” and bulk “ZIP selected” (placeholder). Swap to call the backend and download the ZIP when ready.

- Current uploader uses a simple single-shot upload with progress simulation.
- For production, consider Uppy/Tus for resumable, chunked uploads, S3 direct uploads or a CDN-backed storage.


## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

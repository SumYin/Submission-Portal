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

Validation responsibilities
- Client: lightweight pre-checks (size/type) for better UX
- Server (Python): authoritative validation (size/type, video codec/fps, image/video resolution, deadlines, per-user limits). Return accepted/rejected with reasons.

File uploads
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

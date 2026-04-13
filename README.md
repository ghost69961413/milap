# Matrimonial Web Application

India-focused matrimonial platform built with React, Tailwind CSS, Framer Motion, Node.js, Express, MongoDB, Socket.IO, Cloudinary, and Razorpay.

## Structure

- `client/` React frontend (Vite)
- `server/` Express backend

## Quick start

1. Install dependencies from the repository root:
   - `npm install`
2. Copy env templates (already configured in this workspace):
   - `cp server/.env.example server/.env`
   - `cp client/.env.example client/.env`
3. Run both apps:
   - `npm run dev`
4. Seed admin manually (required for `/admin/login`):
   - `npm --workspace server run seed:admin`

## Default local URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5001`
- Health check: `http://localhost:5001/api/v1/health`
- Admin login page: `http://localhost:5173/admin/login`
- Admin dashboard: `http://localhost:5173/admin/dashboard`

## Live discover-to-chat flow

1. Open `http://localhost:5173/auth` and signup/login as User 1.
2. Go to Discover and send interest to another profile (for example, Riya).
3. Logout and login as User 2 (Riya), open Chat, and accept the pending request.
4. Login again as User 1 and open Chat to message instantly.

## Dashboard profile management

- Dashboard now supports:
  - Change profile picture
  - Edit profile information (name, age, education, profession, income, location, bio, interests)
- In local development without Cloudinary keys, image upload uses a development fallback.

## Phase 18: Admin Auth + Control

- Public users login from `/auth`; admin must login from `/admin/login`.
- Public auth endpoint `/api/v1/auth/login` blocks admin accounts.
- Admin APIs:
  - `POST /api/v1/admin/auth/login`
  - `GET /api/v1/admin/users`
  - `GET /api/v1/admin/consultants/pending`
  - `PATCH /api/v1/admin/consultants/:userId/review`
- Consultant accounts now require admin approval before consultant-only actions.

## Phase 19: Consultant Approval Workflow

- User cannot self-assign `consultant` role at signup.
- Consultant role flow:
  1. Signup as `normal_user`
  2. Apply using `POST /api/v1/consultants/apply`
  3. Admin reviews from:
     - `GET /api/v1/admin/consultants/pending`
     - `PATCH /api/v1/admin/consultants/:userId/review`
  4. On approve: user role updates to `consultant`
  5. On reject: user remains `normal_user`
- New user fields include consultant request lifecycle:
  - `consultantRequestStatus`
  - `consultantRequestAppliedAt`
  - `consultantRequestReviewedAt`
  - `consultantRequestReviewedBy`
  - `consultantRequestRejectionReason`

## Phase 20: User Verification by Consultants

- Every authenticated user can upload police verification document from Dashboard.
- Consultant-only verification APIs:
  - `GET /api/v1/verifications/pending`
  - `PATCH /api/v1/verifications/:userId/review`
- User upload/status APIs:
  - `POST /api/v1/verifications/upload`
  - `GET /api/v1/verifications/me`
- Verification schema fields:
  - `verificationStatus` (`pending` | `approved` | `rejected`)
  - `verifiedBy` (`User` reference)
- Access restrictions:
  - Unverified users cannot access `/api/v1/matches`
  - Unverified users cannot access `/api/v1/chats/*`
  - Unverified users cannot use chat Socket.IO connection

## Local database options

- Default expected Mongo URI: `mongodb://127.0.0.1:27017/matrimonial_app`
- For quick local development without Mongo installed:
  - Set `USE_IN_MEMORY_DB=true` in `server/.env`

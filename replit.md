# StudyNotes — BAMS Ayurveda Student Notes App

## Overview

pnpm workspace monorepo using TypeScript. Full-stack web app for BAMS (Ayurveda) students with cloud sync, Google login via Clerk, and role-based access control.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (`artifacts/study-notes`, port from `PORT` env)
- **Backend**: Express 5 (`artifacts/api-server`, port 8080)
- **Database**: Supabase PostgreSQL (`@supabase/supabase-js` with service role key on server, anon key on client)
- **Auth**: Clerk (`@clerk/express` on server, `@clerk/react` on client)
- **API contract**: OpenAPI-first with Orval codegen
- **Validation**: Zod (`zod/v4`)
- **Realtime**: Supabase Realtime — notes auto-refresh on any change across all clients
- **React Query**: `@tanstack/react-query` for data fetching/caching

## Architecture

```
artifacts/
  api-server/          # Express 5 REST API (/api prefix)
  study-notes/         # React + Vite SPA (served at /)
lib/
  db/                  # Drizzle schema + migrations
  api-spec/            # OpenAPI spec + Orval config
  api-zod/             # Generated Zod schemas
  api-client-react/    # Generated React Query hooks + custom-fetch
```

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Database Schema

### `notes` table
- `id` (serial PK), `type` ("text"|"jsx"), `title`, `content`, `category`, `tags` (text[]), `pinned` (bool), `createdByClerkId` (text), `createdAt`, `updatedAt`

### `user_roles` table
- `clerkUserId` (PK), `role` ("admin"|"contributor"|"public"), `createdAt`, `updatedAt`

## Roles & Permissions

| Action | public | contributor | admin |
|--------|--------|-------------|-------|
| View notes | ✓ | ✓ | ✓ |
| Create notes | — | ✓ | ✓ |
| Edit/delete own notes | — | ✓ | ✓ |
| Edit/delete any note | — | — | ✓ |
| Pin/unpin notes | — | — | ✓ |
| Manage user roles | — | — | ✓ |

- Public (unauthenticated or no role): read-only
- First sign-in auto-registers user as "public" in DB
- Admin promotes users via Admin Panel in the sidebar

## API Routes

- `GET /api/notes` — list all notes (public)
- `POST /api/notes` — create note (contributor+)
- `GET /api/notes/:id` — get note (public)
- `PATCH /api/notes/:id` — update note (owner or admin)
- `DELETE /api/notes/:id` — delete note (owner or admin)
- `PATCH /api/notes/:id/pin` — toggle pin (admin only)
- `GET /api/users/me` — get current user profile + role (auth required)
- `GET /api/users` — list all users (admin only)
- `PATCH /api/users/:clerkUserId/role` — update user role (admin only)

## Codegen Notes

- Orval config: `lib/api-spec/orval.config.ts` — generates zod schemas and react-query hooks
- Post-codegen script patches `lib/api-zod/src/index.ts` to avoid duplicate exports
- `@workspace/api-client-react/src/custom-fetch.ts` uses browser cookies for auth (no manual token needed on web)

## Environment Variables

- `CLERK_SECRET_KEY` — Clerk server secret key
- `CLERK_PUBLISHABLE_KEY` — Clerk publishable key (server)
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk publishable key (frontend)
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — session secret

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

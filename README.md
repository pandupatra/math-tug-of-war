# Math Tug-of-War

Real-time two-player arithmetic game built with Next.js App Router + Tailwind + Supabase Realtime.

## Stack

- Frontend: Next.js (App Router), Tailwind CSS, Lucide React
- Backend/Realtime: Supabase Postgres + Realtime (`postgres_changes`)
- State: React hooks + realtime subscription updates

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```
3. Run SQL schema in Supabase SQL editor:
   - `supabase/schema.sql`
4. Start dev server:
   ```bash
   npm run dev
   ```

## Database schema

Primary table: `public.game_sessions`

- `id uuid pk`
- `status text` (`waiting` | `active` | `finished`)
- `rope_position int` (`0..100`)
- `step_size int` (default `5`)
- `winner smallint` (`1` or `2`)
- `player1_token text`
- `player2_token text`
- `current_problem jsonb` (`a`, `b`, `op`, `text`, `nonce`)
- `version bigint`
- timestamps

RPC functions:

- `generate_math_problem()`
- `eval_math_problem(problem jsonb)`
- `attempt_answer(session, token, answer, nonce)`
- `reset_match(session, token)`

## Race-condition strategy

`attempt_answer(...)` runs inside PostgreSQL with `SELECT ... FOR UPDATE` on the session row.

- simultaneous answer requests are serialized
- nonce must match current problem (`stale_problem` otherwise)
- answer is validated server-side from problem operands/operator
- rope shift + winner calculation + next problem generation commit atomically

## Code structure

- `components/SessionController.tsx`: session lifecycle, join/create token use, realtime sync, submit/rematch actions
- `components/GameBoard.tsx`: rope and marker visualization
- `components/MathInput.tsx`: arithmetic input and submit UX
- `lib/math.ts`: utility generation/evaluation/sanitization helpers
- `app/api/sessions/**`: server-side endpoints
- `supabase/schema.sql`: DB schema and transactional game logic

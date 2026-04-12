# Coding Conventions

**Analysis Date:** 2026-04-12

## Naming Patterns

**Files:**
- Server actions: kebab-case (e.g., `awards.ts`, `store.ts`, `purchases.ts`)
- Components: PascalCase with `.tsx` extension (e.g., `StoreManagement.tsx`, `AwardForm.tsx`, `Nav.tsx`)
- Database functions: camelCase (e.g., `getUserTransactions`, `getLeaderboard`)
- Type files: camelCase (e.g., `types.ts`, `constants.ts`, `utils.ts`)

**Functions:**
- Async database/API functions: camelCase with Get/Fetch/Create prefixes (e.g., `getCurrentProfile()`, `getUserBalance()`, `getLeaderboard()`)
- React components: PascalCase (e.g., `StoreGrid`, `AwardForm`, `Nav`)
- Server actions: camelCase, verb-first (e.g., `awardBucks()`, `purchaseItem()`, `createStoreItem()`)
- Utility functions: camelCase (e.g., `cn()` for classname merging)

**Variables:**
- React state: camelCase (e.g., `dialogOpen`, `loading`, `togglingId`, `error`)
- Props: camelCase (e.g., `toUserId`, `itemId`, `displayName`)
- Form field names: camelCase on client, snake_case on database (e.g., form gets `toUserId`, database gets `to_user_id`)
- Constants: UPPER_CASE for exported constants (e.g., `TRANSACTION_CATEGORIES`, `CATEGORY_LABELS`)

**Types:**
- Type names: PascalCase (e.g., `Profile`, `Transaction`, `StoreItem`, `TransactionWithProfiles`)
- Type exported from constants: PascalCase (e.g., `TransactionCategory` derived from `TRANSACTION_CATEGORIES`)
- Props types: Suffixed with `Props` or simple `Props` for generic component props (see `store-management.tsx` line 29: `type Props = { items: StoreItem[] }`)

## Code Style

**Formatting:**
- Tailwind CSS v4 with PostCSS for styling
- No dedicated formatter config file (relies on ESLint)
- Spacing: 2-space indentation (inferred from source files)
- Line length: No strict limit observed, but typically kept reasonable

**Linting:**
- ESLint v9 with Next.js flat config
- Configuration: `eslint.config.mjs` (flat config format)
- Extends: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Ignores: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- Run: `npm run lint` (ESLint only, no Prettier)

**TypeScript:**
- Strict mode enabled (`strict: true` in `tsconfig.json`)
- Target: ES2017
- Module resolution: bundler
- Type checking required for all `.ts` and `.tsx` files
- No `any` types observed in codebase

## Import Organization

**Order:**
1. External libraries (e.g., `import { useState } from "react"`)
2. Next.js imports (e.g., `import { redirect } from "next/navigation"`)
3. Absolute path imports using `@/` alias (e.g., `import { cn } from "@/lib/utils"`)
4. Relative imports (minimal; mostly avoided in favor of `@/`)

**Path Aliases:**
- `@/*` maps to `./src/*` (defined in `tsconfig.json`)
- All imports use absolute paths: `@/components/...`, `@/app/...`, `@/lib/...`, `@/db/...`
- No relative path imports observed

## Error Handling

**Patterns:**
- Server actions return `{ error: string }` or `{ success: true }` objects (see `awards.ts`, `purchases.ts`, `store.ts`)
- Zod validation errors accessed via `parsed.error.issues[0].message` (v4 pattern, not `errors`)
- Supabase errors accessed via `error.message` property
- First error only returned to client: `parsed.error.issues[0].message` (lines 25, 36, 48 in auth.ts)
- Friendly error messages parsed from Postgres RPC errors (e.g., `purchases.ts` lines 42-51)

**Role-based access control:**
- Server actions check `profile.role` with array includes: `["manager", "admin"].includes(profile.role)` (see `awards.ts` line 24)
- Returns `{ error: "Unauthorized" }` for denied access
- Self-award prevention: checks `if (parsed.data.toUserId === profile.id)` (see `awards.ts` line 39)

## Logging

**Framework:** `console` (no dedicated logging library)

**Patterns:**
- No explicit logging in application code
- Supabase errors logged via error handling blocks
- Next.js Turbopack dev server provides request logging

## Comments

**When to Comment:**
- Sparse use of comments; code is self-documenting
- Comments appear only for non-obvious intent:
  - `// Use the atomic RPC function to prevent race conditions` (purchases.ts line 32)
  - `// Parse friendly error messages from the PG function` (purchases.ts line 40)
  - `// The setAll method was called from a Server Component` (server.ts line 21)
  - `// Reset form by clearing the parent form element` (award-form.tsx line 43)
  - `// Mobile menu` (nav.tsx line 120)

**JSDoc/TSDoc:**
- Not used in codebase
- Type definitions are self-explanatory via TypeScript types

## Function Design

**Size:**
- Functions kept small and focused
- Server actions: 20-40 lines typical
- Database functions: 5-15 lines typical
- Components: 30-100 lines typical

**Parameters:**
- Minimal parameters; use objects for related values
- Database query functions accept optional filter objects (see `transactions.ts` lines 25-32)
- React components use `Props` type for all props (see line 29 of `store-management.tsx`)

**Return Values:**
- Server actions: object with `{ error?: string; success?: boolean; purchaseId?: string }`
- Database functions: typed arrays or single objects via Supabase (cast to types)
- Components: JSX element only

## Module Design

**Exports:**
- Named exports for functions (e.g., `export async function getCurrentProfile()`)
- Named exports for components (e.g., `export function StoreManagement({ items }: Props)`)
- No default exports in utilities or database modules
- Default exports for page components (e.g., `export default async function HomePage()`)

**Barrel Files:**
- Not used (no `index.ts` re-exports observed)
- Imports reference specific files directly: `@/components/nav`, `@/db/profiles`

## Client vs Server Code Markers

**Server-side:**
- Database functions: no marker needed (in `/src/db/`)
- Server actions: `"use server"` directive at top of file (see `auth.ts`, `awards.ts`)
- Server-only utilities: in `/src/lib/supabase/server.ts`

**Client-side:**
- React components with state: `"use client"` directive (see `store-management.tsx`, `award-form.tsx`, `nav.tsx`)
- Page components: no directive (server by default)

## Form Handling

**Pattern:**
- Server actions accept `FormData` parameter (e.g., `async function login(formData: FormData)`)
- Form data extracted via `formData.get("fieldName")` calls
- Zod validation before database operations
- Form reset via DOM manipulation after success: `document.getElementById("award-form")?.reset()` (see `award-form.tsx` line 44)

## Type Casting

**Pattern:**
- Cast Supabase responses to types: `(data ?? []) as Profile[]` (see `profiles.ts` lines 27, 39)
- Nullish coalescing for defaults: `data?.balance ?? 0`
- Type assertion when certain of shape (e.g., `data as Profile | null`)

---

*Convention analysis: 2026-04-12*

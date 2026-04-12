# Technology Stack

**Analysis Date:** 2026-04-12

## Languages

**Primary:**
- TypeScript 5 - Application code (strict mode enabled)
- JavaScript - Configuration files (ESM modules)
- SQL - Database schema and Postgres functions

**Secondary:**
- CSS/Tailwind - Styling
- HTML - JSX/TSX templates

## Runtime

**Environment:**
- Node.js (version unspecified in `.nvmrc`, follows Next.js 16 recommendations)

**Package Manager:**
- npm - Dependency management
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework (App Router, Server Actions, Turbopack)
- React 19.2.3 - UI library
- React DOM 19.2.3 - DOM rendering

**UI & Styling:**
- Tailwind CSS v4 - Utility-first CSS framework
- shadcn/ui v3.8.4 - Component library (New York style, RSC-enabled)
- Radix UI v1.4.3 - Headless component primitives
- class-variance-authority v0.7.1 - CSS class composition
- tailwind-merge v3.4.0 - Tailwind class merging utility
- Lucide React v0.564.0 - Icon library

**Forms & Validation:**
- React Hook Form v7.71.1 - Form state management
- @hookform/resolvers v5.2.2 - Zod resolver for RHF
- Zod v4.3.6 - Schema validation (note: v4, not v3)

**Notifications:**
- Sonner v2.0.7 - Toast notification library

**Theming:**
- next-themes v0.4.6 - Dark mode and theme management

## Key Dependencies

**Critical:**
- @supabase/ssr v0.8.0 - Server/client Supabase integration for Next.js
- @supabase/supabase-js v2.95.3 - Supabase JavaScript client library

**Infrastructure:**
- clsx v2.1.1 - Conditional class name utility

## Configuration

**Environment:**
- Environment variables stored in `.env.local`
- Required variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Service role key is server-only (never exposed to client)

**Build:**
- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration (ES2017 target, strict mode)
- `postcss.config.mjs` - PostCSS configuration with Tailwind v4 plugin
- `components.json` - shadcn/ui configuration (New York style, RSC enabled, CSS variables)
- `eslint.config.mjs` - ESLint flat config with next/core-web-vitals and next/typescript rules

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in tsconfig.json)

## Platform Requirements

**Development:**
- Node.js (LTS recommended by Next.js 16)
- npm package manager
- Git for version control
- Supabase project (free tier available)

**Production:**
- Any Node.js hosting compatible with Next.js 16 (Vercel recommended but not required)
- Postgres database via Supabase
- Persistent storage for secrets in environment

## Build & Dev Tools

**Development Server:**
- `npm run dev` - Starts Next.js dev server with Turbopack
- Hot module replacement and fast refresh enabled

**Build:**
- `npm run build` - Production build
- `npm run start` - Start production server

**Linting:**
- `npm run lint` - ESLint with flat config (ESLint v9)
- eslint-config-next v16.1.6 - Next.js recommended rules

---

*Stack analysis: 2026-04-12*

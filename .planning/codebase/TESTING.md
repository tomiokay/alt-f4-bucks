# Testing Patterns

**Analysis Date:** 2026-04-12

## Test Framework

**Runner:**
- Not configured. No test framework (Jest, Vitest, etc.) detected.

**Assertion Library:**
- None installed or configured

**Run Commands:**
- No test scripts available in `package.json`

## Test File Organization

**Location:**
- No test files found in codebase
- No `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` files in `/src/` directory

**Naming:**
- Not established (no test files)

**Structure:**
- Not applicable

## Current Testing Status

**Test Coverage:**
- Zero test files in application code
- Testing infrastructure not set up
- Application is currently untested

## Why Testing Is Not Configured

The project appears to prioritize rapid development with Turbopack and recent Next.js 16 features. The CLAUDE.md instructions focus on:
- Architecture patterns (transaction ledger, atomic purchases, RLS)
- Conventions for writing new features
- Database schema and roles

There is no mention of testing requirements, and no CI/CD pipeline configuration detected.

## Recommended Testing Approach (For Future Implementation)

If tests are to be added, the following patterns should be followed based on existing codebase conventions:

### Unit Testing Pattern (Suggested)

**Framework choice:** Vitest (modern, faster than Jest, works well with Turbopack)

**Structure for database functions:**
```typescript
// src/db/profiles.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getCurrentProfile } from "./profiles";

describe("profiles", () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Mock Supabase client
    mockSupabase = {
      auth: { getUser: vi.fn() },
      from: vi.fn(),
    };
  });

  it("returns null if no authenticated user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    // Test implementation
  });

  it("fetches profile for authenticated user", async () => {
    // Test implementation
  });
});
```

**For server actions:**
```typescript
// src/app/actions/auth.test.ts
import { describe, it, expect, vi } from "vitest";
import { login } from "./auth";

describe("auth actions", () => {
  it("validates email format", async () => {
    const formData = new FormData();
    formData.set("email", "invalid-email");
    formData.set("password", "password123");
    
    const result = await login(formData);
    expect(result.error).toBe("Invalid email address");
  });

  it("validates password length", async () => {
    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("password", "short");
    
    const result = await login(formData);
    expect(result.error).toBe("Password must be at least 6 characters");
  });

  it("handles Zod v4 error format with .issues", async () => {
    // Uses parsed.error.issues[0].message pattern (see conventions.md)
  });
});
```

**For React components:**
```typescript
// src/components/store-grid.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StoreGrid } from "./store-grid";
import type { StoreItem } from "@/lib/types";

describe("StoreGrid", () => {
  it("renders empty state when no items", () => {
    render(<StoreGrid items={[]} />);
    expect(screen.getByText(/No items in the store/i)).toBeInTheDocument();
  });

  it("renders items in grid layout", () => {
    const items: StoreItem[] = [
      {
        id: "1",
        name: "Test Item",
        description: "Test",
        price: 100,
        active: true,
        stock: 5,
        image_url: null,
        created_at: new Date().toISOString(),
      },
    ];
    render(<StoreGrid items={items} />);
    expect(screen.getByText("Test Item")).toBeInTheDocument();
  });

  it("shows low stock badge when stock <= 3", () => {
    const items: StoreItem[] = [
      {
        id: "1",
        name: "Low Stock Item",
        description: null,
        price: 100,
        active: true,
        stock: 2,
        image_url: null,
        created_at: new Date().toISOString(),
      },
    ];
    render(<StoreGrid items={items} />);
    expect(screen.getByText("2 left")).toBeInTheDocument();
  });
});
```

### Testing Zod Validation

Given Zod v4 is installed, tests should validate against v4 patterns:

```typescript
// Test that uses error.issues (v4) not error.errors (v3)
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { awardSchema } from "@/app/actions/awards";

describe("award validation", () => {
  it("parses valid award data", () => {
    const result = awardSchema.safeParse({
      toUserId: "550e8400-e29b-41d4-a716-446655440000",
      amount: 50,
      reason: "Good contribution",
      category: "contribution",
    });
    expect(result.success).toBe(true);
  });

  it("fails with invalid enum category", () => {
    const result = awardSchema.safeParse({
      toUserId: "550e8400-e29b-41d4-a716-446655440000",
      amount: 50,
      reason: "Test",
      category: "invalid-category",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      // Access error using v4 pattern: .issues not .errors
      expect(result.error.issues[0].message).toBe("Please select a category");
    }
  });

  it("fails with zero amount", () => {
    const result = awardSchema.safeParse({
      toUserId: "550e8400-e29b-41d4-a716-446655440000",
      amount: 0,
      reason: "Test",
      category: "attendance",
    });
    expect(result.success).toBe(false);
  });
});
```

### Critical Areas to Test (Priority Order)

**High Priority (Business Logic):**
1. Purchase atomicity (atomic RPC with row-level locking) — requires mock Supabase RPC
2. Transaction ledger calculations (balance computed from transactions, not stored)
3. Role-based access control (manager/admin vs member)
4. Self-award prevention (cannot award to self)

**Medium Priority (Data Validation):**
1. Zod schema validation for all server actions
2. Email and password validation (auth)
3. Amount validation (cannot be zero)
4. Category enum validation

**Low Priority (UI):**
1. Component rendering with various states
2. Loading states in forms
3. Error message display

### Mocking Patterns

**Supabase Client Mocking:**
```typescript
// Mock pattern for database functions
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  })),
}));
```

**Server Action Testing:**
- Use actual FormData objects in tests
- Mock Supabase responses
- Do NOT mock Zod validation — test real validation

**Component Testing:**
- Mock server action functions
- Use `@testing-library/react` for rendering
- Mock `usePathname` and other Next.js hooks
- Test async behavior with `waitFor`

### What NOT to Test

- Zod library internals (it's battle-tested)
- Supabase library internals
- shadcn/ui component behavior (already tested by library)
- Next.js routing (tested by framework)

---

*Testing analysis: 2026-04-12*

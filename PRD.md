# Product Requirements Document — Alt-F4 Bucks

## Overview
Alt-F4 Bucks is an internal reward system for FRC Team 7558. Team members earn points ("bucks") through attendance, contributions, and team activities. They can spend bucks in a team store for real items or privileges.

## Goals
1. Motivate consistent team participation and contribution
2. Provide a transparent, fair reward system with a public leaderboard
3. Give managers an easy tool to award points and manage the store
4. Prevent abuse through atomic transactions and computed balances

## Users & Roles
| Role | Description |
|------|-------------|
| **Member** | Any team member. Can view leaderboard, check balance, browse store, make purchases. |
| **Manager** | Team leads/mentors. Can award/deduct bucks, manage store items, view audit log. |
| **Admin** | Full system access. Same as manager with potential future elevated permissions. |

## Core Features

### 1. Public Leaderboard (Home Page)
- Displays top 25 members ranked by balance
- Accessible without login
- Shows rank, display name, and balance

### 2. Authentication
- Email/password signup and login via Supabase Auth
- Display name collected at signup
- Profile auto-created via database trigger
- Protected routes redirect to login

### 3. Member Dashboard
- Shows current balance (computed from transaction ledger)
- Lists recent transaction history with type, amount, reason, and date
- Accessible to all authenticated users

### 4. Team Store
- Grid of available items with name, description, price, and stock
- Detail page per item with purchase flow
- Confirmation dialog before purchase
- Atomic purchase via Postgres RPC (prevents double-spending and race conditions)
- Stock tracking (optional per item)

### 5. Manager Panel
- **Award/Deduct Bucks** — select member, enter amount (+/-), provide reason and category
- **Store Management** — add new items, edit existing items (name, description, price, stock, active status)
- **Audit Log** — view all transactions across all users

## Non-Functional Requirements
- Row Level Security on all tables
- Server-side role verification on all write operations
- Service role key never exposed to client
- Balances derived from transaction ledger (never stored)
- Responsive design (mobile-friendly)

## Future Considerations
- Image uploads for store items
- Purchase history page for members
- Notification system for awards
- Batch award (e.g., award all attendees at once)
- Export audit log to CSV
- Dark mode toggle

# JoinFleek Seller Escalations Portal

## Overview

This is an internal seller support ticketing portal for JoinFleek, designed to triage, assign, and resolve seller escalations. The system provides structured issue categorization, automatic priority scoring based on vendor GMV tier and ticket history, and team visibility across departments (Finance, Operations, Marketplace, Tech, Experience, CX, Seller Support).

Key features include:
- Vendor management with GMV tiers and KAM assignments
- Hierarchical issue categorization (Issue Type > Department > L1 > L2 > L3 > L4)
- Automatic priority scoring with P0-P3 badges
- Ticket lifecycle management (New, Open, Pending, Solved, Closed)
- Department-based routing and assignment
- Comment threads on tickets

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Build Tool**: Vite

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript with ESM modules
- **API Style**: RESTful JSON API under `/api/*` routes
- **Database ORM**: Drizzle ORM with PostgreSQL dialect

### Data Storage
- **Database**: PostgreSQL (connection via `DATABASE_URL` environment variable)
- **Schema Location**: `shared/schema.ts` - contains all table definitions
- **Migrations**: Drizzle Kit with `drizzle-kit push` command

### Database Schema
- **vendors**: Seller profiles with GMV tiers, KAM assignments, zones
- **categories**: Hierarchical issue taxonomy with priority points
- **tickets**: Support tickets with priority scoring and status tracking
- **comments**: Threaded comments on tickets
- **users**: Portal users with role-based access (Owner, Admin, Department Head, Agent)

### Priority System
Tickets receive automatic priority scores based on:
1. Vendor's open ticket count (repeat issues)
2. Vendor GMV tier (Platinum/XL down to Bronze/S)
3. Issue type priority points from category

Priority tiers map to badges: P0 (Critical), P1 (High), P2 (Medium), P3 (Low)

### Project Structure
```
client/           # React frontend
  src/
    components/   # UI components (shadcn/ui)
    pages/        # Route pages
    hooks/        # Custom React hooks
    lib/          # Utilities and API client
server/           # Express backend
  routes.ts       # API route definitions
  storage.ts      # Database access layer
  db.ts           # Database connection
shared/           # Shared types and schema
  schema.ts       # Drizzle schema definitions
```

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connected via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### UI Framework
- **shadcn/ui**: Component library built on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

### Planned Integrations (from requirements)
- **Zendesk**: Ticket escalation source (not yet implemented)
- **Slack**: Escalation notifications (not yet implemented)
- **BigQuery/Metabase**: Data analytics integration (not yet implemented)
- **Fleek Hub**: Order data sync via `fleek_hub.order_line_details` (not yet implemented)
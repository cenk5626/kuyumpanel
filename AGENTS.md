<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# KuyumPanel Architecture & Deployment Guardrails

## 1. Magic Numbers & Strings
- All business constants, gold fineness factors (milyem), label dimensions, turnover periods, and roles MUST be defined as constants/enums in `src/constants/`.

## 2. Vercel Serverless & Next.js Server Components Resilience
- **Turso LibSQL Adapter Fallback:** In `src/lib/prisma.ts`, always support automatic LibSQL driver adapter fallback with Turso cloud DB credentials for production/Vercel environments to prevent Lambda SQLite (`file:./dev.db`) read-only filesystem initialization crashes.
- **Dynamic Rendering:** Mark all database-fetching Server Components (`page.tsx`) with `export const dynamic = 'force-dynamic'`.
- **Safe Date Serialization:** Always safely verify Date instances before calling `.toISOString()` (e.g., `d ? (d instanceof Date ? d.toISOString() : new Date(d).toISOString()) : new Date().toISOString()`).
- **Fault-Tolerant Queries:** Wrap server-side database calls in try-catch with safe default fallbacks so serverless pages never crash with a 500 error.

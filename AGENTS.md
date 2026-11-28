<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## HomeCare Web Tech Stack Rules

- **Server Components**: Use Native `fetch` via `@/shared/api/gateway-client` (`gatewayFetch`).
- **Client Components HTTP**: Use Axios via `@/shared/api/http-client` (`requestGateway`) instead of raw `fetch`.
- **Client Data Fetching & Mutations**: Use `@tanstack/react-query` (`useQuery` / `useMutation`), never manual `useEffect` + `setLoading` fetching.
- **Client UI State**: Use `zustand` (`@/shared/store/*`) for shared UI state.
- **Forms & Tables**: Use `react-hook-form` + `zod` (`@hookform/resolvers/zod`) for validated forms and `DataTable` (`@tanstack/react-table`, `@/shared/ui/data-table`) for filterable/sortable/paginated tables. See `.agents/rules/frontend-web-stack.md`.

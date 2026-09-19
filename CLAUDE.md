# YourMix frontend conventions

The [README](README.md) introduces the project and local setup; the [architecture case study](ARCHITECTURE.md) explains system boundaries, integration decisions and delivery.

## Application boundaries

- Business API calls go through `ymart-backend`; never call Acumatica or CS-Cart directly from the browser.
- Never commit credentials or use browser-exposed environment variables for secrets.
- Read `src/router.tsx` before browser exploration. Application screens require authentication and a configured backend.
- The AI page is a placeholder. MSW supplies test fixtures, not a runtime demo mode.
- Do not trigger deployments or cross-repository automation while working on the showcase.

## TypeScript and React

- Use strict TypeScript, explicit function return types and interfaces for object shapes.
- Avoid `any`; ESLint treats it as an error.
- Use `@/` imports across directories and relative `./` imports within a directory.
- Use functional components, custom hooks for reusable logic and interfaces for component props.
- Handle loading, errors and empty states in asynchronous interfaces.
- Use the shared service layer and generated client instead of direct `fetch('/api/...')` calls.
- Use TanStack Query for server state, TanStack Table for table state, React context for authentication and component state for local UI.
- Use the shared `DataTable` for data-heavy screens.
- Guard division by zero. Avoid `console.log` and `console.debug`.
- Follow the existing Prettier configuration and keep layouts usable on mobile.
- Tests use Vitest globals; retain `globals: true` in the Vitest configuration.

## Commands

```bash
pnpm dev
pnpm typecheck
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check
pnpm lint:api
pnpm test:run
pnpm test:coverage
pnpm build
```

Run `pnpm sync:api` only when intentionally updating the backend contract. It fetches the specification, regenerates types and runs Redocly validation; it requires backend or repository access. The checked-in specification is sufficient for inspecting and building this showcase.

## Checks and commits

TypeScript, ESLint, Prettier, Redocly, Vitest and GitHub Actions provide the existing checks. Use focused checks for changed code and retain the repository's hooks. Commit subjects follow `type(scope): intent`.

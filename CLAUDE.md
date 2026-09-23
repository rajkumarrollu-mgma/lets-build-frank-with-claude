# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

The classroom repo for a one-day course. It builds **Frank**: an MCP server plus a
Cloudscape web console, shipped as **one container** to Azure Container Apps.
`server/` and `ui/` start out empty on purpose. You build them from the ADRs in
`docs/adr/`, and **the ADRs are the spec**. Read the relevant ADR before
implementing anything. If what you're asked to do conflicts with an Accepted ADR,
stop and say so rather than working around it.

## Commands

`server/` and `ui/` are each a self-contained npm package (ADR-001, ADR-003) with
the same scripts:

```bash
npm ci
npm run dev      # local dev server
npm test         # tests (server tests live in server/test/)
npm run build
```

In `server/` (vitest): run one file with `npx vitest run test/health.test.ts`,
or one test by name with `-t "<name>"`. Use `npm run typecheck` to typecheck
without building. The build uses `tsconfig.build.json` (src only) and emits
`dist/index.js`, which the image runs.

For console work, run Frank (`cd server && npm run dev`, port 3000) and then
`cd ui && npm run dev`. Vite proxies `/mcp` and `/healthz` to Frank
(`FRANK_DEV_URL` overrides the target), so the console is on the same origin,
as it is in production. To check the one-image layout without Docker, copy
`ui/dist` to `server/public`; `server/public` is gitignored.

Build and run the whole image locally from the **repo root** (the build context
is the root because the image needs both `server/` and `ui/`):

```bash
docker build -t frank . && docker run -p 3000:3000 frank
curl localhost:3000/healthz
```

The Docker build runs `npm test` for both packages. A failing suite fails the
image build, so on `main` the image build is the test gate.

## Architecture (the big picture)

- **Server** (ADR-001): TypeScript on Node 22+, the official `@modelcontextprotocol/sdk`
  (no hand-rolled protocol code), and Streamable HTTP over Express.
  `POST /mcp` is the MCP endpoint and `GET /healthz` returns 200. All config comes
  from env vars (`PORT`, default **3000**). That port must stay in sync with the
  Dockerfile and `deploy.yml`'s `--target-port 3000`.
- **Console** (ADR-003, amended by ADR-006): React 18 + Vite + Cloudscape
  components only, with no other component library and no custom CSS beyond
  layout glue. It has an Overview page (`get_status` output) and a Tools page that
  renders a form from each tool's input schema, so new tools appear with zero UI
  work. **Frank serves the console at `/`** from `<package root>/public` (the
  `ui/dist` build), and the console calls `/mcp` **relatively**. There is no
  `VITE_FRANK_URL` and no CORS. The UI holds no secrets.
- **The console is optional.** Frank must deploy and serve MCP before `ui/` exists.
  The Dockerfile tolerates an empty `ui/`, and the server should answer `/`
  gracefully when `public/` is absent.
- **Endpoint auth**: `/mcp` is deliberately **unauthenticated** (ADR-007 was
  Rejected). Don't add auth without a new ADR.

## Tool conventions (ADR-002). This is policy, not style

The `frank-tools` skill covers these in detail. In short:
- Names are `verb_noun` snake_case, and the verb must be one of **`get`, `list`,
  `search`, `summarize`**. Anything else, like `create_`/`update_`/`delete_`/`run_`,
  is out of policy and needs a new ADR, not a tool.
- **Read-only**: no tool may change any external system (Azure, GitHub, or the
  filesystem beyond temp space).
- Inputs use zod schemas with a description on every parameter, and unknown fields
  are rejected. Outputs are JSON with a top-level `summary` string plus typed
  fields. Errors return `isError: true` with a plain-language message, never a
  stack trace.
- Each tool is its own module under `server/src/tools/`, registered in
  `server/src/tools/index.ts`, with a test in `server/test/`. The first tool is
  `get_status` (version, uptime, greeting).
- After tools change, run the `tool-conventions` agent.

## Deployment (ADR-004/005/006/010)

`.github/workflows/deploy.yml`: PRs build and test only. Pushes to `main` build
the image in ACR and create or update the Container App `frank-<github owner>`.
The workflow fetches a deliberately public, short-lived classroom credential
itself (ADR-010), so forks need no secrets or variables. Setting
`AZURE_CREDENTIALS` on a fork overrides the fetch. The workflow header lists what
was removed on purpose (OIDC, `environment: production`, Static Web Apps). Don't
reintroduce any of them. Pushing to `main` deploys, so work through PRs.

## ADR process

- Use `/adr <title>` for new decisions. It takes the next number, uses
  `docs/adr/template.md`, runs the `adr-reviewer` agent, and leaves the draft
  uncommitted. Accepting a decision is a human's call.
- **Never edit the body of an Accepted ADR.** Write a new ADR that states exactly
  which clauses it supersedes. Only the Status line of a superseded ADR may change
  (ADR-000).
- When ADRs are added or change status, update the tables in **both**
  `docs/adr/README.md` and `README.md`.
- Keep ADRs to about one page (roughly 290–375 words). SDK property names, error
  strings and signatures belong in code, not in ADRs.
- ADR-008 and ADR-009 are written by students in class. ADR-009 gives Frank read
  access to his own resource group.

## Agents in `.claude/agents/`

All three are read-only: `adr-reviewer` (opus) checks ADRs,
`tool-conventions` (haiku) audits `server/src/tools/` against ADR-002, and
`secret-scanner` (haiku) should run before committing or opening a PR.

# AGENT.md

For deployment and operations details, see `COOLIFY.md`.

## System Model

- Server is the single source of truth
- Rendering is server-only
- JSX = templating (no React runtime)
- Minimal or zero client JS (HTMX if needed)

---

## Data & Validation

- Zod defines all domain models
- Types are **always** `z.infer`
- No standalone TypeScript types

**Validate at all boundaries:**

- HTTP input
- External APIs
- Untrusted DB data

---

## Project Structure

```
/src
  /server        # routing + orchestration
  /views         # pure JSX templates
  /lib           # shared utilities
```

---

## Route Contract

Every route follows:
Define Zod schemaParse requestExecute logicRender view

```ts
const QuerySchema = z.object({
  page: z.coerce.number().default(1),
});

app.get("/domains", async (c) => {
  const query = QuerySchema.parse(c.req.query());
  const domains = await listDomains(query);
  return c.html(render(DomainsPage, { domains }));
});
```

**Rules:**

- Never use unparsed `c.req`
- Never pass unvalidated data to views

---

## Views

Views are pure, typed functions.

**Allowed:**

- Input → JSX

**Forbidden:**

- Data fetching
- State mutation
- Global access

```tsx
export function DomainsPage({ domains }: { domains: Domain[] }) {
  return (
    <Layout title="Domains">
      {domains.map((d) => (
        <DomainCard domain={d} />
      ))}
    </Layout>
  );
}
```

---

## Layout

- Single root layout
- Keep nesting simple
- No complex head logic

---

## Rendering

```ts
export function render<T>(
  Component: (props: T) => JSX.Element,
  props: T
) {
  return <Component {...props} />;
}
```

---

## Constraints

**Do not introduce:**

- SPA frameworks (React/Vue/etc.)
- Client state libraries
- Data fetching in JSX
- `any`
- Raw HTML strings
- Skipping validation
- Complex build systems

---

## Design Principle

> Backend-driven HTML with strict data contracts

---

## Agent Rules

- Start from Zod
- Derive all types
- Validate everything
- Keep views pure
- Prefer simple over abstract

---

## Interactive Clarification Protocol (`question`-First)

When requirements are not fully deterministic, the agent MUST use the `question` tool to resolve ambiguity before acting.

- Default to `question` over freeform asking when decisions can be structured
- Ask in iterative rounds; keep asking until implementation-critical ambiguity is removed
- Prefer concise, decision-oriented option sets
- Keep custom answer enabled for missing options
- Use `multiple: true` when multiple selections are valid
- Do not silently assume when a `question` can resolve uncertainty

Use `question` aggressively for:

- Spec generation and spec review workflows
- Scope boundaries and non-goals
- Contract definitions (inputs/outputs, schemas, side effects)
- Error handling and fallback behavior
- Dependency and integration choices
- Test expectations and acceptance criteria

For spec-oriented tasks, target high clarification density (typically 8+ high-impact questions across rounds) unless the input is already explicit and unambiguous.

---

## Tooling

- Use `brave_*` for search
- Use `cloudflare_get_url_markdown` for page retrieval
- Use `context7_resolve-library-id` + `context7_query-docs` to look up library/framework documentation and code examples before writing code that depends on any library or framework
- For open-source repository questions, prefer `zread` as the default research and answer path.
- Analyze screenshots with `image_analysis`

### Code Navigation (`lsp`)

Use `lsp` operations to understand and navigate the codebase accurately:

- `goToDefinition` — find where a symbol is defined before modifying it
- `findReferences` — find all usages of a symbol before renaming or changing its interface
- `hover` — get type info and documentation for unfamiliar symbols
- `documentSymbol` — get an overview of all symbols in a file
- `workspaceSymbol` — search for symbols across the entire workspace

Always use `lsp` over grep/glob when you need precise symbol information. Prefer `lsp` before editing to understand the full impact of a change.

### Code Search (`codesearch`)

Use `codesearch` (Exa Code API) to find high-quality code examples and patterns:

- When you need idiomatic usage patterns for a library or framework
- When looking for specific API usage examples
- When exploring unfamiliar SDKs or integration patterns

### Task Delegation (`task`)

Use `task` to delegate work to sub-agents:

- `explore` — fast codebase exploration (finding files, searching code, answering questions about the codebase)
- `general` — complex multi-step tasks that benefit from parallel execution
- Use `task` when work can be decomposed into independent parallel units
- Use `task` for large-scale searches or when you need to explore multiple areas of the codebase simultaneously

### Task Tracking (`todowrite`)

Use `todowrite` to track progress on multi-step tasks:

- Use it when a task requires **3 or more distinct steps** or involves multiple files/components
- Mark tasks `in_progress` one at a time — never have multiple tasks active simultaneously
- Mark tasks `completed` immediately after finishing — do not batch completions
- Cancel tasks that become irrelevant as understanding evolves
- Update the list as new subtasks are discovered during implementation
- Do not use `todowrite` for trivial single-step tasks

### Screenshot Validation Flow

When validating UI with Playwright screenshots, always run this sequence:

1. Start the app server first (do not take screenshots against a stopped/stale server)
2. Capture screenshots into `./screenshots`
3. Inspect each screenshot with `image_analysis`
4. If styling/layout is broken, fix it and retake the screenshot with the server running

Do not mark UI work complete until the latest screenshot passes visual inspection.

---

## Error Investigation Protocol

When encountering an error, you MUST gather external context before attempting a fix.

- Never guess fixes without external confirmation
- Never rely solely on internal knowledge for non-trivial errors
- Always ground fixes in real-world sources when debugging

1. **Search**
   - Use `brave_*` to search for the exact error message
   - Include stack trace, library name, and environment when available

2. **Select Sources**
   - Official documentation
   - GitHub issues
   - Maintainer discussions

3. **Fetch Content**
   - Use `cloudflare_get_url_markdown` on relevant results
   - Extract concrete causes, constraints, and known fixes

4. **Then Act**
   - Diagnose root cause
   - Propose fix

This process may be skipped **only if**:

- The error is trivial and deterministic
  (e.g. missing import, typo, type mismatch clearly explained by compiler)

If there is any ambiguity → **DO NOT SKIP**

Add this as a **concise, enforceable extension**:

---

## Research & Dependency Strategy

Before implementing any non-trivial functionality, the agent MUST verify whether a well-maintained solution already exists.

- Do not reinvent solved problems
- Do not introduce obscure or unmaintained packages
- Do not add dependencies without justification
- Prefer simple, focused libraries over large frameworks

1. **Search**
   - Use `brave_*` to search for:
     - Existing libraries
     - Standard approaches
     - Best practices

2. **Evaluate Options**
   Prefer solutions that are:
   - Widely adopted
   - Recently maintained
   - Well documented
   - Actively used in production

3. **Validate Library Health**
   Check:
   - Recent commits (not abandoned)
   - Download/activity signals
   - Community usage (issues, stars, discussions)

4. **Decide**

- If a solid library exists → **use it**
- If not → implement minimal custom solution

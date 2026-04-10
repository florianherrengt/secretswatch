# AGENT.md

## 1. Core Principles

### Architecture

- Server is the source of truth
- All rendering happens on the server
- No client-side state management frameworks
- Everything is typed and validated

### Validation

- All external inputs MUST be validated with Zod
- All internal data structures MUST have TypeScript types derived from Zod
- Zod is the single source of truth

### Views

- Views are pure functions
- No side effects
- No data fetching inside views
- Input → JSX → HTML only

### Runtime

- No React runtime
- JSX is used as a templating DSL only
- No hooks, no hydration unless explicitly required

### Client

- Minimal client JavaScript
- Prefer zero JS
- If needed, use small isolated scripts or HTMX

---

## 2. Project Structure

```
/src
  /server
    app.ts
    routes/
  /views
    layout.tsx
    pages/
  /lib
    response.tsx
```

---

## 3. Zod as Single Source of Truth

All domain models MUST be defined using Zod.

```ts
import { z } from "zod";

export const DomainSchema = z.object({
  id: z.string(),
  hostname: z.string(),
});

export type Domain = z.infer<typeof DomainSchema>;
```

### Rules

- NEVER define a TypeScript type without a Zod schema
- ALWAYS export both schema and inferred type
- ALL boundaries must validate:
  - HTTP input
  - DB responses (if untrusted)
  - External APIs

---

## 4. Route Definition Pattern

Each route MUST follow this structure:

1. Define input schema
2. Parse request
3. Execute logic
4. Render typed view

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

### Hard Rules

- NEVER access `c.req` directly without Zod parsing
- NEVER pass unvalidated data into views

---

## 5. View System (JSX)

### View Rules

Views MUST:

- be pure functions
- be fully typed
- receive only validated data

Views MUST NOT:

- fetch data
- mutate state
- access global context

### Example

```tsx
export function DomainsPage({ domains }: { domains: Domain[] }) {
  return (
    <Layout title="Domains">
      <h1>Domains</h1>
      {domains.map((d) => (
        <DomainCard domain={d} />
      ))}
    </Layout>
  );
}
```

---

## 6. Layout System

```tsx
export function Layout({ title, children }: { title: string; children: any }) {
  return (
    <html>
      <head>
        <title>{title}</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Rules

- One root layout
- Nested layouts allowed but simple
- No complex head management

---

## 7. Response Helpers

```ts
export function render<T>(
  Component: (props: T) => JSX.Element,
  props: T
) {
  return <Component {...props} />;
}
```

---

## 8. Forbidden Patterns

The agent MUST NOT:

- Introduce React, Vue, or SPA frameworks
- Use client-side state libraries
- Fetch data inside JSX
- Use `any`
- Bypass Zod validation
- Generate raw HTML strings
- Introduce complex build pipelines

---

## 9. Design Philosophy

The system should feel like:

> **Backend-first with structured HTML generation + data pipeline**

NOT:

> frontend app running on the server

---

## 10. Agent Behavior Rules

When generating code, the agent MUST:

- Start from Zod schemas
- Derive types from schemas
- Validate all inputs
- Keep views pure and simple
- Prefer clarity over abstraction
- Avoid premature optimization

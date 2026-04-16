# Architecture

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

Every route follows: Define Zod schema → Parse request → Execute logic → Render view

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

## Layout

- Single root layout
- Keep nesting simple
- No complex head logic

---

## Design Principle

> Backend-driven HTML with strict data contracts

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

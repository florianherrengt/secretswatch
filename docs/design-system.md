# Design System

## Static Enforcement

This project enforces frontend design-system compliance statically via ESLint and project policy contracts.

### Frontend Scope Definition

The scope classifier is path-only and deterministic.

- Frontend paths:
  - `src/views/**/*.tsx`
  - `src/views/**/*.jsx`
- Backend/excluded paths:
  - `src/server/**`
  - `src/api/**`
  - `src/pipeline/**`
  - `src/schemas/**`
  - `src/lib/**`
  - `scripts/**`
  - `db/**`
  - `drizzle/**`
  - `infra/**`
  - `tests/**`
  - `dist/**`

Classifier contract:

```text
FileScope
- filePath: string
- classification: "frontend" | "backend" | "out_of_scope"
- matchedRule: string
```

Implementation: `eslint/design-system-enforcement/frontend-scope.js`

### Design-System Policy Definition

The policy is centralized and loaded from `eslint/design-system-enforcement/policy.js`.

Contract:

```text
DesignSystemPolicy
- approvedComponents: set of component names
- approvedRawElements: set of HTML tag names
- forbiddenRawElements: set of HTML tag names
- approvedClassPatterns: set of allowed utility/token patterns
- forbiddenClassPatterns: set of banned utility/token patterns
- approvedStyleProps: set/list (empty by default)
- forbiddenProps: set of prop names
- suppressionRules: fixed suppression format
```

Policy defaults are strict:

- inline styles forbidden
- arbitrary Tailwind values forbidden
- non-approved class tokens forbidden
- non-static class construction forbidden unless path-specific policy exceptions exist

### Lint Configuration

Design-system enforcement is applied through ESLint custom rules:

- `custom/ds-no-raw-html-elements`
- `custom/ds-no-inline-style-prop`
- `custom/ds-no-arbitrary-tailwind-values`
- `custom/ds-no-unapproved-class-tokens`
- `custom/ds-no-direct-semantic-styling`
- `custom/ds-no-unsafe-classname-construction`
- `custom/ds-enforce-suppression-format`

All are configured as `error` in `eslint.config.js`.

### Exception Policy

Only local next-line suppression is allowed for design-system rules:

```text
eslint-disable-next-line custom/ds-<rule> -- ds-exception: TEAM-123 | justification
```

Forbidden directives for design-system rules:

- `eslint-disable`
- `eslint-disable-line`
- `eslint-enable`
- `@ts-ignore`

Malformed suppression is itself an error.

### CI Integration

CI blocks merges on design-system violations via `.github/workflows/ci.yml`:

- `npm run lint`
- `npm run lint:design-system-enforcement`
- `npm test`

`lint:design-system-enforcement` is defined in `package.json` and emits machine-readable JSON output.

### Legacy Enforcement Mode

Mode: `strict` (configured in `eslint/design-system-enforcement/policy.js`).

All current and future frontend files in scope must pass design-system rules.

---

## UI Execution Contract

### Purpose

This defines **deterministic, enforceable rules** for how UI must be built.

- This is **not guidance**.
- This is **not design inspiration**.
- This is a **contract** the agent must follow.

The agent:

- does **not design**
- does **not improvise**
- does **not introduce new patterns**

The agent:

- **composes UI using predefined rules**
- **follows constraints exactly**
- **rejects ambiguity**

### Core Principles

#### Deterministic Composition

- UI must be assembled from known patterns
- No creative interpretation
- No "guessing what looks good"

#### Constraint Over Freedom

- If a rule exists → it MUST be followed
- If a rule is missing → use the simplest standard SaaS pattern

#### Consistency First

- Identical problems → identical UI solutions
- No variation without explicit instruction

### Design References (Translated to Rules)

The following references are **already translated into constraints**:

**Stripe**

- Generous spacing between sections (≥ 32px)
- Clear typography hierarchy
- Minimal borders
- Readable tables

**Linear**

- Compact, dense lists and tables
- Strong alignment and grid discipline
- Minimal color usage

**Vercel**

- Minimal UI
- No visual noise
- Neutral-first color palette

### Layout System

#### Page Structure (Mandatory)

Every page MUST follow:

```
Page
├── Header
│   ├── Title (left)
│   └── Primary Action (right)
│
├── Content
│   ├── Section
│   │   ├── Section Title
│   │   └── Section Content
│
└── Footer / Secondary Actions (optional)
```

#### Section Rules

- Sections MUST be visually grouped
- Spacing between sections ≥ 32px
- Each section MUST have:
  - title
  - optional description
  - content

#### Alignment

- Use strict vertical alignment
- Use consistent left edges
- Avoid arbitrary positioning

### Spacing System

#### Scale

Use ONLY this spacing scale:

```
4px, 8px, 12px, 16px, 24px, 32px, 48px
```

#### Rules

- Component internal spacing: 8–16px
- Between components: 16–24px
- Between sections: ≥ 32px

#### Prohibitions

- No random spacing values
- No inconsistent spacing within same component type

### Typography

#### Hierarchy

- Page Title: 24–32px
- Section Title: 16–18px
- Body: 14px
- Supporting text: muted, smaller or equal to body

#### Rules

- Titles must be visually dominant
- Avoid excessive font sizes
- Do not mix too many font weights

### Color System

#### Rules

- Neutral-first palette (gray scale)
- Maximum ONE accent color
- Use color for:
  - primary action
  - status (success, error, warning)

#### Prohibitions

- No decorative colors
- No gradients unless explicitly required
- No multiple competing accent colors

### Component System

#### Library Constraint

- MUST use shadcn/ui components
- No custom components unless explicitly required

#### Composition Rule

- Compose from existing primitives
- Do not recreate existing patterns

### Inline vs Block Rules (Critical)

#### Inline Content

Short content MUST remain inline.

Correct:

```
> Text here
> [icon] Label
```

Incorrect:

```
>

Text here
```

#### Prefix Rule

- Prefix elements (icons, `>`, labels) MUST stay inline
- NEVER place prefix on its own line

#### Layout Rule

- Use horizontal layout (flex row) for:
  - icon + text
  - label + value
  - prefix + content

#### Block Usage

Use multiline ONLY for:

- paragraphs
- lists
- complex content

### Interaction States (Mandatory)

Every data-driven component MUST support:

**Loading**

- Use skeletons
- NEVER use spinners alone

**Empty State**

- Explain why empty
- Provide clear next action

**Error State**

- Explain what happened
- Provide retry or recovery action

### Visual Hierarchy Rules

- One primary action per screen
- Primary action MUST be visually dominant
- Avoid equal visual weight across elements

### Data Display Rules

#### Tables / Lists

- Must be readable
- Adequate row spacing
- Avoid dense unreadable layouts

#### Content Handling

- Handle long text (truncate or wrap properly)
- Handle edge cases (empty, overflow)

### Anti-Patterns (STRICTLY FORBIDDEN)

The following MUST NOT appear:

- Multiple competing primary actions
- Equal spacing everywhere (flat UI)
- Excessive borders
- Decorative UI elements
- Random colors
- Misaligned elements
- Prefix elements on separate lines
- Arbitrary layout decisions

### UI Smell Detection

The agent MUST detect and fix:

- Elements with equal visual weight (no hierarchy)
- Broken alignment
- Inconsistent spacing
- Detached icons/prefixes
- Overly dense or overly sparse layouts

### Execution Process (Mandatory)

1. **Describe UX** — What is the goal of the screen? What is the primary action?
2. **Define Layout** — Identify sections, define hierarchy
3. **Implement UI** — Using constraints above
4. **Critique** — Validate against hierarchy, spacing, CTA clarity, cognitive load, inline vs block correctness
5. **Refine** — Fix all violations, remove all UI smells

### Final Validation Checklist

Before completion, ALL must be true:

- Clear primary action exists
- Visual hierarchy is obvious
- Spacing is consistent
- No inline/block violations
- All states (loading/empty/error) handled
- No anti-patterns present

### Non-Negotiable Rule

If any rule is violated:

> The UI is considered incorrect and MUST be fixed before completion.

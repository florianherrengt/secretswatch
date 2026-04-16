# Tooling

> See also: `.opencode/commands/improve-loop.md` for the autonomous improvement loop that uses lint/typecheck/test verification.

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

# Agent Protocols

## Interactive Clarification Protocol (`question`-First)

> See also: `.opencode/commands/generate-specs.md` and `.opencode/commands/review-specs.md` for spec-specific clarification workflows.

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

---

## Research & Dependency Strategy

> See also: `.opencode/commands/improve-code.md` for concrete dependency evaluation when refactoring.

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

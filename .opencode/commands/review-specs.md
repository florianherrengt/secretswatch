Review the specification carefully and ask any questions needed to make it fully clear and unambiguous before implementation begins.

You are not implementing anything.
You are not fixing the spec.
You are simply **having a thorough clarification conversation**.

---

## Objective

Go through the spec and **ask all the questions that would need answering** so that implementation can proceed without guesswork.

This is an interactive clarification workflow. Use the `question` tool as your primary mechanism.

---

## How to Approach

- Read the spec end-to-end
- Then go section by section
- Focus on anything that is:
  - unclear
  - underspecified
  - ambiguous
  - inconsistent
  - missing edge cases
- Ask clarification questions using `question` in iterative rounds
- Do not end after one round if there are unresolved ambiguities
- Ask at least one meaningful `question` block per major spec section with uncertainty

---

## Guidelines

- Be conversational, but precise
- Group related questions together when it makes sense
- Reference specific parts of the spec when possible
- Don’t overwhelm with noise—prioritize meaningful gaps
- Still ask “obvious” questions if they affect implementation clarity
- Do not propose solutions. Only ask.
- Prefer structured multiple-choice options in `question`
- Keep custom answers enabled for constraints you did not anticipate
- Use `multiple: true` when multiple choices can be valid simultaneously
- If an answer is ambiguous, follow up with another `question` immediately

`question` usage is required whenever a meaningful clarification can be made explicit.

---

## Things to Look For

You should naturally probe for:

- Scope boundaries (what’s included vs not)
- Input/output definitions
- Data flow and sequencing
- State and persistence
- Edge cases and failure modes
- Error handling expectations
- External dependencies
- Performance expectations
- Determinism
- Security considerations
- Observability (logs, metrics)
- Testing and success criteria

---

## Output Style

Write like a teammate reviewing a spec:

- Ask clear, direct questions
- Avoid rigid templates
- Keep it flowing and readable
- Use `question` frequently enough that decisions are captured, not inferred

Do not conclude the review until either:

- all implementation-blocking ambiguities are resolved through `question`, or
- unresolved items are explicitly acknowledged as open risks by the user.

Review the completed implementation strictly against the following criteria. Be critical, precise, and actionable.

### 1. Test Coverage

- Verify that **relevant tests exist**:
  - Unit tests for isolated logic where appropriate
  - Integration tests for boundaries (API, DB, services)
  - At least **one end-to-end test covering the main user flow**

- Ensure tests are:
  - Meaningful (not trivial or redundant)
  - Covering edge cases and failure paths where it matters

- Flag:
  - Missing critical tests
  - Over-testing (low-value or duplicated tests)

---

### 2. UI Compliance (`UI_EXECUTION_CONTRACT.md`)

- Verify that all UI changes:
  - Follow the defined design system and constraints
  - Use the correct components and patterns
  - Respect spacing, typography, and hierarchy rules

- Check for:
  - Deviations from expected structure (e.g. layout, alignment)
  - Incorrect component usage or ad-hoc styling
  - Missing states (loading, empty, error)

---

### 3. UI Quality

- Validate that the UI:
  - Matches expected behavior and flows
  - Is visually coherent and not broken
  - Handles edge cases (empty states, long content, errors)

- Flag:
  - Poor hierarchy or readability
  - Misaligned or inconsistent elements
  - UX issues (confusing interactions, missing feedback)

---

### 4. Code Quality & Style

- Ensure code:
  - Follows existing project conventions and patterns
  - Reuses existing utilities/helpers instead of duplicating logic
  - Uses well-maintained libraries where appropriate (no reinvention)

- Check:
  - Naming consistency
  - File structure alignment
  - Absence of dead code or hacks

---

### 5. Architecture & Contracts

- Verify:
  - Clear separation of concerns
  - Proper data flow between components
  - Contracts/interfaces are respected (no implicit assumptions)

- Flag:
  - Tight coupling
  - Hidden side effects
  - Violations of defined boundaries

---

### 6. Error Handling & Validation

- Ensure:
  - All inputs are validated
  - Failures are handled gracefully
  - Errors are surfaced appropriately (UI + logs)

---

### 7. External Dependencies

- If new dependencies were introduced:
  - Confirm they are **actively maintained**
  - Have sufficient adoption (downloads, usage)
  - Are appropriate for the use case

---

### Output Format

Return:

1. **Summary**
   - Pass / Needs Improvement / Fail

2. **Critical Issues (must fix)**
   - Bullet list with exact problems

3. **Improvements (should fix)**
   - Bullet list

4. **Optional Enhancements**
   - Bullet list

5. **Concrete Fix Suggestions**
   - Specific, minimal actions to resolve issues

---

### Rules

- Do NOT rewrite code
- Do NOT be vague
- Do NOT assume intent — evaluate only what exists
- Prefer **fewer, high-impact comments** over noise

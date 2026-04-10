Run a bounded autonomous improvement loop on the current project.

## Instructions

You are entering an autonomous improvement mode.

### Step 1 — Initialize loop

Call `start_improvement_loop` with:

- maxIterations: 5
- scoreThreshold: 0.6
- noValueStreakLimit: 2

---

### Step 2 — Iteration loop

Repeat until the loop stops:

#### 2.1 Generate proposals

Produce up to 3 HIGH-IMPACT improvements.

Rules:

- Focus on correctness, performance, maintainability, or security
- Avoid cosmetic or stylistic changes
- Avoid repeating previous ideas

---

#### 2.2 Evaluate

Call `evaluate_improvement_proposals`

If decision = "stop":

- Stop immediately
- Go to final summary

---

#### 2.3 Implement

Implement ONLY the selected proposal.

Keep changes:

- minimal
- focused
- safe

---

#### 2.4 Verify

Run:

- eslint
- tsc
- vitest

Do not skip verification.

---

#### 2.5 Record result

Call `record_improvement_result` with:

- status (success/failed)
- verification results
- changed files
- short summary

---

### Step 3 — Final summary

When loop stops:

Provide a concise summary:

- what improvements were made
- what was rejected and why
- why the loop stopped

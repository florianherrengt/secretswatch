Here is the full roadmap we’ve been building, in order, with the intent behind each step so you keep the big picture clear.

---

# Overview

You are building:

> a system that finds exposed secrets on real websites and turns that into a product

The steps are deliberately incremental so you validate signal early and avoid overbuilding.

---

# Step 1 — Data Model

**Goal:** define the minimum structure to store results

You implemented:

- Domain
- Scan
- Finding

Why it matters:

- gives you persistence
- defines what a “result” actually is

---

# Step 2 — Scan Pipeline

**Goal:** scan a single domain end-to-end

You built:

- fetch homepage
- extract JS
- fetch partial bundles
- detect high-confidence secrets

Constraints:

- very strict detection (low false positives)
- no infra, no queues

Why it matters:

> proves you can actually find real leaks

---

# Step 2.5 — Scenarios (local test environment)

**Goal:** simulate real vulnerable websites

You built:

- `/scenarios/*` routes
- controlled JS leaks
- deterministic behavior

Why it matters:

- reproducible testing
- demo environment
- debugging tool

---

# Step 3 — Product Loop

**Goal:** make the system usable

You now have:

- `/` → input domain
- `/scan` → run scan
- `/scan/:id` → show results
- DB persistence

Why it matters:

> you now have a working product loop

# Step 4 — Domain Qualification

**Goal:** avoid scanning garbage domains

You will add:

- homepage validation
- JS-heavy detection
- parking page filtering
- basic scoring

Why it matters:

> this is where performance and signal quality come from

Without this:

- you waste bandwidth
- you get noise
- the system doesn’t scale

---

# Step 5 — Detection Improvements

**Goal:** increase signal without increasing false positives

You will add:

- entropy filtering
- context-aware detection
- allowlists (public keys, analytics, etc.)
- better snippet extraction

Why it matters:

> this is your core product differentiation

---

# Step 6 — Deduplication

**Goal:** avoid repeated alerts

You will add:

- fingerprint-based dedupe
- cross-scan suppression

Why it matters:

- prevents spam
- enables real monitoring product

---

# Step 7 — Async Workers

**Goal:** scale scanning

You will introduce:

- background jobs
- queue (SQS / Redis)
- retry logic

Why it matters:

> enables volume (many domains)

---

# Step 8 — Domain Sourcing

**Goal:** feed the system

You will add:

- CT log ingestion
- domain filtering
- pipeline feeding scans

Why it matters:

> this becomes your lead engine

---

# Step 9 — Notification Layer

**Goal:** turn findings into value

You will add:

- email alerts
- structured disclosure messages

Why it matters:

> this is how you convert users

---

# Step 10 — Monitoring Product

**Goal:** recurring revenue

You will add:

- scheduled scans
- history
- dashboard
- subscriptions

Why it matters:

> this is the actual business

---

# The key insight

Everything so far (Steps 1–3) was:

> “Can we detect real issues reliably?”

Everything next (Steps 4–10) is:

> “Can we do it at scale and turn it into a product?”

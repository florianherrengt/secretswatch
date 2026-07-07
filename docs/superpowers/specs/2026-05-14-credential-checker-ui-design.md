# Credential Checker UI Design

## Overview

A dedicated marketing page at `/credential-checker` that lets people check if API keys are valid. Designed as a shareable stunt to drive awareness of Secrets Watch.

## Route

- `GET /credential-checker` — renders the page with an empty form
- `POST /credential-checker` — validates credentials via the verifier, re-renders with result

## Layout

Centered single card on the page, matching existing site styling (border-border, bg-card, rounded-xl). Uses the existing Layout component.

### Form

- Provider dropdown: OpenAI, AWS, GitHub, Google, Stripe
- API key input (type=password)
- "Check credential" button

### Result display (shown below form after submit)

- Valid → green badge + "This credential is active"
- Invalid → red badge + "This credential doesn't work (or has been revoked)"
- Error → neutral + "Could not verify — try again"

The form keeps its submitted values so the user can tweak and try again.

### Post-result CTA

Soft call-to-action below the result: "Secrets Watch scans websites for exposed API keys." with a "Scan your site →" link to `/`.

## Files

- `src/views/pages/credentialChecker.tsx` — page component with form + result display
- `src/server/routes/verify/ui.ts` — GET and POST route handlers

## Implementation Notes

- Standard form submission (no client JS needed)
- Same pattern as the scan form on the homepage
- The route is registered separately from the API endpoint
- Uses existing Layout, same design tokens

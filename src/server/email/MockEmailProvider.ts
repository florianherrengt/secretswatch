import { z } from "zod";
import { db } from "../db/client.js";
import { mockEmails } from "../db/schema.js";
import type { EmailProvider } from "./EmailProvider.js";

/**
 * Mock email provider that persists sent emails to the database instead of
 * delivering them over SMTP. Automatically used in non-production when
 * SMTP_HOST/SMTP_USER/SMTP_PASS are not configured (see `createEmailProvider`
 * in index.ts).
 *
 * Each call to `send()` writes a row to the `mock_emails` table so that
 * integration and E2E tests can query which emails were "sent" (e.g. to
 * extract a magic login link) without requiring an external SMTP server.
 */
// eslint-disable-next-line no-restricted-syntax
export class MockEmailProvider implements EmailProvider {
  send = z
    .function()
    .args(
      z.object({
        to: z.string(),
        subject: z.string(),
        html: z.string(),
      }),
    )
    .returns(z.promise(z.void()))
    .implement(async (input) => {
      await db.insert(mockEmails).values({
        id: crypto.randomUUID(),
        to: input.to,
        subject: input.subject,
        html: input.html,
        createdAt: new Date(),
      });
    });
}

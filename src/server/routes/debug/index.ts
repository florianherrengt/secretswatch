import { z } from "zod";
import { Hono } from "hono";
import type { Context } from "hono";
import { db } from "../../db/client.js";
import { mockEmails } from "../../db/schema.js";
import { desc } from "drizzle-orm";

const app = new Hono();

app.get(
  "/emails",
  z
    .function()
    .args(z.custom<Context>())
    .returns(z.promise(z.instanceof(Response)))
    .implement(async (c) => {
      const emails = await db
        .select()
        .from(mockEmails)
        .orderBy(desc(mockEmails.createdAt));

      return c.json(emails);
    })
);

app.post(
  "/emails/clear",
  z
    .function()
    .args(z.custom<Context>())
    .returns(z.promise(z.instanceof(Response)))
    .implement(async (c) => {
      await db.delete(mockEmails);
      return c.json({ success: true });
    })
);

export default app;

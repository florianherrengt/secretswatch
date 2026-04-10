import { z } from "zod";

export const userDomainSchema = z.object({
	id: z.string().uuid(),
	domain: z.string(),
	createdAt: z.date()
});

export type UserDomain = z.infer<typeof userDomainSchema>;

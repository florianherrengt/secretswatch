import { z } from 'zod';

export const hostnameSchema = z.string().trim().min(1).max(253);

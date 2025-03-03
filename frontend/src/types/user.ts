import { z } from "zod";

export const UserSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  email: z.string().email("Invalid email"),
  role: z.string(),
});

export type User = z.infer<typeof UserSchema>;
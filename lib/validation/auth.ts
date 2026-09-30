import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email("Invalid email"));

export const RegisterSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
  organizationName: z
    .string()
    .trim()
    .min(1, "Organization name is required")
    .max(100),
});

export const LoginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(72),
});

export const CreateOrganizationSchema = z.object({
  name: RegisterSchema.shape.organizationName,
});

export const UpdateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    role: z.enum(["ADMIN", "MEMBER"]),
    active: z.boolean(),
  })
  .partial()
  .strict();

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

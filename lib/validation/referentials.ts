import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable();

const DOMAIN_RE =
  /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** Lowercases and strips scheme, credentials, path, query and port; empty means "no domain". */
const domain = z
  .string()
  .trim()
  .transform((v) =>
    v
      .toLowerCase()
      .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
      .replace(/[/?#].*$/, ""),
  )
  .refine((v) => v === "" || DOMAIN_RE.test(v), "Invalid domain")
  .transform((v) => (v === "" ? null : v))
  .nullable();

const MAX_AMOUNT = 999_999_999_999.99;
const amount = z
  .number()
  .finite()
  .min(0, "Amount must be >= 0")
  .max(MAX_AMOUNT)
  .transform((v) => Math.round(v * 100) / 100)
  .nullable();

const name = z.string().trim().min(1, "Name is required").max(200);
const uuid = z.uuid();

export const CreateCompanySchema = z
  .object({
    name,
    domain: domain.optional(),
    mrr: amount.optional(),
    arr: amount.optional(),
  })
  .strict();

export const UpdateCompanySchema = CreateCompanySchema.partial()
  .extend({ active: z.boolean().optional() })
  .strict();

export const CreateContactSchema = z
  .object({
    companyId: uuid,
    name,
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(320)
      .transform((v) => (v === "" ? null : v))
      .pipe(z.email("Invalid email").nullable())
      .optional(),
    phone: optionalText(50).optional(),
    role: optionalText(100).optional(),
  })
  .strict();

export const UpdateContactSchema = CreateContactSchema.partial()
  .extend({ active: z.boolean().optional() })
  .strict();

export const NameSchema = z.object({ name }).strict();

export const UpdateReferentialSchema = z
  .object({ name: name.optional(), active: z.boolean().optional() })
  .strict();

export const ReorderSchema = z.object({ ids: z.array(uuid).max(500) }).strict();

const page = z.coerce.number().int().min(1).max(100_000).default(1);
const pageSize = z.coerce.number().int().min(1).max(100).default(20);
const q = z
  .string()
  .trim()
  .max(100)
  .optional()
  .transform((v) => v || undefined);
const status = z.enum(["active", "archived"]).default("active");

export const CompanyListSchema = z.object({
  page,
  pageSize,
  q,
  status,
  sort: z.enum(["name", "mrr", "arr", "createdAt"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export const ContactListSchema = z.object({
  page,
  pageSize,
  status,
  companyId: uuid.optional(),
});

export type CompanyListQuery = z.infer<typeof CompanyListSchema>;
export type ContactListQuery = z.infer<typeof ContactListSchema>;
export type CreateCompanyInput = z.infer<typeof CreateCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof UpdateCompanySchema>;
export type CreateContactInput = z.infer<typeof CreateContactSchema>;
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>;

/** Parses URL search params (first value of each key) with a Zod schema. */
export function parseQuery<T extends z.ZodType>(
  schema: T,
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): z.infer<T> {
  const entries =
    input instanceof URLSearchParams
      ? [...input.entries()]
      : Object.entries(input).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]);
  return schema.parse(
    Object.fromEntries(entries.filter(([, v]) => v !== undefined && v !== "")),
  );
}

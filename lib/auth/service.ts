import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";
import { ConflictError, UnauthorizedError } from "@/lib/errors";
import {
  LoginSchema,
  RegisterSchema,
  type LoginInput,
  type RegisterInput,
} from "@/lib/validation/auth";
import { hashPassword, verifyPassword } from "./password";
import { createSession } from "./session";

// Used to keep response time similar when the email is unknown.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword("not-a-real-password"));

/** Creates an organization and its first user, who becomes ADMIN. */
export async function register(input: RegisterInput) {
  const data = RegisterSchema.parse(input);
  const passwordHash = await hashPassword(data.password);

  try {
    const user = await db.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: "ADMIN",
        organization: { create: { name: data.organizationName } },
      },
    });
    await createSession(user.id);
    return { id: user.id };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new ConflictError("An account with this email already exists");
    }
    throw e;
  }
}

export async function login(input: LoginInput) {
  const data = LoginSchema.parse(input);
  const user = await db.user.findUnique({ where: { email: data.email } });
  const valid = await verifyPassword(
    data.password,
    user?.passwordHash ?? (await getDummyHash()),
  );
  if (!user || !valid || !user.active) {
    throw new UnauthorizedError("Invalid email or password");
  }
  await createSession(user.id);
  return { id: user.id };
}

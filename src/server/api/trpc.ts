import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { Role } from "@/generated/prisma";
import { getServerAuthSession } from "@/server/auth";

export const createTRPCContext = async () => {
  const session = await getServerAuthSession();

  return {
    session,
  };
};

const t = initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      session: ctx.session,
    },
  });
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

const enforceRoles = (roles: Role[]) =>
  t.middleware(({ ctx, next }) => {
    const userRole = ctx.session?.user.role;

    if (!userRole || !roles.includes(userRole)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return next({ ctx });
  });

export const roleProtectedProcedure = (roles: Role[]) =>
  protectedProcedure.use(enforceRoles(roles));
